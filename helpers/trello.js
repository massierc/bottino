const fetch = require('node-fetch')
const { trelloUrl } = require('./url')
const qs = require('querystring')
const _ = require('lodash')

function safeError(err) {
  const regexp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig
  const url = new URL(err.message.match(regexp)[0])
  const path = url.origin + url.pathname
  const { key, token, ...cleanQuery } = qs.parse(url.search.slice(1))
  const cleanUrl = `${path}?${qs.stringify(cleanQuery)}`
  err.message = err.message.replace(regexp, cleanUrl)
  return err
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

async function createCard({ text, entities, ...rest }) {
  const params = { pos: 'top', ...rest }
  const client = clientParsed(entities.client) && entities.client[0].value
  const note = entities.note && entities.note.map(n => n.value).join(' ')
  const desc = note ? `${note}\n\n**Testo originale**\n*${text}*` : text

  if (client) {
    params.idList = process.env.TRELLO_RECEIVED_LIST_ID
    params.name = `${_.startCase(_.toLower(client))} - ${getTimestamp()}`
    params.desc = desc
  } else {
    params.idList = process.env.TRELLO_UNKNOWN_LIST_ID
    params.name = `Unknown - ${getTimestamp()}`
    params.desc = text
  }

  try {
    const response = await fetch(trelloUrl(params), { method: 'POST' })
    return await response.json()
  } catch (err) {
    throw safeError(err)
  }
}

module.exports = createCard
