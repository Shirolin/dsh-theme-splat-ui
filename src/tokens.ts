import type { InkGreen, Mode, Palette, TokenMap, TokenPairs } from './types.ts'
import { getSplatPalettes, INK_GREEN_ORDER, SPLAT_UI_GREEN_PALETTES, SPLAT_UI_PALETTES } from './palette.ts'

interface Rgb {
  r: number
  g: number
  b: number
}

function rgb(value: string): Rgb {
  const hex = value.trim().replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/i.test(hex)) throw new Error(`Expected a six-digit hex colour, received: ${value}`)
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

function hex({ r, g, b }: Rgb): string {
  return `#${[r, g, b]
    .map((part) =>
      Math.round(Math.max(0, Math.min(255, part)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

function mix(a: string, b: string, amount: number): string {
  const left = rgb(a)
  const right = rgb(b)
  const t = Math.max(0, Math.min(1, amount))
  return hex({
    r: left.r + (right.r - left.r) * t,
    g: left.g + (right.g - left.g) * t,
    b: left.b + (right.b - left.b) * t,
  })
}

function alpha(value: string, opacity: number): string {
  const c = rgb(value)
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${opacity})`
}

function channel(value: number): number {
  const srgb = value / 255
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

function luminance(value: string): number {
  const c = rgb(value)
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b)
}

export function contrastRatio(a: string, b: string): number {
  const first = luminance(a)
  const second = luminance(b)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

function readable(background: string, light: string, dark: string): string {
  return contrastRatio(light, background) >= contrastRatio(dark, background) ? light : dark
}

function legibleFill(accent: string, background: string): string {
  const white = '#ffffff'
  const black = '#121212'
  if (contrastRatio(accent, white) >= 3 && contrastRatio(accent, background) >= 3) return accent
  const target = contrastRatio(accent, white) < contrastRatio(accent, black) ? black : white
  let candidate = accent
  for (let step = 1; step <= 12; step += 1) {
    candidate = mix(accent, target, step / 12)
    if (contrastRatio(candidate, white) >= 3 && contrastRatio(candidate, background) >= 3) return candidate
  }
  return readable(background, white, black)
}

function lift(base: string, foreground: string, amount: number): string {
  return mix(base, foreground, amount)
}

export function buildTokens(palette: Palette, mode: Mode): TokenMap {
  const dark = mode === 'dark'
  const code = palette.code
  const codeFg = code.fg ?? palette.fg
  const surface = palette.surface
  const surfaceAlt = palette.surfaceAlt
  const bg = palette.bg
  const fg = palette.fg
  const body = palette.body
  const border = palette.border
  const accent = palette.accent
  const accentText = palette.accentText
  const accentHover = palette.accentHover
  const primaryButton = palette.primaryButton
  const primaryButtonHover = palette.primaryButtonHover
  const infoFill = legibleFill(palette.info, bg)
  const tooltipBg = dark ? lift(surface, fg, 0.18) : mix(fg, bg, 0.1)
  // Lime is bright in both palettes, so button labels are always ink black.
  const primaryFg = readable(primaryButton, '#fffbe7', '#121212')

  return {
    // Paper, ink-dark surfaces and the translucent sheet over the ink plaza.
    '--dsw-alias-bg-base': bg,
    '--dsw-alias-bg-layer-1': surface,
    '--dsw-alias-bg-layer-2': surfaceAlt,
    '--dsw-alias-bg-layer-3': palette.surfaceDeep,
    '--dsw-alias-bg-module-platform': lift(bg, fg, 0.04),
    '--dsw-alias-bg-multi-select': lift(surface, fg, 0.06),
    '--dsw-alias-bg-overlay': palette.overlay,
    '--dsw-alias-bg-skeleton': alpha(fg, 0.08),
    '--dsw-alias-bg-mask-1': dark ? '#000000c9' : '#12121252',
    '--dsw-alias-bg-mask-2': dark ? '#00000080' : '#12121224',
    '--dsw-alias-bg-mask-3': '#000000b3',
    '--dsw-alias-bg-mask-photo': '#000000e6',
    '--dsw-alias-bg-mask-drop': alpha(bg, 0.74),

    // Ink outlines instead of hairline grey borders.
    '--dsw-alias-border-l1': alpha(border, dark ? 0.14 : 0.2),
    '--dsw-alias-border-l2': alpha(border, dark ? 0.3 : 0.36),
    '--dsw-alias-border-l2-darkmode-thin': alpha(border, 0.3),
    '--dsw-alias-border-l3': alpha(border, dark ? 0.6 : 0.55),
    '--dsw-alias-border-l4': alpha(border, 0.82),
    '--dsw-alias-border-inverted': alpha(fg, 0.08),
    '--dsw-alias-border-inverted2': alpha(fg, 0.12),

    // Lime controls, magenta links, and hard graphic buttons.
    '--dsw-alias-brand-primary': accent,
    '--dsw-alias-brand-primary-invert': dark ? '#121212' : '#ffffff',
    '--dsw-alias-brand-primary-new-colorprimary-new-color': accent,
    '--dsw-alias-brand-text': fg,
    '--dsw-alias-link': accentText,
    '--dsw-font-family': 'Nunito, "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    '--ds-font-family-code': '"SFMono-Regular", "Cascadia Code", "Fira Code", Consolas, "Liberation Mono", monospace',
    '--dsw-alias-button-contrast-fill': dark ? mix(fg, bg, 0.16) : mix(fg, bg, 0.08),
    '--dsw-alias-button-elevated-fill': palette.overlay,
    '--dsw-alias-button-floating-fill': surface,
    '--dsw-alias-button-floating-hover': lift(surface, fg, 0.07),
    '--dsw-alias-button-ghost-active-border': border,
    '--dsw-alias-button-ghost-active-fill': lift(surface, fg, 0.08),
    '--dsw-alias-button-ghost-active-hover': lift(surface, fg, 0.14),
    '--dsw-alias-button-info-fill': infoFill,
    '--dsw-alias-button-info-hover': mix(infoFill, fg, 0.18),
    '--dsw-alias-button-primary-dimmed': mix(primaryButton, bg, 0.3),
    '--dsw-alias-button-primary-fill': primaryButton,
    '--dsw-alias-button-primary-hover': primaryButtonHover,
    '--dsw-alias-button-tool-bar-fill': alpha(fg, 0.5),
    '--dsw-alias-button-tool-bar-fill-invisible': alpha(fg, 0.36),
    '--dsw-alias-button-tool-bar-hover': alpha(fg, 0.62),

    // Hover/active feedback stays high-visibility lime and magenta ink.
    '--dsw-alias-interactive-bg-hover': dark ? `${primaryButton}24` : `${primaryButton}59`,
    '--dsw-alias-interactive-bg-hover-accent': alpha(accent, dark ? 0.2 : 0.32),
    '--dsw-alias-interactive-bg-hover-danger': alpha(palette.error, 0.14),
    '--dsw-alias-interactive-bg-hover-solid': dark ? '#2b2b28' : alpha(palette.sidebarHover, 0.9),
    '--dsw-alias-interactive-bg-active': alpha(accent, 0.72),

    // Black ink type hierarchy.
    '--dsw-alias-label-primary': fg,
    '--dsw-alias-label-secondary': body,
    '--dsw-alias-label-tertiary': palette.muted,
    '--dsw-alias-label-caption': palette.caption,
    '--dsw-alias-label-dimmed': mix(palette.faint, bg, 0.45),
    '--dsw-alias-label-primary-bluish': fg,
    '--dsw-alias-label-primary-dimmed': mix(fg, bg, 0.12),
    '--dsw-alias-label-primary-foreground': primaryFg,
    '--dsw-alias-label-primary-inverted': dark ? '#121212' : bg,

    // Markdown, inline code, and syntax highlighting.
    '--dsw-alias-markdown-code-block': code.bg,
    '--dsw-alias-markdown-code-block-banner': lift(code.bg, code.fg, 0.06),
    '--dsw-alias-markdown-code-segment-selected': lift(code.bg, code.fg, 0.11),
    '--dsw-alias-markdown-code-segment-unselected': code.bg,
    '--dsw-alias-markdown-inline-code': dark ? '#2a2a26' : surfaceAlt === '#f4f7e2' ? '#eef3d5' : mix(surfaceAlt, palette.surfaceDeep, 0.5),
    '--dsw-alias-markdown-citation': lift(surface, fg, 0.07),
    '--dsw-alias-markdown-placeholder': lift(bg, fg, 0.04),
    '--dsw-alias-markdown-tag': lift(surface, fg, 0.05),

    // Scrollbars and status colours.
    '--dsw-alias-scrollbar-bg-l1': alpha(fg, dark ? 0.16 : 0.18),
    '--dsw-alias-scrollbar-bg-l2': alpha(fg, dark ? 0.2 : 0.22),
    '--dsw-alias-scrollbar-hover-l1': alpha(accent, 0.6),
    '--dsw-alias-scrollbar-hover-l2': alpha(accent, 0.7),
    '--dsw-alias-state-error-primary': palette.error,
    '--dsw-alias-state-error-secondary': mix(palette.error, bg, 0.2),
    '--dsw-alias-state-success-primary': palette.success,
    '--dsw-alias-state-success-secondary': mix(palette.success, bg, 0.2),
    '--dsw-alias-state-success-tertiary': mix(palette.success, bg, 0.82),
    '--dsw-alias-state-warn-primary': palette.warn,
    '--dsw-alias-state-warn-secondary': mix(palette.warn, bg, 0.2),
    '--dsw-alias-state-warn-tertiary': mix(palette.warn, bg, 0.82),
    '--dsw-alias-state-warn-label': palette.warn,
    '--dsw-alias-state-business-primary': accentText,
    '--dsw-alias-state-business-tertiary': mix(accent, bg, 0.78),

    // Floating chrome plus the near-black sidebar swatches.
    '--dsw-alias-toast-bg': tooltipBg,
    '--dsw-alias-tooltip-bg': tooltipBg,
    '--dsw-specific-bubble': palette.bubble,
    '--dsw-specific-bubble-highlight': mix(palette.bubble, accent, 0.3),
    '--dsw-specific-input-major': surface,
    '--dsw-specific-login-input': lift(bg, fg, 0.03),
    '--dsw-specific-menu': dark ? '#282826' : surface,
    '--dsw-specific-selector': lift(surface, fg, 0.05),
    '--dsw-specific-sidebar-fill': palette.sidebar,
    '--dsw-specific-sidebar-nav-item-hover': palette.sidebarHover,
    '--dsw-specific-sidebar-nav-item-active': palette.sidebarActive,
    '--dsw-specific-sidebar-nav-item-active-accent': mix(palette.sidebarActive, fg, 0.16),
    '--dsw-specific-tip': lift(surface, fg, 0.05),

    // A small set of current DSH consumers reads raw ramp slots directly.
    '--dsw-static-deepseek-500': dark ? accent : accent === '#d3f510' ? '#3c5200' : mix(palette.success, '#121212', 0.25),
    '--dsw-static-deepseek-200': mix(accent, bg, 0.6),
    '--dsw-static-blue-500': accentText,
    '--dsw-static-blue-450': accentHover,
    '--dsw-static-neutral-bluish-400': palette.faint,

    // Hard offset shadows read as screen-printed stickers.
    '--dsw-shadow-lv1': dark ? '0 2px 0 0 #000000a6' : '0 2px 0 0 #1212122e',
    '--dsw-shadow-lv1-blur': dark ? '0 4px 10px 0 #00000073' : '0 4px 10px 0 #1212121f',
    '--dsw-shadow-lv2': dark ? '0 3px 0 0 #000000a6, 0 8px 18px 0 #00000059' : '0 3px 0 0 #1212122e, 0 8px 18px 0 #12121224',
    '--dsw-shadow-lv3': dark
      ? '0 0 1px 0 #ffffff1f, 0 4px 0 0 #000000b3, 0 14px 34px 0 #00000080'
      : '0 0 1px 0 #12121233, 0 4px 0 0 #12121233, 0 14px 34px 0 #12121229',
    '--dsw-elevation-stroke-color': dark ? '#dcdcd266' : '#1212124d',
    '--dsw-elevation-stroke': '0 0 0 1px var(--dsw-elevation-stroke-color)',
    '--dsw-elevation-panel': 'var(--dsw-elevation-stroke), 0 3px 0 0 #12121238, 0 10px 24px 0 #1212121f',
    '--dsw-elevation-prominent': 'var(--dsw-elevation-stroke), 0 4px 0 0 #1212124d, 0 14px 32px 0 #1212122e',
    '--dsw-elevation-soft': 'var(--dsw-elevation-stroke), 0 4px 14px 0 #1212121a, 0 0 26px 0 #12121212',
    '--dsw-linear-gradient-think': `linear-gradient(180deg, ${bg} 20.19%, ${alpha(bg, 0)} 100%)`,
    '--dsw-linear-think-select': `linear-gradient(180deg, ${surface} 20.19%, ${alpha(surface, 0)} 100%)`,

    // Shiki syntax tokens.
    '--shiki-foreground': codeFg,
    '--shiki-background': code.bg,
    '--shiki-token-comment': code.comment,
    '--shiki-token-keyword': code.keyword,
    '--shiki-token-string': code.string,
    '--shiki-token-string-expression': code.string,
    '--shiki-token-constant': code.constant,
    '--shiki-token-function': code.function,
    '--shiki-token-parameter': code.parameter,
    '--shiki-token-punctuation': code.punctuation,
    '--shiki-token-link': code.link,
  }
}

/** Build the exact payload accepted by ctx.theme.overrideTokens(). */
export function buildTokenOverrides(green: InkGreen = 'joycon'): TokenPairs {
  const palettes = getSplatPalettes(green)
  const light = buildTokens(palettes.light, 'light')
  const dark = buildTokens(palettes.dark, 'dark')
  const names = new Set([...Object.keys(light), ...Object.keys(dark)])
  const pairs: TokenPairs = {}
  for (const name of names) {
    const lightValue = light[name] ?? dark[name]
    const darkValue = dark[name] ?? light[name]
    if (lightValue === undefined || darkValue === undefined) {
      throw new Error(`Missing token value: ${name}`)
    }
    pairs[name] = {
      light: lightValue,
      dark: darkValue,
    }
  }
  return pairs
}

export { getSplatPalettes, INK_GREEN_ORDER, SPLAT_UI_GREEN_PALETTES, SPLAT_UI_PALETTES }
export type { InkGreen }
