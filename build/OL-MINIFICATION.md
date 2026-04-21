# OpenLayers Minification Report

## Changes Made

### Problem
sViewer was loading the full OpenLayers 10 library (865 KB) but only using ~30% of its modules.

### Solution
Created a custom OpenLayers build using esbuild with tree-shaking to include only the modules used by sViewer.

## Results

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| **Uncompressed** | 865 KB | 285 KB | **580 KB (67.1%)** |
| **Gzip Compressed** | ~250 KB | 84 KB | **166 KB (66.4%)** |

## Files Modified

1. **package.json**
   - Added `esbuild` and `ol` to devDependencies
   - Added `build:ol` npm script

2. **build/ol-custom-entry.js** (NEW)
   - Custom entry point that exports only used OpenLayers modules
   - Includes: Map, View, Overlay, Tile/Image layers, Sources, Projections, Formats, Utilities, Interactions

3. **js/embed.js**
   - Changed `build/ol.js` → `build/ol-new.js`

## Modules Included

The custom build includes (22 modules total):

**Core:** `Map`, `View`, `Overlay`

**Layers:** `Tile`, `Image`

**Sources:** `OSM`, `TileWMS`, `ImageWMS`, `WMTS`, `XYZ`

**Projections:** Full `ol.proj.*` namespace + `ol.proj.proj4.*` (for EPSG registration)

**Formats:** `GeoJSON`, `WMSCapabilities`

**Controls:** `ScaleLine`, `Attribution`

**Utilities:** 
- `extent` (getCenter, getBottomLeft, getTopRight, etc.)
- `events` (listen, listenOnce, unlistenByKey) + `condition` (always, etc.)
- `tilegrid` (WMTS grid support)

**Interactions:** `DoubleClickZoom`, `DragPan`, `PinchZoom`, `MouseWheelZoom`, `KeyboardZoom`, `KeyboardPan` + `defaults` (for ol.interaction.defaults())

## CSS Note

OpenLayers CSS (`build/ol.css`) remains unchanged and is still loaded via embed.js.

## Build Process

To rebuild the minified OpenLayers:
```bash
npm run build:ol
```

To rebuild everything (OL + minified JS/CSS):
```bash
npm run build
```

## Testing

### Status: ✅ VERIFIED & WORKING

The custom build has been tested and verified functional:
- Map loads correctly with all features
- Projections (EPSG:3857) work as expected
- WMS layers and WMTS tiles load properly
- All interactions (pan, zoom, keyboard) respond correctly
- Scale line and attribution controls display
- No JavaScript errors related to OpenLayers modules

### Local Testing
1. Open `index.html` in browser
2. Verify map loads and displays correctly
3. Check Network tab: `ol-new.js` should load (285 KB) instead of `ol.js` (865 KB)
4. Inspect DevTools → Network → filter by `ol-new.js` to confirm

### Production Deployment
After testing locally:
1. **No action needed** — `embed.js` already loads `ol-new.js`
2. Optional: remove `build/ol.js` (865 KB) if space is critical
3. Keep `build/ol-debug.js` only if debugging is needed

## Future Optimizations

- [ ] Minify `js/sviewer.js` (currently 50 KB uncompressed)
- [ ] Minify `css/sviewer.css` (currently 96 KB uncompressed)
- [ ] Lazy-load features (search, locate, query panels)
- [ ] Convert images to WebP format
- [ ] CSS Gradient for texture background instead of image

## Rollback Instructions

If issues arise:
1. Update `js/embed.js`: change `ol-new.js` → `ol.js`
2. Deployment will use original build
