# 上线前验收记录

2026-11-20，完成最新版本的本地打包与真实宿主复验。npm 发布暂缓（暂不推送 `v*` 标签以免触发 npm 发布工作流）；代码已同步至远程仓库并部署展示站。逐项结果和验证范围以 [acceptance-results.json](acceptance-results.json) 为准。

## 构建与宿主

- 真实宿主：DSH `0.2.2-rc.1` Web，独立配置目录与 Chromium profile。
- 安装来源：`pnpm run release 0.1.0` 生成的 tgz，经 `install:local` 安装到隔离 profile；已确认不是源码目录链接。
- 验收前核对安装目录和仓库的 `lib/client.js` 字节，以及页面实际加载的完整 Skin CSS。
- 构建及最终重打包使用同一个 `SOURCE_DATE_EPOCH`。构建标记、bundle 指纹和逐项几何数据见机器结果；指纹指向客户端 bundle，不是 tgz 校验和。最终包会重新安装并核对同一 bundle。
- 会话历史由宿主的 Session、AssistantStreamAccumulator 和当前格式编码器生成，经严格恢复校验，共 32 轮。模型调用、工具结果均为合成历史；本轮没有模型请求或消息发送。

## 真实宿主矩阵

| 范围 | 结果与证据 |
| --- | --- |
| 浅色 / 深色工作台 | 欢迎页招牌为 2，品牌与输入区正常：[浅色](screenshots/workspace-light.png) / [深色](screenshots/workspace-dark.png) |
| 长会话、代码与宽表格 | 正文、Markdown、代码操作栏可读；代码正文与操作栏对比度达到 4.5:1，页面未被宽表格撑宽：[浅色](screenshots/runtime-reading-light.png) / [深色](screenshots/runtime-reading-dark.png) |
| 设置页 | 墨黑导航、纸面表单与墨迹选中正常，键盘焦点环完整内收：[浅色](screenshots/settings-light.png) / [深色](screenshots/settings-dark.png) |
| 墨街外观 | 纸白 20%、均衡 50%、涂地 100% 的按钮与滑杆值一致，恢复默认后复验：[浅色](screenshots/appearance-light.png) / [深色](screenshots/appearance-dark.png) |
| 输入菜单 | 方向键改变选择，Escape 关闭：[浅色](screenshots/input-menu-light.png) / [深色](screenshots/input-menu-dark.png) |
| 附件上传 | 合成文本完成上传并可移除，未发送：[浅色](screenshots/attachment-light.png) / [深色](screenshots/attachment-dark.png) |
| 工具结果 | 轮次、工具分组和工具行可展开，45 行结果的末行可访问：[浅色](screenshots/tool-result-light.png) / [深色](screenshots/tool-result-dark.png) |
| 390px 阅读 | 页面无横向溢出，输入区保留在视口内：[浅色](screenshots/runtime-reading-mobile-light.png) / [深色](screenshots/runtime-reading-mobile-dark.png) |
| 390px 菜单 | 菜单四边位于视口内：[浅色](screenshots/input-menu-mobile-light.png) / [深色](screenshots/input-menu-mobile-dark.png) |
| 390px 设置 | 弹窗未横向溢出：[浅色](screenshots/settings-mobile-light.png) / [深色](screenshots/settings-mobile-dark.png) |
| 停用 / 重启用 | 停用后根属性、自有样式、外观属性和品牌清理；重启用后样式和品牌各一份：[停用](screenshots/plugin-disabled.png) / [恢复](screenshots/plugin-reenabled.png) |

宿主插件开关异步保存期间会禁用。验收脚本等待开关状态提交并恢复可操作后再重启用，避免在资源刚清理时点到禁用按钮。

## 离屏夹具与门禁

离屏夹具使用同版本真实 CSS，覆盖代码作用域、真实工具输入输出卡片、纯文本预览、diff、模型搜索、长技能列表、设置导航、输入壳、启动/失败、toast 等边界。图鉴由同一套夹具重新生成；截图等待有限过渡完成，并保留实际使用的 SVG 图标定义。执行数量见机器结果的 `gates`。

11 月 14 日修正的通用 pre 作用域、原始工具载荷底色、侧栏纯文本前景和深色 toast 对比度问题，本轮通过同一套夹具复验。

真实工具结果保留已知回归的对照，并再次检查对比度和末行可访问性：[历史回归](screenshots/regression-tool-before.png) / [当前结果](screenshots/tool-result-light.png)。

常规门禁的执行方法见 [CONTRIBUTING.md](../CONTRIBUTING.md)，本轮通过结果见机器记录。新增一条安装复制回归测试：点击按钮后，剪贴板内容必须等于页面显示的本地 tgz 安装命令。展示站在 1440px 和 390px 下另行验证资源加载、横向溢出与复制反馈，并检查图鉴的日夜切换、筛选和外观桥接。Lint 命令通过，保留既有选择器顺序警告；覆盖审计用于定位后续排查线索。

## 验收边界与上线条件

- 静态 API 门禁针对锁定的 UI 开发依赖；桌面分发的运行时不附完整类型声明，因此没有将它冒充为完整的新版 ABI 门禁。
- 首版验证范围为 Web。隔离 Web、Desktop profile 都已验证包安装；Windows 原生标题栏、菜单及独立用量 WebView 尚未做桌面 GUI 验收，因此不将安装成功当作桌面界面通过。
- 未验证真实模型流式输出、实际工具执行、附件发送后的模型处理、登录账户和计费接口。
- 覆盖率审计仍列出未覆写语义 Token 与未进夹具的组件；具体清单由 `pnpm run audit` 生成，优先补模型设置、插件库存与附件等表面。
- 远程仓库和常规 GitHub 检查已建立，本轮提交推送后的远程 CI 与 Pages 部署状态以实际工作流运行为准。npm 发布身份和正式 npm 安装尚待后续启用 npm 发布后验证。
- 旧官方光栅占位图已移除。广场底图原始游戏参考截图 `inkopolis-square-reference.png` 已从仓库移除，`src/client/assets/inkopolis-square.png` 已压为 16 色索引透明 PNG；其原始参考来源未记录且涉及原作广场剪影，已按非商用粉丝二创在 [第三方声明](../THIRD_PARTY_NOTICES.md) 中明确排除于 MIT 授权之外。

当前交付为经过本地验证的候选包。素材确认和正式发布配置完成后，再由维护者授权提交、推送与发布；本地准备不会自动触发公开上线。
