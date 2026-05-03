# Changelog

All notable changes to sViewer are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/).

## [0.5.0] - 2026-05-03

### Added
- **Connecteur Grist v2** — widget Grist étendu : panneau de configuration tabulé (Données / Carte / Partage / Aide), export/import JSON de la configuration, persistance complète des options par instance via l'API widget Grist
- Support des modes géométrie : GeoJSON, Lat/Lon (2 colonnes), Lat\,Lon (texte), Lon\,Lat (texte), WKT
- `md=` (identifiant CSW) configurable dans le panneau de paramètres du widget, avec rechargement si modifié
- Étiquette texte (`_label`) affichée sur les entités GeoJSON dans sViewer standalone — la propriété est définie par `jsonLayerAdapter` via le paramètre hint `_labelcol`

### Changed
- Style GeoJSON par défaut : orange `#ff6600`, opacité `0.35`, trait `2.5 px` — colorblind-friendly, visible sur orthophoto et fond de carte
- `customConfig.geojsonStyle` est désormais lu comme source de vérité pour les valeurs par défaut du style dans le widget Grist (plus de valeurs codées en dur)
- `jsonLayerAdapter` reçoit `sourceUrl` comme 2e argument — permet à l'adaptateur de lire les hints géométriques encodés dans l'URL par le widget Grist

### Fixed
- Lien de partage sViewer depuis le widget Grist : le mode géométrie et la colonne sélectionnés sont désormais encodés comme paramètres hint dans l'URL de l'API Grist (`_geommode`, `_geomcol`, `_collat`, `_collon`, `_labelcol`) — l'auto-détection ne surcharge plus le choix manuel
- Clic successif sur des entités GeoJSON : le panneau de résultats s'ouvre correctement à chaque clic au lieu de se fermer (comportement identique aux couches WMS)

## [0.4.0] - 2026-05-03

### Added
- **Connecteur Grist** (`connectors/grist/`) — widget embarqué dans un document Grist : affiche les géométries d'une table sur une carte sViewer, synchronisation bidirectionnelle table↔carte en temps réel ; la carte est également partageable et intégrable hors de Grist (lien, QR code, `<iframe>`, API JS)
- Support des colonnes géométrie GeoJSON (Point, LineString, Polygon) avec sélecteur de colonne et étiquette configurable dans la barre d'outils du widget
- `ol.style.Text` ajouté au bundle OpenLayers — étiquettes texte sur les entités vectorielles

### Changed
- Répertoire `integrations/` renommé en `connectors/` — nomenclature plus courte et extensible
- Déplacement du bouton "Désélectionner" à droite du compteur d'entités dans la barre d'outils du widget
- Bordures du tableau de propriétés allégées (`border-color: #ddd`, `border-width: 1px`)

### Fixed
- Toast "aucune entité" affiché à tort lors du clic sur une entité vectorielle en présence de couches WMS — `forEachFeatureAtPixel` intercepte le clic avant `queryMap()`
- Changement de colonne géométrie sans effet — l'empreinte de reconstruction inclut désormais `colGeom` + `colLabel` (pas seulement les données)
- `ol.style.Text is not a constructor` — `Text` absent du bundle OL, bundle reconstruit

### Security
- `safeHttpUrl()` retourne uniquement `origin` (suppression du chemin/query) — prévient l'injection de chemin SSRF sur `grist_api_base`
- `encodeURIComponent` sur les identifiants doc et table Grist — prévient la traversée de chemin dans l'URL API
- `safeColor()` — valide les couleurs via `ol.color.asArray` avant injection dans les styles OL
- Remplacement de `innerHTML = ''` par `options.length = 0` pour vider les `<select>` — élimine le risque d'inspection de contenu HTML

### Accessibility
- Attributs `for`/`id` sur tous les labels du widget (WCAG 4.1.2)
- `role="status" aria-live="polite"` sur la zone de statut (WCAG 4.1.3)
- Contraste du texte de statut corrigé `#888` → `#666` (ratio ≥ 4.5:1, WCAG 1.4.3)
- Attribut `lang` dynamique sur `<html>` selon la langue détectée
- `aria-label` sur le bouton Désélectionner via `data-i18n-aria`
- Traductions espagnol (`es`) et allemand (`de`) ajoutées au widget

### Deployment
- `etc/nginx-server.conf` mis à jour pour le chemin `connectors/` ; blocs CSP dédiés pour le widget Grist (`unsafe-inline`, `unsafe-eval`, domaine `docs.getgrist.com`)
- `scripts/` exclu du Docker image (outil de build uniquement)
- `CLAUDE.md` exclu du dépôt git (`.gitignore`)
- Avertissement ajouté dans README et TECHNICAL.md : le snippet nginx est obligatoire pour protéger les fichiers de build

## [0.3.0] - 2026-05-02

### Added
- iFrame tab in embed modal (alongside existing JS tab) — CMS/blog editors can copy a one-liner `<iframe>` without JavaScript
- Auto-open legend panel on load when a queryable layer is present and viewport width > 600 px — saves one click, surfaces layer info immediately
- `@media print` — controls hidden; if a panel is open it renders beside the map (map 65%, panel 35%); closed panel hidden; map fills full width when no panel open
- `backgroundPresets` config key — single cycling button replaces the independent background + overlay buttons; each preset sets background and overlay atomically (`{lb, lo}` indices); `layersBackground`-only configs remain fully backward compatible
- `allowedDomains` config key — optional hostname allowlist for external OGC services (WMS, CSW, WFS); absent or empty array = all domains allowed (backward compatible)

### Changed
- `ORTHOIMAGERY.ORTHOPHOTOS` background layer switched from TMS/XYZ to WMTS (better render quality); IIFE pattern avoids global vars
- Fullscreen button hidden on mobile (OS provides native fullscreen) and when `fullscreenEnabled` API absent
- GPS/geolocation button hidden on non-touch devices (`pointer: coarse` media query) — desktop browsers expose the geolocation API but have no hardware GPS
- `customConfig.DIST.js` updated to demonstrate `backgroundPresets` (3 presets: photo+labels, photo, map) and `layersOverlay` pool; `layersBackground` marked as legacy

### Fixed
- XSS in GetFeatureInfo panel — raw WMS HTML response now parsed with `$.parseHTML(..., false)` (script execution disabled)
- XML injection in WFS filter — user search input now escaped via `xmlEscape()` before interpolation into OGC filter
- XSS in QR code error path — replaced `innerHTML` with DOM node construction (`createElement` + `textContent`)
- Skip link "Aller à la carte" rendered visibly over the map — CSS selector mismatch (`sv-skip-to-content` vs `skip-to-content`) corrected

### Performance
- `embed.js` now minified (`embed.min.js`) — loaded by `index.html` in production (−24% parse time on critical path)
- jQuery and proj4 loaded in parallel via `Promise.all` before OpenLayers — saves ~100 ms waterfall on first load
- Deleted `lib/bootstrap-icons/fonts/bootstrap-icons.woff2` (130 KB, unreferenced — subset at `build/` is used)

### Removed
- Overlay layer button (`#ovBt`) — replaced by `backgroundPresets` cycling button; `?lo=` URL parameter removed
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
