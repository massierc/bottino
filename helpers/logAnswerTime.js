function logAnswerTime(ctx, name) {
  const now = new Date()
  const options = { day: 'numeric', year: 'numeric', month: 'numeric', hour: 'numeric', minute: 'numeric' }
  const timestamp = now.toLocaleDateString('it', options)
  const user = ctx.message.from
  console.info(`[${timestamp}] - ${user.first_name} ${user.last_name} (${user.username})`)
  console.info(`${name} answered in ${(now.getTime() - ctx.timeReceived.getTime()) / 1000}s`)
  console.info('')
}

module.exports = logAnswerTime
