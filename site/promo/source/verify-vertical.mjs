import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../..'),
  out = resolve(here, '..')
const render = resolve(root, process.argv.find((v) => v.startsWith('--render='))?.slice(9) ?? '.tmp/promo-production-20261115/render')
const run = (command, args) => {
  const r = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 })
  if (r.status !== 0) throw Error(r.stderr)
  return r.stdout
}
const manifest = JSON.parse(await readFile(join(render, 'capture-manifest.json'), 'utf8'))
assert.equal(manifest.frames, 900)
assert.equal(manifest.sampling.dsf, 2)
assert.equal(manifest.consoleErrors.length, 0)
for (const [file, hash] of Object.entries(manifest.sourceSha256))
  assert.equal(
    createHash('sha256')
      .update(await readFile(join(here, file)))
      .digest('hex'),
    hash,
    `${file} changed after capture`,
  )
const video = join(out, 'splat-street-vertical.mp4')
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', video]))
assert.equal(probe.streams.length, 3)
const v = probe.streams.find((s) => s.codec_type === 'video' && s.disposition?.attached_pic !== 1)
const a = probe.streams.find((s) => s.codec_type === 'audio')
const coverPic = probe.streams.find((s) => s.disposition?.attached_pic === 1)
assert.ok(v, 'video stream missing')
assert.ok(a, 'audio stream missing')
assert.ok(coverPic, 'embedded attached_pic cover stream missing')
assert.equal(coverPic.width, 1080)
assert.equal(coverPic.height, 1440)
for (const [key, value] of Object.entries({
  codec_name: 'aac',
  sample_rate: '48000',
  channels: 2,
}))
  assert.equal(a[key], value, `audio.${key}`)
assert.ok(Math.abs(+a.duration - 30) < 0.2, `unexpected audio duration: ${a.duration}`)
for (const [key, value] of Object.entries({
  codec_name: 'h264',
  width: 1080,
  height: 1440,
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
  atoms.push({ type, offset: pos, size })
  if (size < 8) break
  pos += size
}
assert.ok(atoms.find((a) => a.type === 'moov').offset < atoms.find((a) => a.type === 'mdat').offset)
const storyboard = JSON.parse(await readFile(join(here, 'storyboard.json'), 'utf8'))
assert.equal(storyboard.shots.length, 9)
assert.equal(storyboard.shots.at(-1).end, 30)
const times = [1.1, 3.1, 6.6, 9.8, 13.1, 15.2, 18.8, 23.7, 27]
await mkdir(join(out, 'storyboard'), { recursive: true })
for (const [i, time] of times.entries())
  run('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-ss',
    String(time),
    '-i',
    video,
    '-frames:v',
    '1',
    '-update',
    '1',
    join(out, `storyboard/shot-${String(i + 1).padStart(2, '0')}.png`),
  ])
run('ffmpeg', ['-v', 'error', '-y', '-ss', '20.9', '-i', video, '-frames:v', '1', '-update', '1', join(out, 'storyboard/shot-07-tool.png')])
run('ffmpeg', [
  '-v',
  'error',
  '-y',
  '-framerate',
  '1',
  '-i',
  join(out, 'storyboard/shot-%02d.png'),
  '-vf',
  'scale=270:360,tile=3x3:padding=8:margin=8:color=0x121212',
  '-frames:v',
  '1',
  '-update',
  '1',
  join(out, 'storyboard/contact-sheet.png'),
])
await copyFile(join(render, 'capture-manifest.json'), join(out, 'capture-manifest.json'))
const checks = {
  status: 'pass',
  video: { ...v, durationSeconds: +probe.format.duration },
  audio: { codec_name: a.codec_name, sample_rate: +a.sample_rate, channels: a.channels, bit_rate: +a.bit_rate, durationSeconds: +a.duration },
  audioStreams: 1,
  embeddedCover: true,
  faststart: true,
  fullDecodePassed: true,
  atoms,
  crf: 18,
  crfEvidence: 'encode-vertical.ps1 and x264 encoder options embedded in stream',
  sourceUnchangedSinceCapture: true,
  deterministicRepeatedTime: manifest.determinism[0].sha256 === manifest.determinism[2].sha256,
  endingStatic27to30: manifest.determinism[3].sha256 === manifest.determinism[4].sha256,
  storyboard: storyboard.shots.map((s, i) => ({ id: s.id, start: s.start, end: s.end, reference: times[i] })),
  videoSha256: createHash('sha256').update(bytes).digest('hex'),
}
assert.ok(bytes.includes(Buffer.from('crf=18.0')), 'x264 CRF18 metadata missing')
const cover = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', join(out, 'cover-vertical.png')])).streams[0]
assert.equal(cover.width, 1080)
assert.equal(cover.height, 1440)
const poster = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', join(out, 'poster-vertical.webp')])).streams[0]
assert.equal(poster.width, 1080)
assert.equal(poster.height, 1440)
await writeFile(join(out, 'verification.json'), `${JSON.stringify(checks, null, 2)}\n`)
const cards = storyboard.shots
  .map(
    (s, i) =>
      `<button class="shot" data-time="${times[i]}"><img src="storyboard/shot-${s.id}.png" alt="${s.name}"><span>${s.id} · ${s.start}–${s.end}s<br>${s.name}</span></button>`,
  )
  .join('')
await writeFile(
  join(out, 'index.html'),
  `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#141413"><title>SPLAT-STREET · 竖版宣传片（3:4）</title><link rel="icon" href="../assets/icon-256.png" type="image/png"><style>@font-face{font-family:"Nunito";src:url("../assets/fonts/nunito-400.woff2") format("woff2");font-weight:400;font-display:swap}@font-face{font-family:"Nunito";src:url("../assets/fonts/nunito-700.woff2") format("woff2");font-weight:700;font-display:swap}@font-face{font-family:"Nunito";src:url("../assets/fonts/nunito-900.woff2") format("woff2");font-weight:900;font-display:swap}*{box-sizing:border-box}body{margin:0;background:#141413;color:#f8f8ef;font:16px/1.6 "Nunito","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif}.topbar{position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:14px clamp(16px,3vw,32px);background:rgba(20,20,19,.94);backdrop-filter:blur(10px);border-bottom:3px solid #1edc00}.brand{display:inline-flex;align-items:center;gap:10px;color:#f8f8ef;text-decoration:none;font-weight:900;font-size:18px;letter-spacing:-.02em}.brand img{width:28px;height:28px;border-radius:7px}.topbar nav{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.pill{display:inline-flex;align-items:center;min-height:36px;padding:4px 12px;border-radius:999px;border:2px solid #4a4a44;color:#f8f8ef;text-decoration:none;font-size:14px;font-weight:800}.pill:hover{border-color:#1edc00;color:#1edc00}.pill.is-active{background:#1edc00;border-color:#1edc00;color:#121212}.pill--pink:hover{border-color:#ff2d8a;color:#ff2d8a}main{max-width:1120px;margin:auto;padding:32px clamp(16px,3vw,24px) 56px}h1{font-size:clamp(30px,4vw,44px);font-weight:900;letter-spacing:-.02em;margin:0}h2{font-size:22px;font-weight:900;margin:36px 0 12px;color:#1edc00}p{color:#c9c9c0}video{display:block;max-width:100%;width:486px;margin:28px auto;background:#0d0e0d;border:4px solid #1edc00;border-radius:16px;box-shadow:8px 8px 0 #ff2d8a}.meta-nav{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin:18px 0}.meta-nav a{display:inline-flex;align-items:center;min-height:38px;padding:6px 14px;border:2px solid #4a4a44;border-radius:8px;color:#1edc00;text-decoration:none;font-weight:800;font-size:14px}.meta-nav a:hover{border-color:#1edc00;background:#1d1d1b}.spec{text-align:center;font-size:14px;color:#b6b6ab}.note{display:block;text-align:center;color:#9e9e93;margin-top:8px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:20px}.shot{padding:0;border:2px solid #4a4a44;background:#232321;color:#f8f8ef;text-align:left;cursor:pointer;border-radius:12px;overflow:hidden;font:inherit;transition:transform .14s ease,border-color .14s ease}.shot:hover,.shot:focus-visible{border-color:#1edc00;transform:translateY(-2px);outline:3px solid #1edc00;outline-offset:2px}.shot.is-active{border-color:#ff2d8a;box-shadow:4px 4px 0 #ff2d8a}.shot img{display:block;width:100%;aspect-ratio:3/4}.shot span{display:block;padding:12px;font-size:14px;font-weight:700}@media(max-width:680px){.topbar{position:static}.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:440px){.grid{grid-template-columns:1fr}}</style><header class="topbar"><a class="brand" href="../"><img src="../assets/icon-256.png" alt=""><span>SPLAT-STREET</span></a><nav aria-label="页面导航"><a class="pill" href="../">官网首页</a><a class="pill is-active" href="./" aria-current="page">竖版 3:4</a><a class="pill" href="animatic-landscape.html">横版 16:9</a><a class="pill pill--pink" href="../showcase/">组件图鉴</a><a class="pill" href="https://github.com/Shirolin/dsh-theme-splat-ui" target="_blank" rel="noreferrer">GitHub</a></nav></header><main><h1>把工作台，涂成主场。</h1><p>SPLAT-STREET 竖版宣传片（3:4 · 适用手机端与社群分享），含斯普拉遁 2 风格配乐与完整九镜实机画面。</p><video id="film" controls playsinline preload="metadata" poster="poster-vertical.webp" src="splat-street-vertical.mp4" aria-label="SPLAT-STREET 墨街主题 30 秒竖版宣传片"></video><div class="meta-nav"><a href="splat-street-vertical.mp4">成片 MP4</a><a href="cover-vertical.png">高清封面 PNG</a><a href="poster-vertical.webp">WebP 海报</a><a href="source/README.md">复现说明</a><a href="verification.json">规格验证 JSON</a></div><p class="spec">1080×1440 · 30 秒 · 30fps · H.264 CRF18 · bt709 · AAC 48kHz 立体声</p><small class="note">画面来自隔离 DSH 宿主实机渲染演示；点击下方任意分镜可直接跳转对应时间轴。</small><h2>九镜分镜索引</h2><div class="grid">${cards}</div></main><script>const v=document.querySelector('video'),shots=[...document.querySelectorAll('[data-time]')];shots.forEach(b=>b.onclick=()=>{shots.forEach(x=>x.classList.remove('is-active'));b.classList.add('is-active');v.currentTime=+b.dataset.time;v.pause();v.scrollIntoView({behavior:'smooth',block:'center'})})</script></html>`,
)
console.log('PASS video / 900 frames / 30s / AAC 48kHz stereo / CRF18 / bt709 / faststart / deterministic / static ending; generated 10 references.')
