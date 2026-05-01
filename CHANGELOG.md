# Changelog

All notable changes to sViewer are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- iFrame tab in embed modal (alongside existing JS tab) — CMS/blog editors can copy a one-liner `<iframe>` without JavaScript
- Auto-open legend panel on load when a queryable layer is present and viewport width > 600 px — saves one click, surfaces layer info immediately
- `@media print` — controls hidden; if a panel is open it renders beside the map (map 65%, panel 35%); closed panel hidden; map fills full width when no panel open

### Changed
- `ORTHOIMAGERY.ORTHOPHOTOS` background layer switched from TMS/XYZ to WMTS (better render quality); IIFE pattern avoids global vars
- Fullscreen button hidden on mobile (OS provides native fullscreen) and when `fullscreenEnabled` API absent
- GPS/geolocation button hidden on non-touch devices (`pointer: coarse` media query) — desktop browsers expose the geolocation API but have no hardware GPS

### Performance
- `embed.js` now minified (`embed.min.js`) — loaded by `index.html` in production (−24% parse time on critical path)
- jQuery and proj4 loaded in parallel via `Promise.all` before OpenLayers — saves ~100 ms waterfall on first load
- Deleted `lib/bootstrap-icons/fonts/bootstrap-icons.woff2` (130 KB, unreferenced — subset at `build/` is used)

### Removed
- Shake to share — false positives during transport, no discoverability, intrusive iOS permission prompt; permalink button in share panel covers the same use case

## [0.2.0] - 2026-05-01

### Added
- Overlay layer button — cycles through `layersOverlay[]` config array (`?lo=` URL param)
- Fullscreen button in map controls (between zoom- and overlay) — webkit prefix for Safari/iOS
- Snapshot button in share panel — exports map as PNG via `canvas.toBlob()`
- Shake to share — `DeviceMotionEvent` copies permalink + haptic feedback; iOS 13+ permission handling
- Auto dark mode — follows OS `prefers-color-scheme: dark` when no `?theme=` param set
- Unified loading bar — 3 px indeterminate bar at top of map covers tiles, GFI, geocode, WFS, CSW

### Changed
- Map controls split into two semantic `role="group"` groups: navigation (home/zoom/fullscreen) and layers (overlay/background/GPS)
- `customConfig.DIST.js`: WMTS boilerplate replaced with `ol.source.XYZ` — no global vars required
- Background layers now use geopf TMS (`HR.ORTHOIMAGERY.ORTHOPHOTOS`) and MapProxy TMS (`osm:grey`)
- Overlay changed from PLANIGNV2 to `GEOGRAPHICALNAMES.NAMES` (RGBA transparent labels, zoom 6–18)
- Ocean/background color set to `#a8d5e8` via `.ol-viewport` CSS
- All tile sources have `crossOrigin: 'anonymous'` for snapshot compatibility

### Fixed
- `scope is not defined` in `sviewer.js` fullscreen — replaced with `document.querySelector('.sv-scope')`
- Fullscreen icon wrong unicode (U+F3DF / U+F3DE) — woff2 subset rebuilt with correct codepoints
- Canvas taint on snapshot — `crossOrigin: 'anonymous'` on WMS `TileWMS` source

## [0.1.1] - 2026-04-30

### Added
- `CHANGELOG.md`
- Permalink button label translated separately from tooltip (`btn.permalink_label`, 4 languages)
- Version + commit hash visible in share panel and browser console; `SViewer.version`, `SViewer.commit` public API

### Changed
- Dockerfile: `nginx:1.17` → `nginx:1.26-alpine`
- `.dockerignore` expanded to exclude dev files from image
- Release checklist added to `TECHNICAL.md`

### Fixed
- sViewer casing (`Sviewer` → `sViewer`) in README
- fr `msg.top_layer`: banned word "couche" → "donnée"

### Removed
- Unused i18n keys `btn.qrcode` and `panel.share_modal.title` (vestigial)
- Dead files: `.gitmodules` (obsolete ol3 submodule ref), `minify.sh` (superseded by npm scripts)

## [0.1.0] - 2026-04-30

### Added
- Version number (`0.1.0`) and commit hash visible in share panel and browser console on init
- `npm run stamp` — injects version + git hash into `embed.js` at release time
- `npm run minify` / `npm run build` pipeline (terser + postcss + esbuild for OL bundle)
- `?lang=` URL parameter to force display language (en/fr/es/de)
- `?md=` parameter — load WMS layer from CSW/ISO 19139 metadata record (GeoNetwork)
- `?s=1` — WFS feature search across all text fields of displayed layer
- `?theme=dark` / `?theme=light` URL parameter + interactive toggle in config panel
- `?debug=true` — console logging; `?debug=1` — load non-minified JS/CSS (independent flags)
- `?c=` — load alternate custom configuration file (`etc/customConfig_<name>.js`)
- External WMS support: `layers=name@https://wms.example.com/...`
- CQL filter support: `layers=name*style*cql_filter`
- Progressive Web App (PWA): installable on mobile, offline support via service worker
- Bootstrap Icons subset — reduced from 130 kB to 1.7 kB (woff2)
- Content Security Policy headers (nginx)
- `maxGeocodeResults` and `maxWfsSearchFeatures` config options
- WCAG 2.1 AA accessibility: `lang` attribute, `aria-pressed`, `aria-checked`, live regions, skip link
- Release procedure documented in `TECHNICAL.md`

### Changed
- Migrated from OpenLayers 2 to OpenLayers 10 (custom bundle via esbuild)
- Replaced CDN dependencies with fully self-hosted assets (no external requests)
- Refactored shared helpers to reduce duplication across modules

### Fixed
- Service worker scope `/` causing PWA registration failure
- Skip link hidden until focused (accessibility)
- Crosshair cursor on map, corrected Bootstrap icon classes

### Removed
- All external CDN dependencies
