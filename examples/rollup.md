```javascript
'use strict'
const cm = require('centimaitre')
const jetpack = require('fs-jetpack')
const rollup = require('rollup')

const srcDir = jetpack.cwd('./src/')
const libDir = jetpack.cwd('./lib/')
const filename = 'main.js'

cm.setDefaultOptions({
  sourceMaps: true
})

cm.task('clean', () => {
  libDir.dir('.', {empty: true})
})

cm.task('build', ['clean'], async (options) => {
  const inputOptions = {
    input: srcDir.path(filename),
    plugins: [
      // Your rollup plugins go here
    ]
  }
  const outputOptions = {
    format: 'cjs',
    file: libDir.path(filename),
    name: 'test',
    sourcemap: options.sourceMaps
  }
  const bundle = await rollup.rollup(inputOptions)
  await bundle.write(outputOptions)
})
```
