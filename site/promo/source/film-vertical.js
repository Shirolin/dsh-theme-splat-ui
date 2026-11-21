// Logical stage is 1080x1440 (3:4); capture samples at DSF=2 (2160x2880).
import { DURATION, getActiveTransition, getShotAt, getShotById, PALETTE, REPO_URL, STATIC_HOLD_START } from './landscape-copy.js'
import { applyTransitionClip, drawAmbientSplats, drawSplatBlob, drawSquidIcon, getTransitionShake, renderTransition } from './landscape-transitions.js'

const W = 1080
const H = 1440
const SAFE_AREA = [44, 28, 1036, 1412]
const FONT_STACK = '"Nunito", "Microsoft YaHei", "PingFang SC", sans-serif'

const canvas = document.querySelector('#stage')
const ctx = canvas.getContext('2d', { alpha: false })
const params = new URLSearchParams(location.search)
const capture = params.has('capture')
document.documentElement.classList.toggle('capture', capture)
document.documentElement.toggleAttribute('data-capture', capture)

const ASSET_NAMES = [
  'workspace-light',
  'workspace-dark',
  'hero-light',
  'composer-light',
  'input-menu-light',
  'appearance-panel-light',
  'appearance-panel-light-turf',
  'appearance-panel-light-balanced',
  'appearance-panel-light-paper',
  'code-dark',
  'tool-card-dark',
  'input-menu-mobile-dark',
]

async function loadImage(src) {
  const img = new Image()
  img.src = src
  await img.decode()
  return img
}

const images = Object.fromEntries(
  await Promise.all([
    ...ASSET_NAMES.map(async (name) => [name, await loadImage(`assets/${name}.png`)]),
    loadImage('../../assets/hero-dark.png').then((img) => ['hero-dark', img]),
    loadImage('../../../src/client/assets/inkopolis-square.png').then((img) => ['inkopolis-square', img]),
  ]),
)

await Promise.all([document.fonts.load('700 48px "Nunito"'), document.fonts.load('900 48px "Nunito"')])
await document.fonts.ready

// ---------------- Math & Deterministic Motion Helpers ----------------

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const mix = (a, b, t) => a + (b - a) * t
const outCubic = (v) => 1 - (1 - clamp01(v)) ** 3
const inOutCubic = (v) => {
  const x = clamp01(v)
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}
const outBack = (v, s = 1.65) => {
  const x = clamp01(v) - 1
  return 1 + (s + 1) * x ** 3 + s * x ** 2
}

/** Gentle breathing micro-parallax, smoothly attenuated to 0 before 27.0s. */
function getBreath(t, seed = 0) {
  if (t >= 27.0) return { by: 0, bt: 0 }
  const env = t > 26.2 ? 1 - inOutCubic((t - 26.2) / 0.8) : 1
  return {
    by: Math.sin(t * 2.1 + seed) * 2.2 * env,
    bt: Math.cos(t * 1.6 + seed * 1.7) * 0.14 * env,
  }
}

// ---------------- Frame Diagnostics State ----------------

let protectedRects = []
let uiRects = []
let textBoxes = []
let lastDiagnostics = null

function pushProtectedRect(x, y, w, h, pad = 4) {
  if (w <= 0 || h <= 0) return
  protectedRects.push({
    x: x - pad,
    y: y - pad,
    w: w + pad * 2,
    h: h + pad * 2,
  })
}

function recordTextBox(value, localX, localY, metrics, pad = 2) {
  const m = ctx.getTransform()
  const sx = canvas.width / W
  const sy = canvas.height / H
  const a = m.a / sx
  const b = m.b / sy
  const c = m.c / sx
  const d = m.d / sy
  const e = m.e / sx
  const f = m.f / sy
  const x0 = localX - metrics.actualBoundingBoxLeft - pad
  const x1 = localX + metrics.actualBoundingBoxRight + pad
  const y0 = localY - metrics.actualBoundingBoxAscent - pad
  const y1 = localY + metrics.actualBoundingBoxDescent + pad
  const corners = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ].map(([px, py]) => [a * px + c * py + e, b * px + d * py + f])
  const xs = corners.map((p) => p[0])
  const ys = corners.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const box = {
    value,
    x: Number(minX.toFixed(2)),
    y: Number(minY.toFixed(2)),
    w: Number((maxX - minX).toFixed(2)),
    h: Number((maxY - minY).toFixed(2)),
  }
  textBoxes.push(box)
  return box
}

function drawText(value, x, y, opts = {}) {
  const {
    size = 32,
    weight = 900,
    color = PALETTE.cream,
    align = 'left',
    baseline = 'alphabetic',
    strokeColor = null,
    strokeWidth = 0,
    shadowColor = null,
    shadowX = 5,
    shadowY = 5,
    pad = 2,
    track = true,
  } = opts
  ctx.font = `${weight} ${size}px ${FONT_STACK}`
  ctx.textAlign = align
  ctx.textBaseline = baseline
  const metrics = ctx.measureText(value)

  if (shadowColor) {
    ctx.fillStyle = shadowColor
    if (strokeColor && strokeWidth > 0) {
      ctx.strokeStyle = shadowColor
      ctx.lineWidth = strokeWidth
      ctx.lineJoin = 'round'
      ctx.strokeText(value, x + shadowX, y + shadowY)
    }
    ctx.fillText(value, x + shadowX, y + shadowY)
  }

  if (strokeColor && strokeWidth > 0) {
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.strokeText(value, x, y)
  }

  ctx.fillStyle = color
  ctx.fillText(value, x, y)

  return track ? recordTextBox(value, x, y, metrics, pad + (strokeWidth > 0 ? strokeWidth * 0.45 : 0)) : null
}

function measureTextWidth(value, size, weight = 900) {
  ctx.font = `${weight} ${size}px ${FONT_STACK}`
  return ctx.measureText(value).width
}

// ---------------- Pre-rendered Offscreen Pattern Tiles ----------------

function createPatternTile(size, drawFn) {
  const tile = document.createElement('canvas')
  tile.width = size
  tile.height = size
  const tctx = tile.getContext('2d')
  drawFn(tctx, size)
  return tile
}

function drawFourPointStar(tctx, cx, cy, r, color) {
  tctx.fillStyle = color
  tctx.beginPath()
  tctx.moveTo(cx, cy - r)
  tctx.quadraticCurveTo(cx + r * 0.18, cy - r * 0.18, cx + r, cy)
  tctx.quadraticCurveTo(cx + r * 0.18, cy + r * 0.18, cx, cy + r)
  tctx.quadraticCurveTo(cx - r * 0.18, cy + r * 0.18, cx - r, cy)
  tctx.quadraticCurveTo(cx - r * 0.18, cy - r * 0.18, cx, cy - r)
  tctx.closePath()
  tctx.fill()
}

function buildSquidWallpaperPattern(squidColor, _eyeColor, starColor, alpha = 1, includeOcto = false) {
  const tile = createPatternTile(220, (tctx) => {
    tctx.globalAlpha = alpha
    drawSquidIcon(tctx, 54, 52, 66, -0.1, squidColor, null, null, { pupils: false })
    drawSquidIcon(tctx, 162, 162, 62, 0.12, squidColor, null, null, { pupils: false, species: includeOcto ? 'octo' : 'squid' })
    drawFourPointStar(tctx, 182, 46, 13, starColor)
    drawFourPointStar(tctx, 48, 174, 11, starColor)
  })
  return ctx.createPattern(tile, 'repeat')
}

function buildHalftonePattern(dotColor, alpha) {
  const tile = createPatternTile(160, (tctx) => {
    tctx.fillStyle = dotColor
    tctx.globalAlpha = alpha
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const cx = 12 + col * 26 + (row % 2) * 13
        const cy = 12 + row * 26
        const r = 0.85 + ((row + col) % 3) * 0.25
        tctx.beginPath()
        tctx.arc(cx, cy, r, 0, Math.PI * 2)
        tctx.fill()
      }
    }
  })
  return ctx.createPattern(tile, 'repeat')
}

function buildCornerHalftoneCluster(color, alpha = 0.24) {
  return createPatternTile(320, (tctx) => {
    tctx.fillStyle = color
    const step = 18
    for (let y = step * 0.5; y < 320; y += step) {
      for (let x = step * 0.5; x < 320; x += step) {
        const dist = Math.hypot(x, y) / 300
        const strength = Math.max(0, 1 - dist)
        if (strength <= 0.08) continue
        tctx.globalAlpha = alpha * strength
        tctx.beginPath()
        tctx.arc(x, y, 2.1 + strength * 4.2, 0, Math.PI * 2)
        tctx.fill()
      }
    }
  })
}

const PATTERNS = {
  squidDayCream: buildSquidWallpaperPattern('#e3e2d4', '#f7f6ec', '#e3e2d4', 0.9),
  squidDayBand: buildSquidWallpaperPattern('#ffffff', '#a9ee9b', '#ffffff', 0.58),
  squidDayPinkBand: buildSquidWallpaperPattern('#ffffff', '#fabbd6', '#ffffff', 0.55),
  squidNight: buildSquidWallpaperPattern('#ffffff', '#1b1b19', '#ffffff', 0.045, true),
  toneDay: buildHalftonePattern('#121212', 0.06),
  toneNight: buildHalftonePattern('#f2f2e8', 0.09),
  clusterInk: buildCornerHalftoneCluster('#121212', 0.2),
  clusterPink: buildCornerHalftoneCluster('#ff2d8a', 0.28),
  clusterLime: buildCornerHalftoneCluster('#1edc00', 0.25),
}

// Pre-render light ink silhouette tint for Shot 01 Inkopolis Square atmosphere
const inkopolisLightBackdrop = (() => {
  const src = images['inkopolis-square']
  const off = document.createElement('canvas')
  off.width = 1400
  off.height = Math.round((1400 * src.height) / src.width)
  const octx = off.getContext('2d')
  octx.drawImage(src, 0, 0, off.width, off.height)
  const imgData = octx.getImageData(0, 0, off.width, off.height)
  const d = imgData.data
  const w = off.width
  const h = off.height
  for (let y = 0; y < h; y++) {
    const vy = Math.min(1, y / (h * 0.14), (h - 1 - y) / (h * 0.14))
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const vx = Math.min(1, x / (w * 0.06), (w - 1 - x) / (w * 0.06))
      const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
      const inkMask = clamp01((150 - lum) / 90)
      d[i] = 18
      d[i + 1] = 18
      d[i + 2] = 18
      d[i + 3] = Math.round(inkMask * vx * vy * 44)
    }
  }
  octx.putImageData(imgData, 0, 0)
  return off
})()

// ---------------- Graphic Decoration Primitives ----------------

function drawHazardStripes(x, y, w, h, c1, c2, stripeW = 14) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.fillStyle = c1
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = c2
  for (let sx = x - h; sx < x + w + h; sx += stripeW * 2) {
    ctx.beginPath()
    ctx.moveTo(sx, y + h)
    ctx.lineTo(sx + stripeW, y + h)
    ctx.lineTo(sx + stripeW + h, y)
    ctx.lineTo(sx + h, y)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function drawCornerTape(x, y, angleDeg, color = PALETTE.lime, w = 84, h = 21) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((angleDeg * Math.PI) / 180)
  ctx.fillStyle = 'rgba(18, 18, 18, 0.26)'
  ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h)

  ctx.beginPath()
  const hw = w / 2
  const hh = h / 2
  ctx.moveTo(-hw + 5, -hh)
  ctx.lineTo(hw - 3, -hh)
  ctx.lineTo(hw, -hh * 0.35)
  ctx.lineTo(hw - 4, hh * 0.35)
  ctx.lineTo(hw - 1, hh)
  ctx.lineTo(-hw + 3, hh)
  ctx.lineTo(-hw, hh * 0.3)
  ctx.lineTo(-hw + 4, -hh * 0.3)
  ctx.closePath()

  ctx.fillStyle = color
  ctx.globalAlpha = 0.92
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.restore()
}

function drawRotatedPill(cx, cy, w, h, tiltDeg, fill, borderColor = PALETTE.ink, shadowColor = PALETTE.ink, shadowOff = 5, radius = 10) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((tiltDeg * Math.PI) / 180)
  if (shadowColor) {
    ctx.fillStyle = shadowColor
    ctx.beginPath()
    ctx.roundRect(-w / 2 + shadowOff, -h / 2 + shadowOff, w, h, radius)
    ctx.fill()
  }
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, radius)
  ctx.fill()
  if (borderColor) {
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 3.5
    ctx.stroke()
  }
  ctx.restore()
}

function computeRotatedAABB(cx, cy, w, h, tiltDeg, padX = 0, padY = 0) {
  const rad = (tiltDeg * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const rw = w * cos + h * sin + padX * 2
  const rh = w * sin + h * cos + padY * 2
  return { x: cx - rw / 2, y: cy - rh / 2, w: rw, h: rh }
}

// ---------------- Vertical 3:4 Stage Background (Day & Night) ----------------

function drawStageBackground(dark, _t, shotIndex = 0, shake = { dx: 0, dy: 0 }) {
  ctx.save()
  ctx.translate(shake.dx, shake.dy)
  if (!dark) {
    // 1. Cream turf base + subtle squid wallpaper
    ctx.fillStyle = PALETTE.dayBandCream
    ctx.fillRect(-24, -24, W + 48, H + 48)
    ctx.fillStyle = PATTERNS.squidDayCream
    ctx.fillRect(-24, -24, W + 48, H + 48)

    // 2. Upper-left diagonal lime band tailored for 1080x1440
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-24, -24)
    ctx.lineTo(W + 24, -24)
    ctx.lineTo(W + 24, 140)
    ctx.lineTo(-24, 460)
    ctx.closePath()
    ctx.fillStyle = PALETTE.dayBandLime
    ctx.fill()
    ctx.clip()
    ctx.fillStyle = PATTERNS.squidDayBand
    ctx.fillRect(-24, -24, W + 48, H + 48)
    ctx.restore()

    // 3. Lower-right curved pink band tailored for 1080x1440
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-24, 1220)
    ctx.bezierCurveTo(260, 1170, 520, 1115, 760, 1055)
    ctx.bezierCurveTo(920, 1015, 1015, 965, W + 24, 920)
    ctx.lineTo(W + 24, H + 24)
    ctx.lineTo(-24, H + 24)
    ctx.closePath()
    ctx.fillStyle = PALETTE.dayBandPink
    ctx.fill()
    ctx.clip()
    ctx.fillStyle = PATTERNS.squidDayPinkBand
    ctx.fillRect(-24, -24, W + 48, H + 48)
    ctx.restore()

    // 4. Giant subtle background squid watermark
    ctx.save()
    ctx.globalAlpha = 0.05
    drawSquidIcon(ctx, 880, 460, 320, -0.2 + shotIndex * 0.08, PALETTE.ink, null, null, { pupils: false })
    ctx.restore()

    // 5. Screen-tone halftone dot matrix & corner clusters
    ctx.fillStyle = PATTERNS.toneDay
    ctx.fillRect(-24, -24, W + 48, H + 48)

    ctx.drawImage(PATTERNS.clusterInk, 0, 0, 320, 320)
    ctx.save()
    ctx.translate(W, H)
    ctx.scale(-1, -1)
    ctx.drawImage(PATTERNS.clusterPink, 0, 0, 320, 320)
    ctx.restore()

    // 6. Corner edge ink smears
    drawSplatBlob(ctx, 1068, 28, 78, PALETTE.pink, 14 + shotIndex, { satellites: 4, highlight: true, alpha: 0.78 })
    drawSplatBlob(ctx, 16, 1420, 68, PALETTE.lime, 31 + shotIndex, { satellites: 3, highlight: true, alpha: 0.85 })

    // 7. Caution /// diagonal corner stripes
    drawHazardStripes(0, 0, 160, 14, PALETTE.ink, PALETTE.lime, 16)
    drawHazardStripes(W - 160, H - 14, 160, 14, PALETTE.ink, PALETTE.pink, 16)
  } else {
    // 1. Charcoal Night Shift gradient
    const bgGrad = ctx.createLinearGradient(0, 0, W * 0.2, H)
    bgGrad.addColorStop(0, PALETTE.nightTop)
    bgGrad.addColorStop(0.54, PALETTE.nightMid)
    bgGrad.addColorStop(1, PALETTE.nightBot)
    ctx.fillStyle = bgGrad
    ctx.fillRect(-24, -24, W + 48, H + 48)

    // 2. Neon magenta / lime ambient corner glows
    const pinkGlow = ctx.createRadialGradient(W * 0.88, H * 0.14, 20, W * 0.88, H * 0.14, 520)
    pinkGlow.addColorStop(0, 'rgba(255, 45, 138, 0.20)')
    pinkGlow.addColorStop(0.6, 'rgba(255, 45, 138, 0.05)')
    pinkGlow.addColorStop(1, 'rgba(255, 45, 138, 0)')
    ctx.fillStyle = pinkGlow
    ctx.fillRect(-24, -24, W + 48, H + 48)

    const limeGlow = ctx.createRadialGradient(W * 0.14, H * 0.86, 20, W * 0.14, H * 0.86, 520)
    limeGlow.addColorStop(0, 'rgba(68, 240, 40, 0.17)')
    limeGlow.addColorStop(0.6, 'rgba(68, 240, 40, 0.04)')
    limeGlow.addColorStop(1, 'rgba(68, 240, 40, 0)')
    ctx.fillStyle = limeGlow
    ctx.fillRect(-24, -24, W + 48, H + 48)

    // 3. Subtle night squid wallpaper + 9% light halftone dots
    ctx.fillStyle = PATTERNS.squidNight
    ctx.fillRect(-24, -24, W + 48, H + 48)
    ctx.fillStyle = PATTERNS.toneNight
    ctx.fillRect(-24, -24, W + 48, H + 48)

    // 4. Giant subtle night octopus watermark
    ctx.save()
    ctx.globalAlpha = 0.04
    drawSquidIcon(ctx, 210, 1020, 340, 0.18 + shotIndex * 0.06, PALETTE.paper, null, null, { pupils: false, species: 'octo' })
    ctx.restore()

    // 5. Corner halftone clusters & edge neon ink splashes
    ctx.drawImage(PATTERNS.clusterLime, 0, 0, 320, 320)
    ctx.save()
    ctx.translate(W, H)
    ctx.scale(-1, -1)
    ctx.drawImage(PATTERNS.clusterPink, 0, 0, 320, 320)
    ctx.restore()

    drawSplatBlob(ctx, 1068, 28, 76, PALETTE.pink, 52 + shotIndex, { satellites: 4, highlight: true, alpha: 0.68 })
    drawSplatBlob(ctx, 16, 1418, 66, PALETTE.lime, 67 + shotIndex, { satellites: 3, highlight: true, alpha: 0.72 })

    // 6. Neon /// corner caution trims
    drawHazardStripes(0, 0, 160, 14, PALETTE.ink, PALETTE.lime, 16)
    drawHazardStripes(W - 160, H - 14, 160, 14, PALETTE.ink, PALETTE.pink, 16)
  }
  ctx.restore()
}

/** Deterministic jagged split seam between Day Turf (left) and Night Shift (right) for 1080x1440. */
function getSplitSeamPoints(topX = 620, botX = 460) {
  const pts = []
  for (let y = -32; y <= H + 32; y += 26) {
    const u = (y + 32) / (H + 64)
    const jag = Math.sin(y * 0.031 + 1.4) * 14 + Math.cos(y * 0.068 - 0.8) * 9
    pts.push([mix(topX, botX, u) + jag, y])
  }
  return pts
}

/** Shot 09 split-battlefield backdrop: bright Day Turf left vs charcoal Night Shift right. */
function drawSplitTurfArena(t, shotIndex = 8, shake = { dx: 0, dy: 0 }) {
  const seamPts = getSplitSeamPoints(620, 460)

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(-40, -32)
  for (const [sx, sy] of seamPts) ctx.lineTo(sx + 6, sy)
  ctx.lineTo(-40, H + 32)
  ctx.closePath()
  ctx.clip()
  drawStageBackground(false, t, shotIndex, shake)
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(W + 40, -32)
  for (const [sx, sy] of seamPts) ctx.lineTo(sx - 6, sy)
  ctx.lineTo(W + 40, H + 32)
  ctx.closePath()
  ctx.clip()
  drawStageBackground(true, t, shotIndex, shake)
  ctx.restore()

  ctx.save()
  ctx.translate(shake.dx, shake.dy)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const traceSeam = (offsetX = 0) => {
    ctx.beginPath()
    seamPts.forEach(([sx, sy], i) => {
      if (i === 0) ctx.moveTo(sx + offsetX, sy)
      else ctx.lineTo(sx + offsetX, sy)
    })
  }

  traceSeam(-9)
  ctx.strokeStyle = PALETTE.lime
  ctx.lineWidth = 7
  ctx.stroke()

  traceSeam(9)
  ctx.strokeStyle = PALETTE.pink
  ctx.lineWidth = 7
  ctx.stroke()

  traceSeam(0)
  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = 10
  ctx.stroke()
  ctx.restore()
}

// ---------------- Tilted Sticker Card Renderer ----------------

function drawTiltedCard(imageName, x, y, width, opts = {}) {
  const image = images[imageName]
  const {
    crop = [0, 0, 1, 1],
    tiltDeg = 0,
    enter = 1,
    enterScale = true,
    slideX = 0,
    slideY = 0,
    shake = { dx: 0, dy: 0 },
    breath = { by: 0, bt: 0 },
    dark = false,
    alpha = 1,
    borderColor = PALETTE.ink,
    doubleBorder = false,
    matColor = null,
    shadowColor = null,
    tape = true,
    tapeLayout = 'tl-br',
    tapeColors = [PALETTE.lime, PALETTE.pink],
    badge = null,
    badgePos = 'tr',
    register = true,
  } = opts

  const [cxN, cyN, cwN, chN] = crop
  const sw = cwN * image.width
  const sh = chN * image.height
  const height = (width * sh) / sw

  const scale = enterScale ? mix(0.92, 1, enter) : 1
  const drawW = width * scale
  const drawH = height * scale
  const cardCX = x + width / 2 + slideX + shake.dx
  const cardCY = y + height / 2 + slideY + shake.dy + breath.by
  const effTilt = tiltDeg + breath.bt
  const matPad = 6
  const totalW = drawW + matPad * 2
  const totalH = drawH + matPad * 2
  const shadowOffX = 10
  const shadowOffY = 12

  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.translate(cardCX, cardCY)
  ctx.rotate((effTilt * Math.PI) / 180)

  const resolvedShadow = shadowColor ?? (dark ? 'rgba(0, 0, 0, 0.72)' : 'rgba(18, 18, 18, 0.88)')
  ctx.fillStyle = resolvedShadow
  ctx.beginPath()
  ctx.roundRect(-totalW / 2 + shadowOffX, -totalH / 2 + shadowOffY, totalW, totalH, 16)
  ctx.fill()

  ctx.fillStyle = matColor ?? (dark ? '#181816' : PALETTE.cream)
  ctx.beginPath()
  ctx.roundRect(-totalW / 2, -totalH / 2, totalW, totalH, 15)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, 11)
  ctx.clip()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, cxN * image.width, cyN * image.height, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH)
  ctx.restore()

  ctx.strokeStyle = dark ? 'rgba(255, 254, 249, 0.16)' : 'rgba(18, 18, 18, 0.18)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, 11)
  ctx.stroke()

  if (doubleBorder) {
    ctx.strokeStyle = PALETTE.pink
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.roundRect(-totalW / 2 - 2, -totalH / 2 - 2, totalW + 4, totalH + 4, 17)
    ctx.stroke()

    ctx.strokeStyle = PALETTE.lime
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.roundRect(-totalW / 2, -totalH / 2, totalW, totalH, 15)
    ctx.stroke()
  } else {
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.roundRect(-totalW / 2, -totalH / 2, totalW, totalH, 15)
    ctx.stroke()
  }

  if (tape) {
    if (tapeLayout === 'tr-bl') {
      drawCornerTape(totalW / 2 - 26, -totalH / 2 + 2, 34, tapeColors[0], 78, 19)
      drawCornerTape(-totalW / 2 + 26, totalH / 2 - 2, 30, tapeColors[1], 78, 19)
    } else {
      drawCornerTape(-totalW / 2 + 26, -totalH / 2 + 2, -34, tapeColors[0], 78, 19)
      drawCornerTape(totalW / 2 - 26, totalH / 2 - 2, -30, tapeColors[1], 78, 19)
    }
  }

  if (badge) {
    ctx.font = `900 17px ${FONT_STACK}`
    const bw = ctx.measureText(badge).width + 24
    const bx = badgePos === 'tl' ? -totalW / 2 + bw / 2 + 16 : totalW / 2 - bw / 2 - 14
    const by = badgePos === 'br' ? totalH / 2 - 6 : -totalH / 2 + 6
    drawRotatedPill(bx, by, bw, 30, -2, PALETTE.ink, PALETTE.cream, PALETTE.lime, 3, 7)
    ctx.save()
    ctx.translate(bx, by)
    ctx.rotate((-2 * Math.PI) / 180)
    drawText(badge, 0, 6, { size: 16, weight: 900, color: PALETTE.lime, align: 'center', track: false })
    ctx.restore()
  }

  ctx.restore()

  const aabb = computeRotatedAABB(cardCX, cardCY, totalW, totalH, effTilt, 14, 16)
  const rect = {
    x: Number(aabb.x.toFixed(1)),
    y: Number(aabb.y.toFixed(1)),
    w: Number(aabb.w.toFixed(1)),
    h: Number(aabb.h.toFixed(1)),
    name: imageName,
    tiltDeg: effTilt,
  }
  if (register) {
    uiRects.push(rect)
    pushProtectedRect(rect.x, rect.y, rect.w, rect.h, 6)
  }
  return rect
}

// ---------------- Sticker Headline Component ----------------

function drawStickerHeadline(shot, p, dark, opts = {}) {
  const {
    x = 64,
    y = 122,
    maxW = 950,
    titleSize = 64,
    tiltDeg = -1.6,
    showPills = true,
    showSub = true,
    accentColor = dark ? PALETTE.pink : PALETTE.lime,
    secondaryAccent = dark ? PALETTE.lime : PALETTE.pink,
    splatBehind = false,
    staticMode = false,
    tapeGap = 22,
    subGap = 18,
    breath = { by: 0, bt: 0 },
  } = opts

  const enter = staticMode ? 1 : outBack(clamp01(p / 0.42), 1.25)
  const shiftX = staticMode ? 0 : (1 - outCubic(clamp01(p / 0.34))) * 28
  const baseX = x + shiftX
  const baseY = y + (staticMode ? 0 : breath.by * 0.65)
  const effTilt = tiltDeg + (staticMode ? 0 : breath.bt * 0.6)
  let curY = baseY

  if (splatBehind) {
    drawSplatBlob(ctx, baseX + Math.min(maxW, 440) * 0.48, baseY + 132, 108 * Math.min(1, enter), accentColor, shot.id * 41, {
      outlineColor: null,
      outlineWidth: 0,
      satellites: 6,
      highlight: true,
      alpha: 0.88,
    })
  }

  // 1. Tactical Tape Tag above headline (scales font down if maxW is narrow like Shot 09 left column)
  const tapeText = shot.tapeTag
  let tapeFontSize = 18
  while (tapeFontSize > 14 && measureTextWidth(tapeText, tapeFontSize, 900) + 36 > maxW) {
    tapeFontSize -= 1
  }
  const tapeW = Math.min(maxW, measureTextWidth(tapeText, tapeFontSize, 900) + 42)
  const tapeH = 36
  const tapeCX = baseX + tapeW / 2
  const tapeCY = curY + tapeH / 2
  const tapeTilt = effTilt - 1.2
  drawRotatedPill(tapeCX, tapeCY, tapeW, tapeH, tapeTilt, PALETTE.ink, dark ? PALETTE.lime : PALETTE.ink, secondaryAccent, 4, 6)
  ctx.save()
  ctx.translate(tapeCX, tapeCY)
  ctx.rotate((tapeTilt * Math.PI) / 180)
  drawText(tapeText, 0, Math.round(tapeFontSize * 0.34), { size: tapeFontSize, weight: 900, color: accentColor, align: 'center' })
  ctx.restore()
  curY += tapeH + tapeGap

  // 2. Multi-line Sticker Title with thick ink outline & hard comic shadow
  const lineH = Math.round(titleSize * 1.4)
  shot.stickerTitle.forEach((line, i) => {
    const lineEnter = staticMode ? 1 : outBack(clamp01((p - i * 0.07) / 0.38), 1.3)
    const lineTilt = effTilt + (i % 2 === 0 ? 0.4 : -0.6)
    const textW = measureTextWidth(line, titleSize, 900)
    const lineCX = baseX + textW / 2
    const lineCY = curY + titleSize * 0.54

    ctx.save()
    ctx.translate(lineCX, lineCY)
    ctx.rotate((lineTilt * Math.PI) / 180)
    const s = mix(0.84, 1, lineEnter)
    ctx.scale(s, s)

    const fillColor = i === 0 ? (dark ? PALETTE.lime : PALETTE.cream) : dark ? PALETTE.cream : PALETTE.lime
    drawText(line, 0, titleSize * 0.34, {
      size: titleSize,
      weight: 900,
      color: fillColor,
      align: 'center',
      strokeColor: PALETTE.ink,
      strokeWidth: Math.max(10, Math.round(titleSize * 0.16)),
      shadowColor: PALETTE.ink,
      shadowX: 5,
      shadowY: 6,
      pad: 4,
    })
    ctx.restore()
    curY += lineH
  })

  curY += 8

  // 3. Subtitle Sticker Pill
  if (showSub && shot.stickerSub) {
    let subSize = 21
    while (subSize > 16 && measureTextWidth(shot.stickerSub, subSize, 700) + 32 > maxW) {
      subSize -= 1
    }
    const subW = Math.min(maxW, measureTextWidth(shot.stickerSub, subSize, 700) + 34)
    const subH = 40
    const subCX = baseX + subW / 2
    const subCY = curY + subH / 2
    const subTilt = effTilt * 0.45 + 0.8
    drawRotatedPill(subCX, subCY, subW, subH, subTilt, dark ? PALETTE.cardDark : PALETTE.cream, PALETTE.ink, PALETTE.ink, 5, 9)
    ctx.save()
    ctx.translate(subCX, subCY)
    ctx.rotate((subTilt * Math.PI) / 180)
    drawText(shot.stickerSub, 0, Math.round(subSize * 0.36), {
      size: subSize,
      weight: 700,
      color: dark ? PALETTE.cream : PALETTE.ink,
      align: 'center',
    })
    ctx.restore()
    curY += subH + subGap
  }

  // 4. Feature Pills with black outline & hard shadow
  if (showPills && shot.featurePills?.length) {
    let px = baseX
    let py = curY
    const pillH = 40
    const gapX = 12
    const gapY = 12
    shot.featurePills.forEach((pill, i) => {
      const pw = measureTextWidth(pill, 20, 900) + 44
      if (px > baseX && px + pw > baseX + maxW) {
        px = baseX
        py += pillH + gapY
      }
      const pillEnter = staticMode ? 1 : outBack(clamp01((p - 0.18 - i * 0.08) / 0.34), 1.35)
      const pillTilt = i % 2 === 0 ? -1.3 : 1.2
      const pillFill = i % 3 === 0 ? PALETTE.lime : i % 3 === 1 ? PALETTE.pink : PALETTE.cream
      const pillText = i % 3 === 1 ? PALETTE.cream : PALETTE.ink
      const cx = px + pw / 2
      const cy = py + pillH / 2

      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(mix(0.8, 1, pillEnter), mix(0.8, 1, pillEnter))
      ctx.rotate((pillTilt * Math.PI) / 180)

      ctx.fillStyle = PALETTE.ink
      ctx.beginPath()
      ctx.roundRect(-pw / 2 + 4, -pillH / 2 + 5, pw, pillH, 20)
      ctx.fill()

      ctx.fillStyle = pillFill
      ctx.strokeStyle = PALETTE.ink
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.roundRect(-pw / 2, -pillH / 2, pw, pillH, 20)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = pillText
      ctx.beginPath()
      ctx.arc(-pw / 2 + 18, 0, 4.2, 0, Math.PI * 2)
      ctx.fill()

      drawText(pill, 7, 7, { size: 20, weight: 900, color: pillText, align: 'center' })
      ctx.restore()

      px += pw + gapX
    })
    curY = py + pillH
  }

  pushProtectedRect(baseX - 14, baseY - 14, maxW + 28, curY - baseY + 28, 6)
  return { bottomY: curY }
}

// ---------------- Top Chrome & Vertical Broadcast HUD ----------------

function drawTopChrome(shot, _p, _t, dark) {
  const badgeW = 310
  const badgeH = 50
  const badgeCX = 212
  const badgeCY = 62
  const badgeTilt = -1.4
  const badgeShadow = dark ? PALETTE.pink : PALETTE.lime

  drawRotatedPill(badgeCX, badgeCY, badgeW, badgeH, badgeTilt, PALETTE.ink, dark ? PALETTE.cream : PALETTE.ink, badgeShadow, 5, 11)
  ctx.save()
  ctx.translate(badgeCX, badgeCY)
  ctx.rotate((badgeTilt * Math.PI) / 180)
  drawSquidIcon(ctx, -badgeW / 2 + 28, 0, 32, -0.1, dark ? PALETTE.lime : PALETTE.pink, PALETTE.ink, PALETTE.cream)
  drawText('SPLAT-STREET', -badgeW / 2 + 54, 8, { size: 23, weight: 900, color: PALETTE.cream, align: 'left' })
  ctx.fillStyle = PALETTE.lime
  ctx.beginPath()
  ctx.roundRect(badgeW / 2 - 64, -15, 52, 30, 7)
  ctx.fill()
  drawText('DSH', badgeW / 2 - 38, 7, { size: 16, weight: 900, color: PALETTE.ink, align: 'center' })
  ctx.restore()
  pushProtectedRect(48, 30, 330, 66, 4)

  if (shot.id === 9) {
    const stageW = 318
    const stageH = 46
    const stageCX = 865
    const stageCY = 62
    const stageTilt = 1.2
    drawRotatedPill(stageCX, stageCY, stageW, stageH, stageTilt, PALETTE.ink, PALETTE.pink, PALETTE.lime, 4, 10)
    ctx.save()
    ctx.translate(stageCX, stageCY)
    ctx.rotate((stageTilt * Math.PI) / 180)
    drawText('09 / 09 · TURF RESULT', 0, 7, { size: 19, weight: 900, color: PALETTE.lime, align: 'center' })
    ctx.restore()
    pushProtectedRect(700, 30, 334, 64, 4)
  } else {
    const stageW = 304
    const stageH = 46
    const stageCX = 872
    const stageCY = 62
    const stageTilt = 1.2
    const modeLabel = dark ? 'NIGHT SHIFT' : 'DAY TURF'
    const modeColor = dark ? PALETTE.pink : PALETTE.lime
    drawRotatedPill(stageCX, stageCY, stageW, stageH, stageTilt, PALETTE.ink, dark ? PALETTE.pink : PALETTE.ink, modeColor, 4, 10)
    ctx.save()
    ctx.translate(stageCX, stageCY)
    ctx.rotate((stageTilt * Math.PI) / 180)
    drawText(`0${shot.id} / 09 · ${modeLabel}`, 0, 7, { size: 19, weight: 900, color: modeColor, align: 'center' })
    ctx.restore()
    pushProtectedRect(714, 30, 320, 64, 4)
  }
}

function drawBroadcastHUD(shot, p, t, dark) {
  if (shot.id === 9) return

  const bw = 968
  const bh = 58
  const cx = 540
  const cy = 1348
  const tilt = -0.6
  const isStatic = t >= STATIC_HOLD_START
  const enter = isStatic ? 1 : outCubic(clamp01(p / 0.28))

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((tilt * Math.PI) / 180)

  ctx.fillStyle = dark ? PALETTE.pink : PALETTE.lime
  ctx.beginPath()
  ctx.roundRect(-bw / 2 + 5, -bh / 2 + 6, bw, bh, 12)
  ctx.fill()

  ctx.fillStyle = dark ? '#181816' : PALETTE.ink
  ctx.beginPath()
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 12)
  ctx.fill()

  const leftW = 184
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 12)
  ctx.clip()

  ctx.fillStyle = dark ? PALETTE.pink : PALETTE.lime
  ctx.beginPath()
  ctx.moveTo(-bw / 2, -bh / 2)
  ctx.lineTo(-bw / 2 + leftW, -bh / 2)
  ctx.lineTo(-bw / 2 + leftW - 16, bh / 2)
  ctx.lineTo(-bw / 2, bh / 2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  drawSquidIcon(ctx, -bw / 2 + 30, 0, 32, -0.08, PALETTE.ink, PALETTE.cream, dark ? PALETTE.pink : PALETTE.lime)
  drawText(dark ? 'FEST LIVE' : 'INK NEWS', -bw / 2 + 56, 7, {
    size: 19,
    weight: 900,
    color: dark ? PALETTE.cream : PALETTE.ink,
    align: 'left',
  })

  ctx.strokeStyle = dark ? PALETTE.cream : PALETTE.ink
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 12)
  ctx.stroke()

  ctx.save()
  ctx.globalAlpha *= 0.45 + 0.55 * enter
  const textSlide = (1 - enter) * 12
  let capSize = 21
  const maxCapW = bw - leftW - 88
  while (capSize > 16 && measureTextWidth(shot.caption, capSize, 700) > maxCapW) {
    capSize -= 1
  }
  drawText(shot.caption, -bw / 2 + leftW + 18 + textSlide, 7, {
    size: capSize,
    weight: 700,
    color: PALETTE.cream,
    align: 'left',
  })
  ctx.restore()

  drawText('>>>', bw / 2 - 22, 8, {
    size: 20,
    weight: 900,
    color: dark ? PALETTE.lime : PALETTE.pink,
    align: 'right',
  })

  ctx.restore()

  const hudAABB = computeRotatedAABB(cx, cy, bw, bh, tilt, 10, 10)
  pushProtectedRect(hudAABB.x, hudAABB.y, hudAABB.w, hudAABB.h, 4)
}

// ---------------- Shot 04 Synchronized Appearance Controls ----------------

function getAppearancePresetIndex(u) {
  if (u < 0.34) return 0 // 纸白 20%
  if (u < 0.68) return 1 // 均衡 50%
  return 2 // 涂地 100%
}

function drawGearSlotsRow(x, y, u, shotId, shake = { dx: 0, dy: 0 }, breath = { by: 0, bt: 0 }) {
  const presets = [
    { name: '纸白', val: '20%', sub: '官方绿 JOY-CON', color: '#1edc00' },
    { name: '均衡', val: '50%', sub: '荧光绿 NEON', color: '#9ae528' },
    { name: '涂地', val: '100%', sub: '黄绿 LIME', color: '#d3f510' },
  ]
  const activeIdx = getAppearancePresetIndex(u)
  const slotW = 304
  const slotH = 114
  const gap = 20

  presets.forEach((slot, i) => {
    const sx = x + i * (slotW + gap) + shake.dx
    const isActive = i === activeIdx
    const localSlotP = i === 0 ? clamp01(u / 0.14) : i === 1 ? clamp01((u - 0.34) / 0.14) : clamp01((u - 0.68) / 0.14)
    const popY = isActive ? -11 * outBack(localSlotP, 1.5) : 0
    const tilt = (i === 0 ? -1.8 : i === 1 ? 1.2 : -1.2) + breath.bt * 0.5
    const cx = sx + slotW / 2
    const cy = y + slotH / 2 + popY + shake.dy + breath.by * 0.5

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((tilt * Math.PI) / 180)

    ctx.fillStyle = isActive ? slot.color : PALETTE.ink
    ctx.beginPath()
    ctx.roundRect(-slotW / 2 + 5, -slotH / 2 + 6, slotW, slotH, 15)
    ctx.fill()

    ctx.fillStyle = isActive ? PALETTE.ink : PALETTE.cream
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.roundRect(-slotW / 2, -slotH / 2, slotW, slotH, 15)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = slot.color
    ctx.beginPath()
    ctx.roundRect(-slotW / 2 + 12, -slotH / 2 + 10, slotW - 24, 28, 8)
    ctx.fill()
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 2.5
    ctx.stroke()

    drawText(slot.sub, 0, -slotH / 2 + 30, {
      size: 16,
      weight: 900,
      color: PALETTE.ink,
      align: 'center',
    })
    drawText(slot.name, -52, 24, {
      size: 32,
      weight: 900,
      color: isActive ? PALETTE.cream : PALETTE.ink,
      align: 'center',
    })
    drawText(slot.val, 58, 24, {
      size: 32,
      weight: 900,
      color: isActive ? slot.color : '#44483d',
      align: 'center',
    })

    if (isActive) {
      drawSplatBlob(ctx, slotW / 2 - 12, -slotH / 2 + 10, 13, slot.color, shotId * 13 + i, {
        outlineColor: PALETTE.ink,
        outlineWidth: 2.5,
        satellites: false,
      })
    }

    ctx.restore()
  })

  pushProtectedRect(x + shake.dx - 14, y + shake.dy - 22, slotW * 3 + gap * 2 + 28, slotH + 34, 6)
}

// ---------------- Shot-Specific Vector Stickers & Callouts ----------------

function drawArrowSticker(fromX, fromY, toX, toY, label, pulse, shake = { dx: 0, dy: 0 }) {
  ctx.save()
  const bounce = Math.sin(pulse * Math.PI * 2) * 5
  const fx = fromX + bounce * 0.6 + shake.dx
  const tx = toX + bounce * 0.5 + shake.dx
  const fy = fromY + shake.dy
  const ty = toY + shake.dy

  const pw = measureTextWidth(label, 19, 900) + 32
  const ph = 40
  const pillCX = fx
  const pillCY = fy - 42
  drawRotatedPill(pillCX, pillCY, pw, ph, -2.5, PALETTE.pink, PALETTE.ink, PALETTE.ink, 4, 10)
  ctx.save()
  ctx.translate(pillCX, pillCY)
  ctx.rotate((-2.5 * Math.PI) / 180)
  drawText(label, 0, 7, { size: 19, weight: 900, color: PALETTE.cream, align: 'center' })
  ctx.restore()

  const startX = pillCX - 4
  const startY = pillCY + ph / 2 + 8
  const ctrlX = pillCX + 14
  const ctrlY = ty + 2
  const angle = Math.atan2(ty - ctrlY, tx - ctrlX)
  const headLen = 17
  const spread = 0.68

  const traceArrow = () => {
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.quadraticCurveTo(ctrlX, ctrlY, tx, ty)
    ctx.moveTo(tx - Math.cos(angle - spread) * headLen, ty - Math.sin(angle - spread) * headLen)
    ctx.lineTo(tx, ty)
    ctx.lineTo(tx - Math.cos(angle + spread) * headLen, ty - Math.sin(angle + spread) * headLen)
  }

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = 11
  traceArrow()
  ctx.stroke()

  ctx.strokeStyle = PALETTE.lime
  ctx.lineWidth = 4.5
  traceArrow()
  ctx.stroke()
  ctx.restore()

  const minX = Math.min(pillCX - pw / 2, startX, tx) - 14
  const minY = Math.min(pillCY - ph / 2, startY, ty - 16) - 10
  const maxX = Math.max(pillCX + pw / 2, tx + 16) + 14
  const maxY = Math.max(pillCY + ph / 2, ty + 16) + 10
  pushProtectedRect(minX, minY, maxX - minX, maxY - minY, 6)
}

function drawNightSwatches(x, y, p, shake = { dx: 0, dy: 0 }, breath = { by: 0, bt: 0 }) {
  const swatches = [
    { hex: '#1B1B19', label: '炭黑底面', textColor: PALETTE.cream },
    { hex: '#44F028', label: '电光绿墨', textColor: PALETTE.ink },
    { hex: '#FF2D8A', label: '洋红撞色', textColor: PALETTE.cream },
  ]
  const w = 304
  const h = 108
  const gap = 20
  swatches.forEach((sw, i) => {
    const enter = outBack(clamp01((p - 0.14 - i * 0.1) / 0.35), 1.3)
    const cx = x + i * (w + gap) + w / 2 + shake.dx
    const cy = y + h / 2 + shake.dy + breath.by * 0.6
    const tilt = (i % 2 === 0 ? -1.6 : 1.4) + breath.bt * 0.6
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(mix(0.85, 1, enter), mix(0.85, 1, enter))
    ctx.rotate((tilt * Math.PI) / 180)

    ctx.fillStyle = PALETTE.ink
    ctx.beginPath()
    ctx.roundRect(-w / 2 + 5, -h / 2 + 6, w, h, 14)
    ctx.fill()

    ctx.fillStyle = sw.hex
    ctx.strokeStyle = PALETTE.cream
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.roundRect(-w / 2, -h / 2, w, h, 14)
    ctx.fill()
    ctx.stroke()

    drawText(sw.hex, 0, -4, { size: 24, weight: 900, color: sw.textColor, align: 'center' })
    drawText(sw.label, 0, 29, { size: 19, weight: 700, color: sw.textColor, align: 'center' })
    ctx.restore()
  })
  pushProtectedRect(x + shake.dx - 12, y + shake.dy - 14, w * 3 + gap * 2 + 24, h + 28, 6)
}

function drawBarcodeSticker(cx, cy, p, shake = { dx: 0, dy: 0 }, breath = { by: 0, bt: 0 }) {
  const enter = outBack(clamp01((p - 0.15) / 0.4), 1.35)
  const w = 324
  const h = 126
  const tilt = -3.4 + breath.bt
  const sx = cx + shake.dx
  const sy = cy + shake.dy + breath.by

  ctx.save()
  ctx.translate(sx, sy)
  ctx.scale(mix(0.85, 1, enter), mix(0.85, 1, enter))
  ctx.rotate((tilt * Math.PI) / 180)

  drawSplatBlob(ctx, -w * 0.3, -h * 0.36, 36, PALETTE.lime, 801, { outlineColor: PALETTE.ink, outlineWidth: 3.5, satellites: 3 })
  drawSplatBlob(ctx, w * 0.32, h * 0.32, 40, PALETTE.pink, 802, { outlineColor: PALETTE.ink, outlineWidth: 3.5, satellites: 3 })

  ctx.fillStyle = PALETTE.ink
  ctx.beginPath()
  ctx.roundRect(-w / 2 + 6, -h / 2 + 7, w, h, 10)
  ctx.fill()

  ctx.fillStyle = PALETTE.cream
  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, 10)
  ctx.fill()
  ctx.stroke()

  const widths = [5, 3, 8, 4, 6, 10, 3, 7, 4, 5, 3, 9, 4, 5, 7, 3, 6]
  let bx = -w / 2 + 24
  ctx.fillStyle = PALETTE.ink
  widths.forEach((bw, idx) => {
    ctx.fillRect(bx, -h / 2 + 16, bw, 56)
    bx += bw + (idx % 3 === 0 ? 6 : 4)
  })

  ctx.fillStyle = PALETTE.pink
  ctx.fillRect(-w / 2 + 22, 18, 76, 6)
  ctx.fillStyle = PALETTE.lime
  ctx.fillRect(-w / 2 + 106, 18, 52, 6)
  ctx.fillStyle = PALETTE.ink
  ctx.fillRect(-w / 2 + 166, 18, 134, 6)

  drawText('390PX // RESPONSIVE', -w / 2 + 22, 46, { size: 16, weight: 900, color: PALETTE.ink, align: 'left' })
  drawSquidIcon(ctx, w / 2 - 38, -h / 2 + 44, 48, -0.15, PALETTE.lime, PALETTE.ink, PALETTE.cream)
  ctx.restore()

  const aabb = computeRotatedAABB(sx, sy, w, h, tilt, 20, 20)
  pushProtectedRect(aabb.x, aabb.y, aabb.w, aabb.h, 6)
}

function drawFinaleNamecard(x, y, w, h, shake = { dx: 0, dy: 0 }) {
  const cx = x + w / 2 + shake.dx
  const cy = y + h / 2 + shake.dy
  const tilt = -1.2

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((tilt * Math.PI) / 180)

  ctx.fillStyle = PALETTE.ink
  ctx.beginPath()
  ctx.roundRect(-w / 2 + 7, -h / 2 + 8, w, h, 16)
  ctx.fill()

  ctx.fillStyle = PALETTE.cream
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, 16)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, 16)
  ctx.clip()
  drawHazardStripes(-w / 2, -h / 2, 24, h, PALETTE.lime, PALETTE.ink, 14)
  ctx.fillStyle = PALETTE.ink
  ctx.fillRect(-w / 2 + 24, -h / 2, 4, h)
  ctx.restore()

  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = 4.5
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, 16)
  ctx.stroke()

  drawCornerTape(-w / 2 + 46, -h / 2 + 2, -26, PALETTE.pink, 82, 19)

  const stX = w / 2 - 48
  const stY = h / 2 - 52
  ctx.save()
  ctx.translate(stX, stY)
  ctx.rotate(0.18)
  ctx.strokeStyle = PALETTE.pink
  ctx.lineWidth = 3
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.arc(0, 0, 30, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  drawSquidIcon(ctx, 0, 0, 40, -0.08, PALETTE.lime, PALETTE.ink, PALETTE.cream)
  ctx.restore()

  const textX = -w / 2 + 38
  drawText(REPO_URL, textX, -h / 2 + 46, { size: 18, weight: 900, color: PALETTE.ink, align: 'left' })

  ctx.fillStyle = PALETTE.ink
  ctx.beginPath()
  ctx.roundRect(textX, -h / 2 + 68, 352, 42, 9)
  ctx.fill()
  drawText('> pnpm add dsh-theme-splat-ui', textX + 14, -h / 2 + 95, {
    size: 17,
    weight: 900,
    color: PALETTE.lime,
    align: 'left',
  })

  drawText('昼夜双场一键切换 · DSH Theme', textX, -h / 2 + 146, {
    size: 18,
    weight: 700,
    color: '#44483d',
    align: 'left',
  })

  ctx.restore()
  const aabb = computeRotatedAABB(cx, cy, w, h, tilt, 16, 16)
  pushProtectedRect(aabb.x, aabb.y, aabb.w, aabb.h, 6)
}

/**
 * Draw Splatoon-2 style Turf War settlement result gauge for Shot 09 (`p` = shot.localTime).
 * `t >= 27.0s` renders 100% static endcard with zero time-varying terms.
 */
function drawTurfSettlementBar(p, t, shot, shake = { dx: 0, dy: 0 }) {
  const animP = t >= 27.0 ? 2.0 : p
  const barX = 60
  const barY = 1146
  const barW = 960
  const barH = 104
  const radius = barH / 2

  let leftFill = 0.5
  let rightFill = 0.5
  let clashWobbleX = 0
  let stampScale = 1
  let splashAlpha = 0

  if (animP < 0.38) {
    const surge = outCubic(animP / 0.38)
    leftFill = 0.5 * surge
    rightFill = 0.5 * surge
    stampScale = 0
  } else if (animP < 1.08) {
    const u = (animP - 0.38) / 0.7
    const swing = Math.sin(u * Math.PI * 3.5) * (1 - u) * 0.085
    leftFill = 0.5 + swing
    rightFill = 1 - leftFill
    clashWobbleX = Math.sin(u * Math.PI * 10) * (1 - u) * 4
    stampScale = 0
    splashAlpha = 1 - u * 0.35
  } else if (animP < 1.38) {
    const lockU = clamp01((animP - 1.08) / 0.3)
    leftFill = 0.5
    rightFill = 0.5
    stampScale = outBack(lockU, 1.55)
    splashAlpha = 1 - lockU
  }

  const leftPct = (leftFill * 100).toFixed(1)
  const rightPct = (rightFill * 100).toFixed(1)
  const countFactor = clamp01(animP / 1.08)
  const leftPts = `${Math.round(leftFill * 3000 * countFactor)}p`
  const rightPts = `${Math.round(rightFill * 3000 * countFactor)}p`

  const ox = shake.dx + clashWobbleX
  const oy = shake.dy

  // Team Header Row above gauge (Day Lime Squid vs Night Magenta Octo)
  const headY = barY - 46
  drawSquidIcon(ctx, barX + 34 + ox, headY, 46, -0.1, PALETTE.lime, PALETTE.ink, PALETTE.cream)
  drawRotatedPill(barX + 206 + ox, headY, 268, 40, -1.2, PALETTE.ink, PALETTE.ink, PALETTE.lime, 4, 10)
  ctx.save()
  ctx.translate(barX + 206 + ox, headY)
  ctx.rotate((-1.2 * Math.PI) / 180)
  drawText('明亮主题 · DAY TURF', 0, 7, { size: 19, weight: 900, color: PALETTE.lime, align: 'center' })
  ctx.restore()

  drawSquidIcon(ctx, barX + barW - 34 + ox, headY, 46, 0.1, PALETTE.pink, PALETTE.ink, PALETTE.cream, { species: 'octo' })
  drawRotatedPill(barX + barW - 212 + ox, headY, 280, 40, 1.2, PALETTE.ink, PALETTE.pink, PALETTE.ink, 4, 10)
  ctx.save()
  ctx.translate(barX + barW - 212 + ox, headY)
  ctx.rotate((1.2 * Math.PI) / 180)
  drawText('黑暗主题 · NIGHT SHIFT', 0, 7, { size: 19, weight: 900, color: PALETTE.pink, align: 'center' })
  ctx.restore()

  const bx = barX + ox
  const by = barY + oy
  ctx.save()

  ctx.fillStyle = PALETTE.ink
  ctx.beginPath()
  ctx.roundRect(bx + 7, by + 9, barW, barH, radius)
  ctx.fill()

  ctx.fillStyle = '#181816'
  ctx.beginPath()
  ctx.roundRect(bx, by, barW, barH, radius)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(bx, by, barW, barH, radius)
  ctx.clip()

  const leftPx = barW * leftFill
  const rightPx = barW * rightFill
  const slant = 20

  if (leftPx > 2) {
    const limeGrad = ctx.createLinearGradient(bx, by, bx, by + barH)
    limeGrad.addColorStop(0, '#6ef757')
    limeGrad.addColorStop(0.55, PALETTE.lime)
    limeGrad.addColorStop(1, '#129c00')
    ctx.fillStyle = limeGrad
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(bx + leftPx + slant * 0.5, by)
    ctx.lineTo(bx + leftPx - slant * 0.5, by + barH)
    ctx.lineTo(bx, by + barH)
    ctx.closePath()
    ctx.fill()
  }

  if (rightPx > 2) {
    const pinkGrad = ctx.createLinearGradient(bx, by, bx, by + barH)
    pinkGrad.addColorStop(0, '#ff64af')
    pinkGrad.addColorStop(0.52, PALETTE.pink)
    pinkGrad.addColorStop(1, '#9d004f')
    ctx.fillStyle = pinkGrad
    const rightStart = bx + barW - rightPx
    ctx.beginPath()
    ctx.moveTo(rightStart + slant * 0.5, by)
    ctx.lineTo(bx + barW, by)
    ctx.lineTo(bx + barW, by + barH)
    ctx.lineTo(rightStart - slant * 0.5, by + barH)
    ctx.closePath()
    ctx.fill()
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)'
  for (let sx = bx - barH; sx < bx + barW + barH; sx += 56) {
    ctx.beginPath()
    ctx.moveTo(sx, by + barH)
    ctx.lineTo(sx + 18, by + barH)
    ctx.lineTo(sx + 18 + barH * 0.45, by)
    ctx.lineTo(sx + barH * 0.45, by)
    ctx.closePath()
    ctx.fill()
  }

  const glossGrad = ctx.createLinearGradient(bx, by, bx, by + barH * 0.56)
  glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.48)')
  glossGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.1)')
  glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = glossGrad
  ctx.fillRect(bx + 12, by + 5, barW - 24, barH * 0.52)

  if (animP >= 0.38) {
    const seamTopX = bx + leftPx + slant * 0.5
    const seamBotX = bx + leftPx - slant * 0.5
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(seamTopX, by)
    ctx.lineTo(seamBotX, by + barH)
    ctx.stroke()
  }

  ctx.restore()

  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.roundRect(bx, by, barW, barH, radius)
  ctx.stroke()

  if (splashAlpha > 0) {
    const hitX = bx + leftPx
    ctx.save()
    ctx.globalAlpha = splashAlpha
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + animP * 7
      const dist = 22 + ((i * 19) % 24)
      drawSplatBlob(ctx, hitX + Math.cos(a) * dist, by + barH / 2 + Math.sin(a) * dist * 0.8, 11, i % 2 === 0 ? PALETTE.lime : PALETTE.pink, 910 + i, {
        outlineColor: PALETTE.ink,
        outlineWidth: 2.5,
        satellites: false,
      })
    }
    ctx.restore()
  }

  drawText(`${leftPct}%`, bx + 32, by + 68, {
    size: 46,
    weight: 900,
    color: PALETTE.ink,
    strokeColor: PALETTE.paper,
    strokeWidth: 7,
    align: 'left',
  })
  drawText(leftPts, bx + 206, by + 64, {
    size: 24,
    weight: 900,
    color: PALETTE.ink,
    strokeColor: PALETTE.lime,
    strokeWidth: 4,
    align: 'left',
  })

  drawText(`${rightPct}%`, bx + barW - 32, by + 68, {
    size: 46,
    weight: 900,
    color: PALETTE.cream,
    strokeColor: PALETTE.ink,
    strokeWidth: 8,
    shadowColor: 'rgba(18, 18, 18, 0.45)',
    shadowX: 3,
    shadowY: 4,
    align: 'right',
  })
  drawText(rightPts, bx + barW - 206, by + 64, {
    size: 24,
    weight: 900,
    color: PALETTE.cream,
    strokeColor: PALETTE.ink,
    strokeWidth: 5,
    align: 'right',
  })

  if (stampScale > 0.02) {
    const midX = bx + barW / 2
    const midY = by + barH / 2
    ctx.save()
    ctx.translate(midX, midY)
    ctx.scale(stampScale, stampScale)
    ctx.rotate(-0.04)

    const sw = 188
    const sh = 62
    ctx.fillStyle = PALETTE.lime
    ctx.beginPath()
    ctx.roundRect(-sw / 2 + 5, -sh / 2 + 6, sw, sh, 13)
    ctx.fill()

    ctx.fillStyle = PALETTE.ink
    ctx.strokeStyle = PALETTE.cream
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.roundRect(-sw / 2, -sh / 2, sw, sh, 13)
    ctx.fill()
    ctx.stroke()

    drawText('50 : 50', 0, -4, { size: 21, weight: 900, color: PALETTE.lime, align: 'center', track: false })
    drawText('双场皆主场', 0, 20, { size: 17, weight: 900, color: PALETTE.cream, align: 'center', track: false })
    ctx.restore()
  }

  ctx.restore()

  // Bottom broadcast verdict ticker pill below the gauge
  const capSize = 20
  const capW = Math.min(920, measureTextWidth(shot.caption, capSize, 800) + 88)
  const capH = 44
  const capCX = W / 2 + ox
  const capCY = 1322
  drawRotatedPill(capCX, capCY, capW, capH, -0.5, PALETTE.ink, PALETTE.cream, PALETTE.pink, 4, 22)
  ctx.save()
  ctx.translate(capCX, capCY)
  ctx.rotate((-0.5 * Math.PI) / 180)
  drawText(shot.caption, 0, 7, { size: capSize, weight: 800, color: PALETTE.cream, align: 'center' })
  ctx.restore()

  pushProtectedRect(bx - 12, headY - 30, barW + 24, barH + 152, 6)
}

// ---------------- 9 Individual Vertical 3:4 Shot Compositions ----------------

function renderShotScene(shot, t, shake, includeHUD) {
  const p = shot.localTime
  const n = shot.index
  const breath = getBreath(t, shot.id * 1.3)
  let dark = shot.effectiveMode === 'dark'

  if (shot.id === 1) {
    // Shot 01 (0.0 - 2.40s): Inkopolis Square atmosphere + top sticker headline + dual splat + tilted hero-light + repo pill
    drawStageBackground(false, t, n, shake)

    ctx.save()
    ctx.translate(shake.dx, shake.dy)
    ctx.globalAlpha = 0.85 * outCubic(clamp01(p / 0.55))
    const bgW = 1320
    const bgH = (bgW * inkopolisLightBackdrop.height) / inkopolisLightBackdrop.width
    ctx.drawImage(inkopolisLightBackdrop, -120, 440, bgW, bgH)
    ctx.restore()

    drawStickerHeadline(shot, p, false, {
      x: 64,
      y: 128,
      maxW: 950,
      titleSize: 96,
      tiltDeg: -2.0,
      splatBehind: true,
      breath,
    })

    const impact1 = outBack(clamp01(p / 0.45), 1.4)
    const impact2 = outBack(clamp01((p - 0.14) / 0.45), 1.4)
    drawSplatBlob(ctx, 130 + shake.dx, 560 + shake.dy, 102 * impact1, PALETTE.lime, 101, {
      outlineColor: PALETTE.ink,
      outlineWidth: 5,
      satellites: 6,
    })
    drawSplatBlob(ctx, 945 + shake.dx, 955 + shake.dy, 114 * impact2, PALETTE.pink, 102, {
      outlineColor: PALETTE.ink,
      outlineWidth: 5,
      satellites: 6,
    })

    const cardEnter = outBack(clamp01((p - 0.06) / 0.52), 1.25)
    drawTiltedCard('hero-light', 68, 535, 944, {
      tiltDeg: -2.0,
      enter: cardEnter,
      slideY: (1 - outCubic(clamp01(p / 0.45))) * 80,
      shake,
      breath,
      dark: false,
      tapeColors: [PALETTE.pink, PALETTE.lime],
      badge: 'INKOPOLIS HERO',
    })

    const repoEnter = outBack(clamp01((p - 0.22) / 0.42), 1.25)
    ctx.save()
    ctx.translate(540 + shake.dx, 1110 + shake.dy + breath.by * 0.5)
    ctx.scale(mix(0.86, 1, repoEnter), mix(0.86, 1, repoEnter))
    drawRotatedPill(0, 0, 620, 50, -0.8, PALETTE.cream, PALETTE.ink, PALETTE.ink, 5, 12)
    ctx.rotate((-0.8 * Math.PI) / 180)
    drawText(REPO_URL, 0, 8, { size: 22, weight: 900, color: PALETTE.ink, align: 'center' })
    ctx.restore()
    pushProtectedRect(220, 1076, 640, 72, 6)
  } else if (shot.id === 2) {
    // Shot 02 (2.40 - 5.95s): Top headline + full-width workspace-light (-1.6 deg) zooming smoothly into hero & composer
    drawStageBackground(false, t, n, shake)

    drawStickerHeadline(shot, p, false, {
      x: 64,
      y: 122,
      maxW: 950,
      titleSize: 64,
      tiltDeg: -1.6,
      splatBehind: true,
      breath,
    })

    const enter = outBack(clamp01(p / 0.48), 1.15)
    const zoom = inOutCubic(clamp01((p - 1.2) / 1.7))
    const crop = [mix(0, 0.24, zoom), mix(0, 0.17, zoom), mix(1, 0.7, zoom), mix(1, 0.7, zoom)]

    drawTiltedCard('workspace-light', 68, 510, 944, {
      crop,
      tiltDeg: -1.6,
      enter,
      slideY: (1 - outCubic(clamp01(p / 0.42))) * 70,
      shake,
      breath,
      dark: false,
      tapeColors: [PALETTE.lime, PALETTE.pink],
      badge: zoom > 0.35 ? 'ZOOM IN // HERO' : 'DAY WORKSPACE',
    })
  } else if (shot.id === 3) {
    // Shot 03 (5.95 - 9.18s): Top headline + upper-right input-menu-light + arrow callout + lower-left composer-light
    drawStageBackground(false, t, n, shake)

    drawStickerHeadline(shot, p, false, {
      x: 64,
      y: 120,
      maxW: 950,
      titleSize: 62,
      tiltDeg: -1.6,
      tapeGap: 18,
      subGap: 14,
      splatBehind: false,
      breath,
    })

    const menuEnter = outBack(clamp01(p / 0.46), 1.2)
    const compEnter = outBack(clamp01((p - 0.12) / 0.46), 1.2)

    drawTiltedCard('input-menu-light', 260, 514, 748, {
      crop: [0.333, 0.234, 0.378, 0.362],
      tiltDeg: 1.8,
      enter: menuEnter,
      slideX: (1 - outCubic(clamp01(p / 0.42))) * 70,
      shake,
      breath,
      dark: false,
      tapeColors: [PALETTE.pink, PALETTE.lime],
      tapeLayout: 'tr-bl',
      badge: 'SLASH MENU',
    })

    drawTiltedCard('composer-light', 64, 1058, 860, {
      tiltDeg: -1.5,
      enter: compEnter,
      slideY: (1 - outCubic(clamp01((p - 0.1) / 0.42))) * 55,
      shake,
      breath: getBreath(t, 4.1),
      dark: false,
      tapeColors: [PALETTE.pink, PALETTE.lime],
      badge: 'COMPOSER SHELL',
    })

    drawArrowSticker(148, 560, 268, 578, '官方绿高亮', p * 1.4, shake)
  } else if (shot.id === 4) {
    // Shot 04 (9.18 - 12.90s): Top headline + middle 3-preset gear slots + synced live appearance-panel-light controls below
    drawStageBackground(false, t, n, shake)

    const u = clamp01(p / Math.max(0.1, shot.duration))
    const presetIdx = getAppearancePresetIndex(u)
    const enter = outBack(clamp01(p / 0.48), 1.2)

    drawStickerHeadline(shot, p, false, {
      x: 64,
      y: 114,
      maxW: 950,
      titleSize: 56,
      tiltDeg: -1.6,
      tapeGap: 18,
      subGap: 14,
      splatBehind: true,
      breath,
    })

    drawGearSlotsRow(64, 456, u, shot.id, shake, breath)

    const presetImage = presetIdx === 0 ? 'appearance-panel-light-paper' : presetIdx === 2 ? 'appearance-panel-light-turf' : 'appearance-panel-light-balanced'
    drawTiltedCard(presetImage, 150, 592, 780, {
      crop: [0.235, 0.25, 0.72, 0.715],
      tiltDeg: -1.3,
      enter,
      slideY: (1 - outCubic(clamp01(p / 0.42))) * 65,
      shake,
      breath,
      dark: false,
      tapeColors: [PALETTE.lime, PALETTE.pink],
      badge: 'APPEARANCE TUNING',
    })
  } else if (shot.id === 5) {
    // Shot 05 (12.90 - 14.45s): Midnight Splatfest hero poster + glowing squids & octos
    dark = true
    drawStageBackground(true, t, n, shake)

    const enter = outBack(clamp01(p / 0.42), 1.32)

    drawStickerHeadline(shot, p, true, {
      x: 64,
      y: 132,
      maxW: 950,
      titleSize: 96,
      tiltDeg: -2.4,
      splatBehind: true,
      breath,
    })

    const glowGrad = ctx.createRadialGradient(540 + shake.dx, 780 + shake.dy, 40, 540 + shake.dx, 780 + shake.dy, 480)
    glowGrad.addColorStop(0, 'rgba(255, 45, 138, 0.24)')
    glowGrad.addColorStop(0.55, 'rgba(68, 240, 40, 0.14)')
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = glowGrad
    ctx.fillRect(20, 420, 1040, 760)

    drawSplatBlob(ctx, 115 + shake.dx, 560 + shake.dy, 96 * enter, PALETTE.pink, 511, {
      outlineColor: PALETTE.ink,
      outlineWidth: 5,
      satellites: 6,
    })
    drawSplatBlob(ctx, 965 + shake.dx, 995 + shake.dy, 106 * enter, PALETTE.lime, 512, {
      outlineColor: PALETTE.ink,
      outlineWidth: 5,
      satellites: 6,
    })

    drawTiltedCard('hero-dark', 68, 545, 944, {
      tiltDeg: -2.2,
      enter,
      slideY: (1 - outCubic(clamp01(p / 0.36))) * 75,
      shake,
      breath,
      dark: true,
      doubleBorder: true,
      shadowColor: PALETTE.pink,
      tapeColors: [PALETTE.lime, PALETTE.pink],
      badge: 'SPLATFEST NIGHT',
    })

    ctx.save()
    ctx.translate(shake.dx, shake.dy + breath.by)
    ctx.shadowColor = PALETTE.lime
    ctx.shadowBlur = 18
    drawSquidIcon(ctx, 972, 625, 70, 0.24, PALETTE.lime, PALETTE.ink, PALETTE.cream)
    ctx.shadowColor = PALETTE.pink
    drawSquidIcon(ctx, 110, 1015, 66, -0.28, PALETTE.pink, PALETTE.ink, PALETTE.cream, { species: 'octo' })
    ctx.restore()
  } else if (shot.id === 6) {
    // Shot 06 (14.45 - 17.75s): Top headline (no duplicate pills) + workspace-dark center + 3 swatches below
    drawStageBackground(true, t, n, shake)

    drawStickerHeadline(shot, p, true, {
      x: 64,
      y: 122,
      maxW: 950,
      titleSize: 64,
      tiltDeg: 1.5,
      showPills: false,
      splatBehind: true,
      breath,
    })

    const enter = outBack(clamp01(p / 0.48), 1.2)
    drawTiltedCard('workspace-dark', 68, 438, 944, {
      tiltDeg: 1.5,
      enter,
      slideY: (1 - outCubic(clamp01(p / 0.4))) * 65,
      shake,
      breath,
      dark: true,
      borderColor: PALETTE.pink,
      tapeColors: [PALETTE.lime, PALETTE.pink],
      badge: 'NIGHT WORKSPACE',
    })

    drawNightSwatches(64, 1132, p, shake, breath)
  } else if (shot.id === 7) {
    // Shot 07 (17.75 - 22.45s): Tactical swap! Code island -> Inkbrush slash (y∈[455,1300]) -> Tool card
    drawStageBackground(true, t, n, shake)

    drawStickerHeadline(shot, p, true, {
      x: 64,
      y: 120,
      maxW: 950,
      titleSize: 64,
      tiltDeg: -1.5,
      splatBehind: true,
      breath,
    })

    if (!shot.afterCut) {
      const codeEnter = outBack(clamp01(p / 0.45), 1.2)
      drawTiltedCard('tool-card-dark', 116, 735, 868, {
        tiltDeg: 2.6,
        enter: codeEnter,
        alpha: 0.78,
        shake,
        breath: getBreath(t, 7.7),
        dark: true,
        borderColor: PALETTE.pink,
        tape: false,
        register: true,
      })
      drawTiltedCard('code-dark', 68, 500, 944, {
        crop: [0, 0, 0.62, 1],
        tiltDeg: -1.4,
        enter: codeEnter,
        slideY: (1 - outCubic(clamp01(p / 0.4))) * 60,
        shake,
        breath,
        dark: true,
        borderColor: PALETTE.lime,
        tapeColors: [PALETTE.lime, PALETTE.pink],
        badge: 'SHIKI CODE ISLAND',
      })
    } else {
      const swapP = shot.phaseTime
      const toolEnter = outBack(clamp01(swapP / 0.42), 1.4)
      drawTiltedCard('code-dark', 100, 490, 880, {
        crop: [0, 0, 0.62, 1],
        tiltDeg: -2.6,
        enter: 1,
        alpha: 0.72,
        shake,
        breath: getBreath(t, 7.7),
        dark: true,
        borderColor: '#525860',
        tape: false,
        register: true,
      })
      drawTiltedCard('tool-card-dark', 64, 680, 952, {
        tiltDeg: 1.4,
        enter: toolEnter,
        slideY: (1 - outCubic(clamp01(swapP / 0.35))) * 45,
        shake,
        breath,
        dark: true,
        borderColor: PALETTE.pink,
        tapeLayout: 'tr-bl',
        tapeColors: [PALETTE.pink, PALETTE.lime],
        badge: 'TOOL OUTPUT CARD',
        badgePos: 'br',
      })
    }
  } else if (shot.id === 8) {
    // Shot 08 (22.45 - 25.48s): Asymmetric mobile 390px squad! Top-left headline, top-right 390PX + barcode, bottom-left phone + bottom-right pills
    drawStageBackground(true, t, n, shake)

    drawStickerHeadline(shot, p, true, {
      x: 64,
      y: 122,
      maxW: 560,
      titleSize: 58,
      tiltDeg: -1.6,
      showPills: false,
      splatBehind: false,
      breath,
    })

    const enter = outBack(clamp01(p / 0.34), 1.18)

    ctx.save()
    ctx.translate(840 + shake.dx, 212 + breath.by * 0.6)
    ctx.rotate(((-2.4 + breath.bt * 0.5) * Math.PI) / 180)
    const numScale = mix(0.86, 1, enter)
    ctx.scale(numScale, numScale)
    drawText('390PX', 0, 34, {
      size: 102,
      weight: 900,
      color: PALETTE.lime,
      align: 'center',
      strokeColor: PALETTE.ink,
      strokeWidth: 16,
      shadowColor: PALETTE.pink,
      shadowX: 7,
      shadowY: 7,
      pad: 4,
    })
    ctx.restore()
    pushProtectedRect(650, 130, 380, 145, 6)

    drawBarcodeSticker(835, 365, p, shake, breath)

    drawTiltedCard('input-menu-mobile-dark', 76, 472, 368, {
      tiltDeg: 0.8,
      enter,
      slideY: (1 - outCubic(clamp01(p / 0.3))) * 24,
      shake,
      breath,
      dark: true,
      borderColor: PALETTE.lime,
      tapeColors: [PALETTE.pink, PALETTE.lime],
      badge: '390PX REAL',
    })

    const rightPills = [...shot.featurePills, '双边不裁切', '菜单输入全保留']
    rightPills.forEach((pill, i) => {
      const pillEnter = outBack(clamp01((p - 0.14 - i * 0.09) / 0.36), 1.35)
      const pw = measureTextWidth(pill, 24, 900) + 56
      const ph = 54
      const cx = 760 + (i % 2 === 0 ? -18 : 18) + shake.dx
      const cy = 620 + i * 116 + shake.dy + breath.by * 0.6
      const tilt = (i % 2 === 0 ? 1.8 : -2.0) + breath.bt * 0.7
      const fill = i % 2 === 0 ? PALETTE.lime : PALETTE.pink
      const fg = i % 2 === 0 ? PALETTE.ink : PALETTE.cream

      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(mix(0.84, 1, pillEnter), mix(0.84, 1, pillEnter))
      ctx.rotate((tilt * Math.PI) / 180)

      ctx.fillStyle = PALETTE.ink
      ctx.beginPath()
      ctx.roundRect(-pw / 2 + 5, -ph / 2 + 6, pw, ph, 27)
      ctx.fill()

      ctx.fillStyle = fill
      ctx.strokeStyle = PALETTE.ink
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 27)
      ctx.fill()
      ctx.stroke()

      drawText(pill, 0, 8, { size: 24, weight: 900, color: fg, align: 'center' })
      ctx.restore()
      pushProtectedRect(cx - pw / 2 - 12, cy - ph / 2 - 12, pw + 28, ph + 28, 4)
    })
  } else {
    // Shot 09 (25.48 - 30.00s): Vertical Split Day-vs-Night Arena + Namecard + VS Clasp + Settlement Gauge (100% STATIC after 27.0s)
    dark = false
    drawSplitTurfArena(t, n, shake)

    const settleP = clamp01(p / 1.35)
    const cardEnter = outCubic(settleP)
    const lightDX = -(1 - cardEnter) * 56
    const darkDX = (1 - cardEnter) * 56

    drawStickerHeadline(shot, settleP * 2, false, {
      x: 64,
      y: 114,
      maxW: 416,
      titleSize: 96,
      tiltDeg: -2.2,
      showPills: false,
      showSub: false,
      splatBehind: true,
      staticMode: true,
    })

    const subCX = 238
    const subCY = 330
    drawRotatedPill(subCX, subCY, 348, 50, -1.4, PALETTE.ink, PALETTE.ink, PALETTE.pink, 5, 11)
    ctx.save()
    ctx.translate(subCX, subCY)
    ctx.rotate((-1.4 * Math.PI) / 180)
    drawText('SPLAT-STREET', 0, 12, { size: 36, weight: 900, color: PALETTE.lime, align: 'center' })
    ctx.restore()
    pushProtectedRect(60, 298, 360, 66, 6)

    drawFinaleNamecard(504, 152, 512, 182, shake)

    drawTiltedCard('workspace-light', 56 + lightDX, 440, 496, {
      tiltDeg: -2.4,
      enter: 1,
      enterScale: false,
      shake,
      breath,
      dark: false,
      borderColor: PALETTE.ink,
      tapeColors: [PALETTE.lime, PALETTE.pink],
      badge: 'DAY TURF',
    })

    drawTiltedCard('workspace-dark', 528 + darkDX, 610, 496, {
      tiltDeg: 2.2,
      enter: 1,
      enterScale: false,
      shake,
      breath: getBreath(t, 9.7),
      dark: true,
      borderColor: PALETTE.pink,
      doubleBorder: true,
      shadowColor: PALETTE.pink,
      tapeColors: [PALETTE.pink, PALETTE.lime],
      badge: 'NIGHT SHIFT',
    })

    const vsCX = 540 + shake.dx
    const vsCY = 665 + shake.dy + breath.by * 0.6
    const vsScale = t >= 27.0 ? 1 : outBack(clamp01((p - 0.12) / 0.45), 1.45)
    ctx.save()
    ctx.translate(vsCX, vsCY)
    ctx.scale(vsScale, vsScale)
    ctx.rotate((-7 * Math.PI) / 180)
    ctx.beginPath()
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8
      const r = i % 2 === 0 ? 64 : 40
      const px = Math.cos(a) * r
      const py = Math.sin(a) * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fillStyle = PALETTE.lime
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 6
    ctx.lineJoin = 'round'
    ctx.fill()
    ctx.stroke()

    drawText('VS', 0, 17, {
      size: 48,
      weight: 900,
      color: PALETTE.pink,
      align: 'center',
      strokeColor: PALETTE.ink,
      strokeWidth: 10,
      shadowColor: PALETTE.paper,
      shadowX: 3,
      shadowY: 3,
    })
    ctx.restore()
    pushProtectedRect(vsCX - 68, vsCY - 68, 136, 136, 4)

    drawTurfSettlementBar(p, t, shot, shake)
  }

  if (includeHUD) {
    drawTopChrome(shot, shot.localTime, t, dark)
    drawBroadcastHUD(shot, shot.localTime, t, dark)
  }
  return dark
}

// ---------------- Main Deterministic Render Entry ----------------

window.renderAt = async (time) => {
  const rawT = Number.isFinite(time) ? time : 0
  const t = Math.max(0, Math.min(DURATION - 1e-5, rawT))
  const activeShot = getShotAt(t)
  const activeTransition = getActiveTransition(t)
  const shake = getTransitionShake(activeTransition, activeTransition?.progress ?? 0, t)
  const transitionDrawsOverHUD = Boolean(activeTransition?.hasFullCover || activeTransition?.hasClipReveal)

  canvas.width = Math.round(canvas.clientWidth * devicePixelRatio) || Math.round(W * devicePixelRatio)
  canvas.height = Math.round(canvas.clientHeight * devicePixelRatio) || Math.round(H * devicePixelRatio)
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0)

  protectedRects = []
  uiRects = []
  textBoxes = []

  let dark = activeShot.effectiveMode === 'dark'

  if (activeTransition?.hasClipReveal) {
    const fromShot = getShotById(activeTransition.fromShot, t) ?? activeShot
    const toShot = getShotById(activeTransition.toShot, t) ?? activeShot

    dark = renderShotScene(fromShot, t, shake, true)

    ctx.save()
    const reveal = applyTransitionClip(ctx, activeTransition, activeTransition.progress, W, H)
    if (reveal) {
      dark = renderShotScene(toShot, t, shake, true)
    }
    ctx.restore()
  } else {
    dark = renderShotScene(activeShot, t, shake, transitionDrawsOverHUD && !activeTransition?.cardAreaOnly)
  }

  let particles = { drawn: 0, rejected: 0, overlaps: 0, layers: 3 }
  if (t < 27.0) {
    particles = drawAmbientSplats(ctx, t, activeShot.localTime, W, H, protectedRects, dark)
  }

  let transitionDiag = { active: false, type: null, fullCover: false, clipReveal: false }
  if (activeTransition) {
    if (activeTransition.id === '07-swap') {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 455, W, 845)
      ctx.clip()
      ctx.translate(0, 455)
      const innerDiag = renderTransition(ctx, { ...activeTransition, cardAreaOnly: false }, activeTransition.progress, W, 845)
      ctx.restore()
      transitionDiag = { ...innerDiag, cardAreaOnly: true, clipReveal: false }
    } else {
      transitionDiag = renderTransition(ctx, activeTransition, activeTransition.progress, W, H)
    }
  }

  if (!transitionDrawsOverHUD || activeTransition?.cardAreaOnly) {
    drawTopChrome(activeShot, activeShot.localTime, t, dark)
    drawBroadcastHUD(activeShot, activeShot.localTime, t, dark)
  }

  lastDiagnostics = {
    time: t,
    shot: activeShot.id,
    layoutPreset: activeShot.layoutPreset,
    cardTiltDeg: activeShot.cardTiltDeg,
    transition: transitionDiag,
    uiRects,
    textBoxes,
    particles,
    safeArea: SAFE_AREA,
  }
  return lastDiagnostics
}

window.getPromoDiagnostics = () => lastDiagnostics

await window.renderAt(0)
window.__PROMO_READY__ = true

if (!capture) {
  const seek = document.querySelector('#seek')
  const label = document.querySelector('#time')
  let playing = false
  let origin = 0
  document.querySelector('#play').onclick = () => {
    playing = !playing
    origin = performance.now() - Number(seek.value) * 1000
  }
  seek.oninput = async () => {
    playing = false
    const t = Number(seek.value)
    label.value = `${t.toFixed(2)} / 30`
    await window.renderAt(t)
  }
  const tick = async (now) => {
    if (playing) {
      const t = ((now - origin) / 1000) % 30
      seek.value = t
      label.value = `${t.toFixed(2)} / 30`
      await window.renderAt(t)
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
