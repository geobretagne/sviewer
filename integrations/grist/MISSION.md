# sViewer × Grist — Integration Mission

## Objectives

- Map embedded in Grist as a custom widget
- Map shows Grist table rows as point features (XY-based)
- Select feature on map → select row in Grist
- Select row in Grist → zoom/recenter map on feature
- Share map with public data via permalink (`?geojson=<grist_api_url>` + adapter)
- Later: line/polygon support (geometry column)
- Later: CRUD operations from map

## Architecture constraints

- **sViewer code untouched** — widget is a standalone file in `integrations/grist/`
- Widget uses sViewer JS API (`getMap()`, `getView()`) only
- No CDN — load sViewer via relative path or configurable base URL
- No cookies, no tracking
- WCAG 2.1 AA maintained in widget UI

## Column mapping

Widget resolves lat/lon columns automatically, in order:
1. User explicit choice via Grist column mapping UI (`grist.mapColumnNames()`)
2. Auto-detect: scan column names for `lat`/`latitude`/`y` and `lon`/`lng`/`longitude`/`x`
3. Fallback: show column picker UI inside widget if auto-detect fails

## Config table

Grist table named `_sv_config` (created by widget on first use if absent), rows `key` / `value`:

| key | example value | description |
|-----|---------------|-------------|
| `wms_url` | `https://…/geoserver/wms` | WMS base URL |
| `wms_layers` | `workspace:layer` | Layer name(s) |
| `zoom_default` | `12` | Default zoom |
| `center_x` | `-290000` | Default center X (EPSG:3857) |
| `center_y` | `6150000` | Default center Y (EPSG:3857) |
| `geojson_color` | `#e74c3c` | Point/line/polygon color |

Widget reads `_sv_config` on init, passes values to `SViewer.init()` options.

## Share map (public data)

Widget "Share" button generates:
`?geojson=<grist_api_public_url>&layers=…&x=…&y=…&z=…`

sViewer fetches the Grist records API URL and normalizes it via `jsonLayerAdapter` in `customConfig.js`.
No data serialization in widget — Grist serves records directly. Requires document to be publicly accessible.

`_sv_config` keys for share:
- `grist_api_base`: override Grist host (default: `https://docs.getgrist.com`) for self-hosted
- `sviewer_base_url`: base URL of standalone sViewer for share links

## Share map (private data)

Recommended: proxy endpoint on user infrastructure.
- One script (`grist-proxy.php` or equivalent) stores Grist API key server-side
- Exposes clean URL: `https://yourserver/grist-proxy?doc=ID&table=NAME`
- Returns GeoJSON — sViewer `?geojson=` handles it natively
- Link is revocable, no credentials in URL

## Future: SSE real-time sync

Grist webhooks can POST to a server SSE endpoint on row change.
Widget subscribes to `EventSource` — map updates without polling.
Zero changes to sViewer core.
Phase 3, not in current scope.

## Files

```
integrations/grist/
  MISSION.md          — this file
  widget.html         — standalone Grist widget (HTML + JS, self-contained)
  README.md           — user-facing setup instructions
```

## Implementation phases

**Phase 1 (current)**
- [x] `index.html` (was `widget.html`): loads sViewer embed.js, renders map
- [x] Reads `_sv_config` table, passes to `SViewer.init()`
- [x] `grist.onRecords()` → VectorLayer of points (debounced 300ms)
- [x] `grist.onRecord()` → `getView().animate()` (row → map) + highlight
- [x] Map click → `grist.setCursorPos({rowId})` (map → row)
- [x] Column mapping: auto-detect + fallback picker UI
- [x] Share button → `?geojson=<grist_api_url>` permalink via `jsonLayerAdapter`
- [x] `jsonLayerAdapter` in customConfig.DIST.js — Grist format + plain array fallback

**Phase 2**
- [ ] Line/polygon support (WKT or separate geometry column)
- [ ] `_sv_config` editor UI inside widget

**Phase 3**
- [ ] CRUD from map (drag point → update Grist row)
- [ ] SSE real-time via Grist webhooks
