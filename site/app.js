const INK_STOPS = [
  [0, 0.6],
  [20, 0.5],
  [50, 0.12],
  [100, 0],
]

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
const modeButtons = [...document.querySelectorAll('[data-mode-set]')]
const previewLight = document.querySelector('[data-preview-light]')
const previewDark = document.querySelector('[data-preview-dark]')
const density = document.querySelector('#density')
const densityValue = document.querySelector('#density-value')
const inkPresetButtons = [...document.querySelectorAll('[data-ink-preset]')]
const copyButton = document.querySelector('[data-copy]')

function setMode(mode) {
  if (!showcase) return
  const dark = mode === 'dark'
  showcase.dataset.mode = mode
  for (const button of modeButtons) {
    const active = button.dataset.modeSet === mode
    button.classList.toggle('is-active', active)
    button.setAttribute('aria-pressed', String(active))
  }
  if (previewLight) previewLight.hidden = dark
  if (previewDark) previewDark.hidden = !dark
}

for (const button of modeButtons) {
  button.addEventListener('click', () => setMode(button.dataset.modeSet))
}

function setDensity(value) {
  const amount = Math.min(100, Math.max(0, Number(value)))
  if (density && density.value !== String(amount)) density.value = String(amount)
  if (densityValue) densityValue.textContent = `${amount}%`
  if (showcase) showcase.style.setProperty('--paper-density', String(inkToVeil(amount)))
  for (const button of inkPresetButtons) {
    const active = Number(button.dataset.inkPreset) === amount
    button.classList.toggle('is-active', active)
    button.setAttribute('aria-pressed', String(active))
  }
}

if (density) {
  density.addEventListener('input', () => setDensity(density.value))
  setDensity(density.value)
}

for (const button of inkPresetButtons) {
  button.addEventListener('click', () => setDensity(button.dataset.inkPreset))
}

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
