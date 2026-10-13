# 96Qview

[中文说明](README.md)

An offline qPCR analysis and plotting application maintained at [2dimensionblock/qPCR-studio-Quick-view-of-qPCR-result](https://github.com/2dimensionblock/qPCR-studio-Quick-view-of-qPCR-result). Import XLSX, CSV or TSV data, calculate ΔCt, ΔΔCt and 2^−ΔCt, and plot arithmetic mean expression with SD or SEM error bars.

## Quick start

Download `96Qview_Windows_x64.exe` from this repository's **Releases** section and run it on Windows 10/11 x64. No separate Python, Node.js or browser installation is required for the executable. Alternatively, download `app/index.html` and open it locally in a modern browser.

Version 1.1 adds two-part/three-part sample naming, 34 case-insensitive reference genes, an editable 96-well plate, grouped bar plots and bar/line overlays. The author menu links to GitHub account **2dimensionblock** and the project page. See the [1.1 guide](docs/96QVIEW_1.1.md).

**Current version: 1.1.1.** If selected reference wells are labeled as negative controls in an instrument export, the app explains their exclusion. Users can explicitly treat those wells as reference samples and undo that choice. Explicit NTC wells remain excluded; the source workbook is unchanged and affected exports record the override.

Import a table, check the column mapping and reference/replicate settings, then click **开始分析** (Start analysis). Loading a file or the synthetic example does not calculate results automatically. New imports clear previous results.

The interface is primarily Chinese. It uses serif fonts and includes a fully synthetic 96-well example. Export formats are CSV, SVG and PNG. Legacy `.xls` files must first be converted to `.xlsx` or CSV.

## Calculation

```text
ΔCt = target Ct − matched reference mean Ct
ΔΔCt = ΔCt − calibrator mean ΔCt
Plot point = arithmetic mean of 2^(−ΔCt)
```

The y-axis is **2^−ΔCt**, not 2^−ΔΔCt. Technical-well and biological-replicate modes have different units of replication. Technical-well error bars treat the reference mean as fixed and do not represent biological variability. Missing Ct values are not replaced with zero. SD and SEM are undefined for fewer than two observations. See [methods](docs/METHODS.md).

## Development

Use Node.js 24. Dependency installation and builds require internet access; the distributed app works offline.

```bash
npm ci
npm run build:frontend
npm run check
npm test
npm start
```

On Windows x64:

```bash
npm run dist:win
npm run verify:dist
npm run smoke:windows
npm run release:files
```

Upload the contents of `release/` as release assets. Keep executables and dependencies out of Git history.

## Source scope

`app/main.cjs` is editable desktop launcher source. Version 1.1 includes maintainable naming, import, plate, chart and style modules in `frontend/`. `npm run build:frontend` combines them with the preserved legacy dependencies and fonts into self-contained `app/index.html`; the Windows build runs this automatically. The original complete React/TypeScript project and source maps are not included.

## Privacy, verification and license

Data are processed locally. Explicitly clicked reference/author links open the system browser. The app contains no automatic update service. Version 1.1.1 passed twelve regression tests, an actual instrument XLSX import, Windows background-window/export checks, and verification of the portable EXE. The executable remains unsigned; cross-version Windows compatibility and destination-repository CI still require separate confirmation. See the [validation scope](docs/VALIDATION.md).

Original project code and documentation use the [MIT License](LICENSE). Third-party libraries and fonts retain their respective licenses; see [notices](THIRD_PARTY_NOTICES.md).
