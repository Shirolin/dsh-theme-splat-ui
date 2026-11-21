import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../..')
const samples = process.argv.includes('--samples')
const output = resolve(root, process.argv.find((v) => v.startsWith('--out='))?.slice(6) ?? '.tmp/promo-production-20261115/render')
const port = 9400 + Math.floor(Math.random() * 500),
  profile = join(output, `chrome-${port}`)
await mkdir(profile, { recursive: true })
const child = spawn(
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--allow-file-access-from-files',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--window-size=1080,1440',
    'about:blank',
  ],
  { stdio: 'ignore', windowsHide: true },
)
let socket,
  nextId = 0
const pending = new Map(),
  errors = []
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++nextId,
      timer = setTimeout(() => {
        pending.delete(id)
        rej(Error(`${method} timeout`))
      }, 60000)
    pending.set(id, { res, rej, timer })
    socket.send(JSON.stringify({ id, method, params }))
  })
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails))
  return r.result.value
}
try {
  let target
  for (let i = 0; i < 150; i++) {
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page')
      if (target) break
    } catch {}
    await wait(100)
  }
  if (!target) throw Error('Chrome CDP did not start')
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r, j) => {
    socket.onopen = r
    socket.onerror = j
  })
  socket.onmessage = (e) => {
    const m = JSON.parse(e.data),
      p = pending.get(m.id)
    if (p) {
      clearTimeout(p.timer)
      pending.delete(m.id)
      m.error ? p.rej(Error(m.error.message)) : p.res(m.result)
    } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params)
  }
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1440, deviceScaleFactor: 2, mobile: false })
  await send('Page.navigate', { url: `${pathToFileURL(join(here, 'stage-vertical.html')).href}?capture=1` })
  for (let i = 0; i < 200; i++) {
    if (await evaluate('window.__PROMO_READY__===true')) break
    if (i === 199) throw Error('stage not ready')
    await wait(100)
  }
  const times = samples
    ? [0.45, 1.1, 2.25, 4.0, 5.95, 7.5, 9.8, 10.9, 12.0, 12.75, 13.65, 16.0, 18.8, 20.1, 21.3, 22.62, 24.0, 25.48, 27.0, 27.5, 29.9666667]
    : Array.from({ length: 900 }, (_, i) => i / 30)
  const frames = join(output, samples ? 'samples' : 'frames')
  await mkdir(frames, { recursive: true })
  const started = Date.now(),
    diagnostics = [],
    diagViolations = []
  for (const [i, t] of times.entries()) {
    await evaluate(`window.renderAt(${t}).then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))`)
    const d = await evaluate('window.getPromoDiagnostics()')
    diagnostics.push(d)
    if (!d || typeof d.particles?.overlaps !== 'number' || d.particles.overlaps !== 0) {
      diagViolations.push(`particle collision at ${t.toFixed(3)}s: ${JSON.stringify(d?.particles)}`)
    }
    const isFullCover = Boolean(d?.transition?.fullCover)
    if (!isFullCover && Array.isArray(d?.textBoxes)) {
      for (const box of d.textBoxes) {
        if (!Number.isFinite(box.x) || !Number.isFinite(box.y) || !Number.isFinite(box.w) || !Number.isFinite(box.h)) {
          diagViolations.push(`invalid textBox at ${t.toFixed(3)}s (shot ${d.shot}): ${JSON.stringify(box)}`)
        } else if (box.x < 44 || box.x + box.w > 1036 || box.y < 28 || box.y + box.h > 1412) {
          diagViolations.push(
            `unsafe text at ${t.toFixed(3)}s (shot ${d.shot}): ${box.value} -> [${box.x.toFixed(1)}, ${box.y.toFixed(1)}, ${(box.x + box.w).toFixed(1)}, ${(box.y + box.h).toFixed(1)}]`,
          )
        }
      }
    }
    const shot = await send('Page.captureScreenshot', {
      format: samples ? 'png' : 'jpeg',
      ...(samples ? {} : { quality: 94 }),
      fromSurface: true,
      captureBeyondViewport: false,
    })
    const name = samples ? `t-${t.toFixed(3).replace('.', '-')}.png` : `${String(i).padStart(5, '0')}.jpg`
    await writeFile(join(frames, name), Buffer.from(shot.data, 'base64'))
    if (i % 30 === 0) console.log(`Captured ${i + 1}/${times.length} (${t.toFixed(2)}s)`)
  }
  const hashes = []
  for (const t of [18.8, 13.1, 18.8, 27, 29.9666667]) {
    await evaluate(`window.renderAt(${t}).then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))`)
    const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    hashes.push({ time: t, sha256: createHash('sha256').update(Buffer.from(s.data, 'base64')).digest('hex') })
  }
  if (hashes[0].sha256 !== hashes[2].sha256) throw Error('renderAt is not deterministic')
  if (hashes[3].sha256 !== hashes[4].sha256) throw Error('ending is not static after 27s')
  if (errors.length) throw Error(JSON.stringify(errors))
  const fonts = await evaluate(`Array.from(document.fonts).map(f => ({ family: f.family, weight: String(f.weight), status: f.status }))`)
  const loadedWeights = new Set(fonts.filter((f) => f.family.replace(/['"]/g, '') === 'Nunito' && f.status === 'loaded').map((f) => f.weight))
  if (!loadedWeights.has('700') || !loadedWeights.has('900')) {
    throw Error(`Nunito 700/900 fonts failed to load: ${JSON.stringify(fonts)}`)
  }
  const manifest = {
    width: 1080,
    height: 1440,
    sampling: { width: 2160, height: 2880, dsf: 2, jpegQuality: 94 },
    fps: 30,
    duration: 30,
    frames: times.length,
    samples,
    times: samples ? times : undefined,
    elapsedSeconds: (Date.now() - started) / 1000,
    determinism: hashes,
    fonts,
    diagnosticsChecked: diagnostics.length,
    diagnosticsViolations: diagViolations,
    consoleErrors: errors,
    sourceSha256: {},
  }
  for (const file of ['stage-vertical.html', 'stage.css', 'film-vertical.js', 'storyboard.json', 'landscape-copy.js', 'landscape-transitions.js'])
    manifest.sourceSha256[file] = createHash('sha256')
      .update(await readFile(join(here, file)))
      .digest('hex')
  await writeFile(join(output, samples ? 'samples-manifest.json' : 'capture-manifest.json'), JSON.stringify(manifest, null, 2))
  await writeFile(join(output, samples ? 'samples-diagnostics.json' : 'frame-diagnostics.json'), JSON.stringify(diagnostics, null, 2))
  if (diagViolations.length > 0) {
    throw Error(`Vertical diagnostics failed (${diagViolations.length}):\n${diagViolations.join('\n')}`)
  }
  console.log(`Complete: ${times.length} frames, ${manifest.elapsedSeconds.toFixed(1)}s (0 diagnostics violations)`)
} finally {
  if (socket?.readyState === 1) {
    try {
      await send('Browser.close')
    } catch {}
    socket.close()
  }
  if (child.exitCode === null) child.kill()
}
