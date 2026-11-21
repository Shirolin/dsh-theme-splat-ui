import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../..')
const outDir = resolve(root, 'site/promo')
const tempDir = await mkdtemp(join(root, '.tmp/cover-render-'))
const chromePath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const font700 = pathToFileURL(resolve(root, 'site/assets/fonts/nunito-700.woff2')).href
const font900 = pathToFileURL(resolve(root, 'site/assets/fonts/nunito-900.woff2')).href
const wsLight = pathToFileURL(resolve(here, 'assets/workspace-light.png')).href
const wsDark = pathToFileURL(resolve(here, 'assets/workspace-dark.png')).href

const commonCss = `
@font-face { font-family: "Nunito"; font-weight: 700; src: url("${font700}") format("woff2"); }
@font-face { font-family: "Nunito"; font-weight: 900; src: url("${font900}") format("woff2"); }
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  overflow: hidden;
  position: relative;
  background: #fbfbf4;
  color: #121212;
  font-family: "Nunito", "Microsoft YaHei", "PingFang SC", sans-serif;
}
.bg-tri {
  position: absolute; inset: 0;
  background:
    linear-gradient(164deg, #a9ee9b 0 27%, transparent 27.1%),
    linear-gradient(164deg, transparent 0 79%, #fabbd6 79.1%);
}
.bg-dots {
  position: absolute; inset: 0; opacity: 0.28;
  background-image: radial-gradient(#1edc00 2px, transparent 2.2px);
  background-size: 26px 26px;
}
.splat-tl {
  position: absolute; width: 220px; height: 220px; border-radius: 50%;
  background: radial-gradient(circle, rgba(30,220,0,0.22) 0%, transparent 70%);
}
.eyebrow {
  display: inline-block;
  background: #121212;
  color: #fbfbf4;
  font-weight: 900;
  letter-spacing: 0.08em;
  border-radius: 999px;
  border: 3px solid #121212;
  box-shadow: 4px 5px 0 #ff2d8a;
}
.eyebrow span { color: #1edc00; }
.title-dsh {
  font-weight: 900;
  line-height: 0.94;
  letter-spacing: -0.03em;
  color: #121212;
  text-shadow: 5px 5px 0 #1edc00;
}
.title-main {
  font-weight: 900;
  line-height: 1.02;
  letter-spacing: -0.02em;
  color: #1edc00;
  -webkit-text-stroke: 10px #121212;
  paint-order: stroke fill;
  filter: drop-shadow(6px 7px 0 #ff2d8a);
}
.sub {
  font-weight: 900;
  color: #121212;
  background: #fffef9;
  border: 4px solid #121212;
  border-radius: 16px;
  display: inline-block;
  box-shadow: 5px 6px 0 #121212;
}
.pills { display: flex; flex-wrap: wrap; gap: 10px; }
.pill {
  font-weight: 900;
  border: 3.5px solid #121212;
  border-radius: 999px;
  box-shadow: 3px 4px 0 #121212;
}
.pill.lime { background: #1edc00; color: #121212; }
.pill.pink { background: #ff2d8a; color: #fffef9; }
.pill.dark { background: #121212; color: #fbfbf4; }
.card {
  position: absolute;
  border-radius: 16px;
  border: 5px solid #121212;
  background: #fffef9;
  padding: 6px;
  overflow: visible;
}
.card img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  border-radius: 10px;
}
.card.light { box-shadow: 10px 12px 0 #121212; }
.card.dark {
  background: #1b1b19;
  border-color: #ff2d8a;
  box-shadow: 0 0 0 4px #1edc00, 10px 12px 0 #121212;
}
.tape {
  position: absolute; width: 78px; height: 20px;
  border: 3px solid #121212; opacity: 0.96;
}
.tape.lime { background: #1edc00; }
.tape.pink { background: #ff2d8a; }
.footer-tag {
  position: absolute;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #121212;
  background: rgba(255, 254, 249, 0.92);
  border: 3px solid #121212;
  border-radius: 999px;
  box-shadow: 3px 4px 0 #121212;
}
`

const verticalHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
${commonCss}
body { width: 1080px; height: 1440px; }
.header { position: absolute; left: 64px; right: 64px; top: 64px; }
.eyebrow { font-size: 22px; padding: 10px 22px; margin-bottom: 26px; }
.title-dsh { font-size: 98px; margin-bottom: 4px; }
.title-main { font-size: 132px; margin-bottom: 24px; }
.sub { font-size: 36px; padding: 12px 24px; transform: rotate(-1.2deg); margin-bottom: 22px; }
.pills { margin-top: 4px; }
.pill { font-size: 22px; padding: 8px 20px; }
.card.light {
  left: 62px; top: 586px; width: 880px; height: 612px;
  transform: rotate(-1.8deg);
}
.card.dark {
  left: 484px; top: 942px; width: 534px; height: 372px;
  transform: rotate(2.1deg);
}
.tape-v1 { left: -18px; top: -8px; transform: rotate(-32deg); }
.tape-v2 { right: -18px; bottom: -8px; transform: rotate(-28deg); }
.badge-mode {
  position: absolute; top: -16px; right: 20px;
  background: #121212; color: #1edc00; border: 3px solid #fffef9;
  font-size: 18px; font-weight: 900; padding: 4px 14px; border-radius: 999px;
  letter-spacing: 0.06em;
}
.card.dark .badge-mode { color: #ff2d8a; border-color: #1edc00; }
.footer-tag { left: 64px; bottom: 44px; font-size: 20px; padding: 9px 22px; }
</style></head><body>
  <div class="bg-tri"></div>
  <div class="bg-dots"></div>
  <div class="header">
    <div class="eyebrow">DEEPSEEK HARNESS 主题插件 · <span>SPLAT-STREET</span></div>
    <div class="title-dsh">DSH</div>
    <div class="title-main">墨街主题</div>
    <div><div class="sub">给工作台涂上斯普拉遁 2 街头风</div></div>
    <div class="pills">
      <div class="pill lime">官方绿 #1EDC00</div>
      <div class="pill pink">昼夜双主场</div>
      <div class="pill dark">原生功能零改动</div>
    </div>
  </div>
  <div class="card light">
    <img src="${wsLight}" alt="墨街白昼工作台">
    <div class="tape pink tape-v1"></div>
    <div class="badge-mode">DAY TURF · 白昼涂地</div>
  </div>
  <div class="card dark">
    <img src="${wsDark}" alt="墨街午夜祭典">
    <div class="tape lime tape-v2"></div>
    <div class="badge-mode">NIGHT SHIFT · 午夜祭典</div>
  </div>
  <div class="footer-tag">开源 · MIT · GITHUB.COM/SHIROLIN/DSH-THEME-SPLAT-UI</div>
</body></html>`

function makeHorizontalHtml(w, h, scale) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${commonCss}
body { width: ${w}px; height: ${h}px; }
.bg-tri {
  background:
    linear-gradient(156deg, #a9ee9b 0 32%, transparent 32.1%),
    linear-gradient(156deg, transparent 0 77%, #fabbd6 77.1%);
}
.left { position: absolute; left: ${Math.round(52 * scale)}px; top: ${Math.round(54 * scale)}px; width: ${Math.round(516 * scale)}px; }
.eyebrow { font-size: ${Math.round(16 * scale)}px; padding: ${Math.round(7 * scale)}px ${Math.round(16 * scale)}px; margin-bottom: ${Math.round(22 * scale)}px; }
.title-dsh { font-size: ${Math.round(82 * scale)}px; margin-bottom: ${Math.round(4 * scale)}px; }
.title-main { font-size: ${Math.round(112 * scale)}px; -webkit-text-stroke: ${Math.round(9 * scale)}px #121212; margin-bottom: ${Math.round(22 * scale)}px; }
.sub { font-size: ${Math.round(28 * scale)}px; padding: ${Math.round(10 * scale)}px ${Math.round(20 * scale)}px; transform: rotate(-1.2deg); margin-bottom: ${Math.round(20 * scale)}px; }
.pills { gap: ${Math.round(9 * scale)}px; }
.pill { font-size: ${Math.round(18 * scale)}px; padding: ${Math.round(7 * scale)}px ${Math.round(16 * scale)}px; }
.card.light {
  left: ${Math.round(594 * scale)}px; top: ${Math.round(52 * scale)}px;
  width: ${Math.round(628 * scale)}px; height: ${Math.round(436 * scale)}px;
  transform: rotate(-2.2deg);
}
.card.dark {
  left: ${Math.round(784 * scale)}px; top: ${Math.round(354 * scale)}px;
  width: ${Math.round(448 * scale)}px; height: ${Math.round(310 * scale)}px;
  transform: rotate(1.9deg);
}
.tape-h1 { left: ${Math.round(-16 * scale)}px; top: ${Math.round(-8 * scale)}px; transform: rotate(-32deg); }
.tape-h2 { right: ${Math.round(-16 * scale)}px; bottom: ${Math.round(-8 * scale)}px; transform: rotate(-28deg); }
.badge-mode {
  position: absolute; top: ${Math.round(-15 * scale)}px; right: ${Math.round(18 * scale)}px;
  background: #121212; color: #1edc00; border: 3px solid #fffef9;
  font-size: ${Math.round(15 * scale)}px; font-weight: 900; padding: ${Math.round(4 * scale)}px ${Math.round(12 * scale)}px; border-radius: 999px;
}
.card.dark .badge-mode { color: #ff2d8a; border-color: #1edc00; }
.footer-tag {
  left: ${Math.round(56 * scale)}px; bottom: ${Math.round(38 * scale)}px;
  font-size: ${Math.round(16 * scale)}px; padding: ${Math.round(7 * scale)}px ${Math.round(18 * scale)}px;
}
</style></head><body>
  <div class="bg-tri"></div>
  <div class="bg-dots"></div>
  <div class="left">
    <div class="eyebrow">DEEPSEEK HARNESS 主题插件 · <span>SPLAT-STREET</span></div>
    <div class="title-dsh">DSH</div>
    <div class="title-main">墨街主题</div>
    <div><div class="sub">给工作台涂上斯普拉遁 2 街头风</div></div>
    <div class="pills">
      <div class="pill lime">官方绿 #1EDC00</div>
      <div class="pill pink">昼夜双主场</div>
      <div class="pill dark">原生功能零改动</div>
    </div>
  </div>
  <div class="card light">
    <img src="${wsLight}" alt="墨街白昼工作台">
    <div class="tape pink tape-h1"></div>
    <div class="badge-mode">DAY TURF · 白昼涂地</div>
  </div>
  <div class="card dark">
    <img src="${wsDark}" alt="墨街午夜祭典">
    <div class="tape lime tape-h2"></div>
    <div class="badge-mode">NIGHT SHIFT · 午夜祭典</div>
  </div>
  <div class="footer-tag">开源 · MIT · DSH-THEME-SPLAT-UI</div>
</body></html>`
}

const specs = [
  { name: 'vertical', w: 1080, h: 1440, html: verticalHtml, png: join(outDir, 'cover-vertical.png'), webp: join(outDir, 'poster-vertical.webp') },
  {
    name: 'landscape',
    w: 1280,
    h: 720,
    html: makeHorizontalHtml(1280, 720, 1.0),
    png: join(outDir, 'cover-landscape.png'),
    webp: join(outDir, 'poster-landscape.webp'),
  },
  { name: 'social', w: 1200, h: 630, html: makeHorizontalHtml(1200, 630, 0.89), png: join(outDir, 'social-card.png'), webp: null },
]

await mkdir(outDir, { recursive: true })
const port = 9450 + Math.floor(Math.random() * 400)
const profile = join(tempDir, 'chrome')
await mkdir(profile, { recursive: true })
const child = spawn(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--allow-file-access-from-files',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--window-size=1280,1440',
    'about:blank',
  ],
  { stdio: 'ignore', windowsHide: true },
)

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let socket
let nextId = 0
const pending = new Map()
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++nextId
    const timer = setTimeout(() => {
      pending.delete(id)
      rej(Error(`${method} timeout`))
    }, 30000)
    pending.set(id, { res, rej, timer })
    socket.send(JSON.stringify({ id, method, params }))
  })

try {
  let target
  for (let i = 0; i < 120; i++) {
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page')
      if (target) break
    } catch {}
    await wait(100)
  }
  if (!target) throw Error('Chrome CDP failed to start')
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r, j) => {
    socket.onopen = r
    socket.onerror = j
  })
  socket.onmessage = (e) => {
    const m = JSON.parse(e.data)
    const p = pending.get(m.id)
    if (p) {
      clearTimeout(p.timer)
      pending.delete(m.id)
      m.error ? p.rej(Error(m.error.message)) : p.res(m.result)
    }
  }
  await send('Page.enable')
  await send('Runtime.enable')

  for (const s of specs) {
    const htmlFile = join(tempDir, `${s.name}.html`)
    await writeFile(htmlFile, s.html)
    await send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: pathToFileURL(htmlFile).href })
    await send('Runtime.evaluate', {
      expression:
        'document.fonts.ready.then(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))))',
      awaitPromise: true,
    })
    await wait(150)
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(s.png, Buffer.from(data, 'base64'))
    console.log('Wrote', s.png, `${s.w}x${s.h}`)
  }
} finally {
  socket?.close()
  child.kill('SIGKILL')
  await wait(250)
  await rm(tempDir, { recursive: true, force: true }).catch(() => {})
}
