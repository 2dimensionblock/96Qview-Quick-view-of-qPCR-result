# Changelog

## 1.1.1 — 2026-10-13

- Explain when the selected reference wells are excluded by an instrument's negative-control label.
- Allow an explicit, reversible reference interpretation without modifying the workbook; retain explicit NTC exclusions and annotate affected exports.
- Recognize English `Negative` control labels and add instrument-format XLSX regression coverage.
- Refresh Chinese/English documentation and GitHub update instructions; add a source-only packaging script and source artifacts to the Windows workflow.

## 1.1.0 — 2026-10-13

- Renamed the application to 96Qview and added the 2dimensionblock author/release links.
- Added two-part/three-part sample naming, whole-table numeric-dimension inference, and 34 case-insensitive reference genes.
- Added the 96-well editor with reciprocal row/column naming, per-well overrides, and analysis on confirmation.
- Added grouped bars and bar/line overlays with SD/SEM error bars in SVG/PNG exports.
- Preserved Ct calculations; added regression tests and maintainable source modules for the new features.

## Repository preparation — 2026-10-01

- Added Chinese and English project documentation, calculation and input-format guidance.
- Added MIT license for original project material and supplementary third-party notices.
- Added synthetic 96-well CSV and expected biological summary values.
- Added pinned desktop build dependencies, build verification, CI and Windows smoke-test configuration.
- Added contribution guidance and Issue/PR templates.
- Preserved the existing application HTML and desktop launcher; no calculation or interface behavior changes.

## 1.0.0 — 2026-09-30

- Windows x64 portable package of the self-contained qPCR application.
- Local import, ΔCt/ΔΔCt analysis and mean-expression plots with error bars.
- Blank results before explicit analysis, synthetic example and Steven Liu attribution.
