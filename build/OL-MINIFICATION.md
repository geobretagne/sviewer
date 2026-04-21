# OpenLayers Minification Report

## Changes Made

### Problem
sViewer was loading the full OpenLayers 10 library (865 KB) but only using ~30% of its modules.

### Solution
Created a custom OpenLayers build using esbuild with tree-shaking to include only the modules used by sViewer.

## Results

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| **Uncompressed** | 865 KB | 280 KB | **585 KB (67.6%)** |
| **Gzip Compressed** | ~250 KB | 82 KB | **168 KB (67.2%)** |

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

The custom build includes only:
- Core: `Map`, `View`, `Overlay`
- Layers: `Tile`, `Image`
- Sources: `OSM`, `TileWMS`, `ImageWMS`
- Projections: `ol.proj.*`
- Formats: `GeoJSON`, `WMSCapabilities`
- Utilities: `extent`, `events`, `ScaleLine`, `Attribution`
- Interactions: All standard interactions (zoom, pan, keyboard)

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

### Local Testing
1. Open `index.html` in browser
2. Verify map loads and displays correctly
3. Check Network tab: `ol-new.js` should load instead of `ol.js`

### Production Deployment
After testing locally:
1. Replace `build/ol.js` with `build/ol-new.js` (optional, kept for reference)
2. No changes needed to `index.html` or other files

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
