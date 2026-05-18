/* Suite 05 — GeoJSON load tests
 * group GeoJSON: offline edge-case tests (static fixtures)
 * group Live: network-dependent tests (IGN Géoplateforme WFS)
 */

// Fixture: empty FeatureCollection — sViewer must return silently, no crash.
SV_TESTS.push({
    id: 'geojson-empty',
    label: 'GeoJSON empty FeatureCollection — silent return, no crash',
    group: 'GeoJSON',
    type: 'visual',
    params: {
        geojson: SVRunner.getBaseUrl() + 'tests/fixtures/empty.geojson',
        z: 12,
        x: 2.3488,
        y: 48.8534
    },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received — sViewer crashed on empty GeoJSON');
    }
});

// Fixture: 1 valid Point + 1 null-geometry feature.
// sViewer must filter the null silently and load without crash.
SV_TESTS.push({
    id: 'geojson-null-geometry',
    label: 'GeoJSON null geometry — filtered silently, no crash',
    group: 'GeoJSON',
    type: 'visual',
    params: {
        geojson: SVRunner.getBaseUrl() + 'tests/fixtures/null-geometry.geojson',
        z: 12,
        x: 2.3488,
        y: 48.8534
    },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received — sViewer crashed on null geometry');
    }
});

var WFS_EU = 'https://data.geopf.fr/wfs/ows'
    + '?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature'
    + '&TYPENAMES=CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle'
    + '&BBOX=1.395000,50.068000,1.505000,50.122000,EPSG:4326'
    + '&OUTPUTFORMAT=application/json';

SV_TESTS.push({
    id: 'geojson-wfs-eu-parcels',
    label: 'GeoJSON WFS — Eu parcels ~104K vertices, labels=numero, triggers desktop simplify (IGN Géoplateforme)',
    group: 'Live',
    type: 'visual',
    timeout: 30000,
    params: {
        geojson: WFS_EU,
        label: 'numero',
        z: 15,
        x: 161413,
        y: 6462744
    },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received — sViewer did not start');
    }
});

// Regression: selectFeature must find features that have properties.id but no top-level GeoJSON id.
// The fixture has no top-level "id" field — only properties.id = "brest-1".
// Regression: ?geojson= pointing to a 404 URL must not crash sViewer.
// sv:featuresError is emitted internally — this test only verifies no crash (sv:ready fires).
SV_TESTS.push({
    id: 'geojson-fetch-404-no-crash',
    label: '?geojson= 404 — sViewer recovers, sv:featuresError emitted, no crash',
    group: 'GeoJSON',
    type: 'visual',
    params: {
        geojson: SVRunner.getBaseUrl() + 'tests/fixtures/nonexistent-does-not-exist.geojson'
    },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received — sViewer crashed on 404 geojson fetch');
        if (!hardConfig.initialExtent) throw new Error('initialExtent missing after 404 geojson');
    }
});

// Extension calls SViewer.selectFeature('brest-1') on featuresLoaded.
// Assert: query panel opens (sv-panel-open class on #sv-frame-map).
SV_TESTS.push({
    id: 'geojson-select-feature-props-id-fallback',
    label: 'selectFeature — falls back to properties.id when no top-level GeoJSON id',
    group: 'GeoJSON',
    type: 'visual',
    timeout: 8000,
    params: {
        geojson: SVRunner.getBaseUrl() + 'tests/fixtures/props-id-only.geojson',
        ext: 'test-select-fallback'
    },
    assert: function(hardConfig, event, queryDOM) {
        if (!hardConfig) throw new Error('hardConfig not received');
        return new Promise(function(resolve) { setTimeout(resolve, 1500); })
            .then(function() { return queryDOM('#sv-frame-map', 'className'); })
            .then(function(r) {
                if (!r.value || r.value.indexOf('sv-panel-open') === -1) {
                    throw new Error('Query panel did not open — selectFeature fallback failed. className: ' + r.value);
                }
            });
    }
});
