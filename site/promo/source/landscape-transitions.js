/**
 * Pure deterministic Canvas 2D Splatoon-inspired weapon transitions & ink FX engine
 * for the SPLAT-STREET landscape promo.
 *
 * Every function derives all geometry, splatter lobes, particles, and animation phases
 * strictly from passed parameters (`t`, `p`, `seed`) without mutable frame state or Math.random().
 */

const PALETTE = {
  ink: '#121212',
  lime: '#1edc00',
  limeDeep: '#129c00',
  limeHi: '#6ef757',
  pink: '#ff2d8a',
  pinkDeep: '#ad006c',
  pinkHi: '#ff8cc2',
  paper: '#fffef9',
  cream: '#fbfbf4',
  metal: '#cfd4d8',
  metalDark: '#525860',
  metalLight: '#f2f5f7',
}

const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v))
const lerp = (a, b, t) => a + (b - a) * t
const easeOutCubic = (t) => 1 - (1 - clamp(t)) ** 3
const easeInCubic = (t) => clamp(t) ** 3
const easeOutExpo = (t) => {
  const x = clamp(t)
  return x === 1 ? 1 : 1 - 2 ** (-10 * x)
}
const easeOutBack = (t, overshoot = 1.70158) => {
  const x = clamp(t) - 1
  return 1 + (overshoot + 1) * x ** 3 + overshoot * x ** 2
}

function getCutProgress(transition, fallback = 0.56) {
  if (transition && transition.start != null && transition.end != null && transition.cutAt != null && transition.end > transition.start) {
    return clamp((transition.cutAt - transition.start) / (transition.end - transition.start))
  }
  return transition?.cutP ?? fallback
}

/** Deterministic PRNG in [0, 1) from any numeric seed. */
function rand(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}

function randRange(seed, min, max) {
  return min + rand(seed) * (max - min)
}

function isDarkHex(color) {
  if (typeof color !== 'string' || !color.startsWith('#') || (color.length !== 7 && color.length !== 4)) return false
  const hex = color.length === 4 ? `${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}` : color.slice(1)
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return r * 0.299 + g * 0.587 + b * 0.114 < 110
}

/** Trace closed quadratic midpoint spline through [[x, y], ...]. */
function traceSmoothClosed(ctx, points) {
  const last = points[points.length - 1]
  const first = points[0]
  ctx.beginPath()
  ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2)
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const next = points[(i + 1) % points.length]
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + next[0]) / 2, (p[1] + next[1]) / 2)
  }
  ctx.closePath()
}

const SQUID_ENV_D =
  'M124.6 30.3C121.8 30.8 118.4 31.1 114 33.3C109.7 35.4 103.7 39 98.4 43.2C93.1 47.3 86.7 53.6 82.3 58.3C77.8 63 75.4 66 71.8 71.1C68.1 76.2 63.4 83.3 60.1 89C56.9 94.6 54.3 100.3 52.4 104.9C50.4 109.6 49.3 112.3 48.3 116.7C47.3 121 46.3 127.4 46.5 131.1C46.6 134.8 48 136.8 49.3 138.8C50.7 140.7 52.7 141.7 54.6 142.7C56.6 143.7 57.9 144.2 61.2 144.5C64.4 144.8 72 142.3 73.9 144.5C75.8 146.7 72.4 153.5 72.4 157.5C72.4 161.6 73 165.4 73.8 168.9C74.6 172.3 75.7 175.4 77.1 178.3C78.6 181.1 81.1 184.1 82.7 185.9C84.4 187.6 85.3 188 86.9 188.7C88.5 189.5 90.8 190.1 92.4 190.3C94 190.4 94.9 190.2 96.6 189.6C98.2 189 100.4 185.8 102.3 186.6C104.2 187.4 105.7 192.8 107.8 194.7C110 196.5 112.8 197.6 115.3 197.7C117.8 197.9 120.4 196.9 122.7 195.5C124.9 194 127.3 189.5 128.8 189.1C130.3 188.6 131.4 190.5 131.7 192.7C132 195 130.4 200 130.5 202.4C130.5 204.8 130.9 205.5 132 207C133.2 208.4 135.6 210.4 137.5 211.2C139.4 212 141.8 212 143.7 211.6C145.5 211.3 147.3 210.3 148.7 209.2C150.1 208.1 151.2 206.5 151.8 204.8C152.4 203.2 152.6 201.6 152.4 199.3C152.3 197.1 150.7 193.5 150.7 191.4C150.7 189.3 151.2 187 152.6 186.7C154.1 186.4 157.1 189.2 159.4 189.7C161.6 190.2 164.1 190.3 166.2 189.7C168.4 189.2 170.5 188 172.5 186.3C174.4 184.6 176.4 182 177.9 179.4C179.4 176.8 180.5 173.9 181.4 170.6C182.3 167.3 183.1 164.1 183.2 159.7C183.3 155.4 179.8 147 181.7 144.5C183.7 142 191.3 145 194.9 144.5C198.6 144 201.5 142.7 203.6 141.4C205.8 140 206.9 138.8 207.8 136.3C208.7 133.8 209.4 130 209.2 126.3C208.9 122.6 208.1 119.1 206.5 114C204.8 109 202.4 102.3 199.2 95.9C195.9 89.4 191.3 81.8 187 75.5C182.6 69.2 177.6 63.1 173.1 58.1C168.7 53.1 164.5 49.2 160.1 45.6C155.8 41.9 150.7 38.3 146.9 35.9C143 33.6 139.8 32.5 137.2 31.6C134.6 30.6 133.2 30.4 131.1 30.2C129 30 127.4 29.8 124.6 30.3Z M106.7 224.8C108.8 225.7 112.1 225.8 114.3 224.9C116.5 224.1 118.7 221.3 119.8 219.9C120.8 218.5 120.7 217.8 120.8 216.5C120.8 215.1 120.6 213.2 120.1 211.9C119.6 210.5 118.8 209.3 117.9 208.3C117 207.4 116 206.7 114.8 206.2C113.5 205.7 111.9 205.2 110.4 205.3C109 205.3 107.4 205.9 106.3 206.4C105.1 206.9 104.3 207.5 103.5 208.4C102.6 209.3 101.7 210.5 101.2 211.9C100.7 213.2 100.5 215.1 100.6 216.5C100.6 217.8 100.5 218.5 101.5 219.9C102.6 221.3 104.6 224 106.7 224.8Z M167.7 194.8C166.1 194.6 165.3 195.2 164.2 195.7C163.2 196.2 162.2 196.6 161.3 198C160.3 199.4 158.7 202.1 158.6 204.2C158.6 206.2 160.1 208.7 161 210.1C162 211.5 163 212.1 164.2 212.7C165.4 213.3 166.8 213.6 168.1 213.6C169.3 213.6 170.5 213.4 171.7 212.8C172.8 212.3 173.9 211.8 174.9 210.3C175.9 208.9 177.2 205.8 177.4 204.2C177.7 202.5 177.1 201.5 176.5 200.3C176 199.1 175.5 198 174 197.1C172.5 196.2 169.4 195.1 167.7 194.8Z'
const SQUID_EYE_MASK_D =
  'M81.6 119.3C81.9 121.8 82.3 123.1 83.2 125.2C84.1 127.2 85.4 129.6 86.9 131.5C88.4 133.5 90 135.2 92.2 136.8C94.4 138.4 97.6 140 100 140.9C102.3 141.8 104.2 142.2 106.5 142.3C108.8 142.5 111.3 142.3 113.9 141.8C116.4 141.2 119.3 140.2 121.7 139C124 137.8 125.5 134.5 127.9 134.6C130.3 134.8 133.7 138.8 136 140C138.4 141.2 139.9 141.5 142.1 141.8C144.3 142.2 146.9 142.5 149.2 142.3C151.4 142.2 153.8 141.5 155.7 140.9C157.5 140.3 158.9 139.6 160.2 138.9C161.6 138.2 162.2 137.8 163.7 136.6C165.1 135.4 167.5 133 168.7 131.5C170 130.1 170.4 129.3 171.2 127.8C171.9 126.3 172.8 124.2 173.4 122.5C173.9 120.9 174.2 119.4 174.4 117.9C174.6 116.4 174.5 114.8 174.5 113.5C174.5 112.3 174.6 111.8 174.4 110.5C174.2 109.1 173.5 106.7 173 105.2C172.6 103.8 172.4 102.9 171.7 101.7C171.1 100.5 170.9 99.7 169.4 97.9C167.8 96.2 164.7 92.8 162.5 91.1C160.4 89.5 158.6 88.8 156.4 88C154.3 87.2 152.1 86.6 149.6 86.5C147.1 86.3 144.1 86.4 141.3 87C138.5 87.7 135.1 89.2 132.8 90.3C130.5 91.5 129 94 127.7 94.2C126.3 94.4 126 92.5 124.7 91.6C123.4 90.6 121.8 89.5 119.7 88.7C117.5 87.8 114 86.9 111.7 86.5C109.5 86.1 108.1 86.2 106 86.5C104 86.7 101.3 87.4 99.5 87.9C97.8 88.4 97.1 88.7 95.6 89.6C94 90.6 91.8 92.1 90.2 93.5C88.7 94.9 87.3 96.6 86.3 97.9C85.3 99.3 84.9 99.4 84.1 101.4C83.2 103.5 81.7 107.1 81.3 110.1C80.9 113.1 81.3 116.7 81.6 119.3Z'
const SQUID_EYES_D =
  'M85.1 112.6C85 115.2 85.3 118.5 85.8 120.8C86.3 123 87.2 124.6 88 126.1C88.8 127.6 88.9 128.2 90.4 129.8C92 131.3 95.3 134.1 97.2 135.4C99.1 136.6 100.2 136.9 101.7 137.4C103.3 137.9 104.5 138.3 106.5 138.4C108.4 138.5 111.6 138.2 113.5 137.9C115.4 137.6 116.4 137.2 118.1 136.4C119.8 135.5 122.2 134 123.8 132.8C125.4 131.6 125.8 128.8 127.7 129.2C129.5 129.5 132.9 133.8 135.2 135.2C137.5 136.6 139.2 137.2 141.5 137.7C143.7 138.2 146.6 138.4 148.7 138.4C150.8 138.3 151.8 138.2 153.9 137.4C156 136.6 159.5 134.7 161.4 133.5C163.3 132.2 164 131.4 165.2 129.8C166.4 128.2 168 125.5 168.8 123.7C169.6 121.9 169.9 121.5 170.1 119.3C170.4 117 170.6 112.6 170.4 110.1C170.1 107.6 169.3 105.8 168.5 104.1C167.8 102.3 166.7 101 165.8 99.7C165 98.5 164.5 97.7 163.2 96.6C162 95.5 159.8 94 158.3 93.1C156.8 92.3 155.8 91.9 154.4 91.4C152.9 91 151.3 90.6 149.6 90.4C147.9 90.3 145.8 90.2 143.9 90.5C142 90.7 140 91.4 138.4 92C136.7 92.6 135.8 93 134 94.2C132.3 95.4 130.1 99.5 127.9 99.5C125.8 99.4 123.6 95.4 121.4 94C119.1 92.6 116.9 91.6 114.3 91C111.8 90.4 108.2 90.4 106 90.4C103.9 90.5 103.2 90.7 101.3 91.4C99.4 92.2 96.3 93.7 94.4 95.1C92.5 96.5 91.1 97.9 89.8 99.7C88.5 101.5 87.4 103.5 86.6 105.7C85.8 107.8 85.3 110.1 85.1 112.6Z'
const SQUID_PUPILS_D =
  'M109.8 103.3C114.7 103.3 118.6 107.9 118.6 113.5C118.6 119.1 114.7 123.7 109.8 123.7C104.9 123.7 101 119.1 101 113.5C101 107.9 104.9 103.3 109.8 103.3Z M145.7 103.3C150.6 103.3 154.5 107.9 154.5 113.5C154.5 119.1 150.6 123.7 145.7 123.7C140.8 123.7 136.9 119.1 136.9 113.5C136.9 107.9 140.8 103.3 145.7 103.3Z'

const OCTO_ENV_D =
  'M35.4 141.2C34.6 143 34.1 144.5 33.7 146.5C33.4 148.6 33.1 151.5 33.2 153.6C33.3 155.6 33.7 157.1 34.3 159.1C35 161.1 35.2 163 37.1 165.5C39 168 42.1 171.9 45.6 174.2C49.1 176.5 55.9 177.3 58.1 179.3C60.2 181.4 57.6 184.3 58.4 186.5C59.2 188.7 61.5 191.1 62.9 192.5C64.4 193.9 65.3 194.2 67.1 194.9C68.9 195.6 71.2 196.6 73.9 196.8C76.7 197.1 80.3 197.1 83.6 196.4C86.9 195.7 90.3 194.4 93.6 192.4C97 190.4 101.9 185.2 103.7 184.3C105.5 183.5 104.7 186.2 104.4 187.4C104.2 188.7 102.8 190.3 102.4 191.9C102.1 193.5 101.9 195.4 102.4 197C103 198.6 104.6 200.5 105.9 201.5C107.1 202.5 108.1 203 110 203C111.9 203 115.4 202.5 117.4 201.7C119.4 200.8 120.9 199.3 122.1 198C123.3 196.7 124.1 195.7 124.8 194.1C125.5 192.5 126.2 191.5 126.4 188.3C126.7 185.1 125.9 178.1 126.1 175.1C126.2 172.2 126.9 171.3 127.3 170.6C127.7 170 127.9 170.4 128.2 171.2C128.6 171.9 129 172.3 129.1 175.1C129.2 178 128.4 184.9 128.8 188.3C129.1 191.7 130 193.3 131.3 195.4C132.6 197.5 135 199.6 136.5 200.8C137.9 201.9 138.7 202.1 140 202.5C141.3 202.9 142.8 203.2 144.3 203C145.8 202.9 147.7 202.4 149.1 201.7C150.4 200.9 151.6 199.6 152.3 198.3C153 197.1 153.6 196 153.3 194.1C153 192.1 151 188.2 150.7 186.6C150.5 184.9 150.2 183.5 151.8 184.4C153.4 185.2 157 189.5 160.2 191.5C163.5 193.5 167.7 195.4 171.2 196.3C174.7 197.2 178.1 197.3 181.3 196.8C184.4 196.4 187.6 195.4 190.1 193.9C192.7 192.3 195.4 189.9 196.5 187.5C197.7 185.1 195.5 181.2 197.1 179.3C198.8 177.4 204.3 177 206.6 176C208.9 175 209.2 174.7 210.9 173.3C212.6 171.9 215.2 169.5 216.7 167.6C218.1 165.8 218.8 164.6 219.7 162.3C220.6 160 221.9 157 222 153.6C222 150.1 221.3 145 220.1 141.8C218.9 138.5 216.9 136.1 214.7 134C212.6 131.8 209.3 129.9 207.2 128.8C205 127.7 204.1 127.5 202 127.4C199.8 127.3 196.7 127.3 194.3 128C191.8 128.8 189.1 130.5 187.5 131.8C185.8 133.1 185.1 134.5 184.2 136C183.4 137.6 182.6 139.4 182.4 141.3C182.2 143.1 182.3 145.3 182.9 147.3C183.6 149.3 185 151.5 186.4 153.1C187.7 154.7 191.1 156.5 190.9 156.6C190.6 156.7 186.7 155.2 184.8 153.8C183 152.3 180.8 149.5 179.9 147.8C178.9 146 178.9 145 178.9 143.4C178.9 141.9 177.8 142.8 179.9 138.7C181.9 134.5 188.4 124.7 190.9 118.6C193.5 112.4 194.4 106.4 195.1 101.6C195.8 96.9 195.4 93.8 195.1 90.2C194.8 86.6 194.1 83.4 193.3 80.2C192.4 76.9 191.6 74 190.1 70.6C188.6 67.3 187.2 64.1 184.3 60.1C181.4 56.1 176.5 50.2 172.7 46.6C168.9 43.1 165.6 40.9 161.4 38.6C157.2 36.2 152.2 34 147.6 32.6C143 31.1 139.2 30.1 133.7 29.8C128.3 29.4 119.7 30.1 114.9 30.7C110.2 31.3 108.8 32 105.2 33.3C101.7 34.6 97.6 36.4 93.8 38.6C90.1 40.8 85.5 44.2 82.7 46.4C79.9 48.7 79 49.9 77 52.1C75 54.4 72.7 57.3 70.9 60.1C69 62.9 67.7 64.4 66 68.9C64.3 73.3 61.5 81.3 60.6 86.7C59.6 92.1 59.8 97 60.1 101.2C60.3 105.4 61.2 108.6 61.9 111.7C62.7 114.7 62.4 114.7 64.7 119.5C67 124.2 73.9 135.4 75.8 140C77.6 144.6 76.3 144.9 75.8 146.9C75.3 148.8 74 150.4 72.8 151.8C71.6 153.1 70 154.2 68.5 155C67.1 155.8 64.3 156.6 64.2 156.5C64.1 156.4 66.6 155.2 67.7 154.2C68.9 153.2 70.1 151.8 71 150.4C71.8 149 72.5 147.1 72.8 145.6C73.1 144.1 73 142.7 72.8 141.3C72.6 139.9 72.3 138.6 71.6 137.2C70.9 135.8 70.5 134.2 68.6 132.7C66.8 131.1 63.3 128.8 60.6 127.9C58 127.1 55.5 127 52.8 127.4C50.2 127.8 47.2 129 44.8 130.4C42.4 131.8 40.1 134.2 38.5 136C36.9 137.8 36.2 139.5 35.4 141.2Z M86.2 224.7C87.5 225.4 89.3 225.7 90.7 225.8C92.2 225.8 93.7 225.4 95 224.9C96.2 224.5 97.2 223.8 98.1 222.9C99.1 221.9 100.1 220.5 100.7 219.3C101.4 218.2 101.6 217.5 101.8 216C102 214.5 102.1 212.1 101.7 210.4C101.4 208.7 100.8 207.1 99.8 205.7C98.9 204.4 97.2 203 95.8 202.3C94.5 201.5 93.4 201.3 92 201.3C90.5 201.4 88.5 202.1 87.2 202.7C85.9 203.3 85.1 203.7 84.1 204.9C83.1 206 81.6 207.5 81 209.7C80.4 211.8 80.2 215.7 80.4 217.7C80.7 219.7 81.6 220.6 82.5 221.7C83.5 222.9 84.8 224 86.2 224.7Z M159.9 202C158.7 202.6 157 203.9 156 205.1C155 206.2 154.3 207.3 153.9 209.1C153.5 210.8 153.3 213.9 153.4 215.6C153.4 217.3 153.8 217.9 154.3 219C154.9 220.1 155.7 221.4 156.6 222.4C157.6 223.4 158.6 224.4 160.2 224.9C161.9 225.5 164.9 225.5 166.3 225.5C167.8 225.4 167.9 225.4 169 224.7C170.1 224 172 222.5 172.9 221.5C173.8 220.6 174.1 221 174.3 219C174.6 217.1 174.7 212 174.2 209.7C173.7 207.3 172.3 206.2 171.4 205.1C170.4 203.9 169.9 203.6 168.6 203C167.3 202.4 165.1 201.5 163.7 201.4C162.2 201.2 161.2 201.4 159.9 202Z'
const OCTO_EYE_MASK_D =
  'M81.2 110.9C81.3 114 82.5 119 83.5 121.8C84.5 124.6 85.9 126.2 87.1 127.8C88.4 129.5 89.9 130.7 91.1 131.8C92.3 132.8 93.4 133.4 94.5 134.1C95.7 134.7 96.5 135.1 98.2 135.6C99.9 136.1 102.8 136.8 104.7 137.1C106.6 137.3 107.3 137.4 109.5 136.9C111.6 136.5 115.6 135.3 117.5 134.5C119.5 133.7 119.7 133.6 121.4 132.2C123.1 130.8 125.6 126.3 127.6 126.3C129.6 126.3 131.2 130.3 133.6 132C135.9 133.6 139.7 135.2 141.8 136.1C143.8 136.9 144.6 136.8 146.1 137C147.6 137.2 148.9 137.3 150.9 137C153 136.7 156.1 136.1 158.3 135.2C160.5 134.3 162.1 133.5 164.1 131.8C166.1 130 168.8 126.8 170.2 124.7C171.7 122.6 171.9 121.4 172.6 119.2C173.2 116.9 174.1 114.2 174 111.3C173.9 108.4 173.1 104.5 172.1 101.7C171.2 98.9 170.1 96.8 168.3 94.6C166.5 92.4 163.6 90 161.5 88.6C159.5 87.2 157.8 86.8 156 86.2C154.2 85.7 152.6 85.3 150.9 85.1C149.2 85 147.7 84.8 145.7 85.2C143.6 85.5 140.8 86.3 138.5 87.3C136.3 88.3 134.1 89.7 132.3 91.1C130.4 92.6 129.5 96.2 127.6 95.9C125.7 95.6 123.1 91 120.7 89.4C118.4 87.7 115.3 86.8 113.4 86.1C111.6 85.5 111.1 85.4 109.5 85.2C107.9 85 105.9 84.9 103.8 85.2C101.7 85.5 98.9 86.2 96.9 87C94.8 87.8 93.5 88.2 91.5 90C89.6 91.7 86.4 95.3 85 97.5C83.5 99.7 83.3 100.8 82.6 103C82 105.3 81 107.8 81.2 110.9Z'
const OCTO_EYES_D =
  'M86 114C86.3 115.7 86.9 118.5 87.6 120.3C88.3 122.1 89.2 123.3 90.2 124.7C91.3 126 92.4 127.3 94 128.4C95.6 129.6 98.3 131 100 131.7C101.6 132.3 102.4 132.4 103.9 132.6C105.3 132.8 106.7 133 108.7 132.6C110.6 132.3 113.4 131.7 115.5 130.7C117.6 129.7 119.4 128.4 121.2 126.7C122.9 124.9 124.8 121.5 125.9 120.4C127 119.3 127 119.7 127.6 119.8C128.2 119.9 128.8 120.1 129.8 121.2C130.8 122.3 132 124.8 133.5 126.3C135.1 127.8 137.2 129.2 138.9 130.2C140.5 131.2 141.6 131.7 143.5 132.1C145.5 132.5 148.7 132.7 150.5 132.7C152.2 132.7 152.5 132.5 153.9 132.1C155.3 131.7 157.1 131.2 158.9 130.1C160.7 128.9 163.1 126.8 164.6 125.2C166 123.5 166.8 122.5 167.6 120.3C168.5 118.2 169.4 114.5 169.6 112.2C169.8 109.9 169.5 108.5 169.1 106.6C168.6 104.6 168.2 102.5 166.9 100.4C165.6 98.3 163 95.3 161.3 93.7C159.5 92.2 158.3 91.7 156.6 91C154.8 90.3 152.3 89.8 150.5 89.5C148.7 89.3 147.3 89.4 145.7 89.6C144.1 89.8 142.7 90.1 140.9 91C139.1 91.8 136.6 93.1 134.7 94.8C132.8 96.6 130.7 100.3 129.4 101.5C128.2 102.8 127.7 102.2 127.2 102.3C126.6 102.3 126.8 102.8 125.9 101.8C125.1 100.8 123.5 97.9 122.1 96.4C120.7 94.8 119.6 93.7 117.5 92.5C115.5 91.4 112.1 90.2 109.9 89.7C107.7 89.2 106.6 89.1 104.3 89.5C102 90 98.3 90.9 96 92.3C93.7 93.6 91.8 95.4 90.2 97.5C88.7 99.6 87.4 102.7 86.6 104.8C85.8 106.9 85.7 108.5 85.6 110C85.5 111.5 85.6 112.3 86 114Z'
const OCTO_PUPILS_D =
  'M146.3 100.3C151.5 100.3 155.7 105.1 155.7 111.1C155.7 117.1 151.5 121.9 146.3 121.9C141.1 121.9 136.9 117.1 136.9 111.1C136.9 105.1 141.1 100.3 146.3 100.3Z M108.9 100.3C114.1 100.3 118.3 105.1 118.3 111.1C118.3 117.1 114.1 121.9 108.9 121.9C103.7 121.9 99.5 117.1 99.5 111.1C99.5 105.1 103.7 100.3 108.9 100.3Z'

const SQUID_PATHS = {
  env: new Path2D(SQUID_ENV_D),
  eyes: new Path2D(SQUID_EYES_D),
  pupils: new Path2D(SQUID_PUPILS_D),
  solid: new Path2D(`${SQUID_ENV_D} ${SQUID_EYE_MASK_D} ${SQUID_EYES_D} ${SQUID_PUPILS_D}`),
}
const OCTO_PATHS = {
  env: new Path2D(OCTO_ENV_D),
  eyes: new Path2D(OCTO_EYES_D),
  pupils: new Path2D(OCTO_PUPILS_D),
  solid: new Path2D(`${OCTO_ENV_D} ${OCTO_EYE_MASK_D} ${OCTO_EYES_D} ${OCTO_PUPILS_D}`),
}

/** Draw a 4-pointed Splatoon comic impact starburst. */
function drawStarburst(ctx, x, y, outerR, innerR, color, rotation = 0, outlineColor = null, outlineWidth = 3) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    const r = i % 2 === 0 ? outerR : innerR
    const px = Math.cos(a) * r
    const py = Math.sin(a) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  if (outlineColor && outlineWidth > 0) {
    ctx.strokeStyle = outlineColor
    ctx.lineWidth = outlineWidth * 2
    ctx.lineJoin = 'round'
    ctx.stroke()
  }
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

/**
 * Draw an organic multi-lobed Splatoon ink splat with alternating long/short tentacles,
 * peripheral satellite droplets, optional sticker outline, and glossy highlight.
 */
export function drawSplatBlob(ctx, x, y, radius, color, seed = 1, options = {}) {
  if (radius <= 0.2) return
  const lobeCount = options.lobes ?? 7 + Math.floor(rand(seed + 1.3) * 4)
  const outlineWidth = options.outlineWidth ?? (options.outlineColor ? Math.max(2.5, radius * 0.08) : 0)
  const outlineColor = options.outlineColor ?? (outlineWidth > 0 ? PALETTE.ink : null)
  const highlight = options.highlight !== false
  const highlightColor = options.highlightColor ?? '#ffffff'
  const highlightAlpha = options.highlightAlpha ?? (isDarkHex(color) ? 0.24 : 0.42)
  const satOption = options.satellites ?? true
  const satCount = typeof satOption === 'number' ? satOption : satOption ? 6 + Math.floor(rand(seed + 2.7) * 5) : 0
  const rotation = options.rotation ?? 0
  const scaleX = options.scaleX ?? 1
  const scaleY = options.scaleY ?? 1
  const alpha = options.alpha ?? 1
  const step = (Math.PI * 2) / lobeCount

  const lobeAngles = []
  const tipRadii = []
  const bulbHalfAngles = []
  for (let i = 0; i < lobeCount; i++) {
    const jitter = (rand(seed + i * 3.1 + 0.5) - 0.5) * step * 0.36
    lobeAngles.push(i * step + jitter)
    const isLong = i % 2 === 0 ? rand(seed + i * 9.1) > 0.16 : rand(seed + i * 9.1) > 0.78
    const tipR = radius * (isLong ? randRange(seed + i * 11.3, 1.18, 1.56) : randRange(seed + i * 11.3, 0.82, 1.1))
    tipRadii.push(tipR)
    bulbHalfAngles.push(step * (isLong ? randRange(seed + i * 13.7, 0.13, 0.2) : randRange(seed + i * 13.7, 0.17, 0.24)))
  }

  const valleyAngles = []
  const valleyRadii = []
  for (let i = 0; i < lobeCount; i++) {
    const a0 = lobeAngles[i]
    const a1 = i === lobeCount - 1 ? lobeAngles[0] + Math.PI * 2 : lobeAngles[i + 1]
    const mid = (a0 + a1) * 0.5 + (rand(seed + i * 17.1) - 0.5) * (a1 - a0) * 0.12
    valleyAngles.push(mid)
    valleyRadii.push(radius * randRange(seed + i * 19.3, 0.52, 0.72))
  }

  const points = []
  for (let i = 0; i < lobeCount; i++) {
    const a = lobeAngles[i]
    const tipR = tipRadii[i]
    const prevValleyR = valleyRadii[(i - 1 + lobeCount) % lobeCount]
    const nextValleyR = valleyRadii[i]
    const prevMid = i === 0 ? valleyAngles[lobeCount - 1] - Math.PI * 2 : valleyAngles[i - 1]
    const nextMid = valleyAngles[i]
    const bw = Math.min(bulbHalfAngles[i], (a - prevMid) * 0.42, (nextMid - a) * 0.42)
    const neckLeftR = lerp(prevValleyR, tipR, 0.36)
    const neckRightR = lerp(nextValleyR, tipR, 0.36)

    const samples = [
      [a - bw * 1.15, neckLeftR],
      [a - bw * 0.62, tipR * 0.94],
      [a, tipR],
      [a + bw * 0.62, tipR * 0.94],
      [a + bw * 1.15, neckRightR],
      [nextMid, nextValleyR],
    ]
    for (const [ang, rad] of samples) {
      points.push([Math.cos(ang) * rad, Math.sin(ang) * rad])
    }
  }

  ctx.save()
  ctx.translate(x, y)
  if (rotation) ctx.rotate(rotation)
  if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY)
  if (alpha !== 1) ctx.globalAlpha *= alpha

  // Hard comic offset shadow when requested
  if (options.shadowColor) {
    ctx.save()
    ctx.translate(options.shadowOffsetX ?? 5, options.shadowOffsetY ?? 7)
    traceSmoothClosed(ctx, points)
    ctx.fillStyle = options.shadowColor
    ctx.fill()
    ctx.restore()
  }

  // Main body outline + fill
  traceSmoothClosed(ctx, points)
  if (outlineColor && outlineWidth > 0) {
    ctx.strokeStyle = outlineColor
    ctx.lineWidth = outlineWidth * 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
  }
  ctx.fillStyle = color
  ctx.fill()

  // Glossy wet ink highlight
  if (highlight && radius >= 8) {
    ctx.save()
    ctx.globalAlpha *= highlightAlpha
    ctx.fillStyle = highlightColor
    ctx.translate(-radius * 0.24, -radius * 0.26)
    ctx.rotate(-Math.PI / 4)
    ctx.beginPath()
    ctx.ellipse(0, 0, radius * 0.24, radius * 0.095, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(radius * 0.33, 0, radius * 0.065, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Peripheral independent satellite droplets along radial trajectories
  for (let i = 0; i < satCount; i++) {
    const baseLobe = lobeAngles[i % lobeCount]
    const sa = baseLobe + (rand(seed + i * 23.9) - 0.5) * step * 0.72
    const dist = radius * randRange(seed + i * 29.1, 1.24, 1.88)
    const rx = radius * randRange(seed + i * 31.3, 0.06, 0.145)
    const ry = rx * randRange(seed + i * 37.7, 0.62, 0.92)
    const sx = Math.cos(sa) * dist
    const sy = Math.sin(sa) * dist
    ctx.beginPath()
    ctx.ellipse(sx, sy, rx, ry, sa, 0, Math.PI * 2)
    if (outlineColor && outlineWidth > 0 && rx >= 3.5) {
      ctx.strokeStyle = outlineColor
      ctx.lineWidth = Math.max(2, outlineWidth * 1.2)
      ctx.stroke()
    }
    ctx.fillStyle = color
    ctx.fill()
  }

  ctx.restore()
}

/**
 * Draw the unified SPLAT-STREET squid (or symmetrical octopus easter-egg) using 256x256 vector Path2D geometry.
 */
export function drawSquidIcon(ctx, x, y, size = 64, rotation = 0, color = PALETTE.lime, outlineColor = PALETTE.ink, eyeColor = PALETTE.paper, options = {}) {
  const vec = options.species === 'octo' ? OCTO_PATHS : SQUID_PATHS
  const scale = size / 256
  if (scale <= 0) return

  ctx.save()
  ctx.translate(x, y)
  if (rotation) ctx.rotate(rotation)
  ctx.scale(scale, scale)
  ctx.translate(-128, -128)

  // Wallpaper / monochrome 4-layer evenodd cutout mode (eyes & pupils remain transparent background holes)
  if (!outlineColor && options.pupils === false) {
    ctx.fillStyle = color
    ctx.fill(vec.solid, 'evenodd')
    ctx.restore()
    return
  }

  if (options.shadowColor) {
    ctx.save()
    ctx.translate((options.shadowOffsetX ?? 3) * 4, (options.shadowOffsetY ?? 4) * 4)
    ctx.fillStyle = options.shadowColor
    ctx.fill(vec.env)
    ctx.restore()
  }

  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  if (outlineColor) {
    ctx.strokeStyle = outlineColor
    ctx.lineWidth = (options.outlineWidth ?? 6) * 3.5
    ctx.stroke(vec.env)
  }
  ctx.fillStyle = color
  ctx.fill(vec.env)

  if (eyeColor) {
    if (!options.noEyeFrame) {
      ctx.strokeStyle = outlineColor || PALETTE.ink
      ctx.lineWidth = 10
      ctx.stroke(vec.eyes)
    }
    ctx.fillStyle = eyeColor
    ctx.fill(vec.eyes)
    const showPupils = options.pupils ?? !isDarkHex(eyeColor)
    if (showPupils) {
      ctx.fillStyle = outlineColor || PALETTE.ink
      ctx.fill(vec.pupils)
    }
  }

  ctx.restore()
}

/**
 * Draw a detailed physical Splat Roller weapon (ink-soaked cylinder with rolling paint stripes,
 * brushed metal U-brackets, central T-collar, and rear rubberized handle).
 * Positioned with the rolling contact center at (x, y) facing `facing` (+1 right, -1 left).
 */
function drawSplatRollerWeapon(ctx, x, y, rollerLen, rollerRadius, rollPhase, primaryColor, secondaryColor, facing = 1) {
  const halfLen = rollerLen / 2
  const bracketPad = Math.max(14, rollerRadius * 0.34)
  const collarX = -facing * (rollerRadius + bracketPad * 1.45)
  const shaftLen = Math.max(150, Math.min(540, rollerLen * 0.46))
  const armThick = Math.max(10, rollerRadius * 0.24)
  const outlineW = Math.max(4, rollerRadius * 0.11)

  ctx.save()
  ctx.translate(x, y)

  // Drop shadow behind entire weapon
  ctx.save()
  ctx.translate(facing * -8 + 10, 14)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)'
  ctx.beginPath()
  ctx.roundRect(-rollerRadius, -halfLen, rollerRadius * 2, rollerLen, rollerRadius * 0.72)
  ctx.fill()
  ctx.restore()

  // Rear shaft & Splatoon grip
  const handleEndX = collarX - facing * shaftLen
  const handleEndY = halfLen * 0.18
  ctx.save()
  ctx.lineCap = 'round'
  // Shaft outer ink outline
  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = armThick * 1.45
  ctx.beginPath()
  ctx.moveTo(collarX, 0)
  ctx.lineTo(handleEndX, handleEndY)
  ctx.stroke()
  // Metallic shaft body
  ctx.strokeStyle = PALETTE.metal
  ctx.lineWidth = armThick * 0.9
  ctx.beginPath()
  ctx.moveTo(collarX, 0)
  ctx.lineTo(handleEndX, handleEndY)
  ctx.stroke()
  // Rubber handle sleeve (rear 48%)
  const gripStartX = lerp(collarX, handleEndX, 0.52)
  const gripStartY = lerp(0, handleEndY, 0.52)
  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = armThick * 1.9
  ctx.beginPath()
  ctx.moveTo(gripStartX, gripStartY)
  ctx.lineTo(handleEndX, handleEndY)
  ctx.stroke()
  // Accent grip ring + pommel cap
  const ringX = lerp(collarX, handleEndX, 0.6)
  const ringY = lerp(0, handleEndY, 0.6)
  ctx.strokeStyle = primaryColor
  ctx.lineWidth = armThick * 1.45
  ctx.beginPath()
  ctx.moveTo(ringX, ringY)
  ctx.lineTo(lerp(collarX, handleEndX, 0.67), lerp(0, handleEndY, 0.67))
  ctx.stroke()
  ctx.fillStyle = secondaryColor
  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = outlineW
  ctx.beginPath()
  ctx.arc(handleEndX, handleEndY, armThick * 0.95, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // U-shaped metal yoke brackets connecting collar to both cylinder ends
  const endCapYTop = -halfLen - bracketPad * 0.45
  const endCapYBot = halfLen + bracketPad * 0.45
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const [strokeColor, width] of [
    [PALETTE.ink, armThick + outlineW * 1.8],
    [PALETTE.metalDark, armThick],
    [PALETTE.metalLight, armThick * 0.46],
  ]) {
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(0, endCapYTop)
    ctx.lineTo(collarX * 0.55, endCapYTop)
    ctx.quadraticCurveTo(collarX, endCapYTop, collarX, endCapYTop * 0.52)
    ctx.lineTo(collarX, endCapYBot * 0.52)
    ctx.quadraticCurveTo(collarX, endCapYBot, collarX * 0.55, endCapYBot)
    ctx.lineTo(0, endCapYBot)
    ctx.stroke()
  }

  // Central T-joint tank collar
  ctx.fillStyle = PALETTE.metalDark
  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = outlineW
  ctx.beginPath()
  ctx.roundRect(collarX - armThick * 0.95, -armThick * 1.65, armThick * 1.9, armThick * 3.3, 8)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = primaryColor
  ctx.fillRect(collarX - armThick * 0.35, -armThick * 1.05, armThick * 0.7, armThick * 2.1)
  ctx.restore()

  // Wide cylindrical paint roller head coated in dual-color wet ink
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(-rollerRadius, -halfLen, rollerRadius * 2, rollerLen, rollerRadius * 0.72)
  ctx.save()
  ctx.clip()

  // Base ink coat on cylinder
  ctx.fillStyle = primaryColor
  ctx.fillRect(-rollerRadius, -halfLen, rollerRadius * 2, rollerLen)

  // Scrolling wet paint bands across cylinder width to sell rotation
  const stripeSpan = rollerRadius * 0.86
  const offset = (((rollPhase % 1) + 1) % 1) * stripeSpan * 2
  for (let k = -2; k <= 3; k++) {
    const sx = -rollerRadius - stripeSpan + k * stripeSpan * 2 + offset * facing
    ctx.fillStyle = secondaryColor
    ctx.beginPath()
    ctx.moveTo(sx, -halfLen)
    ctx.lineTo(sx + stripeSpan * 0.92, -halfLen)
    ctx.lineTo(sx + stripeSpan * 0.55, halfLen)
    ctx.lineTo(sx - stripeSpan * 0.37, halfLen)
    ctx.closePath()
    ctx.fill()
  }

  // Subtle horizontal ink groove marks
  ctx.fillStyle = 'rgba(18, 18, 18, 0.16)'
  for (let gy = -halfLen + 22; gy < halfLen - 16; gy += 44) {
    ctx.fillRect(-rollerRadius, gy, rollerRadius * 2, 7)
  }

  // Cylindrical depth shading + bright wet specular ridge
  const cylGrad = ctx.createLinearGradient(-rollerRadius, 0, rollerRadius, 0)
  cylGrad.addColorStop(0, 'rgba(0, 0, 0, 0.34)')
  cylGrad.addColorStop(0.28, 'rgba(255, 255, 255, 0.08)')
  cylGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.38)')
  cylGrad.addColorStop(0.82, 'rgba(0, 0, 0, 0.08)')
  cylGrad.addColorStop(1, 'rgba(0, 0, 0, 0.28)')
  ctx.fillStyle = cylGrad
  ctx.fillRect(-rollerRadius, -halfLen, rollerRadius * 2, rollerLen)

  // Glossy specular strip
  ctx.fillStyle = 'rgba(255, 255, 255, 0.62)'
  ctx.beginPath()
  ctx.roundRect(-rollerRadius * 0.22, -halfLen + 18, rollerRadius * 0.28, rollerLen - 36, 8)
  ctx.fill()
  ctx.restore()

  // Thick black comic outline around the outer cylinder perimeter
  ctx.beginPath()
  ctx.roundRect(-rollerRadius, -halfLen, rollerRadius * 2, rollerLen, rollerRadius * 0.72)
  ctx.strokeStyle = PALETTE.ink
  ctx.lineWidth = outlineW * 1.15
  ctx.stroke()

  // End hub caps clamping the cylinder ends
  for (const capY of [endCapYTop, endCapYBot]) {
    ctx.fillStyle = PALETTE.metal
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = outlineW
    ctx.beginPath()
    ctx.arc(0, capY, armThick * 0.82, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = PALETTE.ink
    ctx.beginPath()
    ctx.arc(0, capY, armThick * 0.32, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  ctx.restore()
}

/**
 * 3. Shooter Barrage transition (`p` in [0, 1]).
 * - [0, 0.45]: 18 multi-lobed splat shots fire across a stratified 6x3 screen grid with impact flashes.
 * - [0.45, 0.58]: Full 1920x1080 coverage (`fullCover: true`) with layered vibrant ink mural.
 * - (0.58, 1.0]: Radial jagged Splatoon star explosion peels open from center to reveal next shot.
 */
export function drawShooterBarrage(ctx, p, W, H, options = {}) {
  const progress = clamp(p)
  if (progress <= 0 || progress >= 1) {
    return { active: false, type: 'shooter-barrage', fullCover: false }
  }

  const primary = options.primaryColor ?? PALETTE.lime
  const secondary = options.secondaryColor ?? PALETTE.pink
  const inkColor = options.inkColor ?? PALETTE.ink
  const seed = options.seed ?? 101 + Math.round((options.angleDeg ?? 0) * 17)
  const paletteCycle = [primary, secondary, inkColor]

  // Build deterministic 6x3 stratified shots (18 large splats) + 4 center-overlap reinforcements
  const cols = 6
  const rows = 3
  const cellW = W / cols
  const cellH = H / rows
  const order = Array.from({ length: cols * rows }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand(seed + i * 19.7) * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  const shots = order.map((cellIdx, seq) => {
    const col = cellIdx % cols
    const row = Math.floor(cellIdx / cols)
    const tx = (col + 0.5) * cellW + (rand(seed + cellIdx * 7.1) - 0.5) * cellW * 0.48
    const ty = (row + 0.5) * cellH + (rand(seed + cellIdx * 11.3) - 0.5) * cellH * 0.44
    // Slow-start accelerating rapid-fire barrage curve
    const seqNorm = seq / 17
    const tStart = (0.4 * seqNorm + 0.6 * seqNorm ** 1.75) * 0.32
    const targetR = Math.max(cellW, cellH) * randRange(seed + cellIdx * 13.9, 0.88, 1.12)
    return {
      tx,
      ty,
      tStart,
      targetR,
      color: paletteCycle[seq % 3],
      blobSeed: seed + cellIdx * 37.3 + 5,
      originX: W * 0.5 + (tx - W * 0.5) * 1.45,
      originY: H * 0.5 + (ty - H * 0.5) * 1.45,
    }
  })

  // Extra fine flying mist droplets during barrage entry & burst
  const drawFineSpray = (activeP) => {
    if (activeP <= 0.04 || activeP >= 0.92) return
    const fade = activeP > 0.62 ? 1 - easeInCubic((activeP - 0.62) / 0.3) : clamp((activeP - 0.04) / 0.16)
    ctx.save()
    ctx.globalAlpha *= fade
    for (let i = 0; i < 24; i++) {
      const a = rand(seed + i * 43.1) * Math.PI * 2
      const dist = lerp(90, 980, clamp(activeP * 1.35 + rand(seed + i * 47.7) * 0.35))
      const dx = W * 0.5 + Math.cos(a) * dist * 1.25
      const dy = H * 0.5 + Math.sin(a) * dist * 0.78
      const rx = randRange(seed + i * 53.3, 6, 15)
      ctx.fillStyle = paletteCycle[i % 3]
      ctx.strokeStyle = PALETTE.ink
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.ellipse(dx, dy, rx * 1.35, rx * 0.72, a, 0, Math.PI * 2)
      if (paletteCycle[i % 3] !== inkColor) ctx.stroke()
      ctx.fill()
    }
    ctx.restore()
  }

  // 4 extra mid-stage giant splats that guarantee seamless closure by p = 0.45
  const fillers = [
    { tx: W * 0.28, ty: H * 0.38, tStart: 0.24, targetR: 460, color: primary, blobSeed: seed + 701 },
    { tx: W * 0.72, ty: H * 0.62, tStart: 0.27, targetR: 460, color: secondary, blobSeed: seed + 733 },
    { tx: W * 0.5, ty: H * 0.5, tStart: 0.3, targetR: 540, color: inkColor, blobSeed: seed + 769 },
    { tx: W * 0.52, ty: H * 0.48, tStart: 0.33, targetR: 440, color: primary, blobSeed: seed + 809 },
  ]

  const fullCover = progress >= 0.45 && progress <= 0.58

  const drawSplatMural = (scaleMultiplier = 1, activeP = progress) => {
    // Seamless flood underlayer growing organically from 0.33 -> 0.45, solid during [0.45, 0.58]
    if (activeP >= 0.33) {
      const floodU = clamp((activeP - 0.33) / 0.12)
      if (floodU >= 1) {
        ctx.fillStyle = inkColor
        ctx.fillRect(0, 0, W, H)
      } else {
        drawSplatBlob(ctx, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.72 * easeOutCubic(floodU), inkColor, seed + 901, {
          highlight: false,
          satellites: false,
          lobes: 12,
        })
      }
    }

    for (const s of shots) {
      if (activeP < s.tStart) continue
      const u = clamp((activeP - s.tStart) / 0.12)
      if (u < 0.22 && activeP < 0.45) {
        // Incoming ink glob comet before splat impact
        const fly = u / 0.22
        const fx = lerp(s.originX, s.tx, fly)
        const fy = lerp(s.originY, s.ty, fly)
        ctx.save()
        ctx.strokeStyle = s.color
        ctx.lineWidth = 34 * (1 - fly * 0.3)
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(lerp(s.originX, s.tx, Math.max(0, fly - 0.35)), lerp(s.originY, s.ty, Math.max(0, fly - 0.35)))
        ctx.lineTo(fx, fy)
        ctx.stroke()
        ctx.restore()
      }

      const impactU = clamp((u - 0.14) / 0.86)
      if (impactU <= 0) continue
      const bounce = activeP < 0.45 ? easeOutBack(impactU, 1.35) : 1 + 0.015 * Math.sin(activeP * 38 + s.blobSeed)
      const r = s.targetR * bounce * scaleMultiplier
      drawSplatBlob(ctx, s.tx, s.ty, r, s.color, s.blobSeed, {
        outlineColor: s.color === inkColor ? null : PALETTE.ink,
        outlineWidth: 6,
        highlight: true,
        satellites: activeP < 0.52 ? 7 : 4,
      })

      // Impact 4-point star flash
      if (impactU > 0.02 && impactU < 0.78 && activeP < 0.56) {
        const flashAlpha = Math.sin((impactU / 0.78) * Math.PI)
        ctx.save()
        ctx.globalAlpha *= flashAlpha
        drawStarburst(
          ctx,
          s.tx,
          s.ty,
          s.targetR * 0.42 * (0.5 + impactU * 0.7),
          s.targetR * 0.11,
          s.color === primary ? PALETTE.paper : primary,
          s.blobSeed,
          PALETTE.ink,
          4,
        )
        ctx.restore()
      }
    }

    for (const f of fillers) {
      if (activeP < f.tStart) continue
      const u = clamp((activeP - f.tStart) / 0.12)
      const bounce = activeP < 0.45 ? easeOutBack(u, 1.2) : 1
      drawSplatBlob(ctx, f.tx, f.ty, f.targetR * bounce * scaleMultiplier, f.color, f.blobSeed, {
        outlineColor: f.color === inkColor ? null : PALETTE.ink,
        outlineWidth: 6,
        highlight: true,
        satellites: false,
      })
    }
  }

  if (progress <= 0.58) {
    drawSplatMural(1, progress)
    drawFineSpray(progress)
  } else {
    // Phase 3: Radial starburst explosion cutout revealing the new shot underneath
    const outU = clamp((progress - 0.58) / 0.42)
    const burstCurve = 0.28 * outU + 0.72 * outU ** 2
    const holeR = burstCurve * Math.hypot(W * 0.5, H * 0.5) * 1.48
    const spikes = 16

    const holePts = []
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 + outU * 0.25
      const factor = i % 2 === 0 ? 1.15 + rand(seed + i * 5.3) * 0.35 : 0.62 + rand(seed + i * 5.3) * 0.18
      holePts.push([W * 0.5 + Math.cos(a) * holeR * factor, H * 0.5 + Math.sin(a) * holeR * factor])
    }

    ctx.save()
    // Even-odd clip: everything OUTSIDE the jagged starburst hole remains inked
    ctx.beginPath()
    ctx.rect(-80, -80, W + 160, H + 160)
    ctx.moveTo(holePts[0][0], holePts[0][1])
    for (let i = 1; i < holePts.length; i++) ctx.lineTo(holePts[i][0], holePts[i][1])
    ctx.closePath()
    ctx.clip('evenodd')

    drawSplatMural(1 + outU * 0.18, 0.55)
    ctx.restore()

    // Crisp dark/neon rim stroke around the bursting star edge + outward flying droplets
    if (outU < 0.88) {
      ctx.save()
      ctx.globalAlpha = 1 - easeInCubic(clamp((outU - 0.45) / 0.43))
      ctx.beginPath()
      ctx.moveTo(holePts[0][0], holePts[0][1])
      for (let i = 1; i < holePts.length; i++) ctx.lineTo(holePts[i][0], holePts[i][1])
      ctx.closePath()
      ctx.strokeStyle = PALETTE.ink
      ctx.lineWidth = 14 * (1 - outU * 0.5)
      ctx.lineJoin = 'round'
      ctx.stroke()
      ctx.strokeStyle = primary
      ctx.lineWidth = 5 * (1 - outU * 0.5)
      ctx.stroke()

      // Outward flying ink shards
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2 + rand(seed + i * 41) * 0.24
        const d = holeR * randRange(seed + i * 17, 0.82, 1.22)
        const sx = W * 0.5 + Math.cos(a) * d
        const sy = H * 0.5 + Math.sin(a) * d
        const r = randRange(seed + i * 29, 14, 34) * (1 - outU * 0.65)
        drawSplatBlob(ctx, sx, sy, r, i % 2 === 0 ? primary : secondary, seed + i * 97, {
          outlineColor: PALETTE.ink,
          outlineWidth: 3.5,
          satellites: false,
          highlight: false,
          rotation: a,
          scaleX: 1.35,
          scaleY: 0.78,
        })
      }
      ctx.restore()
    }
  }

  return { active: true, type: 'shooter-barrage', fullCover }
}

/**
 * 4. Splat Roller Wipe transition (`p` in [0, 1]).
 * - [0, 0.44]: Physical Splat Roller weapon rolls across the screen leaving wet dual-tone ink.
 * - [0.44, 0.56]: Full 1920x1080 ink coverage (`fullCover: true`).
 * - (0.56, 1.0]: Roller sweeps out (`revealMode: 'sweep' | 'split'`) revealing the next shot.
 */
export function drawRollerWipe(ctx, p, W, H, options = {}) {
  const progress = clamp(p)
  if (progress <= 0 || progress >= 1) {
    return { active: false, type: 'roller-wipe', fullCover: false }
  }

  const primary = options.primaryColor ?? PALETTE.lime
  const secondary = options.secondaryColor ?? PALETTE.pink
  const coatColor = options.coatColor ?? PALETTE.ink
  const angleDeg = options.angleDeg ?? -12
  const revealMode = options.revealMode ?? 'sweep'
  const seed = options.seed ?? 202
  const rad = (angleDeg * Math.PI) / 180

  const spanW = Math.abs(W * Math.cos(rad)) + Math.abs(H * Math.sin(rad))
  const spanH = Math.abs(W * Math.sin(rad)) + Math.abs(H * Math.cos(rad))
  const leftEdge = -spanW * 0.5 - 140
  const rightEdge = spanW * 0.5 + 140
  const topEdge = -spanH * 0.5 - 120
  const botEdge = spanH * 0.5 + 120

  const fullCover = progress >= 0.44 && progress <= 0.56

  // Helper to draw rich rolled wet ink layer across x in [x0, x1] in rotated coordinates
  const drawRolledInkBand = (x0, x1, waveRight, waveLeft, phase) => {
    if (x1 <= x0) return
    const buildRegion = (offsetX = 0) => {
      ctx.beginPath()
      const stepY = 24
      if (waveLeft) {
        for (let y = topEdge; y <= botEdge; y += stepY) {
          const wv = Math.sin(y * 0.015 + phase * 6) * 26 + Math.sin(y * 0.041 - phase * 9) * 11
          const px = x0 + offsetX + wv
          if (y === topEdge) ctx.moveTo(px, y)
          else ctx.lineTo(px, y)
        }
      } else {
        ctx.moveTo(x0 + offsetX, topEdge)
        ctx.lineTo(x0 + offsetX, botEdge)
      }
      if (waveRight) {
        for (let y = botEdge; y >= topEdge; y -= stepY) {
          const wv = Math.sin(y * 0.014 - phase * 7) * 28 + Math.cos(y * 0.037 + phase * 10) * 12
          ctx.lineTo(x1 + offsetX + wv, y)
        }
      } else {
        ctx.lineTo(x1 + offsetX, botEdge)
        ctx.lineTo(x1 + offsetX, topEdge)
      }
      ctx.closePath()
    }

    // Outer secondary & primary wet front rim
    const rimDir = waveRight ? 1 : -1
    buildRegion(rimDir * 30)
    ctx.fillStyle = secondary
    ctx.fill()

    buildRegion(rimDir * 14)
    ctx.fillStyle = primary
    ctx.fill()

    // Main rolled coat clipped to textured streaks
    buildRegion(0)
    ctx.save()
    ctx.clip()
    ctx.fillStyle = coatColor
    ctx.fillRect(x0 - 80, topEdge, x1 - x0 + 160, botEdge - topEdge)

    // Rolled ink roller texture bands (so full-cover never looks flat)
    for (let k = -3; k <= 4; k++) {
      const bandY = k * 210 + Math.sin(k * 2.1 + seed) * 25
      ctx.fillStyle = k % 2 === 0 ? primary : secondary
      ctx.globalAlpha = 0.24
      ctx.fillRect(x0 - 80, bandY, x1 - x0 + 160, 44)
      ctx.globalAlpha = 0.14
      ctx.fillRect(x0 - 80, bandY + 58, x1 - x0 + 160, 14)
    }
    // Wet glossy sheen strips
    ctx.globalAlpha = 0.12
    ctx.fillStyle = PALETTE.paper
    for (let sx = -1000; sx < 1100; sx += 280) {
      ctx.fillRect(sx + phase * 40, topEdge, 22, botEdge - topEdge)
    }
    ctx.restore()

    // High-gloss ridge line along moving wave front
    ctx.save()
    ctx.beginPath()
    const frontBase = waveRight ? x1 : x0
    for (let y = topEdge; y <= botEdge; y += 22) {
      const wv = waveRight
        ? Math.sin(y * 0.014 - phase * 7) * 28 + Math.cos(y * 0.037 + phase * 10) * 12
        : Math.sin(y * 0.015 + phase * 6) * 26 + Math.sin(y * 0.041 - phase * 9) * 11
      const px = frontBase + wv
      if (y === topEdge) ctx.moveTo(px, y)
      else ctx.lineTo(px, y)
    }
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 10
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.restore()
  }

  ctx.save()
  ctx.translate(W * 0.5, H * 0.5)
  ctx.rotate(rad)

  if (progress <= 0.44) {
    // Phase 1: Advancing Splat Roller coats entire screen
    const u = progress / 0.44
    const easedU = 0.72 * u + 0.28 * u ** 3
    const frontX = lerp(leftEdge - 240, rightEdge + 60, easedU)
    drawRolledInkBand(leftEdge - 260, frontX, true, false, progress * 10)

    // Speed lines & flying ink droplets ahead of roller front
    ctx.save()
    for (let i = 0; i < 16; i++) {
      const sy = lerp(-460, 460, rand(seed + i * 7.3))
      const dx = randRange(seed + i * 13.1, 45, 260)
      const len = randRange(seed + i * 19.7, 50, 140)
      ctx.strokeStyle = i % 2 === 0 ? primary : secondary
      ctx.lineWidth = randRange(seed + i * 23, 3, 7)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(frontX + dx * 0.4, sy)
      ctx.lineTo(frontX + dx * 0.4 + len, sy)
      ctx.stroke()

      if (i < 12) {
        drawSplatBlob(
          ctx,
          frontX + dx * 0.9,
          sy + (rand(seed + i * 31) - 0.5) * 40,
          randRange(seed + i * 37, 10, 22),
          i % 2 ? secondary : primary,
          seed + i * 53,
          {
            outlineColor: PALETTE.ink,
            outlineWidth: 3,
            satellites: false,
            highlight: false,
            scaleX: 1.4,
            scaleY: 0.75,
          },
        )
      }
    }
    ctx.restore()

    drawSplatRollerWeapon(ctx, frontX + 12, 0, 1280, 88, progress * 16, primary, secondary, 1)
  } else if (fullCover) {
    // Phase 2: Full-screen cover hold with subtle vibrant kinetic streaks & rolled splat decals
    ctx.fillStyle = coatColor
    ctx.fillRect(leftEdge - 80, topEdge - 80, spanW + 440, spanH + 400)
    for (let k = -3; k <= 4; k++) {
      const bandY = k * 210 + Math.sin(k * 2.1 + seed) * 25
      ctx.fillStyle = k % 2 === 0 ? primary : secondary
      ctx.globalAlpha = 0.28
      ctx.fillRect(leftEdge - 80, bandY, spanW + 440, 46)
    }
    ctx.globalAlpha = 0.22
    drawSplatBlob(ctx, -420, -180, 170, primary, seed + 11, { satellites: 6, highlight: false })
    drawSplatBlob(ctx, 440, 210, 190, secondary, seed + 29, { satellites: 6, highlight: false })
    ctx.globalAlpha = 1
    // Diagonal comic speed streaks across full cover
    for (let i = 0; i < 14; i++) {
      const sy = lerp(-480, 480, rand(seed + i * 41.3))
      const sx = lerp(-960, 740, rand(seed + i * 47.9)) + (progress - 0.44) * 1600
      ctx.fillStyle = i % 3 === 0 ? PALETTE.paper : i % 2 === 0 ? primary : secondary
      ctx.globalAlpha = i % 3 === 0 ? 0.35 : 0.8
      ctx.beginPath()
      ctx.roundRect(sx, sy, randRange(seed + i * 51, 160, 280), 9, 4.5)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  } else {
    // Phase 3: Clean reveal of the new shot
    const v = clamp((progress - 0.56) / 0.44)
    if (revealMode === 'split') {
      const gap = easeOutCubic(v) * (spanH * 0.5 + 140)
      ctx.save()
      ctx.beginPath()
      ctx.rect(leftEdge - 100, topEdge - 100, spanW + 480, spanH + 400)
      ctx.rect(leftEdge - 100, -gap, spanW + 480, gap * 2)
      ctx.clip('evenodd')
      drawRolledInkBand(leftEdge - 80, rightEdge + 80, false, false, progress * 10)
      ctx.restore()
    } else {
      const backU = 0.65 * v + 0.35 * easeOutCubic(v)
      const backX = lerp(leftEdge - 140, rightEdge + 260, backU)
      drawRolledInkBand(backX, rightEdge + 300, false, true, progress * 10)
      // Droplets kicked behind the clearing roller
      if (v < 0.9) {
        for (let i = 0; i < 10; i++) {
          const sy = lerp(-420, 420, rand(seed + i * 61.3))
          const dx = randRange(seed + i * 67.1, 20, 150)
          drawSplatBlob(ctx, backX - dx, sy, randRange(seed + i * 71, 9, 20) * (1 - v * 0.6), i % 2 ? primary : secondary, seed + i * 73, {
            outlineColor: PALETTE.ink,
            outlineWidth: 3,
            satellites: false,
            highlight: false,
          })
        }
      }
      drawSplatRollerWeapon(ctx, backX - 10, 0, 1280, 88, progress * 16, primary, secondary, 1)
    }
  }

  ctx.restore()
  return { active: true, type: 'roller-wipe', fullCover }
}

/** Evaluate cubic Bezier point & tangent angle for t in [0, 1]. */
function evalCubicBezier(p0, p1, p2, p3, t) {
  const u = 1 - t
  const x = u ** 3 * p0[0] + 3 * u ** 2 * t * p1[0] + 3 * u * t ** 2 * p2[0] + t ** 3 * p3[0]
  const y = u ** 3 * p0[1] + 3 * u ** 2 * t * p1[1] + 3 * u * t ** 2 * p2[1] + t ** 3 * p3[1]
  const dx = 3 * u ** 2 * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t ** 2 * (p3[0] - p2[0])
  const dy = 3 * u ** 2 * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t ** 2 * (p3[1] - p2[1])
  return { x, y, angle: Math.atan2(dy, dx) }
}

function getSquidSurgeGeometry(W, H, options = {}) {
  const cutP = options.cutP ?? 0.56
  const flip = (options.angleDeg ?? -6) >= 0
  const p0 = [-140, options.startY ?? (flip ? H * 0.3 : H * 0.72)]
  const p1 = [W * 0.34, flip ? H * 0.74 : H * 0.24]
  const p2 = [W * 0.64, flip ? H * 0.26 : H * 0.76]
  const p3 = [W + 160, options.endY ?? (flip ? H * 0.7 : H * 0.26)]
  const cutU = clamp(cutP / 0.88)
  const cutCurveU = 0.72 * cutU + 0.28 * easeOutCubic(cutU)
  const cutPt = evalCubicBezier(p0, p1, p2, p3, cutCurveU)
  return { p0, p1, p2, p3, cutP, cutPt }
}

function getSquidBurstPoints(cutPt, baseR, rot, lobes, seed) {
  if (baseR <= 0.5) return []
  const count = lobes * 2
  const pts = []
  for (let i = 0; i < count; i++) {
    const a = rot + (i / count) * Math.PI * 2 + (rand(seed + i * 3.7) - 0.5) * 0.04
    const factor = i % 2 === 0 ? 1.08 + rand(seed + i * 5.7) * 0.14 : 0.84 + rand(seed + i * 7.1) * 0.08
    pts.push([cutPt.x + Math.cos(a) * baseR * factor, cutPt.y + Math.sin(a) * baseR * factor])
  }
  return pts
}

function getSquidRevealState(p, cutP) {
  const revealStart = cutP - 0.08
  const u = clamp((p - revealStart) / (0.96 - revealStart))
  const ringR = easeOutCubic(u) * 2450
  const rot = u * 0.18
  return { revealStart, u, ringR, rot }
}

/**
 * 5. Squid Surge transition (`p` in [0, 1]).
 * Thick curved ink stream sweeps across the screen led by a swimming squid silhouette,
 * bursting into an expanding dual-color Ink Burst Ring that seals the clip boundary.
 */
export function drawSquidSurge(ctx, p, W, H, options = {}) {
  const progress = clamp(p)
  if (progress <= 0 || progress >= 1) {
    return { active: false, type: 'squid-surge', fullCover: false }
  }

  const primary = options.primaryColor ?? PALETTE.lime
  const secondary = options.secondaryColor ?? PALETTE.pink
  const seed = options.seed ?? 303 + Math.round((options.angleDeg ?? -6) * 19)
  const lobes = 12
  const { p0, p1, p2, p3, cutP, cutPt } = getSquidSurgeGeometry(W, H, options)
  const { revealStart, u: revealU, ringR, rot } = getSquidRevealState(progress, cutP)

  const headRaw = clamp(progress / 0.88)
  const headU = 0.72 * headRaw + 0.28 * easeOutCubic(headRaw)
  const tailU = easeInCubic(clamp((progress - 0.38) / 0.62))

  if (headU > tailU) {
    const steps = 42
    const streamPts = []
    for (let i = 0; i <= steps; i++) {
      const u = lerp(tailU, headU, i / steps)
      streamPts.push(evalCubicBezier(p0, p1, p2, p3, u))
    }

    const strokeStream = (color, width, offsetY = 0) => {
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      streamPts.forEach((pt, idx) => {
        const wave = Math.sin(idx * 0.65 - progress * 22) * 8
        if (idx === 0) ctx.moveTo(pt.x, pt.y + wave + offsetY)
        else ctx.lineTo(pt.x, pt.y + wave + offsetY)
      })
      ctx.stroke()
      ctx.restore()
    }

    const fade = progress > 0.74 ? 1 - easeInCubic((progress - 0.74) / 0.26) : 1
    ctx.save()
    ctx.globalAlpha *= fade
    strokeStream(PALETTE.ink, 114)
    strokeStream(secondary, 94, 4)
    strokeStream(primary, 74)
    strokeStream('rgba(255, 255, 255, 0.55)', 16, -12)

    // Ink wake bubbles & droplets along the stream
    for (let i = 0; i < 14; i++) {
      const bu = lerp(tailU, headU, rand(seed + i * 11.7))
      const bpt = evalCubicBezier(p0, p1, p2, p3, bu)
      const off = (rand(seed + i * 17.3) - 0.5) * 140
      drawSplatBlob(
        ctx,
        bpt.x - Math.sin(bpt.angle) * off,
        bpt.y + Math.cos(bpt.angle) * off,
        randRange(seed + i * 23, 12, 26),
        i % 2 === 0 ? primary : secondary,
        seed + i * 41,
        { outlineColor: PALETTE.ink, outlineWidth: 3.5, satellites: false, highlight: false },
      )
    }
    ctx.restore()
  }

  // Pre-reveal anticipation splat flash right before the burst ring opens
  if (progress >= cutP - 0.14 && progress < revealStart + 0.04) {
    const preU = clamp((progress - (cutP - 0.14)) / 0.1)
    const preAlpha = progress < revealStart ? 1 : 1 - clamp((progress - revealStart) / 0.04)
    ctx.save()
    ctx.globalAlpha *= preAlpha
    drawSplatBlob(ctx, cutPt.x, cutPt.y, 170 * easeOutBack(preU, 1.4), secondary, seed + 555, {
      outlineColor: PALETTE.ink,
      outlineWidth: 7,
      lobes: 10,
      satellites: 8,
    })
    drawStarburst(ctx, cutPt.x, cutPt.y, 140 * easeOutBack(preU, 1.4), 40 * preU, primary, preU * 0.6, PALETTE.ink, 4)
    ctx.restore()
  }

  // Expanding dual-color Ink Burst Ring tracing the exact clip perimeter so the seam is 100% sealed
  if (progress >= revealStart && progress < 0.96) {
    const ringPts = getSquidBurstPoints(cutPt, ringR, rot, lobes, seed)
    if (ringPts.length > 0) {
      const ringThick = lerp(128, 92, revealU)
      ctx.save()

      // Keep center packed with ink at the initial burst moment (u < 0.12)
      if (revealU < 0.12) {
        const fillAlpha = revealU < 0.05 ? 1 : 1 - (revealU - 0.05) / 0.07
        ctx.save()
        ctx.globalAlpha *= fillAlpha
        traceSmoothClosed(ctx, ringPts)
        ctx.fillStyle = secondary
        ctx.fill()
        drawStarburst(ctx, cutPt.x, cutPt.y, Math.max(90, ringR * 0.72), Math.max(28, ringR * 0.24), primary, rot * 2, PALETTE.ink, 5)
        ctx.restore()
      }

      // Three-layer solid ink burst ring centered directly over the clip seam
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'

      traceSmoothClosed(ctx, ringPts)
      ctx.strokeStyle = PALETTE.ink
      ctx.lineWidth = ringThick + 20
      ctx.stroke()

      traceSmoothClosed(ctx, ringPts)
      ctx.strokeStyle = secondary
      ctx.lineWidth = ringThick
      ctx.stroke()

      traceSmoothClosed(ctx, ringPts)
      ctx.strokeStyle = primary
      ctx.lineWidth = ringThick * 0.58
      ctx.stroke()

      // Offset wet-ink highlight dashes along the burst ring
      ctx.save()
      ctx.translate(-5, -5)
      traceSmoothClosed(ctx, ringPts)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'
      ctx.lineWidth = ringThick * 0.15
      ctx.setLineDash([74, 48, 28, 62])
      ctx.stroke()
      ctx.restore()

      // Flying ink droplets shooting outward along ring normals
      for (let i = 0; i < 16; i++) {
        const pt = ringPts[Math.floor((i / 16) * ringPts.length) % ringPts.length]
        const dx = pt[0] - cutPt.x
        const dy = pt[1] - cutPt.y
        const len = Math.hypot(dx, dy) || 1
        const nx = dx / len
        const ny = dy / len
        const distOut = ringThick * 0.56 + randRange(seed + i * 31.3, 18, 76)
        const sx = pt[0] + nx * distOut
        const sy = pt[1] + ny * distOut
        const dr = randRange(seed + i * 37.9, 10, 22) * (1 - revealU * 0.25)
        ctx.fillStyle = i % 2 === 0 ? secondary : primary
        ctx.strokeStyle = PALETTE.ink
        ctx.lineWidth = 3.5
        ctx.beginPath()
        ctx.ellipse(sx, sy, dr * 1.45, dr * 0.85, Math.atan2(ny, nx), 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }

      ctx.restore()
    }
  }

  // Swimming & leaping Squid drawn above the ink eruption, naturally exiting right as ring expands
  if (progress < 0.94 && headU > 0.02) {
    const headPt = evalCubicBezier(p0, p1, p2, p3, headU)
    const leapWindow = clamp(1 - Math.abs(progress - cutP) / 0.22)
    const leapOffset = Math.sin(leapWindow * Math.PI * 0.5) * 95
    const jumpScale = 1 + leapWindow * 0.32
    const fade = progress > 0.78 ? 1 - easeInCubic((progress - 0.78) / 0.16) : 1
    ctx.save()
    ctx.globalAlpha *= fade
    drawSquidIcon(ctx, headPt.x, headPt.y - leapOffset, 146 * jumpScale, headPt.angle + Math.PI / 2 - leapWindow * 0.24, primary, PALETTE.ink, PALETTE.paper, {
      outlineWidth: 7,
      shadowColor: 'rgba(18,18,18,0.42)',
      shadowOffsetX: 6,
      shadowOffsetY: 9,
    })
    ctx.restore()
  }

  return { active: true, type: 'squid-surge', fullCover: false }
}

function getInkbrushSweepState(progress, W, H, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180
  const spanW = Math.abs(W * Math.cos(rad)) + Math.abs(H * Math.sin(rad))
  const spanH = Math.abs(W * Math.sin(rad)) + Math.abs(H * Math.cos(rad))
  const u = clamp((progress - 0.15) / (0.78 - 0.15))
  const cutY = lerp(-spanH * 0.54, spanH * 0.54, u)
  return { rad, spanW, spanH, u, cutY }
}

/**
 * 6. Inkbrush Slash transition (`p` in [0, 1]).
 * Dual-color calligraphic diagonal brush slashes with dry-brush bristles and whipping droplet rain.
 * Supports `options.cardAreaOnly` to confine in-shot card swaps to the right stage (`x >= 680`).
 */
export function drawInkbrushSlash(ctx, p, W, H, options = {}) {
  const progress = clamp(p)
  if (progress <= 0 || progress >= 1) {
    return { active: false, type: 'inkbrush-slash', fullCover: false }
  }

  const primary = options.primaryColor ?? PALETTE.lime
  const secondary = options.secondaryColor ?? PALETTE.pink
  const angleDeg = options.angleDeg ?? -28
  const cardAreaOnly = Boolean(options.cardAreaOnly)
  const seed = options.seed ?? 404 + Math.round(angleDeg * 13)
  const { rad, spanW, spanH, cutY } = getInkbrushSweepState(progress, W, H, angleDeg)

  const sweepIn = easeOutExpo(clamp(progress / 0.34))
  const fadeOut = progress > 0.72 ? 1 - easeInCubic((progress - 0.72) / 0.28) : 1
  const retract = cardAreaOnly && progress > 0.56 ? easeInCubic((progress - 0.56) / 0.44) : 0
  const span = cardAreaOnly ? 960 : spanW * 1.12
  const startX = lerp(-span * 0.52, span * 0.52, retract)
  const endX = lerp(-span * 0.52, span * 0.52, sweepIn)

  const centerX = cardAreaOnly ? W * 0.71 : W * 0.5
  const centerY = cardAreaOnly ? H * 0.52 : H * 0.5
  const slashOffsetY = cardAreaOnly
    ? 0
    : progress < 0.15
      ? lerp(-spanH * 0.58, -spanH * 0.54, progress / 0.15)
      : progress <= 0.78
        ? cutY
        : lerp(spanH * 0.54, spanH * 0.66, (progress - 0.78) / 0.22)

  ctx.save()
  if (cardAreaOnly) {
    ctx.beginPath()
    ctx.rect(680, 0, W - 680, H)
    ctx.clip()
  }
  ctx.translate(centerX, centerY)
  ctx.rotate(rad)
  ctx.translate(0, slashOffsetY)
  ctx.globalAlpha *= fadeOut

  if (endX > startX) {
    const drawBristleBand = (offsetY, baseWidth, color, outline) => {
      const segs = 28
      const topPts = []
      const botPts = []
      for (let i = 0; i <= segs; i++) {
        const u = i / segs
        const bx = lerp(startX, endX, u)
        // Taper sharply at entry and whipping exit tip
        const taper = Math.sin(u * Math.PI) ** 0.45
        const jag = (rand(seed + i * 7.7 + offsetY) - 0.5) * 18
        const halfH = baseWidth * taper * 0.5 + jag * 0.35
        const waveY = Math.sin(u * 5.2 + seed) * 12 + offsetY
        topPts.push([bx, waveY - Math.max(4, halfH)])
        botPts.push([bx, waveY + Math.max(4, halfH)])
      }

      ctx.beginPath()
      ctx.moveTo(topPts[0][0], topPts[0][1])
      for (let i = 1; i < topPts.length; i++) ctx.lineTo(topPts[i][0], topPts[i][1])
      for (let i = botPts.length - 1; i >= 0; i--) ctx.lineTo(botPts[i][0], botPts[i][1])
      ctx.closePath()
      if (outline) {
        ctx.strokeStyle = PALETTE.ink
        ctx.lineWidth = 10
        ctx.lineJoin = 'round'
        ctx.stroke()
      }
      ctx.fillStyle = color
      ctx.fill()
    }

    // Secondary trailing heavy slash + primary crisp slash covering the seam cleanly
    drawBristleBand(42, 152, secondary, true)
    drawBristleBand(-14, 186, primary, true)

    // Razor-sharp white slash core flash around cut center
    if (progress > 0.16 && progress < 0.82) {
      const flashAlpha = Math.sin(((progress - 0.16) / 0.66) * Math.PI)
      ctx.save()
      ctx.globalAlpha *= flashAlpha
      drawBristleBand(-14, 38, PALETTE.paper, false)
      ctx.restore()
    }

    // Dry-brush bristle streaks (飞白毛刺) fanning along the upper & lower stroke edges
    for (let b = 0; b < 18; b++) {
      const u0 = randRange(seed + b * 11.3, 0.02, 0.58)
      const u1 = Math.min(1, u0 + randRange(seed + b * 13.7, 0.18, 0.46))
      const yOff = (b % 2 === 0 ? -1 : 1) * randRange(seed + b * 17.9, 64, 172)
      const bx0 = lerp(startX, endX, u0)
      const bx1 = lerp(startX, endX, u1)
      if (bx1 <= bx0) continue
      ctx.strokeStyle = b % 3 === 0 ? PALETTE.ink : b % 2 === 0 ? primary : secondary
      ctx.lineWidth = randRange(seed + b * 19.1, 3, 10)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(bx0, yOff)
      ctx.lineTo(bx1, yOff + (rand(seed + b * 23) - 0.5) * 20)
      ctx.stroke()
    }
  }

  // High-speed whipping droplet rain flying diagonally off the brush arc
  for (let i = 0; i < 32; i++) {
    const du = randRange(seed + i * 29.3, 0.08, 0.92)
    const dx = lerp(-span * 0.45, span * 0.45, du) + progress * 180
    const dy = (rand(seed + i * 31.7) - 0.5) * 340 + (i % 2 === 0 ? -1 : 1) * progress * 110
    const dropLen = randRange(seed + i * 37.1, 18, 48)
    const dropR = randRange(seed + i * 41.3, 4, 11)
    ctx.save()
    ctx.translate(dx, dy)
    ctx.rotate((rand(seed + i * 43.9) - 0.5) * 0.35)
    ctx.fillStyle = i % 3 === 0 ? PALETTE.ink : i % 2 === 0 ? primary : secondary
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(0, 0, dropLen * 0.5, dropR, 0, 0, Math.PI * 2)
    if (i % 3 !== 0) ctx.stroke()
    ctx.fill()
    ctx.restore()
  }

  ctx.restore()
  return { active: true, type: 'inkbrush-slash', fullCover: false }
}

function getDualRollerFronts(W, progress, centerWidth = 390) {
  const leftStop = (W - centerWidth) * 0.5
  const rightStop = (W + centerWidth) * 0.5
  const centerX = W * 0.5

  if (progress < 0.42) {
    const raw = progress / 0.42
    const u = 0.45 * raw + 0.55 * raw * raw
    return {
      leftFront: lerp(-160, centerX + 32, u),
      rightFront: lerp(W + 160, centerX - 32, u),
      fullCover: false,
    }
  }
  if (progress <= 0.52) {
    return {
      leftFront: centerX + 32,
      rightFront: centerX - 32,
      fullCover: true,
    }
  }
  if (progress < 0.62) {
    const u = easeOutBack(clamp((progress - 0.52) / 0.08), 1.0)
    return {
      leftFront: lerp(centerX + 32, leftStop, u),
      rightFront: lerp(centerX - 32, rightStop, u),
      fullCover: false,
    }
  }
  const u = easeOutCubic((progress - 0.62) / 0.38)
  return {
    leftFront: lerp(leftStop, -220, u),
    rightFront: lerp(rightStop, W + 220, u),
    fullCover: false,
  }
}

/**
 * 7. Dual Roller Squeeze transition (`p` in [0, 1]).
 * Full-height twin Splat Rollers advance to collide at center (`p ∈ [0.42, 0.52]` -> `fullCover: true`),
 * rebound to frame the central `390px` corridor (`[0.52, 0.62]`), and smoothly retreat off-screen (`[0.62, 1.0]`).
 */
export function drawDualRollerSqueeze(ctx, p, W, H, options = {}) {
  const progress = clamp(p)
  if (progress <= 0 || progress >= 1) {
    return { active: false, type: 'dual-roller', fullCover: false }
  }

  const primary = options.primaryColor ?? PALETTE.lime
  const secondary = options.secondaryColor ?? PALETTE.pink
  const centerWidth = options.centerWidth ?? 390
  const seed = options.seed ?? 505

  const leftStop = (W - centerWidth) * 0.5
  const rightStop = (W + centerWidth) * 0.5
  const { leftFront, rightFront, fullCover } = getDualRollerFronts(W, progress, centerWidth)

  const drawSideWall = (isLeft, frontX, color) => {
    const startX = isLeft ? -80 : W + 80
    const dir = isLeft ? 1 : -1
    if ((isLeft && frontX <= -40) || (!isLeft && frontX >= W + 40)) return

    ctx.beginPath()
    ctx.moveTo(startX, -40)
    for (let y = -40; y <= H + 40; y += 26) {
      const wave = Math.sin(y * 0.018 + progress * 14 + (isLeft ? 0 : 2)) * 16
      ctx.lineTo(frontX + wave, y)
    }
    ctx.lineTo(startX, H + 40)
    ctx.closePath()

    ctx.save()
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 14
    ctx.stroke()
    ctx.fillStyle = color
    ctx.globalAlpha = 1
    ctx.fill()
    ctx.clip()

    // Solid turf stripes inside 100% opaque side ink walls
    ctx.fillStyle = 'rgba(18, 18, 18, 0.14)'
    for (let sx = isLeft ? 40 : frontX + 30; sx < (isLeft ? frontX : W); sx += 92) {
      ctx.fillRect(sx, 0, 26, H)
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
    ctx.fillRect(frontX - dir * 18, 0, 12, H)
    ctx.restore()

    // Ink splash drops along vertical boundary
    for (let i = 0; i < 6; i++) {
      const dy = lerp(140, H - 140, i / 5)
      drawSplatBlob(ctx, frontX + dir * 24, dy, randRange(seed + i * 19 + (isLeft ? 0 : 7), 16, 28), color, seed + i * 31 + (isLeft ? 1 : 9), {
        outlineColor: PALETTE.ink,
        outlineWidth: 3.5,
        satellites: false,
      })
    }
  }

  drawSideWall(true, leftFront, primary)
  drawSideWall(false, rightFront, secondary)

  // Center 390px clamp neon ruler brackets during clamp pause
  if (progress > 0.5 && progress < 0.72) {
    const guideAlpha = Math.sin(((progress - 0.5) / 0.22) * Math.PI)
    ctx.save()
    ctx.globalAlpha = guideAlpha
    ctx.strokeStyle = PALETTE.paper
    ctx.lineWidth = 4
    ctx.setLineDash([14, 10])
    ctx.beginPath()
    ctx.moveTo(leftStop, 70)
    ctx.lineTo(leftStop, H - 70)
    ctx.moveTo(rightStop, 70)
    ctx.lineTo(rightStop, H - 70)
    ctx.stroke()
    ctx.restore()
  }

  // Twin full-height Splat Rollers on left and right fronts
  const leftWeaponX = fullCover ? W * 0.5 - 58 : leftFront + 12
  const rightWeaponX = fullCover ? W * 0.5 + 58 : rightFront - 12
  drawSplatRollerWeapon(ctx, leftWeaponX, H * 0.5, 940, 80, progress * 14, primary, secondary, 1)
  drawSplatRollerWeapon(ctx, rightWeaponX, H * 0.5, 940, 80, progress * 14, secondary, primary, -1)

  return { active: true, type: 'dual-roller', fullCover }
}

/**
 * 8. Turf Clash transition (`p` in [0, 1]).
 * Full-height DAY TURF lime wave (with squids) and NIGHT SHIFT charcoal-magenta wave (with octos)
 * slam together along an angled battlefront (`p ∈ [0.42, 0.58]` -> `fullCover: true`),
 * popping a comic `GAME!` / `DAY TURF VS NIGHT SHIFT` clash emblem before bursting into the settlement finale.
 */
export function drawTurfClash(ctx, p, W, H, options = {}) {
  const progress = clamp(p)
  if (progress <= 0 || progress >= 1) {
    return { active: false, type: 'turf-clash', fullCover: false }
  }

  const primary = options.primaryColor ?? PALETTE.lime
  const secondary = options.secondaryColor ?? PALETTE.pink
  const seed = options.seed ?? 606
  const cx = W * 0.5
  const cy = H * 0.5
  const fullCover = progress >= 0.42 && progress <= 0.58

  let surge
  if (progress < 0.42) {
    surge = easeOutExpo(progress / 0.42)
  } else if (progress <= 0.58) {
    surge = 1
  } else {
    surge = 1 - easeInCubic((progress - 0.58) / 0.42)
  }

  const bandTop = -40
  const bandBot = H + 40
  const slant = 95
  const leftEdge = lerp(-180, cx + 64, surge)
  const rightEdge = lerp(W + 180, cx - 64, surge)

  const traceWaveEdge = (edgeX, yTop, yBot, stepY = 24) => {
    const pts = []
    for (let y = yTop; y <= yBot; y += stepY) {
      const fy = (y - H * 0.5) / (H * 0.5)
      const seamJagged = Math.sin(y * 0.032 + progress * 18) * 22 + Math.cos(y * 0.07 - seed) * 14
      pts.push([edgeX - fy * slant + seamJagged, y])
    }
    return pts
  }

  // Left Wave: Bright DAY TURF (#d3f510 lime + cream foam + jumping squids)
  if (leftEdge > -80) {
    const outerX = -100
    const edgePts = traceWaveEdge(leftEdge, bandTop, bandBot)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(outerX, bandTop)
    for (const [px, py] of edgePts) ctx.lineTo(px, py)
    ctx.lineTo(outerX, bandBot)
    ctx.closePath()
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 18
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.fillStyle = primary
    ctx.fill()

    // Clipped subtle lime highlight stripes + leaping squids on left wave
    ctx.save()
    ctx.clip()
    ctx.fillStyle = 'rgba(255, 254, 249, 0.22)'
    for (let sx = -H; sx < cx + 240; sx += 110) {
      ctx.beginPath()
      ctx.moveTo(sx, bandBot)
      ctx.lineTo(sx + 44, bandBot)
      ctx.lineTo(sx + 44 + H * 0.45, bandTop)
      ctx.lineTo(sx + H * 0.45, bandTop)
      ctx.closePath()
      ctx.fill()
    }
    for (let k = 0; k < 3; k++) {
      const sqY = H * (0.24 + k * 0.26)
      const fy = (sqY - H * 0.5) / (H * 0.5)
      const sqX = leftEdge - fy * slant - 245 - (k % 2) * 95
      drawSquidIcon(ctx, sqX, sqY, 82, 0.22 - k * 0.09, PALETTE.paper, PALETTE.ink, primary)
    }
    ctx.restore()

    // Inner bright foam crest along vertical clash seam
    ctx.beginPath()
    edgePts.forEach(([px, py], idx) => {
      if (idx === 0) ctx.moveTo(px - 28, py)
      else ctx.lineTo(px - 28, py)
    })
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)'
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()
  }

  // Right Wave: Dark NIGHT SHIFT (#181816 charcoal backdrop + blazing magenta crest + octos)
  if (rightEdge < W + 80) {
    const outerX = W + 100
    const edgePts = traceWaveEdge(rightEdge, bandTop, bandBot)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(outerX, bandTop)
    for (const [px, py] of edgePts) ctx.lineTo(px, py)
    ctx.lineTo(outerX, bandBot)
    ctx.closePath()
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 18
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.fillStyle = '#181816'
    ctx.fill()

    // Bold magenta battlefront belt + diagonal dark grid + neon octo squad inside right wave
    ctx.save()
    ctx.clip()

    ctx.beginPath()
    for (let i = 0; i < edgePts.length; i++) {
      const [px, py] = edgePts[i]
      if (i === 0) ctx.moveTo(px - 10, py)
      else ctx.lineTo(px - 10, py)
    }
    for (let i = edgePts.length - 1; i >= 0; i--) {
      const [px, py] = edgePts[i]
      ctx.lineTo(px + 220, py)
    }
    ctx.closePath()
    ctx.fillStyle = secondary
    ctx.fill()

    ctx.fillStyle = 'rgba(255, 36, 137, 0.14)'
    for (let sx = cx - 100; sx < W + H; sx += 110) {
      ctx.beginPath()
      ctx.moveTo(sx, bandBot)
      ctx.lineTo(sx + 44, bandBot)
      ctx.lineTo(sx + 44 - H * 0.45, bandTop)
      ctx.lineTo(sx - H * 0.45, bandTop)
      ctx.closePath()
      ctx.fill()
    }
    for (let k = 0; k < 3; k++) {
      const ocY = H * (0.24 + k * 0.26)
      const fy = (ocY - H * 0.5) / (H * 0.5)
      const ocX = rightEdge - fy * slant + 275 + (k % 2) * 95
      drawSquidIcon(ctx, ocX, ocY, 80, -0.22 + k * 0.09, secondary, PALETTE.ink, PALETTE.cream, { species: 'octo' })
    }
    ctx.restore()

    // Inner bright foam crest along right wave seam
    ctx.beginPath()
    edgePts.forEach(([px, py], idx) => {
      if (idx === 0) ctx.moveTo(px + 28, py)
      else ctx.lineTo(px + 28, py)
    })
    ctx.strokeStyle = 'rgba(255, 254, 249, 0.65)'
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()
  }

  // Center lightning clash + comic GAME! / DAY TURF VS NIGHT SHIFT clash banner
  if (progress >= 0.34 && progress <= 0.88) {
    const clashU = clamp((progress - 0.34) / 0.14)
    const exitU = progress > 0.72 ? clamp((progress - 0.72) / 0.16) : 0
    const badgeScale = easeOutBack(clashU, 1.55) * (1 + exitU * 0.35)
    const badgeAlpha = 1 - easeInCubic(exitU)

    ctx.save()
    ctx.globalAlpha = badgeAlpha

    // Slanted electric jagged lightning bolt along collision seam
    ctx.beginPath()
    const bolts = [
      [cx + slant * 0.78 + 26, H * 0.06],
      [cx + slant * 0.4 - 28, H * 0.28],
      [cx + slant * 0.16 + 30, H * 0.42],
      [cx - slant * 0.2 - 34, H * 0.6],
      [cx - slant * 0.46 + 24, H * 0.74],
      [cx - slant * 0.82 - 26, H * 0.94],
    ]
    ctx.moveTo(bolts[0][0], bolts[0][1])
    for (let i = 1; i < bolts.length; i++) ctx.lineTo(bolts[i][0], bolts[i][1])
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 24
    ctx.lineJoin = 'miter'
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.strokeStyle = PALETTE.paper
    ctx.lineWidth = 10
    ctx.stroke()

    // Bursting ink spikes around center clash
    drawStarburst(ctx, cx, cy, 260 * badgeScale, 98 * badgeScale, PALETTE.paper, progress * 1.4, PALETTE.ink, 6)

    // Tilted clash emblem
    ctx.translate(cx, cy)
    ctx.rotate(-0.05)
    ctx.scale(badgeScale, badgeScale)

    // GAME! headline with heavy ink stroke + offset shadow
    ctx.font = '900 124px "Nunito", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = PALETTE.ink
    ctx.fillText('GAME!', 10, -24)
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 22
    ctx.lineJoin = 'round'
    ctx.strokeText('GAME!', 0, -34)
    ctx.fillStyle = PALETTE.paper
    ctx.fillText('GAME!', 0, -34)

    // DAY TURF VS NIGHT SHIFT scoreboard banner pill
    const pillW = 660
    const pillH = 74
    const pillY = 38
    const pillCY = pillY + pillH / 2
    ctx.fillStyle = PALETTE.ink
    ctx.beginPath()
    ctx.roundRect(-pillW / 2 + 6, pillY + 7, pillW, pillH, 37)
    ctx.fill()

    ctx.fillStyle = '#181816'
    ctx.beginPath()
    ctx.roundRect(-pillW / 2, pillY, pillW, pillH, 37)
    ctx.fill()

    // Left lime half & right magenta accent cleanly meeting behind center VS medallion
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(-pillW / 2, pillY, pillW, pillH, 37)
    ctx.clip()
    ctx.fillStyle = primary
    ctx.fillRect(-pillW / 2, pillY, pillW / 2, pillH)
    ctx.fillStyle = secondary
    ctx.beginPath()
    ctx.moveTo(pillW / 2 - 156, pillY)
    ctx.lineTo(pillW / 2, pillY)
    ctx.lineTo(pillW / 2, pillY + pillH)
    ctx.lineTo(pillW / 2 - 176, pillY + pillH)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    ctx.strokeStyle = PALETTE.paper
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.roundRect(-pillW / 2, pillY, pillW, pillH, 37)
    ctx.stroke()

    // Center dark circular VS medallion separating left Day & right Night halves cleanly
    ctx.fillStyle = '#181816'
    ctx.strokeStyle = PALETTE.paper
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(0, pillCY, 33, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    drawSquidIcon(ctx, -pillW / 2 + 40, pillCY, 42, -0.1, PALETTE.ink, PALETTE.paper, primary)
    drawSquidIcon(ctx, pillW / 2 - 40, pillCY, 42, 0.1, PALETTE.ink, PALETTE.paper, secondary, { species: 'octo' })

    ctx.font = '900 28px "Nunito", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = PALETTE.ink
    ctx.textAlign = 'right'
    ctx.fillText('DAY TURF', -52, pillCY + 2)
    ctx.fillStyle = PALETTE.paper
    ctx.textAlign = 'center'
    ctx.fillText('VS', 0, pillCY + 2)
    ctx.fillStyle = PALETTE.cream
    ctx.textAlign = 'left'
    ctx.fillText('NIGHT SHIFT', 52, pillCY + 2)

    ctx.restore()
  }

  // Explosion splat shards during break-away
  if (progress >= 0.58) {
    const bu = clamp((progress - 0.58) / 0.42)
    const shardAlpha = 1 - easeInCubic(clamp((bu - 0.35) / 0.65))
    ctx.save()
    ctx.globalAlpha = shardAlpha
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + rand(seed + i * 9.3) * 0.25
      const dist = easeOutExpo(bu) * randRange(seed + i * 15.1, 280, 960)
      const sx = cx + Math.cos(a) * dist
      const sy = cy + Math.sin(a) * dist * 0.78
      drawSplatBlob(ctx, sx, sy, randRange(seed + i * 21.7, 16, 38) * (1 - bu * 0.45), i % 2 === 0 ? primary : secondary, seed + i * 33, {
        outlineColor: PALETTE.ink,
        outlineWidth: 3.5,
        satellites: false,
        highlight: false,
      })
    }
    ctx.restore()
  }

  return { active: true, type: 'turf-clash', fullCover }
}

/**
 * 9. Three-layer deterministic background street spray droplets, speed streaks, and mini-stars.
 * Checks each particle's full enclosing bounding box against every rect in `protectedRects`;
 * any intersecting particle is skipped so `overlaps` stays 0.
 */
export function drawAmbientSplats(ctx, t, localP, W, H, protectedRects = [], dark = false) {
  const layers = 3
  const counts = [16, 26, 42]
  const speeds = [260, 480, 760]
  const strength = 0.68 + 0.32 * Math.exp(-Math.max(0, localP) * 1.6)
  const margin = 2

  let drawn = 0
  let rejected = 0
  const drawnBoxes = []

  const collides = (box) =>
    protectedRects.some((r) => box.x <= r.x + r.w + margin && box.x + box.w >= r.x - margin && box.y <= r.y + r.h + margin && box.y + box.h >= r.y - margin)

  for (let layer = 0; layer < layers; layer++) {
    const count = counts[layer]
    const speed = speeds[layer]
    for (let i = 0; i < count; i++) {
      const seed = 700 + layer * 131 + i * 17
      const spanX = W + 240
      const x = ((t * speed + rand(seed + 3.1) * spanX) % spanX) - 120
      const y = 36 + rand(seed + 7.9) * (H - 72)

      let box
      let color
      let radius = 0
      let len = 0
      let slant = 0

      if (layer === 0) {
        // Layer 0: Mini organic ink splat droplets (without outer satellites so AABB is tight)
        radius = randRange(seed + 11.3, 10, 20)
        const pad = radius * 1.66 + 4
        box = { x: x - pad, y: y - pad, w: pad * 2, h: pad * 2 }
        color = i % 3 === 0 ? PALETTE.pink : i % 3 === 1 ? PALETTE.lime : dark ? PALETTE.limeHi : PALETTE.limeDeep
      } else if (layer === 1) {
        // Layer 1: Street 4-point mini-stars and tilted ink ovals
        radius = randRange(seed + 13.7, 6, 12)
        const pad = radius * 1.35 + 3
        box = { x: x - pad, y: y - pad, w: pad * 2, h: pad * 2 }
        color = i % 2 === 0 ? PALETTE.pink : dark ? PALETTE.paper : PALETTE.lime
      } else {
        // Layer 2: Crisp diagonal/horizontal speed lines
        len = randRange(seed + 19.1, 24, 52)
        slant = -len * 0.14
        const thick = 2.6
        box = {
          x: Math.min(x, x + len) - thick,
          y: Math.min(y, y + slant) - thick,
          w: len + thick * 2,
          h: Math.abs(slant) + thick * 2,
        }
        color = i % 3 === 0 ? PALETTE.pink : dark ? PALETTE.lime : PALETTE.ink
      }

      if (collides(box)) {
        rejected++
        continue
      }

      drawn++
      drawnBoxes.push(box)
      ctx.save()
      ctx.globalAlpha = strength * (dark ? [0.85, 0.72, 0.48][layer] : [0.82, 0.68, 0.34][layer])

      if (layer === 0) {
        drawSplatBlob(ctx, x, y, radius, color, seed, {
          outlineColor: dark ? PALETTE.ink : PALETTE.ink,
          outlineWidth: 2.2,
          satellites: false,
          highlight: true,
        })
      } else if (layer === 1) {
        if (i % 2 === 0) {
          drawStarburst(ctx, x, y, radius * 1.25, radius * 0.42, color, rand(seed + 29) * Math.PI, PALETTE.ink, 1.8)
        } else {
          ctx.fillStyle = color
          ctx.strokeStyle = PALETTE.ink
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.ellipse(x, y, radius * 1.15, radius * 0.62, -0.25, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }
      } else {
        ctx.strokeStyle = color
        ctx.lineWidth = 2.4
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + len, y + slant)
        ctx.stroke()
      }

      ctx.restore()
    }
  }

  const overlaps = drawnBoxes.filter((b) => protectedRects.some((r) => b.x <= r.x + r.w && b.x + b.w >= r.x && b.y <= r.y + r.h && b.y + b.h >= r.y)).length
  return { drawn, rejected, overlaps, layers }
}

const TRANSITION_DISPATCH = {
  'shooter-barrage': drawShooterBarrage,
  'roller-wipe': drawRollerWipe,
  'squid-surge': drawSquidSurge,
  'inkbrush-slash': drawInkbrushSlash,
  'dual-roller': drawDualRollerSqueeze,
  'turf-clash': drawTurfClash,
}

function rotatePoint(cx, cy, rad, x, y) {
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  return [cx + x * c - y * s, cy + x * s + y * c]
}

/**
 * Set a deterministic Canvas 2D clip path for non-full-cover / clip-reveal cross-shot transitions.
 * Caller renders `fromShot`, enters `ctx.save()`, calls `applyTransitionClip(...)`, and if it returns `true`,
 * renders `toShot` before `ctx.restore()`, followed by `renderTransition(...)` on top.
 */
export function applyTransitionClip(ctx, transition, progress, W = 1920, H = 1080) {
  const type = transition?.type ?? null
  const p = clamp(progress)
  if (!type || p <= 0 || p >= 1) return false

  if (type === 'squid-surge') {
    const cutP = getCutProgress(transition, 0.56)
    const { revealStart, ringR, rot } = getSquidRevealState(p, cutP)
    if (p < revealStart) return false
    const opts = {
      cutP,
      angleDeg: transition.angleDeg,
      startY: transition.startY,
      endY: transition.endY,
      ...(transition.options ?? {}),
    }
    const { cutPt } = getSquidSurgeGeometry(W, H, opts)
    const seed = transition.seed ?? 303 + Math.round((transition.angleDeg ?? -6) * 19)
    const pts = getSquidBurstPoints(cutPt, ringR, rot, 12, seed)
    if (pts.length === 0) return false
    traceSmoothClosed(ctx, pts)
    ctx.clip()
    return true
  }

  if (type === 'inkbrush-slash') {
    if (transition.cardAreaOnly) return false
    if (p < 0.15) return false
    const angleDeg = transition.angleDeg ?? -28
    const { rad, spanW, spanH, cutY } = getInkbrushSweepState(p, W, H, angleDeg)
    if (p >= 0.78) {
      ctx.beginPath()
      ctx.rect(0, 0, W, H)
      ctx.clip()
      return true
    }

    const halfW = spanW * 0.7
    const topY = -spanH * 0.7
    const pts = [
      rotatePoint(W * 0.5, H * 0.5, rad, -halfW, topY),
      rotatePoint(W * 0.5, H * 0.5, rad, halfW, topY),
      rotatePoint(W * 0.5, H * 0.5, rad, halfW, cutY),
      rotatePoint(W * 0.5, H * 0.5, rad, -halfW, cutY),
    ]
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.closePath()
    ctx.clip()
    return true
  }

  if (type === 'dual-roller') {
    if (p < 0.48) return false
    const centerWidth = transition.centerWidth ?? transition.options?.centerWidth ?? 390
    const { leftFront, rightFront } = getDualRollerFronts(W, p, centerWidth)
    const x0 = clamp(leftFront - 20, 0, W)
    const x1 = clamp(rightFront + 20, 0, W)
    ctx.beginPath()
    ctx.rect(x0, 0, Math.max(0, x1 - x0), H)
    ctx.clip()
    return true
  }

  return false
}

const SHAKE_WINDOWS = {
  'shooter-barrage': [0.42, 0.56, 9.5],
  'roller-wipe': [0.44, 0.58, 9.0],
  'dual-roller': [0.42, 0.56, 9.0],
  'turf-clash': [0.38, 0.54, 10.0],
}

/**
 * Deterministic high-decay micro-shake `{ dx, dy }` (max 5-8px) at transition impact peaks.
 * Strictly returns `{ dx: 0, dy: 0 }` outside impact windows and for `t >= 27.0`.
 */
export function getTransitionShake(transition, progress, t = 0) {
  if (!transition?.type || t >= 27.0 || progress <= 0 || progress >= 1) {
    return { dx: 0, dy: 0 }
  }
  const spec = SHAKE_WINDOWS[transition.type]
  if (!spec) return { dx: 0, dy: 0 }

  const [p0, p1, maxAmp] = spec
  if (progress < p0 || progress > p1) return { dx: 0, dy: 0 }

  const u = (progress - p0) / (p1 - p0)
  const attack = Math.min(1, u / 0.14)
  const decay = Math.exp(-u * 2.4) * (1 - u ** 2)
  const amp = Math.min(8, maxAmp * attack * decay)
  const phase = t * 92 + progress * 43
  return {
    dx: Math.round(Math.sin(phase) * amp * 100) / 100,
    dy: Math.round(Math.cos(phase * 1.37 + 0.9) * amp * 0.85 * 100) / 100,
  }
}

/**
 * Unified transition dispatcher for `film-landscape.js`.
 * Dispatches by `transition.type` and returns `{ active, type, fullCover, clipReveal }`.
 */
export function renderTransition(ctx, transition, progress, W = 1920, H = 1080) {
  const type = transition?.type ?? null
  if (!type || progress <= 0 || progress >= 1) {
    return { active: false, type, fullCover: false, clipReveal: false }
  }
  const fn = TRANSITION_DISPATCH[type]
  if (!fn) {
    return { active: false, type, fullCover: false, clipReveal: false }
  }
  const cutP = getCutProgress(transition, undefined)
  const opts = {
    primaryColor: transition.primaryColor,
    secondaryColor: transition.secondaryColor,
    angleDeg: transition.angleDeg,
    seed: transition.seed,
    revealMode: transition.revealMode,
    centerWidth: transition.centerWidth,
    cardAreaOnly: transition.cardAreaOnly,
    cutP,
    ...(transition.options ?? {}),
  }
  const res = fn(ctx, progress, W, H, opts)
  const p = clamp(progress)
  let clipReveal = false
  if (res.active && !transition.cardAreaOnly) {
    if (type === 'squid-surge') clipReveal = p >= (cutP ?? 0.56) - 0.08
    else if (type === 'inkbrush-slash') clipReveal = p >= 0.15
    else if (type === 'dual-roller') clipReveal = p >= 0.48
  }
  return { ...res, clipReveal }
}
