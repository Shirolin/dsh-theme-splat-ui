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
        title: 'SPLAT-STREET · 斯普拉遁 2 风格的 DSH 主题',
        description:
          'SPLAT-STREET 是一套斯普拉遁 2 风格的 DeepSeek Harness 主题：官方绿/奶油/洋红三色条纹画布、洋红与官方绿泼溅、自由漂浮的墨街插画与昼夜两套战场。',
        nav: {
          skip: '跳到正文',
          homeAria: 'SPLAT-STREET 首页',
          aria: '主导航',
          promo: '宣传片',
          showcaseLive: '真实组件',
          catalogue: '图鉴',
          install: '安装',
          faq: '问答',
        },
        hero: {
          eyebrowHtml: 'DEEPSEEK HARNESS 主题插件 · <span>官方绿 #1EDC00</span>',
          headingHtml: '<span class="hero__name">SPLAT-STREET</span>涂满工作台。',
          lead: '一套斯普拉遁 2 风格的 DeepSeek Harness 主题：官方绿/奶油/洋红三色画布、昼夜双战场、三档主墨色与连续画布墨度，原生功能零改动。',
          installCta: '安装主题',
          promoCta: '看 30 秒宣传片',
          dayBadge: 'DAY TURF · 白昼涂地',
          dayAlt: 'SPLAT-STREET 日间白昼涂地工作台：墨黑侧栏、三色条纹画布、自由漂浮的广场插画与白色 Composer 卡片。',
          nightBadge: 'NIGHT SHIFT · 午夜祭典',
          nightAlt: 'SPLAT-STREET 夜间午夜祭典工作台：炭黑广场画布、洋红泼溅与高对比电光绿强调色。',
        },
        promo: {
          heading: '30 秒，看遍昼夜墨街。',
          lead: '实机渲染分镜搭配斯普拉遁 2 风格配乐与清脆音效，一次看完三色街区、斜杠指令、墨度调节与午夜祭典。',
          videoAria: 'SPLAT-STREET 墨街主题 30 秒横版宣传片（含昼夜战场、斜杠指令、墨度调节与窄屏演示）',
          verticalLink: '竖版（3:4）与分镜预览 →',
          landscapeLink: '横版分镜拆解 →',
          catalogueLink: '18 组实时组件图鉴 →',
        },
        showcase: {
          fixtureTabsAria: '真实 DSH 组件夹具',
          tabWorkspace: '主工作区',
          tabAppearance: '墨街外观',
          tabDiff: 'Diff 交付',
          tabBoot: '大招启动',
          openFixture: '单独打开夹具 ↗',
          iframeTitle: 'DSH 真实组件实时预览',
          fixtureSourceLabel: '真实 DSH CSS 渲染夹具',
          heading: '真实组件，实时调墨。',
          desc: '左侧直接嵌入真实 DSH DOM 与官方 CSS 夹具。切换日/夜战场、画布墨度或三套主墨色时，样式直接注入真实组件视图。',
          modeAria: '昼夜战场',
          modeLight: '日间',
          modeDark: '夜间',
          densityLabel: '画布墨度',
          densityPresetsAria: '画布墨度预设',
          presetPaper: '纸白 20%',
          presetBalanced: '均衡 50%',
          presetTurf: '涂地 100%',
          greenLabel: '主墨色',
          greenAria: '主墨色预设',
          greenOfficial: '官方绿',
          greenNeon: '荧光绿',
          greenLime: '黄绿',
          cta: '查看全部 18 组真实 DSH 组件图鉴 →',
        },
        features: {
          aria: '主题特性',
          f1Title: '昼夜双战场，三套主墨色。',
          f1Desc: '默认官方绿 #1EDC00，可一键切换荧光绿与黄绿；夜间换上炭黑霓虹广场，不是简单反相。',
          f2Title: '画布墨度，纸白到涂地。',
          f2Desc: '三档预设（纸白 20% / 均衡 50% / 涂地 100%）配合 0%–100% 滑杆，高饱和涂装与长文阅读兼顾。',
          f3Title: '装饰、网点与 Diff 语法，随手开关。',
          f3Desc: '可单独关闭插画与纸面网点，并支持在霓虹语法与 DSH 原生 Diff 配色间切换。',
          f4Title: '中日英韩四语自适应，素材构建期内嵌。',
          f4Desc: '外观面板、启动加载语与插件元信息自动跟随宿主语言切换；Nunito 字体与矢量/PNG 素材构建期内嵌，离线也能用。',
        },
        steps: {
          heading: '四步上场。',
          lead: '安装、启用、调整、开涂。主题只通过公开的 ThemeRuntime Token 与 4 个品牌 Slot 调整配色与工作台样式。',
          s1Word: '装上',
          s1CardTitle: 'DSH CLI / npm',
          s1Meta: '或在 DSH profile 目录执行 pnpm add',
          s1Clause: '一键把主题插件装进 profile。',
          s2Word: '启用',
          s2CardTitle: '墨街外观',
          s2Row1: '纸白',
          s2Row2: '均衡',
          s2Row3: '涂地',
          s2Clause: '重启后主题自动接管。',
          s3Word: '调整',
          s3CardTitle: '设置 → 内置插件',
          s3Row1: '主墨色',
          s3Val1: '官方绿',
          s3Row2: '插画装饰',
          s3Val2: '开',
          s3Row3: '纸面网点',
          s3Val3: '开',
          s3Row4: 'Diff 语法',
          s3Val4: '霓虹',
          s3Clause: '在外观页选墨色、墨度与开关。',
          s4Word: '开涂',
          s4CardTitle: '新会话',
          s4Line: '把灵感，涂满全场。',
          s4Meta: 'Enter 发送 · Shift + Enter 换行',
          s4Clause: '回到工作台，开始写。',
        },
        install: {
          heading: '一条命令装好，开涂。',
          descHtml:
            '推荐在终端直接运行 <code>dsh plugin add dsh-theme-splat-ui</code>，或进入 DSH profile 目录通过 npm 安装；离线安装包可在 <a href="https://github.com/Shirolin/dsh-theme-splat-ui/releases">GitHub Releases</a> 获取，完整重启 DSH / 桌面端后生效。',
          shotAlt: 'SPLAT-STREET 启动页：官方绿/奶油/洋红三色画布上的白色贴纸卡、鱿鱼徽章与 24 格大招能量槽。',
          cmdLabel: '在 DSH profile 目录执行',
          cmdDir: 'cd <DSH_Profile_目录>',
          copyBtn: '复制命令',
          copied: '已复制',
          copyFailed: '复制失败，请手动选择',
          compatLink: '查看兼容性契约 →',
          note1: '同一 profile 建议只启用一个主题插件。',
          note2Html: '外观偏好保存在本机 <code>localStorage</code>，不写入 Host 设置。',
          note3: '停用或卸载主题后，界面自动还原为 DSH 原生外观。',
        },
        faq: {
          heading: '常见问答。',
          lead: '关于来源、兼容性与恢复方式。',
          q1Summary: '这是官方主题吗？',
          q1Html:
            '不是。SPLAT-STREET 是非官方粉丝主题，与 Nintendo 及 DeepSeek 官方没有隶属或背书关系。主题使用原创矢量鱿鱼/章鱼贴纸、基于游戏截图参考生成的广场插画，以及 SVG 装饰；来源与第三方声明见<a href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/THIRD_PARTY_NOTICES.md">第三方声明</a>。',
          q2Summary: '会改动 DSH 的布局或快捷键吗？',
          q2Answer: '不会。主题只覆写公开的 ThemeRuntime Token 与 4 个品牌 Slot，侧栏、会话、输入区和快捷键保持 DSH 原生行为。接缝缺失时会自动退回原生界面。',
          q3Summary: '支持哪些平台？',
          q3Html:
            '已完成真实 DSH Web 日夜与 390px 窄屏全量验收，以及 Windows 桌面端原生标题栏与侧栏布局实机验证，详细兼容范围见<a href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/docs/acceptance.md">验收记录</a>。',
          q4Summary: '怎么恢复原生外观？',
          q4Answer: '在插件管理里禁用主题，或卸载包后重启。主题安装时快照的根属性会恢复，不会残留画布或外观设置。',
          q5Summary: '截图和真实界面一致吗？',
          q5Html:
            '本页宣传图与上方真实组件窗口、<a href="showcase/">18 组组件图鉴</a>均来自当前构建与真实 DSH 运行时 CSS 渲染；真实长对话日夜验收图见<a href="https://github.com/Shirolin/dsh-theme-splat-ui#readme">仓库说明</a>。',
          q6Summary: '夜里觉得太亮怎么办？',
          q6Answer:
            '把画布墨度调向「纸白 20%」或「均衡 50%」以适配阅读偏好，也可以在设置页关闭插画装饰与纸面网点。夜间模式本身采用炭黑广场，荧光色只保留在主按钮与焦点高光上。',
        },
        cta: {
          note: '一条命令，重启后生效。',
          word: '开涂',
        },
        footer: {
          navAria: '页脚导航',
          promo: '宣传片',
          showcase: '组件图鉴',
          install: '安装说明',
          design: '设计说明',
          compat: '兼容性',
          disclaimer: '非官方粉丝主题。Splatoon 与 Splatoon 2 是 Nintendo 的商标。',
          legalHtml:
            '项目代码：MIT · 2026 Shirolin and contributors · <a href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/THIRD_PARTY_NOTICES.md">素材来源与第三方许可</a>',
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
        title: 'SPLAT-STREET · Splatoon 2 Inspired DSH Theme',
        description:
          'SPLAT-STREET is a Splatoon 2 inspired DeepSeek Harness theme: Official green, cream, and magenta tri-band canvas, ink splashes, plaza illustration, and day/night battlefields.',
        nav: {
          skip: 'Skip to content',
          homeAria: 'SPLAT-STREET Home',
          aria: 'Primary navigation',
          promo: 'Promo',
          showcaseLive: 'Live Components',
          catalogue: 'Catalogue',
          install: 'Install',
          faq: 'FAQ',
        },
        hero: {
          eyebrowHtml: 'DEEPSEEK HARNESS THEME PLUGIN · <span>Official #1EDC00</span>',
          headingHtml: '<span class="hero__name">SPLAT-STREET</span>Paint your workspace.',
          lead: 'A Splatoon 2 inspired theme for DeepSeek Harness: tri-band green/cream/magenta canvas, day & night arenas, 3 primary greens, and continuous ink density with zero breaking layout changes.',
          installCta: 'Install theme',
          promoCta: 'Watch 30s promo',
          dayBadge: 'DAY TURF',
          dayAlt: 'SPLAT-STREET daytime workspace: near-black sidebar, tri-band turf canvas, floating plaza art, and white Composer card.',
          nightBadge: 'NIGHT SHIFT',
          nightAlt: 'SPLAT-STREET night Splatfest workspace: charcoal plaza canvas, magenta splashes, and high-contrast electric green accents.',
        },
        promo: {
          heading: '30 seconds across day and night turf.',
          lead: 'Real host captures set to a Splatoon 2 inspired soundtrack, covering tri-band zones, slash commands, ink density tuning, and Midnight Splatfest.',
          videoAria: 'SPLAT-STREET 30-second widescreen promo featuring day/night arenas, slash commands, ink density slider, and narrow view',
          verticalLink: 'Vertical (3:4) & 9-shot storyboard →',
          landscapeLink: '16:9 storyboard breakdown →',
          catalogueLink: '18 live component fixtures →',
        },
        showcase: {
          fixtureTabsAria: 'Real DSH component fixtures',
          tabWorkspace: 'Workspace',
          tabAppearance: 'Appearance',
          tabDiff: 'Diff View',
          tabBoot: 'Special Boot',
          openFixture: 'Open fixture ↗',
          iframeTitle: 'Live preview built from real DSH DOM and CSS',
          fixtureSourceLabel: 'Rendered with real DSH CSS',
          heading: 'Real components, live ink tuning.',
          desc: 'Embedded directly from version-pinned DSH DOM and stylesheet fixtures. Switch Day/Night arenas, canvas ink density, or primary greens to style the live views.',
          modeAria: 'Day and night arenas',
          modeLight: 'Day',
          modeDark: 'Night',
          densityLabel: 'Canvas ink density',
          densityPresetsAria: 'Canvas ink presets',
          presetPaper: 'Paper 20%',
          presetBalanced: 'Balanced 50%',
          presetTurf: 'Turf 100%',
          greenLabel: 'Primary ink green',
          greenAria: 'Primary ink green presets',
          greenOfficial: 'Official',
          greenNeon: 'Neon',
          greenLime: 'Lime',
          cta: 'Browse all 18 live DSH fixtures →',
        },
        features: {
          aria: 'Theme capabilities',
          f1Title: 'Two arenas, three primary ink greens.',
          f1Desc: 'Official #1EDC00 by default with Neon and Lime presets; night mode swaps to a charcoal neon plaza instead of a naive inversion.',
          f2Title: 'Canvas ink from Paper to Turf.',
          f2Desc: 'Three presets (Paper 20%, Balanced 50%, Turf 100%) plus a 0%–100% slider balance vivid turf styling with long-form readability.',
          f3Title: 'Toggle décor, grain, and diff syntax.',
          f3Desc: 'Turn plaza artwork or halftone grain off individually, and switch between neon diff highlights and native DSH red/green colors.',
          f4Title: '4-locale adaptive UI & bundled offline assets.',
          f4Desc:
            'Appearance controls, boot copy, and plugin metadata track the host language across zh/en/ja/ko; Nunito WOFF2 and SVG/PNG assets are bundled inline.',
        },
        steps: {
          heading: 'Four steps to the plaza.',
          lead: 'Install, activate, tune, and ink up. The theme styles colors and surfaces solely through public ThemeRuntime tokens and 4 brand slots.',
          s1Word: 'Install',
          s1CardTitle: 'DSH CLI / npm',
          s1Meta: 'Or run pnpm add in your DSH profile dir',
          s1Clause: 'Add the theme plugin to your profile.',
          s2Word: 'Enable',
          s2CardTitle: 'Splat appearance',
          s2Row1: 'Paper',
          s2Row2: 'Balanced',
          s2Row3: 'Turf',
          s2Clause: 'Restart DSH to apply the skin.',
          s3Word: 'Tune',
          s3CardTitle: 'Settings → Plugins',
          s3Row1: 'Primary green',
          s3Val1: 'Official',
          s3Row2: 'Ink décor',
          s3Val2: 'On',
          s3Row3: 'Halftone grain',
          s3Val3: 'On',
          s3Row4: 'Diff syntax',
          s3Val4: 'Neon',
          s3Clause: 'Pick ink color, density, and toggles.',
          s4Word: 'Ink Up',
          s4CardTitle: 'New Session',
          s4Line: 'Paint the whole plaza with ideas.',
          s4Meta: 'Enter to send · Shift + Enter for newline',
          s4Clause: 'Return to the workspace and start.',
        },
        install: {
          heading: 'One command to install and ink.',
          descHtml:
            'Run <code>dsh plugin add dsh-theme-splat-ui</code> or install via npm inside your DSH profile directory. Offline <code>.tgz</code> packages are also available on <a href="https://github.com/Shirolin/dsh-theme-splat-ui/releases">GitHub Releases</a>; restart DSH / Desktop after installing.',
          shotAlt: 'SPLAT-STREET boot card on tri-band turf canvas with squid seal and 24-segment Special Weapon Gauge.',
          cmdLabel: 'Run inside your DSH profile directory',
          cmdDir: 'cd <DSH_Profile_dir>',
          copyBtn: 'Copy command',
          copied: 'Copied',
          copyFailed: 'Copy failed, select manually',
          compatLink: 'View compatibility contract →',
          note1: 'Keep only one theme plugin enabled per profile.',
          note2Html: 'Appearance preferences save to local <code>localStorage</code> without modifying Host settings.',
          note3: 'Disabling or uninstalling cleanly restores native DSH appearance.',
        },
        faq: {
          heading: 'FAQ.',
          lead: 'Sources, compatibility, and clean removal.',
          q1Summary: 'Is this an official theme?',
          q1Html:
            'No. SPLAT-STREET is an unofficial fan theme with no affiliation or endorsement from Nintendo or DeepSeek. It uses original vector squid/octopus artwork, a plaza illustration generated from a screenshot reference, and SVG ornaments; see <a href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/THIRD_PARTY_NOTICES.md">THIRD_PARTY_NOTICES.md</a>.',
          q2Summary: 'Does it change DSH layout or keybindings?',
          q2Answer:
            'No. The theme overrides only public ThemeRuntime tokens and 4 brand slots. Sidebar navigation, sessions, composer behavior, and keyboard shortcuts remain native and fall back cleanly if a seam is missing.',
          q3Summary: 'Which platforms are supported?',
          q3Html:
            'Verified across real DSH Web light/dark modes and 390px narrow viewports, as well as live Windows Desktop titlebar and sidebar checks. See <a href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/docs/acceptance.md">acceptance notes</a> for details.',
          q4Summary: 'How do I restore the native look?',
          q4Answer:
            'Disable the theme in Plugin Manager or uninstall the package and restart DSH. Snapshotted root attributes are restored cleanly with zero leftover canvas or preferences.',
          q5Summary: 'Do the previews match the real app?',
          q5Html:
            'All screenshots, the live fixtures above, and the <a href="showcase/">18-fixture component catalogue</a> are rendered directly with the built skin and real DSH CSS. Real long-conversation captures are linked in the <a href="https://github.com/Shirolin/dsh-theme-splat-ui#readme">README</a>.',
          q6Summary: 'What if dark mode or turf canvas feels too intense?',
          q6Answer:
            'Slide canvas ink toward Paper 20% or Balanced 50% for calmer reading, or disable plaza artwork and halftone grain in Settings. Dark mode uses a charcoal ground and keeps neon green strictly on primary controls and focus rings.',
        },
        cta: {
          note: 'One command, active after restart.',
          word: 'INK UP',
        },
        footer: {
          navAria: 'Footer navigation',
          promo: 'Promo Film',
          showcase: 'Catalogue',
          install: 'Install',
          design: 'Design Docs',
          compat: 'Compatibility',
          disclaimer: 'Unofficial fan theme. Splatoon and Splatoon 2 are trademarks of Nintendo.',
          legalHtml:
            'Code: MIT · 2026 Shirolin and contributors · <a href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/THIRD_PARTY_NOTICES.md">Asset sources &amp; notices</a>',
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
        title: 'SPLAT-STREET · 『スプラトゥーン2』風 DSH テーマ',
        description:
          'SPLAT-STREET は『スプラトゥーン2』にインスパイアされた DeepSeek Harness テーマです。公式グリーン・クリーム・マゼンタの3色ストライプ、インク飛沫、広場イラストと昼夜ステージを備えています。',
        nav: {
          skip: '本文へスキップ',
          homeAria: 'SPLAT-STREET ホーム',
          aria: 'メインナビゲーション',
          promo: 'プロモ映像',
          showcaseLive: '実機コンポーネント',
          catalogue: 'UI 図鑑',
          install: 'インストール',
          faq: 'FAQ',
        },
        hero: {
          eyebrowHtml: 'DEEPSEEK HARNESS テーマプラグイン · <span>公式グリーン #1EDC00</span>',
          headingHtml: '<span class="hero__name">SPLAT-STREET</span>ワークスペースを塗りつくせ。',
          lead: '『スプラトゥーン2』風の DeepSeek Harness テーマ：公式グリーン・クリーム・マゼンタの3色キャンバス、昼夜ステージ、3種のメイングリーン、連続濃度調整を備え、標準操作はそのままです。',
          installCta: 'テーマを導入',
          promoCta: '30秒プロモを見る',
          dayBadge: 'DAY TURF · ナワバリ',
          dayAlt: 'SPLAT-STREET ライトワークスペース：黒寄りサイドバー、3色ストライプキャンバス、広場イラスト、白い Composer カード。',
          nightBadge: 'NIGHT SHIFT · フェス',
          nightAlt: 'SPLAT-STREET ミッドナイトフェス夜間ワークスペース：チャコール広場、マゼンタ飛沫、高コントラストの公式グリーン。',
        },
        promo: {
          heading: '30秒で巡る、昼と夜のナワバリ。',
          lead: '実機キャプチャと『スプラトゥーン2』風サウンドで、3色ストライプ・スラッシュコマンド・インク濃度調整・ミッドナイトフェスを一気に体験できます。',
          videoAria: 'SPLAT-STREET テーマ 30秒横版プロモーション動画（昼夜ステージ、コマンド、濃度スライダー、モバイル表示）',
          verticalLink: '縦版（3:4）と9カット絵コンテ →',
          landscapeLink: '横版絵コンテ解説 →',
          catalogueLink: '18種の実機コンポーネント図鑑 →',
        },
        showcase: {
          fixtureTabsAria: '実機 DSH コンポーネントフィクスチャ',
          tabWorkspace: 'ワークスペース',
          tabAppearance: '外観設定',
          tabDiff: 'Diff ビュー',
          tabBoot: '起動ゲージ',
          openFixture: '単体で開く ↗',
          iframeTitle: '実機 DSH DOM と公式 CSS で描画したライブプレビュー',
          fixtureSourceLabel: '実機 DSH CSS レンダリング',
          heading: '本物のコンポーネントで、インクをリアルタイム調整。',
          desc: '左側には実機 DSH DOM と公式 CSS から生成したフィクスチャを直接埋め込んでいます。昼夜・インク濃度・3種のメイングリーンを切り替えると即座に反映されます。',
          modeAria: '昼夜ステージ切替',
          modeLight: 'ライト',
          modeDark: 'ダーク',
          densityLabel: 'キャンバスインク濃度',
          densityPresetsAria: 'キャンバス濃度プリセット',
          presetPaper: 'ペーパー 20%',
          presetBalanced: 'バランス 50%',
          presetTurf: 'ナワバリ 100%',
          greenLabel: 'メインインク色',
          greenAria: 'メインインク色プリセット',
          greenOfficial: '公式グリーン',
          greenNeon: 'ネオン',
          greenLime: 'ライム',
          cta: '全18種の実機 DSH コンポーネント図鑑を見る →',
        },
        features: {
          aria: 'テーマ機能',
          f1Title: '昼夜2つのステージ、3種のメインインク色。',
          f1Desc: '標準の公式グリーン #1EDC00 からネオン・ライムへワンクリック切替。ダークモードは単なる反転ではなくチャコール基調のネオン広場です。',
          f2Title: 'ペーパーからナワバリまで自在なインク濃度。',
          f2Desc: '3段階プリセット（ペーパー 20% / バランス 50% / ナワバリ 100%）と 0%–100% スライダーで、鮮やかな塗りと長文の読みやすさを両立。',
          f3Title: '装飾・ハーフトーン・Diff 配色を個別切替。',
          f3Desc: '広場イラストやハーフトーン模様のオン／オフ、ネオン強調と DSH 標準赤緑 Diff 配色の切り替えに対応します。',
          f4Title: '4言語自動追従＆アセット内蔵でオフライン動作。',
          f4Desc: '外観設定や起動テキストが宿主の言語設定（日中英韓）に追従。Nunito フォントや SVG/PNG 素材もバンドルに内包済みです。',
        },
        steps: {
          heading: '4ステップでステージへ。',
          lead: '導入・有効化・調整・開戦。公開されている ThemeRuntime Token と 4 つのブランド Slot のみを使って配色と外観を整えます。',
          s1Word: '導入',
          s1CardTitle: 'DSH CLI / npm',
          s1Meta: 'または DSH プロファイルで pnpm add',
          s1Clause: 'プロファイルへプラグインを追加。',
          s2Word: '有効化',
          s2CardTitle: 'SPLAT-STREET 外観',
          s2Row1: 'ペーパー',
          s2Row2: 'バランス',
          s2Row3: 'ナワバリ',
          s2Clause: 'DSH 再起動でスキンが適用。',
          s3Word: '調整',
          s3CardTitle: '設定 → 組み込みプラグイン',
          s3Row1: 'メインインク色',
          s3Val1: '公式グリーン',
          s3Row2: 'インク装飾',
          s3Val2: '表示',
          s3Row3: 'ハーフトーン',
          s3Val3: 'オン',
          s3Row4: 'Diff 配色',
          s3Val4: 'ネオン',
          s3Clause: '色・濃度・表示項目をお好みに調整。',
          s4Word: '塗りつくす',
          s4CardTitle: '新規セッション',
          s4Line: 'ひらめきで、フィールドを塗りつくそう。',
          s4Meta: 'Enter で送信 · Shift + Enter で改行',
          s4Clause: 'ワークスペースに戻って作業開始。',
        },
        install: {
          heading: 'コマンドひとつで導入完了。',
          descHtml:
            'ターミナルで <code>dsh plugin add dsh-theme-splat-ui</code> を実行するか、DSH プロファイルディレクトリで npm からインストールしてください。オフライン用 <code>.tgz</code> は <a href="https://github.com/Shirolin/dsh-theme-splat-ui/releases">GitHub Releases</a> から取得できます。導入後は DSH（デスクトップ版含む）を再起動してください。',
          shotAlt: 'SPLAT-STREET 起動画面：3色キャンバス上のステッカーカード、イカスタンプ、24分割スペシャルウェポンゲージ。',
          cmdLabel: 'DSH プロファイルディレクトリで実行',
          cmdDir: 'cd <DSH_Profile_ディレクトリ>',
          copyBtn: 'コマンドをコピー',
          copied: 'コピーしました',
          copyFailed: 'コピー失敗・手動で選択してください',
          compatLink: '互換性契約を見る →',
          note1: '1つのプロファイルにつきテーマプラグインは1つだけ有効化することを推奨します。',
          note2Html: '外観設定は端末の <code>localStorage</code> に保存され、Host 設定は変更しません。',
          note3: 'テーマを無効化・アンインストールすると DSH 標準の外観へきれいに復元されます。',
        },
        faq: {
          heading: 'よくある質問。',
          lead: '権利表記・互換性・復元方法について。',
          q1Summary: 'これは公式テーマですか？',
          q1Html:
            'いいえ。SPLAT-STREET は非公式ファンテーマであり、任天堂株式会社および DeepSeek 公式とは関係ありません。オリジナルベクター素材・参照ベースの広場イラスト・SVG 装飾の出典は <a href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/THIRD_PARTY_NOTICES.md">THIRD_PARTY_NOTICES.md</a> をご覧ください。',
          q2Summary: '標準のレイアウトやショートカットは変わりますか？',
          q2Answer:
            '変わりません。公開の ThemeRuntime Token と 4 つのブランド Slot のみを上書きするため、サイドバーや入力操作、キーバインドはすべて標準のまま維持されます。',
          q3Summary: '対応しているプラットフォームは？',
          q3Html:
            '実機 DSH Web のライト／ダーク／390px モバイル表示の全面検証と、Windows デスクトップ版のタイトルバー・サイドバー検証を完了しています。詳細は <a href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/docs/acceptance.md">検証記録</a> をご覧ください。',
          q4Summary: '元の外観に戻すにはどうすればいいですか？',
          q4Answer:
            'プラグイン管理からテーマを無効化するかパッケージを削除して再起動してください。導入時にスナップショットしたルート属性が復元され、設定の残骸は残りません。',
          q5Summary: 'プレビューと実機表示は一致していますか？',
          q5Html:
            'このページのスクリーンショット・上の実機フィクスチャ・<a href="showcase/">18種のコンポーネント図鑑</a>はすべて実際のビルドと実機 DSH CSS で描画されています。会話画面の実機検証記録は <a href="https://github.com/Shirolin/dsh-theme-splat-ui#readme">README</a> をご覧ください。',
          q6Summary: 'ダークモードや濃い塗りが眩しい場合は？',
          q6Answer:
            'キャンバス濃度を「ペーパー 20%」や「バランス 50%」へ下げるか、設定で広場装飾・ハーフトーンをオフにできます。ダークモード自体は落ち着いたチャコール背景で、ネオンは主要ボタンとフォーカスのみに抑えています。',
        },
        cta: {
          note: 'コマンドひとつ、再起動で即適用。',
          word: '塗りつくす',
        },
        footer: {
          navAria: 'フッターナビゲーション',
          promo: 'プロモ映像',
          showcase: 'UI 図鑑',
          install: 'インストール',
          design: '設計仕様',
          compat: '互換性',
          disclaimer: '非公式ファンテーマです。Splatoon および Splatoon 2 は任天堂の商標です。',
          legalHtml:
            'コード：MIT · 2026 Shirolin and contributors · <a href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/THIRD_PARTY_NOTICES.md">素材出典＆サードパーティ表記</a>',
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
        presetPaper: 'ペーパー',
        presetBalanced: 'バランス',
        presetTurf: 'ナワバリ',
        greenGroupTitle: '全体のメインインク色を切替（公式グリーン / ネオン / ライム）',
        greenLabel: 'メインインク色',
        greenPresetsAria: 'メインインク色プリセット',
        greenOfficial: '公式グリーン',
        greenNeon: 'ネオン',
        greenLime: 'ライム',
        decorTitle: 'ワークスペースと紙面端のインク滴・飛沫装飾を切り替え',
        decorLabel: 'インク装飾',
        grainTitle: '紙面と入力カードのハーフトーン模様を切り替え',
        grainLabel: 'ハーフトーン',
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
        clearSearch: 'フィルターをリセット',
        footerDefault: '実機 DSH ランタイム CSS とテーマビルド成果物で描画。',
        footerHome: 'テーマトップ',
        footerPromo: 'プロモ映像',
        footerRepo: 'GitHub',
        statusFiltered: '絞り込み結果：{visible} / {total} コンポーネント（{mode}モード）',
        statusAll: '全 {total} 組の実機 DSH コンポーネント · 現在 {mode}モード',
        modeWordLight: 'ライト',
        modeWordDark: 'ダーク',
        groupCount: '{count} 件',
        openRaw: '別タブで開く ↗',
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
          'appearance-panel': 'SPLAT-STREET 外観 · 設定タブパネル',
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
        heading: 'ワークスペースを、ホームステージに塗ろう。',
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
          { alt: 'SPLAT-STREET 開幕！', captionHtml: '01 · 0–2.4s<br>SPLAT-STREET 開幕！' },
          { alt: '3色ストリート、開幕からフルペイント。', captionHtml: '02 · 2.4–5.95s<br>3色ストリート、開幕からフルペイント。' },
          { alt: 'コマンド装填、連射も快適。', captionHtml: '03 · 5.95–9.18s<br>コマンド装填、連射も快適。' },
          { alt: 'ナワバリ全開も目に優しいペーパーも自在に。', captionHtml: '04 · 9.18–12.9s<br>ナワバリ全開も目に優しいペーパーも自在に。' },
          { alt: 'フェスの夜が来る！', captionHtml: '05 · 12.9–14.45s<br>フェスの夜が来る！' },
          { alt: 'ミッドナイトフェス、ネオン全開。', captionHtml: '06 · 14.45–17.75s<br>ミッドナイトフェス、ネオン全開。' },
          { alt: '乱戦でもコードの視界はクリア。', captionHtml: '07 · 17.75–22.45s<br>乱戦でもコードの視界はクリア。' },
          { alt: '390px の狭窓でもスイスイ潜伏。', captionHtml: '08 · 22.45–25.48s<br>390px の狭窓でもスイスイ潜伏。' },
          { alt: 'SPLAT-STREET · 昼夜バトル結果発表', captionHtml: '09 · 25.48–30s<br>SPLAT-STREET · 昼夜バトル結果発表' },
        ],
      },
      promoLandscape: {
        title: 'SPLAT-STREET · 横版プロモ＆絵コンテ（16:9）',
        navAria: 'ページナビゲーション',
        navHome: 'トップ',
        navVertical: '縦版 3:4',
        navLandscape: '横版 16:9',
        navShowcase: '図鑑',
        heading: 'ナワバリバトル開始！作業場をハイカラスクエア色に染めよう。',
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
          { alt: 'SPLAT-STREET 開幕！', label: '1.10s · 01 SPLAT-STREET 開幕！' },
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
        title: 'SPLAT-STREET · 스플래툰 2 감성의 DSH 테마',
        description:
          'SPLAT-STREET는 스플래툰 2 감성의 DeepSeek Harness 테마입니다. 오피셜 그린·크림·마젠타 3색 스트라이프 캔버스, 잉크 스플래시, 광장 일러스트, 주야간 스테이지를 제공합니다.',
        nav: {
          skip: '본문으로 건너뛰기',
          homeAria: 'SPLAT-STREET 홈',
          aria: '기본 내비게이션',
          promo: '프로모 영상',
          showcaseLive: '실제 컴포넌트',
          catalogue: '도감',
          install: '설치',
          faq: 'FAQ',
        },
        hero: {
          eyebrowHtml: 'DEEPSEEK HARNESS 테마 플러그인 · <span>오피셜 그린 #1EDC00</span>',
          headingHtml: '<span class="hero__name">SPLAT-STREET</span>워크스페이스를 물들이다.',
          lead: '스플래툰 2 감성의 DeepSeek Harness 테마: 오피셜 그린·크림·마젠타 3색 캔버스, 주야간 스테이지, 3가지 메인 잉크 컬러와 연속 농도 조절을 네이티브 동작 변경 없이 제공합니다.',
          installCta: '테마 설치',
          promoCta: '30초 프로모 보기',
          dayBadge: 'DAY TURF · 영역 배틀',
          dayAlt: 'SPLAT-STREET 주간 워크스페이스: 짙은 블랙 사이드바, 3색 스트라이프 캔버스, 광장 일러스트, 흰색 Composer 카드.',
          nightBadge: 'NIGHT SHIFT · 페스티벌',
          nightAlt: 'SPLAT-STREET 야간 페스티벌 워크스페이스: 차콜 광장 캔버스, 마젠타 스플래시, 고대비 오피셜 그린.',
        },
        promo: {
          heading: '30초 만에 둘러보는 주야간 스테이지.',
          lead: '실제 호스트 캡처와 스플래툰 2 감성 사운드트랙으로 3색 스트라이프, 슬래시 명령어, 잉크 농도 조절, 미드나잇 페스티벌을 한눈에 만나보세요.',
          videoAria: 'SPLAT-STREET 테마 30초 가로형 프로모션 영상(주야간 스테이지, 명령어, 농도 조절, 모바일 화면 수록)',
          verticalLink: '세로(3:4) 영상 및 9컷 스토리보드 →',
          landscapeLink: '가로 스토리보드 분석 →',
          catalogueLink: '18종 라이브 컴포넌트 도감 →',
        },
        showcase: {
          fixtureTabsAria: '실제 DSH 컴포넌트 픽스처',
          tabWorkspace: '워크스페이스',
          tabAppearance: '외관 설정',
          tabDiff: 'Diff 뷰',
          tabBoot: '스페셜 부팅',
          openFixture: '단독으로 열기 ↗',
          iframeTitle: '실제 DSH DOM과 공식 CSS로 렌더링한 라이브 미리보기',
          fixtureSourceLabel: '실제 DSH CSS 렌더링',
          heading: '실제 컴포넌트로 잉크를 실시간 조절하세요.',
          desc: '왼쪽에는 실제 DSH DOM과 공식 CSS로 생성한 픽스처가 직접 삽입되어 있습니다. 주야간 모드, 캔버스 농도, 3종 메인 그린을 바꾸면 실제 컴포넌트 화면에 즉시 반영됩니다.',
          modeAria: '주야간 스테이지 전환',
          modeLight: '주간',
          modeDark: '야간',
          densityLabel: '캔버스 잉크 농도',
          densityPresetsAria: '캔버스 농도 프리셋',
          presetPaper: '페이퍼 20%',
          presetBalanced: '밸런스 50%',
          presetTurf: '터프 100%',
          greenLabel: '메인 잉크 컬러',
          greenAria: '메인 잉크 컬러 프리셋',
          greenOfficial: '오피셜 그린',
          greenNeon: '네온',
          greenLime: '라임',
          cta: '전체 18종 실제 DSH 컴포넌트 도감 보기 →',
        },
        features: {
          aria: '테마 기능',
          f1Title: '주야간 두 개의 스테이지, 세 가지 메인 그린.',
          f1Desc: '기본 오피셜 그린 #1EDC00에서 네온과 라임으로 원클릭 전환. 야간에는 단순 반전이 아닌 차콜 네온 광장으로 바뀝니다.',
          f2Title: '페이퍼부터 터프까지 자유로운 잉크 농도.',
          f2Desc: '3단계 프리셋(페이퍼 20% / 밸런스 50% / 터프 100%)과 0%–100% 슬라이더로 선명한 색감과 장문 가독성을 모두 잡았습니다.',
          f3Title: '장식·하프톤·Diff 구문을 원하는 대로 전환.',
          f3Desc: '광장 일러스트와 하프톤 질감을 개별적으로 켜고 끌 수 있으며, 네온 구문과 DSH 기본 적/녹 Diff 색상 전환을 지원합니다.',
          f4Title: '4개 언어 자동 대응 & 오프라인 에셋 내장.',
          f4Desc: '외관 설정과 부팅 문구가 호스트 언어(한/중/일/영)를 자동 추적하며, Nunito 폰트와 SVG/PNG 에셋이 번들에 내장되어 오프라인에서도 동작합니다.',
        },
        steps: {
          heading: '네 단계로 스테이지 입장.',
          lead: '설치, 활성화, 조정, 색칠 시작. 공개된 ThemeRuntime 토큰과 4개의 브랜드 Slot만으로 색상과 표면을 스타일링합니다.',
          s1Word: '설치',
          s1CardTitle: 'DSH CLI / npm',
          s1Meta: '또는 DSH 프로필에서 pnpm add 실행',
          s1Clause: '프로필에 테마 플러그인을 추가하세요.',
          s2Word: '활성화',
          s2CardTitle: 'SPLAT-STREET 외관',
          s2Row1: '페이퍼',
          s2Row2: '밸런스',
          s2Row3: '터프',
          s2Clause: 'DSH 재시작 후 테마가 적용됩니다.',
          s3Word: '조정',
          s3CardTitle: '설정 → 내장 플러그인',
          s3Row1: '메인 그린',
          s3Val1: '오피셜 그린',
          s3Row2: '잉크 장식',
          s3Val2: '켜짐',
          s3Row3: '하프톤 질감',
          s3Val3: '켜짐',
          s3Row4: 'Diff 구문',
          s3Val4: '네온',
          s3Clause: '잉크 색상, 농도, 토글을 취향대로 선택하세요.',
          s4Word: '칠하자',
          s4CardTitle: '새 세션',
          s4Line: '영감으로 스테이지를 가득 채우세요.',
          s4Meta: 'Enter 전송 · Shift + Enter 줄바꿈',
          s4Clause: '워크스페이스로 돌아와 바로 시작하세요.',
        },
        install: {
          heading: '명령어 한 줄로 설치하고 바로 시작.',
          descHtml:
            '터미널에서 <code>dsh plugin add dsh-theme-splat-ui</code>를 실행하거나 DSH 프로필 디렉터리에서 npm으로 설치하세요. 오프라인 <code>.tgz</code> 패키지는 <a href="https://github.com/Shirolin/dsh-theme-splat-ui/releases">GitHub Releases</a>에서 받을 수 있으며 설치 후 DSH(데스크톱 포함)를 완전히 재시작하세요.',
          shotAlt: 'SPLAT-STREET 부팅 화면: 3색 캔버스 위 스티커 카드, 오징어 인장, 24칸 스페셜 웨폰 게이지.',
          cmdLabel: 'DSH 프로필 디렉터리에서 실행',
          cmdDir: 'cd <DSH_Profile_디렉터리>',
          copyBtn: '명령어 복사',
          copied: '복사됨',
          copyFailed: '복사 실패, 직접 선택하세요',
          compatLink: '호환성 계약 보기 →',
          note1: '프로필당 하나의 테마 플러그인만 활성화하는 것을 권장합니다.',
          note2Html: '외관 설정은 로컬 <code>localStorage</code>에 저장되며 Host 설정을 변경하지 않습니다.',
          note3: '테마를 끄거나 삭제하면 DSH 기본 외관으로 깔끔하게 복구됩니다.',
        },
        faq: {
          heading: '자주 묻는 질문.',
          lead: '출처, 호환성 및 복원 방법 안내.',
          q1Summary: '공식 테마인가요?',
          q1Html:
            '아니요. SPLAT-STREET는 비공식 팬 테마이며 Nintendo 및 DeepSeek 공식과 무관합니다. 오리지널 벡터 오징어/문어 스티커, 레퍼런스 기반 광장 일러스트, SVG 장식의 출처는 <a href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/THIRD_PARTY_NOTICES.md">THIRD_PARTY_NOTICES.md</a>를 확인하세요.',
          q2Summary: 'DSH 기본 레이아웃이나 단축키가 바뀌나요?',
          q2Answer:
            '아니요. 공개된 ThemeRuntime 토큰과 4개의 브랜드 Slot만 재정의하므로 사이드바 탐색, 입력 동작, 단축키는 모두 기본 상태 그대로 작동하며 시임이 없어도 안전하게 폴백됩니다.',
          q3Summary: '어떤 플랫폼을 지원하나요?',
          q3Html:
            '실제 DSH Web 주간/야간 및 390px 모바일 뷰포트 전체 검증과 Windows 데스크톱 타이틀바·사이드바 실기 검증을 완료했습니다. 자세한 내용은 <a href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/docs/acceptance.md">검증 기록</a>을 참고하세요.',
          q4Summary: '원래 외관으로 되돌리려면 어떻게 하나요?',
          q4Answer: '플러그인 관리에서 테마를 비활성화하거나 패키지를 제거한 뒤 재시작하면 설치 시 백업된 루트 속성이 흔적 없이 복원됩니다.',
          q5Summary: '스크린샷과 실제 화면이 동일한가요?',
          q5Html:
            '이 페이지의 스크린샷, 위의 실시간 컴포넌트 뷰어, 그리고 <a href="showcase/">18종 컴포넌트 도감</a>은 모두 현재 빌드와 실제 DSH CSS로 렌더링되었습니다. 장문 대화 실기 캡처는 <a href="https://github.com/Shirolin/dsh-theme-splat-ui#readme">README</a>에서 볼 수 있습니다.',
          q6Summary: '야간 모드나 배경 농도가 너무 강하면 어떻게 하나요?',
          q6Answer:
            '외관 설정에서 캔버스 농도를 페이퍼 20%나 밸런스 50%로 낮추거나 광장 장식·하프톤 질감을 끌 수 있습니다. 야간 모드는 차콜 배경을 기본으로 하고 네온 그린은 주요 버튼과 포커스 링에만 사용합니다.',
        },
        cta: {
          note: '한 줄 명령어, 재시작 즉시 적용.',
          word: '칠하자',
        },
        footer: {
          navAria: '푸터 내비게이션',
          promo: '프로모 영상',
          showcase: '도감',
          install: '설치 안내',
          design: '디자인 문서',
          compat: '호환성',
          disclaimer: '비공식 팬 테마입니다. Splatoon 및 Splatoon 2는 Nintendo의 상표입니다.',
          legalHtml:
            '코드 라이선스: MIT · 2026 Shirolin and contributors · <a href="https://github.com/Shirolin/dsh-theme-splat-ui/blob/main/THIRD_PARTY_NOTICES.md">에셋 출처 및 서드파티 고지</a>',
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
        grainTitle: '종이 표면과 입력 카드의 하프톤 질감 전환',
        grainLabel: '하프톤 질감',
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
        openRaw: '새 탭으로 열기 ↗',
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
          { alt: 'SPLAT-STREET 개막!', captionHtml: '01 · 0–2.4s<br>SPLAT-STREET 개막!' },
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
        heading: '배틀 개시! 작업 공간을 하이칼라 스퀘어로 물들이세요.',
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
          { alt: 'SPLAT-STREET 개막!', label: '1.10s · 01 SPLAT-STREET 개막!' },
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
