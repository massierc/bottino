const fetch = require('node-fetch')
const { trelloUrl } = require('./url')

async function createCard(listId = '5c8798ee34ac6b81df7366dd', payload) {
  const params = {
    listId,
    payload,
  }
  const response = await fetch(trelloUrl(params))
  return await response.json()
}

module.exports = createCard
