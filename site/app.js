const INK_STOPS = [
  [0, 0.6],
  [20, 0.5],
  [50, 0.12],
  [100, 0],
]

const GREEN_HEX = {
  joycon: '#1EDC00',
  neon: '#9AE528',
  lime: '#D3F510',
}

const FIXTURES = {
  'conversation-workspace': { width: 940, height: 860 },
  'appearance-panel': { width: 900, height: 900 },
  'deliverables-diff': { width: 760, height: 520 },
  'boot-loading': { width: 900, height: 620 },
}

function inkToVeil(ink) {
  const clamped = Math.min(100, Math.max(0, ink))
  for (let i = 0; i < INK_STOPS.length - 1; i++) {
    const [ink0, veil0] = INK_STOPS[i]
    const [ink1, veil1] = INK_STOPS[i + 1]
    if (clamped <= ink1) {
      const t = (clamped - ink0) / (ink1 - ink0)
      return Math.round((veil0 - t * (veil0 - veil1)) * 1000) / 1000
    }
  }
  return 0
}

const showcase = document.querySelector('#showcase')
const stage = document.querySelector('#showcase-stage')
const viewport = document.querySelector('#showcase-viewport')
const iframe = document.querySelector('#showcase-frame')
const fixturePathCode = document.querySelector('#showcase-fixture-path')
const fixtureOpenLink = document.querySelector('#showcase-open-link')
const fixtureTabs = [...document.querySelectorAll('[data-fixture-tab]')]
const modeButtons = [...document.querySelectorAll('[data-mode-set]')]
const density = document.querySelector('#density')
const densityValue = document.querySelector('#density-value')
const inkPresetButtons = [...document.querySelectorAll('[data-ink-preset]')]
const greenPresetButtons = [...document.querySelectorAll('[data-green-preset]')]
const greenValue = document.querySelector('#green-value')
const copyButton = document.querySelector('[data-copy]')

const state = {
  mode: 'light',
  fixture: 'conversation-workspace',
  ink: 50,
  green: 'joycon',
  dirty: false,
}

function layoutStage() {
  if (!stage || !viewport || !iframe) return
  const meta = FIXTURES[state.fixture] ?? FIXTURES['conversation-workspace']
  const stageWidth = stage.clientWidth
  if (!stageWidth) return
  const scale = Math.min(1, stageWidth / meta.width)
  viewport.style.width = `${Math.round(meta.width * scale)}px`
  viewport.style.height = `${Math.round(meta.height * scale)}px`
  iframe.style.width = `${meta.width}px`
  iframe.style.height = `${meta.height}px`
  iframe.style.transform = scale < 1 ? `scale(${scale})` : ''
}

function postAppearance() {
  if (!state.dirty || !iframe?.contentWindow) return
  iframe.contentWindow.postMessage(
    {
      type: 'splat-ui:appearance',
      patch: {
        veil: inkToVeil(state.ink),
        green: state.green,
      },
    },
    '*',
  )
}

function syncFixtureFrame() {
  const src = `showcase/generated/${state.fixture}-${state.mode}.html`
  if (fixturePathCode) fixturePathCode.textContent = src
  if (fixtureOpenLink) fixtureOpenLink.setAttribute('href', src)
  if (iframe && iframe.getAttribute('src') !== src) {
    iframe.setAttribute('src', src)
  }
  layoutStage()
}

if (iframe) {
  iframe.addEventListener('load', () => {
    layoutStage()
    postAppearance()
  })
}

if (stage && typeof ResizeObserver === 'function') {
  const observer = new ResizeObserver(layoutStage)
  observer.observe(stage)
} else if (typeof window !== 'undefined') {
  window.addEventListener('resize', layoutStage)
}

function setFixture(name) {
  if (!FIXTURES[name]) return
  state.fixture = name
  for (const tab of fixtureTabs) {
    const active = tab.dataset.fixtureTab === name
    tab.classList.toggle('is-active', active)
    tab.setAttribute('aria-selected', String(active))
  }
  syncFixtureFrame()
}

for (const tab of fixtureTabs) {
  tab.addEventListener('click', () => setFixture(tab.dataset.fixtureTab))
}

function setMode(mode) {
  if (!showcase) return
  state.mode = mode === 'dark' ? 'dark' : 'light'
  showcase.dataset.mode = state.mode
  for (const button of modeButtons) {
    const active = button.dataset.modeSet === state.mode
    button.classList.toggle('is-active', active)
    button.setAttribute('aria-pressed', String(active))
  }
  syncFixtureFrame()
}

for (const button of modeButtons) {
  button.addEventListener('click', () => setMode(button.dataset.modeSet))
}

function setDensity(value, markDirty = true) {
  const amount = Math.min(100, Math.max(0, Number(value)))
  state.ink = amount
  if (markDirty) state.dirty = true
  if (density && density.value !== String(amount)) density.value = String(amount)
  if (densityValue) densityValue.textContent = `${amount}%`
  if (showcase) showcase.style.setProperty('--paper-density', String(inkToVeil(amount)))
  for (const button of inkPresetButtons) {
    const active = Number(button.dataset.inkPreset) === amount
    button.classList.toggle('is-active', active)
    button.setAttribute('aria-pressed', String(active))
  }
  postAppearance()
}

if (density) {
  density.addEventListener('input', () => setDensity(density.value, true))
  setDensity(density.value, false)
}

for (const button of inkPresetButtons) {
  button.addEventListener('click', () => setDensity(button.dataset.inkPreset, true))
}

function setGreen(green, markDirty = true) {
  if (!GREEN_HEX[green]) return
  state.green = green
  if (markDirty) state.dirty = true
  if (greenValue) greenValue.textContent = GREEN_HEX[green]
  for (const button of greenPresetButtons) {
    const active = button.dataset.greenPreset === green
    button.classList.toggle('is-active', active)
    button.setAttribute('aria-pressed', String(active))
  }
  postAppearance()
}

for (const button of greenPresetButtons) {
  button.addEventListener('click', () => setGreen(button.dataset.greenPreset, true))
}

layoutStage()

if (copyButton) {
  let resetTimer = null
  copyButton.addEventListener('click', async () => {
    const text = copyButton.closest('.command').querySelector('pre').textContent
    const i18n = window.splatSiteI18n
    try {
      await navigator.clipboard.writeText(text)
      copyButton.textContent = i18n?.t('landing.install.copied') || '已复制'
    } catch {
      copyButton.textContent = i18n?.t('landing.install.copyFailed') || '复制失败，请手动选择'
    }
    if (resetTimer !== null) window.clearTimeout(resetTimer)
    resetTimer = window.setTimeout(() => {
      resetTimer = null
      copyButton.textContent = window.splatSiteI18n?.t('landing.install.copyBtn') || '复制命令'
    }, 1800)
  })
}

const reveals = document.querySelectorAll('.reveal')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function show(element) {
  element.classList.add('is-visible')
  if (reducedMotion || typeof element.animate !== 'function') return
  element.animate(
    [
      { opacity: 0, transform: 'translateY(24px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' },
  )
}

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        show(entry.target)
        observer.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  )
  for (const element of reveals) observer.observe(element)
} else {
  for (const element of reveals) element.classList.add('is-visible')
}
