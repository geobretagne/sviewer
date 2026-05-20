# Extension API

An extension is a file `ext/<name>/extension.js` loaded by embed.js after the map is ready,
if `customConfig.extensions` declares it or the `?ext=` URL param requests it.

```javascript
// local/customConfig.js
customConfig = {
    extensions: ['my-extension']
};
```

```
index.html?ext=my-extension
```

embed.js loads `ext/my-extension/extension.js` after `sv:mapReady`.
The extension entry point is `SViewer.onMapReady()`.

**Extension vs adapter:** use an extension to add UI, map layers, or interactive behaviour.
Use an adapter (see [Data adapter](#data-adapter-optional) below) to convert a non-GeoJSON API
response for `?geojson=` fetches. An extension can register an adapter — they are not exclusive.

---

## Lifecycle

```javascript
SViewer.onMapReady(({ map, view }) => {
    // entry point — map and view are available
    // register click handlers, add layers, inject toolbar buttons here
});
```

`onMapReady` fires exactly once per registration. If the map is already ready when the
callback is registered (late subscriber), the callback is called immediately and synchronously.
There is no `onDisable` hook — extensions that add OL layers must remove them manually when
the user deactivates the feature.

---

## Data

```javascript
// Load a GeoJSON FeatureCollection (parsed object, not a URL).
// Replaces any existing vector layer. Features are reprojected from EPSG:4326 to EPSG:3857.
SViewer.loadFeatures(geojson);

// Load pre-built ol.Feature[] already in EPSG:3857 — zero reprojection, highest performance.
SViewer.loadFeatureObjects(features, {
    styleOverride: null,   // ol.style.Style or OL style function — null = geojsonStyle from config
    fitExtent: false       // pan/zoom to fit features after load
});
```

Both calls are fire-and-forget. Use `onFeaturesLoaded` / `onFeaturesError` to react.
`onFeaturesError` fires only for the `?geojson=` URL pipeline — not for extension-initiated
`fetch()` calls, which must handle their own errors.

```javascript
// Pattern A — loading data via the ?geojson= pipeline (URL fetch).
// onFeaturesError covers network failures, HTTP errors, adapter failures.
SViewer.panel.open('my-ext', 'My extension', '<p>Loading…</p>');
SViewer.onFeaturesLoaded(function(e) {
    SViewer.panel.update('my-ext', '<p>Loaded ' + e.count + ' features.</p>');
});
SViewer.onFeaturesError(function(e) {
    SViewer.panel.update('my-ext', '<p>Failed to load data (' + e.error + ').</p>');
});
// (data loaded via ?geojson= URL param — no explicit call needed)

// Pattern B — extension fetches data itself then calls loadFeatures().
// Must handle fetch errors manually.
SViewer.panel.open('my-ext', 'My extension', '<p>Loading…</p>');
fetch(myApiUrl)
    .then(function(r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
    .then(function(data) {
        SViewer.loadFeatures(toGeoJSON(data));
        SViewer.panel.update('my-ext', '<p>Done.</p>');
    })
    .catch(function(err) {
        SViewer.panel.update('my-ext', '<p>Error: ' + err + '</p>');
    });
```

---

## Selection

```javascript
// Zoom to feature and open the properties panel.
// id is matched against the GeoJSON top-level "id" field first (feature.getId()),
// then against the "id" property as fallback.
// Preferred: set a top-level "id" in GeoJSON — property fallback uses loose equality (==).
// Logs a console.warn if no matching feature is found.
SViewer.selectFeature(id);

// Clear current selection.
SViewer.clearSelection();
```

---

## Events

```javascript
// Map ready — fires exactly once per registration (late-subscriber safe).
SViewer.onMapReady(({ map, view }) => { });
// No offMapReady — onMapReady is once-only, nothing to remove.

// Click on a vector feature — fires only for features in the built-in vector layer
// (i.e. loaded via loadFeatures / loadFeatureObjects).
// Extensions that add their own OL layers (VectorTile, WMS, etc.) must use
// addClickHandler instead and call map.forEachFeatureAtPixel themselves.
SViewer.onFeatureClick(({ feature, coordinate, properties }) => { });
SViewer.offFeatureClick(fn);

// Selection change (click or selectFeature/clearSelection).
// On deselect: { feature: null, properties: null } — the argument is never null itself.
SViewer.onFeatureSelect(({ feature, properties }) => {
    if (!feature) { /* deselect */ return; }
    // handle selection
});
SViewer.offFeatureSelect(fn);

// After loadFeatures / loadFeatureObjects completes and layer is on map.
SViewer.onFeaturesLoaded(({ features, count }) => { });
SViewer.offFeaturesLoaded(fn);

// Load failure — fetch error, HTTP error, adapter returned null, or adapter not loaded.
// Fired alongside the built-in error popup. Use to update extension UI (e.g. clear "Loading…").
// error values: 'fetch-error' | 'no-data' | 'adapter-not-loaded' | HTTP status string
// NOTE: only fires for the ?geojson= pipeline (loadFeatures / URL fetch).
// Extension-initiated fetch() calls must handle their own errors with try/catch or .catch().
SViewer.onFeaturesError(({ error, url }) => { });
SViewer.offFeaturesError(fn);

// Raw event bus — for events not covered by the named helpers.
SViewer.on('sv:mapReady', fn);
SViewer.off('sv:mapReady', fn);
```

**Warning:** `SViewer.on('sv:mapReady', fn)` bypasses `onMapReady` semantics — it does not
fire immediately for late subscribers and does not auto-remove after firing. Always use
`SViewer.onMapReady(fn)` as the extension entry point.

### Raw click handler

Use when `onFeatureClick` is insufficient (custom OL layers, multi-layer hit-test, hitTolerance control).

```javascript
// fn receives the OL MapBrowserEvent.
// Return a truthy value to mark the click consumed — sViewer will skip its own
// built-in click processing (WMS GetFeatureInfo, vector feature selection).
// Safe to call before map ready (at extension module scope) — queued and applied on sv:mapReady.
SViewer.addClickHandler(function(evt) {
    var hit = false;
    map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
        if (hit) { return; }         // VectorTile ignores return true — use a flag
        hit = true;
        // handle feature
    }, { hitTolerance: 8 });
    return hit || undefined;
});

// Remove a previously registered handler (also removes from pre-ready queue).
SViewer.removeClickHandler(fn);
```

---

## Map access

```javascript
const map  = SViewer.getMap();   // ol.Map  — full OL API
const view = SViewer.getView();  // ol.View
const app  = SViewer.getApp();   // SViewer.app instance (internal, unstable)

SViewer.version   // semver string, e.g. '0.10.0'
SViewer.commit    // short git hash, e.g. 'f285337'

// Base URL of the calling extension's directory (trailing slash).
// Use this instead of manually scanning script tags.
const BASE = SViewer.extensionBase();  // e.g. 'https://example.com/ext/my-ext/'
```

`ol` is available as a global — the full OpenLayers API is accessible from extensions.

```javascript
// Coordinate conversion example (EPSG:3857 → EPSG:4326):
var coord = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
```

**Warning:** `extensionBase()` relies on `document.currentScript` — only set during synchronous
module execution. Call it at the top of your extension file and store the result. Calling it
inside a callback (`onMapReady`, `setTimeout`, `fetch.then`) returns a wrong fallback path with
no error thrown.

---

## State (read-only)

```javascript
window.SViewer.config      // merged config (hardConfig + customConfig + embedOptions)
window.SViewer.hardConfig  // resolved hardConfig (defaults + customConfig overrides)

window.SViewer.state       // runtime state — useful keys:
// state.lb        {number}  active background layer index
// state.theme     {string}  'light' | 'dark'
// state.geojson   {string}  active ?geojson= URL (null if none)
// state.label     {string}  active ?label= column name (null if none)
// state.opacity   {number}  current WMS layer opacity (0–1)
// state.position  {number}  1 = GPS tracking active, 0 = off
```

These objects are read-only by convention — extensions must not assign to them.
`hardConfig` is not frozen: sViewer itself may add keys at runtime (e.g. the Grist widget
adds `geOrchestraBaseUrl`). Do not assume the object is sealed or stable across versions.

---

## UI

```javascript
// Inject a toggle button into the panel toolbar (right side of map).
// Canonical toolbar ID: sv-panel-controls
const toolbar = document.getElementById('sv-panel-controls');
const btn = document.createElement('button');
btn.type = 'button';
btn.className = 'btn btn-dark sv-map-btn';
btn.setAttribute('aria-pressed', 'false');
btn.setAttribute('aria-label', 'My extension');
toolbar.appendChild(btn);

// Toggle pattern — track active state manually (no framework).
var active = false;
btn.addEventListener('click', function() {
    active = !active;
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('active', active);
    if (active) { enable(); } else { disable(); }
});

// If the extension has a persistent mode (active while panel is hidden),
// use sv-alt-toggle instead of sv-panel-toggle so that resetPanel() does
// not clear the button's active state when other panels open.
// Combined with panel.onClose(), this gives correct visual feedback:
// button stays highlighted while mode is active, even when panel is closed.
btn.className = 'btn btn-dark sv-map-btn sv-alt-toggle';

// Switch background layer by index (0-based, matches customConfig.layersBackground).
SViewer.switchBackground(idx);

// Force redraw of the built-in vector layer (style function re-evaluated per feature).
SViewer.refreshVector();

// Force all WMS tile sources to re-fetch from the server (clears OL tile cache).
// Useful after server-side data changes: WFS-T edits, scheduled imports, etc.
SViewer.refreshWMS();

// Update the GeoJSON URL stored in share/embed permalinks without reloading data.
SViewer.setGeojsonUrl(url);

// User-edited map title via the share panel.
// Not fired for programmatic title changes (map init, WFS/MD auto-title).
// fn({ title })
SViewer.onTitleChange(function(e) { /* e.title — persist */ });
SViewer.offTitleChange(fn);
```

---

## CSS and embed safety

sViewer uses a `.sv-scope` wrapper in embed mode to isolate its own styles from the host page.
Extensions must follow the same discipline.

**Rules:**

- All extension DOM must be created inside the panel content div or inside `.sv-scope`. Never
  append elements to `document.body` or outside `.sv-scope`.
- Never inject a `<style>` tag into `document.head` — rules leak globally into the host page.
- Use inline styles or scope CSS selectors to `#sv-panel-ext-<id>` or `.sv-scope`.
- External CSS files (e.g. a bundled viewer library like PSV) injected via `<link>` are **unscoped**
  and will affect the host page. This is acceptable only if the stylesheet is self-contained
  and uses unique class names. Document the tradeoff in your extension README.

```javascript
// Safe: style scoped to your panel element.
var el = document.querySelector('#sv-panel-ext-my-ext .sv-panel-content');
el.innerHTML = '<div style="color:#c00;padding:1rem">Error loading data.</div>';

// Safe: scoped CSS via attribute selector (inject once at module scope).
// Prefer this over a <style> tag — but note it still goes into document.head.
// Use only for layout that cannot be expressed as inline styles.
var style = document.createElement('style');
style.textContent = '#sv-panel-ext-my-ext .my-widget { display: flex; gap: 0.5rem; }';
document.head.appendChild(style);

// Risky in embed mode: external CSS file, unscoped, affects host page.
var link = document.createElement('link');
link.rel = 'stylesheet';
link.href = BASE + 'my-lib.min.css';
document.head.appendChild(link);
```

---

## Side panel

```javascript
// Open the side panel with arbitrary HTML content.
// id    : unique extension identifier (e.g. 'panoramax') — becomes owner of the panel
// title : displayed in the panel header
// html  : injected into the panel body (innerHTML)
// No toolbar button is injected — extensions control their own trigger UI.
SViewer.panel.open(id, title, html);

// Replace panel body HTML without changing title or triggering open animation.
// Use for streaming / progressive content updates.
// No-ops with a console.warn if id does not match the current panel owner.
// This protects against stale async callbacks overwriting another extension's panel.
// To take over the panel from another extension, call panel.open() instead.
SViewer.panel.update(id, html);

// Close the panel (idempotent). Clears the panel owner.
SViewer.panel.close();

// Register a callback fired when the panel is closed while visible.
// Fires for: × button click, another panel opening, SViewer.panel.close().
// Does NOT fire when the panel is already hidden (e.g. GFI opens query panel
// while the extension panel was already closed — altitude mode survives that).
// Use to deactivate extension state and reset toolbar button when the user
// explicitly dismisses the panel.
SViewer.panel.onClose(id, function() {
    active = false;
    btn.setAttribute('aria-pressed', 'false');
    btn.classList.remove('active');
    // clean up map layers, stop drawing, etc.
});
```

---

## Data adapter (optional)

An adapter normalises non-GeoJSON API responses for the `?geojson=` fetch pipeline.
Register one when the extension's purpose is data conversion rather than UI.
An extension file can register both a UI behaviour and an adapter.

```javascript
// Safe to call at module scope (before map ready).
// name    : unique key — matched by ?_format=<name> URL hint
// adapter : object with convert() required, match() and wantsText optional
SViewer.registerAdapter('my-adapter', {
    // Optional — without match(), adapter is tried for every ?geojson= URL.
    match: function(url) { return url.includes('myapi.example.com'); },

    // response   : parsed JSON object (or raw string if wantsText: true)
    // sourceUrl  : original ?geojson= URL (query string hints readable here)
    // return     : GeoJSON FeatureCollection in EPSG:4326, or null to skip
    convert: function(response, sourceUrl) {
        return {
            type: 'FeatureCollection',
            features: response.items.map(function(item) {
                return {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [item.lon, item.lat] },
                    properties: item
                };
            })
        };
    },

    wantsText: false   // true → response is a raw string (CSV, XML, …)
});
```

Do **not** write directly to `window.SViewer.adapters[key]` — use `registerAdapter`.
It validates input and prevents accidental registry overwrites.

---

## Manifest (`manifest.json`)

Each extension must have `ext/<name>/manifest.json`.
Used by `npm run build:catalog` to generate `ext/index.html`.

```jsonc
{
  "id":          "my-ext",           // matches directory name
  "type":        "extension",        // "extension" | "demo"
  "version":     "1.0.0",
  "name":        "My Extension",     // display name
  "description": "One-line summary",
  "author":      "handle",
  "screenshot":  "screenshot.png",   // optional — omit if none (160×120 px recommended)
  "tags":        ["csv", "import"],  // free-form keywords for catalog search

  "entry": "extension.js",           // JS entry point (relative to ext/<name>/)
  // "url": "https://…",            // demo: external URL instead of entry

  "params": [                        // URL params the extension reads — catalog display only
    {
      "name":        "_format",      // param name (without ?)
      "type":        "string",       // string | integer | boolean
      "description": "Force extension activation",
      "enum":        ["my-ext"],     // optional — allowed values shown as pills
      "example":     "_format=my-ext"
    }
  ],

  "sviewer": {
    "minVersion": "0.10.0"           // minimum sViewer version required
  },

  "seo": {                           // optional — for future per-extension detail pages
    "title":           "…",
    "metaDescription": "…"
  },

  "examples": [                      // optional — clickable links in catalog card
    {
      "title":       "Basic usage",
      "url":         "?geojson=https://example.com/data&_format=my-ext",
      "description": "Short context"  // optional
    }
  ]
}
```

After editing, regenerate the catalog:

```bash
npm run build:catalog
```

---

## Minimal extension

10-line starting point — one toolbar button, no dependencies:

```javascript
(function () {
    'use strict';

    SViewer.onMapReady(function(ctx) {
        var toolbar = document.getElementById('sv-panel-controls');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-dark sv-map-btn';
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'My extension');
        btn.textContent = 'Hi';
        var active = false;
        btn.addEventListener('click', function() {
            active = !active;
            btn.setAttribute('aria-pressed', String(active));
            btn.classList.toggle('active', active);
        });
        toolbar.appendChild(btn);
    });
}());
```

## Complete example

See `ext/sample/extension.js` and `ext/sample/manifest.json`.
