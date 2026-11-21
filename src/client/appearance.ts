import type { InkGreen } from '../types.ts'

/**
 * Canvas appearance preferences for the SPLAT-STREET skin.
 *
 * The value set is small and purely visual: the alpha of the paper sheet DSH
 * lays over the ink plaza, the syntax palette used by the flat deliverables
 * diff, whether the ink décor and screen-tone grain are shown, and which UI
 * font family the skin uses. All of it is kept in localStorage (per client)
 * rather than the Host settings document because it is a per-device visual
 * preference.
 */

export type AppearancePreset = 'paper' | 'balanced' | 'turf' | 'custom'

/**
 * Syntax palette used by the flat deliverables code diff on the light paper.
 * `neon` is the skin's own light-surface palette; `native` restores DSH's
 * built-in light syntax colours. Dark mode always keeps the theme palette.
 */
export type DiffSyntax = 'neon' | 'native'

/**
 * Interface font family. `theme` keeps the bundled Nunito Latin face; `system`
 * uses the platform UI stack. Neither changes the content font size, which the
 * Host owns, nor the code font, which is part of the theme identity.
 */
export type InterfaceFont = 'theme' | 'system'

/** The place where a font override layer is registered, kept apart from the palette. */
export interface AppearanceFontLayer {
  /** Register or remove the system-font token layer. Returns whether the desired state is active. */
  set(enabled: boolean): boolean
  /** Apply or clear the token overrides for a non-default ink green preset. */
  setGreen?(green: InkGreen): boolean
  dispose(): void
}

interface AppearanceState {
  preset: AppearancePreset
  veil: number
  diffSyntax: DiffSyntax
  decor: boolean
  grain: boolean
  font: InterfaceFont
  green: InkGreen
}

export type { InkGreen }

export interface AppearanceStore {
  getSnapshot(): AppearanceState
  subscribe(listener: () => void): () => void
  set(next: Partial<AppearanceState>): AppearanceState
  /** Restore every appearance axis to its shipped default. */
  reset(): AppearanceState
  dispose(): void
}

export const APPEARANCE_PRESETS = {
  paper: 0.5,
  balanced: 0.12,
  turf: 0,
} as const

/** UI-facing ink saturation percentage (left=paper 20%, middle=balanced 50%, right=turf 100%). */
export const APPEARANCE_INK_PRESETS = {
  paper: 20,
  balanced: 50,
  turf: 100,
} as const

export const APPEARANCE_DEFAULTS = {
  preset: 'balanced',
  veil: APPEARANCE_PRESETS.balanced,
  diffSyntax: 'neon',
  decor: true,
  grain: true,
  font: 'theme',
  green: 'joycon',
  min: 0,
  max: 0.6,
} as const

const INK_STOPS: readonly (readonly [ink: number, veil: number])[] = [
  [0, APPEARANCE_DEFAULTS.max],
  [APPEARANCE_INK_PRESETS.paper, APPEARANCE_PRESETS.paper],
  [APPEARANCE_INK_PRESETS.balanced, APPEARANCE_PRESETS.balanced],
  [APPEARANCE_INK_PRESETS.turf, APPEARANCE_PRESETS.turf],
]

/** Map internal veil alpha (`0.60..0.00`) to positive UI ink percentage (`0..100`). */
export function veilToInk(veil: number): number {
  const clamped = Math.min(APPEARANCE_DEFAULTS.max, Math.max(APPEARANCE_DEFAULTS.min, veil))
  for (let i = 0; i < INK_STOPS.length - 1; i++) {
    const [ink0, veil0] = INK_STOPS[i]
    const [ink1, veil1] = INK_STOPS[i + 1]
    if (clamped >= veil1) {
      const t = (veil0 - clamped) / (veil0 - veil1)
      return Math.round(ink0 + t * (ink1 - ink0))
    }
  }
  return APPEARANCE_INK_PRESETS.turf
}

/** Map positive UI ink percentage (`0..100`) to internal veil alpha (`0.60..0.00`). */
export function inkToVeil(ink: number): number {
  const clamped = Math.min(100, Math.max(0, ink))
  for (let i = 0; i < INK_STOPS.length - 1; i++) {
    const [ink0, veil0] = INK_STOPS[i]
    const [ink1, veil1] = INK_STOPS[i + 1]
    if (clamped <= ink1) {
      const t = (clamped - ink0) / (ink1 - ink0)
      return Math.round((veil0 - t * (veil0 - veil1)) * 1000) / 1000
    }
  }
  return APPEARANCE_PRESETS.turf
}

const DEFAULT_STATE: AppearanceState = {
  preset: APPEARANCE_DEFAULTS.preset,
  veil: APPEARANCE_DEFAULTS.veil,
  diffSyntax: APPEARANCE_DEFAULTS.diffSyntax,
  decor: APPEARANCE_DEFAULTS.decor,
  grain: APPEARANCE_DEFAULTS.grain,
  font: APPEARANCE_DEFAULTS.font,
  green: APPEARANCE_DEFAULTS.green,
}

const STORAGE_KEY = 'dsh-theme-splat-ui:appearance'

/**
 * Root attributes owned by this plugin. Every one of them is captured before
 * the skin paints and restored when it unmounts, so an overlapping install or
 * an HMR cycle can never leak a stale appearance onto the page.
 */
const ROOT_ATTRIBUTES = [
  'data-splat-appearance',
  'data-splat-diff-syntax',
  'data-splat-decor',
  'data-splat-grain',
  'data-splat-font',
  'data-splat-green',
] as const

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function isPreset(value: unknown): value is AppearancePreset {
  return value === 'paper' || value === 'balanced' || value === 'turf' || value === 'custom'
}

function isDiffSyntax(value: unknown): value is DiffSyntax {
  return value === 'neon' || value === 'native'
}

function isInterfaceFont(value: unknown): value is InterfaceFont {
  return value === 'theme' || value === 'system'
}

function isInkGreen(value: unknown): value is InkGreen {
  return value === 'lime' || value === 'neon' || value === 'joycon'
}

function normalizeAppearance(input: unknown): AppearanceState {
  const raw = input !== null && typeof input === 'object' ? (input as Partial<AppearanceState>) : {}
  const preset = isPreset(raw.preset) ? raw.preset : APPEARANCE_DEFAULTS.preset
  const fallback = preset === 'custom' ? APPEARANCE_DEFAULTS.veil : APPEARANCE_PRESETS[preset]
  const rawVeil = typeof raw.veil === 'number' && Number.isFinite(raw.veil) ? raw.veil : fallback
  const veil = Math.min(APPEARANCE_DEFAULTS.max, Math.max(APPEARANCE_DEFAULTS.min, rawVeil))
  const diffSyntax = isDiffSyntax(raw.diffSyntax) ? raw.diffSyntax : APPEARANCE_DEFAULTS.diffSyntax
  const decor = typeof raw.decor === 'boolean' ? raw.decor : APPEARANCE_DEFAULTS.decor
  const grain = typeof raw.grain === 'boolean' ? raw.grain : APPEARANCE_DEFAULTS.grain
  const font = isInterfaceFont(raw.font) ? raw.font : APPEARANCE_DEFAULTS.font
  const green = isInkGreen(raw.green) ? raw.green : APPEARANCE_DEFAULTS.green
  return { preset, veil: Math.round(veil * 1000) / 1000, diffSyntax, decor, grain, font, green }
}

function readStorage(): StorageLike | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

function readAppearance(source: StorageLike | undefined = readStorage()): AppearanceState {
  if (!source) return DEFAULT_STATE
  try {
    return normalizeAppearance(JSON.parse(source.getItem(STORAGE_KEY) ?? 'null'))
  } catch {
    return DEFAULT_STATE
  }
}

function writeAppearance(state: AppearanceState, target: StorageLike | undefined = readStorage()): void {
  if (!target) return
  try {
    target.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Private mode / storage disabled: the in-memory value still applies.
  }
}

function paintAppearance(state: AppearanceState, root: HTMLElement): void {
  root.style.setProperty('--splat-canvas-veil', String(state.veil))
  root.setAttribute('data-splat-appearance', state.preset)
  root.setAttribute('data-splat-diff-syntax', state.diffSyntax)
  root.setAttribute('data-splat-decor', state.decor ? 'on' : 'off')
  root.setAttribute('data-splat-grain', state.grain ? 'on' : 'off')
  root.setAttribute('data-splat-font', state.font)
  root.setAttribute('data-splat-green', state.green)
}

function clearAppearance(root: HTMLElement): void {
  root.style.removeProperty('--splat-canvas-veil')
  for (const attribute of ROOT_ATTRIBUTES) root.removeAttribute(attribute)
}

/** Capture the current root state so dispose can put it back exactly. */
function captureRoot(root: HTMLElement): Map<string, string | null> {
  return new Map(ROOT_ATTRIBUTES.map((attribute) => [attribute, root.getAttribute(attribute)]))
}

function restoreRoot(root: HTMLElement, previous: Map<string, string | null>): void {
  for (const [attribute, value] of previous) {
    if (value === null) root.removeAttribute(attribute)
    else root.setAttribute(attribute, value)
  }
}

/** Create the appearance store owned by one installed skin root. */
export function createAppearanceStore(root: HTMLElement, fontLayer?: AppearanceFontLayer): AppearanceStore {
  const previousVeil = root.style.getPropertyValue('--splat-canvas-veil')
  const previousVeilPriority = root.style.getPropertyPriority('--splat-canvas-veil')
  const previousAttributes = captureRoot(root)
  const listeners = new Set<() => void>()
  let active = true
  let current = readAppearance()

  // A saved system-font or green preference is only valid while its token layer
  // can be installed; a missing ThemeRuntime falls back to the shipped default
  // instead of leaving the UI claiming an override the page is not using.
  if (current.font === 'system' && !fontLayer?.set(true)) {
    current = { ...current, font: 'theme' }
    writeAppearance(current)
  }
  if (current.green !== 'joycon' && fontLayer?.setGreen !== undefined && !fontLayer.setGreen(current.green)) {
    current = { ...current, green: 'joycon' }
    writeAppearance(current)
  }

  try {
    paintAppearance(current, root)
  } catch (error) {
    fontLayer?.dispose()
    clearAppearance(root)
    restoreRoot(root, previousAttributes)
    if (previousVeil !== '') root.style.setProperty('--splat-canvas-veil', previousVeil, previousVeilPriority)
    throw error
  }

  const apply = (next: Partial<AppearanceState>): AppearanceState => {
    const candidate = normalizeAppearance({ ...current, ...next })
    if (candidate.font !== current.font) {
      if (candidate.font === 'system') {
        // A missing or rejected layer must not leave the UI claiming a font the
        // page is not using; keep the theme face and continue with other axes.
        if (fontLayer?.set(true) !== true) candidate.font = 'theme'
      } else {
        fontLayer?.set(false)
      }
    }
    if (candidate.green !== current.green) {
      if (candidate.green !== 'joycon') {
        if (fontLayer?.setGreen !== undefined && fontLayer.setGreen(candidate.green) !== true) {
          candidate.green = 'joycon'
        }
      } else {
        fontLayer?.setGreen?.('joycon')
      }
    }
    current = candidate
    writeAppearance(current)
    paintAppearance(current, root)
    for (const listener of [...listeners]) listener()
    return current
  }

  return {
    getSnapshot() {
      return current
    },
    subscribe(listener) {
      if (!active) return () => undefined
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    set(next) {
      if (!active) return current
      return apply(next)
    },
    reset() {
      if (!active) return current
      return apply(DEFAULT_STATE)
    },
    dispose() {
      if (!active) return
      active = false
      listeners.clear()
      fontLayer?.dispose()
      clearAppearance(root)
      if (previousVeil !== '') root.style.setProperty('--splat-canvas-veil', previousVeil, previousVeilPriority)
      restoreRoot(root, previousAttributes)
      current = DEFAULT_STATE
    },
  }
}
