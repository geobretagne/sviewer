# Backlog

## v0.8 — en cours

- [~] Grist connector : dépendance CDN docs.getgrist.com — investigué, impossible à supprimer côté sViewer.

  **Analyse (2026-05-05) :**
  L'URL `grist-plugin-api.js` est prévisible sur toute instance Grist (`{origin}/grist-plugin-api.js`).
  Mais le chargement dynamique depuis l'instance hébergeuse est bloqué par le CSP que Grist injecte
  sur la page wrapper de l'iframe widget. Ce CSP n'autorise que `https://docs.getgrist.com` pour
  les scripts — y compris sur les instances auto-hébergées (ex. `grist.numerique.gouv.fr` bloque
  son propre origin). C'est une misconfiguration upstream : le CSP devrait autoriser `'self'`.

  **À signaler upstream :** chaque instance Grist auto-hébergée devrait ajouter son propre origin
  (ou `'self'`) dans le CSP de ses iframes widget. Ticket à ouvrir sur le dépôt Grist si nécessaire.

  **Status sViewer :** CDN `docs.getgrist.com` conservé, aucune action possible côté sViewer.

- [ ] CI : GitHub Actions workflow — build + healthcheck verify on tag push (no registry push)
- [ ] Test c= parameter (sviewer configuration profile)
- [ ] Grist widget : real-world user testing
- [ ] CSV connector : real-world user testing
- [ ] Publish demo site with usecases

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

## Archivé — livré

### v0.8.1
- [x] Docker : switch to nginxinc/nginx-unprivileged (non-root process, port 8080) + HEALTHCHECK
- [x] Docker : docker-compose port + healthcheck aligned to 8080
- [x] All modes : hardConfig complete defaults — IGN aerial + OSM + labels overlay + 3 presets, geocodeAdapter, all keys; no customConfig.js required for basic operation
- [x] nginx : CSP hashes stripped from non-index locations; hash only on index.html/sw.js/manifest.json
- [x] nginx : static/lib/ cache corrected — 1h must-revalidate (was 1-year immutable, incorrect for unversioned paths)
- [x] customConfig.DIST.js : rewritten as commented mirror of hardConfig — all keys documented with defaults
- [x] embed.js : version footer → clickable GitHub link

### v0.8.0
- [x] Refactoring arborescence : assets servis sous static/, config infra sous deploy/
- [x] Répertoire etc/ renommé en local/ — sandbox déployeur
- [x] Image Docker allégée : customConfig.js absent de l'image, 404 tolérée
- [x] i18n.js déplacé dans static/js/

### v0.7.2
- [x] All modes : Info panel — GeoJSON source data + feature count (layer-panel template; adapter.label(url))
- [x] All modes : Info panel title — word-break on long filenames
- [x] Grist widget : geometry edit support (draft)

### v0.7.1
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
