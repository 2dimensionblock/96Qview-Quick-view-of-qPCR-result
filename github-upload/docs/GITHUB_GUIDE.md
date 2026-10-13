# 更新 GitHub 仓库与发布 96Qview 1.1.1

目标仓库：[2dimensionblock/qPCR-studio-Quick-view-of-qPCR-result](https://github.com/2dimensionblock/qPCR-studio-Quick-view-of-qPCR-result)。应用名称为 **96Qview**，无需重命名现有 GitHub 仓库。

## 1. 源码和发布附件

| 本地内容 | 用途 |
| --- | --- |
| `github-upload/` | 整理好的完整源码，包含隐藏配置文件，可提交到仓库 |
| `96Qview_GitHub_Source_v1.1.1.zip` | 上述源码的压缩包；解压后将内容放到仓库根目录 |
| `release/` | EXE、离线 HTML、模拟 CSV、许可证、发布说明和校验文件，作为 Release 附件 |
| `96Qview_Windows_x64.zip` | 完整使用包，可一并作为 Release 附件 |
| `GITHUB_UPDATE.md` | 本版本上传清单及目录示例 |

主项目目录还包含构建产物、备份和本地文件。用于源码更新时，请选择整理好的 `github-upload/`，保留 `.github`、`.gitignore` 等以点开头的配置文件。

## 2. 更新现有仓库

使用 GitHub Desktop 克隆上述仓库到一个独立的空目录。把 `github-upload/` **里面的内容**复制到克隆目录的根层，检查变更后提交并推送。建议提交说明：`Update 96Qview to v1.1.1`。

也可通过网页上传解压后的源码。仓库根层应直接出现 `README.md`、`package.json`、`app/`、`frontend/` 和 `.github/`。不要在仓库外面再套一层 `96Qview/` 或 `github-upload/`。

如果仓库旧版源码放在 `qpcr-studio/` 子目录，完成根层更新并核对后，可在同一次更新中移除旧的重复子目录。仓库中的旧 EXE、项目 ZIP 和重复 HTML 也应从当前源码目录移除，保留需要的历史 Release。此清理不要求改写 Git 历史。

**`.github/workflows/` 必须位于仓库根层**，否则工作流不会按预期被发现。参见 [GitHub 工作流路径说明](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)。

本地父目录里的既有 `.git` 没有在本次文件迁移中移动或改写。使用独立克隆目录，可先核对每一项变更，再决定提交哪些文件。

## 3. 检查 Actions

- **Project checks**：在 `main` / `master` 推送、Pull Request 或手动运行时，重新生成前端，核对已提交 HTML，检查项目并运行回归测试。
- **Windows portable build**：在 Actions 手动运行，或推送与版本一致的 `v1.1.1` 标签。生成 EXE 后解包校验、验证 Windows 绘图导出，并整理使用包与源码包。
- 下载产物名称：`96Qview-Windows-x64`、`96Qview-GitHub-source`，另有 `windows-smoke-report`。

Actions 配置已在本地检查，但本次没有在远程仓库触发运行。构建需要访问 npm、Electron 及打包工具的下载服务。

## 4. 发布 v1.1.1

前往仓库 [Releases](https://github.com/2dimensionblock/qPCR-studio-Quick-view-of-qPCR-result/releases)，创建新 Release：

- Tag：`v1.1.1`，目标选择包含本版源码的提交。
- Title：`96Qview v1.1.1`。
- Description：复制 [RELEASE_NOTES.md](RELEASE_NOTES.md) 的内容。
- 附件：上传 `release/` 中的文件；可再添加 `96Qview_Windows_x64.zip` 和源码 ZIP。

`release/SHA256SUMS.txt` 校验同目录的 EXE、HTML、说明等文件；`verification.json` 记录该 EXE 的解包校验。重新构建后须使用新生成的校验值，不能复用旧版本摘要。

EXE 约 109 MiB，超过普通 Git 单文件 100 MiB 上限，应通过 Release 分发。来源：[GitHub 大文件说明](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)、[Release 操作说明](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)。

工作流只生成下载产物，不会自动公开发布 Release；本次也没有提交、推送或发布到 GitHub。

## 5. 本地维护

在项目目录使用 Node.js 24 和 npm：

```bash
npm ci
npm run build:frontend
npm run check
npm test
```

Windows 构建与验收：

```bash
npm run dist:win
npm run verify:dist
npm run smoke:windows
npm run release:files
node scripts/prepare-github.mjs
```

源码整理脚本采用明确的文件清单，不包含依赖、EXE、备份、个人实验数据或本地诊断文件；输出 `github-upload/`。需要打包时将该目录的内容压缩为源码 ZIP，保留隐藏配置文件。仓库版本以 `package.json` 和 `package-lock.json` 为准，二者需同步。

## 6. 仓库 About

建议 Description：`Offline qPCR analysis with a 96-well editor, ΔCt/ΔΔCt calculations, and mean ± SD/SEM line, bar and overlay plots.`

建议 Topics：`qpcr`、`bioinformatics`、`data-analysis`、`electron`、`offline`、`scientific-visualization`。
