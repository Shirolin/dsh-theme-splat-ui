# DSH 兼容性说明

## 验证基线

构建依赖锁定的客户端 UI 包与实际运行的 DSH 应用有不同版本号。兼容性门禁读取锁定 UI 包的声明与源码；Web 全量验收基线使用 DSH `0.2.2-rc.1`，并补充验证了 DSH `0.2.2-rc.5` Windows 桌面端侧栏结构与原生标题栏兼容性。实际验收范围见 [acceptance.md](acceptance.md)。

`pnpm run check:compat` 检查 ThemeRuntime 的 Token 覆写与 disposer、服务注入顺序、公开 Slot、CSS 消费的 data/ARIA 接缝、Token 是否存在，以及私有导入与 DOM 回退。登记及证据的单一事实源是 [seam-contract.mjs](../scripts/seam-contract.mjs)，具体结果由命令输出。

## 样式边界

主题使用公开 Token、语义属性和自有 Slot 标记，生产选择器不依赖宿主构建哈希类名。品牌、欢迎页和设置页有结构选择器，宿主改动这些结构时需要重验布局。

- Markdown 的深色代码岛只落在 `data-code-block-banner` 和 `data-code-block-content`；插件原始 `pre` 载荷保留宿主文字和排版，其代码底色跟随日夜表面。
- 文档代码预览与纯文本预览保持独立排版；深色侧栏中的纯文本使用可读前景。
- 组合输入框由外壳承担描边与焦点，内部输入不重复套框。
- 设置导航的墨迹是按钮背景，焦点环位于按钮内部，点击区域保持矩形。
- 未匹配的可选接缝自然退回 Token 和宿主样式；必需接缝缺失使兼容性门禁失败。

## 生命周期与 Windows 例外

根标记、外观属性、内嵌样式、Token 覆写和品牌 Slot 随安装建立，随 dispose 恢复。真实宿主停用/重启用检查这些资源是否清理及是否只安装一次。宿主切换开关有异步保存阶段，应等待其状态提交并解除 disabled 后再操作。

Windows 原生标题栏需要同步宿主主题来源。安装器保留一个受限的 `MutationObserver`：仅观察 root 的主题来源和标题栏属性，以及 body 的深色属性；不监听子树或节点插入，dispose 时 disconnect。兼容性门禁检查这一边界。

Web 验收不覆盖原生 Windows 菜单、标题栏和其他独立 WebView；这些需要桌面客户端的补充验收。

## DSH 升级时怎么处理

1. 更新锁定依赖后运行 `pnpm run check:compat`，核对失效的探针及上游声明。
2. 指定新运行时运行 `pnpm run check:fixtures -- --expect-dsh <version>`。夹具使用真实 DSH CSS，DOM 片段保留对应版本结构。
3. 断言失败时先在真实宿主复现：接缝变了则更新契约和夹具；主题规则误伤则先修选择器。保留位置、对比度和焦点完整性等行为要求。
4. 重生成 `pnpm run showcase`，运行 `pnpm run audit`，再更新真实宿主截图与验收记录。

完整命令与发布步骤见 [CONTRIBUTING.md](../CONTRIBUTING.md)。`audit` 是诊断，列出的未覆盖组件不等于已确认缺陷，也不能作为这些界面已经通过的证据。
