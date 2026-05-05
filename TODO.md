# Backlog

## v0.7.1 — fixes (current, ready to release)

- [x] Grist widget : clicking on a feature opens panel with only '_gristRowId' — all attributes now displayed
- [x] Grist widget : share link used getgrist.com instead of configured grist_api_base
- [x] Grist widget : Deselect button removed — redundant with click-to-deselect
- [x] Grist widget : Save button renamed Appliquer/Apply — clarifies two-step save flow
- [x] Grist widget : configuration panel dark mode — CSS variables + grist.onThemeChange
- [x] Grist widget : geometry mode labels include concrete format examples
- [x] Grist widget : features missing on share link — grist adapter was absent from customConfig.adapters
- [x] Grist widget : no GUI hint when adapter missing — active adapters now shown in version footer
- [x] Grist widget : console errors on share link — root cause was missing grist adapter
- [x] Grist widget : style row inputs unlabelled — "opacité" / "épais." labels added, i18n 4 languages
- [x] Grist widget : help panel Partage section rewritten — accurate, no stale title mention
- [x] All modes : query results invisible in dark mode — Bootstrap table color overrides under [data-theme="dark"]
- [x] All modes : opacity slider shown even without WMS layer — hidden when layersQueryable is empty

## v0.7.2 — improvements (pending)

- [ ] All modes : Info panel — GeoJSON source data + feature count (layer-panel template extended; adapter.label(url) pattern)
- [ ] All modes : Info panel title — word-break on long filenames
- [ ] Grist widget : geometry edit support (draft)
- [ ] Publish demo site with usecases

## v0.8 — security & connectors

- [ ] Grist connector : vendor grist-plugin-api.js into static/lib/grist/ — remove CDN dependency, update CSP (script-src 'self' only for connectors)
- [ ] All modes : review hardConfig defaults for generic out-of-box usage — no deployer customConfig required for basic operation

## v0.8 — connectors & testing

- [ ] Test c= parameter (sviewer configuration profile)
- [ ] Grist widget : real-world user testing
- [ ] CSV connector : real-world user testing

## Backlog — layer controls (future, P3)

- [ ] Deployer-configurable UI controls injecting WMS vendor params (SLD, TIME, elevation) into active layer + permalink

Design notes:
- `customConfig.layerControls[]` — array of `{param, label, type:'range'|'select', min, max, step, values[], default}`
- sViewer renders controls UI, injects params into `TileWMS` source, forces tile refresh
- Control values in permalink URL — share = reproducible view
- `SViewer.onLayerReady(fn)` + `SViewer.setLayerParam(key, val)` hooks needed
- WMS only (SLD params are server-side rendering)
- [ ] Design `layerControls[]` schema in customConfig
- [ ] Implement `SViewer.onLayerReady` hook
- [ ] Implement `SViewer.setLayerParam` hook + permalink integration
- [ ] Render controls UI from customConfig declaration
- [ ] Demo with GeoServer SLD param layer
