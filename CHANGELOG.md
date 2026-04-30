# Changelog

All notable changes to sViewer are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
