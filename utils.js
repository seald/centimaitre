const chalk = require('chalk')

const getTimestamp = () => {
  const date = new Date()
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}:${`${date.getSeconds()}`.padStart(2, '0')}`
}

const formatTimeDelta = (delta) => {
  if (delta < 1000) { // < 1s
    return `${delta} ms`
  } else if (delta < 60000) { // 1s -> 1min
    return `${(delta / 1000).toFixed(2)} s`
  } else if (delta < 3600000) { // 1min -> 1h
    return `${Math.floor(delta / 60000)} min ${Math.floor((delta % 60000) / 1000)} s`
  } else { // > 1h
    return `${Math.floor(delta / 3600000)} h ${Math.floor((delta % 3600000) / 60000)} min ${Math.floor((delta % 60000) / 1000)} s`
  }
}

const log = {
  debug: (str) => {
    /* istanbul ignore next */
    if (!global._CM_quiet && global._CM_verbose) console.log(`[${chalk.gray(getTimestamp())}] ${chalk.cyan(str)}`)
  },
  info: (str) => {
    /* istanbul ignore next */
    if (!global._CM_quiet || global._CM_verbose) console.log(`[${chalk.gray(getTimestamp())}] ${str}`)
  },
  error: (str) => {
    /* istanbul ignore next */
    console.error(`[${chalk.gray(getTimestamp())}] ${chalk.red(str)}`)
  }
}

module.exports = {
  formatTimeDelta,
  log
}
