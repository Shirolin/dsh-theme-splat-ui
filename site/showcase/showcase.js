;(() => {
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

  const state = {
    mode: 'light',
    query: '',
    dirty: new Set(),
    ink: 50,
    appearance: {
      veil: 0.12,
      decor: 'on',
      grain: 'on',
      diffSyntax: 'neon',
      font: 'theme',
      green: 'joycon',
    },
  }

  let manifest = null
  let loadErrorMessage = null
  const stageEntries = []
  const groupEntries = []
  let tocObserver = null

  const t = (key, params) => window.splatSiteI18n?.t(key, params) ?? ''
  const localizedGroupName = (group) => window.splatSiteI18n?.getGroupName(group) ?? group
  const localizedFixtureTitle = (fixture) => window.splatSiteI18n?.getFixtureTitle(fixture.name, fixture.title) ?? fixture.title

  const sectionsRoot = document.getElementById('sections-root')
  const tocRoot = document.getElementById('toc')
  const statusBar = document.getElementById('status-bar')
  const emptyState = document.getElementById('empty-state')
  const clearSearchBtn = document.getElementById('clear-search-btn')
  const footerMeta = document.getElementById('footer-meta')
  const searchInput = document.getElementById('search-input')
  const veilSlider = document.getElementById('veil-slider')
  const veilOutput = document.getElementById('veil-output')
  const toggleDecor = document.getElementById('toggle-decor')
  const toggleGrain = document.getElementById('toggle-grain')
  const toggleDiffChip = document.getElementById('toggle-diff-chip')
  const toggleDiff = document.getElementById('toggle-diff')
  const toggleFont = document.getElementById('toggle-font')
  const resetBtn = document.getElementById('reset-btn')
  const modeButtons = [...document.querySelectorAll('[data-mode]')]
  const inkPresets = [...document.querySelectorAll('[data-ink-preset]')]
  const greenPresets = [...document.querySelectorAll('[data-green-preset]')]

  function currentPatch() {
    if (state.dirty.size === 0) return null
    const patch = {}
    for (const key of state.dirty) patch[key] = state.appearance[key]
    return patch
  }

  function postAppearanceToFrame(iframe, reset = false) {
    if (!iframe.contentWindow) return
    if (reset) {
      iframe.contentWindow.postMessage({ type: 'splat-ui:appearance', reset: true }, '*')
      return
    }
    const patch = currentPatch()
    if (patch) {
      iframe.contentWindow.postMessage({ type: 'splat-ui:appearance', patch }, '*')
    }
  }

  function broadcastAppearance(reset = false) {
    for (const entry of stageEntries) {
      postAppearanceToFrame(entry.iframe, reset)
    }
  }

  function layoutEntry(entry) {
    const stageWidth = entry.stage.clientWidth
    if (!stageWidth) return
    const variant = entry.activeVariant
    const scale = Math.min(1, stageWidth / variant.width)
    const viewW = Math.round(variant.width * scale)
    const viewH = Math.round(variant.height * scale)
    entry.viewport.style.width = `${viewW}px`
    entry.viewport.style.height = `${viewH}px`
    entry.iframe.style.width = `${variant.width}px`
    entry.iframe.style.height = `${variant.height}px`
    entry.iframe.style.transform = scale < 1 ? `scale(${scale})` : ''
  }

  function pickVariant(fixture) {
    return fixture.variants.find((v) => v.mode === state.mode) ?? fixture.variants[0]
  }

  function syncDiffAvailability() {
    const isDark = state.mode === 'dark'
    toggleDiff.disabled = isDark
    if (toggleDiffChip) {
      toggleDiffChip.classList.toggle('is-disabled', isDark)
      const fallback = isDark ? '原生 Diff 语法仅在日间模式生效（夜间模式保留高对比语义色）' : '切换 Diff 红绿行高亮（仅日间模式作用于 Diff 交付区卡片）'
      toggleDiffChip.title = t(isDark ? 'showcase.diffTitleDark' : 'showcase.diffTitleLight') || fallback
    }
  }

  function syncMode() {
    document.body.dataset.showcaseMode = state.mode
    for (const btn of modeButtons) {
      const active = btn.dataset.mode === state.mode
      btn.classList.toggle('is-active', active)
      btn.setAttribute('aria-pressed', String(active))
    }
    syncDiffAvailability()
    for (const entry of stageEntries) {
      const next = pickVariant(entry.fixture)
      if (next.src !== entry.activeVariant.src) {
        entry.activeVariant = next
        entry.iframe.src = next.src
        entry.openRaw.href = next.src
        entry.sizeBadge.textContent = `${next.width}×${next.height}`
        layoutEntry(entry)
      }
    }
  }

  function setActiveTocLink(cardId) {
    for (const entry of stageEntries) {
      entry.tocLink.classList.toggle('is-active', `card-${entry.fixture.name}` === cardId)
    }
  }

  function observeCards() {
    if (tocObserver) tocObserver.disconnect()
    if (!('IntersectionObserver' in window) || stageEntries.length === 0) return

    tocObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((item) => item.isIntersecting && !item.target.hidden).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActiveTocLink(visible[0].target.id)
      },
      { rootMargin: '-120px 0px -55% 0px', threshold: 0.05 },
    )

    for (const entry of stageEntries) {
      tocObserver.observe(entry.card)
    }
  }

  function syncFilter() {
    const q = state.query.trim().toLowerCase()
    let visibleCount = 0
    for (const section of sectionsRoot.querySelectorAll('.group-section')) {
      let groupVisible = 0
      for (const card of section.querySelectorAll('.fixture-card')) {
        const hay = card.dataset.search ?? ''
        const hit = !q || hay.includes(q)
        card.hidden = !hit
        if (hit) {
          groupVisible += 1
          visibleCount += 1
        }
      }
      section.hidden = groupVisible === 0
    }
    for (const entry of stageEntries) {
      entry.tocItem.hidden = entry.card.hidden
    }
    if (emptyState) {
      emptyState.hidden = !(manifest && visibleCount === 0)
    }
    if (manifest) {
      const modeWord = t(state.mode === 'dark' ? 'showcase.modeWordDark' : 'showcase.modeWordLight') || (state.mode === 'dark' ? '夜间' : '日间')
      statusBar.textContent = q
        ? t('showcase.statusFiltered', { visible: visibleCount, total: manifest.fixtures.length, mode: modeWord }) ||
          `筛选结果：${visibleCount} / ${manifest.fixtures.length} 组组件夹具（${modeWord}模式）`
        : t('showcase.statusAll', { total: manifest.fixtures.length, mode: modeWord }) ||
          `共 ${manifest.fixtures.length} 组真实 DSH 组件夹具 · 当前为${modeWord}模式`
    } else if (loadErrorMessage !== null) {
      statusBar.textContent =
        t('showcase.loadError', { message: loadErrorMessage }) ||
        `无法加载组件清单（${loadErrorMessage}）。请确认已运行 pnpm run showcase 并通过 HTTP 服务访问。`
    }
  }

  function updatePresetButtons() {
    for (const btn of inkPresets) {
      const preset = Number.parseInt(btn.dataset.inkPreset, 10)
      const active = state.ink === preset
      btn.classList.toggle('is-active', active)
      btn.setAttribute('aria-pressed', String(active))
    }
  }

  function updateGreenButtons() {
    for (const btn of greenPresets) {
      const active = state.appearance.green === btn.dataset.greenPreset
      btn.classList.toggle('is-active', active)
      btn.setAttribute('aria-pressed', String(active))
    }
  }

  function syncLocalizedManifest() {
    if (!manifest) return
    for (const groupEntry of groupEntries) {
      const groupName = localizedGroupName(groupEntry.group)
      groupEntry.tocHeading.textContent = `${groupName} (${groupEntry.count})`
      groupEntry.sectionTitle.textContent = groupName
      groupEntry.countBadge.textContent = t('showcase.groupCount', { count: groupEntry.count }) || `${groupEntry.count} 项`
    }
    for (const entry of stageEntries) {
      const fixture = entry.fixture
      const title = localizedFixtureTitle(fixture)
      const groupName = localizedGroupName(fixture.group)
      entry.tocLink.textContent = title.split('·')[0].trim()
      entry.tocLink.title = title
      entry.titleEl.textContent = title
      entry.iframe.title = title
      entry.openRaw.textContent = t('showcase.openRaw') || '单独打开 ↗'
      entry.card.dataset.search = `${fixture.name} ${fixture.title} ${title} ${fixture.group} ${groupName} ${fixture.pluginCss.join(' ')}`.toLowerCase()
    }
    const generatedDate = manifest.generatedAt ? manifest.generatedAt.slice(0, 10) : ''
    footerMeta.textContent =
      t('showcase.footerBuilt', { version: manifest.dshVersion, date: generatedDate }) ||
      `渲染于 DSH ${manifest.dshVersion} · 构建日期 ${generatedDate} · 夹具与皮肤源码未改写`
  }

  function renderManifest(data) {
    manifest = data
    loadErrorMessage = null
    tocRoot.innerHTML = ''
    sectionsRoot.innerHTML = ''
    stageEntries.length = 0
    groupEntries.length = 0

    for (const group of data.groups) {
      const groupFixtures = data.fixtures.filter((f) => f.group === group)
      if (groupFixtures.length === 0) continue

      const groupId = `group-${encodeURIComponent(group)}`
      const tocGroup = document.createElement('div')
      const tocHeading = document.createElement('h2')
      tocHeading.className = 'toc__group-title'
      const tocList = document.createElement('ul')
      tocList.className = 'toc__list'
      tocGroup.append(tocHeading, tocList)

      const section = document.createElement('section')
      section.className = 'group-section'
      section.id = groupId
      const sectionHeading = document.createElement('h2')
      sectionHeading.className = 'group-section__heading'
      const sectionTitle = document.createElement('span')
      const countBadge = document.createElement('span')
      countBadge.className = 'group-section__count'
      sectionHeading.append(sectionTitle, countBadge)
      const grid = document.createElement('div')
      grid.className = 'cards-grid'
      section.append(sectionHeading, grid)
      groupEntries.push({ group, count: groupFixtures.length, tocHeading, sectionTitle, countBadge })

      for (const fixture of groupFixtures) {
        const cardId = `card-${fixture.name}`
        const li = document.createElement('li')
        const a = document.createElement('a')
        a.className = 'toc__link'
        a.href = `#${cardId}`
        a.addEventListener('click', () => setActiveTocLink(cardId))
        li.append(a)
        tocList.append(li)

        const variant = pickVariant(fixture)
        const card = document.createElement('article')
        card.className = 'fixture-card'
        card.id = cardId

        const header = document.createElement('header')
        header.className = 'fixture-card__header'

        const titleEl = document.createElement('h3')
        titleEl.className = 'fixture-card__title'

        const meta = document.createElement('div')
        meta.className = 'fixture-card__meta'

        const nameBadge = document.createElement('span')
        nameBadge.className = 'badge badge--muted'
        nameBadge.textContent = fixture.name
        meta.append(nameBadge)

        for (const pkg of fixture.pluginCss) {
          const pkgBadge = document.createElement('span')
          pkgBadge.className = 'badge'
          pkgBadge.textContent = pkg
          meta.append(pkgBadge)
        }

        const sizeBadge = document.createElement('span')
        sizeBadge.className = 'badge badge--muted'
        sizeBadge.textContent = `${variant.width}×${variant.height}`
        meta.append(sizeBadge)

        const openRaw = document.createElement('a')
        openRaw.className = 'open-raw'
        openRaw.href = variant.src
        openRaw.target = '_blank'
        openRaw.rel = 'noreferrer'
        meta.append(openRaw)

        header.append(titleEl, meta)

        const stage = document.createElement('div')
        stage.className = 'fixture-card__stage'
        const viewport = document.createElement('div')
        viewport.className = 'fixture-card__viewport'
        const iframe = document.createElement('iframe')
        iframe.className = 'fixture-card__iframe'
        iframe.loading = 'lazy'
        iframe.src = variant.src
        viewport.append(iframe)
        stage.append(viewport)

        const entry = { fixture, activeVariant: variant, card, tocItem: li, tocLink: a, titleEl, stage, viewport, iframe, sizeBadge, openRaw }
        iframe.addEventListener('load', () => postAppearanceToFrame(iframe))
        stageEntries.push(entry)

        card.append(header, stage)
        grid.append(card)
      }

      tocRoot.append(tocGroup)
      sectionsRoot.append(section)
    }

    syncLocalizedManifest()
    for (const entry of stageEntries) layoutEntry(entry)
    if (stageEntries.length > 0) setActiveTocLink(`card-${stageEntries[0].fixture.name}`)
    observeCards()
    syncFilter()
  }

  for (const btn of modeButtons) {
    btn.addEventListener('click', () => {
      const next = btn.dataset.mode
      if (next === state.mode) return
      state.mode = next
      syncMode()
      syncFilter()
    })
  }

  for (const btn of inkPresets) {
    btn.addEventListener('click', () => {
      const ink = Number.parseInt(btn.dataset.inkPreset, 10)
      state.ink = ink
      state.appearance.veil = inkToVeil(ink)
      state.dirty.add('veil')
      veilSlider.value = String(ink)
      veilOutput.textContent = `${ink}%`
      updatePresetButtons()
      broadcastAppearance()
    })
  }

  for (const btn of greenPresets) {
    btn.addEventListener('click', () => {
      const green = btn.dataset.greenPreset
      if (!green || green === state.appearance.green) return
      state.appearance.green = green
      state.dirty.add('green')
      updateGreenButtons()
      broadcastAppearance()
    })
  }

  veilSlider.addEventListener('input', () => {
    const ink = Number.parseInt(veilSlider.value, 10)
    state.ink = ink
    state.appearance.veil = inkToVeil(ink)
    state.dirty.add('veil')
    veilOutput.textContent = `${ink}%`
    updatePresetButtons()
    broadcastAppearance()
  })

  toggleDecor.addEventListener('change', () => {
    state.appearance.decor = toggleDecor.checked ? 'on' : 'off'
    state.dirty.add('decor')
    broadcastAppearance()
  })

  toggleGrain.addEventListener('change', () => {
    state.appearance.grain = toggleGrain.checked ? 'on' : 'off'
    state.dirty.add('grain')
    broadcastAppearance()
  })

  toggleDiff.addEventListener('change', () => {
    state.appearance.diffSyntax = toggleDiff.checked ? 'native' : 'neon'
    state.dirty.add('diffSyntax')
    broadcastAppearance()
  })

  toggleFont.addEventListener('change', () => {
    state.appearance.font = toggleFont.checked ? 'system' : 'theme'
    state.dirty.add('font')
    broadcastAppearance()
  })

  resetBtn.addEventListener('click', () => {
    state.dirty.clear()
    state.ink = 50
    state.appearance.veil = 0.12
    state.appearance.decor = 'on'
    state.appearance.grain = 'on'
    state.appearance.diffSyntax = 'neon'
    state.appearance.font = 'theme'
    state.appearance.green = 'joycon'
    veilSlider.value = '50'
    veilOutput.textContent = '50%'
    toggleDecor.checked = true
    toggleGrain.checked = true
    toggleDiff.checked = false
    toggleFont.checked = false
    updatePresetButtons()
    updateGreenButtons()
    broadcastAppearance(true)
  })

  searchInput.addEventListener('input', () => {
    state.query = searchInput.value
    syncFilter()
  })

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && searchInput.value) {
      searchInput.value = ''
      state.query = ''
      syncFilter()
    }
  })

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = ''
      state.query = ''
      syncFilter()
      searchInput.focus()
    })
  }

  window.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
    const active = document.activeElement
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return
    event.preventDefault()
    searchInput.focus()
  })

  window.addEventListener('resize', () => {
    for (const entry of stageEntries) layoutEntry(entry)
  })

  syncDiffAvailability()

  window.splatSiteI18n?.onChange(() => {
    syncDiffAvailability()
    syncLocalizedManifest()
    syncFilter()
  })

  fetch('generated/manifest.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    })
    .then(renderManifest)
    .catch((err) => {
      loadErrorMessage = err.message
      statusBar.textContent =
        t('showcase.loadError', { message: err.message }) || `无法加载组件清单（${err.message}）。请确认已运行 pnpm run showcase 并通过 HTTP 服务访问。`
    })
})()
