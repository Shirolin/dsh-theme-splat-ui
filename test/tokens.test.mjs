import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTokens, buildTokenOverrides, contrastRatio, INK_GREEN_ORDER, SPLAT_UI_GREEN_PALETTES, SPLAT_UI_PALETTES } from '../lib/tokens.js'

const REQUIRED = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-border-l1',
  '--dsw-alias-brand-primary',
  '--dsw-alias-button-primary-fill',
  '--dsw-alias-label-primary',
  '--dsw-alias-label-primary-foreground',
  '--dsw-alias-markdown-code-block',
  '--dsw-specific-sidebar-fill',
  '--dsw-specific-sidebar-nav-item-active',
  '--dsw-font-family',
  '--dsw-shadow-lv2',
  '--shiki-foreground',
  '--shiki-background',
  '--shiki-token-keyword',
]

test('every token pair is complete in both modes', () => {
  const pairs = buildTokenOverrides()
  for (const name of REQUIRED) {
    assert.ok(pairs[name], `missing token ${name}`)
    assert.ok(pairs[name].light.length > 0, `${name}: empty light value`)
    assert.ok(pairs[name].dark.length > 0, `${name}: empty dark value`)
  }
  for (const [name, pair] of Object.entries(pairs)) {
    assert.equal(typeof pair.light, 'string', `${name}: light must be a string`)
    assert.equal(typeof pair.dark, 'string', `${name}: dark must be a string`)
  }
})

test('light and dark are separate ink palettes, not an inversion', () => {
  const light = buildTokens(SPLAT_UI_PALETTES.light, 'light')
  const dark = buildTokens(SPLAT_UI_PALETTES.dark, 'dark')
  assert.notEqual(light['--dsw-alias-bg-base'], dark['--dsw-alias-bg-base'])
  assert.equal(light['--dsw-alias-brand-primary'], SPLAT_UI_PALETTES.light.accent)
  assert.equal(dark['--dsw-alias-brand-primary'], SPLAT_UI_PALETTES.dark.accent)
  assert.match(light['--dsw-font-family'], /^Nunito,/)
  assert.match(dark['--dsw-font-family'], /^Nunito,/)
  assert.equal(dark['--dsw-alias-label-primary-inverted'], '#121212')
})

test('body, link and code text meet WCAG AA contrast', () => {
  for (const palette of Object.values(SPLAT_UI_PALETTES)) {
    assert.ok(contrastRatio(palette.fg, palette.bg) >= 12, `${palette.bg}: body contrast too low`)
    assert.ok(contrastRatio(palette.accentText, palette.bg) >= 4.5, `${palette.bg}: link contrast below 4.5:1`)
    assert.ok(contrastRatio(palette.code.fg, palette.code.bg) >= 4.5, `${palette.code.bg}: code contrast below 4.5:1`)
  }
})

test('lime primary buttons always take ink-black labels', () => {
  for (const [mode, palette] of Object.entries(SPLAT_UI_PALETTES)) {
    const tokens = buildTokens(palette, mode)
    const label = tokens['--dsw-alias-label-primary-foreground']
    assert.equal(label, '#121212', `${mode}: primary button label must be ink black`)
    assert.ok(contrastRatio(label, palette.primaryButton) >= 4.5, `${mode}: primary button label contrast below 4.5:1`)
  }
})

test('every ink green preset meets contrast and builds distinct token overrides', () => {
  assert.deepEqual(INK_GREEN_ORDER, ['joycon', 'neon', 'lime'])
  const expectedLightAccent = {
    joycon: '#1edc00',
    neon: '#9ae528',
    lime: '#d3f510',
  }
  const defaultPairs = buildTokenOverrides()
  assert.equal(defaultPairs['--dsw-alias-brand-primary'].light, '#1edc00')
  assert.equal(defaultPairs['--dsw-alias-brand-primary'].dark, '#44f028')

  for (const green of INK_GREEN_ORDER) {
    const palettes = SPLAT_UI_GREEN_PALETTES[green]
    const pairs = buildTokenOverrides(green)
    assert.equal(pairs['--dsw-alias-brand-primary'].light, expectedLightAccent[green])
    assert.equal(pairs['--dsw-alias-button-primary-fill'].light, expectedLightAccent[green])
    assert.equal(pairs['--dsw-alias-label-primary-foreground'].light, '#121212')
    assert.equal(pairs['--dsw-alias-label-primary-foreground'].dark, '#121212')

    for (const [mode, palette] of Object.entries(palettes)) {
      assert.ok(contrastRatio(palette.fg, palette.bg) >= 12, `${green}/${mode}: body contrast too low`)
      assert.ok(contrastRatio(palette.accentText, palette.bg) >= 4.5, `${green}/${mode}: link contrast below 4.5:1`)
      assert.ok(contrastRatio(palette.code.fg, palette.code.bg) >= 4.5, `${green}/${mode}: code contrast below 4.5:1`)
      assert.ok(contrastRatio('#121212', palette.primaryButton) >= 4.5, `${green}/${mode}: primary button contrast below 4.5:1`)
    }
  }
})
