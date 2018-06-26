/* global describe, it, beforeEach, before, after */

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const fs = require('fs-jetpack')
const Stream = require('stream')
const {formatTimeDelta} = require('../utils')

const {resolveTaskArguments, task, tasks, executeTask, streamToPromise, defaultOptions, setDefaultOptions} = require('../centimaitre')

chai.use(chaiAsPromised)
const {expect, assert} = chai

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

function detectIstanbulGlobal () {
  const gcv = '__coverage__'
  // eslint-disable-next-line no-new-func
  const globalvar = new Function('return this')()
  const coverage = globalvar[gcv]
  return coverage || false
}

const delay = (t = 1) => new Promise(resolve => setTimeout(resolve, t))

describe('Utils', () => {
  it('formatTimeDelta', () => {
    assert.equal(formatTimeDelta(0), '0 ms')
    assert.equal(formatTimeDelta(999), '999 ms')
    assert.equal(formatTimeDelta(1000), '1.00 s')
    assert.equal(formatTimeDelta(59990), '59.99 s')
    assert.equal(formatTimeDelta(60000), '1 min 0 s')
    assert.equal(formatTimeDelta(3599000), '59 min 59 s')
    assert.equal(formatTimeDelta(3600000), '1 h 0 min 0 s')
    assert.equal(formatTimeDelta(7269000), '2 h 1 min 9 s')
  })
})

describe('Resolve task arguments', () => {
  it('Try to give it no argument', () => expect(() => resolveTaskArguments([])).to.throw(Error).and.have.property('message', 'Task name must be provided'))
  it('Try to give it a non-string taskName', () => expect(() => resolveTaskArguments([1])).to.throw(Error).and.have.property('message', 'Task name must be a string'))
  it('Try to give it only a valid taskName', () => expect(() => resolveTaskArguments(['taskName'])).to.throw(Error).and.have.property('message', 'Callback or dependencies Array must be provided'))
  it('Try to give it a valid taskName, but invalid second argument', () => expect(() => resolveTaskArguments(['taskName', 1])).to.throw(Error).and.have.property('message', 'Invalid second argument, it must be a function or an Array of taskNames'))
  it('Try to give it a valid taskName, but invalid second and third arguments', () => expect(() => resolveTaskArguments(['taskName', 1, 2])).to.throw(Error).and.have.property('message', 'Second argument must be the Array of dependencies if a third argument is provided'))
  it('Try to give it a valid taskName, and valid second argument but invalid third', () => expect(() => resolveTaskArguments(['taskName', ['test'], 2])).to.throw(Error).and.have.property('message', 'Third argument must be a function'))
  it('TaskName and broken dependencies', () => expect(() => resolveTaskArguments(['taskName', ['test', 2]])).to.throw(Error).and.have.property('message', 'Invalid second argument, it must be a function or an Array of taskNames'))
  it('Try to give it 4 arguments', () => expect(() => resolveTaskArguments(['taskName', ['test'], 2, 3])).to.throw(Error).and.have.property('message', 'Received 4 arguments, expected 2 or 3'))

  it('TaskName and dependencies', () => {
    const _taskName = 'taskName'
    const _tasks = ['test', 'test2']
    const {taskName, dependencies, callback} = resolveTaskArguments([_taskName, _tasks])
    assert.equal(taskName, _taskName)
    assert.sameOrderedMembers(dependencies, _tasks)
    /* istanbul ignore next */
    assert.equal(callback.toString(), detectIstanbulGlobal() ? '()=>Promise.resolve()' : '() => Promise.resolve()') // This is absolutely terrible, and I'm sorry. https://github.com/gotwarlost/istanbul/issues/856
  })

  it('TaskName and callback', () => {
    const _taskName = 'taskName'
    const _callback = () => { /* test */ }
    const {taskName, dependencies, callback} = resolveTaskArguments([_taskName, _callback])
    assert.equal(taskName, _taskName)
    assert.equal(dependencies.length, 0)
    assert.equal(callback, _callback)
  })

  it('TaskName, dependencies and callback', () => {
    const _taskName = 'taskName'
    const _tasks = ['test', 'test2']
    const _callback = () => { /* test */ }
    const {taskName, dependencies, callback} = resolveTaskArguments([_taskName, _tasks, _callback])
    assert.equal(taskName, _taskName)
    assert.sameOrderedMembers(dependencies, _tasks)
    assert.equal(callback, _callback)
  })
})

describe('Task', () => {
  beforeEach('Cleanup tasks', () => {
    Object.keys(tasks).forEach(key => {
      delete tasks[key]
    })
  })

  it('Defining a task normally', () => {
    const _taskName = 'taskName'
    const _tasks = ['test', 'test2']
    const _callback = () => { /* test */ }
    task(_taskName, _tasks, _callback)
    assert.sameMembers(Object.keys(tasks), [_taskName])
    assert.deepEqual(tasks[_taskName], {
      dependencies: _tasks,
      callback: _callback,
      promise: undefined
    })
  })

  it('Defining a task twice', () => {
    task('taskName', ['test', 'test2'])
    expect(() => task('taskName', ['test', 'test2'])).to.throw(Error).and.have.property('message', 'Multiple tasks defined with same taskName "taskName"')
  })
})

describe('Execute task', () => {
  beforeEach('Cleanup tasks', () => {
    Object.keys(tasks).forEach(key => {
      delete tasks[key]
    })
    Object.keys(defaultOptions).forEach(key => {
      delete defaultOptions[key]
    })
  })

  it('Trying to execute non-existing task', () =>
    expect(executeTask('taskName')).to.be.rejectedWith(Error).and.eventually.have.property('message', 'Called non-existing task taskName from undefined')
  )

  it('Trying to execute task which references to itself', async () => {
    task('taskName', ['test'])
    task('test', ['taskName'])

    await expect(executeTask('taskName')).to.be.rejectedWith(Error).and.eventually.have.property('message', 'Circular dependency detected on task taskName with dependency tree: taskName, test')
  })

  it('Executing a single task', async () => {
    let executed = 0
    const _taskName = 'taskName'
    const _callback = () => {
      executed += 1
    }
    task(_taskName, _callback)
    await executeTask(_taskName)
    assert.equal(executed, 1)
  })

  it('Executing a single task with options', async () => {
    let executed = 0
    const _taskName = 'taskName'
    const _options = {test: 'test'}
    const _callback = options => {
      assert.deepEqual(options, _options)
      executed += 1
    }
    task(_taskName, _callback)
    await executeTask(_taskName, _options)
    assert.equal(executed, 1)
  })

  it('Executing a single task with options, having set defaultOptions', async () => {
    let executed = 0
    const _taskName = 'taskName'
    setDefaultOptions({
      test1: 'test1',
      test2: 'test2',
      test: 'TEST'
    })
    const _options = {test: 'test'}
    const _callback = options => {
      assert.deepEqual(options, {
        test1: 'test1',
        test2: 'test2',
        test: 'test'
      })
      executed += 1
    }
    task(_taskName, _callback)
    await executeTask(_taskName, _options)
    assert.equal(executed, 1)
  })

  it('Executing a single task that returns a stream', async () => {
    const stream = new Stream.Readable()
    stream._read = function noop () {}
    let executed = 0
    const _taskName = 'taskName'
    const _callback = () => {
      executed += 1
      return stream
    }
    task(_taskName, _callback)
    setTimeout(() => {
      stream.emit('end')
    }, 50)
    await executeTask(_taskName)
    assert.equal(executed, 1)
  })

  it('Executing a task with a dependency', async () => {
    let executed1 = 0
    let executed2 = 0

    const _taskName1 = 'taskName1'
    const _taskName2 = 'taskName2'

    const _callback1 = () => {
      executed1 += 1
      assert.equal(executed2, 0)
    }

    const _callback2 = () => {
      executed2 += 1
    }
    task(_taskName1, _callback1)
    task(_taskName2, [_taskName1], _callback2)

    await executeTask(_taskName2)
    assert.equal(executed1, 1)
    assert.equal(executed2, 1)
  })

  it('Executing a task with a dependency, with a callback that returns a Promise', async () => {
    let executed1 = 0
    let executed2 = 0

    const _taskName1 = 'taskName1'
    const _taskName2 = 'taskName2'

    const _callback1 = () => delay()
      .then(() => {
        executed1 += 1
        assert.equal(executed2, 0)
      })

    const _callback2 = () => {
      executed2 += 1
    }
    task(_taskName1, _callback1)
    task(_taskName2, [_taskName1], _callback2)

    await executeTask(_taskName2)
    assert.equal(executed1, 1)
    assert.equal(executed2, 1)
  })

  it('Executing a task with two dependencies, each with the same dependency', async () => {
    let executed1 = 0
    let executed2 = 0
    let executed3 = 0
    let executed4 = 0

    const _taskName1 = 'taskName1'
    const _taskName2 = 'taskName2'
    const _taskName3 = 'taskName3'
    const _taskName4 = 'taskName4'

    const _callback1 = () => delay()
      .then(() => {
        executed1 += 1
        assert.equal(executed2, 0)
        assert.equal(executed3, 0)
        assert.equal(executed4, 0)
      })

    const _callback2 = () => {
      executed2 += 1
      assert.equal(executed1, 1)
      assert.equal(executed3, 0)
      assert.equal(executed4, 0)
    }

    const _callback3 = () => delay()
      .then(() => {
        executed3 += 1
        assert.equal(executed1, 1)
        assert.equal(executed2, 1)
        assert.equal(executed4, 0)
      })

    const _callback4 = () => delay()
      .then(() => {
        executed4 += 1
        assert.equal(executed1, 1)
        assert.equal(executed2, 1)
        assert.equal(executed3, 1)
      })

    task(_taskName1, _callback1)
    task(_taskName2, [_taskName1], _callback2)
    task(_taskName3, [_taskName1], _callback3)
    task(_taskName4, [_taskName2, _taskName3], _callback4)

    await executeTask(_taskName4)
    assert.equal(executed1, 1)
    assert.equal(executed2, 1)
    assert.equal(executed3, 1)
    assert.equal(executed4, 1)
  })
})

describe('Stream to promise', () => {
  let tmp
  before(() => {
    tmp = fs.cwd('tmp')
    fs.dir('.')
  })

  it('can handle an fs read stream', async () => {
    await fs.writeAsync(tmp.path('read.txt'), 'hi there!')
    const stream = fs.createReadStream(tmp.path('read.txt'))
    stream.on('data', chunk => {})
    await streamToPromise(stream)
  })

  it('can handle an fs write stream', async () => {
    const stream = fs.createWriteStream(tmp.path('written.txt'))
    process.nextTick(() => {
      stream.write('written contents')
      stream.end()
    })
    await streamToPromise(stream)
    const contents = await fs.readAsync(tmp.path('written.txt'))
    expect(contents.toString()).to.equal('written contents')
  })

  after(() => tmp.removeAsync('.'))
})
