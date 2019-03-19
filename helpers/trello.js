const fetch = require('node-fetch')
const url = require('./url')
const qs = require('querystring')
const _ = require('lodash')
const speechAPI = require('./speechAPI')
const USERS = require('./users')

function safeError(err) {
  try {
    const regexp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig
    const errUrl = new URL(err.message.match(regexp)[0])
    const path = errUrl.origin + errUrl.pathname
    const { key, token, ...cleanQuery } = qs.parse(errUrl.search.slice(1))
    const cleanUrl = `${path}?${qs.stringify(cleanQuery)}`
    err.message = err.message.replace(regexp, cleanUrl)
    return err
  } catch (error) {
    return err
  }
}

function clientParsed(client) {
  return client && client[0].confidence > 0.4
}

function getTimestamp() {
  const options = {
    day: 'numeric',
    year: 'numeric',
    month: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }
  return new Date().toLocaleDateString('it', options)
}

function getDescription(note, text, user) {
  const desc = [
    note,
    note && '\n\n---\n\n',
    note && '**Testo originale**\n',
    text,
    (!note && user) && '\n\n---\n\n',
    user && `\n\n**Creato da**\n${user.fullName} (@${user.username})`
  ]
  return desc.join('')
}

async function createCard({ text, username, ...rest }) {
  try {
    const { entities } = await speechAPI.getMessage(text)
    const client = clientParsed(entities.client) && entities.client[0].value
    const note = entities.note && entities.note.map(n => n.value).join(' ')
    const user = USERS[username]
    const params = {
      pos: 'top',
      desc: getDescription(client && note, text, user),
      idMembers: user && user.id,
      ...rest
    }

    if (client) {
      params.idList = process.env.TRELLO_RECEIVED_LIST_ID
      params.name = `${_.startCase(_.toLower(client))} - ${getTimestamp()}`
    } else {
      params.idList = process.env.TRELLO_UNKNOWN_LIST_ID
      params.name = `Unknown - ${getTimestamp()}`
    }

    const response = await fetch(url.trello('cards', params), { method: 'POST' })
    if (response.status === 200) {
      return await response.json()
    }
    throw await response.json()
  } catch (err) {
    throw safeError(err)
  }
}

module.exports = { createCard }
