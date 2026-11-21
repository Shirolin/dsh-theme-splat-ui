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
import { BUILD_LABEL } from '../install.ts'

type NamedPreset = Exclude<AppearancePreset, 'custom'>

const PRESET_LABELS: Record<NamedPreset, string> = {
  paper: '纸白',
  balanced: '均衡',
  turf: '涂地',
}

const PRESET_ORDER: NamedPreset[] = ['paper', 'balanced', 'turf']

const GREEN_OPTIONS: Record<InkGreen, { readonly label: string; readonly hint: string; readonly swatch: string }> = {
  lime: { label: '黄绿', hint: '柠檬 Lime', swatch: '#d3f510' },
  neon: { label: '荧光绿', hint: '霓虹 Neon', swatch: '#9ae528' },
  joycon: { label: '官方绿', hint: 'Joy-Con', swatch: '#1edc00' },
}

export interface AppearanceTabProps {
  appearance: AppearanceStore
}

export function AppearanceTab({ appearance }: AppearanceTabProps): React.JSX.Element {
  const { getSnapshot, set, subscribe, reset } = appearance
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
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
      <h3>墨街外观</h3>
      <p>墨度越高，画布纹样越浓；调低墨度，长内容更容易阅读。</p>

      {/* Settings itself is an opaque paper card, so the canvas behind it is hidden
          while this tab is open. This swatch mirrors the real canvas (lime/cream/
          pink bands, pink pour, halftone and squid watermarks) so the slider shows
          its effect instantly. */}
      <div className="splat-ui-appearance__preview" role="img" aria-label={`画布浓度预览，当前 ${draftInk}%`}>
        <div className="splat-ui-appearance__preview-sheet">
          <strong>SPLAT-STREET</strong>
          <span>把灵感，涂满全场。</span>
        </div>
        <small className="splat-ui-appearance__preview-tag">战场预览</small>
      </div>

      <fieldset className="splat-ui-appearance__presets" aria-label="外观预设">
        {PRESET_ORDER.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={draftInk === committedInk && state.preset === preset}
            className="splat-ui-appearance__preset"
            onClick={() => applyPreset(preset)}
          >
            {PRESET_LABELS[preset]}
            <small>{APPEARANCE_INK_PRESETS[preset]}%</small>
          </button>
        ))}
      </fieldset>

      <div className="splat-ui-appearance__custom">
        <label className="splat-ui-appearance__slider">
          <span className="splat-ui-appearance__slider-title">自定义</span>
          <output className="splat-ui-appearance__slider-value">{draftInk}%</output>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={draftInk}
            aria-label="画布墨度"
            style={sliderStyle}
            onChange={(event) => updateInk(Number(event.target.value))}
            onPointerUp={scheduleCommit}
            onPointerCancel={scheduleCommit}
            onLostPointerCapture={scheduleCommit}
            onKeyUp={scheduleCommit}
            onBlur={scheduleCommit}
          />
        </label>
        <span className="splat-ui-appearance__custom-hint">拖动微调画布墨度</span>
      </div>

      <fieldset className="splat-ui-appearance__green" aria-label="主墨色">
        <span className="splat-ui-appearance__green-title">主墨色</span>
        <p className="splat-ui-appearance__green-hint">切换全局绿色调，按钮、画布条纹与泼墨同步换色。</p>
        <fieldset className="splat-ui-appearance__green-options" aria-label="绿色调选项">
          {INK_GREEN_ORDER.map((green) => {
            const option = GREEN_OPTIONS[green]
            return (
              <button key={green} type="button" className="splat-ui-appearance__preset" aria-pressed={state.green === green} onClick={() => set({ green })}>
                <span className="splat-ui-appearance__green-head">
                  <i className="splat-ui-appearance__swatch" style={{ background: option.swatch }} aria-hidden="true" />
                  {option.label}
                </span>
                <small>{option.hint}</small>
              </button>
            )
          })}
        </fieldset>
      </fieldset>

      <fieldset className="splat-ui-appearance__diff" aria-label="diff 语法配色">
        <span className="splat-ui-appearance__diff-title">diff 语法配色</span>
        <p className="splat-ui-appearance__diff-hint">用于右侧纸面 diff；夜间继续使用深色代码配色。</p>
        <div className="splat-ui-appearance__diff-options">
          <button type="button" className="splat-ui-appearance__preset" aria-pressed={state.diffSyntax === 'neon'} onClick={() => set({ diffSyntax: 'neon' })}>
            霓虹
            <small>跟随墨色</small>
          </button>
          <button
            type="button"
            className="splat-ui-appearance__preset"
            aria-pressed={state.diffSyntax === 'native'}
            onClick={() => set({ diffSyntax: 'native' })}
          >
            中性
            <small>DSH 原生</small>
          </button>
        </div>
      </fieldset>

      <fieldset className="splat-ui-appearance__details" aria-label="外观细节">
        <span className="splat-ui-appearance__details-title">细节</span>

        <div className="splat-ui-appearance__details-row">
          <span className="splat-ui-appearance__details-label">墨迹装饰</span>
          <fieldset className="splat-ui-appearance__details-options" aria-label="墨迹装饰">
            <button type="button" className="splat-ui-appearance__preset" aria-pressed={state.decor} onClick={() => set({ decor: true })}>
              显示
              <small>泼墨与鱿鱼</small>
            </button>
            <button type="button" className="splat-ui-appearance__preset" aria-pressed={!state.decor} onClick={() => set({ decor: false })}>
              隐藏
              <small>只留网点</small>
            </button>
          </fieldset>
        </div>

        <div className="splat-ui-appearance__details-row">
          <span className="splat-ui-appearance__details-label">网点纹理</span>
          <fieldset className="splat-ui-appearance__details-options" aria-label="网点纹理">
            <button type="button" className="splat-ui-appearance__preset" aria-pressed={state.grain} onClick={() => set({ grain: true })}>
              开<small>丝网印刷</small>
            </button>
            <button type="button" className="splat-ui-appearance__preset" aria-pressed={!state.grain} onClick={() => set({ grain: false })}>
              关<small>纯色纸</small>
            </button>
          </fieldset>
        </div>

        <div className="splat-ui-appearance__details-row">
          <span className="splat-ui-appearance__details-label">界面字体</span>
          <fieldset className="splat-ui-appearance__details-options" aria-label="界面字体">
            <button type="button" className="splat-ui-appearance__preset" aria-pressed={state.font === 'theme'} onClick={() => set({ font: 'theme' })}>
              主题
              <small>Nunito</small>
            </button>
            <button type="button" className="splat-ui-appearance__preset" aria-pressed={state.font === 'system'} onClick={() => set({ font: 'system' })}>
              系统
              <small>跟随平台</small>
            </button>
          </fieldset>
        </div>

        <p className="splat-ui-appearance__details-hint">网点纹理用于输入框和对话框；字体只调整拉丁字形，中文仍跟随系统。</p>
      </fieldset>

      <div className="splat-ui-appearance__actions">
        <div className="splat-ui-appearance__reset-card">
          <div className="splat-ui-appearance__reset-info">
            <span className="splat-ui-appearance__reset-title">重置所有外观偏好</span>
            <p className="splat-ui-appearance__note">偏好保存在本机；开启系统高对比后会自动降低墨度。</p>
          </div>
          <button type="button" className="splat-ui-appearance__reset" aria-label="恢复全部外观设置" onClick={resetAll}>
            <span className="splat-ui-appearance__reset-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4.7 5.8A4.2 4.2 0 1 1 4.4 10" />
                <path d="M4.7 2.7v3.1h3.1" />
              </svg>
            </span>
            <span className="splat-ui-appearance__reset-copy">
              <span>全部恢复默认</span>
              <small>均衡 {APPEARANCE_INK_PRESETS.balanced}%</small>
            </span>
          </button>
        </div>
      </div>

      <footer className="splat-ui-appearance__about">
        <div className="splat-ui-appearance__about-meta">
          <span className="splat-ui-appearance__about-title">SPLAT-STREET</span>
          <span className="splat-ui-appearance__about-author">
            作者：
            <a href="https://github.com/Shirolin" target="_blank" rel="noreferrer">
              Shirolin
            </a>
          </span>
          <span className="splat-ui-appearance__about-build" title="当前客户端加载的主题构建">
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
            爱发电
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
