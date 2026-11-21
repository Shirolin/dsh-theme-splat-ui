import test from 'node:test'
import assert from 'node:assert/strict'
import { buildOwnedSkinCss } from '../scripts/owned-skin-css.mjs'

test('owned skin CSS resolves every asset and keeps accessibility fallbacks', async () => {
  const css = await buildOwnedSkinCss()
  assert.equal((css.match(/@font-face\{/g) ?? []).length, 6)
  assert.match(css, /html\[data-dsh-splat-ui-skin\]/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /prefers-contrast/)
  assert.match(css, /\[aria-selected="true"\]/)
  assert.match(css, /\[aria-current="page"\]/)
  assert.match(css, /\[data-splat-green=["']?neon["']?\]/)
  assert.match(css, /\[data-splat-green=["']?lime["']?\]/)
  assert.doesNotMatch(css, /__SPLAT_[A-Z0-9_]+__/)
})

test('owned skin CSS sticks to semantic seams', async () => {
  const css = await buildOwnedSkinCss()
  assert.doesNotMatch(css, /nth-child|first-child|last-child/)
  assert.doesNotMatch(css, /data-slot/)
  assert.doesNotMatch(css, /@deepseek-ai\/[^"']+\/lib\//)
  assert.doesNotMatch(css, /\.(?:wtg9ga|css-[a-z0-9]+)_[a-z0-9]+/i)
})
