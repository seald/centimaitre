const {task} = require('../../index')

task('test', () => {
  return new Promise(resolve => {
    setTimeout(() => resolve(console.log('test')), 50)
  })
})

task('test2', ['test'], () => {
  return new Promise(resolve => {
    setTimeout(() => resolve(console.log('test2')), 50)
  })
})

task('test3', ['test'], () => {
  return new Promise(resolve => {
    setTimeout(() => resolve(console.log('test3')), 100)
  })
})

task('test4', ['test2', 'test3'], () => {
  return new Promise(resolve => {
    setTimeout(() => resolve(console.log('test4')), 50)
  })
})
