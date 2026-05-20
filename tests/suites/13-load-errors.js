/* Suite 13 — WMS and GeoJSON load error banners
 * Verifies that sViewer surfaces load failures as persistent alert-danger
 * banners in #sv-legend-content rather than silently discarding them.
 *
 * GeoJSON 404: banner #sv-geojson-err must appear in legend panel.
 * GeoJSON bad JSON: serve a plain-text URL that is not valid GeoJSON nor
 *   matched by any adapter → "no-data" path → #sv-geojson-err.
 * WMS bad URL: tileloaderror fires → debounced 2s → banner #sv-wms-err-*.
 *   WMS test needs longer timeout (tiles load + 2s debounce + poll time).
 *
 * assert(hardConfig, event, queryDOM, clickDOM)
 */

// --- GeoJSON 404 → banner has role=alert (also proves banner appeared) ----

SV_TESTS.push({
    id: 'geojson-404-banner-role-alert',
    label: 'GeoJSON 404 — error banner has role="alert"',
    group: 'LoadErrors',
    type: 'visual',
    timeout: 8000,
    params: {
        geojson: SVRunner.getBaseUrl() + 'tests/fixtures/nonexistent-file-404.geojson',
        z: 10,
        x: 2.3488,
        y: 48.8534
    },
    assert: function(hardConfig, event, queryDOM, clickDOM) {
        if (!hardConfig) { throw new Error('sViewer crashed'); }
        return clickDOM('#sv-btn-panel-legend', 200).then(function() {
            var maxAttempts = 12;
            var attempt = 0;
            function poll() {
                attempt++;
                return queryDOM('#sv-geojson-err[role="alert"]', 'textContent').then(function(r) {
                    if (r.found) { return; }
                    if (attempt >= maxAttempts) {
                        throw new Error('#sv-geojson-err[role="alert"] never appeared');
                    }
                    return new Promise(function(res) { setTimeout(res, 300); }).then(poll);
                });
            }
            return poll();
        });
    }
});

// --- GeoJSON 404 → banner is persistent (still present after 3s) ----------

SV_TESTS.push({
    id: 'geojson-404-banner-persistent',
    label: 'GeoJSON 404 — error banner is persistent (not auto-dismissed)',
    group: 'LoadErrors',
    type: 'visual',
    timeout: 12000,
    params: {
        geojson: SVRunner.getBaseUrl() + 'tests/fixtures/nonexistent-file-404.geojson',
        z: 10,
        x: 2.3488,
        y: 48.8534
    },
    assert: function(hardConfig, event, queryDOM, clickDOM) {
        if (!hardConfig) { throw new Error('sViewer crashed'); }
        return clickDOM('#sv-btn-panel-legend', 200).then(function() {
            // Wait for banner to appear
            var maxAttempts = 12;
            var attempt = 0;
            function waitAppear() {
                attempt++;
                return queryDOM('#sv-geojson-err', 'textContent').then(function(r) {
                    if (r.found) { return; }
                    if (attempt >= maxAttempts) { return; }
                    return new Promise(function(res) { setTimeout(res, 300); }).then(waitAppear);
                });
            }
            return waitAppear();
        }).then(function() {
            return new Promise(function(res) { setTimeout(res, 3000); });
        }).then(function() {
            return queryDOM('#sv-geojson-err', 'textContent');
        }).then(function(r) {
            if (!r.found) {
                throw new Error('#sv-geojson-err disappeared — banner must be persistent, not auto-dismissed');
            }
        });
    }
});

// --- WMS bad URL → #sv-wms-err-* banner appears ---------------------------

SV_TESTS.push({
    id: 'wms-bad-url-error-banner',
    label: 'WMS bad service URL — error banner appears in legend panel after tile errors',
    group: 'LoadErrors',
    type: 'visual',
    timeout: 15000,
    params: {
        layers: 'fake:nonexistent@https://does-not-exist.invalid/wms',
        z: 10,
        x: 2.3488,
        y: 48.8534
    },
    assert: function(hardConfig, event, queryDOM, clickDOM) {
        if (!hardConfig) { throw new Error('sViewer crashed'); }
        return clickDOM('#sv-btn-panel-legend', 200).then(function() {
            // WMS debounce is 2s after first tileloaderror — poll up to 10s
            var maxAttempts = 33;
            var attempt = 0;
            function poll() {
                attempt++;
                // id is sv-wms-err-{layername with \W→_}
                return queryDOM('[id^="sv-wms-err-"]', 'textContent').then(function(r) {
                    if (r.found) { return; }
                    if (attempt >= maxAttempts) {
                        throw new Error('WMS error banner never appeared after tile load errors');
                    }
                    return new Promise(function(res) { setTimeout(res, 300); }).then(poll);
                });
            }
            return poll();
        });
    }
});
