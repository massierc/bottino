// Dependencies
const fs = require('fs')
const https = require('https')
const { witLanguages } = require('./language/languageConstants')
const cloud = require('./cloud')
const { witUrl } = require('./url')
const ffmpeg = require('fluent-ffmpeg')
const temp = require('temp')
const fetch = require('node-fetch')
const tryDeletingFile = require('./deleteFile')
const _ = require('lodash')

/**
 * Function that converts url with audio file into text
 * @param {Path} flacPath Flac path of the audio file to convert
 * @param {Mongoose:Chat} Chat where audio was fetched
 * @param {Int} duration Duration of audio file
 */
async function getText(flacPath, chat, duration, ogaPath) {
  return chat.engine === 'wit'
    ? wit(witLanguages[chat.witLanguage], ogaPath, duration, chat.witLanguage)
    : google(flacPath, chat, duration)
}

/**
 * Convert filepath to text with google
 * @param {Path} filePath Path of the file
 * @param {Mongoose:Chat} chat Chat to convert
 */
async function google(filePath, chat, duration) {
  // Check if chat has google credentials
  if (!chat.googleKey) {
    throw new Error('No google credentials')
  }
  // Upload to drive
  const uri = await cloud.put(filePath, chat)
  // Transcribe
  const speech = require('@google-cloud/speech')({
    credentials: JSON.parse(chat.googleKey),
  })

  return new Promise((resolve, reject) => {
    speech.startRecognition(
      uri,
      {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: chat.googleLanguage,
      },
      async (err, operation) => {
        if (err) {
          try {
            reject(err)
            await cloud.del(uri, chat)
          } catch (error) {
            // Do nothing
          }
          return
        }
        operation
          .on('error', async e => {
            try {
              reject(e)
              await cloud.del(uri, chat)
            } catch (error) {
              // Do nothing
            }
          })
          .on('complete', async result => {
            try {
              resolve([[`0-${parseInt(duration, 10)}`, result]])
              await cloud.del(uri, chat)
            } catch (error) {
              // Do nothing
            }
          })
      }
    )
  })
}

/**
 * Converting audio to text with wit
 * @param {String} token Token of the wit.ai language
 * @param {Path} filePath Path of the file to convert
 */
async function wit(token, filePath, duration, iLanguage) {
  const paths = await splitPath(filePath, duration)
  let result = []
  while (paths.length) {
    const pathsToRecognize = paths.splice(0, 5)
    const promises = []
    for (const path of pathsToRecognize) {
      promises.push(
        new Promise(async (res, rej) => {
          let triesCount = 2
          let error
          while (triesCount > 0) {
            try {
              const text = await recognizePath(path, token)
              res(text)
              return
            } catch (err) {
              error = err
              triesCount -= 1
              console.info(
                `Retrying ${iLanguage} ${path}, attempts left — ${triesCount}, error: ${
                  err.message
                } (${err.code})`
              )
            }
          }
          error.message = `${error.message} (${duration}s)`
          rej(error)
        })
      )
    }
    try {
      const responses = await Promise.all(promises)
      result = result.concat(responses.map(r => (r || '').trim()))
    } catch (err) {
      for (const path of pathsToRecognize) {
        tryDeletingFile(path)
      }
      throw err
    } finally {
      for (const path of pathsToRecognize) {
        tryDeletingFile(path)
      }
    }
  }
  const splitDuration = 15
  return result.length < 2
    ? [[`0-${parseInt(duration, 10)}`, result[0]]]
    : result.reduce((p, c, i, a) => {
        if (a.length - 1 === i) {
          return p.concat([
            [`${i * splitDuration}-${parseInt(duration, 10)}`, c],
          ])
        }
        return p.concat([
          [`${i * splitDuration}-${(i + 1) * splitDuration}`, c],
        ])
      }, [])
}

function splitPath(path, duration) {
  const trackLength = 15
  const lastTrackLength = duration % trackLength

  const promises = []
  for (let i = 0; i < duration; i += trackLength) {
    const output = temp.path({ suffix: '.flac' })
    promises.push(
      new Promise((res, rej) => {
        ffmpeg()
          .input(path)
          .on('error', error => {
            rej(error)
          })
          .on('end', () => res(output))
          .output(output)
          .setStartTime(i)
          .duration(i + trackLength < duration ? trackLength : lastTrackLength)
          .audioFrequency(16000)
          .toFormat('s16le')
          .run()
      })
    )
  }
  return Promise.all(promises)
}

async function recognizePath(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      hostname: 'api.wit.ai',
      port: null,
      path: '/speech?v=20170307',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type':
          'audio/raw;encoding=signed-integer;bits=16;rate=16000;endian=little',
        'cache-control': 'no-cache',
      },
    }
    const req = https.request(options, res => {
      const chunks = []

      res.on('data', chunk => {
        chunks.push(chunk)
      })

      res.on('end', () => {
        try {
          const body = Buffer.concat(chunks)
          const json = JSON.parse(body.toString())
          if (json.error) {
            const error = new Error(json.error)
            error.code = json.code
            try {
              reject(error)
            } catch (err) {
              // Do nothing
            }
          } else {
            try {
              resolve(json._text)
            } catch (err) {
              // Do nothing
            }
          }
        } catch (err) {
          try {
            reject(err)
          } catch (error) {
            // Do nothing
          }
        }
      })

      res.on('error', err => {
        try {
          reject(err)
        } catch (error) {
          // Do nothing
        }
      })
    })

    req.on('error', err => {
      try {
        reject(err)
      } catch (error) {
        // Do nothing
      }
    })

    const stream = fs.createReadStream(path)
    stream.pipe(req)
    let error
    stream.on('error', err => {
      error = err
    })
    stream.on('close', () => {
      if (error) {
        try {
          reject(error)
        } catch (err) {
          // Do nothing
        }
      }
    })
  })
}

async function getMessage(query) {
  const options = {
    headers: {
      Authorization: `Bearer ${process.env.WIT_TOKEN}`
    }
  }

  // if long message, parse by chunk
  if (query.length > 250) {
    const chunks = query.match(/.{1,250}/g);
    const promises = []
    chunks.forEach(chunk => {
      promises.push(
        new Promise(async (res, rej) => {
          try {
            const response = await fetch(witUrl(chunk), options)
            if (response.status === 200) {
              res(response.json())
              return
            }
            throw await response.json()
          } catch (err) {
            rej(err)
          }
        }
      ))
    })
    try {
      const responses = await Promise.all(promises)
      const client = _.get(responses, '0,entities,client,0', undefined)
      const note = responses.map(r => r._text).join('')
      return { client, note }
    } catch (err) {
      throw err
    }
  }

  try {
    const res = await fetch(witUrl(query), options)
    if (res.status === 200) {
      const response = await res.json()
      const client = _.get(response, 'entities,client,0', undefined)
      const note = response._text
      return { client, note }
    }
    throw await res.json()
  } catch (err) {
    throw err
  }
}

// Exports
module.exports = {
  getText,
  getMessage,
}
