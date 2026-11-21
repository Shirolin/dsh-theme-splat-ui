import type { ClientContextLike, ThemeRuntimeLike } from './context.ts'
import { createAppearanceStore, type AppearanceStore } from './appearance.ts'
import { createFontLayer } from './font-layer.ts'
import { BUILD } from 'virtual:splat-ui-build'
import { SKIN_CSS } from 'virtual:splat-ui-skin-css'

export const PLUGIN_ID = 'dsh-theme-splat-ui'
export const ROOT_ATTRIBUTE = 'data-dsh-splat-ui-skin'
export const ROOT_VALUE = 'active'
/** Readable build stamp of this bundle, e.g. "0.1.0 2026-11-11 15:06". */
export const BUILD_LABEL = `${BUILD.version} ${BUILD.builtAt}`
const BUILD_ATTRIBUTE = 'data-splat-build'
const WINDOWS_TITLEBAR_ATTRIBUTE = 'data-windows-titlebar'
const THEME_SOURCE_ATTRIBUTE = 'data-ds-theme-source'
const DARK_THEME_ATTRIBUTE = 'data-ds-dark-theme'

export interface InstalledSkin {
  readonly appearance: AppearanceStore
}

interface Installation {
  readonly root: HTMLElement
  readonly skin: InstalledSkin
  references: number
  dispose(): void
}

const installations = new WeakMap<HTMLElement, Installation>()

function restoreRootAttribute(root: HTMLElement, previousValue: string | null): void {
  if (root.getAttribute(ROOT_ATTRIBUTE) !== ROOT_VALUE) return
  if (previousValue === null) root.removeAttribute(ROOT_ATTRIBUTE)
  else root.setAttribute(ROOT_ATTRIBUTE, previousValue)
}

function resolveHostThemeSource(root: HTMLElement, theme: ThemeRuntimeLike | undefined, overridden: boolean): 'light' | 'dark' | 'system' | undefined {
  const snapshot = theme?.getTheme?.()
  if (snapshot !== undefined) {
    if (snapshot.preference === 'system') return 'system'
    if (snapshot.active?.colorScheme === 'dark' || snapshot.preference === 'dark') return 'dark'
    if (snapshot.active?.colorScheme === 'light' || snapshot.preference === 'light') return 'light'
  }
  const current = root.getAttribute(THEME_SOURCE_ATTRIBUTE)
  if (current === 'system' || current === 'light') return current
  if (current === 'dark') {
    if (root.ownerDocument.body?.hasAttribute(DARK_THEME_ATTRIBUTE)) return 'dark'
    return overridden ? 'light' : 'dark'
  }
  return undefined
}

/**
 * On Windows (`html[data-windows-titlebar]`), the light SPLAT-STREET palette
 * keeps an ink-dark titlebar and sidebar (`#272826` / `#242424`). When the user
 * selects the explicit light theme (`data-ds-theme-source="light"`), Electron's
 * native non-client frame and DWM border paint `#f3f3f3` at fractional DPI,
 * leaving a white rim around the dark shell. Mirroring `"dark"` onto
 * `data-ds-theme-source` while the explicit light preference is active switches
 * the native frame to `#202020` without touching `system` mode's OS media query
 * or the document's light token palette.
 */
function createWindowsThemeSourceSync(root: HTMLElement, ctx: ClientContextLike): { dispose(): void } {
  let overridden = false
  const sync = () => {
    const hostSource = resolveHostThemeSource(root, ctx.theme, overridden)
    const shouldOverride = root.hasAttribute(WINDOWS_TITLEBAR_ATTRIBUTE) && hostSource === 'light'
    if (shouldOverride) {
      overridden = true
      if (root.getAttribute(THEME_SOURCE_ATTRIBUTE) !== 'dark') {
        root.setAttribute(THEME_SOURCE_ATTRIBUTE, 'dark')
      }
      return
    }
    if (!overridden) return
    overridden = false
    if (hostSource !== undefined && hostSource !== 'dark' && root.getAttribute(THEME_SOURCE_ATTRIBUTE) === 'dark') {
      root.setAttribute(THEME_SOURCE_ATTRIBUTE, hostSource)
    }
  }

  const observer = typeof MutationObserver === 'function' ? new MutationObserver(sync) : undefined
  observer?.observe(root, {
    attributes: true,
    attributeFilter: [THEME_SOURCE_ATTRIBUTE, WINDOWS_TITLEBAR_ATTRIBUTE],
  })
  if (root.ownerDocument.body) {
    observer?.observe(root.ownerDocument.body, {
      attributes: true,
      attributeFilter: [DARK_THEME_ATTRIBUTE],
    })
  }
  const offThemeChange = typeof ctx.on === 'function' ? ctx.on('theme/change', () => sync()) : undefined
  sync()

  return {
    dispose() {
      observer?.disconnect()
      offThemeChange?.()
      if (!overridden) return
      overridden = false
      if (root.getAttribute(THEME_SOURCE_ATTRIBUTE) === 'dark') {
        root.setAttribute(THEME_SOURCE_ATTRIBUTE, 'light')
      }
    },
  }
}

function createInstallation(root: HTMLElement, ctx: ClientContextLike): Installation {
  const previousValue = root.getAttribute(ROOT_ATTRIBUTE)
  const ownerDocument = root.ownerDocument
  const style = ownerDocument.createElement('style')
  style.setAttribute('data-plugin', PLUGIN_ID)
  style.setAttribute('data-plugin-css', `${PLUGIN_ID}/skin`)
  style.textContent = SKIN_CSS
  const appearance = createAppearanceStore(root, createFontLayer(ctx.theme))
  let windowsThemeSource: { dispose(): void } | undefined

  try {
    root.setAttribute(ROOT_ATTRIBUTE, ROOT_VALUE)
    root.setAttribute(BUILD_ATTRIBUTE, BUILD_LABEL)
    ownerDocument.head.append(style)
    windowsThemeSource = createWindowsThemeSourceSync(root, ctx)
  } catch (error) {
    windowsThemeSource?.dispose()
    style.remove()
    appearance.dispose()
    root.removeAttribute(BUILD_ATTRIBUTE)
    restoreRootAttribute(root, previousValue)
    throw error
  }

  let active = true
  return {
    root,
    skin: { appearance },
    references: 0,
    dispose() {
      if (!active) return
      active = false
      windowsThemeSource?.dispose()
      style.remove()
      root.removeAttribute(BUILD_ATTRIBUTE)
      appearance.dispose()
      restoreRootAttribute(root, previousValue)
    },
  }
}

/** Install or reuse the root-owned skin lifecycle and return its public handle. */
export function installOwnedSkin(ctx: ClientContextLike): InstalledSkin | undefined {
  if (typeof document === 'undefined' || !document.documentElement || !document.head) return undefined

  const root = document.documentElement
  const installation = installations.get(root) ?? createInstallation(root, ctx)
  installations.set(root, installation)
  installation.references += 1

  let released = false
  const release = () => {
    if (released) return
    released = true
    installation.references -= 1
    if (installation.references > 0) return
    installations.delete(root)
    installation.dispose()
  }

  try {
    ctx.effect(() => release, 'splat-ui:owned-skin')
  } catch (error) {
    release()
    throw error
  }
  return installation.skin
}
