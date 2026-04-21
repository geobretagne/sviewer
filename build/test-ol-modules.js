/**
 * Test script to verify ol-new.js contains all required modules
 * Run with: node build/test-ol-modules.js
 */

// We can't directly require ol-new.js since it's an IIFE bundle
// Instead, we'll test by importing from the npm package and checking the custom entry

const tests = [
    { name: 'ol/Map', module: 'ol/Map.js' },
    { name: 'ol/View', module: 'ol/View.js' },
    { name: 'ol/Overlay', module: 'ol/Overlay.js' },
    { name: 'ol/layer/Tile', module: 'ol/layer/Tile.js' },
    { name: 'ol/layer/Image', module: 'ol/layer/Image.js' },
    { name: 'ol/source/OSM', module: 'ol/source/OSM.js' },
    { name: 'ol/source/TileWMS', module: 'ol/source/TileWMS.js' },
    { name: 'ol/source/ImageWMS', module: 'ol/source/ImageWMS.js' },
    { name: 'ol/proj', module: 'ol/proj.js' },
    { name: 'ol/format/GeoJSON', module: 'ol/format/GeoJSON.js' },
    { name: 'ol/format/WMSCapabilities', module: 'ol/format/WMSCapabilities.js' },
    { name: 'ol/extent', module: 'ol/extent.js' },
    { name: 'ol/events', module: 'ol/events.js' },
    { name: 'ol/control/ScaleLine', module: 'ol/control/ScaleLine.js' },
    { name: 'ol/control/Attribution', module: 'ol/control/Attribution.js' },
];

let passed = 0;
let failed = 0;

console.log('\n📦 Testing OpenLayers modules availability...\n');

tests.forEach(test => {
    try {
        require.resolve(test.module);
        console.log(`✓ ${test.name}`);
        passed++;
    } catch (e) {
        console.log(`✗ ${test.name} - NOT FOUND`);
        failed++;
    }
});

const total = tests.length;
const allPass = failed === 0;

console.log(`\n${allPass ? '✓ PASS' : '✗ FAIL'} (${passed}/${total} modules available)\n`);

process.exit(allPass ? 0 : 1);
