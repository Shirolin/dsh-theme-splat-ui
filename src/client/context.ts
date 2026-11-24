import type { ComponentType } from 'react'
import type { TokenPairs } from '../types.ts'

export interface ThemeSnapshotLike {
  readonly preference?: string
  readonly active?: {
    readonly colorScheme?: string
  }
}

export interface ThemeRuntimeLike {
  overrideTokens(source: string, tokens: TokenPairs): () => void
  getTheme?(): ThemeSnapshotLike
}

interface SlotRegistrationOptions {
  name: string
  locale?: string
  priority?: number
  /** List-slot entry id (`settings.plugins.tab` and friends). */
  id?: string
  /** Optional ordering among a list slot's entries. */
  order?: number
  /** Registrant-localized label; a thunk is re-read when the locale changes. */
  label?: string | (() => string)
  /** Keyed-slot key (`settings.plugin.item` keys on the settings namespace). */
  key?: string
  children?: Readonly<
    Record<
      string,
      {
        kind: 'single' | 'list' | 'keyed' | 'chain'
        scope: 'root' | 'session' | 'session-maybe'
        inject?: object
      }
    >
  >
  inject?: (...args: never[]) => object
}

interface SlotSpecLike {
  kind: string
  scope: string
}

export interface SlotRegistryLike {
  inject(key: string, callback: () => (() => void) | Iterable<() => void>): () => void
  register<P extends object>(options: SlotRegistrationOptions, component: ComponentType<P>): () => void
  spec(key: string): SlotSpecLike | undefined
}

export interface LocaleServiceLike {
  register?(ns: string, dictionaries: Record<string, Record<string, string>>): () => void
  bind?(ns: string): (key: string, params?: Record<string, unknown>) => string
  getSnapshot?(): unknown
  subscribe?(listener: () => void): () => void
}

export interface ClientContextLike {
  theme?: ThemeRuntimeLike
  slots?: SlotRegistryLike
  locale?: LocaleServiceLike
  get?(name: string): unknown
  effect(effect: () => (() => void) | undefined, name?: string): unknown
  on?(event: 'theme/change', listener: (snapshot: ThemeSnapshotLike) => void): () => void
}
