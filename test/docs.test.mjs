import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const documents = [
  'README.md',
  'README.zh.md',
  'README.ja.md',
  'README.ko.md',
  'CONTRIBUTING.md',
  'CHANGELOG.md',
  'docs/design.md',
  'docs/compatibility.md',
  'docs/acceptance.md',
  'THIRD_PARTY_NOTICES.md',
  'LICENSE',
]

test('install button copies the visible local tarball command', async () => {
  const html = await readFile(resolve(root, 'site/index.html'), 'utf8')
  const script = await readFile(resolve(root, 'site/app.js'), 'utf8')
  const dom = new JSDOM(html, { runScripts: 'outside-only' })
  let copied
  Object.defineProperty(dom.window.navigator, 'clipboard', {
    value: {
      async writeText(text) {
        copied = text
      },
    },
  })
  dom.window.matchMedia = () => ({ matches: true })
  try {
    dom.window.eval(script)
    const button = dom.window.document.querySelector('[data-copy]')
    button.click()
    await new Promise((resolve) => setImmediate(resolve))
    const visible = button.closest('.command').querySelector('pre').textContent
    assert.equal(copied, visible)
    assert.match(copied, /pnpm add file:.*\.tgz/)
    assert.equal(button.textContent, '已复制')
  } finally {
    dom.window.close()
  }
})

test('documentation exists and relative links resolve', async () => {
  for (const document of documents) {
    const path = resolve(root, document)
    await stat(path)
    const text = await readFile(path, 'utf8')
    for (const [, target] of text.matchAll(/\]\((?!https?:|mailto:|#)([^)#\s]+)/g)) {
      const linked = resolve(dirname(path), target)
      assert.ok(
        await stat(linked).then(
          () => true,
          () => false,
        ),
        `${document}: broken link -> ${target}`,
      )
    }
  }
})

test('screenshot metadata points at nonempty delivery images', async () => {
  const screenshots = JSON.parse(await readFile(resolve(root, 'screenshots.json'), 'utf8'))
  assert.ok(screenshots.length >= 3)
  for (const screenshot of screenshots) {
    const size = await stat(resolve(root, screenshot)).then((info) => info.size)
    assert.ok(size > 10_000, `${screenshot}: look like a blank or placeholder image`)
  }
})

test('locale metadata is valid JSON with title and description', async () => {
  for (const locale of ['locale/zh.json', 'locale/en.json']) {
    const meta = JSON.parse(await readFile(resolve(root, locale), 'utf8')).meta
    assert.ok(meta.title.length > 0, `${locale}: missing title`)
    assert.ok(meta.description.length > 0, `${locale}: missing description`)
  }
})
