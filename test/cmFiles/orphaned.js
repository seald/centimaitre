const { task } = require('../../index')

task('test', ['test2'], () => {
  return new Promise(resolve => {})
})

task('test2', () => Promise.resolve())
