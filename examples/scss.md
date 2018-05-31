```javascript
'use strict'
const cm = require('centimaitre')
const jetpack = require('fs-jetpack')
const sass = require('node-sass')
const {promisify} = require('util')

const sassRender = promisify(sass.render)

const srcDir = jetpack.cwd('./src/')
const libDir = jetpack.cwd('./lib/')

cm.setDefaultOptions({
  sourceMaps: true
})

cm.task('clean', () => {
  libDir.dir('.', {empty: true})
})

cm.task('build-scss', ['clean'], async options => {
  for (const file of srcDir.find({matching: '**/*.js'})) {
    const inputPath = srcDir.path(file)
    const outputPath = libDir.path(file.replace(/\.scss$/, '.css'))
    const {css, map} = await sassRender({
      file: inputPath,
      outFile: outputPath,
      sourceMap: options.sourceMaps
    })
    await libDir.writeAsync(outputPath, css.toString())
    if (options.sourceMaps) await libDir.writeAsync(outputPath + '.map', map.toString())
  }
})
```
