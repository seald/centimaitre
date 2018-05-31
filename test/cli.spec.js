/* global describe, it */

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const dirtyChai = require('dirty-chai')
const childProcess = require('child_process')
const path = require('path')
const {promisify} = require('util')

chai.use(chaiAsPromised)
chai.use(dirtyChai)
const {assert, expect} = chai
const binPath = path.resolve('./bin/centimaitre-cli.js')
const CLI = async (options = []) => promisify(childProcess.execFile)(binPath, options)

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

describe('CLI', () => {
  it('Testing simple case', async () => {
    const {stdout, stderr} = await CLI(['--cmfile=test/cmFiles/cm1.js', 'test'])
    assert.equal(stderr, '')
    const parsedResult = stdout.split('\n')
    assert.equal(parsedResult.length, 4)
    assert.isTrue(parsedResult[0].includes('test') && parsedResult[0].includes('Starting...'))
    assert.equal(parsedResult[1], 'test')
    assert.isTrue(parsedResult[2].includes('test') && parsedResult[2].includes('Finished after'))
    assert.equal(parsedResult[3], '')
  })

  it('Testing case with dependencies', async () => {
    const {stdout, stderr} = await CLI(['--cmfile=test/cmFiles/cm1.js', 'test4'])
    assert.equal(stderr, '')
    const parsedResult = stdout.split('\n')
    assert.equal(parsedResult.length, 13)
    let i = 0
    assert.isTrue(parsedResult[i++].includes('test') && parsedResult[i].includes('Starting...'))
    assert.equal(parsedResult[i++], 'test')
    assert.isTrue(parsedResult[i++].includes('test') && parsedResult[i].includes('Finished after'))
    assert.isTrue(parsedResult[i++].includes('test2') && parsedResult[i].includes('Starting...'))
    assert.isTrue(parsedResult[i++].includes('test3') && parsedResult[i].includes('Starting...'))
    assert.equal(parsedResult[i++], 'test2')
    assert.isTrue(parsedResult[i++].includes('test2') && parsedResult[i].includes('Finished after'))
    assert.equal(parsedResult[i++], 'test3')
    assert.isTrue(parsedResult[i++].includes('test3') && parsedResult[i].includes('Finished after'))
    assert.isTrue(parsedResult[i++].includes('test4') && parsedResult[i].includes('Starting...'))
    assert.equal(parsedResult[i++], 'test4')
    assert.isTrue(parsedResult[i++].includes('test4') && parsedResult[i].includes('Finished after'))
    assert.equal(parsedResult[i], '')
  })

  it('Giving multiple cmfile options', () =>
    expect(CLI(['--cmfile=test/cmFiles/cm1.js', '--cmfile=test/cmFiles/cm1.js', 'test4'])).to.be.rejectedWith(Error).and.eventually.satisfy(err => {
      const {stdout, stderr} = err
      assert.equal(stdout, '')
      const parsedResult = stderr.split('\n')
      assert.equal(parsedResult.length, 2)
      assert.isTrue(parsedResult[0].includes('--cmfile argument can\'t be given twice to centimaitre'))
      assert.equal(parsedResult[1], '')
      return true
    })
  )

  it('Passing options between tasks', () => expect(CLI(['--cmfile=test/cmFiles/cm1.js', 'test4', '--a=b', 'test'])).to.be.rejectedWith(Error).and.eventually.satisfy(err => {
    const {stdout, stderr} = err
    assert.equal(stdout, '')
    const parsedResult = stderr.split('\n')
    assert.equal(parsedResult.length, 2)
    assert.isTrue(parsedResult[0].includes('Cannot pass options between tasks'))
    assert.equal(parsedResult[1], '')
    return true
  }))

  it('Wrong path in cmfile', () => expect(CLI(['--cmfile=test/cmFiles/cmIDontExist.js', 'test'])).to.be.rejectedWith(Error).and.eventually.satisfy(err => {
    const {stdout, stderr} = err
    assert.equal(stdout, '')
    const parsedResult = stderr.split('\n')
    assert.equal(parsedResult.length, 2)
    assert.isTrue(parsedResult[0].includes(`Could not resolve file ${path.resolve('test/cmFiles/cmIDontExist.js')}`))
    assert.equal(parsedResult[1], '')
    return true
  }))

  it('Require error in cmfile', () => expect(CLI(['--cmfile=test/cmFiles/brokencmfile2.js', 'test'])).to.be.rejectedWith(Error).and.eventually.satisfy(err => {
    const {stdout, stderr} = err
    assert.equal(stdout, '')
    const parsedResult = stderr.split('\n')
    assert.isAbove(parsedResult.length, 3)
    assert.isTrue(parsedResult[0].includes('Unknown error Error: Cannot find module \'IDONTEXIST\''))
    return true
  }))

  it('Synchronous error in cmfile', () => expect(CLI(['--cmfile=test/cmFiles/brokencmfile.js', 'test'])).to.be.rejectedWith(Error).and.eventually.satisfy(err => {
    const {stdout, stderr} = err
    assert.equal(stdout, '')
    const parsedResult = stderr.split('\n')
    assert.isAtLeast(parsedResult.length, 3)
    assert.isTrue(parsedResult[0].includes('Unknown error Error: Hello there!'))
    return true
  }))

  it('Non exisisting task', () => expect(CLI(['--cmfile=test/cmFiles/cm1.js', 'test5'])).to.be.rejectedWith(Error).and.eventually.satisfy(err => {
    const {stdout, stderr} = err
    assert.equal(stdout, '')
    const parsedResult = stderr.split('\n')
    assert.isAtLeast(parsedResult.length, 3)
    assert.isTrue(parsedResult[0].includes('Called non-existing task taskName from undefined'))
    return true
  }))

  it('Execute with no task', async () => {
    const {stdout, stderr} = await CLI(['--cmfile=test/cmFiles/cm1.js'])
    assert.equal(stdout, '')
    assert.equal(stderr, '')
  })

  it('Execute with default cmfile', async () => {
    process.chdir('./test/cmFiles')
    const {stdout, stderr} = await CLI(['test4'])
    assert.equal(stderr, '')
    const parsedResult = stdout.split('\n')
    assert.equal(parsedResult.length, 13)
    let i = 0
    assert.isTrue(parsedResult[i++].includes('test') && parsedResult[i].includes('Starting...'))
    assert.equal(parsedResult[i++], 'test')
    assert.isTrue(parsedResult[i++].includes('test') && parsedResult[i].includes('Finished after'))
    assert.isTrue(parsedResult[i++].includes('test2') && parsedResult[i].includes('Starting...'))
    assert.isTrue(parsedResult[i++].includes('test3') && parsedResult[i].includes('Starting...'))
    assert.equal(parsedResult[i++], 'test2')
    assert.isTrue(parsedResult[i++].includes('test2') && parsedResult[i].includes('Finished after'))
    assert.equal(parsedResult[i++], 'test3')
    assert.isTrue(parsedResult[i++].includes('test3') && parsedResult[i].includes('Finished after'))
    assert.isTrue(parsedResult[i++].includes('test4') && parsedResult[i].includes('Starting...'))
    assert.equal(parsedResult[i++], 'test4')
    assert.isTrue(parsedResult[i++].includes('test4') && parsedResult[i].includes('Finished after'))
    assert.equal(parsedResult[i], '')
  })
})
