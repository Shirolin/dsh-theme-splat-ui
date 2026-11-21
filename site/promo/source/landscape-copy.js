export const DURATION = 30
export const STATIC_HOLD_START = 27.5
export const SAFE_AREA = [48, 32, 1872, 1048]
export const REPO_URL = 'github.com/Shirolin/dsh-theme-splat-ui'

export const PALETTE = {
  ink: '#121212',
  lime: '#1edc00',
  limeDeep: '#14a800',
  pink: '#ff2d8a',
  pinkDeep: '#ad006c',
  paper: '#fbfbf4',
  cream: '#fffef9',
  dayBandLime: '#a9ee9b',
  dayBandCream: '#f7f6ec',
  dayBandPink: '#fabbd6',
  nightTop: '#232321',
  nightMid: '#1b1b19',
  nightBot: '#201a1e',
  cardDark: '#262624',
}

export const TRANSITION_WINDOWS = [
  {
    id: '01-02',
    start: 2.1,
    end: 2.7,
    cutAt: 2.4,
    type: 'shooter-barrage',
    fromShot: 1,
    toShot: 2,
    primaryColor: PALETTE.lime,
    secondaryColor: PALETTE.pink,
    hasFullCover: true,
    hasClipReveal: false,
    cardAreaOnly: false,
    angleDeg: -8,
  },
  {
    id: '02-03',
    start: 5.6,
    end: 6.2,
    cutAt: 5.95,
    type: 'squid-surge',
    fromShot: 2,
    toShot: 3,
    primaryColor: PALETTE.lime,
    secondaryColor: PALETTE.pink,
    hasFullCover: false,
    hasClipReveal: true,
    cardAreaOnly: false,
    angleDeg: -6,
  },
  {
    id: '03-04',
    start: 8.8,
    end: 9.5,
    cutAt: 9.18,
    type: 'shooter-barrage',
    fromShot: 3,
    toShot: 4,
    primaryColor: PALETTE.pink,
    secondaryColor: PALETTE.lime,
    hasFullCover: true,
    hasClipReveal: false,
    cardAreaOnly: false,
    angleDeg: 7,
  },
  {
    id: '04-05',
    start: 12.35,
    end: 13.45,
    cutAt: 12.9,
    type: 'roller-wipe',
    fromShot: 4,
    toShot: 5,
    primaryColor: PALETTE.pink,
    secondaryColor: PALETTE.lime,
    hasFullCover: true,
    hasClipReveal: false,
    cardAreaOnly: false,
    angleDeg: -12,
  },
  {
    id: '05-06',
    start: 14.15,
    end: 14.75,
    cutAt: 14.45,
    type: 'squid-surge',
    fromShot: 5,
    toShot: 6,
    primaryColor: PALETTE.pink,
    secondaryColor: PALETTE.lime,
    hasFullCover: false,
    hasClipReveal: true,
    cardAreaOnly: false,
    angleDeg: 8,
  },
  {
    id: '06-07',
    start: 17.4,
    end: 18.0,
    cutAt: 17.75,
    type: 'inkbrush-slash',
    fromShot: 6,
    toShot: 7,
    primaryColor: PALETTE.lime,
    secondaryColor: PALETTE.pink,
    hasFullCover: false,
    hasClipReveal: true,
    cardAreaOnly: false,
    angleDeg: -28,
  },
  {
    id: '07-swap',
    start: 19.8,
    end: 20.4,
    cutAt: 20.1,
    type: 'inkbrush-slash',
    fromShot: 7,
    toShot: 7,
    primaryColor: PALETTE.pink,
    secondaryColor: PALETTE.lime,
    hasFullCover: false,
    hasClipReveal: false,
    cardAreaOnly: true,
    angleDeg: 26,
  },
  {
    id: '07-08',
    start: 22.1,
    end: 22.8,
    cutAt: 22.45,
    type: 'dual-roller',
    fromShot: 7,
    toShot: 8,
    primaryColor: PALETTE.lime,
    secondaryColor: PALETTE.pink,
    hasFullCover: true,
    hasClipReveal: true,
    cardAreaOnly: false,
    angleDeg: 0,
  },
  {
    id: '08-09',
    start: 25.1,
    end: 25.8,
    cutAt: 25.48,
    type: 'turf-clash',
    fromShot: 8,
    toShot: 9,
    primaryColor: PALETTE.lime,
    secondaryColor: PALETTE.pink,
    hasFullCover: true,
    hasClipReveal: false,
    cardAreaOnly: false,
    angleDeg: 0,
  },
]

const T = Object.fromEntries(TRANSITION_WINDOWS.map((w) => [w.id, w]))

export const SHOTS = [
  {
    id: 1,
    start: 0.0,
    end: 2.5,
    cutStart: 0.0,
    cutEnd: T['01-02'].cutAt,
    mode: 'light',
    layoutPreset: 'hero-splash',
    cardTiltDeg: -2.2,
    stickerTitle: ['墨街开涂！'],
    stickerSub: 'SPLAT-STREET · DSH 斯普拉遁 2 街头主题',
    tapeTag: 'STAGE 01 // INKOPOLIS SQUARE',
    featurePills: ['三色街区画布', '官方绿×洋红'],
    caption: '尚兴广场集合——准备开涂！',
    transitionIn: null,
    transitionOut: T['01-02'],
  },
  {
    id: 2,
    start: 2.5,
    end: 6.0,
    cutStart: T['01-02'].cutAt,
    cutEnd: T['02-03'].cutAt,
    mode: 'light',
    layoutPreset: 'right-stage',
    cardTiltDeg: -1.8,
    stickerTitle: ['三色街区，', '开局即满涂。'],
    stickerSub: '官方绿 · 奶油纸 · 洋红泼溅 · 墨黑侧栏',
    tapeTag: 'DAY TURF // 白昼涂地',
    featurePills: ['漂浮广场插画', '黑边硬阴影'],
    caption: '三色条纹画布配街头贴纸，进场就是主场。',
    transitionIn: T['01-02'],
    transitionOut: T['02-03'],
  },
  {
    id: 3,
    start: 6.0,
    end: 9.2,
    cutStart: T['02-03'].cutAt,
    cutEnd: T['03-04'].cutAt,
    mode: 'light',
    layoutPreset: 'dual-stack',
    cardTiltDeg: 2.0,
    stickerTitle: ['指令上膛，', '连发不卡壳。'],
    stickerSub: '官方绿选中甩尾 · 洋红滴墨输入壳',
    tapeTag: 'SUB WEAPON // 菜单与输入区',
    featurePills: ['圆角输入壳', '选中绿墨甩尾'],
    caption: '斜杠菜单甩出绿墨尾，选中反馈直接拉满。',
    transitionIn: T['02-03'],
    transitionOut: T['03-04'],
  },
  {
    id: 4,
    start: 9.2,
    end: 12.5,
    cutStart: T['03-04'].cutAt,
    cutEnd: T['04-05'].cutAt,
    mode: 'light',
    layoutPreset: 'gear-panel',
    cardTiltDeg: -1.5,
    stickerTitle: ['满涂还是护眼？', '墨度随手调。'],
    stickerSub: '纸白 20% · 均衡 50% · 涂地 100% · 三档主墨色',
    tapeTag: 'GEAR TUNING // 墨街外观面板',
    featurePills: ['0-100% 墨度', '官方绿 / 荧光绿 / 黄绿', '网点开关'],
    caption: '三档画布墨度配官方绿、荧光绿、黄绿三套主墨色，随手换装。',
    transitionIn: T['03-04'],
    transitionOut: T['04-05'],
  },
  {
    id: 5,
    start: 12.5,
    end: 14.5,
    cutStart: T['04-05'].cutAt,
    cutEnd: T['05-06'].cutAt,
    mode: 'dark',
    layoutPreset: 'roller-fest',
    cardTiltDeg: -3.2,
    stickerTitle: ['祭典入夜！'],
    stickerSub: 'SPLATFEST! · DAY TURF ➔ NIGHT SHIFT',
    tapeTag: 'ROLLER RUSH // 昼夜切换',
    featurePills: ['滚筒平推刷屏', '昼夜直切'],
    caption: '滚筒平推全场——直接切入午夜祭典！',
    transitionIn: T['04-05'],
    transitionOut: T['05-06'],
  },
  {
    id: 6,
    start: 14.5,
    end: 17.8,
    cutStart: T['05-06'].cutAt,
    cutEnd: T['06-07'].cutAt,
    mode: 'dark',
    layoutPreset: 'left-stage',
    cardTiltDeg: 1.6,
    stickerTitle: ['午夜祭典，', '霓虹全开。'],
    stickerSub: '炭黑底色 · 零反相调校 · 霓虹高反差',
    tapeTag: 'NIGHT SHIFT // 夜间战场',
    featurePills: ['#1B1B19 炭黑', '#44F028 电光绿', '#FF2D8A 洋红'],
    caption: '拒绝无脑反色！炭黑底衬托电光墨色，夜战更带感。',
    transitionIn: T['05-06'],
    transitionOut: T['06-07'],
  },
  {
    id: 7,
    start: 17.8,
    end: 22.5,
    cutStart: T['06-07'].cutAt,
    cutEnd: T['07-08'].cutAt,
    swapAt: T['07-swap'].cutAt,
    swapTiltDeg: 1.4,
    mode: 'dark',
    layoutPreset: 'tactical-swap',
    cardTiltDeg: -1.4,
    stickerTitle: ['战况再乱，', '视野照样清。'],
    stickerSub: '深色代码岛 · 霓虹语法 · 工具输出卡',
    tapeTag: 'BATTLE LOG // 代码岛与工具卡',
    featurePills: ['Shiki 霓虹语法', '高对比工具卡'],
    caption: '深色代码岛配清晰工具卡，长对话刷屏也不花眼。',
    transitionIn: T['06-07'],
    internalTransition: T['07-swap'],
    transitionOut: T['07-08'],
  },
  {
    id: 8,
    start: 22.5,
    end: 25.5,
    cutStart: T['07-08'].cutAt,
    cutEnd: T['08-09'].cutAt,
    mode: 'dark',
    layoutPreset: 'center-squad',
    cardTiltDeg: 0.8,
    stickerTitle: ['缩成窄窗，', '照样能潜行。'],
    stickerSub: '副屏挂机 · 菜单输入全保留',
    tapeTag: '390PX SQUAD // 窄屏贴边响应',
    featurePills: ['390px 窄屏实拍', '响应式贴边'],
    caption: '压到 390px 小窗，贴纸与菜单布局依然利落。',
    transitionIn: T['07-08'],
    transitionOut: T['08-09'],
  },
  {
    id: 9,
    start: 25.5,
    end: 30.0,
    cutStart: T['08-09'].cutAt,
    cutEnd: 30.0,
    mode: 'light',
    layoutPreset: 'turf-finale',
    cardTiltDeg: -2.5,
    stickerTitle: ['墨街'],
    stickerSub: 'SPLAT-STREET · github.com/Shirolin/dsh-theme-splat-ui',
    tapeTag: 'TURF RESULT // 明亮 VS 黑暗 · 终局结算',
    featurePills: ['DAY TURF 50.0%', 'NIGHT SHIFT 50.0%'],
    caption: '白昼涂地 VS 午夜祭典——昼夜双主场旗鼓相当！',
    transitionIn: T['08-09'],
    transitionOut: null,
  },
]

const clamp01 = (value) => Math.max(0, Math.min(1, value))

function buildShotSnapshot(shot, index, time) {
  const duration = shot.cutEnd - shot.cutStart
  const localTime = Math.max(0, Math.min(duration, time - shot.cutStart))
  const progress = duration > 0 ? clamp01(localTime / duration) : 0
  const nominalDuration = shot.end - shot.start
  const nominalLocalTime = Math.max(0, Math.min(nominalDuration, time - shot.start))

  let afterCut = false
  let phase = 'main'
  const effectiveMode = shot.mode
  let cardTiltDeg = shot.cardTiltDeg
  let phaseTime = localTime
  let phaseDuration = duration

  if (shot.id === 7) {
    afterCut = time >= shot.swapAt
    phase = afterCut ? 'tool' : 'code'
    cardTiltDeg = afterCut ? shot.swapTiltDeg : shot.cardTiltDeg
    phaseTime = afterCut ? time - shot.swapAt : time - shot.cutStart
    phaseDuration = afterCut ? shot.cutEnd - shot.swapAt : shot.swapAt - shot.cutStart
  }

  return {
    ...shot,
    index,
    cardTiltDeg,
    effectiveMode,
    phase,
    afterCut,
    localTime,
    duration,
    progress,
    phaseTime,
    phaseDuration,
    phaseProgress: phaseDuration > 0 ? clamp01(phaseTime / phaseDuration) : 0,
    nominalLocalTime,
    nominalProgress: nominalDuration > 0 ? clamp01(nominalLocalTime / nominalDuration) : 0,
  }
}

export function getShotAt(t) {
  const time = Number.isFinite(t) ? Math.max(0, Math.min(DURATION, t)) : 0
  let index = SHOTS.findIndex((shot) => time >= shot.cutStart && time < shot.cutEnd)
  if (index === -1) index = SHOTS.length - 1
  return buildShotSnapshot(SHOTS[index], index, time)
}

export function getShotById(id, t) {
  const index = SHOTS.findIndex((shot) => shot.id === Number(id))
  if (index === -1) return null
  const time = Number.isFinite(t) ? Math.max(0, Math.min(DURATION, t)) : SHOTS[index].cutStart
  return buildShotSnapshot(SHOTS[index], index, time)
}

export function getActiveTransition(t) {
  if (!Number.isFinite(t)) return null
  const window = TRANSITION_WINDOWS.find((item) => t >= item.start && t < item.end)
  if (!window) return null
  const duration = window.end - window.start
  const progress = duration > 0 ? clamp01((t - window.start) / duration) : 0
  const cutProgress = duration > 0 ? clamp01((window.cutAt - window.start) / duration) : 0.5
  return {
    ...window,
    progress,
    cutProgress,
    afterCut: t >= window.cutAt,
  }
}
