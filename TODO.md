# TODO

## To fix
- [x] Grist widget : clicking on a features open panel, but only '_gristRowId' is displayed. On standalone version, all attributes are displayed.
- [x] Grist widget : share link open sviewer in standalone mode, but configuration parameter Grist base url is not used : instead getgrist.com
- [x] Grist widget : button "Deselect" removed — redundant with one-way sync; clicking empty space or closing panel clears selection
- [x] Grist widget : clarify save vs Grist bar save — widget button renamed "Appliquer/Apply", help text updated, reminder message clarified
- [x] Grist widget : configuration panel dark mode — CSS variables + grist.onThemeChange; all controls consistent across light/dark/accessibility themes
- [x] Grist widget : geometry options clarified — labels now include concrete format examples (e.g. "Texte \"48.85,2.35\" (lat,lon)", "WKT \"POINT(2.35 48.85)\"")
- [x] Grist widget : after share, features not displayed on map — root cause: grist adapter not listed in customConfig.adapters; fix: add 'grist' to adapters: ['csv','grist']
- [x] Grist widget : no visible error or hint in GUI when grist adapter is missing — fixed: active adapters now shown in sViewer share panel footer
- [x] Grist widget : console errors on share link — root cause was missing grist adapter in customConfig.adapters
- [x] Grist widget : style row labels added — "opacité" / "épais." inline spans before each number input, i18n 4 languages
- [x] Grist widget : help panel — Partage section rewritten: removed Title mention, clarified geOrchestra as integration, noted title handled by sViewer
- [x] All modes : query results dark mode — fixed Bootstrap table color override; --sv-fg text + panel-input-bg surface in dark theme


## Grist widget

- [x] P1 Embed SDK: event bus + SViewer.loadFeatureObjects/onFeatureClick/selectFeature — implemented, tested, documented
- [ ] P1 Test dual-widget setup (two tables, two sViewer widgets) on a clean Grist doc
- [x] P1 Investigate / document the Grist console error "LinkConfig invalid cycle" on setSelectedRows — root cause: Grist rejects setSelectedRows when widget is "Selected by" same table; corrupts onRecord after firing; fix: replaced with setCursorPos({rowId}) — scrolls grid to row, no filter, no cycle
- [ ] P3 File Grist upstream issue: setSelectedRows breaks onRecord when widget is "Selected by" same table; setCursorPos also corrupts grid→map via onRecord feedback loop
- [ ] P2 Investigate map→grid row highlight — setSelectedRows (LinkConfig cycle) and setCursorPos both ruled out; no clean Grist API solution known; track upstream issue
- [ ] P1 Test with real world users for usability
- [ ] P2 draft for geometry edit support in widget
- [ ] P2 GeoJSON : Info panel should display some info about datas : source URL and number of features.

## Connectors

- [x] P2 CSV connector: unit tests for semicolon separator, quoted fields, geom column, empty CSV, _labelcol — all pass (check.html checks 11–13)
- [ ] P2 CSV connector: test with real world users for usability


## Documentation

- [x] P1 Embed SDK documented in TECHNICAL.md (SViewer.loadFeatureObjects, onFeatureClick, onFeatureSelect, selectFeature, bus architecture)
- [ ] P1 TECHNICAL.md: add note — multiple sViewer widgets on same Grist doc supported (one per table, each on its own page)
- [ ] Publish demo site with usecases

## Layer controls (future minor)

- [ ] P1 Test c= parameter (sviewer configuration profile)
- [ ] P3 Deployer-configurable UI controls that inject WMS vendor params (SLD variables, TIME, elevation…) into the active layer and persist values in the permalink.

Design notes:
- `customConfig.layerControls[]` — array of `{param, label, type:'range'|'select', min, max, step, values[], default}`
- sViewer renders controls UI (panel or overlay bar), injects params into `TileWMS` source, forces tile refresh
- Control values reflected in permalink URL as extra `?param=val` params — share = reproducible view
- `?c=mycustomconfig` selects the right customConfig per deployment — keeps URLs short
- `SViewer.onLayerReady(fn)` hook needed — controls appear only after WMS layer is loaded
- `SViewer.setLayerParam(key, val)` hook needed — called by control onChange, triggers source refresh
- WMS only (SLD params are server-side rendering, irrelevant for GeoJSON)
- ~100 lines core (hooks + UI render), zero extra complexity for end user

- [ ] P3 Design `layerControls[]` schema in customConfig
- [ ] P3 Implement `SViewer.onLayerReady` hook
- [ ] P3 Implement `SViewer.setLayerParam` hook + permalink integration
- [ ] P3 Render controls UI from customConfig declaration
- [ ] P3 Demo with GeoServer SLD param layer (sea level / elevation)

## Release

- [ ] P2 Next minor release : hardened & user tested Grist connector
