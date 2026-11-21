# 横版粗剪自检（SPLAT-STREET 第二轮深度打磨）

本轮交付为 `../splat-street-landscape-animatic.mp4`（720p animatic）与预览验收页 `../animatic-landscape.html`。

| 验收项 | 本轮结果 | 证据 |
| --- | --- | --- |
| 视频规格与封装 | 900 帧，1280×720（2560×1440 DSF=2 采样缩至 720p），30fps，30s，H.264 CRF18、bt709、yuv420p、faststart（`moov` 在 `mdat` 前）、无音轨、全片解码无错 | `verification.json`、`../splat-street-landscape-animatic.mp4` |
| 武器转场、全遮盖与无硬切裁剪 | 覆盖全部 6 种转场（`shooter-barrage`、`squid-surge`、`roller-wipe`、`inkbrush-slash`、`dual-roller`、`turf-clash`）；`fullCoverEvents: 5`（`01-02`、`03-04`、`04-05`、`07-08`、`08-09`）；`clipRevealFrames: 43`（涵盖 `02-03` 8 帧、`05-06` 10 帧、`06-07` 15 帧及 `07-08` 10 帧） | `verification.json`、`transition-shooter.png`、`transition-roller.png`、`transition-dual-roller.png`、`transition-clash.png` |
| 9 镜差异化构图与贴纸排版 | 覆盖全部 9 种 `layoutPreset`；`cardTiltDeg` 在 `-3.2°` 至 `+2.0°` 之间正负交错；Shot 05 改用 `hero-dark` 祭典主海报消除与 Shot 06 撞车；Shot 09 改造为荧光绿斜纹名片卡并隐藏底部长栏 | `verification.json`、`contact-sheet.png`、`shot-05.png`、`shot-07-tool.png` |
| Shot 04 三档面板与左槽同步 | `9.80s`（涂地 0.00 @ 0%）、`10.90s`（均衡 0.12 @ 20%）、`12.00s`（纸白 0.50 @ 83.3%）预览窗雾面、三档按钮高亮、滑杆与左侧装备槽同步一致 | 抽样样本 `t-9-800.png`、`t-10-900.png`、`t-12-000.png` |
| 安全区、粒子保护与旧文案清零 | 非全遮盖帧全部 `textBoxes` 位于 `[48, 32, 1872, 1048]` 内；900 帧 `particles.overlaps === 0`；`legacyCopyHits: 0`；`Nunito` 700/900 `loaded` | `verification.json`、`capture-manifest.json` |
| 确定性与片尾静止 | `renderAt(18.8)` 重复非顺序采样 SHA256 一致；片尾 `27.5s` 与 `29.9666667s` 像素 SHA256 完全一致；`consoleErrors: []` | `capture-manifest.json`、`verification.json` |
| 真实播放器兼容与门禁 | Chrome 实测 `1280×720 / 30s`、14 个按钮与 1100px/390px 无溢出、12 点跳转 `readyState === 4`、连续播放无错；竖版哈希未改；`pnpm run check:site` 通过 | `player-verification.json`、`verification.json`、`scripts/check-site.mjs` |

## 第二轮人工视觉复查摘要

- 逐张复查了最终 `contact-sheet.png`、`shot-05.png`（13.65s）、`shot-07-tool.png`（21.30s）、`transition-shooter.png`（2.25s）、`transition-roller.png`（12.75s）、`transition-dual-roller.png`（22.60s）、`transition-clash.png`（25.48s），以及抽样阶段的 `t-9-800.png`、`t-10-900.png`、`t-12-000.png`、`t-22-450.png`、`t-27-500.png`。
- 确认双滚筒左右墨墙为 100% 实心不透明涂墨、全高 940px 滚筒在 `22.60s` 干净撤开揭露 Shot 08 无半透压字；巨型滚筒（`12.75s`）完整跨屏压刷；终局 `GAME!` 对撞（`25.48s`）上下无漏缝；Shot 07 工具卡胶带位于右上/左下，完全避开左上角「工具调用 · read_file」文字；Shot 04 三档面板与左槽精准联动。
