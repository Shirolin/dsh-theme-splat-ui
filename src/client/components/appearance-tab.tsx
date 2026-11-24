import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { INK_GREEN_ORDER } from '../../palette.ts'
import {
  APPEARANCE_DEFAULTS,
  APPEARANCE_INK_PRESETS,
  APPEARANCE_PRESETS,
  inkToVeil,
  veilToInk,
  type AppearancePreset,
  type AppearanceStore,
  type InkGreen,
} from '../appearance.ts'
import { getClientMessages, resolveFallbackLocale, type ClientLocaleStore } from '../i18n.ts'
import { BUILD_LABEL } from '../install.ts'

type NamedPreset = Exclude<AppearancePreset, 'custom'>

const PRESET_ORDER: NamedPreset[] = ['paper', 'balanced', 'turf']

const GREEN_SWATCHES: Record<InkGreen, string> = {
  lime: '#d3f510',
  neon: '#9ae528',
  joycon: '#1edc00',
}

const noopSubscribe = () => () => {}
const fallbackLocaleSnapshot = () => resolveFallbackLocale(typeof document !== 'undefined' ? document.documentElement : undefined)

export interface AppearanceTabProps {
  appearance: AppearanceStore
  locale?: ClientLocaleStore
}

export function AppearanceTab({ appearance, locale }: AppearanceTabProps): React.JSX.Element {
  const { getSnapshot, set, subscribe, reset } = appearance
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const activeLocale = useSyncExternalStore(
    locale ? locale.subscribe : noopSubscribe,
    locale ? locale.getSnapshot : fallbackLocaleSnapshot,
    locale ? locale.getSnapshot : fallbackLocaleSnapshot,
  )
  const copy = getClientMessages(activeLocale)
  const committedInk = veilToInk(state.veil)
  const [draftInk, setDraftInk] = useState(committedInk)
  const draftRef = useRef(committedInk)
  const draftDirty = useRef(false)
  const latestSet = useRef(set)
  const commitFrame = useRef<number | null>(null)
  const draftVeil = draftInk === committedInk ? state.veil : inkToVeil(draftInk)
  const panelStyle = {
    '--splat-appearance-draft': String(draftVeil),
  } as CSSProperties
  const sliderStyle = {
    '--splat-slider-progress': `${draftInk}%`,
  } as CSSProperties

  const cancelPendingCommit = () => {
    if (commitFrame.current === null) return
    cancelAnimationFrame(commitFrame.current)
    commitFrame.current = null
  }

  const flushDraft = () => {
    if (!draftDirty.current) return
    draftDirty.current = false
    latestSet.current({ preset: 'custom', veil: inkToVeil(draftRef.current) })
  }

  const scheduleCommit = () => {
    if (!draftDirty.current || commitFrame.current !== null) return
    commitFrame.current = requestAnimationFrame(() => {
      commitFrame.current = null
      flushDraft()
    })
  }

  useEffect(() => {
    latestSet.current = set
  }, [set])

  useEffect(() => {
    if (draftDirty.current) return
    const nextInk = veilToInk(state.veil)
    draftRef.current = nextInk
    setDraftInk(nextInk)
  }, [state.veil])

  useEffect(
    () => () => {
      if (commitFrame.current !== null) {
        cancelAnimationFrame(commitFrame.current)
        commitFrame.current = null
      }
      if (!draftDirty.current) return
      draftDirty.current = false
      latestSet.current({ preset: 'custom', veil: inkToVeil(draftRef.current) })
    },
    [],
  )

  const updateInk = (ink: number) => {
    draftRef.current = ink
    draftDirty.current = true
    setDraftInk(ink)
  }

  const applyPreset = (preset: NamedPreset) => {
    const veil = APPEARANCE_PRESETS[preset]
    const ink = APPEARANCE_INK_PRESETS[preset]
    cancelPendingCommit()
    draftDirty.current = false
    draftRef.current = ink
    setDraftInk(ink)
    set({ preset, veil })
  }

  const resetAll = () => {
    const ink = veilToInk(APPEARANCE_DEFAULTS.veil)
    cancelPendingCommit()
    draftDirty.current = false
    draftRef.current = ink
    setDraftInk(ink)
    reset()
  }

  return (
    <section className="splat-ui-appearance" style={panelStyle}>
      <h3>{copy.heading}</h3>
      <p>{copy.subtitle}</p>

      {/* Settings itself is an opaque paper card, so the canvas behind it is hidden
          while this tab is open. This swatch mirrors the real canvas (lime/cream/
          pink bands, pink pour, halftone and squid watermarks) so the slider shows
          its effect instantly. */}
      <div className="splat-ui-appearance__preview" role="img" aria-label={copy.previewAriaLabel(draftInk)}>
        <div className="splat-ui-appearance__preview-sheet">
          <strong>SPLAT-STREET</strong>
          <span>{copy.previewTagline}</span>
        </div>
        <small className="splat-ui-appearance__preview-tag">{copy.previewBadge}</small>
      </div>

      <fieldset className="splat-ui-appearance__presets" aria-label={copy.presetsAriaLabel}>
        {PRESET_ORDER.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={draftInk === committedInk && state.preset === preset}
            className="splat-ui-appearance__preset"
            onClick={() => applyPreset(preset)}
          >
            {copy.presets[preset]}
            <small>{APPEARANCE_INK_PRESETS[preset]}%</small>
          </button>
        ))}
      </fieldset>

      <div className="splat-ui-appearance__custom">
        <label className="splat-ui-appearance__slider">
          <span className="splat-ui-appearance__slider-title">{copy.sliderTitle}</span>
          <output className="splat-ui-appearance__slider-value">{draftInk}%</output>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={draftInk}
            aria-label={copy.sliderAriaLabel}
            style={sliderStyle}
            onChange={(event) => updateInk(Number(event.target.value))}
            onPointerUp={scheduleCommit}
            onPointerCancel={scheduleCommit}
            onLostPointerCapture={scheduleCommit}
            onKeyUp={scheduleCommit}
            onBlur={scheduleCommit}
          />
        </label>
        <span className="splat-ui-appearance__custom-hint">{copy.sliderHint}</span>
      </div>

      <fieldset className="splat-ui-appearance__green" aria-label={copy.greenAriaLabel}>
        <span className="splat-ui-appearance__green-title">{copy.greenTitle}</span>
        <p className="splat-ui-appearance__green-hint">{copy.greenHint}</p>
        <fieldset className="splat-ui-appearance__green-options" aria-label={copy.greenOptionsAriaLabel}>
          {INK_GREEN_ORDER.map((green) => {
            const option = copy.greenOptions[green]
            return (
              <button key={green} type="button" className="splat-ui-appearance__preset" aria-pressed={state.green === green} onClick={() => set({ green })}>
                <span className="splat-ui-appearance__green-head">
                  <i className="splat-ui-appearance__swatch" style={{ background: GREEN_SWATCHES[green] }} aria-hidden="true" />
                  {option.label}
                </span>
                <small>{option.hint}</small>
              </button>
            )
          })}
        </fieldset>
      </fieldset>

      <fieldset className="splat-ui-appearance__diff" aria-label={copy.diffAriaLabel}>
        <span className="splat-ui-appearance__diff-title">{copy.diffTitle}</span>
        <p className="splat-ui-appearance__diff-hint">{copy.diffHint}</p>
        <div className="splat-ui-appearance__diff-options">
          <button type="button" className="splat-ui-appearance__preset" aria-pressed={state.diffSyntax === 'neon'} onClick={() => set({ diffSyntax: 'neon' })}>
            {copy.diffNeonLabel}
            <small>{copy.diffNeonHint}</small>
          </button>
          <button
            type="button"
            className="splat-ui-appearance__preset"
            aria-pressed={state.diffSyntax === 'native'}
            onClick={() => set({ diffSyntax: 'native' })}
          >
            {copy.diffNativeLabel}
            <small>{copy.diffNativeHint}</small>
          </button>
        </div>
      </fieldset>

      <fieldset className="splat-ui-appearance__details" aria-label={copy.detailsAriaLabel}>
        <span className="splat-ui-appearance__details-title">{copy.detailsTitle}</span>

        <div className="splat-ui-appearance__details-row">
          <span className="splat-ui-appearance__details-label">{copy.decorLabel}</span>
          <fieldset className="splat-ui-appearance__details-options" aria-label={copy.decorLabel}>
            <button type="button" className="splat-ui-appearance__preset" aria-pressed={state.decor} onClick={() => set({ decor: true })}>
              {copy.decorShow}
              <small>{copy.decorShowHint}</small>
            </button>
            <button type="button" className="splat-ui-appearance__preset" aria-pressed={!state.decor} onClick={() => set({ decor: false })}>
              {copy.decorHide}
              <small>{copy.decorHideHint}</small>
            </button>
          </fieldset>
        </div>

        <div className="splat-ui-appearance__details-row">
          <span className="splat-ui-appearance__details-label">{copy.grainLabel}</span>
          <fieldset className="splat-ui-appearance__details-options" aria-label={copy.grainLabel}>
            <button type="button" className="splat-ui-appearance__preset" aria-pressed={state.grain} onClick={() => set({ grain: true })}>
              {copy.grainOn}
              <small>{copy.grainOnHint}</small>
            </button>
            <button type="button" className="splat-ui-appearance__preset" aria-pressed={!state.grain} onClick={() => set({ grain: false })}>
              {copy.grainOff}
              <small>{copy.grainOffHint}</small>
            </button>
          </fieldset>
        </div>

        <div className="splat-ui-appearance__details-row">
          <span className="splat-ui-appearance__details-label">{copy.fontLabel}</span>
          <fieldset className="splat-ui-appearance__details-options" aria-label={copy.fontLabel}>
            <button type="button" className="splat-ui-appearance__preset" aria-pressed={state.font === 'theme'} onClick={() => set({ font: 'theme' })}>
              {copy.fontTheme}
              <small>{copy.fontThemeHint}</small>
            </button>
            <button type="button" className="splat-ui-appearance__preset" aria-pressed={state.font === 'system'} onClick={() => set({ font: 'system' })}>
              {copy.fontSystem}
              <small>{copy.fontSystemHint}</small>
            </button>
          </fieldset>
        </div>

        <p className="splat-ui-appearance__details-hint">{copy.detailsHint}</p>
      </fieldset>

      <div className="splat-ui-appearance__actions">
        <div className="splat-ui-appearance__reset-card">
          <div className="splat-ui-appearance__reset-info">
            <span className="splat-ui-appearance__reset-title">{copy.resetTitle}</span>
            <p className="splat-ui-appearance__note">{copy.resetNote}</p>
          </div>
          <button type="button" className="splat-ui-appearance__reset" aria-label={copy.resetButtonAriaLabel} onClick={resetAll}>
            <span className="splat-ui-appearance__reset-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4.7 5.8A4.2 4.2 0 1 1 4.4 10" />
                <path d="M4.7 2.7v3.1h3.1" />
              </svg>
            </span>
            <span className="splat-ui-appearance__reset-copy">
              <span>{copy.resetButtonLabel}</span>
              <small>{copy.resetButtonDefaultHint(APPEARANCE_INK_PRESETS.balanced)}</small>
            </span>
          </button>
        </div>
      </div>

      <footer className="splat-ui-appearance__about">
        <div className="splat-ui-appearance__about-meta">
          <span className="splat-ui-appearance__about-title">SPLAT-STREET</span>
          <span className="splat-ui-appearance__about-author">
            {copy.authorPrefix}
            <a href="https://github.com/Shirolin" target="_blank" rel="noreferrer">
              Shirolin
            </a>
          </span>
          <span className="splat-ui-appearance__about-build" title={copy.buildTitle}>
            v{BUILD_LABEL}
          </span>
        </div>
        <div className="splat-ui-appearance__about-links">
          <a href="https://github.com/Shirolin/dsh-theme-splat-ui" target="_blank" rel="noreferrer" className="splat-ui-appearance__about-link">
            <svg className="splat-ui-appearance__about-icon" viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
            GitHub
          </a>
          <span className="splat-ui-appearance__about-dot" aria-hidden="true">
            ·
          </span>
          <a href="https://ifdian.net/a/shirolin" target="_blank" rel="noreferrer" className="splat-ui-appearance__about-link">
            <svg
              className="splat-ui-appearance__about-icon splat-ui-appearance__about-icon--afdian"
              viewBox="0 0 16 16"
              width="12"
              height="12"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 14s-5.5-3.3-5.5-7.5A3.5 3.5 0 0 1 8 3.8a3.5 3.5 0 0 1 5.5 2.7C13.5 10.7 8 14 8 14z" />
            </svg>
            {copy.afdian}
          </a>
          <span className="splat-ui-appearance__about-dot" aria-hidden="true">
            ·
          </span>
          <a href="https://ko-fi.com/shirolin" target="_blank" rel="noreferrer" className="splat-ui-appearance__about-link">
            <svg
              className="splat-ui-appearance__about-icon splat-ui-appearance__about-icon--kofi"
              viewBox="0 0 16 16"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2.5 3.5h8v6a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3v-6z" fill="currentColor" fillOpacity="0.15" />
              <path d="M10.5 4.5h1.8a1.7 1.7 0 0 1 1.7 1.7v.6a1.7 1.7 0 0 1-1.7 1.7h-1.8" />
              <line x1="2" y1="14" x2="11" y2="14" strokeWidth="1.6" />
            </svg>
            Ko-fi
          </a>
        </div>
      </footer>
    </section>
  )
}
