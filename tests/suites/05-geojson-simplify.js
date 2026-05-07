/* Suite 05 — GeoJSON auto-simplify (load tests)
 * Generates synthetic polygon datasets at known vertex counts.
 * Asserts sViewer loads cleanly within timeout — proves pipeline handles volume.
 * Each polygon: circle approximation, 100 vertices, ~1km radius, scattered over France.
 */

function makePolygon(cx, cy, radius, npts) {
    var coords = [];
    for (var i = 0; i <= npts; i++) {
        var a = (i % npts) * 2 * Math.PI / npts;
        coords.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
    }
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} };
}

function makeGeoJSON(nPolygons, vertsPerPolygon) {
    var features = [];
    for (var i = 0; i < nPolygons; i++) {
        var cx = -5 + (i % 50) * 0.2;
        var cy = 43 + Math.floor(i / 50) * 0.2;
        features.push(makePolygon(cx, cy, 0.01, vertsPerPolygon));
    }
    return { type: 'FeatureCollection', features: features };
}

function geojsonDataUrl(nPolygons, vertsPerPolygon) {
    var fc = makeGeoJSON(nPolygons, vertsPerPolygon);
    return 'data:application/json,' + encodeURIComponent(JSON.stringify(fc));
}

// 250 polygons × 100 vertices = 25K vertices (mobile simplify threshold)
SV_TESTS.push({
    id: 'geojson-25k-vertices',
    label: 'GeoJSON 25K vertices — loads without crash (mobile threshold)',
    group: 'GeoJSON',
    type: 'visual',
    params: { geojson: geojsonDataUrl(250, 100), z: 6, x: -200000, y: 5900000 },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received — sViewer did not start');
    }
});

// 1010 polygons × 100 vertices = 101K vertices (desktop simplify threshold)
SV_TESTS.push({
    id: 'geojson-101k-vertices',
    label: 'GeoJSON 101K vertices — loads without crash (desktop threshold)',
    group: 'GeoJSON',
    type: 'visual',
    params: { geojson: geojsonDataUrl(1010, 100), z: 6, x: -200000, y: 5900000 },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received — sViewer did not start');
    }
});
