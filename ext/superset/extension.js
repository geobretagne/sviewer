/**
 * Superset extension — postMessage bridge between Superset plugin and sViewer.
 *
 * Loaded automatically when sViewer iframe src contains ?ext=superset.
 * Never load manually — only the Superset plugin should trigger this.
 *
 * Protocol (all messages carry { type: string, ... }):
 *   parent → iframe  sv:geojson  { data: GeoJSON FeatureCollection }
 *   iframe → parent  sv:ready    {}
 *   iframe → parent  sv:click    { properties: object }
 */

(function () {
    'use strict';

    var supersetOrigin = null;  // set on first valid inbound message
    var mapReady = false;
    var pendingGeojson = null;  // GeoJSON received before map was ready

    var hasParent = window.parent !== window;

    // --- Announce readiness to parent -------------------------------------

    function announceReady() {
        if (!hasParent) return;
        // '*' target origin — parent will restrict on its side via e.source check
        window.parent.postMessage({ type: 'sv:ready' }, '*');
    }

    // --- Receive GeoJSON from parent --------------------------------------

    window.addEventListener('message', function (e) {
        if (!e.data || typeof e.data.type !== 'string') return;

        // Record parent origin on first message for outbound targeting
        if (!supersetOrigin && e.source === window.parent) {
            supersetOrigin = e.origin;
        }

        // Only accept messages from direct parent
        if (e.source !== window.parent) return;

        if (e.data.type === 'sv:geojson') {
            var fc = e.data.data;
            if (!fc || fc.type !== 'FeatureCollection') return;
if (mapReady) {
                SViewer.loadFeatures(fc);
            } else {
                pendingGeojson = fc;
            }
        }
    });

    // --- Wire up after map ready -----------------------------------------

    SViewer.onMapReady(function () {
        mapReady = true;

        // Load any GeoJSON that arrived before map was ready
        if (pendingGeojson) {
            SViewer.loadFeatures(pendingGeojson);
            pendingGeojson = null;
        }

        // Emit click events to parent for cross-filter
        SViewer.onFeatureClick(function (e) {
            if (!e || !e.properties) return;
            // Sanitize: keep only JSON-serializable primitives
            var safe = {};
            var props = e.properties;
            Object.keys(props).forEach(function (k) {
                var v = props[k];
                if (v === null || v === undefined) { safe[k] = v; return; }
                var t = typeof v;
                if (t === 'string' || t === 'number' || t === 'boolean') safe[k] = v;
            });
            if (!hasParent) return;
            var target = supersetOrigin || '*';
            window.parent.postMessage({ type: 'sv:click', properties: safe }, target);
        });

        // Announce ready — after onFeatureClick registered so no race
        announceReady();
    });

})();
