import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../..'),
  out = resolve(here, '../landscape-animatic'),
  render = resolve(root, process.argv.find((v) => v.startsWith('--render='))?.slice(9) ?? '.tmp/promo-landscape-20261115/render')

const run = (command, args) => {
  const r = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 })
  if (r.status !== 0) throw Error(r.stderr)
  return r.stdout
}
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')

const manifest = JSON.parse(await readFile(join(render, 'capture-manifest.json'), 'utf8')),
  diagnostics = JSON.parse(await readFile(join(render, 'frame-diagnostics.json'), 'utf8'))

assert.equal(manifest.frames, 900)
assert.equal(manifest.sampling.dsf, 2)
assert.deepEqual([manifest.sampling.width, manifest.sampling.height], [2560, 1440])
assert.equal(manifest.consoleErrors.length, 0)
assert.ok(Array.isArray(manifest.determinism) && manifest.determinism.length >= 5, 'missing determinism hashes')
assert.equal(manifest.determinism[0].sha256, manifest.determinism[2].sha256, 'renderAt is not deterministic')
assert.equal(manifest.determinism[3].sha256, manifest.determinism[4].sha256, 'ending is not static between 27.5s and 29.967s')

const expectedSourceFiles = ['stage-landscape.html', 'landscape.css', 'film-landscape.js', 'landscape-copy.js', 'landscape-transitions.js']
for (const file of expectedSourceFiles) {
  assert.ok(manifest.sourceSha256?.[file], `manifest missing sourceSha256 for ${file}`)
}
for (const [file, expected] of Object.entries(manifest.sourceSha256)) {
  assert.equal(hash(await readFile(join(here, file))), expected, `${file} changed after capture`)
}
if (Array.isArray(manifest.fonts)) {
  const nunitoLoaded = manifest.fonts.filter((f) => f.family.replace(/['"]/g, '') === 'Nunito' && f.status === 'loaded')
  assert.ok(nunitoLoaded.length > 0, `Nunito font failed to load: ${JSON.stringify(manifest.fonts)}`)
}

assert.equal(diagnostics.length, 900)

const expectedTransitions = ['shooter-barrage', 'squid-surge', 'roller-wipe', 'inkbrush-slash', 'dual-roller', 'turf-clash']
const bannedCopy = ['就有墨性', '浓一点', '也看得清', '不收风格']
const crossShotClipWindows = [
  { id: '02-03', start: 5.6, end: 6.2, type: 'squid-surge' },
  { id: '05-06', start: 14.15, end: 14.75, type: 'squid-surge' },
  { id: '06-07', start: 17.4, end: 18.0, type: 'inkbrush-slash' },
]

const transitionTypes = new Set()
const coverTypes = new Set()
const clipRevealTypes = new Set()
const windowClipCounts = Object.fromEntries(crossShotClipWindows.map((w) => [w.id, 0]))
const layoutPresets = new Set()
const shotsSeen = new Set()
const tiltValues = []
let coverEvents = 0
let clipRevealFrames = 0
let previousCover = false

for (const d of diagnostics) {
  assert.equal(d.particles.overlaps, 0, `particle collision at ${d.time}`)
  if (typeof d.shot === 'number') shotsSeen.add(d.shot)
  if (d.layoutPreset) layoutPresets.add(d.layoutPreset)
  if (typeof d.cardTiltDeg === 'number' && Number.isFinite(d.cardTiltDeg)) tiltValues.push(d.cardTiltDeg)

  const isFullCover = Boolean(d.transition?.fullCover)
  if (d.transition?.active && d.transition?.type) {
    transitionTypes.add(d.transition.type)
  }
  if (d.transition?.active && d.transition?.clipReveal) {
    clipRevealFrames++
    if (d.transition.type) clipRevealTypes.add(d.transition.type)
    for (const w of crossShotClipWindows) {
      if (d.time >= w.start && d.time < w.end && d.transition.type === w.type && !isFullCover) {
        windowClipCounts[w.id]++
      }
    }
  }
  if (isFullCover && !previousCover) {
    coverEvents++
    coverTypes.add(d.transition?.type ?? 'unknown')
  }
  previousCover = isFullCover

  for (const text of d.textBoxes) {
    assert.ok(
      Number.isFinite(text.x) && Number.isFinite(text.y) && Number.isFinite(text.w) && Number.isFinite(text.h),
      `invalid textBox geometry at ${d.time}: ${JSON.stringify(text)}`,
    )
    for (const banned of bannedCopy) {
      assert.ok(!String(text.value).includes(banned), `banned legacy copy "${banned}" at ${d.time}: ${text.value}`)
    }
    if (!isFullCover) {
      assert.ok(
        text.x >= 48 && text.x + text.w <= 1872 && text.y >= 32 && text.y + text.h <= 1048,
        `unsafe text at ${d.time.toFixed(3)}s (shot ${d.shot}): ${text.value} -> [${text.x.toFixed(1)}, ${text.y.toFixed(1)}, ${(text.x + text.w).toFixed(1)}, ${(text.y + text.h).toFixed(1)}]`,
      )
    }
  }
}

const matchedTransitions = expectedTransitions.filter((type) => transitionTypes.has(type))
assert.ok(
  transitionTypes.size >= 4 && matchedTransitions.length >= 4,
  `expected >= 4 transition types from [${expectedTransitions.join(', ')}], got [${[...transitionTypes].join(', ')}]`,
)
assert.ok(coverEvents >= 4, `expected at least 4 fullCover events, got ${coverEvents}`)
assert.ok(clipRevealFrames > 0, 'expected clipReveal diagnostics on cross-shot transitions')
for (const w of crossShotClipWindows) {
  assert.ok(windowClipCounts[w.id] > 0, `expected clipReveal=true during non-fullCover cross-shot window ${w.id} (${w.type})`)
}
assert.equal(shotsSeen.size, 9, `expected all 9 shots, got [${[...shotsSeen].join(', ')}]`)
assert.ok(layoutPresets.size >= 5, `expected >= 5 layoutPresets, got ${layoutPresets.size}: [${[...layoutPresets].join(', ')}]`)
assert.ok(
  tiltValues.some((deg) => deg > 0),
  'expected at least one positive cardTiltDeg',
)
assert.ok(
  tiltValues.some((deg) => deg < 0),
  'expected at least one negative cardTiltDeg',
)

const video = join(out, '../splat-street-landscape-animatic.mp4'),
  probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', video]))
assert.equal(probe.streams.length, 3)
const v = probe.streams.find((s) => s.codec_type === 'video' && s.disposition?.attached_pic !== 1)
const a = probe.streams.find((s) => s.codec_type === 'audio')
const coverPic = probe.streams.find((s) => s.disposition?.attached_pic === 1)
assert.ok(v, 'video stream missing')
assert.ok(a, 'audio stream missing')
assert.ok(coverPic, 'embedded attached_pic cover stream missing')
assert.equal(coverPic.width, 1280)
assert.equal(coverPic.height, 720)
for (const [key, value] of Object.entries({
  codec_name: 'aac',
  sample_rate: '48000',
  channels: 2,
}))
  assert.equal(a[key], value, `audio.${key}`)
assert.ok(Math.abs(+a.duration - 30) < 0.2, `unexpected audio duration: ${a.duration}`)
for (const [key, value] of Object.entries({
  codec_name: 'h264',
  width: 1280,
  height: 720,
  r_frame_rate: '30/1',
  avg_frame_rate: '30/1',
  pix_fmt: 'yuv420p',
  color_space: 'bt709',
  color_transfer: 'bt709',
  color_primaries: 'bt709',
  nb_frames: '900',
}))
  assert.equal(v[key], value, key)
assert.equal(+probe.format.duration, 30)
run('ffmpeg', ['-v', 'error', '-xerror', '-i', video, '-f', 'null', '-'])

const bytes = await readFile(video),
  atoms = []
for (let pos = 0; pos + 8 <= bytes.length; ) {
  const size = bytes.readUInt32BE(pos),
    type = bytes.toString('ascii', pos + 4, pos + 8)
  atoms.push({ type, offset: pos })
  if (size < 8) break
  pos += size
}
assert.ok(atoms.find((a) => a.type === 'moov').offset < atoms.find((a) => a.type === 'mdat').offset)
assert.ok(bytes.includes('crf=18.0'))

const verticalVerification = JSON.parse(await readFile(join(out, '../verification.json'), 'utf8'))
assert.equal(hash(await readFile(join(out, '../splat-street-vertical.mp4'))), verticalVerification.videoSha256, 'paused vertical video changed')
const verticalManifest = JSON.parse(await readFile(join(out, '../capture-manifest.json'), 'utf8'))
for (const [file, expected] of Object.entries(verticalManifest.sourceSha256))
  assert.equal(hash(await readFile(join(here, file))), expected, `paused vertical source changed: ${file}`)

await mkdir(out, { recursive: true })
const times = [1.1, 4.0, 7.5, 10.9, 13.65, 16.0, 18.8, 24.0, 27.5],
  labels = ['墨街开涂！', '三色街区', '指令上膛', '浓度随手调', '祭典入夜！', '午夜祭典', '代码岛视界', '390px 窄屏', '昼夜双场']
for (const [i, t] of times.entries())
  run('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', video, '-frames:v', '1', '-update', '1', join(out, `shot-${String(i + 1).padStart(2, '0')}.png`)])

const extraFrames = [
  { time: 21.3, file: 'shot-07-tool.png', title: '工具结果卡' },
  { time: 2.25, file: 'transition-shooter.png', title: '射击墨点转场' },
  { time: 12.75, file: 'transition-roller.png', title: '巨型滚筒刷屏' },
  { time: 22.6, file: 'transition-dual-roller.png', title: '双滚筒撤开揭露' },
  { time: 25.48, file: 'transition-clash.png', title: '终局满屏对撞' },
]
for (const extra of extraFrames)
  run('ffmpeg', ['-v', 'error', '-y', '-ss', String(extra.time), '-i', video, '-frames:v', '1', '-update', '1', join(out, extra.file)])

run('ffmpeg', [
  '-v',
  'error',
  '-y',
  '-framerate',
  '1',
  '-i',
  join(out, 'shot-%02d.png'),
  '-vf',
  'scale=640:360,tile=3x3:padding=12:margin=12:color=0x121212',
  '-frames:v',
  '1',
  '-update',
  '1',
  join(out, 'contact-sheet.png'),
])

await copyFile(join(render, 'capture-manifest.json'), join(out, 'capture-manifest.json'))

const result = {
  status: 'pass',
  kind: '720p animatic; 1080p master awaiting approval',
  video: {
    width: v.width,
    height: v.height,
    fps: 30,
    duration: 30,
    frames: 900,
    codec: v.codec_name,
    pixelFormat: v.pix_fmt,
    colorSpace: v.color_space,
    crf: 18,
  },
  audio: {
    codec: a.codec_name,
    sampleRate: +a.sample_rate,
    channels: a.channels,
    bitRate: +a.bit_rate,
    durationSeconds: +a.duration,
  },
  audioStreams: 1,
  embeddedCover: true,
  faststart: true,
  fullDecode: true,
  frameChecks: {
    checked: diagnostics.length,
    shotsCovered: shotsSeen.size,
    textSafeArea: [48, 32, 1872, 1048],
    transitionTypes: [...transitionTypes],
    fullCoverEvents: coverEvents,
    fullCoverTypes: [...coverTypes],
    clipRevealFrames,
    clipRevealTypes: [...clipRevealTypes],
    crossShotClipWindows: windowClipCounts,
    layoutPresets: [...layoutPresets],
    cardTiltRange: [Math.min(...tiltValues), Math.max(...tiltValues)],
    legacyCopyHits: 0,
    particleCollisions: 0,
  },
  determinism: manifest.determinism,
  fonts: manifest.fonts,
  pausedVerticalUnchanged: true,
  endingStaticFromSeconds: 27.5,
  source: 'DSH 真实截图，2x；本地预置演示历史，无实际工具或模型请求',
  shots: times.map((t, i) => ({ time: t, title: labels[i], image: `shot-${String(i + 1).padStart(2, '0')}.png` })),
  extras: extraFrames.map((e) => ({ time: e.time, title: e.title, image: e.file })),
  videoSha256: hash(bytes),
}
const coverL = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', join(out, '../cover-landscape.png')])).streams[0]
assert.equal(coverL.width, 1280)
assert.equal(coverL.height, 720)
const posterL = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', join(out, '../poster-landscape.webp')])).streams[0]
assert.equal(posterL.width, 1280)
assert.equal(posterL.height, 720)

await writeFile(join(out, 'verification.json'), `${JSON.stringify(result, null, 2)}\n`)

const cards = times
  .map(
    (t, i) =>
      `<button data-time="${t}"><img src="landscape-animatic/shot-${String(i + 1).padStart(2, '0')}.png" alt="${labels[i]}"><span>${t.toFixed(2)}s · 0${i + 1} ${labels[i]}</span></button>`,
  )
  .join('')
const extraCards = extraFrames
  .map((e) => `<button data-time="${e.time}"><img src="landscape-animatic/${e.file}" alt="${e.title}"><span>${e.time.toFixed(2)}s · ${e.title}</span></button>`)
  .join('')

await writeFile(
  join(out, '../animatic-landscape.html'),
  `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#141413"><title>SPLAT-STREET · 横版宣传片与分镜（16:9）</title><link rel="icon" href="../assets/icon-256.png" type="image/png">
<style>@font-face{font-family:"Nunito";src:url("../assets/fonts/nunito-400.woff2") format("woff2");font-weight:400;font-display:swap}@font-face{font-family:"Nunito";src:url("../assets/fonts/nunito-700.woff2") format("woff2");font-weight:700;font-display:swap}@font-face{font-family:"Nunito";src:url("../assets/fonts/nunito-900.woff2") format("woff2");font-weight:900;font-display:swap}*{box-sizing:border-box}body{margin:0;background:#141413;color:#f8f8ef;font:16px/1.6 "Nunito","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif}.topbar{position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:14px clamp(16px,3vw,32px);background:rgba(20,20,19,.94);backdrop-filter:blur(10px);border-bottom:3px solid #1edc00}.brand{display:inline-flex;align-items:center;gap:10px;color:#f8f8ef;text-decoration:none;font-weight:900;font-size:18px;letter-spacing:-.02em}.brand img{width:28px;height:28px;border-radius:7px}.topbar nav{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:0}.pill{display:inline-flex;align-items:center;min-height:36px;padding:4px 12px;border-radius:999px;border:2px solid #4a4a44;color:#f8f8ef;text-decoration:none;font-size:14px;font-weight:800}.pill:hover{border-color:#1edc00;color:#1edc00}.pill.is-active{background:#1edc00;border-color:#1edc00;color:#121212}.pill--pink:hover{border-color:#ff2d8a;color:#ff2d8a}main{max-width:1360px;margin:auto;padding:32px clamp(16px,3vw,24px) 56px}h1{font-size:clamp(28px,3.4vw,42px);font-weight:900;letter-spacing:-.02em;margin:0 0 6px}h2{font-size:20px;font-weight:900;margin:34px 0 12px;color:#1edc00}p{color:#c9c9c0}video{width:100%;display:block;background:#0d0e0d;border:4px solid #1edc00;border-radius:14px;box-shadow:8px 8px 0 #ff2d8a;margin-top:20px}.meta-links{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}.meta-links a{display:inline-flex;align-items:center;min-height:38px;padding:6px 14px;border:2px solid #4a4a44;border-radius:8px;color:#1edc00;text-decoration:none;font-weight:800;font-size:14px}.meta-links a:hover{border-color:#1edc00;background:#1d1d1b}.shots,.extras{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:16px}button{cursor:pointer;overflow:hidden;padding:0;text-align:left;border:2px solid #4a4a44;border-radius:10px;background:#232321;color:#f8f8ef;font:inherit;transition:transform .14s ease,border-color .14s ease}button:hover,button:focus-visible{border-color:#1edc00;transform:translateY(-2px);outline:2px solid #1edc00;outline-offset:2px}button.is-active{border-color:#ff2d8a;box-shadow:4px 4px 0 #ff2d8a}button img{width:100%;display:block;aspect-ratio:16/9}button span{display:block;padding:10px 14px;font-size:14px;font-weight:700}a{color:#1edc00}aside{border-left:4px solid #ff2d8a;padding:10px 20px;margin-top:32px;background:#1d1d1b;border-radius:0 10px 10px 0}small{color:#9e9e93;display:block;margin-top:16px}@media(max-width:720px){.topbar{position:static}.shots,.extras{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:460px){.shots,.extras{grid-template-columns:1fr}}</style>
<header class="topbar"><a class="brand" href="../"><img src="../assets/icon-256.png" alt=""><span>SPLAT-STREET</span></a><nav aria-label="页面导航"><a class="pill" href="../">官网首页</a><a class="pill" href="./">竖版 3:4</a><a class="pill is-active" href="animatic-landscape.html" aria-current="page">横版 16:9</a><a class="pill pill--pink" href="../showcase/">组件图鉴</a><a class="pill" href="https://github.com/Shirolin/dsh-theme-splat-ui" target="_blank" rel="noreferrer">GitHub</a></nav></header>
<main><h1>墨街开涂！把工作台涂成尚兴广场。</h1><p>横版宣传片 · 1280×720 · 30s / 30fps · H.264 CRF18 · AAC 48kHz 立体声</p>
<video controls playsinline preload="metadata" poster="poster-landscape.webp" src="splat-street-landscape-animatic.mp4" aria-label="SPLAT-STREET 墨街主题 30 秒横版宣传片"></video>
<div class="meta-links"><a href="splat-street-landscape-animatic.mp4">成片 MP4</a><a href="cover-landscape.png">高清封面 PNG</a><a href="poster-landscape.webp">WebP 海报</a><a href="source/README-landscape.md">横版复现说明</a><a href="landscape-animatic/verification.json">规格与门禁 JSON</a></div>
<h2>九镜分镜索引</h2>
<nav class="shots" aria-label="镜头跳转">${cards}</nav>
<h2>转场与镜内切卡特写</h2>
<section class="extras" aria-label="转场与补帧">${extraCards}</section>
<aside><b>分镜与转场编排说明</b><p>全片涵盖 6 种斯普拉遁武器转场（射击墨点涂满、潜墨游动星爆、巨型滚筒刷屏、北斋笔刷斜斩、双滚筒合拢撤开、终局满屏对撞），配合跨镜 <code>clipReveal</code> 零硬切揭露与 Shot 04 三档外观控件联动。</p><p>界面由隔离 DSH 宿主实机渲染预置会话生成；点击任意分镜卡可直接跳转到对应时间轴。</p><a href="landscape-animatic/verification.json">查看 900 帧自动化门禁记录</a></aside><small>SPLAT-STREET 宣传素材库 · 源码与帧验证清单可在 repo 中离线复现。</small></main>
<script>const v=document.querySelector('video'),btns=[...document.querySelectorAll('[data-time]')];btns.forEach(b=>b.onclick=()=>{btns.forEach(x=>x.classList.remove('is-active'));b.classList.add('is-active');v.currentTime=Number(b.dataset.time);v.pause();v.scrollIntoView({behavior:'smooth',block:'center'})})</script></html>
`,
)

console.log(
  `PASS: 900 frames checked, ${transitionTypes.size} transition types (${coverEvents} full-cover events, ${clipRevealFrames} clip-reveal frames), ${layoutPresets.size} layout presets, no text/particle collisions or legacy copy; ${video}`,
)
