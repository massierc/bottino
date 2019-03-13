const fetch = require('node-fetch')
const { trelloUrl } = require('./url')
const qs = require('querystring')

function safeError(err) {
  const regexp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig
  const url = new URL(err.message.match(regexp)[0])
  const path = url.origin + url.pathname
  const { key, token, ...cleanQuery } = qs.parse(url.search.slice(1))
  const cleanUrl = `${path}?${qs.stringify(cleanQuery)}`
  err.message = err.message.replace(regexp, cleanUrl)
  return err
}

async function createCard(params) {
  try {
    const response = await fetch(trelloUrl(params), { method: 'POST' })
    return await response.json()
  } catch (err) {
    throw safeError(err)
  }
}

module.exports = createCard
