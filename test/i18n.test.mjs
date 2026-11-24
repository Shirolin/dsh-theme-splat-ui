import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { buildOwnedSkinCss } from '../scripts/owned-skin-css.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFile(resolve(root, path), 'utf8')

function loadClientBundleInDom(dom) {
  const prevDocument = globalThis.document
  const prevWindow = globalThis.window
  const prevMutationObserver = globalThis.MutationObserver
  const prevLocalStorage = globalThis.localStorage
  const prevLoader = globalThis.__ModuleLoader__
  const prevNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

  let loadedModule
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  globalThis.MutationObserver = dom.window.MutationObserver
  globalThis.localStorage = dom.window.localStorage
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    enumerable: true,
    get: () => dom.window.navigator,
  })
  globalThis.__ModuleLoader__ = {
    load(entry) {
      loadedModule = entry.factory((id) => {
        if (id === 'react' || id === 'react/jsx-runtime') return {}
        throw new Error(`Unexpected require: ${id}`)
      })
    },
  }

  return {
    async run(fn) {
      const bundle = await read('lib/client.js')
      new Function(bundle)()
      return await fn(loadedModule)
    },
    restore() {
      globalThis.document = prevDocument
      globalThis.window = prevWindow
      globalThis.MutationObserver = prevMutationObserver
      globalThis.localStorage = prevLocalStorage
      globalThis.__ModuleLoader__ = prevLoader
      if (prevNavigatorDescriptor) {
        Object.defineProperty(globalThis, 'navigator', prevNavigatorDescriptor)
      } else {
        delete globalThis.navigator
      }
      dom.window.close()
    },
  }
}

test('client runtime tracks host locale switches and cleans up CSS vars on dispose', async () => {
  const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>', { url: 'https://dsh.local/' })
  Object.defineProperty(dom.window.navigator, 'language', { configurable: true, value: 'en-US' })
  Object.defineProperty(dom.window.navigator, 'languages', { configurable: true, value: ['en-US'] })

  const runner = loadClientBundleInDom(dom)
  try {
    await runner.run((loadedModule) => {
      let hostLocale = 'zh'
      let registeredDicts
      let registerDisposed = false
      const localeListeners = new Set()
      const disposers = []
      let registeredTabOptions
      let injectedLocaleStore

      const ctx = {
        theme: {
          overrideTokens: () => () => {},
          getTheme: () => ({ preference: 'light', active: { colorScheme: 'light' } }),
        },
        locale: {
          register(_ns, dictionaries) {
            registeredDicts = dictionaries
            return () => {
              registerDisposed = true
            }
          },
          bind() {
            return (key) => registeredDicts?.[hostLocale]?.[key] ?? ''
          },
          subscribe(listener) {
            localeListeners.add(listener)
            return () => localeListeners.delete(listener)
          },
        },
        slots: {
          inject(_key, callback) {
            const clean = callback()
            return typeof clean === 'function' ? clean : () => {}
          },
          register(options) {
            if (options.name === 'settings.plugins.tab') {
              registeredTabOptions = options
              injectedLocaleStore = options.inject?.().locale
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

      assert.ok(registeredTabOptions, 'appearance tab slot should be registered')
      assert.equal(typeof registeredTabOptions.label, 'function')
      assert.ok(injectedLocaleStore, 'locale store should be injected into appearance tab')
      assert.equal(injectedLocaleStore.getSnapshot(), 'zh')
      assert.equal(registeredTabOptions.label(), '墨街外观')
      assert.equal(html.style.getPropertyValue('--splat-boot-loading-text'), '"正在涂满战场…"')

      let storeNotified = 0
      const unsubStore = injectedLocaleStore.subscribe(() => {
        storeNotified += 1
      })

      hostLocale = 'en'
      for (const listener of [...localeListeners]) listener()

      assert.equal(storeNotified, 1)
      assert.equal(injectedLocaleStore.getSnapshot(), 'en')
      assert.equal(registeredTabOptions.label(), 'Splat appearance')
      assert.equal(html.style.getPropertyValue('--splat-boot-loading-text'), '"Painting the turf…"')

      unsubStore()
      while (disposers.length > 0) disposers.pop()()

      assert.equal(html.style.getPropertyValue('--splat-boot-loading-text'), '')
      assert.equal(registerDisposed, true)
      assert.equal(localeListeners.size, 0)
    })
  } finally {
    runner.restore()
  }
})

test('client runtime falls back to ja/ko when host locale is en or absent, and tolerates strict register()', async () => {
  for (const [envTag, expectedLocale, expectedTab, expectedBoot] of [
    ['ja-JP', 'ja', '墨街外観', '"バトルフィールドを塗り広げ中…"'],
    ['ko-KR', 'ko', 'SPLAT-STREET 외관', '"배틀필드를 칠하는 중…"'],
  ]) {
    const dom = new JSDOM(`<!doctype html><html lang="${envTag}"><head></head><body></body></html>`, { url: 'https://dsh.local/' })
    Object.defineProperty(dom.window.navigator, 'language', { configurable: true, value: envTag })
    Object.defineProperty(dom.window.navigator, 'languages', { configurable: true, value: [envTag] })

    const runner = loadClientBundleInDom(dom)
    try {
      await runner.run((loadedModule) => {
        const disposers = []
        let strictCalls = 0
        let registeredDicts
        let registeredTabOptions
        let injectedLocaleStore

        const ctx = {
          theme: {
            overrideTokens: () => () => {},
            getTheme: () => ({ preference: 'light', active: { colorScheme: 'light' } }),
          },
          locale: {
            register(_ns, dictionaries) {
              strictCalls += 1
              if (Object.keys(dictionaries).some((k) => k !== 'zh' && k !== 'en')) {
                throw new Error('Only zh/en dictionaries accepted')
              }
              registeredDicts = dictionaries
              return () => {}
            },
            bind() {
              return (key) => registeredDicts?.en?.[key] ?? ''
            },
          },
          slots: {
            inject(_key, callback) {
              const clean = callback()
              return typeof clean === 'function' ? clean : () => {}
            },
            register(options) {
              if (options.name === 'settings.plugins.tab') {
                registeredTabOptions = options
                injectedLocaleStore = options.inject?.().locale
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
        assert.equal(strictCalls, 2)
        assert.equal(injectedLocaleStore.getSnapshot(), expectedLocale)
        assert.equal(registeredTabOptions.label(), expectedTab)
        assert.equal(html.style.getPropertyValue('--splat-boot-loading-text'), expectedBoot)

        while (disposers.length > 0) disposers.pop()()
      })
    } finally {
      runner.restore()
    }
  }
})

test('owned skin CSS supports boot loading CSS var and :lang() fallbacks', async () => {
  const css = await buildOwnedSkinCss()
  assert.match(css, /var\(--splat-boot-loading-text/)
  assert.match(css, /:lang\(zh\)/)
  assert.match(css, /:lang\(ja\)/)
  assert.match(css, /:lang\(ko\)/)
})

test('site i18n dictionary covers all keys across all four site pages and showcase manifest', async () => {
  const i18nScript = await read('site/i18n.js')
  const manifest = JSON.parse(await read('site/showcase/generated/manifest.json'))
  const pages = ['site/index.html', 'site/showcase/index.html', 'site/promo/index.html', 'site/promo/animatic-landscape.html']

  for (const pagePath of pages) {
    const html = await read(pagePath)
    const dom = new JSDOM(html, {
      url: 'https://shirolin.github.io/dsh-theme-splat-ui/',
      runScripts: 'outside-only',
    })
    try {
      dom.window.eval(i18nScript)
      const i18n = dom.window.splatSiteI18n
      assert.ok(i18n, `${pagePath}: splatSiteI18n should be exposed`)

      const keys = new Set()
      for (const el of dom.window.document.querySelectorAll('[data-i18n]')) {
        keys.add(el.dataset.i18n)
      }
      for (const el of dom.window.document.querySelectorAll('[data-i18n-html]')) {
        keys.add(el.dataset.i18nHtml)
      }
      for (const el of dom.window.document.querySelectorAll('[data-i18n-diagram-alt]')) {
        keys.add(el.dataset.i18nDiagramAlt)
      }
      for (const el of dom.window.document.querySelectorAll('[data-i18n-attr]')) {
        for (const pair of el.dataset.i18nAttr.split(',')) {
          const sep = pair.indexOf(':')
          if (sep > 0) keys.add(pair.slice(sep + 1).trim())
        }
      }

      assert.ok(keys.size > 0, `${pagePath}: should declare data-i18n keys`)
      for (const locale of ['zh', 'en', 'ja', 'ko']) {
        i18n.setLocale(locale)
        for (const key of keys) {
          const translated = i18n.t(key)
          assert.ok(translated.length > 0, `${pagePath} [${locale}] missing translation for "${key}"`)
        }
        if (pagePath === 'site/showcase/index.html') {
          for (const group of manifest.groups) {
            const translatedGroup = i18n.getGroupName(group)
            assert.ok(translatedGroup && translatedGroup.length > 0, `showcase [${locale}] missing group "${group}"`)
          }
          for (const fixture of manifest.fixtures) {
            const translatedTitle = i18n.getFixtureTitle(fixture.name)
            assert.ok(translatedTitle && translatedTitle.length > 0, `showcase [${locale}] missing fixture "${fixture.name}"`)
          }
        }
      }
    } finally {
      dom.window.close()
    }
  }
})

test('landing page switches html lang, headings, command dir, and copy feedback across all 4 locales', async () => {
  const html = await read('site/index.html')
  const i18nScript = await read('site/i18n.js')
  const appScript = await read('site/app.js')
  const dom = new JSDOM(html, {
    url: 'https://shirolin.github.io/dsh-theme-splat-ui/',
    runScripts: 'outside-only',
  })

  let copied = ''
  Object.defineProperty(dom.window.navigator, 'clipboard', {
    value: {
      async writeText(text) {
        copied = text
      },
    },
  })
  dom.window.matchMedia = () => ({ matches: true })

  try {
    dom.window.eval(i18nScript)
    dom.window.eval(appScript)

    const select = dom.window.document.querySelector('[data-lang-select]')
    const h1 = dom.window.document.querySelector('h1')
    const cmdDir = dom.window.document.querySelector('[data-i18n="landing.install.cmdDir"]')
    const copyBtn = dom.window.document.querySelector('[data-copy]')

    for (const [locale, htmlLang, expectedDir, expectedCopied] of [
      ['en', 'en', 'cd <DSH_Profile_dir>', 'Copied'],
      ['ja', 'ja', 'cd <DSH_Profile_ディレクトリ>', 'コピーしました'],
      ['ko', 'ko', 'cd <DSH_Profile_디렉터리>', '복사됨'],
      ['zh', 'zh-CN', 'cd <DSH_Profile_目录>', '已复制'],
    ]) {
      select.value = locale
      select.dispatchEvent(new dom.window.Event('change', { bubbles: true }))

      assert.equal(dom.window.document.documentElement.lang, htmlLang)
      assert.equal(cmdDir.textContent, expectedDir)
      assert.ok(h1.textContent.length > 0)

      copyBtn.click()
      await new Promise((resolveImmediate) => setImmediate(resolveImmediate))
      assert.match(copied, /pnpm add dsh-theme-splat-ui/)
      assert.equal(copyBtn.textContent, expectedCopied)
    }
  } finally {
    dom.window.close()
  }
})
