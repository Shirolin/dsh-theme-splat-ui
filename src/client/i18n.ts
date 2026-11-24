import type { InkGreen } from '../types.ts'
import type { AppearancePreset } from './appearance.ts'
import type { ClientContextLike, LocaleServiceLike } from './context.ts'

export type SupportedLocale = 'zh' | 'en' | 'ja' | 'ko'

export type NamedAppearancePreset = Exclude<AppearancePreset, 'custom'>

export interface GreenOptionCopy {
  readonly label: string
  readonly hint: string
}

export interface ClientMessages {
  readonly tabLabel: string
  readonly bootLoading: string
  readonly heading: string
  readonly subtitle: string
  readonly previewAriaLabel: (ink: number) => string
  readonly previewTagline: string
  readonly previewBadge: string
  readonly presetsAriaLabel: string
  readonly presets: Readonly<Record<NamedAppearancePreset, string>>
  readonly sliderTitle: string
  readonly sliderAriaLabel: string
  readonly sliderHint: string
  readonly greenAriaLabel: string
  readonly greenTitle: string
  readonly greenHint: string
  readonly greenOptionsAriaLabel: string
  readonly greenOptions: Readonly<Record<InkGreen, GreenOptionCopy>>
  readonly diffAriaLabel: string
  readonly diffTitle: string
  readonly diffHint: string
  readonly diffNeonLabel: string
  readonly diffNeonHint: string
  readonly diffNativeLabel: string
  readonly diffNativeHint: string
  readonly detailsAriaLabel: string
  readonly detailsTitle: string
  readonly decorLabel: string
  readonly decorShow: string
  readonly decorShowHint: string
  readonly decorHide: string
  readonly decorHideHint: string
  readonly grainLabel: string
  readonly grainOn: string
  readonly grainOnHint: string
  readonly grainOff: string
  readonly grainOffHint: string
  readonly fontLabel: string
  readonly fontTheme: string
  readonly fontThemeHint: string
  readonly fontSystem: string
  readonly fontSystemHint: string
  readonly detailsHint: string
  readonly resetTitle: string
  readonly resetNote: string
  readonly resetButtonAriaLabel: string
  readonly resetButtonLabel: string
  readonly resetButtonDefaultHint: (percent: number) => string
  readonly authorPrefix: string
  readonly buildTitle: string
  readonly afdian: string
}

const LOCALE_NAMESPACE = 'dsh-theme-splat-ui:detect'
const BOOT_LOADING_VAR = '--splat-boot-loading-text'

const MESSAGES: Record<SupportedLocale, ClientMessages> = {
  zh: {
    tabLabel: '墨街外观',
    bootLoading: '正在涂满战场…',
    heading: '墨街外观',
    subtitle: '墨度越高，画布纹样越浓；调低墨度，长内容更容易阅读。',
    previewAriaLabel: (ink) => `画布浓度预览，当前 ${ink}%`,
    previewTagline: '把灵感，涂满全场。',
    previewBadge: '战场预览',
    presetsAriaLabel: '外观预设',
    presets: {
      paper: '纸白',
      balanced: '均衡',
      turf: '涂地',
    },
    sliderTitle: '自定义',
    sliderAriaLabel: '画布墨度',
    sliderHint: '拖动微调画布墨度',
    greenAriaLabel: '主墨色',
    greenTitle: '主墨色',
    greenHint: '切换全局绿色调，按钮、画布条纹与泼墨同步换色。',
    greenOptionsAriaLabel: '绿色调选项',
    greenOptions: {
      lime: { label: '黄绿', hint: '柠檬 Lime' },
      neon: { label: '荧光绿', hint: '霓虹 Neon' },
      joycon: { label: '官方绿', hint: 'Joy-Con' },
    },
    diffAriaLabel: 'diff 语法配色',
    diffTitle: 'diff 语法配色',
    diffHint: '用于右侧纸面 diff；夜间继续使用深色代码配色。',
    diffNeonLabel: '霓虹',
    diffNeonHint: '跟随墨色',
    diffNativeLabel: '中性',
    diffNativeHint: 'DSH 原生',
    detailsAriaLabel: '外观细节',
    detailsTitle: '细节',
    decorLabel: '墨迹装饰',
    decorShow: '显示',
    decorShowHint: '泼墨与鱿鱼',
    decorHide: '隐藏',
    decorHideHint: '只留网点',
    grainLabel: '网点纹理',
    grainOn: '开',
    grainOnHint: '丝网印刷',
    grainOff: '关',
    grainOffHint: '纯色纸',
    fontLabel: '界面字体',
    fontTheme: '主题',
    fontThemeHint: 'Nunito',
    fontSystem: '系统',
    fontSystemHint: '跟随平台',
    detailsHint: '网点纹理用于输入框和对话框；字体只调整拉丁字形，中文仍跟随系统。',
    resetTitle: '重置所有外观偏好',
    resetNote: '偏好保存在本机；开启系统高对比后会自动降低墨度。',
    resetButtonAriaLabel: '恢复全部外观设置',
    resetButtonLabel: '全部恢复默认',
    resetButtonDefaultHint: (percent) => `均衡 ${percent}%`,
    authorPrefix: '作者：',
    buildTitle: '当前客户端加载的主题构建',
    afdian: '爱发电',
  },
  en: {
    tabLabel: 'Splat appearance',
    bootLoading: 'Painting the turf…',
    heading: 'Splat Appearance',
    subtitle: 'Higher ink intensifies the canvas stripes and stamps; lower ink makes long reading easier.',
    previewAriaLabel: (ink) => `Canvas ink density preview, currently ${ink}%`,
    previewTagline: 'Paint the whole plaza with ideas.',
    previewBadge: 'Turf preview',
    presetsAriaLabel: 'Appearance presets',
    presets: {
      paper: 'Paper',
      balanced: 'Balanced',
      turf: 'Turf',
    },
    sliderTitle: 'Custom',
    sliderAriaLabel: 'Canvas ink density',
    sliderHint: 'Drag to fine-tune canvas ink density',
    greenAriaLabel: 'Primary ink green',
    greenTitle: 'Primary Ink Green',
    greenHint: 'Switch the global green accent across buttons, canvas stripes, and splashes.',
    greenOptionsAriaLabel: 'Green shade options',
    greenOptions: {
      lime: { label: 'Lime', hint: 'Citrus Lime' },
      neon: { label: 'Neon', hint: 'Neon Green' },
      joycon: { label: 'Official', hint: 'Joy-Con' },
    },
    diffAriaLabel: 'Diff syntax palette',
    diffTitle: 'Diff Syntax Palette',
    diffHint: 'Applies to the light paper diff pane; dark mode always uses the dark code palette.',
    diffNeonLabel: 'Neon',
    diffNeonHint: 'Follows ink',
    diffNativeLabel: 'Neutral',
    diffNativeHint: 'DSH native',
    detailsAriaLabel: 'Appearance details',
    detailsTitle: 'Details',
    decorLabel: 'Ink décor',
    decorShow: 'Show',
    decorShowHint: 'Splashes & squids',
    decorHide: 'Hide',
    decorHideHint: 'Halftone only',
    grainLabel: 'Screen-tone grain',
    grainOn: 'On',
    grainOnHint: 'Screen print',
    grainOff: 'Off',
    grainOffHint: 'Clean paper',
    fontLabel: 'Interface font',
    fontTheme: 'Theme',
    fontThemeHint: 'Nunito',
    fontSystem: 'System',
    fontSystemHint: 'Platform UI',
    detailsHint: 'Screen-tone grain applies to the composer and dialogs; the font setting only changes Latin glyphs.',
    resetTitle: 'Reset all appearance preferences',
    resetNote: 'Preferences are stored locally; system high-contrast mode automatically softens ink density.',
    resetButtonAriaLabel: 'Restore all appearance settings',
    resetButtonLabel: 'Reset to defaults',
    resetButtonDefaultHint: (percent) => `Balanced ${percent}%`,
    authorPrefix: 'Author: ',
    buildTitle: 'Theme build loaded by this client',
    afdian: 'Afdian',
  },
  ja: {
    tabLabel: '墨街外観',
    bootLoading: 'バトルフィールドを塗り広げ中…',
    heading: '墨街外観',
    subtitle: 'インク濃度が高いほどキャンバスの模様が濃くなり、下げると長文が読みやすくなります。',
    previewAriaLabel: (ink) => `キャンバス濃度プレビュー、現在 ${ink}%`,
    previewTagline: 'ひらめきで、フィールドを塗りつくそう。',
    previewBadge: 'バトルプレビュー',
    presetsAriaLabel: '外観プリセット',
    presets: {
      paper: '紙白',
      balanced: '均衡',
      turf: '塗地',
    },
    sliderTitle: 'カスタム',
    sliderAriaLabel: 'キャンバスインク濃度',
    sliderHint: 'ドラッグしてキャンバスインク濃度を微調整',
    greenAriaLabel: 'メインインク色',
    greenTitle: 'メインインク色',
    greenHint: '全体のグリーン調を切り替え、ボタン・ストライプ・インク飛沫を同期変更します。',
    greenOptionsAriaLabel: 'グリーン配色オプション',
    greenOptions: {
      lime: { label: 'ライム', hint: 'シトラス Lime' },
      neon: { label: 'ネオン', hint: 'ネオングリーン' },
      joycon: { label: '公式グリーン', hint: 'Joy-Con' },
    },
    diffAriaLabel: 'diff シンタックス配色',
    diffTitle: 'diff シンタックス配色',
    diffHint: '右側のライトペーパー diff に適用されます。ダークモードでは暗色コード配色を維持します。',
    diffNeonLabel: 'ネオン',
    diffNeonHint: 'インク連動',
    diffNativeLabel: 'ニュートラル',
    diffNativeHint: 'DSH 標準',
    detailsAriaLabel: '外観の細部',
    detailsTitle: 'ディテール',
    decorLabel: 'インク装飾',
    decorShow: '表示',
    decorShowHint: '飛沫とイカ模様',
    decorHide: '非表示',
    decorHideHint: '網点のみ',
    grainLabel: '網点テクスチャ',
    grainOn: 'オン',
    grainOnHint: 'シルク印刷',
    grainOff: 'オフ',
    grainOffHint: '無地ペーパー',
    fontLabel: 'UI フォント',
    fontTheme: 'テーマ',
    fontThemeHint: 'Nunito',
    fontSystem: 'システム',
    fontSystemHint: 'プラットフォーム標準',
    detailsHint: '網点テクスチャは入力欄とダイアログに適用されます。フォント設定はラテン文字のみ変更します。',
    resetTitle: 'すべての外観設定をリセット',
    resetNote: '設定はこの端末に保存されます。システムのハイコントラスト有効時はインク濃度を自動で抑えます。',
    resetButtonAriaLabel: 'すべての外観設定を初期値に戻す',
    resetButtonLabel: 'すべて初期値に戻す',
    resetButtonDefaultHint: (percent) => `均衡 ${percent}%`,
    authorPrefix: '作者：',
    buildTitle: '現在のクライアントに読み込まれたテーマビルド',
    afdian: '愛発電 (Afdian)',
  },
  ko: {
    tabLabel: 'SPLAT-STREET 외관',
    bootLoading: '배틀필드를 칠하는 중…',
    heading: 'SPLAT-STREET 외관',
    subtitle: '잉크 농도가 높을수록 캔버스 패턴이 선명해지며, 낮추면 긴 글을 읽기 편해집니다.',
    previewAriaLabel: (ink) => `캔버스 농도 미리보기, 현재 ${ink}%`,
    previewTagline: '영감으로 필드를 가득 칠해보세요.',
    previewBadge: '배틀필드 미리보기',
    presetsAriaLabel: '외관 프리셋',
    presets: {
      paper: '페이퍼',
      balanced: '밸런스',
      turf: '터프',
    },
    sliderTitle: '사용자 지정',
    sliderAriaLabel: '캔버스 잉크 농도',
    sliderHint: '드래그하여 캔버스 잉크 농도를 미세 조정',
    greenAriaLabel: '메인 잉크 컬러',
    greenTitle: '메인 잉크 컬러',
    greenHint: '전역 그린 톤을 전환하여 버튼, 캔버스 스트라이프, 잉크 스플래시 색상을 함께 바꿉니다.',
    greenOptionsAriaLabel: '그린 톤 옵션',
    greenOptions: {
      lime: { label: '라임', hint: '시트러스 Lime' },
      neon: { label: '네온', hint: '네온 그린' },
      joycon: { label: '오피셜 그린', hint: 'Joy-Con' },
    },
    diffAriaLabel: 'diff 구문 색상',
    diffTitle: 'diff 구문 색상',
    diffHint: '오른쪽 라이트 페이퍼 diff에 적용되며, 다크 모드에서는 어두운 코드 색상을 유지합니다.',
    diffNeonLabel: '네온',
    diffNeonHint: '잉크 연동',
    diffNativeLabel: '뉴트럴',
    diffNativeHint: 'DSH 기본',
    detailsAriaLabel: '외관 세부 설정',
    detailsTitle: '세부 설정',
    decorLabel: '잉크 장식',
    decorShow: '표시',
    decorShowHint: '스플래시와 오징어',
    decorHide: '숨김',
    decorHideHint: '망점만 표시',
    grainLabel: '망점 텍스처',
    grainOn: '켜기',
    grainOnHint: '스크린 인쇄',
    grainOff: '끄기',
    grainOffHint: '민무늬 종이',
    fontLabel: '인터페이스 폰트',
    fontTheme: '테마',
    fontThemeHint: 'Nunito',
    fontSystem: '시스템',
    fontSystemHint: '플랫폼 기본',
    detailsHint: '망점 텍스처는 입력창과 대화 상자에 적용됩니다. 폰트 설정은 라틴 글자 형태만 변경합니다.',
    resetTitle: '모든 외관 설정 초기화',
    resetNote: '설정은 이 기기에 저장되며, 시스템 고대비 모드 사용 시 잉크 농도를 자동으로 낮춥니다.',
    resetButtonAriaLabel: '모든 외관 설정을 기본값으로 복원',
    resetButtonLabel: '기본값으로 복원',
    resetButtonDefaultHint: (percent) => `밸런스 ${percent}%`,
    authorPrefix: '작성자: ',
    buildTitle: '현재 클라이언트에 로드된 테마 빌드',
    afdian: '아이파뎬 (Afdian)',
  },
}

/** Normalize a BCP-47 tag or language identifier to one of the four supported locales. */
export function normalizeLocale(input: unknown): SupportedLocale | undefined {
  if (typeof input !== 'string') return undefined
  const tag = input.trim().toLowerCase()
  if (!tag) return undefined
  const primary = tag.split(/[-_]/, 1)[0]
  if (primary === 'zh') return 'zh'
  if (primary === 'ja') return 'ja'
  if (primary === 'ko') return 'ko'
  if (primary === 'en') return 'en'
  return undefined
}

export function getClientMessages(locale: SupportedLocale): ClientMessages {
  return MESSAGES[locale]
}

export interface ClientLocaleStore {
  getSnapshot(): SupportedLocale
  subscribe(listener: () => void): () => void
  dispose(): void
}

function isLocaleServiceLike(value: unknown): value is LocaleServiceLike {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.register === 'function' ||
    typeof candidate.bind === 'function' ||
    typeof candidate.getSnapshot === 'function' ||
    typeof candidate.subscribe === 'function'
  )
}

function resolveOptionalLocaleService(ctx: ClientContextLike): LocaleServiceLike | undefined {
  if (isLocaleServiceLike(ctx.locale)) return ctx.locale
  if (typeof ctx.get !== 'function') return undefined
  try {
    const service = ctx.get('locale')
    return isLocaleServiceLike(service) ? service : undefined
  } catch {
    return undefined
  }
}

function readSnapshotLocale(snapshot: unknown): SupportedLocale | undefined {
  if (typeof snapshot === 'string') return normalizeLocale(snapshot)
  if (typeof snapshot !== 'object' || snapshot === null) return undefined
  const record = snapshot as Record<string, unknown>
  for (const key of ['locale', 'active', 'language', 'current', 'lang', 'code']) {
    const resolved = normalizeLocale(record[key])
    if (resolved !== undefined) return resolved
  }
  return undefined
}

function readNavigatorLocale(): SupportedLocale | undefined {
  if (typeof navigator === 'undefined') return undefined
  if (Array.isArray(navigator.languages)) {
    for (const candidate of navigator.languages) {
      const resolved = normalizeLocale(candidate)
      if (resolved !== undefined) return resolved
    }
  }
  return normalizeLocale(navigator.language)
}

export function resolveFallbackLocale(root?: HTMLElement): SupportedLocale {
  return normalizeLocale(root?.lang) ?? readNavigatorLocale() ?? 'en'
}

/**
 * Resolve and track the active client locale from the host `locale` service
 * (if exposed) and browser language hints, syncing `--splat-boot-loading-text`
 * on the document root so CSS boot cards translate immediately.
 */
export function createClientLocaleStore(ctx: ClientContextLike, root: HTMLElement): ClientLocaleStore {
  const localeService = resolveOptionalLocaleService(ctx)
  const previousBootLoading = root.style.getPropertyValue(BOOT_LOADING_VAR)
  const listeners = new Set<() => void>()

  let registerDispose: (() => void) | undefined
  let boundDetect: ((key: string) => string) | undefined

  if (localeService && typeof localeService.register === 'function') {
    try {
      const maybeDispose = localeService.register(LOCALE_NAMESPACE, {
        zh: { locale: 'zh' },
        en: { locale: 'en' },
        ja: { locale: 'ja' },
        ko: { locale: 'ko' },
      })
      if (typeof maybeDispose === 'function') registerDispose = maybeDispose
    } catch {
      try {
        const maybeDispose = localeService.register(LOCALE_NAMESPACE, {
          zh: { locale: 'zh' },
          en: { locale: 'en' },
        })
        if (typeof maybeDispose === 'function') registerDispose = maybeDispose
      } catch {
        // Host does not accept dynamic dictionary registration; fall back to snapshot/env detection.
      }
    }
  }

  if (localeService && typeof localeService.bind === 'function') {
    try {
      boundDetect = localeService.bind(LOCALE_NAMESPACE)
    } catch {
      boundDetect = undefined
    }
  }

  const readHostLocale = (): SupportedLocale | undefined => {
    if (typeof boundDetect === 'function') {
      try {
        const detected = normalizeLocale(boundDetect('locale'))
        if (detected !== undefined) return detected
      } catch {
        // Ignore bind read errors and try snapshot.
      }
    }
    if (localeService && typeof localeService.getSnapshot === 'function') {
      try {
        return readSnapshotLocale(localeService.getSnapshot())
      } catch {
        return undefined
      }
    }
    return undefined
  }

  const resolveLocale = (): SupportedLocale => {
    const hostLocale = readHostLocale()
    const envLocale = normalizeLocale(root.lang) ?? readNavigatorLocale()

    if (hostLocale === 'zh' || hostLocale === 'ja' || hostLocale === 'ko') {
      return hostLocale
    }
    if (hostLocale === 'en') {
      return envLocale === 'ja' || envLocale === 'ko' ? envLocale : 'en'
    }
    return envLocale ?? 'en'
  }

  const paintBootLoading = (locale: SupportedLocale) => {
    root.style.setProperty(BOOT_LOADING_VAR, JSON.stringify(MESSAGES[locale].bootLoading))
  }

  let current = resolveLocale()
  paintBootLoading(current)

  let active = true
  const sync = () => {
    if (!active) return
    const next = resolveLocale()
    if (next === current) return
    current = next
    paintBootLoading(current)
    for (const listener of [...listeners]) listener()
  }

  let unsubscribeService: (() => void) | undefined
  if (localeService && typeof localeService.subscribe === 'function') {
    try {
      const maybeUnsub = localeService.subscribe(sync)
      if (typeof maybeUnsub === 'function') unsubscribeService = maybeUnsub
    } catch {
      unsubscribeService = undefined
    }
  }

  const win = root.ownerDocument.defaultView ?? (typeof window !== 'undefined' ? window : undefined)
  const onLanguageChange = () => sync()
  win?.addEventListener?.('languagechange', onLanguageChange)

  return {
    getSnapshot() {
      return current
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      if (!active) return
      active = false
      win?.removeEventListener?.('languagechange', onLanguageChange)
      unsubscribeService?.()
      registerDispose?.()
      listeners.clear()
      if (previousBootLoading) {
        root.style.setProperty(BOOT_LOADING_VAR, previousBootLoading)
      } else {
        root.style.removeProperty(BOOT_LOADING_VAR)
      }
    },
  }
}
