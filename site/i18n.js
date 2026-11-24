;(() => {
  const SUPPORTED_LOCALES = ['zh', 'en', 'ja', 'ko']
  const STORAGE_KEY = 'splat-site-lang'
  const HTML_LANG = {
    zh: 'zh-CN',
    en: 'en',
    ja: 'ja',
    ko: 'ko',
  }

  function normalizeLocale(input) {
    if (typeof input !== 'string') return null
    const primary = input.trim().toLowerCase().split(/[-_]/, 1)[0]
    return SUPPORTED_LOCALES.includes(primary) ? primary : null
  }

  function readQueryLocale() {
    try {
      const search = window.location?.search
      if (!search) return null
      const params = new URLSearchParams(search)
      return normalizeLocale(params.get('lang'))
    } catch {
      return null
    }
  }

  function readStoredLocale() {
    try {
      return normalizeLocale(window.localStorage?.getItem(STORAGE_KEY))
    } catch {
      return null
    }
  }

  function writeStoredLocale(locale) {
    try {
      window.localStorage?.setItem(STORAGE_KEY, locale)
    } catch {
      // Ignore storage failures in restricted contexts or originless test DOMs.
    }
  }

  function readNavigatorLocale() {
    try {
      const candidates = Array.isArray(navigator.languages) ? [...navigator.languages, navigator.language] : [navigator.language]
      for (const candidate of candidates) {
        const normalized = normalizeLocale(candidate)
        if (normalized) return normalized
      }
    } catch {
      // Ignore navigator access errors.
    }
    return null
  }

  function detectInitialLocale() {
    const queryLocale = readQueryLocale()
    if (queryLocale) {
      writeStoredLocale(queryLocale)
      return queryLocale
    }
    return readStoredLocale() ?? readNavigatorLocale() ?? 'zh'
  }

  function formatTemplate(template, params) {
    if (!params) return template
    return template.replace(/\{(\w+)\}/g, (_, key) => (params[key] !== undefined ? String(params[key]) : ''))
  }

  const DICTIONARIES = {
    zh: {
      common: {
        langLabel: '选择语言',
      },
      landing: {
        title: 'SPLAT-STREET：斯普拉遁 2 风格的 DeepSeek Harness 主题',
        description: 'SPLAT-STREET 是一套斯普拉遁 2 风格的 DeepSeek Harness 皮肤插件，提供官方绿三色条纹画布、炭黑夜间模式、3 档主墨色与连续画布墨度。',
        nav: {
          skip: '跳到正文',
          aria: '主导航',
          toggleAria: '打开导航菜单',
          battleground: '战场',
          promo: '宣传片',
          showcase: '图鉴',
          faq: '问答',
          installCta: '安装主题',
          mega: {
            visualLabel: '视觉系统',
            paintHtml: '组件上色<span>公开 Token 与 4 个品牌 Slot</span>',
            dayNightHtml: '昼夜战场<span>交互调节日间、夜间与画布墨度</span>',
            appearanceHtml: '外观定制<span>主墨色预设与表面开关</span>',
            docsLabel: '演示与文档',
            promoHtml: '宣传片<span>30 秒横版实机演示与配乐</span>',
            verticalHtml: '竖版分镜<span>3:4 竖版宣传片与九镜索引</span>',
            catalogueHtml: '组件图鉴<span>18 组真实 DSH 组件对照</span>',
            cardAlt: 'SPLAT-STREET 白色描边 Composer 卡片与右上角洋红滴墨装饰',
            cardTitle: '18 组实时组件图鉴',
            cardDesc: '在线切换主墨色与画布墨度',
          },
        },
        hero: {
          title: 'DeepSeek Harness 墨街主题',
          lead: '斯普拉遁 2 风格皮肤插件：官方绿 #1EDC00 三色条纹画布、炭黑夜间模式、3 档主墨色与连续画布墨度，仅覆写公开 Token 与 Slot。',
          installCta: '安装主题',
          promoCta: '看 30 秒宣传片',
          stageAlt: 'SPLAT-STREET 夜间午夜祭典工作台：炭黑画布、洋红泼溅、官方绿选中行与墨街广场插画',
        },
        workbench: {
          headingHtml: '4 个接缝逐项上色。<span class="muted">保留原生侧栏与快捷键。</span>',
          lead: '主题只覆写公开的 ThemeRuntime Token 与 4 个品牌 Slot。侧栏会话、Diff 交付区、工具卡片与输入区保持原生交互，停用即完整清理。',
          cta: '查看 18 组实时组件图鉴',
          appAria: 'DSH 侧栏会话列表与 SPLAT-STREET Token Diff 交付预览',
          dataOpen: '待验收',
          dataWork: '调试中',
          dataDone: '已通过',
          crumbHtml: '墨街工作室 <i>/</i> <b>真实宿主</b>',
          filterPh: '筛选',
          navAll: '全部',
          navDay: '日间',
          navNight: '夜间',
          navVerified: '已验收',
          navSeams: '接缝',
          colsHtml: '<span>模块</span><span>验收项</span><span>状态</span><span>耗时</span>',
          rows: {
            tokensSub: '日夜色板映射',
            skinSub: '三色条纹与滴墨',
            bootSub: '24 格大招能量槽',
            prefsSub: '三档主墨色存储',
            diffSub: '霓虹与原生切换',
            sidebarSub: '官方绿选中墨尾',
            toolSub: '45 行结果对比度',
            narrowSub: '390px 窄屏阅读',
            installSub: '停用完整清理还原',
          },
          statusWork: '调试中',
          statusDone: '已通过',
          diffApply: '应用修改',
          diffApplied: '已应用',
          diffMsgHtml: '官方绿 <code>#1EDC00</code> 底上白字对比度不足，统一用 <code>readable()</code> 选择深墨文字。',
        },
        showcase: {
          headingHtml: '昼夜双战场与画布墨度。<span class="muted">从纸白到涂地实时切换。</span>',
          lead: '日间采用官方绿、奶油与洋红三色条纹，夜间切换为炭黑广场。拖动滑杆可在纸白 20%、均衡 50% 与涂地 100% 间连续微调画布纸雾。',
          modeAria: '昼夜战场模式',
          lightMode: '日间涂地',
          darkMode: '夜间祭典',
          densityLabel: '画布墨度',
          densityPresetsAria: '画布墨度预设',
          presetPaper: '纸白 20%',
          presetBalanced: '均衡 50%',
          presetTurf: '涂地 100%',
          cta: '前往组件图鉴切换三套主墨色',
          lightAlt: '日间工作台：近黑侧栏、官方绿/奶油/洋红三色条纹画布、自由漂浮的广场插画与白色 Composer 卡片',
          darkAlt: '夜间午夜祭典广场场景：炭黑底色上的墨街广场插画、两侧鱿鱼贴纸与洋红官方绿装饰',
        },
        promo: {
          headingHtml: '30 秒实机宣传片。<span class="muted">完整演示昼夜战场与斜杠指令。</span>',
          verticalLink: '查看竖版 3:4 与九镜索引',
          landscapeLink: '横版分镜拆解',
          videoAria: 'SPLAT-STREET 墨街主题 30 秒横版宣传片（含昼夜战场、斜杠指令、墨度调节与窄屏演示）',
        },
        features: {
          headingHtml: '外观面板与表面开关。<span class="muted">主墨色与墨度都在客户端本地生效。</span>',
          card1Title: '切换三套主墨色与画布墨度',
          card1Desc: '外观面板提供官方绿 #1EDC00、荧光绿与黄绿三档主墨色，并支持 0%–100% 滑杆微调。',
          sliderTitle: '墨街外观',
          sliderReset: '重置',
          sliderDensity: '画布墨度',
          sliderRadius: '圆角与阴影',
          sliderGreenAria: '主墨色预设',
          greenOfficial: '官方绿',
          greenNeon: '荧光绿',
          greenLime: '黄绿',
          card2Title: '独立开关装饰、网点与语法',
          card2Desc: '插画装饰、纸面网点、内置 Nunito 字体与原生 Diff 语法可单独开关，偏好存本地 localStorage。',
          togglesTitle: '墨街表面开关',
          togglesCount: '2 of 3 on',
          toggle1Label: '广场插画与墨迹',
          toggle1Sub: '关闭后仅保留三色画布',
          toggle2Label: '纸面网点与内置字体',
          toggle2Sub: '构建期内嵌 WOFF2 无需联网',
          toggle3Label: 'DSH 原生 Diff 配色',
          toggle3Sub: '切换霓虹与红绿行',
        },
        toolchain: {
          headingHtml: '离线构建与门禁校验。<span class="muted">字体与素材内嵌进客户端产物。</span>',
          card1Title: '标准前端工具链离线打包',
          card1Desc: '基于 TypeScript、esbuild、Biome 与 Lightning CSS 构建，字体与 SVG/PNG 素材内嵌进产物。',
          diagramAlt: 'SPLAT-STREET 基于 TypeScript、esbuild、Biome、Node.js、pnpm 与 React 构建。',
          card2Title: '通过完整门禁与夹具校验',
          card2Desc: '每次构建均运行站点校验、TypeScript 类型检查、契约测试与 DSH 主题兼容性核对。',
        },
        screens: {
          headingHtml: '工作台的三处重绘。<span class="muted">从启动加载槽到设置面板统一视觉语言。</span>',
          tablistAria: '工作台核心界面',
          tabBoot: '大招启动页',
          tabDay: '日间外观',
          tabNight: '夜间广场',
          panelBootDesc: '启动页保留顶部鱿鱼印章，并将原版加载圈重绘为斯普拉遁 24 格特殊武器能量槽，进度直接读取宿主变量。',
          panelBootLink: '在图鉴中交互查看启动卡',
          panelDayDesc: '在设置、内置插件、墨街外观中切换纸白 20%、均衡 50%、涂地 100% 与三套主墨色，实时预览战场条纹。',
          panelDayLink: '在图鉴中打开外观面板',
          panelNightDesc: '夜间模式统一使用中性炭黑表面与浅墨发丝线，避免纯白过曝，只将荧光绿保留在主按钮与焦点状态。',
          panelNightLink: '在图鉴中对比夜间样式',
          imgBootAlt: 'SPLAT-STREET 启动页：白色贴纸卡、鱿鱼徽章与 24 格绿色大招能量槽进度圈',
          imgDayAlt: '日间模式设置页中的墨街外观面板：战场预览卡、墨度滑杆与主墨色选择器',
          imgNightAlt: '夜间模式设置页中的墨街外观面板：炭黑表面、官方绿选中描边与深色预览',
        },
        install: {
          headingHtml: '两条命令完成安装。<span class="muted">支持 npm 与离线归档包。</span>',
          descHtml:
            '进入 DSH profile 目录通过 npm 安装最新版；若使用离线归档包，可前往 <a class="link" href="https://github.com/Shirolin/dsh-theme-splat-ui/releases">Releases</a> 下载 <code>.tgz</code> 或按 <a class="link" href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/README.zh.md#安装">README</a> 本地打包后完整重启服务。',
          check1: '同一 profile 建议只启用一个主题插件',
          check2: '外观偏好保存在本机 localStorage，不写入 Host 设置',
          check3: '停用或卸载主题后自动还原 DSH 原生外观',
          cmdBarLeft: '在 DSH profile 目录执行',
          cmdDir: 'cd <DSH_Profile_目录>',
          copyBtn: '复制命令',
          copied: '已复制',
          copyFailed: '复制失败，请手动选择',
          compatLink: '查看兼容性契约',
          stat1: '套主墨色预设（官方绿 / 荧光绿 / 黄绿）',
          stat2: '个公开 DSH Slot 品牌与外观接缝',
          stat3: '组实时 DSH 组件夹具对比',
          stat4: '处原生侧栏布局与快捷键改动',
        },
        faq: {
          headingHtml: '常见问答。<span class="muted">授权来源、兼容性与恢复方式。</span>',
          q1Title: '这是官方主题吗？',
          q1Html:
            '不是。SPLAT-STREET 是非官方粉丝主题，与 Nintendo 及 DeepSeek 官方没有隶属或背书关系，来源见<a class="link" href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/THIRD_PARTY_NOTICES.md">第三方声明</a>。',
          q2Title: '会改动默认布局或快捷键吗？',
          q2Desc: '不会。主题只覆写公开 Token 与 4 个品牌 Slot，侧栏、输入区与快捷键保持原生行为。',
          q3Title: '目前支持哪些运行平台？',
          q3Desc: '已完成真实 Web 宿主的日夜与 390px 窄屏全量验收，以及 Windows 桌面端原生标题栏与侧栏布局实机验证；独立 WebView 窗口仍随后续版本补充回归。',
          q4Title: '怎么恢复原生外观？',
          q4Desc: '在插件管理里禁用主题或卸载包后重启，安装时快照的根属性会清理恢复，不残留外观设置。',
          visualAlt: 'SPLAT-STREET 日间墨街广场空会话插画',
        },
        close: {
          heading: '把工作台涂成墨街主场',
          leadHtml: '进入 DSH profile 目录执行 <code>pnpm add dsh-theme-splat-ui</code>，安装后重启生效。',
          cta: '安装主题',
        },
        footer: {
          lede: '斯普拉遁 2 风格的 DeepSeek Harness 主题插件。',
          col1Title: '视觉系统',
          col1Link1: '组件上色',
          col1Link2: '昼夜战场',
          col2Title: '能力细节',
          col2Link1: '外观定制',
          col2Link2: '离线构建',
          col3Title: '演示与图鉴',
          col3Link1: '竖版宣传片',
          col3Link2: '组件图鉴',
          col4Title: '仓库与文档',
          col4Link2: '兼容性',
          legal:
            '非官方粉丝主题 · Splatoon 与 Splatoon 2 是 Nintendo 的商标 · MIT License 2026 Shirolin · Product names and logos are trademarks of their owners',
          credits: '素材来源与第三方声明',
        },
      },
      showcase: {
        title: 'DSH 组件图鉴 · SPLAT-STREET',
        description: 'SPLAT-STREET 组件图鉴：基于真实 DSH 运行时 CSS 与主题皮肤渲染的日夜组件对照预览。',
        backHome: '返回官网',
        heading: 'DSH 组件图鉴',
        navPromo: '宣传片',
        searchSr: '搜索组件或插件包',
        searchPlaceholder: '筛选组件名、标题或插件包（按 / 聚焦）',
        modeSwitchAria: '切换日夜模式',
        modeLight: '日间',
        modeDark: '夜间',
        controlsAria: '外观参数实时调节',
        densityGroupTitle: '调节主工作台画布、Diff 交付区、迷你预览窗等使用 --dsw-alias-bg-base 的画布墨度；固定背景卡片不变',
        densityLabel: '画布墨度',
        densityPresetsAria: '画布墨度预设',
        presetPaper: '纸白',
        presetBalanced: '均衡',
        presetTurf: '涂地',
        greenGroupTitle: '切换全局主墨色（官方绿 / 荧光绿 / 黄绿）',
        greenLabel: '主墨色',
        greenPresetsAria: '主墨色预设',
        greenOfficial: '官方绿',
        greenNeon: '荧光绿',
        greenLime: '黄绿',
        decorTitle: '切换工作台与纸面边缘的墨滴和泼溅装饰',
        decorLabel: '插画装饰',
        grainTitle: '切换纸面与输入卡的网点纹理',
        grainLabel: '纸面网点',
        diffTitleLight: '切换 Diff 红绿行高亮（仅日间模式作用于 Diff 交付区卡片）',
        diffTitleDark: '原生 Diff 语法仅在日间模式生效（夜间模式保留高对比语义色）',
        diffLabel: '原生 Diff 语法',
        fontTitle: '切换主题内置 Nunito 圆体与系统默认字体（主要影响英文与数字字形）',
        fontLabel: '系统字体',
        resetTitle: '清除统一覆盖，使每张卡片恢复各自的演示预设状态',
        resetBtn: '恢复各卡默认',
        ctrlHint: '墨度作用于画布、Diff 与预览窗；开关实时透传给每张卡片。',
        sidebarAria: '组件分类目录',
        loading: '正在加载组件清单…',
        emptyTitle: '没有找到匹配的组件夹具。',
        emptyHint: '试试搜索 `composer`、`diff`、`appearance` 或插件包名。',
        clearSearch: '清空筛选',
        footerDefault: '渲染于真实 DSH 运行时 CSS 与主题构建产物。',
        footerHome: '主题首页',
        footerPromo: '宣传片',
        footerRepo: 'GitHub 仓库',
        statusFiltered: '筛选结果：{visible} / {total} 组组件夹具（{mode}模式）',
        statusAll: '共 {total} 组真实 DSH 组件夹具 · 当前为{mode}模式',
        modeWordLight: '日间',
        modeWordDark: '夜间',
        groupCount: '{count} 项',
        openRaw: '单独打开 ↗',
        footerBuilt: '渲染于 DSH {version} · 构建日期 {date} · 夹具与皮肤源码未改写',
        loadError: '无法加载组件清单（{message}）。请确认已运行 pnpm run showcase 并通过 HTTP 服务访问。',
        groups: {
          工作区与会话: '工作区与会话',
          代码与交付: '代码与交付',
          浮层与反馈: '浮层与反馈',
          设置与外观: '设置与外观',
          启动页: '启动页',
          其他: '其他',
        },
        fixtures: {
          'conversation-workspace': '主工作区 · 标题栏、代码块与输入卡片',
          'sidebar-masthead': 'SPLAT-STREET · 真实侧栏品牌和会话树',
          'turn-trigger-notice': '触发提示条 · 深色卡片文字可读性',
          'code-island-scopes': '代码岛作用域 · 浅色卡面不被浅色前景命中',
          'deliverables-diff': '右侧栏 deliverables diff 的语法配色（浅色面板）',
          'deliverables-diff-native': 'deliverables diff 切到 DSH 原生语法色',
          'document-preview-plain': '右侧栏「文档」预览的纯文本视图',
          'tool-result': '工具结果 · 真实输入输出卡片',
          'input-menu': '输入菜单 · 指令别名、选中对比与窄屏边界',
          'input-skills': '技能建议 · 多条长说明不重叠',
          'keybinding-search': '快捷键弹窗 · 搜索输入（真实 DSH DOM）',
          'model-search': '模型列表 · 单层圆角搜索框',
          'toast-notice': '浮层提示 · toast 在工具提示面上的可读性',
          'appearance-panel': '墨街外观 · 当前设置面板',
          'plugin-settings-light': '插件管理 · 亮色开关边界与阅读面',
          'settings-nav': '设置页 · 墨迹选中、标题与完整焦点环',
          'boot-failure': 'DSH 启动失败页 · 官方错误列表可滚动',
          'boot-loading': 'DSH 启动等待页 · 墨街加载场景',
        },
      },
      promoVertical: {
        title: 'SPLAT-STREET · 竖版宣传片（3:4）',
        navAria: '页面导航',
        navHome: '官网首页',
        navVertical: '竖版 3:4',
        navLandscape: '横版 16:9',
        navShowcase: '组件图鉴',
        heading: '把工作台，涂成主场。',
        lead: 'SPLAT-STREET 竖版宣传片（3:4 · 适用手机端与社群分享），含斯普拉遁 2 风格配乐与完整九镜实机画面。',
        videoAria: 'SPLAT-STREET 墨街主题 30 秒竖版宣传片',
        linkMp4: '成片 MP4',
        linkCover: '高清封面 PNG',
        linkPoster: 'WebP 海报',
        linkReadme: '复现说明',
        linkJson: '规格验证 JSON',
        spec: '1080×1440 · 30 秒 · 30fps · H.264 CRF18 · bt709 · AAC 48kHz 立体声',
        note: '画面来自隔离 DSH 宿主实机渲染演示；点击下方任意分镜可直接跳转对应时间轴。',
        storyboardHeading: '九镜分镜索引',
        shots: [
          { alt: '墨街开涂！', captionHtml: '01 · 0–2.4s<br>墨街开涂！' },
          { alt: '三色街区，开局即满涂。', captionHtml: '02 · 2.4–5.95s<br>三色街区，开局即满涂。' },
          { alt: '指令上膛，连发不卡壳。', captionHtml: '03 · 5.95–9.18s<br>指令上膛，连发不卡壳。' },
          { alt: '满涂还是护眼？墨度随手调。', captionHtml: '04 · 9.18–12.9s<br>满涂还是护眼？墨度随手调。' },
          { alt: '祭典入夜！', captionHtml: '05 · 12.9–14.45s<br>祭典入夜！' },
          { alt: '午夜祭典，霓虹全开。', captionHtml: '06 · 14.45–17.75s<br>午夜祭典，霓虹全开。' },
          { alt: '战况再乱，视野照样清。', captionHtml: '07 · 17.75–22.45s<br>战况再乱，视野照样清。' },
          { alt: '缩成窄窗，照样能潜行。', captionHtml: '08 · 22.45–25.48s<br>缩成窄窗，照样能潜行。' },
          { alt: '墨街 · 昼夜终局结算', captionHtml: '09 · 25.48–30s<br>墨街 · 昼夜终局结算' },
        ],
      },
      promoLandscape: {
        title: 'SPLAT-STREET · 横版宣传片与分镜（16:9）',
        navAria: '页面导航',
        navHome: '官网首页',
        navVertical: '竖版 3:4',
        navLandscape: '横版 16:9',
        navShowcase: '组件图鉴',
        heading: '墨街开涂！把工作台涂成尚兴广场。',
        lead: '横版宣传片 · 1280×720 · 30s / 30fps · H.264 CRF18 · AAC 48kHz 立体声',
        videoAria: 'SPLAT-STREET 墨街主题 30 秒横版宣传片',
        linkMp4: '成片 MP4',
        linkCover: '高清封面 PNG',
        linkPoster: 'WebP 海报',
        linkReadme: '横版复现说明',
        linkJson: '规格与门禁 JSON',
        storyboardHeading: '九镜分镜索引',
        shotsAria: '镜头跳转',
        shots: [
          { alt: '墨街开涂！', label: '1.10s · 01 墨街开涂！' },
          { alt: '三色街区', label: '4.00s · 02 三色街区' },
          { alt: '指令上膛', label: '7.50s · 03 指令上膛' },
          { alt: '浓度随手调', label: '10.90s · 04 浓度随手调' },
          { alt: '祭典入夜！', label: '13.65s · 05 祭典入夜！' },
          { alt: '午夜祭典', label: '16.00s · 06 午夜祭典' },
          { alt: '代码岛视界', label: '18.80s · 07 代码岛视界' },
          { alt: '390px 窄屏', label: '24.00s · 08 390px 窄屏' },
          { alt: '昼夜双场', label: '27.50s · 09 昼夜双场' },
        ],
        extrasHeading: '转场与镜内切卡特写',
        extrasAria: '转场与补帧',
        extras: [
          { alt: '工具结果卡', label: '21.30s · 工具结果卡' },
          { alt: '射击墨点转场', label: '2.25s · 射击墨点转场' },
          { alt: '巨型滚筒刷屏', label: '12.75s · 巨型滚筒刷屏' },
          { alt: '双滚筒撤开揭露', label: '22.60s · 双滚筒撤开揭露' },
          { alt: '终局满屏对撞', label: '25.48s · 终局满屏对撞' },
        ],
        asideTitle: '分镜与转场编排说明',
        asideP1Html:
          '全片涵盖 6 种斯普拉遁武器转场（射击墨点涂满、潜墨游动星爆、巨型滚筒刷屏、北斋笔刷斜斩、双滚筒合拢撤开、终局满屏对撞），配合跨镜 <code>clipReveal</code> 零硬切揭露与 Shot 04 三档外观控件联动。',
        asideP2: '界面由隔离 DSH 宿主实机渲染预置会话生成；点击任意分镜卡可直接跳转到对应时间轴。',
        asideLink: '查看 900 帧自动化门禁记录',
        footerNote: 'SPLAT-STREET 宣传素材库 · 源码与帧验证清单可在 repo 中离线复现。',
      },
    },
    en: {
      common: {
        langLabel: 'Select language',
      },
      landing: {
        title: 'SPLAT-STREET: A Splatoon 2 Inspired DeepSeek Harness Theme',
        description:
          'SPLAT-STREET is a Splatoon 2 inspired skin plugin for DeepSeek Harness featuring an Official green tri-band canvas, charcoal night mode, 3 primary greens, and continuous ink density.',
        nav: {
          skip: 'Skip to content',
          aria: 'Primary navigation',
          toggleAria: 'Open navigation menu',
          battleground: 'Battlefield',
          promo: 'Promo',
          showcase: 'Showcase',
          faq: 'FAQ',
          installCta: 'Install theme',
          mega: {
            visualLabel: 'Visual System',
            paintHtml: 'Seam Styling<span>Public tokens and 4 brand slots</span>',
            dayNightHtml: 'Day & Night<span>Interactive light, dark, and ink density</span>',
            appearanceHtml: 'Appearance<span>Primary green presets and surface toggles</span>',
            docsLabel: 'Demos & Docs',
            promoHtml: 'Promo Film<span>30s widescreen capture with original score</span>',
            verticalHtml: 'Vertical Cut<span>3:4 mobile promo and 9-shot index</span>',
            catalogueHtml: 'Component Catalogue<span>18 real DSH component fixtures</span>',
            cardAlt: 'SPLAT-STREET black-rimmed Composer card with top-right magenta ink drip',
            cardTitle: '18 Live Component Fixtures',
            cardDesc: 'Switch primary greens and canvas ink online',
          },
        },
        hero: {
          title: 'SPLAT-STREET Theme for DeepSeek Harness',
          lead: 'A Splatoon 2 inspired skin plugin: Official #1EDC00 tri-band turf canvas, charcoal night mode, 3 primary ink greens, and continuous ink density using only public tokens and slots.',
          installCta: 'Install theme',
          promoCta: 'Watch 30s promo',
          stageAlt: 'SPLAT-STREET Midnight Splatfest dark workspace: charcoal canvas, magenta splashes, Official green active row, and plaza artwork',
        },
        workbench: {
          headingHtml: '4 seams styled end to end.<span class="muted">Native sidebar and shortcuts stay intact.</span>',
          lead: 'The theme overrides only public ThemeRuntime tokens and 4 brand slots. Sidebar sessions, diff deliverables, tool cards, and the composer retain native interactions and clean up completely on disable.',
          cta: 'Browse 18 live component fixtures',
          appAria: 'DSH sidebar session list and SPLAT-STREET token diff review preview',
          dataOpen: 'Pending',
          dataWork: 'Active',
          dataDone: 'Passed',
          crumbHtml: 'Splat Studio <i>/</i> <b>Real Host</b>',
          filterPh: 'Filter',
          navAll: 'All',
          navDay: 'Day',
          navNight: 'Night',
          navVerified: 'Verified',
          navSeams: 'Seams',
          colsHtml: '<span>Module</span><span>Check</span><span>Status</span><span>Time</span>',
          rows: {
            tokensSub: 'Light & dark palette map',
            skinSub: 'Tri-band stripes & drips',
            bootSub: '24-segment Special Gauge',
            prefsSub: '3 primary green storage',
            diffSub: 'Neon & native switching',
            sidebarSub: 'Official green splat tail',
            toolSub: '45-line output contrast',
            narrowSub: '390px narrow reading',
            installSub: 'Clean restore on disable',
          },
          statusWork: 'Active',
          statusDone: 'Passed',
          diffApply: 'Apply fix',
          diffApplied: 'Applied',
          diffMsgHtml: 'White text on Official green <code>#1EDC00</code> lacks contrast; use <code>readable()</code> to pick dark ink text.',
        },
        showcase: {
          headingHtml: 'Day & night arenas with canvas ink.<span class="muted">Dial smoothly from Paper to Turf.</span>',
          lead: 'Daytime pairs Official green, cream, and magenta stripes; night flips to a charcoal plaza. Slide smoothly between Paper 20%, Balanced 50%, and Turf 100%.',
          modeAria: 'Day and night arena mode',
          lightMode: 'Day Turf',
          darkMode: 'Night Splatfest',
          densityLabel: 'Canvas ink density',
          densityPresetsAria: 'Canvas ink presets',
          presetPaper: 'Paper 20%',
          presetBalanced: 'Balanced 50%',
          presetTurf: 'Turf 100%',
          cta: 'Switch 3 primary greens in the showcase',
          lightAlt: 'Day workspace: near-black sidebar, Official green/cream/magenta tri-band canvas, floating plaza art, and white Composer card',
          darkAlt: 'Night Splatfest plaza scene: charcoal ground with plaza illustration, flanking squids, and neon green accents',
        },
        promo: {
          headingHtml: '30-second live promo.<span class="muted">Day/night arenas and slash commands in action.</span>',
          verticalLink: 'View 3:4 vertical cut & 9-shot index',
          landscapeLink: '16:9 storyboard breakdown',
          videoAria: 'SPLAT-STREET 30-second widescreen promo featuring day/night battlefields, slash commands, ink density slider, and narrow view',
        },
        features: {
          headingHtml: 'Appearance tab & surface toggles.<span class="muted">Every visual choice stays local to your client.</span>',
          card1Title: '3 primary greens and continuous ink density',
          card1Desc: 'Choose Official #1EDC00, Neon, or Lime green accents alongside a 0%–100% ink density slider.',
          sliderTitle: 'Splat appearance',
          sliderReset: 'Reset',
          sliderDensity: 'Canvas ink',
          sliderRadius: 'Radius & shadow',
          sliderGreenAria: 'Primary ink green presets',
          greenOfficial: 'Official',
          greenNeon: 'Neon',
          greenLime: 'Lime',
          card2Title: 'Independent décor, grain & diff toggles',
          card2Desc: 'Toggle plaza ink décor, halftone paper grain, bundled Nunito fonts, and native diff syntax independently in localStorage.',
          togglesTitle: 'Splat Surface Toggles',
          togglesCount: '2 of 3 on',
          toggle1Label: 'Plaza art & ink splashes',
          toggle1Sub: 'Keep only tri-band canvas when off',
          toggle2Label: 'Halftone grain & bundled font',
          toggle2Sub: 'Embedded WOFF2 works offline',
          toggle3Label: 'DSH native diff palette',
          toggle3Sub: 'Switch neon vs. standard red/green',
        },
        toolchain: {
          headingHtml: 'Offline bundle & automated checks.<span class="muted">Fonts and artwork embedded at build time.</span>',
          card1Title: 'Built with standard frontend tooling',
          card1Desc: 'Compiled via TypeScript, esbuild, Biome, and Lightning CSS with all fonts, SVGs, and PNGs inlined.',
          diagramAlt: 'SPLAT-STREET built with TypeScript, esbuild, Biome, Node.js, pnpm, and React.',
          card2Title: 'Verified by full gate & fixture suite',
          card2Desc: 'Every build runs site validation, TypeScript typechecking, contract tests, and DSH seam compatibility checks.',
        },
        screens: {
          headingHtml: 'Three core surfaces redesigned.<span class="muted">Cohesive visual language from boot to settings.</span>',
          tablistAria: 'Core workbench screens',
          tabBoot: 'Special Gauge Boot',
          tabDay: 'Day Appearance',
          tabNight: 'Night Plaza',
          panelBootDesc:
            'Keeps the top squid seal while restyling the boot spinner into a 24-segment Splatoon Special Weapon Gauge driven directly by host progress.',
          panelBootLink: 'Inspect the boot card in the showcase',
          panelDayDesc: 'Switch between Paper 20%, Balanced 50%, Turf 100%, and 3 primary greens under Settings → Plugins → Splat appearance.',
          panelDayLink: 'Open the appearance panel in the showcase',
          panelNightDesc:
            'Dark mode uses neutral charcoal surfaces and soft hairlines to avoid glare, reserving neon green for primary actions and focus rings.',
          panelNightLink: 'Compare dark styles in the showcase',
          imgBootAlt: 'SPLAT-STREET boot card: sticker panel, squid stamp, and 24-segment green Special Weapon Gauge ring',
          imgDayAlt: 'Light mode Splat appearance settings tab: live preview card, ink density slider, and green selector',
          imgNightAlt: 'Dark mode Splat appearance settings tab: charcoal surface, Official green borders, and dark preview',
        },
        install: {
          headingHtml: 'Install in two commands.<span class="muted">Supports npm and offline tarballs.</span>',
          descHtml:
            'Install the latest package from your DSH profile directory via npm, or grab an offline <code>.tgz</code> from <a class="link" href="https://github.com/Shirolin/dsh-theme-splat-ui/releases">Releases</a> (see <a class="link" href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/README.md#install">README</a> for local packing), then restart DSH.',
          check1: 'Keep only one theme plugin enabled per profile',
          check2: 'Appearance preferences save to localStorage without touching Host settings',
          check3: 'Disabling or uninstalling cleanly restores native DSH appearance',
          cmdBarLeft: 'Run inside your DSH profile directory',
          cmdDir: 'cd <DSH_Profile_dir>',
          copyBtn: 'Copy command',
          copied: 'Copied',
          copyFailed: 'Copy failed, select manually',
          compatLink: 'View compatibility contract',
          stat1: 'primary green presets (Official / Neon / Lime)',
          stat2: 'public DSH slot brand & appearance seams',
          stat3: 'live DSH component fixture comparisons',
          stat4: 'breaking changes to native sidebar or shortcuts',
        },
        faq: {
          headingHtml: 'FAQ.<span class="muted">Licensing, compatibility, and clean removal.</span>',
          q1Title: 'Is this an official theme?',
          q1Html:
            'No. SPLAT-STREET is an unofficial fan theme with no affiliation or endorsement from Nintendo or DeepSeek. Asset sources are documented in <a class="link" href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/THIRD_PARTY_NOTICES.md">THIRD_PARTY_NOTICES.md</a>.',
          q2Title: 'Does it alter default layout or shortcuts?',
          q2Desc: 'No. It only overrides public tokens and 4 brand slots while keeping sidebar navigation, input behavior, and keybindings native.',
          q3Title: 'Which platforms are supported?',
          q3Desc: 'Fully verified across real DSH Web light/dark modes and 390px mobile viewports, plus live Windows desktop titlebar and sidebar checks.',
          q4Title: 'How do I restore the native look?',
          q4Desc: 'Disable the theme in Plugin Manager or uninstall the package and restart DSH; snapshotted root attributes are cleanly restored.',
          visualAlt: 'SPLAT-STREET daytime empty-session plaza illustration',
        },
        close: {
          heading: 'Turn your workspace into home turf',
          leadHtml: 'Run <code>pnpm add dsh-theme-splat-ui</code> inside your DSH profile directory and restart to activate.',
          cta: 'Install theme',
        },
        footer: {
          lede: 'A Splatoon 2 inspired theme plugin for DeepSeek Harness.',
          col1Title: 'Visual System',
          col1Link1: 'Seam Styling',
          col1Link2: 'Day & Night',
          col2Title: 'Capabilities',
          col2Link1: 'Appearance',
          col2Link2: 'Offline Build',
          col3Title: 'Demos & Showcase',
          col3Link1: 'Vertical Promo',
          col3Link2: 'Component Catalogue',
          col4Title: 'Repo & Docs',
          col4Link2: 'Compatibility',
          legal:
            'Unofficial fan theme · Splatoon & Splatoon 2 are trademarks of Nintendo · MIT License 2026 Shirolin · Product names and logos are trademarks of their owners',
          credits: 'Asset sources & third-party notices',
        },
      },
      showcase: {
        title: 'DSH Component Catalogue · SPLAT-STREET',
        description: 'SPLAT-STREET Component Catalogue: interactive light & dark previews rendered with real DSH runtime CSS and theme skin.',
        backHome: 'Home',
        heading: 'DSH Component Catalogue',
        navPromo: 'Promo',
        searchSr: 'Search fixtures or plugin packages',
        searchPlaceholder: 'Filter fixture name, title, or package (press /)',
        modeSwitchAria: 'Switch light or dark mode',
        modeLight: 'Light',
        modeDark: 'Dark',
        controlsAria: 'Live appearance controls',
        densityGroupTitle: 'Adjust canvas ink density across --dsw-alias-bg-base surfaces (workspace, diff pane, preview); fixed cards stay unchanged',
        densityLabel: 'Canvas ink',
        densityPresetsAria: 'Canvas ink presets',
        presetPaper: 'Paper',
        presetBalanced: 'Balanced',
        presetTurf: 'Turf',
        greenGroupTitle: 'Switch global primary ink green (Official / Neon / Lime)',
        greenLabel: 'Primary green',
        greenPresetsAria: 'Primary green presets',
        greenOfficial: 'Official',
        greenNeon: 'Neon',
        greenLime: 'Lime',
        decorTitle: 'Toggle ink drips and splashes around workspace and paper edges',
        decorLabel: 'Ink décor',
        grainTitle: 'Toggle halftone screen-tone texture on paper and composer cards',
        grainLabel: 'Paper grain',
        diffTitleLight: 'Toggle native red/green diff syntax (applies to light-mode diff panes only)',
        diffTitleDark: 'Native diff palette only applies in light mode (dark mode preserves high-contrast semantics)',
        diffLabel: 'Native diff syntax',
        fontTitle: 'Switch between bundled Nunito and platform UI font (affects Latin glyphs)',
        fontLabel: 'System font',
        resetTitle: 'Clear unified overrides and restore each fixture card to its preset state',
        resetBtn: 'Reset cards',
        ctrlHint: 'Ink density affects canvas, diff, and previews; toggles apply live to every card.',
        sidebarAria: 'Component categories',
        loading: 'Loading fixture manifest…',
        emptyTitle: 'No matching component fixtures found.',
        emptyHint: 'Try searching `composer`, `diff`, `appearance`, or a plugin package name.',
        clearSearch: 'Clear filter',
        footerDefault: 'Rendered with real DSH runtime CSS and theme build artifacts.',
        footerHome: 'Theme Home',
        footerPromo: 'Promo',
        footerRepo: 'GitHub Repo',
        statusFiltered: 'Filtered: {visible} / {total} component fixtures ({mode} mode)',
        statusAll: '{total} real DSH component fixtures · {mode} mode',
        modeWordLight: 'Light',
        modeWordDark: 'Dark',
        groupCount: '{count}',
        openRaw: 'Open standalone ↗',
        footerBuilt: 'Rendered on DSH {version} · Built {date} · Unmodified fixtures & skin source',
        loadError: 'Failed to load fixture manifest ({message}). Make sure `pnpm run showcase` was run and serve via HTTP.',
        groups: {
          工作区与会话: 'Workspace & Sessions',
          代码与交付: 'Code & Deliverables',
          浮层与反馈: 'Overlays & Feedback',
          设置与外观: 'Settings & Appearance',
          启动页: 'Boot Screens',
          其他: 'Other',
        },
        fixtures: {
          'conversation-workspace': 'Main Workspace · Titlebar, Code Blocks & Composer',
          'sidebar-masthead': 'SPLAT-STREET · Real Sidebar Brand & Session Tree',
          'turn-trigger-notice': 'Turn Trigger Notice · Dark Card Text Contrast',
          'code-island-scopes': 'Code Island Scopes · Light Card Readability',
          'deliverables-diff': 'Deliverables Diff · Neon Light-Surface Palette',
          'deliverables-diff-native': 'Deliverables Diff · Switched to DSH Native Palette',
          'document-preview-plain': 'Document Preview · Right-Pane Plain Text View',
          'tool-result': 'Tool Result · Real Input & Output Card',
          'input-menu': 'Input Menu · Command Aliases, Selection & Narrow Bounds',
          'input-skills': 'Skill Suggestions · Non-Overlapping Long Descriptions',
          'keybinding-search': 'Keybinding Modal · Search Input (Real DSH DOM)',
          'model-search': 'Model Picker · Single-Border Rounded Search Field',
          'toast-notice': 'Toast Notice · Readability Over Tooltip Surfaces',
          'appearance-panel': 'Splat Appearance · Live Settings Tab',
          'plugin-settings-light': 'Plugin Settings · Light Toggle Bounds & Reading Surface',
          'settings-nav': 'Settings Nav · Ink Selection, Headings & Focus Rings',
          'boot-failure': 'DSH Boot Failure · Scrollable Official Error List',
          'boot-loading': 'DSH Boot Loading · SPLAT-STREET Gauge Loader',
        },
      },
      promoVertical: {
        title: 'SPLAT-STREET · Vertical Promo (3:4)',
        navAria: 'Page navigation',
        navHome: 'Home',
        navVertical: 'Vertical 3:4',
        navLandscape: 'Widescreen 16:9',
        navShowcase: 'Showcase',
        heading: 'Turn your workspace into home turf.',
        lead: 'SPLAT-STREET vertical promo (3:4 · tailored for mobile and social sharing) with Splatoon 2 style music and 9 live shots.',
        videoAria: 'SPLAT-STREET 30-second vertical promo video',
        linkMp4: 'Final MP4',
        linkCover: 'HD Cover PNG',
        linkPoster: 'WebP Poster',
        linkReadme: 'Reproduction Guide',
        linkJson: 'Verification JSON',
        spec: '1080×1440 · 30s · 30fps · H.264 CRF18 · bt709 · AAC 48kHz Stereo',
        note: 'Captured from an isolated DSH host running the live theme; click any shot below to jump to its timestamp.',
        storyboardHeading: '9-Shot Storyboard Index',
        shots: [
          { alt: 'Ink Street, Turf Up!', captionHtml: '01 · 0–2.4s<br>Ink Street, Turf Up!' },
          { alt: 'Tri-band turf, coated from the start.', captionHtml: '02 · 2.4–5.95s<br>Tri-band turf, coated from the start.' },
          { alt: 'Slash commands locked and loaded.', captionHtml: '03 · 5.95–9.18s<br>Slash commands locked and loaded.' },
          { alt: 'Full turf or soft paper? Dial ink density anytime.', captionHtml: '04 · 9.18–12.9s<br>Full turf or soft paper? Dial ink density anytime.' },
          { alt: 'Splatfest Nightfall!', captionHtml: '05 · 12.9–14.45s<br>Splatfest Nightfall!' },
          { alt: 'Midnight Splatfest, full neon glow.', captionHtml: '06 · 14.45–17.75s<br>Midnight Splatfest, full neon glow.' },
          { alt: 'Crystal-clear code even in intense turf.', captionHtml: '07 · 17.75–22.45s<br>Crystal-clear code even in intense turf.' },
          { alt: 'Swim smoothly in a 390px narrow window.', captionHtml: '08 · 22.45–25.48s<br>Swim smoothly in a 390px narrow window.' },
          { alt: 'SPLAT-STREET · Day & Night Results', captionHtml: '09 · 25.48–30s<br>SPLAT-STREET · Day & Night Results' },
        ],
      },
      promoLandscape: {
        title: 'SPLAT-STREET · Widescreen Promo & Storyboard (16:9)',
        navAria: 'Page navigation',
        navHome: 'Home',
        navVertical: 'Vertical 3:4',
        navLandscape: 'Widescreen 16:9',
        navShowcase: 'Showcase',
        heading: 'Turf up! Paint your workspace like Inkopolis Square.',
        lead: 'Widescreen promo · 1280×720 · 30s / 30fps · H.264 CRF18 · AAC 48kHz Stereo',
        videoAria: 'SPLAT-STREET 30-second widescreen promo video',
        linkMp4: 'Final MP4',
        linkCover: 'HD Cover PNG',
        linkPoster: 'WebP Poster',
        linkReadme: 'Widescreen Guide',
        linkJson: 'Gate & Spec JSON',
        storyboardHeading: '9-Shot Storyboard Index',
        shotsAria: 'Jump to shot timestamp',
        shots: [
          { alt: 'Turf Up!', label: '1.10s · 01 Turf Up!' },
          { alt: 'Tri-Band Plaza', label: '4.00s · 02 Tri-Band Plaza' },
          { alt: 'Slash Commands', label: '7.50s · 03 Slash Commands' },
          { alt: 'Live Ink Slider', label: '10.90s · 04 Live Ink Slider' },
          { alt: 'Nightfall!', label: '13.65s · 05 Nightfall!' },
          { alt: 'Midnight Splatfest', label: '16.00s · 06 Midnight Splatfest' },
          { alt: 'Code Island View', label: '18.80s · 07 Code Island View' },
          { alt: '390px Narrow View', label: '24.00s · 08 390px Narrow View' },
          { alt: 'Day & Night Finale', label: '27.50s · 09 Day & Night Finale' },
        ],
        extrasHeading: 'Transitions & Cutaway Close-Ups',
        extrasAria: 'Transitions and cutaways',
        extras: [
          { alt: 'Tool Result Card', label: '21.30s · Tool Result Card' },
          { alt: 'Shooter Ink Wipe', label: '2.25s · Shooter Ink Wipe' },
          { alt: 'Dynamo Roller Sweep', label: '12.75s · Dynamo Roller Sweep' },
          { alt: 'Dual Roller Reveal', label: '22.60s · Dual Roller Reveal' },
          { alt: 'Final Turf Clash', label: '25.48s · Final Turf Clash' },
        ],
        asideTitle: 'Storyboard & Transition Notes',
        asideP1Html:
          'Features 6 Splatoon weapon transitions (Splattershot ink fill, squid swim burst, Dynamo Roller sweep, Octobrush slash, Dual Roller reveal, and final turf clash) with seamless cross-shot <code>clipReveal</code> cuts and Shot 04 live appearance control sync.',
        asideP2: 'Captured from an isolated DSH host rendering deterministic conversation sessions; click any card to jump to its timestamp.',
        asideLink: 'View 900-frame automated verification log',
        footerNote: 'SPLAT-STREET Promo Archive · Source scripts and frame verification manifests can be reproduced offline.',
      },
    },
    ja: {
      common: {
        langLabel: '言語を選択',
      },
      landing: {
        title: 'SPLAT-STREET：『スプラトゥーン2』風 DeepSeek Harness テーマ',
        description:
          'SPLAT-STREET は『スプラトゥーン2』にインスパイアされた DeepSeek Harness 用スキンです。公式グリーン3色ストライプ、チャコールダークモード、3種のメインインク色、連続インク濃度調整に対応しています。',
        nav: {
          skip: '本文へスキップ',
          aria: 'メインナビゲーション',
          toggleAria: 'ナビゲーションメニューを開く',
          battleground: 'バトルフィールド',
          promo: 'プロモ映像',
          showcase: 'コンポーネント図鑑',
          faq: 'FAQ',
          installCta: 'インストール',
          mega: {
            visualLabel: 'ビジュアルシステム',
            paintHtml: '接縫ごとの配色<span>公開 Token と 4 つのブランド Slot</span>',
            dayNightHtml: '昼夜バトル<span>ライト・ダークとインク濃度をリアルタイム調整</span>',
            appearanceHtml: '外観カスタマイズ<span>メインインクプリセットと各種トグル</span>',
            docsLabel: 'デモ＆ドキュメント',
            promoHtml: 'プロモ映像<span>30秒横版実機ムービー＆オリジナルBGM</span>',
            verticalHtml: '縦版絵コンテ<span>3:4 縦版プロモと9カット索引</span>',
            catalogueHtml: 'コンポーネント図鑑<span>18種の実機 DSH コンポーネント比較</span>',
            cardAlt: 'SPLAT-STREET の黒縁 Composer カードと右上のマゼンタインク垂れ装飾',
            cardTitle: '18種ライブコンポーネント図鑑',
            cardDesc: 'メインインク色とキャンバス濃度をオンライン切替',
          },
        },
        hero: {
          title: 'DeepSeek Harness 墨街テーマ',
          lead: '『スプラトゥーン2』風スキン：公式グリーン #1EDC00 の3色ストライプキャンバス、チャコールダークモード、3種のメインインク色と連続インク濃度を、公開 Token と Slot のみで実現。',
          installCta: 'テーマを導入',
          promoCta: '30秒プロモを見る',
          stageAlt: 'SPLAT-STREET ミッドナイトフェス夜間ワークスペース：チャコール背景、マゼンタ飛沫、公式グリーン選択行、広場イラスト',
        },
        workbench: {
          headingHtml: '4つの接縫を丁寧に塗り分け。<span class="muted">標準サイドバーとショートカットはそのまま。</span>',
          lead: '公開の ThemeRuntime Token と 4 つのブランド Slot のみを上書きします。サイドバー、Diff ビュー、ツールカード、入力欄の標準操作はそのまま維持され、無効化すれば完全に元へ戻ります。',
          cta: '18種のライブコンポーネント図鑑を見る',
          appAria: 'DSH サイドバーセッション一覧と SPLAT-STREET Token Diff プレビュー',
          dataOpen: '未確認',
          dataWork: '調整中',
          dataDone: '合格',
          crumbHtml: '墨街スタジオ <i>/</i> <b>実機ホスト</b>',
          filterPh: '絞り込み',
          navAll: 'すべて',
          navDay: 'ライト',
          navNight: 'ダーク',
          navVerified: '検証済',
          navSeams: '接縫',
          colsHtml: '<span>モジュール</span><span>検証項目</span><span>状態</span><span>時間</span>',
          rows: {
            tokensSub: '昼夜パレットマッピング',
            skinSub: '3色ストライプ＆インク垂れ',
            bootSub: '24分割スペシャルゲージ',
            prefsSub: '3種メイングリーン保存',
            diffSub: 'ネオン／標準切替',
            sidebarSub: '公式グリーン選択インク尾',
            toolSub: '45行結果のコントラスト',
            narrowSub: '390px モバイル表示',
            installSub: '無効化時の完全クリーンアップ',
          },
          statusWork: '調整中',
          statusDone: '合格',
          diffApply: '変更を適用',
          diffApplied: '適用済',
          diffMsgHtml: '公式グリーン <code>#1EDC00</code> 背景上の白文字はコントラスト不足のため、<code>readable()</code> で濃墨文字を選択します。',
        },
        showcase: {
          headingHtml: '昼夜バトルとキャンバスインク濃度。<span class="muted">紙白から塗地まで滑らかに切替。</span>',
          lead: '昼は公式グリーン・クリーム・マゼンタの3色ストライプ、夜はチャコール広場へ切り替え。スライダーで紙白 20%・均衡 50%・塗地 100% の間を連続調整できます。',
          modeAria: '昼夜バトルモード',
          lightMode: '昼のナワバリ',
          darkMode: '夜のフェス',
          densityLabel: 'キャンバスインク濃度',
          densityPresetsAria: 'キャンバス濃度プリセット',
          presetPaper: '紙白 20%',
          presetBalanced: '均衡 50%',
          presetTurf: '塗地 100%',
          cta: '図鑑で3種類のメインインク色を切り替える',
          lightAlt: 'ライトワークスペース：黒寄りサイドバー、3色ストライプキャンバス、広場イラスト、白い Composer カード',
          darkAlt: 'ミッドナイトフェス広場シーン：チャコール背景上の広場イラスト、左右のイカステッカーとネオン装飾',
        },
        promo: {
          headingHtml: '30秒実機プロモムービー。<span class="muted">昼夜フィールドとスラッシュコマンドを完全収録。</span>',
          verticalLink: '縦版 3:4 と9カット索引を見る',
          landscapeLink: '横版絵コンテ解説',
          videoAria: 'SPLAT-STREET テーマ 30秒横版プロモーション動画',
        },
        features: {
          headingHtml: '外観パネルとサーフェストグル。<span class="muted">配色も濃度もクライアント側で即時反映。</span>',
          card1Title: '3種類のメイングリーンとインク濃度調整',
          card1Desc: '外観パネルから公式グリーン #1EDC00・ネオン・ライムの3色と 0%–100% スライダーをいつでも調整できます。',
          sliderTitle: '墨街外観',
          sliderReset: 'リセット',
          sliderDensity: 'インク濃度',
          sliderRadius: '角丸と影',
          sliderGreenAria: 'メインインク色プリセット',
          greenOfficial: '公式グリーン',
          greenNeon: 'ネオン',
          greenLime: 'ライム',
          card2Title: '装飾・網点・Diff 構文を個別切替',
          card2Desc: '広場イラスト装飾、紙面網点、内蔵 Nunito フォント、標準 Diff 配色を個別に切り替え、localStorage に保存します。',
          togglesTitle: '墨街サーフェストグル',
          togglesCount: '2 of 3 on',
          toggle1Label: '広場イラスト＆インク装飾',
          toggle1Sub: 'オフ時は3色キャンバスのみ表示',
          toggle2Label: '紙面網点＆内蔵フォント',
          toggle2Sub: 'WOFF2 埋め込みでオフライン動作',
          toggle3Label: 'DSH 標準 Diff 配色',
          toggle3Sub: 'ネオンと標準赤緑を切替',
        },
        toolchain: {
          headingHtml: 'オフラインビルド＆自動ゲート検証。<span class="muted">フォントと素材をバンドルに内包。</span>',
          card1Title: '標準フロントエンドツールでオフライン梱包',
          card1Desc: 'TypeScript、esbuild、Biome、Lightning CSS でビルドし、フォントや SVG・PNG 素材をすべて内包します。',
          diagramAlt: 'SPLAT-STREET は TypeScript、esbuild、Biome、Node.js、pnpm、React で構築されています。',
          card2Title: '完全なゲート＆フィクスチャ検証を通過',
          card2Desc: 'ビルドごとにサイト検証、型チェック、契約テスト、DSH 互換性チェックを実行しています。',
        },
        screens: {
          headingHtml: '3つの主要画面を再設計。<span class="muted">起動ゲージから設定画面まで統一した世界観。</span>',
          tablistAria: '主要ワークベンチ画面',
          tabBoot: 'スペシャル起動画面',
          tabDay: 'ライト外観設定',
          tabNight: 'ナイトスクエア',
          panelBootDesc: '上部のイカ印章を残しつつ、読み込みリングを24分割のスペシャルウェポンゲージ風に再描画。進捗はホスト変数を直接参照します。',
          panelBootLink: '図鑑で起動画面カードを確認',
          panelDayDesc: '「設定 → プラグイン → 墨街外観」から紙白 20%・均衡 50%・塗地 100% と3種のメイングリーンをリアルタイム切り替えできます。',
          panelDayLink: '図鑑で外観パネルを開く',
          panelNightDesc: 'ダークモードでは落ち着いたチャコール表面と極細ラインで眩しさを抑え、ネオングリーンを主要ボタンとフォーカスに集中させています。',
          panelNightLink: '図鑑でダーク表示を比較',
          imgBootAlt: 'SPLAT-STREET 起動画面：ステッカーカード、イカスタンプ、24分割グリーンゲージ',
          imgDayAlt: 'ライトモード設定画面の墨街外観パネル：バトルプレビュー、濃度スライダー、メインインク選択',
          imgNightAlt: 'ダークモード設定画面の墨街外観パネル：チャコール面、公式グリーン枠線、暗色プレビュー',
        },
        install: {
          headingHtml: '2コマンドで導入完了。<span class="muted">npm とオフラインアーカイブの両対応。</span>',
          descHtml:
            'DSH プロファイルディレクトリで npm から最新版を導入するか、<a class="link" href="https://github.com/Shirolin/dsh-theme-splat-ui/releases">Releases</a> から <code>.tgz</code> を取得（または <a class="link" href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/README.ja.md#インストール">README</a> 通りにビルド）し、DSH を再起動してください。',
          check1: '1つのプロファイルにつきテーマプラグインは1つだけ有効化を推奨',
          check2: '外観設定は端末の localStorage に保存され、Host 設定は変更しません',
          check3: '無効化・アンインストールで DSH 標準の外観に自動復元',
          cmdBarLeft: 'DSH プロファイルディレクトリで実行',
          cmdDir: 'cd <DSH_Profile_ディレクトリ>',
          copyBtn: 'コマンドをコピー',
          copied: 'コピーしました',
          copyFailed: 'コピー失敗・手動で選択してください',
          compatLink: '互換性契約を確認',
          stat1: '種類のメインインク色（公式／ネオン／ライム）',
          stat2: '個の公開 DSH Slot ブランド＆外観接縫',
          stat3: '組の実機 DSH コンポーネント図鑑比較',
          stat4: '箇所の標準サイドバー・ショートカット改変',
        },
        faq: {
          headingHtml: 'よくある質問。<span class="muted">権利表記・互換性・復元方法について。</span>',
          q1Title: 'これは公式テーマですか？',
          q1Html:
            'いいえ。SPLAT-STREET は非公式ファンテーマであり、任天堂株式会社および DeepSeek 公式とは関係ありません。素材出典は <a class="link" href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/THIRD_PARTY_NOTICES.md">THIRD_PARTY_NOTICES.md</a> をご覧ください。',
          q2Title: '標準レイアウトやショートカットは変わりますか？',
          q2Desc: '変わりません。公開 Token と 4 つのブランド Slot のみを差し替えるため、サイドバーや入力欄、キーバインドは標準のまま動作します。',
          q3Title: '対応プラットフォームは？',
          q3Desc: '実機 DSH Web のライト／ダーク／390px モバイル表示の全面検証、および Windows デスクトップ版のタイトルバー・サイドバー検証を完了しています。',
          q4Title: '元の見た目に戻すには？',
          q4Desc: 'プラグイン管理からテーマを無効化または削除して再起動すれば、インストール時のスナップショットから根属性がきれいに復元されます。',
          visualAlt: 'SPLAT-STREET デイタイム広場空セッションイラスト',
        },
        close: {
          heading: 'ワークスペースを墨街ホームに塗り替えよう',
          leadHtml: 'DSH プロファイルディレクトリで <code>pnpm add dsh-theme-splat-ui</code> を実行し、再起動で適用されます。',
          cta: 'テーマを導入',
        },
        footer: {
          lede: '『スプラトゥーン2』にインスパイアされた DeepSeek Harness テーマプラグイン。',
          col1Title: 'ビジュアル',
          col1Link1: '接縫スタイル',
          col1Link2: '昼夜バトル',
          col2Title: '機能詳細',
          col2Link1: '外観設定',
          col2Link2: 'オフライン構成',
          col3Title: 'デモ＆図鑑',
          col3Link1: '縦版プロモ',
          col3Link2: 'コンポーネント図鑑',
          col4Title: 'リポジトリ',
          col4Link2: '互換性契約',
          legal:
            '非公式ファンテーマ · Splatoon / Splatoon 2 は任天堂の商標です · MIT License 2026 Shirolin · Product names and logos are trademarks of their owners',
          credits: '素材出典＆サードパーティ表記',
        },
      },
      showcase: {
        title: 'DSH コンポーネント図鑑 · SPLAT-STREET',
        description: 'SPLAT-STREET コンポーネント図鑑：実機 DSH ランタイム CSS とテーマスキンで描画したライト／ダーク比較プレビュー。',
        backHome: 'トップへ戻る',
        heading: 'DSH コンポーネント図鑑',
        navPromo: 'プロモ映像',
        searchSr: 'コンポーネントやパッケージを検索',
        searchPlaceholder: '名前・タイトル・パッケージで絞り込み（/ でフォーカス）',
        modeSwitchAria: 'ライト／ダークモード切替',
        modeLight: 'ライト',
        modeDark: 'ダーク',
        controlsAria: '外観パラメータのリアルタイム調整',
        densityGroupTitle: '--dsw-alias-bg-base を使用するワークスペース・Diff・プレビューのインク濃度を調整（固定背景カードは不変）',
        densityLabel: 'インク濃度',
        densityPresetsAria: 'インク濃度プリセット',
        presetPaper: '紙白',
        presetBalanced: '均衡',
        presetTurf: '塗地',
        greenGroupTitle: '全体のメインインク色を切替（公式グリーン / ネオン / ライム）',
        greenLabel: 'メインインク色',
        greenPresetsAria: 'メインインク色プリセット',
        greenOfficial: '公式グリーン',
        greenNeon: 'ネオン',
        greenLime: 'ライム',
        decorTitle: 'ワークスペースと紙面端のインク滴・飛沫装飾を切り替え',
        decorLabel: 'インク装飾',
        grainTitle: '紙面と入力カードの網点テクスチャを切り替え',
        grainLabel: '紙面網点',
        diffTitleLight: '標準の赤緑 Diff ハイライトへ切り替え（ライトモードの Diff カードのみ有効）',
        diffTitleDark: '標準 Diff 配色はライトモード時のみ有効（ダークモードでは高コントラスト配色を維持）',
        diffLabel: '標準 Diff 配色',
        fontTitle: '内蔵 Nunito フォントとシステム標準フォントを切り替え（英数字の字形に適用）',
        fontLabel: 'システムフォント',
        resetTitle: '共通オーバーライドを解除し、各カードを初期デモ状態へ戻す',
        resetBtn: '各カードをリセット',
        ctrlHint: '濃度はキャンバス・Diff・プレビューに反映、各スイッチは全カードへ即時適用されます。',
        sidebarAria: 'コンポーネント分類目次',
        loading: 'マニフェストを読み込み中…',
        emptyTitle: '一致するコンポーネントが見つかりません。',
        emptyHint: '`composer`、`diff`、`appearance` またはプラグイン名で検索してみてください。',
        clearSearch: '絞り込み解除',
        footerDefault: '実機 DSH ランタイム CSS とテーマビルド成果物で描画。',
        footerHome: 'テーマトップ',
        footerPromo: 'プロモ映像',
        footerRepo: 'GitHub',
        statusFiltered: '絞り込み結果：{visible} / {total} コンポーネント（{mode}モード）',
        statusAll: '全 {total} 組の実機 DSH コンポーネント · 現在 {mode}モード',
        modeWordLight: 'ライト',
        modeWordDark: 'ダーク',
        groupCount: '{count} 件',
        openRaw: '単体で開く ↗',
        footerBuilt: 'DSH {version} で描画 · ビルド日 {date} · フィクスチャ・スキン無改変',
        loadError: 'マニフェストを読み込めませんでした（{message}）。pnpm run showcase 実行後に HTTP 経由で開いてください。',
        groups: {
          工作区与会话: 'ワークスペース＆セッション',
          代码与交付: 'コード＆成果物',
          浮层与反馈: 'オーバーレイ＆通知',
          设置与外观: '設定＆外観',
          启动页: '起動画面',
          其他: 'その他',
        },
        fixtures: {
          'conversation-workspace': 'メインワークスペース · タイトルバー・コード・入力欄',
          'sidebar-masthead': 'SPLAT-STREET · 実機サイドバーブランド＆セッションツリー',
          'turn-trigger-notice': 'トリガー通知バー · 暗色カードの視認性',
          'code-island-scopes': 'コードアイランドスコープ · 明色面の可読性保護',
          'deliverables-diff': 'Deliverables Diff · ライト面のネオンシンタックス配色',
          'deliverables-diff-native': 'Deliverables Diff · DSH 標準シンタックス切替',
          'document-preview-plain': 'ドキュメントプレビュー · 右ペインのプレーンテキスト表示',
          'tool-result': 'ツール実行結果 · 実機入出力カード',
          'input-menu': '入力メニュー · コマンド別名・選択コントラスト・狭幅対応',
          'input-skills': 'スキル候補 · 複数行長文の重なり防止',
          'keybinding-search': 'ショートカット検索モーダル · 検索入力（実機 DSH DOM）',
          'model-search': 'モデル一覧 · 単層角丸検索ボックス',
          'toast-notice': 'トースト通知 · ツールチップ面での視認性',
          'appearance-panel': '墨街外観 · 設定タブパネル',
          'plugin-settings-light': 'プラグイン管理 · ライトモードスイッチと境界',
          'settings-nav': '設定ナビゲーション · インク選択・見出し・フォーカスリング',
          'boot-failure': 'DSH 起動エラー画面 · スクロール可能なエラー一覧',
          'boot-loading': 'DSH 起動画面 · スペシャルゲージローダー',
        },
      },
      promoVertical: {
        title: 'SPLAT-STREET · 縦版プロモ（3:4）',
        navAria: 'ページナビゲーション',
        navHome: 'トップ',
        navVertical: '縦版 3:4',
        navLandscape: '横版 16:9',
        navShowcase: '図鑑',
        heading: 'ワークスペースを、ホームグラウンドに塗ろう。',
        lead: 'SPLAT-STREET 縦版プロモ（3:4 · モバイル・SNS 向け）、スプラトゥーン2風サウンド＆9カット実機映像。',
        videoAria: 'SPLAT-STREET テーマ 30秒縦版プロモーション動画',
        linkMp4: '本編 MP4',
        linkCover: '高画質カバー PNG',
        linkPoster: 'WebP ポスター',
        linkReadme: '再現ガイド',
        linkJson: '仕様検証 JSON',
        spec: '1080×1440 · 30秒 · 30fps · H.264 CRF18 · bt709 · AAC 48kHz ステレオ',
        note: '隔離された実機 DSH ホストの描画から収録しています。下の各カットをクリックすると該当シーンへジャンプします。',
        storyboardHeading: '9カット 絵コンテ索引',
        shots: [
          { alt: '墨街塗り開始！', captionHtml: '01 · 0–2.4s<br>墨街塗り開始！' },
          { alt: '3色ストリート、開幕即フル塗り。', captionHtml: '02 · 2.4–5.95s<br>3色ストリート、開幕即フル塗り。' },
          { alt: 'コマンド装填、連射も快適。', captionHtml: '03 · 5.95–9.18s<br>コマンド装填、連射も快適。' },
          { alt: 'フル塗りも目に優しい紙白も思いのまま。', captionHtml: '04 · 9.18–12.9s<br>フル塗りも目に優しい紙白も思いのまま。' },
          { alt: 'フェスの夜が来る！', captionHtml: '05 · 12.9–14.45s<br>フェスの夜が来る！' },
          { alt: 'ミッドナイトフェス、ネオン全開。', captionHtml: '06 · 14.45–17.75s<br>ミッドナイトフェス、ネオン全開。' },
          { alt: '乱戦でもコードの視界はクリア。', captionHtml: '07 · 17.75–22.45s<br>乱戦でもコードの視界はクリア。' },
          { alt: '390px の狭窓でもスイスイ潜伏。', captionHtml: '08 · 22.45–25.48s<br>390px の狭窓でもスイスイ潜伏。' },
          { alt: '墨街 · 昼夜バトル結果発表', captionHtml: '09 · 25.48–30s<br>墨街 · 昼夜バトル結果発表' },
        ],
      },
      promoLandscape: {
        title: 'SPLAT-STREET · 横版プロモ＆絵コンテ（16:9）',
        navAria: 'ページナビゲーション',
        navHome: 'トップ',
        navVertical: '縦版 3:4',
        navLandscape: '横版 16:9',
        navShowcase: '図鑑',
        heading: '墨街バトル開始！作業場をハイカラスクエア色に染めよう。',
        lead: '横版プロモ · 1280×720 · 30s / 30fps · H.264 CRF18 · AAC 48kHz ステレオ',
        videoAria: 'SPLAT-STREET テーマ 30秒横版プロモーション動画',
        linkMp4: '本編 MP4',
        linkCover: '高画質カバー PNG',
        linkPoster: 'WebP ポスター',
        linkReadme: '横版再現ガイド',
        linkJson: '仕様＆ゲート JSON',
        storyboardHeading: '9カット 絵コンテ索引',
        shotsAria: 'シーンジャンプ',
        shots: [
          { alt: '墨街塗り開始！', label: '1.10s · 01 墨街塗り開始！' },
          { alt: '3色ストリート', label: '4.00s · 02 3色ストリート' },
          { alt: 'コマンド装填', label: '7.50s · 03 コマンド装填' },
          { alt: '濃度スライダー', label: '10.90s · 04 濃度スライダー' },
          { alt: 'フェスの夜！', label: '13.65s · 05 フェスの夜！' },
          { alt: 'ミッドナイトフェス', label: '16.00s · 06 ミッドナイトフェス' },
          { alt: 'コードアイランド', label: '18.80s · 07 コードアイランド' },
          { alt: '390px 狭幅表示', label: '24.00s · 08 390px 狭幅表示' },
          { alt: '昼夜フィナーレ', label: '27.50s · 09 昼夜フィナーレ' },
        ],
        extrasHeading: 'トランジション＆カットアウェイ特集',
        extrasAria: 'トランジションと補足フレーム',
        extras: [
          { alt: 'ツール結果カード', label: '21.30s · ツール結果カード' },
          { alt: 'シューター飛沫切替', label: '2.25s · シューター飛沫切替' },
          { alt: 'ダイナモローラー掃討', label: '12.75s · ダイナモローラー掃討' },
          { alt: 'デュアルローラー展開', label: '22.60s · デュアルローラー展開' },
          { alt: '終局フルスクリーン衝突', label: '25.48s · 終局フルスクリーン衝突' },
        ],
        asideTitle: '絵コンテ＆トランジション構成解説',
        asideP1Html:
          'シューター飛沫塗り、イカ潜行スターバースト、ダイナモローラー掃討、ホクサイ斜め斬り、デュアルローラー展開、終局衝突の6種ブキ演出を収録し、シームレスな <code>clipReveal</code> 切り替えと Shot 04 の設定UI連動を実現しています。',
        asideP2: '隔離 DSH ホストの事前定義セッションから実機描画で生成されています。各カードをクリックすると該当タイムスタンプへ移動します。',
        asideLink: '900フレーム自動検証ログを確認',
        footerNote: 'SPLAT-STREET プロモアーカイブ · ソーススクリプトとフレーム検証記録はリポジトリ内でオフライン再現可能です。',
      },
    },
    ko: {
      common: {
        langLabel: '언어 선택',
      },
      landing: {
        title: 'SPLAT-STREET: 스플래툰 2 감성의 DeepSeek Harness 테마',
        description:
          'SPLAT-STREET는 스플래툰 2에서 영감을 받은 DeepSeek Harness 테마 플러그인입니다. 오피셜 그린 3색 스트라이프 캔버스, 차콜 다크 모드, 3가지 메인 잉크 컬러 및 연속 잉크 농도 조절을 제공합니다.',
        nav: {
          skip: '본문으로 건너뛰기',
          aria: '기본 내비게이션',
          toggleAria: '내비게이션 메뉴 열기',
          battleground: '배틀필드',
          promo: '프로모션',
          showcase: '컴포넌트 도감',
          faq: 'FAQ',
          installCta: '테마 설치',
          mega: {
            visualLabel: '비주얼 시스템',
            paintHtml: '심(Seam) 스타일링<span>공개 토큰과 4개의 브랜드 Slot</span>',
            dayNightHtml: '주간 & 야간<span>라이트, 다크 및 캔버스 농도 실시간 조절</span>',
            appearanceHtml: '외관 커스텀<span>메인 그린 프리셋 및 표면 토글</span>',
            docsLabel: '데모 & 문서',
            promoHtml: '프로모 영상<span>30초 와이드 실기 캡처 & 사운드트랙</span>',
            verticalHtml: '세로 스토리보드<span>3:4 세로 영상 & 9컷 인덱스</span>',
            catalogueHtml: '컴포넌트 도감<span>18종 실제 DSH 컴포넌트 비교</span>',
            cardAlt: 'SPLAT-STREET 검은 테두리 Composer 카드와 우상단 마젠타 잉크 드립 장식',
            cardTitle: '18종 라이브 컴포넌트 도감',
            cardDesc: '메인 잉크 컬러와 농도를 실시간 전환',
          },
        },
        hero: {
          title: 'DeepSeek Harness SPLAT-STREET 테마',
          lead: '스플래툰 2 감성 스킨 플러그인: 오피셜 그린 #1EDC00 3색 스트라이프 캔버스, 차콜 다크 모드, 3가지 메인 잉크 컬러와 연속 농도 조절을 공개 토큰과 Slot만으로 구현했습니다.',
          installCta: '테마 설치',
          promoCta: '30초 영상 보기',
          stageAlt: 'SPLAT-STREET 미드나잇 페스티벌 다크 워크스페이스: 차콜 캔버스, 마젠타 스플래시, 오피셜 그린 선택 행, 광장 일러스트',
        },
        workbench: {
          headingHtml: '4개의 심(Seam)을 정교하게 채색.<span class="muted">기본 사이드바와 단축키는 그대로 유지.</span>',
          lead: '공개된 ThemeRuntime 토큰과 4개의 브랜드 Slot만 재정의합니다. 사이드바 세션, Diff 검토 영역, 툴 카드, 입력창은 네이티브 동작을 유지하며 비활성화 시 흔적 없이 복원됩니다.',
          cta: '18종 라이브 컴포넌트 도감 보기',
          appAria: 'DSH 사이드바 세션 목록 및 SPLAT-STREET 토큰 Diff 미리보기',
          dataOpen: '검수 대기',
          dataWork: '조정 중',
          dataDone: '통과',
          crumbHtml: 'Splat Studio <i>/</i> <b>실제 호스트</b>',
          filterPh: '필터',
          navAll: '전체',
          navDay: '주간',
          navNight: '야간',
          navVerified: '검증됨',
          navSeams: '심(Seam)',
          colsHtml: '<span>모듈</span><span>검증 항목</span><span>상태</span><span>시간</span>',
          rows: {
            tokensSub: '주야간 팔레트 매핑',
            skinSub: '3색 스트라이프 & 잉크 드립',
            bootSub: '24칸 스페셜 웨폰 게이지',
            prefsSub: '3종 메인 그린 저장',
            diffSub: '네온 & 네이티브 전환',
            sidebarSub: '오피셜 그린 선택 잉크 꼬리',
            toolSub: '45행 출력 대비 검증',
            narrowSub: '390px 좁은 화면 읽기',
            installSub: '비활성화 시 깔끔한 복구',
          },
          statusWork: '조정 중',
          statusDone: '통과',
          diffApply: '변경 적용',
          diffApplied: '적용됨',
          diffMsgHtml: '오피셜 그린 <code>#1EDC00</code> 배경 위 흰 글자는 대비가 부족하므로 <code>readable()</code>로 어두운 잉크 텍스트를 선택합니다.',
        },
        showcase: {
          headingHtml: '주야간 배틀필드와 잉크 농도.<span class="muted">페이퍼에서 터프까지 실시간 전환.</span>',
          lead: '주간에는 오피셜 그린·크림·마젠타 3색 스트라이프를, 야간에는 차콜 광장을 사용합니다. 슬라이더로 페이퍼 20%, 밸런스 50%, 터프 100% 사이를 부드럽게 조절하세요.',
          modeAria: '주야간 배틀필드 모드',
          lightMode: '주간 터프',
          darkMode: '야간 페스티벌',
          densityLabel: '캔버스 잉크 농도',
          densityPresetsAria: '캔버스 잉크 프리셋',
          presetPaper: '페이퍼 20%',
          presetBalanced: '밸런스 50%',
          presetTurf: '터프 100%',
          cta: '컴포넌트 도감에서 3종 메인 그린 전환하기',
          lightAlt: '주간 워크스페이스: 짙은 블랙 사이드바, 3색 스트라이프 캔버스, 광장 일러스트, 흰색 Composer 카드',
          darkAlt: '야간 미드나잇 페스티벌 광장: 차콜 배경 위 광장 일러스트, 양쪽 오징어 스티커, 네온 장식',
        },
        promo: {
          headingHtml: '30초 실기 프로모션 영상.<span class="muted">주야간 배틀필드와 슬래시 명령 시연.</span>',
          verticalLink: '세로 3:4 영상 및 9컷 인덱스 보기',
          landscapeLink: '가로 스토리보드 분석',
          videoAria: 'SPLAT-STREET 테마 30초 가로형 프로모션 영상',
        },
        features: {
          headingHtml: '외관 패널과 표면 토글.<span class="muted">모든 색상과 농도는 클라이언트 로컬에 적용됩니다.</span>',
          card1Title: '3종 메인 그린과 캔버스 잉크 농도 전환',
          card1Desc: '외관 패널에서 오피셜 그린 #1EDC00, 네온, 라임 프리셋과 0%–100% 슬라이더를 실시간으로 조절할 수 있습니다.',
          sliderTitle: 'SPLAT-STREET 외관',
          sliderReset: '초기화',
          sliderDensity: '잉크 농도',
          sliderRadius: '모서리 & 그림자',
          sliderGreenAria: '메인 잉크 컬러 프리셋',
          greenOfficial: '오피셜 그린',
          greenNeon: '네온',
          greenLime: '라임',
          card2Title: '장식·망점·Diff 구문 개별 전환',
          card2Desc: '광장 장식, 종이 망점, 내장 Nunito 폰트, 네이티브 Diff 구문을 개별 설정하고 로컬 localStorage에 저장합니다.',
          togglesTitle: '표면 토글 컨트롤',
          togglesCount: '2 of 3 on',
          toggle1Label: '광장 일러스트 & 잉크',
          toggle1Sub: '끄면 3색 캔버스만 유지',
          toggle2Label: '망점 텍스처 & 내장 폰트',
          toggle2Sub: 'WOFF2 내장으로 오프라인 작동',
          toggle3Label: 'DSH 기본 Diff 구문',
          toggle3Sub: '네온 vs 적/녹 하이라이트 전환',
        },
        toolchain: {
          headingHtml: '오프라인 빌드 및 게이트 검증.<span class="muted">폰트와 에셋을 클라이언트에 내장.</span>',
          card1Title: '표준 프론트엔드 툴체인으로 오프라인 번들링',
          card1Desc: 'TypeScript, esbuild, Biome, Lightning CSS로 빌드하며 폰트와 SVG/PNG 에셋을 결과물에 모두 인라인합니다.',
          diagramAlt: 'SPLAT-STREET는 TypeScript, esbuild, Biome, Node.js, pnpm, React로 구축되었습니다.',
          card2Title: '전체 검증 게이트 및 픽스처 통과',
          card2Desc: '빌드마다 사이트 검사, TypeScript 타입 체크, 계약 테스트, DSH 호환성 검증을 자동으로 수행합니다.',
        },
        screens: {
          headingHtml: '워크벤치 3대 핵심 화면 재구성.<span class="muted">부팅 게이지부터 설정까지 일관된 비주얼.</span>',
          tablistAria: '핵심 워크벤치 화면',
          tabBoot: '스페셜 부팅 화면',
          tabDay: '주간 외관 설정',
          tabNight: '야간 광장',
          panelBootDesc: '상단 오징어 인장을 유지한 채 로딩 링을 24칸 스플래툰 스페셜 웨폰 게이지로 재해석했으며, 진행률은 호스트 변수를 직접 읽습니다.',
          panelBootLink: '도감에서 부팅 카드 살펴보기',
          panelDayDesc: '설정 → 플러그인 → SPLAT-STREET 외관에서 페이퍼 20%, 밸런스 50%, 터프 100% 및 3종 메인 그린을 실시간 미리보기할 수 있습니다.',
          panelDayLink: '도감에서 외관 패널 열기',
          panelNightDesc: '다크 모드는 차콜 표면과 부드러운 헤어라인으로 눈부심을 줄이고, 네온 그린은 주요 버튼과 포커스 링에만 집중 배치합니다.',
          panelNightLink: '도감에서 다크 스타일 비교하기',
          imgBootAlt: 'SPLAT-STREET 부팅 화면: 스티커 카드, 오징어 스탬프, 24칸 그린 스페셜 웨폰 게이지',
          imgDayAlt: '라이트 모드 설정 화면의 SPLAT-STREET 외관 탭: 미리보기 카드, 농도 슬라이더, 그린 선택기',
          imgNightAlt: '다크 모드 설정 화면의 SPLAT-STREET 외관 탭: 차콜 표면, 오피셜 그린 테두리, 다크 미리보기',
        },
        install: {
          headingHtml: '두 줄 명령어로 간편 설치.<span class="muted">npm 및 오프라인 패키지 모두 지원.</span>',
          descHtml:
            'DSH 프로필 디렉터리에서 npm으로 최신 버전을 설치하거나 <a class="link" href="https://github.com/Shirolin/dsh-theme-splat-ui/releases">Releases</a>에서 오프라인 <code>.tgz</code> 파일을 받아 설치한 뒤(<a class="link" href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/README.ko.md#설치">README</a> 참조), DSH를 완전히 재시작하세요.',
          check1: '프로필당 하나의 테마 플러그인만 활성화하는 것을 권장합니다',
          check2: '외관 설정은 로컬 localStorage에 저장되며 Host 설정을 건드리지 않습니다',
          check3: '테마를 끄거나 삭제하면 DSH 기본 외관으로 깔끔하게 복원됩니다',
          cmdBarLeft: 'DSH 프로필 디렉터리에서 실행',
          cmdDir: 'cd <DSH_Profile_디렉터리>',
          copyBtn: '명령어 복사',
          copied: '복사됨',
          copyFailed: '복사 실패, 직접 선택하세요',
          compatLink: '호환성 계약 보기',
          stat1: '종의 메인 잉크 컬러 프리셋 (오피셜 / 네온 / 라임)',
          stat2: '개의 공개 DSH Slot 브랜드 및 외관 심(Seam)',
          stat3: '종의 실시간 DSH 컴포넌트 픽스처 비교',
          stat4: '건의 기본 사이드바 레이아웃·단축키 변경',
        },
        faq: {
          headingHtml: '자주 묻는 질문.<span class="muted">라이선스, 호환성 및 복원 방법.</span>',
          q1Title: '공식 테마인가요?',
          q1Html:
            '아니요. SPLAT-STREET는 비공식 팬 테마이며 Nintendo 및 DeepSeek 공식과 무관합니다. 에셋 출처는 <a class="link" href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/THIRD_PARTY_NOTICES.md">THIRD_PARTY_NOTICES.md</a>에서 확인할 수 있습니다.',
          q2Title: '기본 레이아웃이나 단축키가 바뀌나요?',
          q2Desc: '아니요. 공개 토큰과 4개의 브랜드 Slot만 재정의하므로 사이드바, 입력 영역, 단축키는 모두 기본 상태 그대로 작동합니다.',
          q3Title: '어떤 플랫폼을 지원하나요?',
          q3Desc: '실제 DSH Web 주야간 및 390px 모바일 뷰포트 전체 검증과 Windows 데스크톱 타이틀바·사이드바 실기 검증을 마쳤습니다.',
          q4Title: '원래 모습으로 되돌리려면 어떻게 하나요?',
          q4Desc: '플러그인 관리에서 테마를 비활성화하거나 삭제한 뒤 재시작하면 설치 시 백업된 루트 속성이 깔끔하게 복구됩니다.',
          visualAlt: 'SPLAT-STREET 주간 광장 빈 세션 일러스트',
        },
        close: {
          heading: '워크스페이스를 나만의 홈 터프로 칠해보세요',
          leadHtml: 'DSH 프로필 디렉터리에서 <code>pnpm add dsh-theme-splat-ui</code>를 실행한 뒤 재시작하면 즉시 적용됩니다.',
          cta: '테마 설치',
        },
        footer: {
          lede: '스플래툰 2 감성의 DeepSeek Harness 테마 플러그인.',
          col1Title: '비주얼 시스템',
          col1Link1: '심 스타일링',
          col1Link2: '주야간 배틀',
          col2Title: '주요 기능',
          col2Link1: '외관 설정',
          col2Link2: '오프라인 빌드',
          col3Title: '데모 & 도감',
          col3Link1: '세로 프로모션',
          col3Link2: '컴포넌트 도감',
          col4Title: '저장소 & 문서',
          col4Link2: '호환성 계약',
          legal:
            '비공식 팬 테마 · Splatoon과 Splatoon 2는 Nintendo의 상표입니다 · MIT License 2026 Shirolin · Product names and logos are trademarks of their owners',
          credits: '에셋 출처 및 서드파티 고지',
        },
      },
      showcase: {
        title: 'DSH 컴포넌트 도감 · SPLAT-STREET',
        description: 'SPLAT-STREET 컴포넌트 도감: 실제 DSH 런타임 CSS와 테마 스킨으로 렌더링한 주야간 컴포넌트 비교 뷰.',
        backHome: '홈으로',
        heading: 'DSH 컴포넌트 도감',
        navPromo: '프로모션',
        searchSr: '컴포넌트 또는 패키지 검색',
        searchPlaceholder: '컴포넌트명, 제목, 패키지 필터 (/ 키로 포커스)',
        modeSwitchAria: '주간/야간 모드 전환',
        modeLight: '주간',
        modeDark: '야간',
        controlsAria: '외관 파라미터 실시간 조절',
        densityGroupTitle: '--dsw-alias-bg-base를 사용하는 워크스페이스, Diff, 미리보기 창의 잉크 농도 조절 (고정 배경 카드는 유지)',
        densityLabel: '잉크 농도',
        densityPresetsAria: '잉크 농도 프리셋',
        presetPaper: '페이퍼',
        presetBalanced: '밸런스',
        presetTurf: '터프',
        greenGroupTitle: '전역 메인 잉크 컬러 전환 (오피셜 그린 / 네온 / 라임)',
        greenLabel: '메인 그린',
        greenPresetsAria: '메인 그린 프리셋',
        greenOfficial: '오피셜 그린',
        greenNeon: '네온',
        greenLime: '라임',
        decorTitle: '워크스페이스 및 종이 가장자리의 잉크 방울·스플래시 장식 전환',
        decorLabel: '잉크 장식',
        grainTitle: '종이 표면과 입력 카드의 망점 텍스처 전환',
        grainLabel: '종이 망점',
        diffTitleLight: 'DSH 기본 적/녹 Diff 구문 강조 전환 (주간 모드 Diff 카드에만 적용)',
        diffTitleDark: '기본 Diff 구문은 주간 모드에서만 적용됩니다 (야간 모드는 고대비 색상 유지)',
        diffLabel: '기본 Diff 구문',
        fontTitle: '테마 내장 Nunito 폰트와 시스템 기본 폰트 전환 (영문/숫자에 적용)',
        fontLabel: '시스템 폰트',
        resetTitle: '일괄 오버라이드를 해제하고 각 카드를 기본 데모 상태로 복원',
        resetBtn: '카드 초기화',
        ctrlHint: '농도는 캔버스·Diff·미리보기에 반영되며 토글은 모든 카드에 실시간 전달됩니다.',
        sidebarAria: '컴포넌트 분류 목차',
        loading: '컴포넌트 목록 불러오는 중…',
        emptyTitle: '일치하는 컴포넌트 픽스처가 없습니다.',
        emptyHint: '`composer`, `diff`, `appearance` 또는 패키지 이름으로 검색해 보세요.',
        clearSearch: '필터 지우기',
        footerDefault: '실제 DSH 런타임 CSS와 테마 빌드 결과물로 렌더링됨.',
        footerHome: '테마 홈',
        footerPromo: '프로모션',
        footerRepo: 'GitHub 저장소',
        statusFiltered: '검색 결과: {visible} / {total} 컴포넌트 ({mode} 모드)',
        statusAll: '총 {total}종 실제 DSH 컴포넌트 픽스처 · 현재 {mode} 모드',
        modeWordLight: '주간',
        modeWordDark: '야간',
        groupCount: '{count}개',
        openRaw: '새 창에서 열기 ↗',
        footerBuilt: 'DSH {version} 렌더링 · 빌드 {date} · 픽스처 및 스킨 원본 무수정',
        loadError: '매니페스트를 불러올 수 없습니다 ({message}). `pnpm run showcase` 실행 후 HTTP 서버로 열어주세요.',
        groups: {
          工作区与会话: '워크스페이스 & 세션',
          代码与交付: '코드 & 결과물',
          浮层与反馈: '오버레이 & 피드백',
          设置与外观: '설정 & 외관',
          启动页: '부팅 화면',
          其他: '기타',
        },
        fixtures: {
          'conversation-workspace': '메인 워크스페이스 · 타이틀바, 코드 블록 & 컴포저',
          'sidebar-masthead': 'SPLAT-STREET · 실제 사이드바 브랜드 및 세션 트리',
          'turn-trigger-notice': '턴 트리거 알림 바 · 다크 카드 텍스트 가독성',
          'code-island-scopes': '코드 아일랜드 스코프 · 라이트 카드 대비 보호',
          'deliverables-diff': 'Deliverables Diff · 네온 라이트 팔레트',
          'deliverables-diff-native': 'Deliverables Diff · DSH 기본 구문 팔레트 전환',
          'document-preview-plain': '문서 미리보기 · 우측 패널 일반 텍스트 뷰',
          'tool-result': '도구 실행 결과 · 실제 입출력 카드',
          'input-menu': '입력 메뉴 · 슬래시 별칭, 선택 대비 및 좁은 화면',
          'input-skills': '스킬 추천 · 겹침 없는 긴 설명 목록',
          'keybinding-search': '단축키 모달 · 검색 입력창 (실제 DSH DOM)',
          'model-search': '모델 목록 · 단일 테두리 둥근 검색창',
          'toast-notice': '토스트 알림 · 툴팁 표면 위 가독성',
          'appearance-panel': 'SPLAT-STREET 외관 · 설정 패널 탭',
          'plugin-settings-light': '플러그인 설정 · 라이트 토글 경계 및 읽기 면',
          'settings-nav': '설정 내비게이션 · 잉크 선택, 제목 및 포커스 링',
          'boot-failure': 'DSH 부팅 실패 화면 · 스크롤 가능한 공식 오류 목록',
          'boot-loading': 'DSH 부팅 대기 화면 · 스페셜 게이지 로더',
        },
      },
      promoVertical: {
        title: 'SPLAT-STREET · 세로형 프로모션 (3:4)',
        navAria: '페이지 내비게이션',
        navHome: '홈',
        navVertical: '세로 3:4',
        navLandscape: '가로 16:9',
        navShowcase: '도감',
        heading: '워크스페이스를 홈 터프로 칠해보세요.',
        lead: 'SPLAT-STREET 세로형 프로모션(3:4 · 모바일 및 SNS 공유용), 스플래툰 2 스타일 BGM과 9컷 실기 영상.',
        videoAria: 'SPLAT-STREET 테마 30초 세로형 프로모션 영상',
        linkMp4: '완성본 MP4',
        linkCover: '고화질 커버 PNG',
        linkPoster: 'WebP 포스터',
        linkReadme: '재현 가이드',
        linkJson: '사양 검증 JSON',
        spec: '1080×1440 · 30초 · 30fps · H.264 CRF18 · bt709 · AAC 48kHz 스테레오',
        note: '격리된 실제 DSH 호스트 렌더링을 기반으로 제작되었습니다. 아래 컷을 클릭하면 해당 타임스탬프로 이동합니다.',
        storyboardHeading: '9컷 스토리보드 인덱스',
        shots: [
          { alt: '잉크 스트리트 개시!', captionHtml: '01 · 0–2.4s<br>잉크 스트리트 개시!' },
          { alt: '3색 스트리트, 시작부터 풀 페인트.', captionHtml: '02 · 2.4–5.95s<br>3색 스트리트, 시작부터 풀 페인트.' },
          { alt: '슬래시 명령 장전 완료.', captionHtml: '03 · 5.95–9.18s<br>슬래시 명령 장전 완료.' },
          { alt: '풀 페인트도 편안한 페이퍼도 자유롭게.', captionHtml: '04 · 9.18–12.9s<br>풀 페인트도 편안한 페이퍼도 자유롭게.' },
          { alt: '페스티벌 나이트폴!', captionHtml: '05 · 12.9–14.45s<br>페스티벌 나이트폴!' },
          { alt: '미드나잇 페스티벌, 네온 풀 오픈.', captionHtml: '06 · 14.45–17.75s<br>미드나잇 페스티벌, 네온 풀 오픈.' },
          { alt: '치열한 배틀 속에서도 또렷한 코드 시야.', captionHtml: '07 · 17.75–22.45s<br>치열한 배틀 속에서도 또렷한 코드 시야.' },
          { alt: '390px 좁은 창에서도 매끄러운 잠행.', captionHtml: '08 · 22.45–25.48s<br>390px 좁은 창에서도 매끄러운 잠행.' },
          { alt: 'SPLAT-STREET · 주야간 최종 정산', captionHtml: '09 · 25.48–30s<br>SPLAT-STREET · 주야간 최종 정산' },
        ],
      },
      promoLandscape: {
        title: 'SPLAT-STREET · 가로형 프로모션 & 스토리보드 (16:9)',
        navAria: '페이지 내비게이션',
        navHome: '홈',
        navVertical: '세로 3:4',
        navLandscape: '가로 16:9',
        navShowcase: '도감',
        heading: '잉크 스트리트 개시! 작업 공간을 잉코폴리스 광장으로.',
        lead: '가로형 프로모션 · 1280×720 · 30s / 30fps · H.264 CRF18 · AAC 48kHz 스테레오',
        videoAria: 'SPLAT-STREET 테마 30초 가로형 프로모션 영상',
        linkMp4: '완성본 MP4',
        linkCover: '고화질 커버 PNG',
        linkPoster: 'WebP 포스터',
        linkReadme: '가로형 재현 가이드',
        linkJson: '사양 & 게이트 JSON',
        storyboardHeading: '9컷 스토리보드 인덱스',
        shotsAria: '장면 이동',
        shots: [
          { alt: '잉크 스트리트 개시!', label: '1.10s · 01 잉크 스트리트 개시!' },
          { alt: '3색 스트리트', label: '4.00s · 02 3색 스트리트' },
          { alt: '명령 장전', label: '7.50s · 03 명령 장전' },
          { alt: '농도 실시간 조절', label: '10.90s · 04 농도 실시간 조절' },
          { alt: '페스티벌 나이트폴!', label: '13.65s · 05 페스티벌 나이트폴!' },
          { alt: '미드나잇 페스티벌', label: '16.00s · 06 미드나잇 페스티벌' },
          { alt: '코드 아일랜드 뷰', label: '18.80s · 07 코드 아일랜드 뷰' },
          { alt: '390px 좁은 화면', label: '24.00s · 08 390px 좁은 화면' },
          { alt: '주야간 피날레', label: '27.50s · 09 주야간 피날레' },
        ],
        extrasHeading: '트랜지션 및 인서트 클로즈업',
        extrasAria: '트랜지션 및 추가 프레임',
        extras: [
          { alt: '도구 결과 카드', label: '21.30s · 도구 결과 카드' },
          { alt: '슈터 잉크 전환', label: '2.25s · 슈터 잉크 전환' },
          { alt: '다이나모 롤러 스윕', label: '12.75s · 다이나모 롤러 스윕' },
          { alt: '듀얼 롤러 리빌', label: '22.60s · 듀얼 롤러 리빌' },
          { alt: '피날레 풀스크린 충돌', label: '25.48s · 피날레 풀스크린 충돌' },
        ],
        asideTitle: '스토리보드 및 트랜지션 연출 노트',
        asideP1Html:
          '슈터 잉크 채우기, 오징어 잠행 스타버스트, 다이나모 롤러 스윕, 호쿠사이 브러시 사선 베기, 듀얼 롤러 리빌, 피날레 충돌까지 6종의 스플래툰 무기 트랜지션을 수록했으며 <code>clipReveal</code> 무컷 전환과 Shot 04 실시간 외관 연동을 구현했습니다.',
        asideP2: '격리된 DSH 호스트의 사전 설정 세션 렌더링으로 제작되었습니다. 각 카드를 클릭하면 해당 시간으로 바로 이동합니다.',
        asideLink: '900프레임 자동 검증 기록 보기',
        footerNote: 'SPLAT-STREET 프로모션 아카이브 · 소스 스크립트와 프레임 검증 목록은 저장소에서 오프라인으로 재현할 수 있습니다.',
      },
    },
  }

  let currentLocale = detectInitialLocale()
  const listeners = new Set()

  function resolveKey(locale, key) {
    const parts = key.split('.')
    let cursor = DICTIONARIES[locale]
    for (const part of parts) {
      if (cursor === null || cursor === undefined) return undefined
      cursor = cursor[part]
    }
    return cursor
  }

  function t(key, params) {
    const raw = resolveKey(currentLocale, key) ?? resolveKey('zh', key)
    if (typeof raw !== 'string') return ''
    return formatTemplate(raw, params)
  }

  function applyPage(pageName) {
    const activePage = pageName ?? document.body?.dataset?.i18nPage
    document.documentElement.lang = HTML_LANG[currentLocale] ?? 'zh-CN'

    for (const select of document.querySelectorAll('[data-lang-select]')) {
      select.value = currentLocale
      const langLabel = t('common.langLabel')
      if (langLabel) select.setAttribute('aria-label', langLabel)
    }

    if (activePage) {
      const pageTitle = t(`${activePage}.title`)
      if (pageTitle) document.title = pageTitle
      const pageDesc = t(`${activePage}.description`)
      if (pageDesc) {
        const metaDesc = document.querySelector('meta[name="description"]')
        if (metaDesc) metaDesc.setAttribute('content', pageDesc)
      }
    }

    for (const el of document.querySelectorAll('[data-i18n]')) {
      const val = t(el.dataset.i18n)
      if (val) el.textContent = val
    }

    for (const el of document.querySelectorAll('[data-i18n-html]')) {
      const val = t(el.dataset.i18nHtml)
      if (val) el.innerHTML = val
    }

    for (const el of document.querySelectorAll('[data-i18n-attr]')) {
      const spec = el.dataset.i18nAttr
      if (!spec) continue
      for (const pair of spec.split(',')) {
        const sep = pair.indexOf(':')
        if (sep <= 0) continue
        const attrName = pair.slice(0, sep).trim()
        const key = pair.slice(sep + 1).trim()
        const val = t(key)
        if (val) el.setAttribute(attrName, val)
      }
    }

    for (const el of document.querySelectorAll('[data-i18n-diagram-alt]')) {
      const altText = t(el.dataset.i18nDiagramAlt)
      if (!altText) continue
      const rawSpec = el.getAttribute('data-diagram')
      if (rawSpec?.startsWith('{')) {
        try {
          const parsed = JSON.parse(rawSpec)
          parsed.alt = altText
          el.setAttribute('data-diagram', JSON.stringify(parsed))
        } catch {
          // Ignore malformed inline diagram JSON.
        }
      }
      const renderedSvg = el.querySelector('svg[aria-label]')
      if (renderedSvg) renderedSvg.setAttribute('aria-label', altText)
    }
  }

  function setLocale(nextLocale) {
    const normalized = normalizeLocale(nextLocale)
    if (!normalized) return currentLocale
    const changed = normalized !== currentLocale
    currentLocale = normalized
    writeStoredLocale(currentLocale)
    applyPage()
    if (changed) {
      for (const listener of [...listeners]) {
        try {
          listener(currentLocale)
        } catch {
          // Keep notifying remaining listeners.
        }
      }
    }
    return currentLocale
  }

  function bindSelectors() {
    for (const select of document.querySelectorAll('[data-lang-select]')) {
      if (select.dataset.i18nBound) continue
      select.dataset.i18nBound = '1'
      select.value = currentLocale
      select.addEventListener('change', (event) => {
        setLocale(event.target.value)
      })
    }
  }

  window.splatSiteI18n = {
    getLocale() {
      return currentLocale
    },
    setLocale,
    t,
    getGroupName(group) {
      return resolveKey(currentLocale, `showcase.groups.${group}`) ?? group
    },
    getFixtureTitle(name, fallback) {
      return resolveKey(currentLocale, `showcase.fixtures.${name}`) ?? fallback
    },
    onChange(listener) {
      if (typeof listener !== 'function') return () => {}
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    applyPage,
  }

  const init = () => {
    bindSelectors()
    applyPage()
  }

  if (document.body) init()
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  }
})()
