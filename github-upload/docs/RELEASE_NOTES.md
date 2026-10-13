# 96Qview v1.1.1

发布日期：2026-10-13。离线 qPCR 数据分析与即时绘图工具。

## 本次修复

当选中的内参孔被仪器标为“阴性对照 / Negative”时，程序会在结果上方直接解释排除原因。若这些孔确为内参样本，可点击“将这 … 孔用作内参”，立即重新计算；也可恢复排除。原表保持不变，导出的质控信息保留这次解释调整。明确标注 NTC / 无模板 / 空白对照的孔继续排除。

## 功能

- 导入 XLSX、CSV、TSV。
- 计算 ΔCt、ΔΔCt、2^−ΔCt。
- 支持“基因-时间”和“基因-组别-时间”，按整表命名位置最大值判断数字分组。
- 自动识别 34 种内参，不区分大小写；仅全部基因为“待指定”时弹出命名失败原因。
- 新增 12 × 8 的 96 孔自定义：行列类型自动互换、单孔双击编辑、组别与单位、确认后分析。
- 绘制 2^−ΔCt 均值折线、柱形或叠加图，支持 SD/SEM 误差棒、线性/对数轴。
- 技术孔与生物重复模式；可配置共用内参。
- 导出 CSV、SVG 和 PNG。
- 96 孔独立模拟数据；点击“开始分析”前结果为空。
- 中英文衬线字体界面，Windows x64 单文件免安装程序。
- 应用更名为 96Qview，移除底部署名；新增“关于作者”、2dimensionblock 及发布项目页跳转。

## 使用

Windows 10/11 64 位用户运行 `96Qview_Windows_x64.exe`。也可在浏览器打开 `96Qview.html`。分析无需联网，桌面程序自带运行环境。使用细节见随包附带的 [完整使用说明](96QVIEW_1.1.md)。

## 已知限制

- 当前 EXE 未进行数字签名。
- 不支持旧版 `.xls` 文件。
- 不执行显著性检验，不验证扩增效率或熔解曲线。
- 新功能源码位于 `frontend/`；原版完整 React/TypeScript 工程未恢复。
- 源码回归和 Windows 后台窗口测试已通过，覆盖启动、96 孔布局、作者菜单及 CSV/SVG/PNG 导出。完整范围见项目验证说明。

本 Release 的 EXE 完整性与 SHA-256 校验值见附件 `verification.json` 和 `SHA256SUMS.txt`。

## English

Offline qPCR analysis with XLSX/CSV/TSV import, ΔCt and ΔΔCt calculation, and mean ± SD/SEM plots of 2^−ΔCt. CSV/SVG/PNG export and a fully synthetic 96-well example are included. Windows x64 portable executable; unsigned. The repository contains desktop launcher source and a prebuilt HTML frontend.
