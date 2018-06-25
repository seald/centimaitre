const {promisify} = require('util')
const eos = require('end-of-stream')
const {log, formatTimeDelta} = require('./utils')
const chalk = require('chalk')

const streamToPromise = promisify(eos)
/**
 * This object stores at runtime the tasks. Storing that in an Object ensures there are no duplicate tasks.
 * @type {Object<string, {dependencies: Array<string>, promise: Promise|undefined, callback: function}>}
 */
const tasks = {}
/**
 * This object stores at runtime defaultOptions and is used as the defaultOptions when executing a task.
 * @type {Object}
 */
const defaultOptions = {}
/**
 * This function assigns given options to the defaultOptions.
 * @param {Object} options
 */
const setDefaultOptions = options => {
  Object.assign(defaultOptions, options)
}
/**
 * This — definitely overkill — function parses the given arguments and returns them unharmed, but having checked they
 * match the wanted signature.
 * The wanted signature is:
 * `taskName[, dependencies][, callback]`
 * Where `taskName` is a string, `dependencies` is an Array<string>, and callback is a function.
 * Both dependencies and callback are optional, but at least one of them must be provided, so it can be:
 * taskName, callback
 * taskName, dependencies
 * taskName, dependencies, callback
 * @param {Array}args
 * @return {{taskName: string, dependencies: Array<string>, callback: function}}
 */
const resolveTaskArguments = args => {
  /* istanbul ignore next */
  let callback = () => Promise.resolve()
  const dependencies = []
  if (args.length === 0) throw new Error('Task name must be provided')
  if (typeof args[0] !== 'string') throw new Error('Task name must be a string')
  const taskName = args[0]
  if (args.length === 1) throw new Error('Callback or dependencies Array must be provided')
  if (args.length === 2) {
    if (typeof args[1] === 'function') callback = args[1]
    else if (args[1] instanceof Array && args[1].every(taskName => typeof taskName === 'string')) dependencies.push(...args[1])
    else throw new Error('Invalid second argument, it must be a function or an Array of taskNames')
  } else if (args.length === 3) {
    if (!(args[1] instanceof Array && args[1].every(taskName => typeof taskName === 'string'))) throw new Error('Second argument must be the Array of dependencies if a third argument is provided')
    if (typeof args[2] !== 'function') throw new Error('Third argument must be a function')
    dependencies.push(...args[1])
    callback = args[2]
  } else throw new Error(`Received ${args.length} arguments, expected 2 or 3`)
  return {
    taskName,
    dependencies,
    callback
  }
}

// noinspection JSCommentMatchesSignature
/**
 * Tasks can be defined in any order, their dependencies are resolved at runtime.
 * This function ensures that the task hasn't been defined multiple times and stores the task into the `tasks` object.
 * @param {string} taskName
 * @param {Array<string>} [dependencies]
 * @param {function():Promise|{pipe: function}|void} [callback] when given, is a function that is synchronous, or that returns a Promise, or that returns a Stream. The task is considered finished when the returned Promise is resolved, when the returned Stream has finished or when the synchronous execution has ended.
 */
const task = (...args) => {
  const {taskName, dependencies, callback} = resolveTaskArguments(args)
  log.debug(`Defining task "${taskName}" ${dependencies.length > 0 ? `with dependencies "${dependencies.join('", "')}"` : 'with no dependencies'}`)
  if (tasks.hasOwnProperty(taskName)) {
    log.error(`"${taskName}" has been defined multiple times`)
    throw new Error(`Multiple tasks defined with same taskName "${taskName}"`)
  }
  tasks[taskName] = {
    dependencies,
    callback,
    promise: undefined
  }
}
/**
 * This function recursively executes the dependencies of the given taskName. If multiple tasks have the same
 * dependencies, they will be executed in the right order, and only once. If a dependency refers to itself, it will be
 * detected and prevented at runtime, to avoid a deadlock.
 * @param {string} taskName
 * @param {Object} [options] - options that will be added to the defaultOptions, takes precedence over defaultOptions
 * @param {Array<string>} [calledTasks=[]] - an Array of previously calledTasks, used to avoid circular dependencies
 * @return {Promise<void>}
 */
const executeTask = async (taskName, options, calledTasks = []) => {
  log.debug(`Asked to execute task "${taskName}"`)
  if (!tasks.hasOwnProperty(taskName)) {
    log.error(`Task "${taskName}" does not exist`)
    throw new Error(`Called non-existing task ${taskName} from ${calledTasks.pop()}`)
  }
  if (calledTasks.includes(taskName)) {
    log.error(`Task "${taskName}" is referencing itself in the dependency tree "${calledTasks.join('", "')}"`)
    throw new Error(`Circular dependency detected on task ${taskName} with dependency tree: ${calledTasks.join(', ')}`)
  }
  if (!tasks[taskName].promise) {
    log.debug(`Task "${taskName}" is called for the first time`)
    tasks[taskName].promise = Promise.resolve()
      .then(() => {
        log.debug(`Executing dependencies of "${taskName}"`)
        return Promise.all(
          tasks[taskName].dependencies.map(_taskName => executeTask(_taskName, options, [...calledTasks, taskName]))
        )
      })
      .then(async () => {
        log.debug(`All dependencies of "${taskName}" have been successfully executed`)
        log.info(`[${chalk.cyan(taskName)}]: Starting...`)
        const startTime = Date.now()
        tasks[taskName].finished = false
        const result = tasks[taskName].callback({
          ...defaultOptions,
          ...options
        })
        if (result && typeof result.pipe === 'function') await streamToPromise(result)
        else await Promise.resolve(result)
        tasks[taskName].finished = true
        log.info(`[${chalk.cyan(taskName)}]: Finished after ${chalk.magenta(formatTimeDelta(Date.now() - startTime))}`)
      })
      .catch(err => {
        if (err.consumed) throw err
        log.error(`[${taskName}]: Error!`)
        err.consumed = true
        throw err
      })
  }
  await tasks[taskName].promise
}

module.exports = {
  task,
  executeTask,
  resolveTaskArguments,
  setDefaultOptions,
  defaultOptions,
  streamToPromise,
  tasks
}
