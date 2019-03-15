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

function getClient(client) {
  return client && client.confidence > 0.4 ? _.startCase(_.toLower(client.value)) : 'Nuovo lead'
}

function getDescription(note, text) {
  return note && note.confidence > 0.4 ? `${note.value}\n\n**Testo originale**\n*${text}*` : text
}

async function createCard({ idList, text, entities }) {
  const params = { idList, pos: 'top' }
  const client = entities.client[0]
  const note = entities.note[0]

  if (_.isEmpty(entities)) {
    params.name = 'Nuovo lead'
    params.desc = text
  } else {
    params.name = getClient(client)
    params.desc = getDescription(note, text)
  }

  try {
    const response = await fetch(trelloUrl(params), { method: 'POST' })
    return await response.json()
  } catch (err) {
    throw safeError(err)
  }
}

module.exports = createCard
