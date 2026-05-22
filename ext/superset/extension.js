/**
 * Superset extension — postMessage bridge between Superset plugin and sViewer.
 *
 * Loaded automatically when sViewer iframe src contains ?ext=superset.
 * Never load manually — only the Superset plugin should trigger this.
 *
 * Protocol (all messages carry { type: string, ... }):
 *   parent → iframe  sv:geojson  { data: GeoJSON FeatureCollection, autoZoom: boolean }
 *   iframe → parent  sv:ready    {}
 *   iframe → parent  sv:click    { properties: object }
 *
 * autoZoom behaviour:
 *   false (default) — zoom to extent on first non-empty FC only
 *   true            — zoom to extent on every FC update
 */

(function () {
    'use strict';

    var supersetOrigin = null;  // set on first valid inbound message
    var mapReady = false;
    var pendingGeojson = null;  // buffered { fc, autoZoom } received before map ready
    var hasZoomed = false;      // tracks whether initial zoom has fired

    var hasParent = window.parent !== window;

    // --- Announce readiness to parent -------------------------------------

    function announceReady() {
        if (!hasParent) return;
        window.parent.postMessage({ type: 'sv:ready' }, '*');
    }

    // --- Fit map to loaded vector layer extent ----------------------------

    function fitToFeatures() {
        var view = SViewer.getView();
        var map = SViewer.getMap();
        if (!view || !map) return;
        map.getLayers().forEach(function (layer) {
            if (layer && typeof layer.getSource === 'function') {
                var src = layer.getSource();
                if (src && typeof src.getExtent === 'function' && typeof src.getFeatures === 'function') {
                    var ext = src.getExtent();
                    // Guard against empty/unrendered source extent [Inf, Inf, -Inf, -Inf]
                    if (ext && isFinite(ext[0]) && isFinite(ext[1]) && isFinite(ext[2]) && isFinite(ext[3])) {
                        view.fit(ext, { maxZoom: 17, duration: 400, padding: [40, 40, 40, 40] });
                    }
                }
            }
        });
    }

    // --- Load GeoJSON and optionally zoom ---------------------------------

    function applyGeoJSON(fc, autoZoom) {
        var shouldZoom = autoZoom || !hasZoomed;
        SViewer.loadFeatures(fc);
        if (shouldZoom && fc.features && fc.features.length > 0) {
            hasZoomed = true;
            // loadFeatures is sync through bus; setTimeout(0) lets OL finish layer setup
            setTimeout(fitToFeatures, 0);
        }
    }

    // --- Receive GeoJSON from parent --------------------------------------

    window.addEventListener('message', function (e) {
        if (!e.data || typeof e.data.type !== 'string') return;

        if (!supersetOrigin && e.source === window.parent) {
            supersetOrigin = e.origin;
        }

        if (e.source !== window.parent) return;

        if (e.data.type === 'sv:geojson') {
            var fc = e.data.data;
            if (!fc || fc.type !== 'FeatureCollection') return;
            var autoZoom = !!e.data.autoZoom;
            if (mapReady) {
                applyGeoJSON(fc, autoZoom);
            } else {
                pendingGeojson = { fc: fc, autoZoom: autoZoom };
            }
        }
    });

    // --- Wire up after map ready -----------------------------------------

    SViewer.onMapReady(function () {
        mapReady = true;

        if (pendingGeojson) {
            applyGeoJSON(pendingGeojson.fc, pendingGeojson.autoZoom);
            pendingGeojson = null;
        }

        SViewer.onFeatureClick(function (e) {
            if (!e || !e.properties) return;
            var safe = {};
            var props = e.properties;
            Object.keys(props).forEach(function (k) {
                var v = props[k];
                if (v === null || v === undefined) { safe[k] = v; return; }
                var t = typeof v;
                if (t === 'string' || t === 'number' || t === 'boolean') safe[k] = v;
            });
            if (!hasParent || !supersetOrigin) return;
            window.parent.postMessage({ type: 'sv:click', properties: safe }, supersetOrigin);
        });

        announceReady();
    });

})();
