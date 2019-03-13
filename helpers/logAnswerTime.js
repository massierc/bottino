function timestampAndUser(user) {
  const options = { day: 'numeric', year: 'numeric', month: 'numeric', hour: 'numeric', minute: 'numeric' }
  const timestamp = new Date().toLocaleDateString('it', options)
  const name = user.first_name && `${user.first_name} ${user.last_name}`
  const username = user.username && ` (@${user.username})`
  return `[${timestamp}] ${name + username}: `
}

function logAnswerTime(ctx, name) {
  console.info(
    timestampAndUser(ctx.message.from),
    `${name} answered in ${(new Date().getTime() - ctx.timeReceived.getTime()) / 1000}s`
  )
}

module.exports = { timestampAndUser, logAnswerTime }
