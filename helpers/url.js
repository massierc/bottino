// Dependencies
const qs = require('querystring')

/**
 * Constructs file url for file path from Telegram
 * @param {Telegram:FilePath} filePath Path of the file
 * @returns {URL} Url to download file
 */
function fileUrl(filePath) {
  return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${qs.escape(filePath)}`
}

function trelloUrl({ listId, payload }) {
  const params = {
    key: process.env.TRELLO_KEY,
    token: process.env.TRELLO_TOKEN,
    idList: listId,
    name: payload,
  }
  return `${process.env.TRELLO_BASE_URL}/cards?${qs.stringify(params)}`
}

// Exports
module.exports = {
  fileUrl,
  trelloUrl,
}
