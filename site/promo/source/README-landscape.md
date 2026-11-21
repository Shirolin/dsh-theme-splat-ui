# 墨街横版 animatic（SPLAT-STREET）

新版 30 秒横版宣传片粗剪（1920×1080 逻辑舞台，以 1280×720 DSF=2 采样后编码为 720p30 animatic）。竖版保持冻结不改动。

## 本地复现

在项目根目录执行，使用已安装的 Node.js 24、Chrome、ffmpeg / ffprobe。Chrome 路径可通过 `CHROME_PATH` 指定；英文与数字使用主题内置 `Nunito`（700 / 900，`site/assets/fonts/nunito-*.woff2`），中文回退使用微软雅黑。

```powershell
# 先看关键帧
node site/promo/source/capture-landscape.mjs --samples

# 900 帧确定性采样
node site/promo/source/capture-landscape.mjs

# 编码本轮 720p 粗剪
pwsh -File site/promo/source/encode-animatic.ps1

# 规格、逐帧几何与保护区检查，生成参考帧和本地播放器
node site/promo/source/verify-animatic.mjs
```

直接打开 `stage-landscape.html` 可拖动时间轴预览。自动捕获由 `?capture=1` 隐藏播放控件并经 `window.renderAt(seconds)` 驱动；所有画面与粒子均按绝对时间确定性计算，不依赖上一帧状态。

逻辑舞台为 `1920×1080`，安全区为 `[48, 32, 1872, 1048]`（左右留白 48px、上下留白 32px）。采样默认写入被 git 忽略的 `.tmp/promo-landscape-20261115/render/`；捕获可用 `--out=<项目相对路径>` 指定目录，编码对应 `-Render <目录>`，校验对应 `--render=<目录>`。全部静态资源与页面链接可通过 `pnpm run check:site` 校验。

## 模块分工

- `landscape-copy.js`：调色板 `PALETTE`、9 镜分镜与玩家向文案 `SHOTS`、9 个转场/切卡窗口 `TRANSITION_WINDOWS`，以及 `getShotAt(t)`、`getShotById(id, t)`、`getActiveTransition(t)` 纯查询函数。
- `landscape-transitions.js`：6 种斯普拉遁武器转场与多瓣墨团、经典鱿鱼轮廓、背景保护区三层飞沫、`applyTransitionClip` 双镜裁剪揭露及 `getTransitionShake` 冲击震屏的确定性 Canvas 2D 渲染器。
- `film-landscape.js`：日/夜三色街区画布、双镜头裁剪无硬切合成、倾斜贴纸与战术胶带排版、三档外观面板联动、街头播报 HUD、真实宿主截图调度与诊断导出。
- `stage-landscape.html` / `landscape.css`：舞台页面与内置 `Nunito` 字体声明。
- `capture-landscape.mjs` / `encode-animatic.ps1` / `verify-animatic.mjs`：关键帧/全量采样、H.264 编码与自动化门禁脚本。

## 9 镜分镜与玩家向文案

跨镜转场通过全幅墨层遮盖（`hasFullCover`）或 `applyTransitionClip` 双镜头几何裁剪（`hasClipReveal`）同步切换底层镜头，并在冲击峰值施加安全微震屏；`27.5–30.0s` 片尾保持完全静止。

| 镜号 | 名义时段 | 实际切换区间 | 模式 | 构图预设 (`layoutPreset`) | 倾角 (`cardTiltDeg`) | 贴纸主标 & 副标 | 胶带标签 (`tapeTag`) & 特性胶囊 (`featurePills`) | 街头播报条 (`caption`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | 0.0–2.5s | 0.00–2.40s | light | `hero-splash` | `-2.2°` | **墨街开涂！**<br>SPLAT-STREET · DSH 斯普拉遁 2 街头主题 | `STAGE 01 // INKOPOLIS SQUARE`<br>三色街区画布 / 荧光绿×洋红 | 尚兴广场集合——准备开涂！ |
| 02 | 2.5–6.0s | 2.40–5.95s | light | `right-stage` | `-1.8°` | **三色街区，开局即满涂。**<br>荧光绿 · 奶油纸 · 洋红泼溅 · 墨黑侧栏 | `DAY TURF // 白昼涂地`<br>漂浮广场插画 / 黑边硬阴影 | 三色条纹画布配街头贴纸，进场就是主场。 |
| 03 | 6.0–9.2s | 5.95–9.18s | light | `dual-stack` | `+2.0°` | **指令上膛，连发不卡壳。**<br>荧光绿选中甩尾 · 洋红滴墨输入壳 | `SUB WEAPON // 菜单与输入区`<br>圆角输入壳 / 选中绿墨甩尾 | 斜杠菜单甩出绿墨尾，选中反馈直接拉满。 |
| 04 | 9.2–12.5s | 9.18–12.90s | light | `gear-panel` | `-1.5°` | **满涂还是护眼？浓度随手调。**<br>涂地 0.00 · 均衡 0.12 · 纸白 0.50 | `GEAR TUNING // 墨街外观面板`<br>三档预设 / 0-0.60 无级滑杆 / 网点开关 | 三档预设加无级滑杆，重度涂地或清爽护眼随手切。 |
| 05 | 12.5–14.5s | 12.90–14.45s | dark | `roller-fest` | `-3.2°` | **祭典入夜！**<br>SPLATFEST! · DAY TURF ➔ NIGHT SHIFT | `ROLLER RUSH // 昼夜切换`<br>滚筒平推刷屏 / 昼夜直切 | 滚筒平推全场——直接切入午夜祭典！ |
| 06 | 14.5–17.8s | 14.45–17.75s | dark | `left-stage` | `+1.6°` | **午夜祭典，霓虹全开。**<br>炭黑底色 · 零反相调校 · 霓虹高反差 | `NIGHT SHIFT // 夜间战场`<br>#1B1B19 炭黑 / #D3F510 荧光绿 / #FF2489 洋红 | 拒绝无脑反色！炭黑底衬托荧光墨色，夜战更带感。 |
| 07 | 17.8–22.5s | 17.75–22.45s<br>(`swapAt: 20.10s`) | dark | `tactical-swap` | `-1.4°` → `+1.4°` | **战况再乱，视野照样清。**<br>深色代码岛 · 霓虹语法 · 工具输出卡 | `BATTLE LOG // 代码岛与工具卡`<br>Shiki 霓虹语法 / 高对比工具卡 | 深色代码岛配清晰工具卡，长对话刷屏也不花眼。 |
| 08 | 22.5–25.5s | 22.45–25.48s | dark | `center-squad` | `+0.8°` | **缩成窄窗，照样能潜行。**<br>副屏挂机 · 菜单输入全保留 | `390PX SQUAD // 窄屏贴边响应`<br>390px 窄屏实拍 / 响应式贴边 | 压到 390px 小窗，贴纸与菜单布局依然利落。 |
| 09 | 25.5–30.0s | 25.48–30.00s<br>(27.5s 起静止) | light | `turf-finale` | `-2.5°` | **墨街**<br>SPLAT-STREET · github.com/Shirolin/dsh-theme-splat-ui | `GAME! // 昼夜双场 · 一键装入 DSH`<br>DAY TURF 50.0% / NIGHT SHIFT 50.0% | 昼夜双场就绪——把 DSH 刷成你的尚兴广场！ |

## 6 种斯普拉遁武器转场设计

| 窗口 ID | 时间区间 | 切点 (`cutAt`) | 武器类型 (`type`) | 镜头流向 (`from → to`) | 遮盖 / 裁剪 (`fullCover / clipReveal`) | 倾角 & 主副墨色 | 视觉机制 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `01-02` | 2.10–2.70s | 2.40s | `shooter-barrage` | 1 → 2 | 全遮盖 (`true / false`) | `-8°` · 绿 → 粉 | **射击墨点涂满**：非线性射速多瓣墨点铺满全屏，撞击微震后放射状退场 |
| `02-03` | 5.60–6.20s | 5.95s | `squid-surge` | 2 → 3 | 裁剪揭露 (`false / true`) | `-6°` · 绿 × 粉 | **潜墨游动破墨**：弯曲潜墨流线携鱿鱼剪影横穿，切点星爆裁剪无硬切揭露 Shot 03 |
| `03-04` | 8.80–9.50s | 9.18s | `shooter-barrage` | 3 → 4 | 全遮盖 (`true / false`) | `+7°` · 粉 → 绿 | **射击墨点涂满**：洋红主色弹幕覆盖全屏切换至外观参数面板 |
| `04-05` | 12.35–13.45s | 12.90s | `roller-wipe` | 4 → 5 | 全遮盖 (`true / false`) | `-12°` · 粉 × 绿 | **巨型滚筒全屏刷墨**：等宽滚筒沿斜角前锋刷满全屏，在切点切入纯夜场祭典海报 |
| `05-06` | 14.15–14.75s | 14.45s | `squid-surge` | 5 → 6 | 裁剪揭露 (`false / true`) | `+8°` · 粉 × 绿 | **潜墨星爆切入夜战**：洋红潜墨在祭典海报破墨炸开，通过星爆裁剪揭露夜间整窗 |
| `06-07` | 17.40–18.00s | 17.75s | `inkbrush-slash` | 6 → 7 | 裁剪揭露 (`false / true`) | `-28°` · 绿 × 粉 | **北斋笔刷斜斩**：沿斜劈线设置半平面裁剪，随飞白笔痕同步揭露深色代码岛 |
| `07-swap` | 19.80–20.40s | 20.10s | `inkbrush-slash` | 7 → 7 | 局域切卡 (`cardAreaOnly`) | `+26°` · 粉 × 绿 | **北斋笔刷局域切卡**：仅扫过右侧卡片区不压左字，将前景代码岛切至高对比工具卡 |
| `07-08` | 22.10–22.80s | 22.45s | `dual-roller` | 7 → 8 | 全遮盖 + 裁剪 (`true / true`) | `0°` · 绿 × 粉 | **双侧滚筒夹击收窄**：等高滚筒与不透明墨墙合拢碰撞，弹回 `390px` 窄廊停拍后向两侧撤离 |
| `08-09` | 25.10–25.80s | 25.48s | `turf-clash` | 8 → 9 | 全遮盖 (`true / false`) | `0°` · 绿 vs 粉 | **终局满屏对撞**：全高左右墨浪撞击覆盖全屏并弹出 `GAME! / 50.0% VS 50.0%` 后揭露结算页 |

## 产物与验收范围

- `../splat-street-landscape-animatic.mp4`：1280×720、30s、30fps、H.264 CRF18、bt709、yuv420p、faststart，含 AAC 48kHz 立体声音轨、第 0 帧封面首帧（兼容微信转发抽帧）及内嵌 `attached_pic` 封面流（与竖版共用同一套卡点混音母带）。
- `../cover-landscape.png` / `../poster-landscape.webp`：专属设计的 16:9 横版视频封面与 WebP 海报（同时更新 `../social-card.png` 为 `#1edc00` 新配色）。
- `../animatic-landscape.html`：本地播放与镜头跳转验收页。
- `../landscape-animatic/`：9 镜参考帧（`shot-01.png`..`shot-09.png`）、工具补帧（`shot-07-tool.png`）、转场特写帧（`transition-shooter.png`、`transition-roller.png`、`transition-dual-roller.png`、`transition-clash.png`）、`contact-sheet.png`、采样清单、`verification.json` 与 `review.md`。

自动化校验覆盖：900 帧参数与完整解码、源码 SHA256 与非顺序采样确定性、`27.5–30.0s` 末尾静帧、非全幅遮盖帧全文字处于 `[48, 32, 1872, 1048]` 安全区、背景粒子与保护区零碰撞（`overlaps === 0`）、转场种类与多次全覆盖（`coverEvents >= 4`）及 `clipReveal` 校验、卡片正负倾角与布局多样性检查、以及竖版既有产物未被改动。
