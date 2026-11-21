import type { InkGreen, Palette } from './types.ts'

/**
 * Splatoon-inspired ink palette translated to DSH semantic surfaces.
 *
 * The light presentation is the canonical "Turf War" look: a neon lime plaza,
 * white ink-stamped paper and heavy black outlines. Dark is the "night battle"
 * derivative — the same lime and magenta ink on a charcoal plaza, not an
 * inversion of the light palette.
 */
export const SPLAT_UI_LIGHT: Palette = {
  bg: '#fbfbf4',
  surface: '#ffffff',
  surfaceAlt: '#e6f7e4',
  surfaceDeep: '#d0eec9',
  overlay: '#ffffff',
  fg: '#121212',
  body: '#242420',
  muted: '#5c5c54',
  caption: '#6a6a61',
  faint: '#9d9d92',
  border: '#161616',
  accent: '#1edc00',
  accentText: '#ad006c',
  accentHover: '#47ee2b',
  primaryButton: '#1edc00',
  primaryButtonHover: '#47ee2b',
  info: '#006c88',
  error: '#d8143c',
  success: '#1b7a0c',
  warn: '#8a5d00',
  sidebar: '#242424',
  sidebarHover: '#2a2a2a',
  sidebarActive: '#1edc00',
  bubble: '#e4fde1',
  code: {
    bg: '#101010',
    fg: '#f4f4ec',
    comment: '#8b8b83',
    keyword: '#ff4fa3',
    string: '#1edc00',
    constant: '#ffd23f',
    function: '#66e3ff',
    parameter: '#ff9d5c',
    punctuation: '#c9c9c0',
    link: '#66e3ff',
  },
}

export const SPLAT_UI_DARK: Palette = {
  bg: '#1b1b19',
  surface: '#232321',
  surfaceAlt: '#292927',
  surfaceDeep: '#141413',
  overlay: '#292927',
  fg: '#f8f8ef',
  body: '#e7e7de',
  muted: '#b6b6ab',
  caption: '#9e9e93',
  faint: '#72736b',
  border: '#dcdcd2',
  accent: '#44f028',
  accentText: '#44f028',
  accentHover: '#6ef757',
  primaryButton: '#1edc00',
  primaryButtonHover: '#47ee2b',
  info: '#6be6ff',
  error: '#ff5f7d',
  success: '#5ce046',
  warn: '#ffd23f',
  sidebar: '#0d0e0d',
  sidebarHover: '#181a18',
  sidebarActive: '#1edc00',
  bubble: '#123310',
  code: {
    bg: '#0a0a09',
    fg: '#f5f5ed',
    comment: '#7f7f78',
    keyword: '#ff6bb0',
    string: '#44f028',
    constant: '#ffd84f',
    function: '#7ae9ff',
    parameter: '#ffab72',
    punctuation: '#d3d3c9',
    link: '#7ae9ff',
  },
}

export const SPLAT_UI_PALETTES = {
  light: SPLAT_UI_LIGHT,
  dark: SPLAT_UI_DARK,
} as const

interface GreenVariantSpec {
  readonly lightAccent: string
  readonly lightHover: string
  readonly lightSurfaceAlt: string
  readonly lightSurfaceDeep: string
  readonly lightBubble: string
  readonly lightSuccess: string
  readonly darkAccent: string
  readonly darkHover: string
  readonly darkBubble: string
  readonly darkSuccess: string
}

function createGreenPalettePair(spec: GreenVariantSpec): { readonly light: Palette; readonly dark: Palette } {
  return {
    light: {
      ...SPLAT_UI_LIGHT,
      surfaceAlt: spec.lightSurfaceAlt,
      surfaceDeep: spec.lightSurfaceDeep,
      accent: spec.lightAccent,
      accentHover: spec.lightHover,
      primaryButton: spec.lightAccent,
      primaryButtonHover: spec.lightHover,
      success: spec.lightSuccess,
      sidebarActive: spec.lightAccent,
      bubble: spec.lightBubble,
      code: { ...SPLAT_UI_LIGHT.code, string: spec.lightAccent },
    },
    dark: {
      ...SPLAT_UI_DARK,
      accent: spec.darkAccent,
      accentText: spec.darkAccent,
      accentHover: spec.darkHover,
      primaryButton: spec.lightAccent,
      primaryButtonHover: spec.lightHover,
      success: spec.darkSuccess,
      sidebarActive: spec.lightAccent,
      bubble: spec.darkBubble,
      code: { ...SPLAT_UI_DARK.code, string: spec.darkAccent },
    },
  }
}

export const INK_GREEN_ORDER: readonly InkGreen[] = ['joycon', 'neon', 'lime']

export const SPLAT_UI_GREEN_PALETTES: Record<InkGreen, { readonly light: Palette; readonly dark: Palette }> = {
  joycon: SPLAT_UI_PALETTES,
  neon: createGreenPalettePair({
    lightAccent: '#9ae528',
    lightHover: '#b1f24b',
    lightSurfaceAlt: '#eef7e2',
    lightSurfaceDeep: '#ddefc7',
    lightBubble: '#ecffd4',
    lightSuccess: '#3b7d0c',
    darkAccent: '#a8f03a',
    darkHover: '#bef763',
    darkBubble: '#1f3410',
    darkSuccess: '#8ee04a',
  }),
  lime: createGreenPalettePair({
    lightAccent: '#d3f510',
    lightHover: '#e2ff3d',
    lightSurfaceAlt: '#f4f7e2',
    lightSurfaceDeep: '#e8eecd',
    lightBubble: '#f6ffd2',
    lightSuccess: '#4d7f0c',
    darkAccent: '#d7ff3a',
    darkHover: '#e8ff72',
    darkBubble: '#2b3410',
    darkSuccess: '#a8e05a',
  }),
}

/** Return the light/dark palette pair for a given ink green preset. */
export function getSplatPalettes(green: InkGreen = 'joycon'): { readonly light: Palette; readonly dark: Palette } {
  return SPLAT_UI_GREEN_PALETTES[green]
}

export type { InkGreen }
