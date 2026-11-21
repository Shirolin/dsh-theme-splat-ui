import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import ts from 'typescript'
import { build } from 'esbuild'
import { buildOwnedSkinCss } from './owned-skin-css.mjs'

// Stamped into the client bundle so a running app can report which build it loaded.
const packageVersion = JSON.parse(await readFile('package.json', 'utf8')).version
const sourceEpoch = process.env.SOURCE_DATE_EPOCH
if (sourceEpoch !== undefined && !/^\d+$/.test(sourceEpoch)) throw new Error('SOURCE_DATE_EPOCH must be Unix seconds')
const buildDate = sourceEpoch === undefined ? new Date() : new Date(Number(sourceEpoch) * 1000)
const builtAt = `${buildDate.toLocaleString('sv-SE', { hour12: false, timeZone: 'UTC' }).slice(0, 16)} UTC`
const buildInfo = { version: packageVersion, builtAt }

const configFile = ts.readConfigFile('tsconfig.types.json', ts.sys.readFile)
if (configFile.error) {
  console.error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'))
  process.exit(1)
}

const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, process.cwd())
const program = ts.createProgram(parsed.fileNames, parsed.options)
const diagnostics = ts.getPreEmitDiagnostics(program)
if (diagnostics.length > 0) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => '\n',
    }),
  )
  process.exit(1)
}

await rm('lib', { recursive: true, force: true })
await mkdir('lib/types', { recursive: true })
const emit = program.emit()
if (emit.emitSkipped) {
  console.error('TypeScript declaration emit was skipped')
  process.exit(1)
}

await build({
  entryPoints: {
    index: 'src/index.ts',
    palette: 'src/palette.ts',
    tokens: 'src/tokens.ts',
  },
  outdir: 'lib',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'silent',
})

const ownedSkinCss = await buildOwnedSkinCss()

const result = await build({
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: ['es2022'],
  jsx: 'automatic',
  loader: { '.png': 'dataurl' },
  external: ['react', 'react/jsx-runtime'],
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'silent',
  plugins: [
    {
      name: 'splat-ui-owned-assets',
      setup(context) {
        context.onResolve({ filter: /^virtual:splat-ui-skin-css$/ }, () => ({
          path: 'splat-ui-skin-css',
          namespace: 'splat-ui-skin',
        }))
        context.onLoad({ filter: /.*/, namespace: 'splat-ui-skin' }, () => ({
          contents: `export const SKIN_CSS = ${JSON.stringify(ownedSkinCss)}`,
          loader: 'ts',
          resolveDir: process.cwd(),
        }))
        context.onResolve({ filter: /^virtual:splat-ui-build$/ }, () => ({
          path: 'splat-ui-build',
          namespace: 'splat-ui-build',
        }))
        context.onLoad({ filter: /.*/, namespace: 'splat-ui-build' }, () => ({
          contents: `export const BUILD = ${JSON.stringify(buildInfo)}`,
          loader: 'ts',
          resolveDir: process.cwd(),
        }))
      },
    },
  ],
})

const clientModule = result.outputFiles.find((file) => file.path.endsWith('.js'))
if (!clientModule) throw new Error('esbuild did not emit the client module')

const clientBundle = `globalThis.__ModuleLoader__?.load({
  id: 'dsh-theme-splat-ui',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
${clientModule.text}
    return module.exports
  },
})
`
await writeFile('lib/client.js', clientBundle)

console.log('Built declarations, esbuild host modules, and the esbuild client skin bundle.')
