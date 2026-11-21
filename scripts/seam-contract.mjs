// Reviewed SPLAT-STREET seams. Required markers probe the locked UI packages.
// Optional desktop/newer-client seams degrade by selector mismatch.
export const PLUGIN_ROOT_ATTRIBUTE = 'dsh-splat-ui-skin'
export const PLUGIN_OWNED_DATA_ATTRIBUTES = ['splat-appearance', 'splat-diff-syntax', 'splat-decor', 'splat-grain', 'splat-font', 'splat-green', 'splat-build']
const source = (shortName, marker, file = 'lib/client.js') => ({
  kind: 'dsh-source',
  package: `@deepseek-ai/dsh-client-ui-${shortName}`,
  file,
  marker,
})
const hooks = [
  ['ds-dark-theme', 'theme', true, '日夜分支'],
  ['composer-card', 'conversation', true, '输入卡片边界'],
  ['conversation-header-corner', 'conversation', true, '会话标题边界'],
  ['trigger-menu', 'input-trigger', false, '输入建议列表'],
  ['overflow-below', 'input-trigger', false, '仅溢出列表渐隐'],
  ['code-block-banner', 'chat', false, '代码语言与操作栏'],
  ['code-block-content', 'chat', false, 'Markdown 代码正文，隔离插件原始载荷'],
  ['turn-trigger', 'chat', false, '触发通知条'],
  ['message-bubble', 'chat', false, '用户消息气泡'],
  ['code-preview', 'sidebar-documentpreview', false, '文档代码预览边界'],
  ['textpreview-plain', 'sidebar-documentpreview', false, '文档纯文本边界'],
  ['review-view', 'deliverables', false, '交付 diff 语法色'],
  ['open-target', 'open-in-app', false, '打开目标组合按钮'],
  ['plugin-item', 'plugin-manager', false, '内置插件行'],
  ['plugin-package', 'plugin-manager', false, '插件包行'],
  ['dsh-boot', 'renderer', false, '启动与失败边界'],
  ['windows-titlebar', 'layout', false, 'Windows 原生边框'],
  ['menu-material', 'theme', false, '菜单外壳和模型选择器'],
  ['shortcut-modal', 'settings-general', false, '设置页与快捷键弹窗'],
  ['window-drag', 'sidebar', false, '窗口拖拽区'],
  ['composer-input', 'conversation', false, '输入编辑器'],
  ['composer-placeholder', 'conversation', false, '输入占位文本'],
  ['input-scroll', 'conversation', false, '输入内容滚动区'],
  ['composer-seat', 'conversation', false, '输入卡片所在布局'],
  ['phase', 'conversation', false, '输入阶段状态'],
  ['agent-preset-id', 'agent-preset', false, 'Agent 预设卡片'],
  ['tone', 'tool', false, '工具结果色调'],
  ['tool', 'tool', false, '原始工具输入输出的语义代码底色'],
  ['trajectory-scroll', 'trajectory', false, '轨迹内容滚动'],
  ['scroll-ready', 'trajectory', false, '轨迹滚动就绪'],
  ['timeline-span', 'trajectory', false, '时间线边界'],
  ['kind', 'trajectory', false, '轨迹条目种类'],
  ['selected', 'trajectory', false, '轨迹条目选中'],
  ['role-kind', 'trajectory', false, '轨迹角色'],
  ['global-panel', 'layout', false, '全局浮层'],
]
export const PUBLIC_DATA_HOOKS = hooks.map(([attribute, shortName, required, purpose]) => {
  const evidence = source(shortName, `data-${attribute}`)
  return { attribute, selector: `[data-${attribute}]`, required, purpose, evidence, probe: evidence }
})
PUBLIC_DATA_HOOKS.push(
  {
    attribute: 'dsh-boot-spinner',
    selector: '[data-dsh-boot-spinner]',
    required: false,
    purpose: '只装饰仍在加载的卡片',
    evidence: { kind: 'fixture', fixture: 'test/fixtures/boot-loading/body.html', note: '加载存在、失败移除。' },
    probe: null,
  },
  {
    attribute: 'windows-menu',
    selector: '[data-windows-menu]',
    required: false,
    purpose: 'Windows 菜单条的透明背景',
    evidence: { kind: 'desktop', note: '桌面壳边界；Web 无该标记，需 Windows 实机复核。' },
    probe: null,
  },
)
export const ALLOWED_DATA_HOOKS = [PLUGIN_ROOT_ATTRIBUTE, ...PLUGIN_OWNED_DATA_ATTRIBUTES, ...PUBLIC_DATA_HOOKS.map(({ attribute }) => attribute)]
export const PUBLIC_ARIA_ROLES = [
  'alert',
  'button',
  'checkbox',
  'dialog',
  'group',
  'heading',
  'listbox',
  'menu',
  'menuitem',
  'menuitemradio',
  'option',
  'radio',
  'search',
  'searchbox',
  'switch',
  'tab',
  'tablist',
  'toolbar',
  'treeitem',
].map((role) => ({ role, purpose: '按标准语义定位控件或其内容边界', evidence: { kind: 'aria-standard' }, probe: null }))
export const REVIEWED_ARIA_ROLES = PUBLIC_ARIA_ROLES.map(({ role }) => role)
export const PUBLIC_ARIA_ATTRIBUTES = [
  'aria-checked',
  'aria-current',
  'aria-disabled',
  'aria-expanded',
  'aria-haspopup',
  'aria-hidden',
  'aria-label',
  'aria-pressed',
  'aria-selected',
].map((attribute) => ({ attribute, selector: `[${attribute}]`, purpose: '控件语义、状态或可访问名称', evidence: { kind: 'aria-standard' }, probe: null }))
export const REVIEWED_ARIA_ATTRIBUTES = PUBLIC_ARIA_ATTRIBUTES.map(({ attribute }) => attribute)
export const PUBLIC_SLOTS = [
  ['sidebarBrandMark', 'sidebar.brand.mark', 'sidebar', 'single', 'root', true],
  ['sidebarBrandName', 'sidebar.brand.name', 'sidebar', 'single', 'root', true],
  ['heroBrandMark', 'conversation.hero.brand.mark', 'conversation', 'single', 'root', true],
  ['appearanceTab', 'settings.plugins.tab', 'settings-plugins', null, null, false],
].map(([key, name, shortName, kind, scope, required]) => {
  const evidence = source(shortName, name, kind === null ? 'lib/client.js' : 'lib/types/client/contract/slots.d.ts')
  return { key, name, kind, scope, required, priority: kind === null ? null : -100, purpose: '品牌或墨街外观的公开 Slot', evidence, probe: evidence }
})
export const PUBLIC_SERVICES = ['theme', 'slots']
export const PROVIDER_ORDER = [
  '@deepseek-ai/dsh-client-ui-theme',
  '@deepseek-ai/dsh-client-ui-renderer',
  '@deepseek-ai/dsh-client-ui-sidebar',
  '@deepseek-ai/dsh-client-ui-conversation',
]
