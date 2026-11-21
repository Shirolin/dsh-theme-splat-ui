import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transform } from 'lightningcss'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fontWeights = [400, 500, 600, 700, 800, 900]
const assetPlaceholders = {
  __SPLAT_SQUIDS__: 'squid-pattern.svg',
  __SPLAT_SQUIDS_SOFT__: 'squid-pattern-soft.svg',
  __SPLAT_SQUIDS_INK__: 'squid-pattern-ink.svg',
  __SPLAT_SQUIDS_INK_SOFT__: 'squid-pattern-ink-soft.svg',
  __SPLAT_SQUIDS_FAINT__: 'squid-pattern-faint.svg',
  __SPLAT_SQUIDS_INK_FAINT__: 'squid-pattern-ink-faint.svg',
  __SPLAT_SQUID_WATERMARK__: 'squid-watermark.svg',
  __SPLAT_BRAND_SQUID__: 'brand-squid-pink.svg',
  __SPLAT_SIDEBAR_SPLAT__: 'sidebar-splat.svg',
  __SPLAT_SETTINGS_SELECTED_INK__: 'settings-selected-ink.svg',
  __SPLAT_SPLASH_PINK__: 'ink-splash-pink.svg',
  __SPLAT_POUR__: 'ink-pour-pink.svg',
  __SPLAT_CORNER_LEFT__: 'ink-corner-bottom-left.svg',
  __SPLAT_SPLASH_LIME__: 'ink-splash-lime.svg',
  __SPLAT_HALFTONE__: 'halftone-corner.svg',
  __SPLAT_HALFTONE_INK__: 'halftone-ink.svg',
  __SPLAT_BARCODE__: 'barcode.svg',
  __SPLAT_STICKER__: 'sticker-barcode.svg',
  __SPLAT_ARENA__: 'arena-bands.svg',
  __SPLAT_TONE__: 'screen-tone.svg',
  __SPLAT_TONE_NIGHT__: 'screen-tone-night.svg',
  __SPLAT_DRIP__: 'ink-drip.svg',
  __SPLAT_BRUSH_PINK__: 'brush-pink.svg',
  __SPLAT_BRUSH_LIME__: 'brush-lime.svg',
  __SPLAT_BOOT_SQUID__: 'boot-squid.svg',
  __SPLAT_BOOT_GAUGE__: 'boot-gauge.svg',
}

const greenSvgKeys = new Set([
  '__SPLAT_ARENA__',
  '__SPLAT_BARCODE__',
  '__SPLAT_BOOT_GAUGE__',
  '__SPLAT_BOOT_SQUID__',
  '__SPLAT_BRUSH_LIME__',
  '__SPLAT_CORNER_LEFT__',
  '__SPLAT_POUR__',
  '__SPLAT_SPLASH_LIME__',
  '__SPLAT_SPLASH_PINK__',
  '__SPLAT_SETTINGS_SELECTED_INK__',
  '__SPLAT_STICKER__',
])

const greenSvgVariants = {
  LIME: [
    [/#1edc00/gi, '#d3f510'],
    [/#a9ee9b/gi, '#e0f583'],
    [/#147506/gi, '#718405'],
  ],
  NEON: [
    [/#1edc00/gi, '#9ae528'],
    [/#a9ee9b/gi, '#cdeea0'],
    [/#147506/gi, '#487d08'],
  ],
}

function recolorSvg(svg, replacements) {
  let result = svg
  for (const [pattern, target] of replacements) {
    result = result.replaceAll(pattern, target)
  }
  return result
}

async function assetDataUri(file) {
  if (file.endsWith('.png')) {
    const data = await readFile(join(root, 'src', 'client', 'assets', file))
    return `data:image/png;base64,${data.toString('base64')}`
  }
  const svg = await readFile(join(root, 'src', 'client', 'assets', file), 'utf8')
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

async function buildAssetReplacements() {
  const entries = Object.entries(assetPlaceholders)
  const resolved = await Promise.all(
    entries.map(async ([placeholder, file]) => {
      if (file.endsWith('.png')) {
        return [[placeholder, await assetDataUri(file)]]
      }
      const svg = await readFile(join(root, 'src', 'client', 'assets', file), 'utf8')
      const pairs = [[placeholder, `data:image/svg+xml,${encodeURIComponent(svg)}`]]
      if (greenSvgKeys.has(placeholder)) {
        const stem = placeholder.slice(0, -2)
        for (const [variant, replacements] of Object.entries(greenSvgVariants)) {
          const variantSvg = recolorSvg(svg, replacements)
          pairs.push([`${stem}_${variant}__`, `data:image/svg+xml,${encodeURIComponent(variantSvg)}`])
        }
      }
      return pairs
    }),
  )
  return resolved.flat()
}

async function fontFaces() {
  return (
    await Promise.all(
      fontWeights.map(async (weight) => {
        const file = join(root, 'node_modules', '@fontsource', 'nunito', 'files', `nunito-latin-${weight}-normal.woff2`)
        const data = (await readFile(file)).toString('base64')
        return `@font-face{font-family:Nunito;font-style:normal;font-display:swap;font-weight:${weight};src:url(data:font/woff2;base64,${data}) format("woff2")}`
      }),
    )
  ).join('\n')
}

/** Build the exact owned CSS embedded in the client and used by visual fixtures. */
export async function buildOwnedSkinCss() {
  const [fonts, skinCss, replacements] = await Promise.all([fontFaces(), readFile(join(root, 'src', 'client', 'skin.css'), 'utf8'), buildAssetReplacements()])

  let source = skinCss
  for (const [placeholder, dataUri] of replacements) {
    source = source.replaceAll(placeholder, dataUri)
  }

  const unresolved = source.match(/__SPLAT_[A-Z0-9_]+__/)
  if (unresolved) {
    throw new Error(`Unresolved owned skin asset placeholder: ${unresolved[0]}`)
  }

  const transformed = transform({
    filename: 'skin.css',
    code: Buffer.from(source),
    minify: false,
    sourceMap: false,
  }).code.toString()

  return `${fonts}\n${transformed}`
}
