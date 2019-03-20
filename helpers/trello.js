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

async function createCard({ text, username, ...rest }) {
  try {
    const { client, note } = await speechAPI.getMessage(text)
    const user = USERS[username]
    const desc = `${note}${user && `\n\n---\n\n**Creato da**\n${user.fullName} (@${user.username})`}`
    const params = {
      pos: 'top',
      desc,
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
