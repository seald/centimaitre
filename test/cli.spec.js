/* global describe, it */

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const childProcess = require('child_process')
const path = require('path')
const { promisify } = require('util')

chai.use(chaiAsPromised)
const { assert, expect } = chai
const binPath = path.resolve('./bin/centimaitre-cli.js')
const CLI = async (options = []) => promisify(childProcess.execFile)(binPath, options)

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

describe('CLI', () => {
  it('Testing simple case', async () => {
    const { stdout, stderr } = await CLI(['--cmfile=test/cmFiles/cm1.js', 'test'])
    assert.equal(stderr, '')
    const parsedResult = stdout.split('\n')
    assert.equal(parsedResult.length, 5)
    assert.include(parsedResult[0], 'test')
    assert.include(parsedResult[0], 'Starting...')
    assert.equal(parsedResult[1], 'test')
    assert.include(parsedResult[2], 'test')
    assert.include(parsedResult[2], 'Finished after')
    assert.include(parsedResult[3], 'All tasks finished after')
    assert.equal(parsedResult[4], '')
  })

  it('Testing case with dependencies', async () => {
    const { stdout, stderr } = await CLI(['--cmfile=test/cmFiles/cm1.js', 'test4'])
    assert.equal(stderr, '')
    const parsedResult = stdout.split('\n')
    assert.equal(parsedResult.length, 14)
    let i = 0

    assert.include(parsedResult[i], 'test')
    assert.include(parsedResult[i], 'Starting...')
    i++
    assert.equal(parsedResult[i], 'test')
    i++
    assert.include(parsedResult[i], 'test')
    assert.include(parsedResult[i], 'Finished after')
    i++
    assert.include(parsedResult[i], 'test2')
    assert.include(parsedResult[i], 'Starting...')
    i++
    assert.include(parsedResult[i], 'test3')
    assert.include(parsedResult[i], 'Starting...')
    i++
    assert.equal(parsedResult[i], 'test2')
    i++
    assert.include(parsedResult[i], 'test2')
    assert.include(parsedResult[i], 'Finished after')
    i++
    assert.equal(parsedResult[i], 'test3')
    i++
    assert.include(parsedResult[i], 'test3')
    assert.include(parsedResult[i], 'Finished after')
    i++
    assert.include(parsedResult[i], 'test4')
    assert.include(parsedResult[i], 'Starting...')
    i++
    assert.equal(parsedResult[i], 'test4')
    i++
    assert.include(parsedResult[i], 'test4')
    assert.include(parsedResult[i], 'Finished after')
    i++
    assert.include(parsedResult[i], 'All tasks finished after')
    i++
    assert.equal(parsedResult[i], '')
  })

  it('Giving multiple cmfile options', () =>
    expect(CLI(['--cmfile=test/cmFiles/cm1.js', '--cmfile=test/cmFiles/cm1.js', 'test4'])).to.be.rejectedWith(Error).and.eventually.satisfy(err => {
      const { stdout, stderr } = err
      assert.equal(stdout, '')
      const parsedResult = stderr.split('\n')
      assert.equal(parsedResult.length, 2)
      assert.include(parsedResult[0], '--cmfile argument can\'t be given twice to centimaitre')
      assert.equal(parsedResult[1], '')
      return true
    })
  )

  it('Passing options between tasks', () => expect(CLI(['--cmfile=test/cmFiles/cm1.js', 'test4', '--a=b', 'test'])).to.be.rejectedWith(Error).and.eventually.satisfy(err => {
    const { stdout, stderr } = err
    assert.equal(stdout, '')
    const parsedResult = stderr.split('\n')
    assert.equal(parsedResult.length, 2)
    assert.include(parsedResult[0], 'Cannot pass options between tasks')
    assert.equal(parsedResult[1], '')
    return true
  }))

  it('Wrong path in cmfile', () => expect(CLI(['--cmfile=test/cmFiles/cmIDontExist.js', 'test'])).to.be.rejectedWith(Error).and.eventually.satisfy(err => {
    const { stdout, stderr } = err
    assert.equal(stdout, '')
    const parsedResult = stderr.split('\n')
    assert.equal(parsedResult.length, 2)
    assert.include(parsedResult[0], `Could not resolve file ${path.resolve('test/cmFiles/cmIDontExist.js')}`)
    assert.equal(parsedResult[1], '')
    return true
  }))

  it('Require error in cmfile', () => expect(CLI(['--cmfile=test/cmFiles/brokencmfile2.js', 'test'])).to.be.rejectedWith(Error).and.eventually.satisfy(err => {
    const { stdout, stderr } = err
    assert.equal(stdout, '')
    const parsedResult = stderr.split('\n')
    assert.isAbove(parsedResult.length, 3)
    assert.include(parsedResult[0], 'Unknown error Error: Cannot find module \'IDONTEXIST\'')
    return true
  }))

  it('Synchronous error in cmfile', () => expect(CLI(['--cmfile=test/cmFiles/brokencmfile.js', 'test'])).to.be.rejectedWith(Error).and.eventually.satisfy(err => {
    const { stdout, stderr } = err
    assert.equal(stdout, '')
    const parsedResult = stderr.split('\n')
    assert.isAtLeast(parsedResult.length, 3)
    assert.include(parsedResult[0], 'Unknown error Error: Hello there!')
    return true
  }))

  it('Non exisisting task', () => expect(CLI(['--cmfile=test/cmFiles/cm1.js', 'test5'])).to.be.rejectedWith(Error).and.eventually.satisfy(err => {
    const { stdout, stderr } = err
    const parsedStdOut = stdout.split('\n')
    assert.isAtLeast(parsedStdOut.length, 2)
    assert.include(parsedStdOut[0], 'Tasks failed after')
    const parsedResult = stderr.split('\n')
    assert.isAtLeast(parsedResult.length, 3)
    assert.include(parsedResult[0], 'Task "test5" does not exist')
    return true
  }))

  it('Orphaned task', () => expect(CLI(['--cmfile=test/cmFiles/orphaned.js', 'test'])).to.be.rejectedWith(Error).and.eventually.satisfy(err => {
    const { stdout, stderr } = err
    const splitStdout = stdout.split('\n')
    const splitStderr = stderr.split('\n')

    assert.equal(splitStdout.length, 4)
    assert.include(splitStdout[0], 'test2')
    assert.include(splitStdout[0], 'Starting...')
    assert.include(splitStdout[1], 'test2')
    assert.include(splitStdout[1], 'Finished after')
    assert.include(splitStdout[2], 'test')
    assert.include(splitStdout[2], 'Starting...')
    assert.equal(splitStdout[3], '')

    assert.equal(splitStderr.length, 3)
    assert.include(splitStderr[0], 'It seems a Promise has been orphaned, which means it will never be resolved nor rejected. Exiting.')
    assert.include(splitStderr[1], 'It may be "test".')
    assert.equal(splitStderr[2], '')

    return true
  }))

  it('Execute with no task', async () => {
    const { stdout, stderr } = await CLI(['--cmfile=test/cmFiles/cm1.js'])
    assert.equal(stdout, '')
    assert.equal(stderr, '')
  })

  it('Execute with default cmfile', async () => {
    process.chdir('./test/cmFiles')
    const { stdout, stderr } = await CLI(['test4'])
    assert.equal(stderr, '')
    const parsedResult = stdout.split('\n')
    assert.equal(parsedResult.length, 14)
    let i = 0

    assert.include(parsedResult[i], 'test')
    assert.include(parsedResult[i], 'Starting...')
    i++
    assert.equal(parsedResult[i], 'test')
    i++
    assert.include(parsedResult[i], 'test')
    assert.include(parsedResult[i], 'Finished after')
    i++
    assert.include(parsedResult[i], 'test2')
    assert.include(parsedResult[i], 'Starting...')
    i++
    assert.include(parsedResult[i], 'test3')
    assert.include(parsedResult[i], 'Starting...')
    i++
    assert.equal(parsedResult[i], 'test2')
    i++
    assert.include(parsedResult[i], 'test2')
    assert.include(parsedResult[i], 'Finished after')
    i++
    assert.equal(parsedResult[i], 'test3')
    i++
    assert.include(parsedResult[i], 'test3')
    assert.include(parsedResult[i], 'Finished after')
    i++
    assert.include(parsedResult[i], 'test4')
    assert.include(parsedResult[i], 'Starting...')
    i++
    assert.equal(parsedResult[i], 'test4')
    i++
    assert.include(parsedResult[i], 'test4')
    assert.include(parsedResult[i], 'Finished after')
    i++
    assert.include(parsedResult[i], 'All tasks finished after')
    i++
    assert.equal(parsedResult[i], '')
  })
})
