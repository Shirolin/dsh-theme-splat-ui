import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFile(resolve(root, path), 'utf8')

test('client bundle is wrapped for the DSH module loader', async () => {
  const bundle = await read('lib/client.js')
  assert.match(bundle, /^globalThis\.__ModuleLoader__\?\.load\(/)
  assert.match(bundle, /id: 'dsh-theme-splat-ui'/)
  assert.match(bundle, /data-dsh-splat-ui-skin/)
  assert.doesNotMatch(bundle, /__SPLAT_[A-Z0-9_]+__/)
})

test('Windows light mode syncs data-ds-theme-source to dark and restores on system or dispose', async () => {
  const bundle = await read('lib/client.js')
  const dom = new JSDOM('<!doctype html><html data-windows-titlebar data-ds-theme-source="light"><head></head><body></body></html>')
  const prevDocument = globalThis.document
  const prevMutationObserver = globalThis.MutationObserver
  const prevLoader = globalThis.__ModuleLoader__

  let loadedModule
  globalThis.document = dom.window.document
  globalThis.MutationObserver = dom.window.MutationObserver
  globalThis.__ModuleLoader__ = {
    load(entry) {
      loadedModule = entry.factory((id) => {
        if (id === 'react' || id === 'react/jsx-runtime') return {}
        throw new Error(`Unexpected require: ${id}`)
      })
    },
  }

  try {
    new Function(bundle)()
    let state = { preference: 'light', active: { colorScheme: 'light' } }
    const listeners = new Set()
    const disposers = []
    const ctx = {
      theme: {
        overrideTokens: () => () => {},
        getTheme: () => state,
      },
      effect(fn) {
        const clean = fn()
        if (typeof clean === 'function') disposers.push(clean)
      },
      on(event, fn) {
        if (event === 'theme/change') listeners.add(fn)
        return () => listeners.delete(fn)
      },
    }

    loadedModule.apply(ctx)
    const html = dom.window.document.documentElement
    assert.equal(html.getAttribute('data-ds-theme-source'), 'dark')

    // Switch to system: ThemePresenter writes "system", sync leaves it as "system".
    state = { preference: 'system', active: { colorScheme: 'light' } }
    html.setAttribute('data-ds-theme-source', 'system')
    for (const fn of listeners) fn(state)
    assert.equal(html.getAttribute('data-ds-theme-source'), 'system')

    // Switch back to explicit light: ThemePresenter writes "light", sync flips it to "dark".
    state = { preference: 'light', active: { colorScheme: 'light' } }
    html.setAttribute('data-ds-theme-source', 'light')
    for (const fn of listeners) fn(state)
    assert.equal(html.getAttribute('data-ds-theme-source'), 'dark')

    // Disposing while in explicit light mode restores "light".
    while (disposers.length > 0) disposers.pop()()
    assert.equal(html.getAttribute('data-ds-theme-source'), 'light')
  } finally {
    globalThis.document = prevDocument
    globalThis.MutationObserver = prevMutationObserver
    globalThis.__ModuleLoader__ = prevLoader
  }
})

test('host entry exposes apply without side effects', async () => {
  const host = await read('lib/index.js')
  assert.match(host, /function apply\(\)/)
  assert.match(host, /export \{\s*apply\s*\}/)
  assert.doesNotMatch(host, /document\.|window\.|localStorage/)
})

test('client bundle embeds every font face and artwork', async () => {
  const bundle = await read('lib/client.js')
  assert.equal((bundle.match(/@font-face\{/g) ?? []).length, 6)

  const assets = [
    'squid-pattern.svg',
    'squid-pattern-soft.svg',
    'squid-pattern-ink.svg',
    'squid-pattern-ink-soft.svg',
    'squid-pattern-faint.svg',
    'squid-pattern-ink-faint.svg',
    'squid-watermark.svg',
    'brand-squid-pink.svg',
    'sidebar-splat.svg',
    'ink-splash-pink.svg',
    'ink-pour-pink.svg',
    'ink-corner-bottom-left.svg',
    'ink-splash-lime.svg',
    'halftone-corner.svg',
    'halftone-ink.svg',
    'arena-bands.svg',
    'barcode.svg',
    'sticker-barcode.svg',
    'screen-tone.svg',
    'ink-drip.svg',
    'brush-pink.svg',
    'brush-lime.svg',
    'boot-squid.svg',
    'boot-gauge.svg',
  ]
  for (const asset of assets) {
    const uri = `data:image/svg+xml,${encodeURIComponent(await read(`src/client/assets/${asset}`))}`
    assert.ok(bundle.includes(uri), `${asset} is not embedded in lib/client.js`)
  }
  const cityImage = await readFile(resolve(root, 'src/client/assets/inkopolis-square.png'))
  assert.ok(bundle.includes(`data:image/png;base64,${cityImage.toString('base64')}`), 'square artwork is embedded in lib/client.js')
})

test('cordis patch and package exports point at shipped artifacts', async () => {
  const patch = await read('cordis.patch.yml')
  assert.match(patch, /dsh-theme-splat-ui/)

  const packageJson = JSON.parse(await read('package.json'))
  for (const target of ['./lib/index.js', './lib/client.js', './lib/palette.js', './lib/tokens.js', './assets/icon-256.png']) {
    await readFile(resolve(root, target))
  }
  assert.equal(packageJson.dsh.client.platform, 'web')
  assert.ok(packageJson.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-theme'))
})

test('appearance green switching sets data-splat-green, updates ThemeRuntime layer, and cleans up on reset/dispose', async () => {
  const bundle = await read('lib/client.js')
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://dsh.local/' })
  const prevDocument = globalThis.document
  const prevMutationObserver = globalThis.MutationObserver
  const prevLocalStorage = globalThis.localStorage
  const prevLoader = globalThis.__ModuleLoader__

  let loadedModule
  globalThis.document = dom.window.document
  globalThis.MutationObserver = dom.window.MutationObserver
  globalThis.localStorage = dom.window.localStorage
  globalThis.__ModuleLoader__ = {
    load(entry) {
      loadedModule = entry.factory((id) => {
        if (id === 'react' || id === 'react/jsx-runtime') return {}
        throw new Error(`Unexpected require: ${id}`)
      })
    },
  }

  try {
    new Function(bundle)()
    const activeLayers = new Map()
    const disposers = []
    let appearanceStore

    const ctx = {
      theme: {
        overrideTokens(source, tokens) {
          activeLayers.set(source, tokens)
          return () => {
            if (activeLayers.get(source) === tokens) activeLayers.delete(source)
          }
        },
        getTheme: () => ({ preference: 'light', active: { colorScheme: 'light' } }),
      },
      slots: {
        inject(_key, callback) {
          const clean = callback()
          return typeof clean === 'function' ? clean : () => {}
        },
        register(options) {
          if (options.name === 'settings.plugins.tab' && typeof options.inject === 'function') {
            appearanceStore = options.inject().appearance
          }
          return () => {}
        },
      },
      effect(fn) {
        const clean = fn()
        if (typeof clean === 'function') disposers.push(clean)
      },
    }

    loadedModule.apply(ctx)
    const html = dom.window.document.documentElement
    assert.ok(appearanceStore, 'appearance store should be injected into settings.plugins.tab')
    assert.equal(html.getAttribute('data-splat-green'), 'joycon')
    assert.equal(activeLayers.has('dsh-theme-splat-ui:appearance'), false)

    appearanceStore.set({ green: 'neon' })
    assert.equal(html.getAttribute('data-splat-green'), 'neon')
    assert.equal(activeLayers.get('dsh-theme-splat-ui:appearance')['--dsw-alias-brand-primary'].light, '#9ae528')

    appearanceStore.set({ green: 'lime', font: 'system' })
    assert.equal(html.getAttribute('data-splat-green'), 'lime')
    const limeLayer = activeLayers.get('dsh-theme-splat-ui:appearance')
    assert.equal(limeLayer['--dsw-alias-brand-primary'].light, '#d3f510')
    assert.ok(limeLayer['--dsw-font-family'])

    appearanceStore.reset()
    assert.equal(html.getAttribute('data-splat-green'), 'joycon')
    assert.equal(activeLayers.has('dsh-theme-splat-ui:appearance'), false)

    appearanceStore.set({ green: 'neon' })
    assert.equal(activeLayers.has('dsh-theme-splat-ui:appearance'), true)
    while (disposers.length > 0) disposers.pop()()
    assert.equal(html.getAttribute('data-splat-green'), null)
    assert.equal(activeLayers.has('dsh-theme-splat-ui:appearance'), false)
  } finally {
    globalThis.document = prevDocument
    globalThis.MutationObserver = prevMutationObserver
    globalThis.localStorage = prevLocalStorage
    globalThis.__ModuleLoader__ = prevLoader
    dom.window.close()
  }
})
