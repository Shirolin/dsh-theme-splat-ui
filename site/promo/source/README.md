# 墨街竖版宣传片

制作基线是 [storyboard.md](storyboard.md) 的 9 镜。主文案为“把工作台，涂成主场。”；12.5–14 秒换墨是唯一主峰；17.5–22.5 秒展示代码与工具结果；27–30 秒保留静止片尾。

## 本地复现

在项目根目录执行，需要 Node.js 24、Chrome，以及包含 libx264 / libwebp 的 ffmpeg、ffprobe。脚本默认使用 Windows Chrome 安装路径；其他位置通过 `CHROME_PATH` 环境变量指定。中文排字使用 Windows 的微软雅黑，跨系统字体差异可能改变排版。

```powershell
# 先检查 16 个关键时刻
node site/promo/source/capture-vertical.mjs --samples

# 正式采样：1080×1440 CSS 舞台，DSF=2，900 张 2160×2880 JPEG
node site/promo/source/capture-vertical.mjs

# 编码，并从成片首帧生成 PNG 封面和 webp 海报
pwsh -File site/promo/source/encode-vertical.ps1

# 提取分镜参考帧、验证交付参数并生成本地验收页
node site/promo/source/verify-vertical.mjs
```

帧和 Chrome 隔离 profile 默认写入被忽略的 `.tmp/promo-production-20261115/render/`。`capture` 可用 `--out=<相对项目根目录的路径>`；对应的编码脚本可用 `-Render <路径>`。运行会覆盖该目录的同名帧和输出文件，源素材保持不变。

直接打开 `stage-vertical.html` 可拖动时间轴预览。脚本通过 `window.renderAt(seconds)` 确定画面；自动采样使用 `?capture=1` 隐藏播放控件。播放控件的实时计时只用于预览，成片按 `index / 30` 采样。

## 素材与实现

- `assets/` 是隔离 DSH 0.2.2-rc.1 Web 的真实截图，拍摄视口、裁切和来源说明见 `assets/manifest.json`。
- 演示会话为本地预置内容：“墨街 · 设计工作台”“首页视觉提案”“交互与排版”。代码使用 `src/theme.ts`；没有模型请求或工具实际执行。工具卡由 DSH 的真实历史渲染器呈现。
- 日夜整窗、欢迎页、输入菜单、外观设置、代码、工具结果与 390px 菜单均来自真实宿主。舞台只做裁切和等比例相机运动；主题源码视觉保持原样。
- 喷墨形状、墨轨、速度线与粒子由本项目 canvas 代码生成。粒子由固定种子和绝对时间计算，支持任意顺序采样；不依赖前一帧的状态。
- 参考动森项目的逐帧采样方法；叙事、配色、墨迹与舞台构图围绕墨街制作。

## 交付

成片和附件位于上一级 `site/promo/`：

- `splat-street-vertical.mp4`：1080×1440、30 秒、30fps、H.264、CRF18、bt709、yuv420p、faststart，含 AAC 48kHz 立体声音轨、第 0 帧封面首帧（兼容微信转发抽帧）及内嵌 `attached_pic` 封面流。
- `cover-vertical.png` / `poster-vertical.webp`：专属设计的 3:4 竖版视频封面与 WebP 海报（同时内嵌为 MP4 封面流）。
- `storyboard/`：9 镜参考帧、额外的工具结果帧与联系表。
- `index.html`：本地播放器和分镜索引。
- `capture-manifest.json` / `video-probe.json` / `verification.json`：采样、编码、确定性和文件一致性证据。

BGM 由 Google Flow Music（`Lyria 3.5`）创作，武器转场与 UI 音效组合自 `earshot` 开源音效库及 `Freesound` CC0 素材，经 48kHz 立体声对帧混音与响度均衡（`-15.5 LUFS`）混流封装。
