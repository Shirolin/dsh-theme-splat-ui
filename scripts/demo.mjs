#!/usr/bin/env node
/*
 * Renders the SPLAT-STREET skin against a DSH-shaped workspace mock so the visual
 * result can be checked without a DSH install. The mock is intentionally local
 * to this repository (scripts/demo-base.css) and is not shipped with the
 * plugin; the theme CSS and token payload are the real build artefacts.
 *
 *   node scripts/demo.mjs                 # light + dark workspace + boot
 *   node scripts/demo.mjs --mode light    # one variant
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildOwnedSkinCss } from './owned-skin-css.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const only = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : undefined
const outDir = resolve(root, 'artifacts', 'demo')
const workDir = resolve(root, '.tmp', 'demo')

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)
const chrome = chromeCandidates.find((candidate) => existsSync(candidate))
if (chrome === undefined) {
  console.error('no Chrome found; pass CHROME_PATH')
  process.exit(1)
}

const tokensPath = join(root, 'lib', 'tokens.js')
if (!existsSync(tokensPath)) {
  console.error('lib/tokens.js is missing — run `pnpm run build` first')
  process.exit(1)
}
const { buildTokenOverrides } = await import(`${pathToFileURL(tokensPath).href}?t=${Date.now()}`)
const overrides = buildTokenOverrides()
const tokenVars = (mode) =>
  Object.entries(overrides)
    .map(([token, value]) => `${token}:${value[mode]}`)
    .join(';')

const [skinCss, baseCss, cityImageData] = await Promise.all([
  buildOwnedSkinCss(),
  readFile(join(root, 'scripts', 'demo-base.css'), 'utf8'),
  readFile(join(root, 'src', 'client', 'assets', 'inkopolis-square.png')),
])
const cityImage = `data:image/png;base64,${cityImageData.toString('base64')}`

const icon = {
  puzzle:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3.5a1.5 1.5 0 0 1 3 0V5h2.5a1 1 0 0 1 1 1v2.5H16a1.5 1.5 0 0 1 0 3h-1.5V15a1 1 0 0 1-1 1H11v1.5a1.5 1.5 0 0 1-3 0V16H5.5a1 1 0 0 1-1-1v-2.5H3a1.5 1.5 0 0 1 0-3h1.5V6a1 1 0 0 1 1-1H8Z"/></svg>',
  clock:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10" cy="10" r="6.6"/><path d="M10 6.4V10l2.4 1.7"/></svg>',
  grid: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="6" cy="6" r="1.7"/><circle cx="14" cy="6" r="1.7"/><circle cx="6" cy="14" r="1.7"/><circle cx="14" cy="14" r="1.7"/></svg>',
  folder:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M3 5.5a1 1 0 0 1 1-1h3.4l1.6 2H16a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/></svg>',
  search:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="9" cy="9" r="4.6"/><path d="m12.6 12.6 3 3"/></svg>',
  sort: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 6h10M6.5 10h7M8 14h4"/></svg>',
  newfile:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.8h6.2L15 7.6V16a.8.8 0 0 1-.8.8H5a.8.8 0 0 1-.8-.8V4.6A.8.8 0 0 1 5 3.8Z"/><path d="M11 4v4h4M10 10v4M8 12h4"/></svg>',
  message:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 5.6A1.6 1.6 0 0 1 5.6 4h8.8A1.6 1.6 0 0 1 16 5.6v6.2a1.6 1.6 0 0 1-1.6 1.6H9l-3.4 2.4v-2.4H5.6A1.6 1.6 0 0 1 4 11.8Z"/></svg>',
  pluscircle:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="10" cy="10" r="6.6"/><path d="M10 6.8v6.4M6.8 10h6.4"/></svg>',
  file: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M5 3.8h6.2L15 7.6V16a.8.8 0 0 1-.8.8H5a.8.8 0 0 1-.8-.8V4.6A.8.8 0 0 1 5 3.8Z"/><path d="M11 4v4h4"/></svg>',
  check:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="3.2" width="13.6" height="13.6" rx="2"/><path d="m6.6 10 2.4 2.4 4.4-5"/></svg>',
  user: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10" cy="10" r="6.6"/><circle cx="10" cy="8.3" r="2.4"/><path d="M5.6 15.2c1-1.8 2.5-2.7 4.4-2.7s3.4.9 4.4 2.7"/></svg>',
  plus: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 4.5v11M4.5 10h11"/></svg>',
  layers:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="m10 3 6.4 3.2L10 9.4 3.6 6.2Z"/><path d="m4 9.6 6 3 6-3M4 12.8l6 3 6-3"/></svg>',
  chevron:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6.5 8.5 3.5 3.5 3.5-3.5"/></svg>',
  arrowup:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14V2M3 7l5-5 5 5"/></svg>',
  // Static FISH_LOGO_PATH and native viewBox from the DSH host.
  whale:
    '<svg viewBox="0 0 23.16 17.04" fill="currentColor"><path d="M22.9168 1.43018C22.6713 1.31018 22.5658 1.53918 22.4223 1.65519C22.3733 1.69269 22.3318 1.74169 22.2903 1.78669C21.9317 2.1697 21.5127 2.42121 20.9657 2.39121C20.1657 2.34621 19.4827 2.59771 18.8787 3.20973C18.7502 2.45521 18.3236 2.0047 17.6746 1.71569C17.3351 1.56568 16.9916 1.41518 16.7536 1.08867C16.5876 0.856163 16.5421 0.597155 16.4591 0.341647C16.4061 0.187643 16.3536 0.0301382 16.1761 0.00363739C15.9836 -0.0263635 15.9081 0.135141 15.8326 0.270145C15.5306 0.822162 15.4136 1.43018 15.4251 2.0462C15.4516 3.43174 16.0366 4.53527 17.1991 5.3203C17.3311 5.4103 17.3651 5.5003 17.3236 5.63181C17.2441 5.90231 17.1501 6.16482 17.0671 6.43533C17.0141 6.60784 16.9351 6.64584 16.7501 6.57033C16.1121 6.30383 15.5611 5.90931 15.074 5.4328C14.2475 4.63328 13.5 3.75075 12.568 3.05973C12.349 2.89822 12.13 2.74822 11.9034 2.60522C10.9524 1.68169 12.028 0.923165 12.277 0.833162C12.5375 0.739159 12.3675 0.41615 11.5259 0.42015C10.6844 0.42365 9.91439 0.705658 8.93286 1.08117C8.78935 1.13767 8.63835 1.17867 8.48384 1.21267C7.59332 1.04367 6.66829 1.00617 5.70226 1.11517C3.88321 1.31768 2.43016 2.1777 1.36213 3.64575C0.0790928 5.4103 -0.222916 7.41536 0.146595 9.50642C0.535106 11.7105 1.66014 13.535 3.38869 14.9616C5.18125 16.4406 7.24581 17.1657 9.60138 17.0266C11.0319 16.9441 12.6245 16.7526 14.421 15.2321C14.874 15.4576 15.3496 15.5476 16.1381 15.6151C16.7456 15.6716 17.3306 15.5851 17.7836 15.4911C18.4931 15.3411 18.4441 14.6841 18.1876 14.5636C16.1081 13.595 16.5646 13.9891 16.1496 13.67C17.2061 12.42 18.8202 10.1979 19.3182 7.17235C19.3672 6.83834 19.4297 6.36783 19.4222 6.09732C19.4182 5.93231 19.4562 5.86831 19.6447 5.84931C20.1657 5.78931 20.6712 5.64681 21.1357 5.3913C22.4833 4.65528 23.0268 3.44624 23.1548 1.9972C23.1738 1.77569 23.1508 1.54668 22.9168 1.43018ZM11.1749 14.4736C9.15936 12.889 8.18184 12.3675 7.77832 12.39C7.40081 12.4125 7.46881 12.8445 7.55182 13.126C7.63882 13.404 7.75182 13.5955 7.91033 13.8396C8.01983 14.0011 8.09533 14.2411 7.80083 14.4216C7.15181 14.8231 6.02327 14.2866 5.97027 14.2601C4.65673 13.4865 3.5587 12.4655 2.78467 11.069C2.03715 9.72493 1.60314 8.28289 1.53164 6.74384C1.51264 6.37233 1.62214 6.24082 1.99215 6.17332C2.47916 6.08332 2.98118 6.06432 3.46769 6.13582C5.52476 6.43633 7.27581 7.35586 8.74385 8.8129C9.58188 9.64243 10.2159 10.634 10.8689 11.6025C11.5634 12.631 12.3105 13.611 13.262 14.4146C13.598 14.6961 13.866 14.9101 14.1225 15.0681C13.349 15.1546 12.058 15.1731 11.1749 14.4746L11.1749 14.4736ZM12.141 8.25988C12.141 8.09488 12.273 7.96338 12.439 7.96338C12.4765 7.96338 12.5105 7.97088 12.541 7.98188C12.5825 7.99688 12.6205 8.01938 12.6505 8.05338C12.7035 8.10588 12.7335 8.18088 12.7335 8.25988C12.7335 8.42489 12.6015 8.55639 12.4355 8.55639C12.2695 8.55639 12.141 8.42489 12.141 8.25988ZM15.1415 9.79893C14.949 9.87793 14.7565 9.94544 14.5715 9.95294C14.2845 9.96794 13.9715 9.85143 13.8015 9.70893C13.5375 9.48742 13.3485 9.36342 13.2695 8.97691C13.2355 8.8119 13.2545 8.55639 13.2845 8.40989C13.3525 8.09438 13.277 7.89187 13.0545 7.70787C12.8735 7.55786 12.643 7.51636 12.39 7.51636C12.2955 7.51636 12.209 7.47486 12.1445 7.44136C12.039 7.38886 11.9519 7.25735 12.035 7.09585C12.0615 7.04335 12.19 6.91584 12.22 6.89334C12.5635 6.69784 12.9595 6.76184 13.326 6.90834C13.6655 7.04735 13.9225 7.30236 14.292 7.66287C14.6695 8.09838 14.7375 8.21838 14.9525 8.54539C15.1225 8.8009 15.277 9.06341 15.3831 9.36392C15.4471 9.55142 15.3641 9.70493 15.1415 9.79893Z"/></svg>',
  searchsmall:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="9" r="4.4"/><path d="m12.4 12.4 3.2 3.2"/></svg>',
  collapse:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="4" width="14" height="12" rx="2"/><path d="M8 4v12"/></svg>',
  sun: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="10" cy="10" r="3.6"/><path d="M10 2.6v2M10 15.4v2M2.6 10h2M15.4 10h2M4.8 4.8l1.4 1.4M13.8 13.8l1.4 1.4M15.2 4.8l-1.4 1.4M6.2 13.8l-1.4 1.4"/></svg>',
  moon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15.8 12.4A6.2 6.2 0 0 1 7.6 4.2 6.2 6.2 0 1 0 15.8 12.4Z"/></svg>',
}

function sidebar() {
  return `<div class="sidebar">
    <div class="brand-row">
      <button class="brand-button" type="button" aria-label="新会话">
        <span>
          <span>
            <svg class="splat-ui-brand__mark" aria-hidden="true" width="24" height="24"></svg>
          </span>
          <span>
            <span class="splat-ui-brand__name">
              <strong>SPLAT-STREET</strong>
              <small><span>DSH THEME</span><i class="splat-ui-brand__stripes"></i></small>
            </span>
          </span>
        </span>
      </button>
      <button class="collapse-button" type="button" aria-label="收起侧栏">${icon.collapse}</button>
    </div>
    <button class="splat-ui-new-session" type="button">${icon.pluscircle}<span>新会话</span></button>

    <nav class="sidebar-menu" aria-label="全局面板">
      <button class="nav-row" type="button">${icon.puzzle}<span>插件</span></button>
      <button class="nav-row" type="button">${icon.clock}<span>自动化任务</span></button>
      <button class="nav-row" type="button">${icon.grid}<span>更多</span></button>
    </nav>

    <div class="workspace-head">
      <span>工作区</span>
      <span class="workspace-tools">
        <button type="button" aria-label="搜索工作区">${icon.search}</button>
        <button type="button" aria-label="排序工作区">${icon.sort}</button>
        <button type="button" aria-label="添加工作区">${icon.newfile}</button>
      </span>
    </div>
    <div class="workspace-tree" role="tree" aria-label="工作区与会话">
      <div class="workspace-group" style="--dsh-workspace-indent:0px">
        <div class="workspace-title" role="treeitem" aria-expanded="true" tabindex="0">${icon.folder}<span>splat-ui-demo</span></div>
        <div class="session-row" role="treeitem" aria-selected="true" tabindex="0">${icon.message}<span>新会话</span></div>
        <div class="session-row" role="treeitem" aria-selected="false" tabindex="0">${icon.file}<span>把工作台涂成你的主场</span></div>
        <div class="session-row" role="treeitem" aria-selected="false" tabindex="0">${icon.file}<span>检查日间与夜间的对比</span></div>
        <div class="session-row" role="treeitem" aria-selected="false" tabindex="0">${icon.file}<span>整理插件安装与快捷键</span></div>
      </div>
      <div class="workspace-group">
        <div class="workspace-title" role="treeitem" aria-expanded="false" tabindex="0">${icon.folder}<span>产品页</span></div>
      </div>
      <div class="workspace-group">
        <div class="workspace-title" role="treeitem" aria-expanded="false" tabindex="0">${icon.folder}<span>主题验收</span></div>
      </div>
      <div class="workspace-group">
        <div class="workspace-title" role="treeitem" aria-expanded="false" tabindex="0">${icon.folder}<span>示例项目</span></div>
      </div>
    </div>

    <div class="sidebar-spacer"></div>

    <div class="sidebar-footer">
      <button class="footer-row" type="button">${icon.check}<span>待处理改动</span><span class="footer-count">0</span></button>
      <button class="footer-row footer-row--user" type="button" aria-haspopup="menu"><span class="avatar">${icon.user}</span><span>Shirolin</span>${icon.chevron}</button>
    </div>
</div>`
}

function composer() {
  return `<section class="composer-wrap" data-composer-seat data-phase="hero">
  <div class="composer-stack">
  <div class="composer-meta">
    <button class="meta-pill" type="button" aria-label="选择工作区" aria-haspopup="menu" aria-expanded="false">${icon.folder}<span>splat-ui-demo</span>${icon.chevron}</button>
    <button class="meta-pill meta-pill--quiet" type="button" aria-haspopup="menu" aria-expanded="false">${icon.grid}<span>标准模式</span>${icon.chevron}</button>
  </div>
  <div class="composer-bar">
  <div class="composer" data-composer-card>
    <div class="composer-scroll" data-input-scroll>
      <div class="composer-grow">
        <div class="composer-input" contenteditable="true" role="textbox" aria-multiline="true" aria-label="描述你想要构建的内容，或输入 / 使用指令" data-composer-input data-placeholder="描述你想要构建的内容，或输入 / 使用指令"></div>
        <div class="composer-placeholder" data-composer-placeholder aria-hidden="true">描述你想要构建的内容，或输入 / 使用指令</div>
      </div>
    </div>
    <div class="composer-toolbar">
      <div class="composer-tools">
        <button class="icon-button" type="button" aria-label="指令" aria-haspopup="listbox" aria-expanded="false">${icon.plus}</button>
        <input type="file" multiple hidden>
        <div class="composer-modes">
          <button class="tool-button" type="button" aria-label="权限模式：工作区内修改"><span class="tool-icon" aria-hidden="true">${icon.layers}</span><span class="permission-label">工作区内修改</span><span class="tool-chevron" aria-hidden="true">${icon.chevron}</span></button>
        </div>
      </div>
      <div class="composer-trailing">
        <div class="composer-standard-controls">
        <div class="model-picker">
          <button class="tool-button" type="button" aria-label="选择模型：DeepSeek" aria-haspopup="menu" aria-expanded="false"><span class="tool-icon" aria-hidden="true">${icon.whale}</span><span class="model-label">DeepSeek</span><span class="tool-chevron" aria-hidden="true">${icon.chevron}</span></button>
        </div>
        </div>
        <button class="icon-button send-button" type="button" aria-label="发送消息" disabled>${icon.arrowup}</button>
      </div>
    </div>
  </div>
  </div>
  </div>
</section>`
}

function heroScene() {
  return `<svg aria-hidden="true" class="splat-ui-hero__scene" viewBox="0 0 960 390" preserveAspectRatio="xMidYMin meet" fill="none">
      <defs>
        <pattern id="splat-scene-dots-pink" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2.2" cy="2.2" r="1.5" fill="#ff2d8a" />
        </pattern>
        <pattern id="splat-scene-dots-purple" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
          <circle cx="8" cy="8" r="2.2" fill="#a24b97" />
        </pattern>
        <linearGradient id="splat-city-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset=".85" stop-color="#ffffff" />
          <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="splat-city-rail-edge" gradientUnits="userSpaceOnUse" x1="190" y1="110" x2="290" y2="30">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset=".3" stop-color="#ffffff" />
          <stop offset=".7" stop-color="#777777" />
          <stop offset="1" stop-color="#000000" />
        </linearGradient>
        <mask id="splat-city-mask">
          <rect x="30" width="900" height="300" fill="url(#splat-city-edge)" />

          <path d="M30 0h440L338 82 236 166H30Z" fill="url(#splat-city-rail-edge)" />
        </mask>
      </defs>


      <g class="splat-ui-hero__left-patch">
        <path d="m108 260 140-23-36 113-154 20Z" fill="#be63b6" opacity="0.2" />
        <path d="m108 260 140-23-36 113-154 20Z" fill="url(#splat-scene-dots-purple)" opacity="0.48" />
        <g fill="#a24b97" opacity="0.55">
          <path d="m102 324 5 10 11-1-8 8 3 11-10-5-9 6 1-11-9-6 11-2Z" />
          <path d="m145 280 4 8 9-1-6 7 2 8-8-3-7 5 1-9-7-5 8-2Z" />
        </g>
      </g>


      <g fill="var(--splat-lime-solid, #1edc00)">
        <path
          d="M64 238c-10-1-19-8-17-14 2-7 10-5 17 0 7 5 12 4 11-3-2-10-10-22-3-25 8-4 13 12 19 18 7 7 13 4 15-5 2-8 7-12 12-8 5 5-1 14 4 19 8 8 29 1 48-1 40-5 79-2 116 5-38 0-72 3-105 11 33-5 62-5 87-3-41 6-79 17-116 27-22 6-34 5-46 4-8 0-8 5-7 11 2 9-7 12-12 4-3-5-2-13-7-16-5-3-13 6-20 3-6-3-2-9 4-13 6-4 5-7 0-8-8-2-18 1-19-5-1-5 9-6 17-5 5 1 6-3 2-5Z"
        />
        <path d="M48 207c-7-1-15-7-13-12 3-7 13-1 17 5 3 4 1 8-4 7ZM34 244c-4 3-12 3-13-2-1-5 6-7 11-5 4 1 5 4 2 7Z" />
        <ellipse cx="56" cy="279" rx="4" ry="2.8" transform="rotate(-28 56 279)" />
      </g>

      <image class="splat-ui-hero__city" href="${cityImage}" x="30" y="0" width="900" height="300" mask="url(#splat-city-mask)" />


      <g fill="#ff2d8a">
        <path
          d="M520 286C580 270 641 258 700 254c34-3 57-13 82-14 15-1 24-5 20-14-4-8-14-14-9-19 6-6 17 7 23 12 8 7 17 6 29-3 20-15 50-34 58-26 9 10-22 29-36 43-9 9-5 14 7 11 14-3 31-14 38-8 10 10-12 19-29 22-12 2-17 7-8 13 9 7 25 8 23 16-3 11-24-3-35-3-12-1-14 7-11 16 3 9-5 11-10 2-6-10-10-16-23-16-19 1-35 7-53 4-19-3-29-7-52-2-52 11-108 15-163 15-20 0-40 1-55-2 14-5 30-8 47-10-11 1-21 1-33 1Z"
        />
        <path d="M920 177c2-8 11-17 16-13 6 5-4 15-10 17-5 1-7-1-6-4ZM926 230c6-4 16-5 17 1 1 6-10 9-15 7-5-1-6-5-2-8ZM909 282c7 1 17 8 13 13-4 6-13-2-16-7-2-4-1-6 3-6Z" />
        <ellipse cx="947" cy="154" rx="3.5" ry="2.3" transform="rotate(-42 947 154)" />
        <circle cx="939" cy="265" r="2.3" />
      </g>


      <g>
        <path d="m458 202 96-2 5 49-107 2Z" fill="#ff2d8a" />
        <text x="506" y="239" text-anchor="middle" class="splat-ui-hero__billboard-text">
          2
        </text>
      </g>


      <g transform="translate(-16 46) rotate(-6 175 28)">
        <path d="m94 2 238 2-3 43-239 5Z" fill="var(--splat-lime-solid, #1edc00)" />
        <path d="M89 8h238l-3 15 3 5-3 6 1 20H89l2-18-3-6 3-6Z" class="splat-ui-hero__tape" />
        <path d="M89 8h14l1 46H89l2-18-3-6 3-6Z" fill="#ff2d8a" />
        <text x="216" y="39" text-anchor="middle" class="splat-ui-hero__tape-text">
          SPLAT-<tspan class="splat-ui-hero__tape-accent">STREET</tspan>
        </text>
      </g>


      <g class="splat-ui-hero__stickers" transform="translate(0 145)">
        <rect x="768" y="98" width="86" height="86" fill="url(#splat-scene-dots-pink)" opacity="0.8" transform="rotate(-8 811 141)" />
        <path d="m814 96 8 24 25 2-19 17 6 25-22-13-23 13 7-25-20-17 25-2Z" fill="currentColor" />
      </g>


      <g fill="#ff2d8a">
        <path d="M137 120c-6-4-11-14-6-18 6-5 16 4 16 11 0 7-5 10-10 7ZM885 78c-8-3-11-10-7-17 5-10 24-17 28-11 4 7-5 23-12 27-3 2-6 2-9 1Z" />
        <ellipse cx="916" cy="44" rx="4.5" ry="2.8" transform="rotate(-40 916 44)" />
        <circle cx="873" cy="90" r="2.8" />
      </g>
      <g fill="var(--splat-lime-solid, #1edc00)">
        <path d="M897 303c-4-4-2-11 4-18 6-7 15-13 19-9 5 5-1 20-8 26-5 5-11 5-15 1Z" />
        <ellipse cx="924" cy="266" rx="4.5" ry="2.8" transform="rotate(-48 924 266)" />
      </g>
    </svg>`
}

function appearance() {
  return `<div class="demo-stage">
  <div class="demo-card">
    <section class="splat-ui-appearance" style="--splat-appearance-draft:0.12">
      <h3>墨街外观</h3>
      <p>雾面越重，画布纹样越淡，长内容也更容易阅读。</p>
      <div class="splat-ui-appearance__preview" role="img" aria-label="画布浓度预览，当前 0.12">
        <div class="splat-ui-appearance__preview-sheet">
          <strong>SPLAT-STREET</strong>
          <span>把灵感，涂满全场。</span>
        </div>
        <small class="splat-ui-appearance__preview-tag">战场预览</small>
      </div>
      <fieldset class="splat-ui-appearance__presets" aria-label="外观预设">
        <button type="button" class="splat-ui-appearance__preset" aria-pressed="false">纸白<small>0.50</small></button>
        <button type="button" class="splat-ui-appearance__preset" aria-pressed="true">均衡<small>0.12</small></button>
        <button type="button" class="splat-ui-appearance__preset" aria-pressed="false">涂地<small>0.00</small></button>
      </fieldset>
      <div class="splat-ui-appearance__custom">
        <label class="splat-ui-appearance__slider">
          <span class="splat-ui-appearance__slider-title">自定义</span>
          <output class="splat-ui-appearance__slider-value">0.12</output>
          <input type="range" min="0" max="0.6" step="0.01" value="0.12" style="--splat-slider-progress:20%">
        </label>
        <span class="splat-ui-appearance__custom-hint">拖动微调画布雾面</span>
      </div>
      <fieldset class="splat-ui-appearance__green" aria-label="主墨色">
        <span class="splat-ui-appearance__green-title">主墨色</span>
        <p class="splat-ui-appearance__green-hint">切换全局绿色调，按钮、画布条纹与泼墨同步换色。</p>
        <fieldset class="splat-ui-appearance__green-options" aria-label="绿色调选项">
          <button type="button" class="splat-ui-appearance__preset" aria-pressed="true"><span class="splat-ui-appearance__green-head"><i class="splat-ui-appearance__swatch" style="background:#1edc00" aria-hidden="true"></i>官方绿</span><small>Joy-Con</small></button>
          <button type="button" class="splat-ui-appearance__preset" aria-pressed="false"><span class="splat-ui-appearance__green-head"><i class="splat-ui-appearance__swatch" style="background:#9ae528" aria-hidden="true"></i>荧光绿</span><small>霓虹 Neon</small></button>
          <button type="button" class="splat-ui-appearance__preset" aria-pressed="false"><span class="splat-ui-appearance__green-head"><i class="splat-ui-appearance__swatch" style="background:#d3f510" aria-hidden="true"></i>黄绿</span><small>柠檬 Lime</small></button>
        </fieldset>
      </fieldset>
      <fieldset class="splat-ui-appearance__diff" aria-label="diff 语法配色">
        <span class="splat-ui-appearance__diff-title">diff 语法配色</span>
        <p class="splat-ui-appearance__diff-hint">用于右侧纸面 diff；夜间继续使用深色代码配色。</p>
        <div class="splat-ui-appearance__diff-options">
          <button type="button" class="splat-ui-appearance__preset" aria-pressed="true">霓虹<small>跟随墨色</small></button>
          <button type="button" class="splat-ui-appearance__preset" aria-pressed="false">中性<small>DSH 原生</small></button>
        </div>
      </fieldset>
      <fieldset class="splat-ui-appearance__details" aria-label="外观细节">
        <span class="splat-ui-appearance__details-title">细节</span>
        <div class="splat-ui-appearance__details-row">
          <span class="splat-ui-appearance__details-label">墨迹装饰</span>
          <fieldset class="splat-ui-appearance__details-options" aria-label="墨迹装饰">
            <button type="button" class="splat-ui-appearance__preset" aria-pressed="true">显示<small>泼墨与鱿鱼</small></button>
            <button type="button" class="splat-ui-appearance__preset" aria-pressed="false">隐藏<small>只留网点</small></button>
          </fieldset>
        </div>
        <div class="splat-ui-appearance__details-row">
          <span class="splat-ui-appearance__details-label">网点纹理</span>
          <fieldset class="splat-ui-appearance__details-options" aria-label="网点纹理">
            <button type="button" class="splat-ui-appearance__preset" aria-pressed="true">开<small>丝网印刷</small></button>
            <button type="button" class="splat-ui-appearance__preset" aria-pressed="false">关<small>纯色纸</small></button>
          </fieldset>
        </div>
        <div class="splat-ui-appearance__details-row">
          <span class="splat-ui-appearance__details-label">界面字体</span>
          <fieldset class="splat-ui-appearance__details-options" aria-label="界面字体">
            <button type="button" class="splat-ui-appearance__preset" aria-pressed="true">主题<small>Nunito</small></button>
            <button type="button" class="splat-ui-appearance__preset" aria-pressed="false">系统<small>跟随平台</small></button>
          </fieldset>
        </div>
        <p class="splat-ui-appearance__details-hint">网点纹理用于输入框和对话框；字体只调整拉丁字形，中文仍跟随系统。</p>
      </fieldset>
      <div class="splat-ui-appearance__actions">
        <div class="splat-ui-appearance__reset-card">
          <div class="splat-ui-appearance__reset-info">
            <span class="splat-ui-appearance__reset-title">重置所有外观偏好</span>
            <p class="splat-ui-appearance__note">偏好保存在本机；开启系统高对比后会自动提高雾面。</p>
          </div>
          <button type="button" class="splat-ui-appearance__reset" aria-label="恢复全部外观设置">
            <span class="splat-ui-appearance__reset-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none"><path d="M4.7 5.8A4.2 4.2 0 1 1 4.4 10"/><path d="M4.7 2.7v3.1h3.1"/></svg>
            </span>
            <span class="splat-ui-appearance__reset-copy"><span>全部恢复默认</span><small>均衡 0.12</small></span>
          </button>
        </div>
      </div>
      <footer class="splat-ui-appearance__about">
        <div class="splat-ui-appearance__about-meta">
          <span class="splat-ui-appearance__about-title">SPLAT-STREET</span>
          <span class="splat-ui-appearance__about-author">作者：<a href="https://github.com/Shirolin" target="_blank" rel="noreferrer">Shirolin</a></span>
        </div>
        <div class="splat-ui-appearance__about-links">
          <a href="https://github.com/Shirolin/dsh-theme-splat-ui" target="_blank" rel="noreferrer" class="splat-ui-appearance__about-link">GitHub</a>
          <span class="splat-ui-appearance__about-dot" aria-hidden="true">·</span>
          <a href="https://ifdian.net/a/shirolin" target="_blank" rel="noreferrer" class="splat-ui-appearance__about-link">爱发电</a>
        </div>
      </footer>
    </section>
  </div>
</div>`
}

function surfaces() {
  return `<div class="surface-stage">
  <div class="surface-grid">
    <div class="surface-column">
      <div role="dialog" aria-label="删除会话" class="surface-dialog">
        <h2>删除这个会话？</h2>
        <p>会话记录会从本机移除，已导出的文件不受影响。这个操作不能撤销。</p>
        <div class="surface-actions">
          <button type="button">取消</button>
          <button type="button" class="is-primary" aria-label="删除">删除</button>
        </div>
      </div>
      <div role="menu" aria-label="会话操作" class="surface-menu">
        <button type="button" role="menuitem">重命名</button>
        <button type="button" role="menuitem" aria-selected="true">置顶</button>
        <button type="button" role="menuitem">归档</button>
      </div>
    </div>
    <div class="surface-column">
      <div class="surface-code">
        <div data-code-block-banner>TypeScript · splat.ts</div>
        <pre style="margin:0;border-radius:0 0 14px 14px;background:var(--dsl-code-block-background,#101010)"><code><span style="color:var(--shiki-token-keyword)">export const</span> <span style="color:var(--shiki-token-function)">splat</span> <span style="color:var(--shiki-token-punctuation)">=</span> <span style="color:var(--shiki-token-parameter)">(ink</span><span style="color:var(--shiki-token-punctuation)">:</span> <span style="color:var(--shiki-token-constant)">string</span><span style="color:var(--shiki-token-parameter)">)</span> <span style="color:var(--shiki-token-keyword)">=&gt;</span> <span style="color:var(--shiki-token-punctuation)">{</span>
  <span style="color:var(--shiki-token-keyword)">return</span> <span style="color:var(--shiki-token-string)">\`turf-\${ink}\`</span>
<span style="color:var(--shiki-token-punctuation)">}</span></code></pre>
      </div>
      <p class="surface-prose">行内代码 <code>pnpm run check</code> 保持纸面底与黑色描边。</p>
    </div>
  </div>
</div>`
}

function workspace(mode) {
  const hero = `<div class="hero">
  <span class="hero-brand-row">
    <div class="hero-brand-slot">
      <span class="splat-ui-hero__brand">${heroScene()}</span>
    </div>
  </span>
  <span class="hero-headline"><span>把灵感，涂满全场。</span><span>从一个想法开始，开启今天的创作。</span></span>
</div>`

  return `<div class="app">
  ${sidebar()}
  <main class="main">
    <header class="topbar">
      <div class="topbar-tools">
        <div class="theme-toggle" role="group" aria-label="主题模式">
          <button type="button" aria-label="日间" aria-pressed="${mode !== 'dark'}">${icon.sun}</button>
          <button type="button" aria-label="夜间" aria-pressed="${mode === 'dark'}">${icon.moon}</button>
        </div>
      </div>
      <span data-conversation-header-corner hidden></span>
    </header>
    <div class="hero-zone">
      ${hero}
      ${composer()}
      <div class="hints splat-ui-composer-hints"><kbd>Enter</kbd><span>发送</span><span class="hint-dot">·</span><kbd>Shift + Enter</kbd><span>换行</span></div>
    </div>
  </main>
</div>`
}

function boot() {
  return `<div class="boot" data-dsh-boot>
  <div class="boot-card">
    <div class="boot-label">SPLAT-STREET</div>
    <div data-dsh-boot-spinner style="--dsh-boot-arc: 240deg"></div>
    <div class="boot-hint">正在加载</div>
  </div>
</div>`
}

function page({ mode, body, extraCss = '' }) {
  const dark = mode === 'dark'
  return `<!doctype html>
<html lang="zh-CN" data-dsh-splat-ui-skin="active" data-splat-decor="on" data-splat-grain="on" data-splat-font="theme">
<head>
<meta charset="utf-8">
<style>${baseCss}\n${extraCss}</style>
<style>html{${tokenVars(mode)}}</style>
<style>${skinCss}</style>
</head>
<body${dark ? ' data-ds-dark-theme=""' : ''}>
${body}
</body>
</html>`
}

await mkdir(outDir, { recursive: true })
await mkdir(workDir, { recursive: true })

const variants = [
  { id: 'workspace-light', mode: 'light', body: workspace('light'), size: '1600,1000', target: 'workspace-light.png' },
  { id: 'workspace-dark', mode: 'dark', body: workspace('dark'), size: '1600,1000', target: 'workspace-dark.png' },
  { id: 'boot-light', mode: 'light', body: boot(), size: '1600,1000', target: 'boot-light.png' },
  { id: 'appearance-light', mode: 'light', body: appearance(), size: '760,1200', target: 'appearance-light.png' },
  { id: 'appearance-dark', mode: 'dark', body: appearance(), size: '760,1200', target: 'appearance-dark.png' },
  { id: 'surfaces-light', mode: 'light', body: surfaces(), size: '1200,760', target: 'surfaces-light.png' },
  { id: 'surfaces-dark', mode: 'dark', body: surfaces(), size: '1200,760', target: 'surfaces-dark.png' },
]

for (const variant of variants) {
  if (only !== undefined && variant.mode !== only && !variant.id.startsWith(`boot-${only}`)) continue
  const html = page(variant)
  const htmlPath = join(workDir, `${variant.id}.html`)
  await writeFile(htmlPath, html)
  const profile = mkdtempSync(join(workDir, 'splat-ui-demo-'))
  const shot = join(outDir, variant.target)
  try {
    execFileSync(
      chrome,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--run-all-compositor-stages-before-draw',
        '--virtual-time-budget=1500',
        `--window-size=${variant.size}`,
        `--user-data-dir=${profile}`,
        `--screenshot=${shot}`,
        `file:///${htmlPath.replaceAll('\\', '/')}`,
      ],
      { stdio: 'inherit' },
    )
    console.log(`${variant.id} -> docs/screenshots/${variant.target}`)
  } finally {
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
}

// Interface fragments used by the landing page: real crops of the rendered fixtures.
const crops = [
  { source: 'workspace-light.png', target: 'sidebar-light.png', x: 0, y: 0, width: 320, height: 1000 },
  { source: 'workspace-dark.png', target: 'hero-dark.png', x: 440, y: 180, width: 1030, height: 480 },
  { source: 'workspace-light.png', target: 'composer-light.png', x: 420, y: 650, width: 1040, height: 300 },
  { source: 'workspace-light.png', target: 'hero-light.png', x: 440, y: 180, width: 1030, height: 480 },
]

for (const crop of crops) {
  const source = join(outDir, crop.source)
  if (!existsSync(source)) continue
  const html = `<!doctype html><html><body style="margin:0;overflow:hidden;background:#ffffff"><div style="position:relative;width:${crop.width}px;height:${crop.height}px;overflow:hidden"><img src="${pathToFileURL(source).href}" alt="" style="position:absolute;left:-${crop.x}px;top:-${crop.y}px;width:1600px"></div></body></html>`
  const htmlPath = join(workDir, `crop-${crop.target}.html`)
  await writeFile(htmlPath, html)
  const profile = mkdtempSync(join(workDir, 'splat-ui-crop-'))
  try {
    execFileSync(
      chrome,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        `--window-size=${crop.width},${crop.height}`,
        `--user-data-dir=${profile}`,
        `--screenshot=${join(outDir, crop.target)}`,
        `file:///${htmlPath.replaceAll('\\', '/')}`,
      ],
      { stdio: 'inherit' },
    )
    console.log(`crop -> artifacts/demo/${crop.target}`)
  } finally {
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
}
