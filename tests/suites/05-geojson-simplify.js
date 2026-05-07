/* Suite 05 — GeoJSON auto-simplify (load tests)
 * Loads static fixture files at known vertex counts.
 * Asserts sViewer loads cleanly within timeout — proves pipeline handles volume.
 * Fixtures: tests/fixtures/geojson-25k.geojson  (250 polygons × 100 vertices = 25K)
 *           tests/fixtures/geojson-101k.geojson (1010 polygons × 100 vertices = 101K)
 *           tests/fixtures/geojson-500k.geojson (5000 polygons × 100 vertices = 500K)
 */

// 25K vertices — triggers auto-simplify on mobile (threshold 25K)
SV_TESTS.push({
    id: 'geojson-25k-vertices',
    label: 'GeoJSON 25K vertices — loads without crash (mobile threshold)',
    group: 'GeoJSON',
    type: 'visual',
    params: {
        geojson: SVRunner.getBaseUrl() + 'tests/fixtures/geojson-25k.geojson',
        z: 6, x: -200000, y: 5900000
    },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received — sViewer did not start');
    }
});

// 101K vertices — triggers auto-simplify on desktop (threshold 100K)
SV_TESTS.push({
    id: 'geojson-101k-vertices',
    label: 'GeoJSON 101K vertices — loads without crash (desktop threshold)',
    group: 'GeoJSON',
    type: 'visual',
    params: {
        geojson: SVRunner.getBaseUrl() + 'tests/fixtures/geojson-101k.geojson',
        z: 6, x: -200000, y: 5900000
    },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received — sViewer did not start');
    }
});

// 500K vertices — stress test, simplify mandatory, 30s timeout for large file transfer
SV_TESTS.push({
    id: 'geojson-500k-vertices',
    label: 'GeoJSON 500K vertices — stress load (simplify mandatory)',
    group: 'GeoJSON',
    type: 'visual',
    timeout: 30000,
    params: {
        geojson: SVRunner.getBaseUrl() + 'tests/fixtures/geojson-500k.geojson',
        z: 6, x: -200000, y: 5900000
    },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received — sViewer did not start');
    }
});
