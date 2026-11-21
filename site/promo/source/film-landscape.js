// Logical stage is 1920x1080; capture samples its 1280x720 presentation at DSF=2.
import { DURATION, getActiveTransition, getShotAt, getShotById, PALETTE, REPO_URL, SAFE_AREA, STATIC_HOLD_START } from './landscape-copy.js'
import { applyTransitionClip, drawAmbientSplats, drawSplatBlob, drawSquidIcon, getTransitionShake, renderTransition } from './landscape-transitions.js'

const W = 1920
const H = 1080
const FONT_STACK = '"Nunito", "Microsoft YaHei", "PingFang SC", sans-serif'

const canvas = document.querySelector('#stage')
const ctx = canvas.getContext('2d', { alpha: false })
const capture = new URLSearchParams(location.search).has('capture')
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

/** Gentle steady-state breathing micro-parallax, smoothly attenuated to 0 before 27.0s. */
function getBreath(t, seed = 0) {
  if (t >= 27.0) return { by: 0, bt: 0 }
  const env = t > 26.2 ? 1 - inOutCubic((t - 26.2) / 0.8) : 1
  return {
    by: Math.sin(t * 2.1 + seed) * 2.4 * env,
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
  return createPatternTile(360, (tctx) => {
    tctx.fillStyle = color
    const step = 18
    for (let y = step * 0.5; y < 360; y += step) {
      for (let x = step * 0.5; x < 360; x += step) {
        const dist = Math.hypot(x, y) / 340
        const strength = Math.max(0, 1 - dist)
        if (strength <= 0.08) continue
        tctx.globalAlpha = alpha * strength
        tctx.beginPath()
        tctx.arc(x, y, 2.2 + strength * 4.4, 0, Math.PI * 2)
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
  off.width = 1600
  off.height = Math.round((1600 * src.height) / src.width)
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
      d[i + 3] = Math.round(inkMask * vx * vy * 48)
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

function drawCornerTape(x, y, angleDeg, color = PALETTE.lime, w = 88, h = 22) {
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

// ---------------- Stage Background (Day & Night) ----------------

export function drawStageBackground(dark, _t, shotIndex = 0, shake = { dx: 0, dy: 0 }) {
  ctx.save()
  ctx.translate(shake.dx, shake.dy)
  if (!dark) {
    // 1. Cream turf base + subtle squid wallpaper (oversized 24px margin to prevent shake gaps)
    ctx.fillStyle = PALETTE.dayBandCream
    ctx.fillRect(-24, -24, W + 48, H + 48)
    ctx.fillStyle = PATTERNS.squidDayCream
    ctx.fillRect(-24, -24, W + 48, H + 48)

    // 2. Upper-left diagonal lime band
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-24, -24)
    ctx.lineTo(W + 24, -24)
    ctx.lineTo(W + 24, 92)
    ctx.lineTo(-24, 430)
    ctx.closePath()
    ctx.fillStyle = PALETTE.dayBandLime
    ctx.fill()
    ctx.clip()
    ctx.fillStyle = PATTERNS.squidDayBand
    ctx.fillRect(-24, -24, W + 48, H + 48)
    ctx.restore()

    // 3. Lower-right sweeping pink band
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-24, 918)
    ctx.bezierCurveTo(360, 865, 690, 825, 1020, 780)
    ctx.bezierCurveTo(1340, 735, 1630, 635, W + 24, 480)
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
    drawSquidIcon(ctx, 1680, 320, 380, -0.22 + shotIndex * 0.08, PALETTE.ink, null, null, { pupils: false })
    ctx.restore()

    // 5. Screen-tone halftone dot field & corner halftone clusters
    ctx.fillStyle = PATTERNS.toneDay
    ctx.fillRect(-24, -24, W + 48, H + 48)

    ctx.drawImage(PATTERNS.clusterInk, 0, 0, 360, 360)
    ctx.save()
    ctx.translate(W, H)
    ctx.scale(-1, -1)
    ctx.drawImage(PATTERNS.clusterPink, 0, 0, 360, 360)
    ctx.restore()

    // 6. Corner edge ink smears
    drawSplatBlob(ctx, 1910, 26, 86, PALETTE.pink, 14 + shotIndex, { satellites: 4, highlight: true, alpha: 0.78 })
    drawSplatBlob(ctx, 18, 1062, 74, PALETTE.lime, 31 + shotIndex, { satellites: 3, highlight: true, alpha: 0.85 })

    // 7. Caution /// diagonal corner stripes
    drawHazardStripes(0, 0, 170, 14, PALETTE.ink, PALETTE.lime, 16)
    drawHazardStripes(W - 170, H - 14, 170, 14, PALETTE.ink, PALETTE.pink, 16)
  } else {
    // 1. Charcoal Night Shift gradient (#232321 -> #1b1b19 -> #201a1e)
    const bgGrad = ctx.createLinearGradient(0, 0, W * 0.2, H)
    bgGrad.addColorStop(0, PALETTE.nightTop)
    bgGrad.addColorStop(0.54, PALETTE.nightMid)
    bgGrad.addColorStop(1, PALETTE.nightBot)
    ctx.fillStyle = bgGrad
    ctx.fillRect(-24, -24, W + 48, H + 48)

    // 2. Neon magenta / lime ambient festival corner glows
    const pinkGlow = ctx.createRadialGradient(W * 0.9, H * 0.14, 20, W * 0.9, H * 0.14, 620)
    pinkGlow.addColorStop(0, 'rgba(255, 45, 138, 0.20)')
    pinkGlow.addColorStop(0.6, 'rgba(255, 45, 138, 0.05)')
    pinkGlow.addColorStop(1, 'rgba(255, 45, 138, 0)')
    ctx.fillStyle = pinkGlow
    ctx.fillRect(-24, -24, W + 48, H + 48)

    const limeGlow = ctx.createRadialGradient(W * 0.12, H * 0.85, 20, W * 0.12, H * 0.85, 580)
    limeGlow.addColorStop(0, 'rgba(68, 240, 40, 0.17)')
    limeGlow.addColorStop(0.6, 'rgba(68, 240, 40, 0.04)')
    limeGlow.addColorStop(1, 'rgba(68, 240, 40, 0)')
    ctx.fillStyle = limeGlow
    ctx.fillRect(-24, -24, W + 48, H + 48)

    // 3. Subtle night squid wallpaper + 9% light halftone dot matrix
    ctx.fillStyle = PATTERNS.squidNight
    ctx.fillRect(-24, -24, W + 48, H + 48)
    ctx.fillStyle = PATTERNS.toneNight
    ctx.fillRect(-24, -24, W + 48, H + 48)

    // 4. Giant subtle night octopus watermark
    ctx.save()
    ctx.globalAlpha = 0.04
    drawSquidIcon(ctx, 250, 740, 390, 0.18 + shotIndex * 0.06, PALETTE.paper, null, null, { pupils: false, species: 'octo' })
    ctx.restore()

    // 5. Corner halftone clusters & edge neon ink splashes
    ctx.drawImage(PATTERNS.clusterLime, 0, 0, 340, 340)
    ctx.save()
    ctx.translate(W, H)
    ctx.scale(-1, -1)
    ctx.drawImage(PATTERNS.clusterPink, 0, 0, 340, 340)
    ctx.restore()

    drawSplatBlob(ctx, 1912, 24, 82, PALETTE.pink, 52 + shotIndex, { satellites: 4, highlight: true, alpha: 0.68 })
    drawSplatBlob(ctx, 16, 1058, 72, PALETTE.lime, 67 + shotIndex, { satellites: 3, highlight: true, alpha: 0.72 })

    // 6. Neon /// corner caution trims
    drawHazardStripes(0, 0, 175, 14, PALETTE.ink, PALETTE.lime, 16)
    drawHazardStripes(W - 175, H - 14, 175, 14, PALETTE.ink, PALETTE.pink, 16)
  }
  ctx.restore()
}

/** Deterministic angled jagged split seam between Day Turf (left) and Night Shift (right). */
function getSplitSeamPoints(topX = 1045, botX = 885) {
  const pts = []
  for (let y = -32; y <= H + 32; y += 26) {
    const u = (y + 32) / (H + 64)
    const jag = Math.sin(y * 0.031 + 1.4) * 16 + Math.cos(y * 0.068 - 0.8) * 10
    pts.push([mix(topX, botX, u) + jag, y])
  }
  return pts
}

/** Shot 09 split-battlefield backdrop: bright Day Turf left vs charcoal Night Shift right. */
function drawSplitTurfArena(t, shotIndex = 8, shake = { dx: 0, dy: 0 }) {
  const seamPts = getSplitSeamPoints()

  // Left half: Bright Day Turf stage
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(-40, -32)
  for (const [sx, sy] of seamPts) ctx.lineTo(sx + 6, sy)
  ctx.lineTo(-40, H + 32)
  ctx.closePath()
  ctx.clip()
  drawStageBackground(false, t, shotIndex, shake)
  ctx.restore()

  // Right half: Charcoal Night Shift stage
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(W + 40, -32)
  for (const [sx, sy] of seamPts) ctx.lineTo(sx - 6, sy)
  ctx.lineTo(W + 40, H + 32)
  ctx.closePath()
  ctx.clip()
  drawStageBackground(true, t, shotIndex, shake)
  ctx.restore()

  // Clashing ink seam border + neon dual highlight ridges
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

export function drawTiltedCard(imageName, x, y, width, opts = {}) {
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
    postDraw = null,
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
  const shadowOffX = 12
  const shadowOffY = 14

  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.translate(cardCX, cardCY)
  ctx.rotate((effTilt * Math.PI) / 180)

  // Hard sticker offset shadow
  const resolvedShadow = shadowColor ?? (dark ? 'rgba(0, 0, 0, 0.72)' : 'rgba(18, 18, 18, 0.88)')
  ctx.fillStyle = resolvedShadow
  ctx.beginPath()
  ctx.roundRect(-totalW / 2 + shadowOffX, -totalH / 2 + shadowOffY, totalW, totalH, 16)
  ctx.fill()

  // Outer sticker mat
  ctx.fillStyle = matColor ?? (dark ? '#181816' : PALETTE.cream)
  ctx.beginPath()
  ctx.roundRect(-totalW / 2, -totalH / 2, totalW, totalH, 15)
  ctx.fill()

  // Clipped high-res screenshot + optional live control overlay
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, 11)
  ctx.clip()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, cxN * image.width, cyN * image.height, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH)
  if (postDraw) postDraw(ctx, drawW, drawH)
  ctx.restore()

  // Crisp inner screenshot frame + heavy sticker border (or dual-color neon border)
  ctx.strokeStyle = dark ? 'rgba(255, 254, 249, 0.16)' : 'rgba(18, 18, 18, 0.18)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, 11)
  ctx.stroke()

  if (doubleBorder) {
    ctx.strokeStyle = PALETTE.pink
    ctx.lineWidth = 9
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

  // Tactical corner tape strips (`tl-br` default or `tr-bl` to clear top-left card labels)
  if (tape) {
    if (tapeLayout === 'tr-bl') {
      drawCornerTape(totalW / 2 - 26, -totalH / 2 + 2, 34, tapeColors[0], 82, 20)
      drawCornerTape(-totalW / 2 + 26, totalH / 2 - 2, 30, tapeColors[1], 82, 20)
    } else {
      drawCornerTape(-totalW / 2 + 26, -totalH / 2 + 2, -34, tapeColors[0], 82, 20)
      drawCornerTape(totalW / 2 - 26, totalH / 2 - 2, -30, tapeColors[1], 82, 20)
    }
  }

  // Optional corner sticker badge
  if (badge) {
    ctx.font = `900 18px ${FONT_STACK}`
    const bw = ctx.measureText(badge).width + 26
    const bx = badgePos === 'tl' ? -totalW / 2 + bw / 2 + 16 : totalW / 2 - bw / 2 - 14
    const by = badgePos === 'br' ? totalH / 2 - 6 : -totalH / 2 + 6
    drawRotatedPill(bx, by, bw, 32, -2, PALETTE.ink, PALETTE.cream, PALETTE.lime, 3, 7)
    ctx.save()
    ctx.translate(bx, by)
    ctx.rotate((-2 * Math.PI) / 180)
    drawText(badge, 0, 6, { size: 17, weight: 900, color: PALETTE.lime, align: 'center', track: false })
    ctx.restore()
  }

  ctx.restore()

  const aabb = computeRotatedAABB(cardCX, cardCY, totalW, totalH, effTilt, 16, 18)
  const rect = {
    x: Number(aabb.x.toFixed(1)),
    y: Number(aabb.y.toFixed(1)),
    w: Number(aabb.w.toFixed(1)),
    h: Number(aabb.h.toFixed(1)),
    name: imageName,
    tiltDeg: effTilt,
    imageBounds: {
      x: Number((cardCX - drawW / 2).toFixed(1)),
      y: Number((cardCY - drawH / 2).toFixed(1)),
      w: Number(drawW.toFixed(1)),
      h: Number(drawH.toFixed(1)),
    },
  }
  if (register) {
    uiRects.push(rect)
    pushProtectedRect(rect.x, rect.y, rect.w, rect.h, 6)
  }
  return rect
}

// ---------------- Sticker Headline Component ----------------

export function drawStickerHeadline(shot, p, dark, opts = {}) {
  const {
    x = 76,
    y = 185,
    maxW = 630,
    titleSize = 72,
    tiltDeg = -2.2,
    showPills = true,
    showSub = true,
    accentColor = dark ? PALETTE.pink : PALETTE.lime,
    secondaryAccent = dark ? PALETTE.lime : PALETTE.pink,
    splatBehind = false,
    staticMode = false,
    breath = { by: 0, bt: 0 },
  } = opts

  const enter = staticMode ? 1 : outBack(clamp01(p / 0.42), 1.25)
  const shiftX = staticMode ? 0 : (1 - outCubic(clamp01(p / 0.34))) * 34
  const baseX = x + shiftX
  const baseY = y + (staticMode ? 0 : breath.by * 0.65)
  const effTilt = tiltDeg + (staticMode ? 0 : breath.bt * 0.6)
  let curY = baseY

  // Unstroked organic ink splash behind title so thick headline stroke never clashes with blob border
  if (splatBehind) {
    drawSplatBlob(ctx, baseX + maxW * 0.34, baseY + 158, 124 * Math.min(1, enter), accentColor, shot.id * 41, {
      outlineColor: null,
      outlineWidth: 0,
      satellites: 6,
      highlight: true,
      alpha: 0.9,
    })
  }

  // 1. Tactical Tape Tag above headline
  const tapeText = shot.tapeTag
  const tapeW = Math.min(maxW, measureTextWidth(tapeText, 19, 900) + 46)
  const tapeH = 38
  const tapeCX = baseX + tapeW / 2
  const tapeCY = curY + tapeH / 2
  const tapeTilt = effTilt - 1.4
  drawRotatedPill(tapeCX, tapeCY, tapeW, tapeH, tapeTilt, PALETTE.ink, dark ? PALETTE.lime : PALETTE.ink, secondaryAccent, 4, 6)
  ctx.save()
  ctx.translate(tapeCX, tapeCY)
  ctx.rotate((tapeTilt * Math.PI) / 180)
  drawText(tapeText, 0, 6, { size: 18, weight: 900, color: accentColor, align: 'center' })
  ctx.restore()
  curY += tapeH + 26

  // 2. Multi-line Sticker Title with thick ink outline & hard comic shadow
  const lineH = Math.round(titleSize * 1.46)
  shot.stickerTitle.forEach((line, i) => {
    const lineEnter = staticMode ? 1 : outBack(clamp01((p - i * 0.07) / 0.38), 1.3)
    const lineTilt = effTilt + (i % 2 === 0 ? 0.4 : -0.6)
    const textW = measureTextWidth(line, titleSize, 900)
    const lineCX = baseX + textW / 2
    const lineCY = curY + titleSize * 0.56

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
      strokeWidth: Math.max(11, Math.round(titleSize * 0.16)),
      shadowColor: PALETTE.ink,
      shadowX: 6,
      shadowY: 7,
      pad: 4,
    })
    ctx.restore()
    curY += lineH
  })

  curY += 12

  // 3. Subtitle Sticker Pill
  if (showSub && shot.stickerSub) {
    const subSize = 22
    const subW = Math.min(maxW, measureTextWidth(shot.stickerSub, subSize, 700) + 34)
    const subH = 42
    const subCX = baseX + subW / 2
    const subCY = curY + subH / 2
    const subTilt = effTilt * 0.45 + 0.9
    drawRotatedPill(subCX, subCY, subW, subH, subTilt, dark ? PALETTE.cardDark : PALETTE.cream, PALETTE.ink, PALETTE.ink, 5, 9)
    ctx.save()
    ctx.translate(subCX, subCY)
    ctx.rotate((subTilt * Math.PI) / 180)
    drawText(shot.stickerSub, 0, 8, {
      size: subSize,
      weight: 700,
      color: dark ? PALETTE.cream : PALETTE.ink,
      align: 'center',
    })
    ctx.restore()
    curY += subH + 22
  }

  // 4. Feature Pills with black outline & hard shadow
  if (showPills && shot.featurePills?.length) {
    let px = baseX
    let py = curY
    const pillH = 42
    const gapX = 14
    const gapY = 14
    shot.featurePills.forEach((pill, i) => {
      const pw = measureTextWidth(pill, 21, 900) + 46
      if (px > baseX && px + pw > baseX + maxW) {
        px = baseX
        py += pillH + gapY
      }
      const pillEnter = staticMode ? 1 : outBack(clamp01((p - 0.18 - i * 0.08) / 0.34), 1.35)
      const pillTilt = i % 2 === 0 ? -1.4 : 1.3
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
      ctx.roundRect(-pw / 2 + 4, -pillH / 2 + 5, pw, pillH, 21)
      ctx.fill()

      ctx.fillStyle = pillFill
      ctx.strokeStyle = PALETTE.ink
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.roundRect(-pw / 2, -pillH / 2, pw, pillH, 21)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = pillText
      ctx.beginPath()
      ctx.arc(-pw / 2 + 18, 0, 4.5, 0, Math.PI * 2)
      ctx.fill()

      drawText(pill, 7, 7, { size: 21, weight: 900, color: pillText, align: 'center' })
      ctx.restore()

      px += pw + gapX
    })
    curY = py + pillH
  }

  pushProtectedRect(baseX - 18, baseY - 18, maxW + 36, curY - baseY + 36, 8)
  return { bottomY: curY }
}

// ---------------- Top Chrome & Turf Settlement Bar ----------------

function drawTopChrome(shot, _p, t, dark) {
  const badgeW = 318
  const badgeH = 52
  const badgeCX = 216
  const badgeCY = 66
  const badgeTilt = -1.4
  const badgeShadow = dark ? PALETTE.pink : PALETTE.lime

  drawRotatedPill(badgeCX, badgeCY, badgeW, badgeH, badgeTilt, PALETTE.ink, dark ? PALETTE.cream : PALETTE.ink, badgeShadow, 5, 11)
  ctx.save()
  ctx.translate(badgeCX, badgeCY)
  ctx.rotate((badgeTilt * Math.PI) / 180)
  drawSquidIcon(ctx, -badgeW / 2 + 30, 0, 34, -0.1, dark ? PALETTE.lime : PALETTE.pink, PALETTE.ink, PALETTE.cream)
  drawText('SPLAT-STREET', -badgeW / 2 + 56, 9, { size: 24, weight: 900, color: PALETTE.cream, align: 'left' })
  ctx.fillStyle = PALETTE.lime
  ctx.beginPath()
  ctx.roundRect(badgeW / 2 - 66, -15, 54, 30, 7)
  ctx.fill()
  drawText('DSH', badgeW / 2 - 39, 7, { size: 17, weight: 900, color: PALETTE.ink, align: 'center' })
  ctx.restore()
  pushProtectedRect(50, 34, 336, 68, 4)

  if (shot.id === 9) {
    const stageW = 324
    const stageH = 46
    const stageCX = 1696
    const stageCY = 65
    const stageTilt = 1.2
    drawRotatedPill(stageCX, stageCY, stageW, stageH, stageTilt, PALETTE.ink, PALETTE.pink, PALETTE.lime, 4, 10)
    ctx.save()
    ctx.translate(stageCX, stageCY)
    ctx.rotate((stageTilt * Math.PI) / 180)
    drawText('09 / 09 · TURF RESULT', 0, 8, { size: 20, weight: 900, color: PALETTE.lime, align: 'center' })
    ctx.restore()
    pushProtectedRect(1526, 34, 340, 64, 4)
  } else {
    const stageW = 310
    const stageH = 46
    const stageCX = 1704
    const stageCY = 65
    const stageTilt = 1.2
    const modeLabel = dark ? 'NIGHT SHIFT' : 'DAY TURF'
    const modeColor = dark ? PALETTE.pink : PALETTE.lime
    drawRotatedPill(stageCX, stageCY, stageW, stageH, stageTilt, PALETTE.ink, dark ? PALETTE.pink : PALETTE.ink, modeColor, 4, 10)
    ctx.save()
    ctx.translate(stageCX, stageCY)
    ctx.rotate((stageTilt * Math.PI) / 180)
    drawText(`0${shot.id} / 09 · ${modeLabel}`, 0, 8, { size: 20, weight: 900, color: modeColor, align: 'center' })
    ctx.restore()
    pushProtectedRect(1542, 34, 326, 64, 4)
  }
}

// ---------------- Tilted Broadcast HUD Banner ----------------

export function drawBroadcastHUD(shot, p, t, dark) {
  // Shot 09 uses the full-width bottom Splatoon settlement bar + ticker, leaving repo URL inside the street namecard
  if (shot.id === 9) {
    return
  }

  const bw = 1744
  const bh = 60
  const cx = 960
  const cy = 992
  const tilt = -0.9
  const isStatic = t >= STATIC_HOLD_START
  const enter = isStatic ? 1 : outCubic(clamp01(p / 0.28))

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((tilt * Math.PI) / 180)

  ctx.fillStyle = dark ? PALETTE.pink : PALETTE.lime
  ctx.beginPath()
  ctx.roundRect(-bw / 2 + 6, -bh / 2 + 6, bw, bh, 12)
  ctx.fill()

  ctx.fillStyle = dark ? '#181816' : PALETTE.ink
  ctx.beginPath()
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 12)
  ctx.fill()

  const leftW = 204
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 12)
  ctx.clip()

  ctx.fillStyle = dark ? PALETTE.pink : PALETTE.lime
  ctx.beginPath()
  ctx.moveTo(-bw / 2, -bh / 2)
  ctx.lineTo(-bw / 2 + leftW, -bh / 2)
  ctx.lineTo(-bw / 2 + leftW - 18, bh / 2)
  ctx.lineTo(-bw / 2, bh / 2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  drawSquidIcon(ctx, -bw / 2 + 34, 0, 34, -0.08, PALETTE.ink, PALETTE.cream, dark ? PALETTE.pink : PALETTE.lime)
  drawText(dark ? 'FEST LIVE' : 'INK NEWS', -bw / 2 + 62, 8, {
    size: 20,
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
  const textSlide = (1 - enter) * 14
  drawText(shot.caption, -bw / 2 + leftW + 22 + textSlide, 9, {
    size: 25,
    weight: 700,
    color: PALETTE.cream,
    align: 'left',
  })
  ctx.restore()

  drawText('>>>', bw / 2 - 446, 9, {
    size: 22,
    weight: 900,
    color: dark ? PALETTE.lime : PALETTE.pink,
    align: 'right',
  })
  drawText(REPO_URL, bw / 2 - 24, 8, {
    size: 19,
    weight: 700,
    color: PALETTE.lime,
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

// ---------------- Shot-Specific Vector Stickers & Callouts ----------------

function drawArrowSticker(fromX, fromY, toX, toY, label, pulse, shake = { dx: 0, dy: 0 }) {
  ctx.save()
  const bounce = Math.sin(pulse * Math.PI * 2) * 6
  const fx = fromX + bounce * 0.6 + shake.dx
  const tx = toX + bounce * 0.5 + shake.dx
  const fy = fromY + shake.dy
  const ty = toY + shake.dy

  const pw = measureTextWidth(label, 20, 900) + 34
  const ph = 42
  const pillCX = fx
  const pillCY = fy - 42
  drawRotatedPill(pillCX, pillCY, pw, ph, -2.5, PALETTE.pink, PALETTE.ink, PALETTE.ink, 4, 10)
  ctx.save()
  ctx.translate(pillCX, pillCY)
  ctx.rotate((-2.5 * Math.PI) / 180)
  drawText(label, 0, 7, { size: 20, weight: 900, color: PALETTE.cream, align: 'center' })
  ctx.restore()

  const startX = pillCX - 4
  const startY = pillCY + ph / 2 + 8
  const ctrlX = pillCX + 16
  const ctrlY = ty + 2
  const angle = Math.atan2(ty - ctrlY, tx - ctrlX)
  const headLen = 18
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
  ctx.lineWidth = 12
  traceArrow()
  ctx.stroke()

  ctx.strokeStyle = PALETTE.lime
  ctx.lineWidth = 5
  traceArrow()
  ctx.stroke()
  ctx.restore()

  const minX = Math.min(pillCX - pw / 2, startX, tx) - 14
  const minY = Math.min(pillCY - ph / 2, startY, ty - 16) - 10
  const maxX = Math.max(pillCX + pw / 2, tx + 16) + 14
  const maxY = Math.max(pillCY + ph / 2, ty + 16) + 10
  pushProtectedRect(minX, minY, maxX - minX, maxY - minY, 6)
}

function drawGearSlotsRow(x, y, u, shotId, shake = { dx: 0, dy: 0 }, breath = { by: 0, bt: 0 }) {
  const presets = [
    { name: '纸白', val: '20%', sub: '官方绿 JOY-CON', color: '#1edc00' },
    { name: '均衡', val: '50%', sub: '荧光绿 NEON', color: '#9ae528' },
    { name: '涂地', val: '100%', sub: '黄绿 LIME', color: '#d3f510' },
  ]
  const activeIdx = getAppearancePresetIndex(u)
  const slotW = 200
  const slotH = 148
  const gap = 18

  presets.forEach((slot, i) => {
    const sx = x + i * (slotW + gap) + shake.dx
    const isActive = i === activeIdx
    const localSlotP = i === 0 ? clamp01(u / 0.14) : i === 1 ? clamp01((u - 0.34) / 0.14) : clamp01((u - 0.68) / 0.14)
    const popY = isActive ? -14 * outBack(localSlotP, 1.5) : 0
    const tilt = (i === 0 ? -2.1 : i === 1 ? 1.4 : -1.2) + breath.bt * 0.5
    const cx = sx + slotW / 2
    const cy = y + slotH / 2 + popY + shake.dy + breath.by * 0.5

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((tilt * Math.PI) / 180)

    ctx.fillStyle = isActive ? slot.color : PALETTE.ink
    ctx.beginPath()
    ctx.roundRect(-slotW / 2 + 6, -slotH / 2 + 7, slotW, slotH, 16)
    ctx.fill()

    ctx.fillStyle = isActive ? PALETTE.ink : PALETTE.cream
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 4.5
    ctx.beginPath()
    ctx.roundRect(-slotW / 2, -slotH / 2, slotW, slotH, 16)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = slot.color
    ctx.beginPath()
    ctx.roundRect(-slotW / 2 + 12, -slotH / 2 + 12, slotW - 24, 30, 8)
    ctx.fill()
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 2.5
    ctx.stroke()

    drawText(slot.sub, 0, -slotH / 2 + 33, {
      size: 16,
      weight: 900,
      color: slot.color === PALETTE.pink ? PALETTE.cream : PALETTE.ink,
      align: 'center',
    })
    drawText(slot.name, 0, 12, {
      size: 34,
      weight: 900,
      color: isActive ? PALETTE.cream : PALETTE.ink,
      align: 'center',
    })
    drawText(slot.val, 0, 50, {
      size: 32,
      weight: 900,
      color: isActive ? slot.color : '#44483d',
      align: 'center',
    })

    if (isActive) {
      drawSplatBlob(ctx, slotW / 2 - 12, -slotH / 2 + 10, 14, slot.color, shotId * 13 + i, {
        outlineColor: PALETTE.ink,
        outlineWidth: 2.5,
        satellites: false,
      })
    }

    ctx.restore()
  })

  pushProtectedRect(x + shake.dx - 16, y + shake.dy - 28, slotW * 3 + gap * 2 + 32, slotH + 46, 6)
}

function drawNightSwatches(x, y, p, shake = { dx: 0, dy: 0 }, breath = { by: 0, bt: 0 }) {
  const swatches = [
    { hex: '#1B1B19', label: '炭黑底面', textColor: PALETTE.cream },
    { hex: '#44F028', label: '电光绿墨', textColor: PALETTE.ink },
    { hex: '#FF2D8A', label: '洋红撞色', textColor: PALETTE.cream },
  ]
  const w = 188
  const h = 112
  const gap = 18
  swatches.forEach((sw, i) => {
    const enter = outBack(clamp01((p - 0.14 - i * 0.1) / 0.35), 1.3)
    const cx = x + i * (w + gap) + w / 2 + shake.dx
    const cy = y + h / 2 + shake.dy + breath.by * 0.6
    const tilt = (i % 2 === 0 ? -1.8 : 1.6) + breath.bt * 0.6
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(mix(0.85, 1, enter), mix(0.85, 1, enter))
    ctx.rotate((tilt * Math.PI) / 180)

    ctx.fillStyle = PALETTE.ink
    ctx.beginPath()
    ctx.roundRect(-w / 2 + 6, -h / 2 + 6, w, h, 14)
    ctx.fill()

    ctx.fillStyle = sw.hex
    ctx.strokeStyle = PALETTE.cream
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.roundRect(-w / 2, -h / 2, w, h, 14)
    ctx.fill()
    ctx.stroke()

    drawText(sw.hex, 0, -4, { size: 23, weight: 900, color: sw.textColor, align: 'center' })
    drawText(sw.label, 0, 30, { size: 19, weight: 700, color: sw.textColor, align: 'center' })
    ctx.restore()
  })
  pushProtectedRect(x + shake.dx - 12, y + shake.dy - 14, w * 3 + gap * 2 + 28, h + 28, 6)
}

function drawBarcodeSticker(cx, cy, p, shake = { dx: 0, dy: 0 }, breath = { by: 0, bt: 0 }) {
  const enter = outBack(clamp01((p - 0.15) / 0.4), 1.35)
  const w = 360
  const h = 148
  const tilt = -3.8 + breath.bt
  const sx = cx + shake.dx
  const sy = cy + shake.dy + breath.by

  ctx.save()
  ctx.translate(sx, sy)
  ctx.scale(mix(0.85, 1, enter), mix(0.85, 1, enter))
  ctx.rotate((tilt * Math.PI) / 180)

  drawSplatBlob(ctx, -w * 0.32, -h * 0.38, 42, PALETTE.lime, 801, { outlineColor: PALETTE.ink, outlineWidth: 4, satellites: 3 })
  drawSplatBlob(ctx, w * 0.34, h * 0.32, 46, PALETTE.pink, 802, { outlineColor: PALETTE.ink, outlineWidth: 4, satellites: 3 })

  ctx.fillStyle = PALETTE.ink
  ctx.beginPath()
  ctx.roundRect(-w / 2 + 7, -h / 2 + 8, w, h, 10)
  ctx.fill()

  ctx.fillStyle = PALETTE.cream
  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = 4.5
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, 10)
  ctx.fill()
  ctx.stroke()

  const widths = [6, 3, 9, 4, 7, 11, 3, 8, 4, 6, 3, 10, 4, 5, 8, 3, 7, 4]
  let bx = -w / 2 + 26
  ctx.fillStyle = PALETTE.ink
  widths.forEach((bw, idx) => {
    ctx.fillRect(bx, -h / 2 + 20, bw, 70)
    bx += bw + (idx % 3 === 0 ? 7 : 5)
  })

  ctx.fillStyle = PALETTE.pink
  ctx.fillRect(-w / 2 + 24, 30, 88, 7)
  ctx.fillStyle = PALETTE.lime
  ctx.fillRect(-w / 2 + 120, 30, 56, 7)
  ctx.fillStyle = PALETTE.ink
  ctx.fillRect(-w / 2 + 184, 30, 150, 7)

  drawText('390PX // RESPONSIVE', -w / 2 + 24, 58, { size: 17, weight: 900, color: PALETTE.ink, align: 'left' })
  drawSquidIcon(ctx, w / 2 - 42, -h / 2 + 52, 54, -0.15, PALETTE.lime, PALETTE.ink, PALETTE.cream)
  ctx.restore()

  const aabb = computeRotatedAABB(sx, sy, w, h, tilt, 24, 24)
  pushProtectedRect(aabb.x, aabb.y, aabb.w, aabb.h, 6)
}

function drawFinaleNamecard(x, y, w, h, shake = { dx: 0, dy: 0 }) {
  const cx = x + w / 2 + shake.dx
  const cy = y + h / 2 + shake.dy
  const tilt = -1.3

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((tilt * Math.PI) / 180)

  // Hard shadow
  ctx.fillStyle = PALETTE.ink
  ctx.beginPath()
  ctx.roundRect(-w / 2 + 8, -h / 2 + 9, w, h, 16)
  ctx.fill()

  // Card paper stock
  ctx.fillStyle = PALETTE.cream
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, 16)
  ctx.fill()

  // Clipped neon lime diagonal hazard accent strip along left edge
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, 16)
  ctx.clip()
  drawHazardStripes(-w / 2, -h / 2, 26, h, PALETTE.lime, PALETTE.ink, 14)
  ctx.fillStyle = PALETTE.ink
  ctx.fillRect(-w / 2 + 26, -h / 2, 4, h)
  ctx.restore()

  // Outer card frame
  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = 4.5
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, 16)
  ctx.stroke()

  // Top-left tactical tape strip
  drawCornerTape(-w / 2 + 46, -h / 2 + 2, -28, PALETTE.pink, 86, 20)

  // Right Squid stamp seal (clear of URL & install command)
  const stX = w / 2 - 50
  const stY = h / 2 - 54
  ctx.save()
  ctx.translate(stX, stY)
  ctx.rotate(0.18)
  ctx.strokeStyle = PALETTE.pink
  ctx.lineWidth = 3
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.arc(0, 0, 32, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  drawSquidIcon(ctx, 0, 0, 42, -0.08, PALETTE.lime, PALETTE.ink, PALETTE.cream)
  ctx.restore()

  // Card typography
  const textX = -w / 2 + 42
  drawText(REPO_URL, textX, -h / 2 + 50, { size: 20, weight: 900, color: PALETTE.ink, align: 'left' })

  // Install command dark pill
  ctx.fillStyle = PALETTE.ink
  ctx.beginPath()
  ctx.roundRect(textX, -h / 2 + 72, 368, 44, 9)
  ctx.fill()
  drawText('> pnpm add dsh-theme-splat-ui', textX + 16, -h / 2 + 101, {
    size: 18,
    weight: 900,
    color: PALETTE.lime,
    align: 'left',
  })

  drawText('昼夜双场一键切换 · DSH Theme', textX, -h / 2 + 152, {
    size: 19,
    weight: 700,
    color: '#44483d',
    align: 'left',
  })

  ctx.restore()
  const aabb = computeRotatedAABB(cx, cy, w, h, tilt, 18, 18)
  pushProtectedRect(aabb.x, aabb.y, aabb.w, aabb.h, 6)
}

/**
 * Draw Splatoon-2 style Turf War settlement result gauge for Shot 09 (`p` = shot.localTime).
 * Phase 1 (`0..0.38s`): both sides surge inward; Phase 2 (`0.38..1.08s`): center tug-of-war battle;
 * Phase 3 (`1.08..1.38s`): outBack snap lock onto `50.0%` vs `50.0%` (`1500p` vs `1500p`);
 * `t >= 27.0s` (`p >= 1.52s`): 100% static with zero time-varying terms.
 */
function drawTurfSettlementBar(p, t, shot, shake = { dx: 0, dy: 0 }) {
  const animP = t >= 27.0 ? 2.0 : p
  const barX = 76
  const barY = 756
  const barW = 1768
  const barH = 112
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

  // Team Header Row above bar (Day Lime Squid vs Night Magenta Octo)
  const headY = barY - 46
  drawSquidIcon(ctx, barX + 34 + ox, headY, 50, -0.1, PALETTE.lime, PALETTE.ink, PALETTE.cream)
  drawRotatedPill(barX + 210 + ox, headY, 272, 42, -1.2, PALETTE.ink, PALETTE.ink, PALETTE.lime, 4, 10)
  ctx.save()
  ctx.translate(barX + 210 + ox, headY)
  ctx.rotate((-1.2 * Math.PI) / 180)
  drawText('明亮主题 · DAY TURF', 0, 7, { size: 20, weight: 900, color: PALETTE.lime, align: 'center' })
  ctx.restore()

  drawSquidIcon(ctx, barX + barW - 34 + ox, headY, 50, 0.1, PALETTE.pink, PALETTE.ink, PALETTE.cream, { species: 'octo' })
  drawRotatedPill(barX + barW - 216 + ox, headY, 286, 42, 1.2, PALETTE.ink, PALETTE.pink, PALETTE.ink, 4, 10)
  ctx.save()
  ctx.translate(barX + barW - 216 + ox, headY)
  ctx.rotate((1.2 * Math.PI) / 180)
  drawText('黑暗主题 · NIGHT SHIFT', 0, 7, { size: 20, weight: 900, color: PALETTE.pink, align: 'center' })
  ctx.restore()

  // Main Glossy Capsule Settlement Gauge
  const bx = barX + ox
  const by = barY + oy
  ctx.save()

  // Hard offset shadow
  ctx.fillStyle = PALETTE.ink
  ctx.beginPath()
  ctx.roundRect(bx + 8, by + 10, barW, barH, radius)
  ctx.fill()

  // Empty dark capsule trough base
  ctx.fillStyle = '#181816'
  ctx.beginPath()
  ctx.roundRect(bx, by, barW, barH, radius)
  ctx.fill()

  // Clipped liquid turf segments + glossy highlight + slant stripes
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(bx, by, barW, barH, radius)
  ctx.clip()

  const leftPx = barW * leftFill
  const rightPx = barW * rightFill
  const slant = 22

  // Left team ink (Day Lime with bright top highlight & bottom lime-deep rim)
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

  // Right team ink (Night Shift Magenta/Violet gradient)
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

  // Diagonal Splatoon subtle graphic stripes across liquid
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)'
  for (let sx = bx - barH; sx < bx + barW + barH; sx += 64) {
    ctx.beginPath()
    ctx.moveTo(sx, by + barH)
    ctx.lineTo(sx + 20, by + barH)
    ctx.lineTo(sx + 20 + barH * 0.45, by)
    ctx.lineTo(sx + barH * 0.45, by)
    ctx.closePath()
    ctx.fill()
  }

  // Glossy cylindrical glass reflection across upper half (matching Splatoon 2 result gauge)
  const glossGrad = ctx.createLinearGradient(bx, by, bx, by + barH * 0.56)
  glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.48)')
  glossGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.1)')
  glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = glossGrad
  ctx.fillRect(bx + 12, by + 5, barW - 24, barH * 0.52)

  // Center ink clash seam outline once the two fronts meet
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

  // Crisp heavy comic rim around capsule
  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = 5.5
  ctx.beginPath()
  ctx.roundRect(bx, by, barW, barH, radius)
  ctx.stroke()

  // Active battle ink sparks at collision point during tug-of-war (zero when animP >= 1.38)
  if (splashAlpha > 0) {
    const hitX = bx + leftPx
    ctx.save()
    ctx.globalAlpha = splashAlpha
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + animP * 7
      const dist = 24 + ((i * 19) % 28)
      drawSplatBlob(ctx, hitX + Math.cos(a) * dist, by + barH / 2 + Math.sin(a) * dist * 0.8, 12, i % 2 === 0 ? PALETTE.lime : PALETTE.pink, 910 + i, {
        outlineColor: PALETTE.ink,
        outlineWidth: 2.5,
        satellites: false,
      })
    }
    ctx.restore()
  }

  // Left numeric score (percentage + turf points)
  drawText(`${leftPct}%`, bx + 42, by + 75, {
    size: 56,
    weight: 900,
    color: PALETTE.ink,
    strokeColor: PALETTE.paper,
    strokeWidth: 7,
    align: 'left',
  })
  drawText(leftPts, bx + 252, by + 72, {
    size: 27,
    weight: 900,
    color: PALETTE.ink,
    strokeColor: PALETTE.lime,
    strokeWidth: 4,
    align: 'left',
  })

  // Right numeric score (turf points + percentage)
  drawText(`${rightPct}%`, bx + barW - 42, by + 75, {
    size: 56,
    weight: 900,
    color: PALETTE.cream,
    strokeColor: PALETTE.ink,
    strokeWidth: 8,
    shadowColor: 'rgba(18, 18, 18, 0.45)',
    shadowX: 3,
    shadowY: 4,
    align: 'right',
  })
  drawText(rightPts, bx + barW - 252, by + 72, {
    size: 27,
    weight: 900,
    color: PALETTE.cream,
    strokeColor: PALETTE.ink,
    strokeWidth: 5,
    align: 'right',
  })

  // Center lock stamp (`50 : 50` tie settlement badge)
  if (stampScale > 0.02) {
    const midX = bx + barW / 2
    const midY = by + barH / 2
    ctx.save()
    ctx.translate(midX, midY)
    ctx.scale(stampScale, stampScale)
    ctx.rotate(-0.04)

    const sw = 214
    const sh = 66
    ctx.fillStyle = PALETTE.lime
    ctx.beginPath()
    ctx.roundRect(-sw / 2 + 5, -sh / 2 + 6, sw, sh, 14)
    ctx.fill()

    ctx.fillStyle = PALETTE.ink
    ctx.strokeStyle = PALETTE.cream
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.roundRect(-sw / 2, -sh / 2, sw, sh, 14)
    ctx.fill()
    ctx.stroke()

    drawText('50 : 50', 0, -4, { size: 22, weight: 900, color: PALETTE.lime, align: 'center', track: false })
    drawText('双场皆主场', 0, 21, { size: 18, weight: 900, color: PALETTE.cream, align: 'center', track: false })
    ctx.restore()
  }

  ctx.restore()

  // Bottom broadcast verdict ticker pill below the gauge
  const capW = Math.min(1260, measureTextWidth(shot.caption, 23, 800) + 120)
  const capH = 44
  const capCX = W / 2 + ox
  const capCY = barY + barH + 56
  drawRotatedPill(capCX, capCY, capW, capH, -0.5, PALETTE.ink, PALETTE.cream, PALETTE.pink, 4, 22)
  ctx.save()
  ctx.translate(capCX, capCY)
  ctx.rotate((-0.5 * Math.PI) / 180)
  drawText(shot.caption, 0, 8, { size: 22, weight: 800, color: PALETTE.cream, align: 'center' })
  ctx.restore()

  pushProtectedRect(bx - 14, headY - 34, barW + 28, barH + 150, 6)
}

// ---------------- 9 Individual Shot Compositions ----------------

function renderShotScene(shot, t, shake, includeHUD) {
  const p = shot.localTime
  const n = shot.index
  const breath = getBreath(t, shot.id * 1.3)
  let dark = shot.effectiveMode === 'dark'

  if (shot.id === 1) {
    // Shot 01 (0.0 - 2.40s): Inkopolis Square atmosphere + tilted hero-light + giant sticker headline + dual splat impact
    drawStageBackground(false, t, n, shake)

    ctx.save()
    ctx.translate(shake.dx, shake.dy)
    ctx.globalAlpha = 0.85 * outCubic(clamp01(p / 0.55))
    const bgW = 1860
    const bgH = (bgW * inkopolisLightBackdrop.height) / inkopolisLightBackdrop.width
    ctx.drawImage(inkopolisLightBackdrop, 40, 230, bgW, bgH)
    ctx.restore()

    const impact1 = outBack(clamp01(p / 0.45), 1.4)
    const impact2 = outBack(clamp01((p - 0.14) / 0.45), 1.4)
    drawSplatBlob(ctx, 730 + shake.dx, 235 + shake.dy, 118 * impact1, PALETTE.lime, 101, {
      outlineColor: PALETTE.ink,
      outlineWidth: 6,
      satellites: 7,
    })
    drawSplatBlob(ctx, 1740 + shake.dx, 745 + shake.dy, 128 * impact2, PALETTE.pink, 102, {
      outlineColor: PALETTE.ink,
      outlineWidth: 6,
      satellites: 7,
    })

    const cardEnter = outBack(clamp01((p - 0.06) / 0.52), 1.25)
    drawTiltedCard('hero-light', 755, 250, 1030, {
      tiltDeg: shot.cardTiltDeg,
      enter: cardEnter,
      slideX: (1 - outCubic(clamp01(p / 0.45))) * 120,
      shake,
      breath,
      dark: false,
      tapeColors: [PALETTE.pink, PALETTE.lime],
      badge: 'INKOPOLIS HERO',
    })

    drawStickerHeadline(shot, p, false, {
      x: 78,
      y: 205,
      maxW: 630,
      titleSize: 108,
      tiltDeg: -2.4,
      splatBehind: true,
      breath,
    })
  } else if (shot.id === 2) {
    // Shot 02 (2.40 - 5.95s): Right-stage workspace-light (-1.8 deg) with smooth zoom into hero & composer
    drawStageBackground(false, t, n, shake)

    const enter = outBack(clamp01(p / 0.48), 1.15)
    const zoom = inOutCubic(clamp01((p - 1.2) / 1.7))
    const crop = [mix(0, 0.24, zoom), mix(0, 0.17, zoom), mix(1, 0.7, zoom), mix(1, 0.7, zoom)]

    drawTiltedCard('workspace-light', 745, 152, 1045, {
      crop,
      tiltDeg: shot.cardTiltDeg,
      enter,
      slideX: (1 - outCubic(clamp01(p / 0.42))) * 90,
      shake,
      breath,
      dark: false,
      tapeColors: [PALETTE.lime, PALETTE.pink],
      badge: zoom > 0.35 ? 'ZOOM IN // HERO' : 'DAY WORKSPACE',
    })

    drawStickerHeadline(shot, p, false, {
      x: 76,
      y: 205,
      maxW: 615,
      titleSize: 70,
      tiltDeg: -1.8,
      splatBehind: true,
      breath,
    })
  } else if (shot.id === 3) {
    // Shot 03 (5.95 - 9.18s): Dual-stack! Upper-right +2.0 deg input-menu-light (tightened width 0.384) & lower-left composer-light
    drawStageBackground(false, t, n, shake)

    const menuEnter = outBack(clamp01(p / 0.46), 1.2)
    const compEnter = outBack(clamp01((p - 0.12) / 0.46), 1.2)

    drawTiltedCard('input-menu-light', 1030, 134, 775, {
      crop: [0.333, 0.234, 0.378, 0.362],
      tiltDeg: shot.cardTiltDeg,
      enter: menuEnter,
      slideX: (1 - outCubic(clamp01(p / 0.42))) * 80,
      shake,
      breath,
      dark: false,
      tapeColors: [PALETTE.pink, PALETTE.lime],
      badge: 'SLASH MENU',
    })

    drawTiltedCard('composer-light', 78, 678, 950, {
      tiltDeg: -1.6,
      enter: compEnter,
      slideY: (1 - outCubic(clamp01((p - 0.1) / 0.42))) * 60,
      shake,
      breath: getBreath(t, 4.1),
      dark: false,
      tapeColors: [PALETTE.lime, PALETTE.pink],
      badge: 'COMPOSER SHELL',
    })

    drawStickerHeadline(shot, p, false, {
      x: 76,
      y: 146,
      maxW: 660,
      titleSize: 66,
      tiltDeg: -1.8,
      splatBehind: false,
      breath,
    })

    drawArrowSticker(888, 178, 1038, 199, '官方绿高亮', p * 1.4, shake)
  } else if (shot.id === 4) {
    // Shot 04 (9.18 - 12.90s): Gear-panel! Synchronized 3-preset gear slots + live appearance-panel-light controls
    drawStageBackground(false, t, n, shake)

    const u = clamp01(p / Math.max(0.1, shot.duration))
    const presetIdx = getAppearancePresetIndex(u)
    const enter = outBack(clamp01(p / 0.48), 1.2)

    const presetImage = presetIdx === 0 ? 'appearance-panel-light-paper' : presetIdx === 2 ? 'appearance-panel-light-turf' : 'appearance-panel-light-balanced'
    drawTiltedCard(presetImage, 835, 132, 880, {
      crop: [0.235, 0.25, 0.72, 0.715],
      tiltDeg: shot.cardTiltDeg,
      enter,
      slideX: (1 - outCubic(clamp01(p / 0.42))) * 85,
      shake,
      breath,
      dark: false,
      tapeColors: [PALETTE.lime, PALETTE.pink],
      badge: 'APPEARANCE TUNING',
    })

    drawStickerHeadline(shot, p, false, {
      x: 74,
      y: 152,
      maxW: 675,
      titleSize: 64,
      tiltDeg: -1.8,
      splatBehind: true,
      breath,
    })

    drawGearSlotsRow(76, 688, u, shot.id, shake, breath)
  } else if (shot.id === 5) {
    // Shot 05 (12.90 - 14.45s): Midnight Splatfest hero poster! hero-dark (-2.2 deg) right-center + glowing squids + giant neon headline left
    dark = true
    drawStageBackground(true, t, n, shake)

    const enter = outBack(clamp01(p / 0.42), 1.32)

    // Midnight splat bursts & glowing squid emblems around hero-dark
    const glowGrad = ctx.createRadialGradient(1285 + shake.dx, 495 + shake.dy, 40, 1285 + shake.dx, 495 + shake.dy, 520)
    glowGrad.addColorStop(0, 'rgba(255, 45, 138, 0.24)')
    glowGrad.addColorStop(0.55, 'rgba(68, 240, 40, 0.14)')
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = glowGrad
    ctx.fillRect(680, 110, 1200, 820)

    drawSplatBlob(ctx, 790 + shake.dx, 245 + shake.dy, 108 * enter, PALETTE.pink, 511, {
      outlineColor: PALETTE.ink,
      outlineWidth: 5,
      satellites: 6,
    })
    drawSplatBlob(ctx, 1745 + shake.dx, 735 + shake.dy, 118 * enter, PALETTE.lime, 512, {
      outlineColor: PALETTE.ink,
      outlineWidth: 5,
      satellites: 6,
    })

    drawTiltedCard('hero-dark', 775, 244, 1005, {
      tiltDeg: -2.2,
      enter,
      slideX: (1 - outCubic(clamp01(p / 0.36))) * 95,
      shake,
      breath,
      dark: true,
      doubleBorder: true,
      shadowColor: PALETTE.pink,
      tapeColors: [PALETTE.lime, PALETTE.pink],
      badge: 'SPLATFEST NIGHT',
    })

    // Glowing neon squid decorations flanking the Splatfest card (clear of top badge)
    ctx.save()
    ctx.translate(shake.dx, shake.dy + breath.by)
    ctx.shadowColor = PALETTE.lime
    ctx.shadowBlur = 18
    drawSquidIcon(ctx, 1785, 315, 74, 0.24, PALETTE.lime, PALETTE.ink, PALETTE.cream)
    ctx.shadowColor = PALETTE.pink
    drawSquidIcon(ctx, 815, 755, 68, -0.28, PALETTE.pink, PALETTE.ink, PALETTE.cream, { species: 'octo' })
    ctx.restore()

    drawStickerHeadline(shot, p, true, {
      x: 78,
      y: 205,
      maxW: 650,
      titleSize: 108,
      tiltDeg: -3.2,
      splatBehind: true,
      breath,
    })
  } else if (shot.id === 6) {
    // Shot 06 (14.45 - 17.75s): Left-stage flipped layout! workspace-dark (+1.6 deg) on left, headline (no duplicate pills) + 3 swatches on right
    drawStageBackground(true, t, n, shake)

    const enter = outBack(clamp01(p / 0.48), 1.2)
    drawTiltedCard('workspace-dark', 82, 152, 1020, {
      tiltDeg: shot.cardTiltDeg,
      enter,
      slideX: (1 - outCubic(clamp01(p / 0.4))) * -90,
      shake,
      breath,
      dark: true,
      borderColor: PALETTE.pink,
      tapeColors: [PALETTE.lime, PALETTE.pink],
      badge: 'NIGHT WORKSPACE',
    })

    drawStickerHeadline(shot, p, true, {
      x: 1165,
      y: 190,
      maxW: 660,
      titleSize: 72,
      tiltDeg: 1.6,
      showPills: false,
      splatBehind: true,
      breath,
    })

    drawNightSwatches(1170, 685, p, shake, breath)
  } else if (shot.id === 7) {
    // Shot 07 (17.75 - 22.45s): Tactical swap! Code island (-1.4 deg) -> Inkbrush slash (19.8-20.4 cardAreaOnly) -> Tool card (+1.4 deg, tapeLayout: 'tr-bl')
    drawStageBackground(true, t, n, shake)

    if (!shot.afterCut) {
      const codeEnter = outBack(clamp01(p / 0.45), 1.2)
      drawTiltedCard('tool-card-dark', 875, 420, 895, {
        tiltDeg: 2.8,
        enter: codeEnter,
        alpha: 0.8,
        shake,
        breath: getBreath(t, 7.7),
        dark: true,
        borderColor: PALETTE.pink,
        tape: false,
        register: true,
      })
      drawTiltedCard('code-dark', 748, 172, 955, {
        crop: [0, 0, 0.62, 1],
        tiltDeg: shot.cardTiltDeg,
        enter: codeEnter,
        slideX: (1 - outCubic(clamp01(p / 0.4))) * 80,
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
      drawTiltedCard('code-dark', 758, 152, 825, {
        crop: [0, 0, 0.62, 1],
        tiltDeg: -3.0,
        enter: 1,
        alpha: 0.72,
        shake,
        breath: getBreath(t, 7.7),
        dark: true,
        borderColor: '#525860',
        tape: false,
        register: true,
      })
      drawTiltedCard('tool-card-dark', 758, 365, 1045, {
        tiltDeg: shot.cardTiltDeg,
        enter: toolEnter,
        slideY: (1 - outCubic(clamp01(swapP / 0.35))) * 50,
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

    drawStickerHeadline(shot, p, true, {
      x: 76,
      y: 205,
      maxW: 625,
      titleSize: 70,
      tiltDeg: -1.8,
      splatBehind: true,
      breath,
    })
  } else if (shot.id === 8) {
    // Shot 08 (22.45 - 25.48s): Center-squad! Real 390px input-menu-mobile-dark (+0.8 deg)
    drawStageBackground(true, t, n, shake)

    const enter = outBack(clamp01(p / 0.34), 1.18)
    drawTiltedCard('input-menu-mobile-dark', 785, 134, 348, {
      tiltDeg: shot.cardTiltDeg,
      enter,
      slideY: (1 - outCubic(clamp01(p / 0.3))) * 26,
      shake,
      breath,
      dark: true,
      borderColor: PALETTE.lime,
      tapeColors: [PALETTE.pink, PALETTE.lime],
      badge: '390PX REAL',
    })

    ctx.save()
    ctx.translate(390, 250 + breath.by * 0.6)
    ctx.rotate(((-2.6 + breath.bt * 0.5) * Math.PI) / 180)
    const numScale = mix(0.86, 1, enter)
    ctx.scale(numScale, numScale)
    drawText('390PX', 0, 42, {
      size: 138,
      weight: 900,
      color: PALETTE.lime,
      align: 'center',
      strokeColor: PALETTE.ink,
      strokeWidth: 18,
      shadowColor: PALETTE.pink,
      shadowX: 8,
      shadowY: 8,
      pad: 4,
    })
    ctx.restore()
    pushProtectedRect(76, 150, 620, 175, 6)

    drawStickerHeadline(shot, p, true, {
      x: 76,
      y: 358,
      maxW: 640,
      titleSize: 68,
      tiltDeg: -1.8,
      showPills: false,
      splatBehind: false,
      breath,
    })

    drawBarcodeSticker(1505, 295, p, shake, breath)

    const rightPills = [...shot.featurePills, '双边不裁切', '菜单输入全保留']
    rightPills.forEach((pill, i) => {
      const pillEnter = outBack(clamp01((p - 0.14 - i * 0.09) / 0.36), 1.35)
      const pw = measureTextWidth(pill, 24, 900) + 54
      const ph = 52
      const cx = 1490 + (i % 2 === 0 ? -24 : 24) + shake.dx
      const cy = 485 + i * 74 + shake.dy + breath.by * 0.6
      const tilt = (i % 2 === 0 ? 1.8 : -2.1) + breath.bt * 0.7
      const fill = i % 2 === 0 ? PALETTE.lime : PALETTE.pink
      const fg = i % 2 === 0 ? PALETTE.ink : PALETTE.cream

      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(mix(0.84, 1, pillEnter), mix(0.84, 1, pillEnter))
      ctx.rotate((tilt * Math.PI) / 180)

      ctx.fillStyle = PALETTE.ink
      ctx.beginPath()
      ctx.roundRect(-pw / 2 + 5, -ph / 2 + 6, pw, ph, 26)
      ctx.fill()

      ctx.fillStyle = fill
      ctx.strokeStyle = PALETTE.ink
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 26)
      ctx.fill()
      ctx.stroke()

      drawText(pill, 0, 8, { size: 24, weight: 900, color: fg, align: 'center' })
      ctx.restore()
      pushProtectedRect(cx - pw / 2 - 12, cy - ph / 2 - 12, pw + 28, ph + 28, 4)
    })
  } else {
    // Shot 09 (25.48 - 30.00s): Turf War Result! Split Day-vs-Night Arena + facing Day & Night cards with VS clasp + Splatoon settlement bar (100% STATIC after 27.0s)
    dark = false
    drawSplitTurfArena(t, n, shake)

    const settleP = clamp01(p / 1.35)
    const cardEnter = outCubic(settleP)
    const lightDX = -(1 - cardEnter) * 72
    const darkDX = (1 - cardEnter) * 72

    // Bright DAY TURF card on left half-field
    drawTiltedCard('workspace-light', 616 + lightDX, 108, 576, {
      tiltDeg: shot.cardTiltDeg,
      enter: 1,
      enterScale: false,
      shake,
      breath,
      dark: false,
      borderColor: PALETTE.ink,
      tapeColors: [PALETTE.lime, PALETTE.pink],
      badge: 'DAY TURF',
    })

    // Dark NIGHT SHIFT card on right half-field
    drawTiltedCard('workspace-dark', 1244 + darkDX, 204, 584, {
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

    // VS clash medallion straddling the border between Day Turf and Night Shift
    const vsCX = 1222 + shake.dx
    const vsCY = 364 + shake.dy + breath.by * 0.6
    const vsScale = outBack(clamp01((p - 0.12) / 0.45), 1.45)
    ctx.save()
    ctx.translate(vsCX, vsCY)
    ctx.scale(vsScale, vsScale)
    ctx.rotate((-7 * Math.PI) / 180)
    // Comic 8-point starburst backing
    ctx.beginPath()
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8
      const r = i % 2 === 0 ? 68 : 42
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

    drawText('VS', 0, 18, {
      size: 52,
      weight: 900,
      color: PALETTE.pink,
      align: 'center',
      strokeColor: PALETTE.ink,
      strokeWidth: 11,
      shadowColor: PALETTE.paper,
      shadowX: 3,
      shadowY: 3,
    })
    ctx.restore()
    pushProtectedRect(vsCX - 72, vsCY - 72, 144, 144, 4)

    // Left brand column + street install namecard
    drawStickerHeadline(shot, settleP * 2, false, {
      x: 74,
      y: 126,
      maxW: 516,
      titleSize: 108,
      tiltDeg: -2.4,
      showPills: false,
      showSub: false,
      splatBehind: true,
      staticMode: true,
    })

    const subCX = 272
    const subCY = 344
    drawRotatedPill(subCX, subCY, 396, 56, -1.5, PALETTE.ink, PALETTE.ink, PALETTE.pink, 6, 12)
    ctx.save()
    ctx.translate(subCX, subCY)
    ctx.rotate((-1.5 * Math.PI) / 180)
    drawText('SPLAT-STREET', 0, 14, { size: 40, weight: 900, color: PALETTE.lime, align: 'center' })
    ctx.restore()
    pushProtectedRect(70, 310, 412, 72, 6)

    drawFinaleNamecard(74, 408, 516, 186, shake)

    // Bottom Splatoon-2 Settlement Bar (animated surge -> tug-of-war -> 50:50 lock before 27.0s)
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

  canvas.width = Math.round(innerWidth * devicePixelRatio)
  canvas.height = Math.round((innerWidth * 9 * devicePixelRatio) / 16)
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
    dark = renderShotScene(activeShot, t, shake, transitionDrawsOverHUD)
  }

  // Ambient deterministic street spray particles (skipped after STATIC_HOLD_START = 27.5s)
  let particles = { drawn: 0, rejected: 0, overlaps: 0, layers: 3 }
  if (t < STATIC_HOLD_START) {
    particles = drawAmbientSplats(ctx, t, activeShot.localTime, W, H, protectedRects, dark)
  }

  let transitionDiag = { active: false, type: null, fullCover: false, clipReveal: false }
  if (activeTransition) {
    transitionDiag = renderTransition(ctx, activeTransition, activeTransition.progress, W, H)
  }

  if (!transitionDrawsOverHUD) {
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
window.__PROMO_READY__ = true

await window.renderAt(0)

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
    await window.renderAt(Number(seek.value))
    label.value = `${Number(seek.value).toFixed(2)} / 30`
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
