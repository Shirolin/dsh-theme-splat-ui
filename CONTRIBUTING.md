# 贡献指南

## 验证方式

安装环境和脚本入口以 `package.json` 为准。提交前运行：

```sh
pnpm install --frozen-lockfile
pnpm run check
pnpm run format:check
pnpm run lint
```

涉及样式与交互时，再用真实 DSH 运行时验证：

```sh
pnpm run check:fixtures -- --expect-dsh 0.2.2-rc.1
pnpm run check:visual
pnpm run showcase
pnpm run audit
```

夹具由 `test/fixtures/<name>/body.html` 与 `fixture.json` 组成。它使用安装版本的 DSH CSS，在 Chromium 中检查计算样式、位置、对比度并截图。可用 `--dsh <app_dir>` 指定 Web 运行时，或用 `--desktop` / `--asar <app.asar>` 提取桌面运行时；用 `CHROME_PATH` 指定浏览器。

`artifacts/smoke/` 保存截图和逐项断言，`artifacts/audit/` 是覆盖率诊断报告。审计发现的是后续排查线索，不是发布失败门禁。夹具或 DSH 版本变化后重生成并提交 `site/showcase/generated/`，让 CI 无须安装桌面客户端也能检查静态站点。

新增宿主选择器前，在 `scripts/seam-contract.mjs` 登记源码证据和探针决策。升级 DSH 时先区分宿主接缝变化、夹具过期与主题回归；处理方式见 [兼容性说明](docs/compatibility.md)。真实宿主完整验收及其边界见 [验收记录](docs/acceptance.md)。

`pnpm run demo` 是设计演示，输出至 `artifacts/demo/`。README 和站点的交付截图来自真实宿主，更新时保留这一区别。

## 发布

1. 在 `CHANGELOG.md` 保留「未发布」段落，并为目标版本建立变更段落。
2. 运行 `pnpm run release <version>`，生成并逐文件核对 `artifacts/release-v<version>/`。该命令只更新本地版本与产物。
3. 重新运行常规门禁和真实宿主验收。用 `pnpm run install:local -- --dry-run` 预览安装；正式安装默认处理 Web、Desktop 两个 profile，可用 `--only web` 限定范围，用 `DSH_HOME` 指定隔离配置目录。
4. 用打包时同一个 `SOURCE_DATE_EPOCH` 更新验收证据后重新打包，确认最终包逐文件匹配当前仓库，再安装一次并核对 bundle 指纹。构建标记包含时间，固定该环境变量可避免仅因重打包使已验收的 bundle 发生变化。
5. 确认素材权利、版本号及 npm 发布配置后，由维护者授权提交、推送与打 tag。标签 `v<version>` 会触发 `release.yml`；当前暂缓 npm 发布，因此本地验收结束后保持无标签状态。

发布工作流再次运行门禁、打包，并核对版本、CHANGELOG、`files` 白名单及文件字节，然后发布 npm 和 GitHub Release。仅 CI 生成随正式产物分发的 `SHA256SUMS`；本地产物不登记 tgz 校验和，因为跨平台压缩字节可能不同。

远程仓库、常规 CI 与 Pages 展示站工作流均已就绪；公开 npm 发布与打 tag 触发的 GitHub Release 暂缓（待配置 npm 发布凭证后执行）。Pages 站点的对外访问应在工作流部署后核对。

## 许可与素材

代码贡献按 [MIT](LICENSE) 授权。新增字体、图片或其他素材时同步更新 [第三方声明](THIRD_PARTY_NOTICES.md)；粉丝主题声明不能替代素材授权。
