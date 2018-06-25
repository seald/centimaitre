# Centimaitre

[![npm version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![coverage status][codecov-image]][codecov-url]
[![license status][license-image]][license-url]
![david][david-image]

Centimaitre is a small task runner with a dependencies system which works a bit like gulp@3.

## How do I use it?
First to install: 
```bash
npm i -D centimaitre
```
Centimaitre doesn't work when installed globally, I recommend installing it locally, and using [`npx`](https://www.npmjs.com/package/npx) (installed by default with npm):
```bash
npm i -D centimaitre
npx cm [cmOptions] <...tasks-to-run> [taskOptions]
```

## CLI

The CLI is used as such: `npx cm [cmOptions] <...tasks-to-run> [taskOptions]`

Both cmOptions and taskOptions are parsed with [yargs](https://github.com/yargs/yargs). You should take note of its syntax. For example, if you want to set a given option `myOption` to `false`, you should pass `--no-myOption` on the CLI.

### cmOptions

#### `cmFile`

By default, centimaitre will use the `cmfile.js` found in the directory from which it is called. If you want to override that, you can pass `--cmfile=relative/path/to/custom/centimaitre/config/file`.

#### `quiet` & `verbose`

Pass `--quiet` if you want no logs from centimaitre besides errors, or `--verbose` if you want extra logs. If you try being funny and pass both, you'll just get the normal logs.

## API

### `setDefaultOptions(options: Object): void`

This function assigns given options as default task options.

Params:
 * **@param {Object}** options


### `task(taskName: String[, dependencies: Array<string>][, callback:Function]): void`

Tasks can be defined in any order, their dependencies are resolved at runtime.

This function ensures that the task hasn't been defined multiple times and stores the task into the tasks object.
Both dependencies and callback are optional, but at least one of them must be provided, so it can be:
 * taskName, callback
 * taskName, dependencies
 * taskName, dependencies, callback
 
 The task callback is called with the `taskOptions` object as argument.

Params:
 * **@param {string} taskName**
 * **@param {Array<string>} \[dependencies]**
 * **@param {function(options: Object):Promise|{pipe: function}|void} \[callback]** when given, is a function that is synchronous, or that returns a Promise, or that returns a Stream. The task is considered finished when the returned Promise is resolved, when the returned Stream has finished or when the synchronous execution has ended.

## Example cmfile.js

Here is an example of a basic `cmfile.js`

```javascript
const cm = require('centimaitre')

cm.setDefaultOptions({
  sourceMaps: true
})

cm.task('clean', () => {
  console.log('cleaning')
})

cm.task('task1', ['clean'], () => {
  return new Promise(resolve => {
    setTimeout(() => resolve(console.log('task1')), 50)
  })
})

cm.task('task2', ['clean'], () => {
  return new Promise(resolve => {
    setTimeout(() => resolve(console.log('task2')), 100)
  })
})

cm.task('build', ['task1', 'task2'], (options) => {
  if (options.sourceMaps) console.log('build with sourceMaps')
  else console.log('build without sourceMaps')
})
```

And then, you can execute the `build` task with the relevant options (parsed with [yargs](https://github.com/yargs/yargs)):
```bash
npx cm build --no-sourceMaps
```
This will execute `clean`, then `task1` & `task2`, then finally `build` with `options.sourceMaps` set to false.

You can find detailed examples of how to use centimaitre with [rollup](https://github.com/seald/centimaitre/blob/master/examples/rollup.md), [babel](https://github.com/seald/centimaitre/blob/master/examples/babel.md), and [node-sass](https://github.com/seald/centimaitre/blob/master/examples/scss.md) in the examples directory of this repo.

## Why another task runner?
I used to use [gulp](https://github.com/gulpjs/gulp), and found its dependencies system very convenient.
BUT when node@10 was released, two things happened: 
1. gulp@3 doesn't work on node@10 [anymore](https://github.com/gulpjs/gulp/issues/2162), it seems the preferred workaround is to switch to yarn, which I most definitely don't want to do.
2. gulp@4 lost this dependencies system I thought was convenient (I had to rewrite like 1000 lines of gulpfile) AND gulp@4 doesn't work in gitlab-runner with node@10 (https://github.com/nodejs/node/issues/20498).

With that in mind, I decided to find another task runner, but all of them are overkill. I only wanted something to define tasks, resolve dependencies, and a CLI, so I wrote my own, with blackjack, and hookers. Feel free to use it if you want.

## Why 'Centimaitre'
**TL;DR: I'm French, I always do bad puns and this is one.**

A 'maître' in French is a 'master', 'ruler', 'teacher'. Since a task runner kinda _rules_ the tasks, it almost makes sense to call it that way. I said almost.

A 'centimetre' is 1/100 of a meter, it is small.

This project is all about making a small task runner: 'centimaître'.

**&lt;bad-pun&gt;** Oh and with this name, you can switch to the *maitric system*. **&lt;/bad-pun&gt;**

[npm-image]: https://img.shields.io/npm/v/centimaitre.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/centimaitre
[travis-image]: https://img.shields.io/travis/seald/centimaitre.svg?style=flat-square
[travis-url]: https://travis-ci.org/seald/centimaitre-fetch
[codecov-image]: https://img.shields.io/codecov/c/github/seald/centimaitre.svg?style=flat-square
[codecov-url]: https://codecov.io/gh/seald/centimaitre
[license-image]: https://img.shields.io/github/license/seald/centimaitre.svg?style=flat-square
[license-url]: https://github.com/seald/centimaitre/blob/master/LICENSE
[david-image]: https://img.shields.io/david/seald/centimaitre.svg?style=flat-square
