# sViewer — Grist widget

Interactive map widget for [Grist](https://www.getgrist.com), powered by sViewer.

## Setup

1. In your Grist document, open a page and add a **Custom Widget**.
2. Set the widget URL to: `https://yourserver/sviewer/integrations/grist/widget.html`
3. Grant **Read table** access when prompted.

The widget auto-detects latitude/longitude columns. Supported column names:

- **Latitude**: `lat`, `latitude`, `y`, `lat_wgs84`
- **Longitude**: `lon`, `lng`, `longitude`, `x`, `lon_wgs84`

If auto-detection fails, click **Columns** in the widget toolbar to choose manually.

## Config table (`_sv_config`)

Create a table named `_sv_config` with two columns: `key` and `value`.

| key | description | example |
|-----|-------------|---------|
| `wms_url` | WMS base URL | `https://geobretagne.fr/geoserver/wms` |
| `wms_layers` | Layer name(s) | `geobretagne:communes` |
| `zoom_default` | Initial zoom level | `10` |
| `center_x` | Center X in EPSG:3857 | `-290000` |
| `center_y` | Center Y in EPSG:3857 | `6150000` |
| `geojson_color` | Point color (hex) | `#e74c3c` |
| `sviewer_base_url` | sViewer base URL for share links | `https://yourserver/sviewer/` |
| `grist_api_base` | Grist host for self-hosted instances | `https://grist.yourserver.org` |

If the table is absent, default values are used.

## Features

- **Map → Grist**: click a point on the map to select the corresponding row in Grist
- **Grist → map**: select a row in Grist to pan/zoom the map to that feature
- **Share**: generate a permalink (`?geojson=<grist_api_url>`) — sViewer fetches and displays live Grist data via `jsonLayerAdapter`
- **WMS layers**: configure background institutional layers via `_sv_config`

## Share URL — how it works

The Share button builds a sViewer standalone URL with `?geojson=` pointing to the Grist public records API.
sViewer fetches that URL and normalizes the Grist JSON format via `jsonLayerAdapter` in `customConfig.js`.

Requirements:
- Grist document must be publicly accessible (or the viewer must have access)
- `jsonLayerAdapter` must be configured in sViewer's `etc/customConfig.js`
- For self-hosted Grist: set `grist_api_base` in `_sv_config`

## Private data

The Share link points to sViewer standalone. For private data, set up a proxy:
a small server-side script that fetches Grist records using a stored API key and
returns GeoJSON. Pass the proxy URL as `?geojson=` to sViewer.

## Requirements

- Grist (cloud or self-hosted)
- sViewer ≥ 0.4.0 (with `?geojson=` support)
- WMS layers must support CORS and HTTPS
