#!/usr/bin/env node
const {executeTask} = require('../centimaitre')
const {log} = require('../utils')
const path = require('path')
const yargs = require('yargs')
const chalk = require('chalk')

const tasks = yargs.boolean('quiet').boolean('verbose').argv._

if (tasks.length === 0) process.exit(0)
const firstTaskIndex = process.argv.findIndex(e => e === `${tasks[0]}`)
const lastTaskIndex = process.argv.findIndex(e => e === `${tasks[tasks.length - 1]}`)
if (tasks.length !== lastTaskIndex - firstTaskIndex + 1) {
  log.error('Cannot pass options between tasks')
  process.exit(1)
}

const cmOptions = yargs.boolean('quiet').boolean('verbose').parse(process.argv.slice(0, firstTaskIndex))
const tasksOptions = yargs.parse(process.argv.slice(lastTaskIndex + 1))

let cmfilePath = path.resolve('cmfile.js')

if (cmOptions.cmfile) {
  if (typeof cmOptions.cmfile === 'string') cmfilePath = path.resolve(cmOptions.cmfile)
  else {
    log.error('--cmfile argument can\'t be given twice to centimaitre')
    process.exit(1)
  }
}

global._CM_quiet = Boolean(cmOptions.quiet)
global._CM_verbose = Boolean(cmOptions.verbose)

try {
  log.debug(`Using cmfile ${chalk.magenta(cmfilePath)}`)
  require(cmfilePath)
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND' && typeof err.message === 'string' && err.message.includes(cmfilePath)) {
    log.error(`Could not resolve file ${cmfilePath}`)
  } else log.error(`Unknown error ${err.stack}`)
  process.exit(1)
}

Promise.all(tasks.map(taskName => executeTask(taskName, tasksOptions)))
  .then(() => {
    process.exit(0)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })

process.on('beforeExit', () => {
  log.error('It seems a Promise has been orphaned, which means it will never be resolved nor rejected. Exiting.')
  process.exit(1)
})
