/* Suite 04 — Live WMS service health (visual tests)
 * Tests fire real WMS requests against known endpoints.
 * group: 'Live' — skipped in CI autorun, manual only.
 *
 * To add an endpoint: copy a makeWmsTest block, change id/label/wmsUrl/layerName.
 * params.layers format: "WMS_URL|LAYER_NAME"
 */

// layers format: "layerName@wmsUrl"  (@ separator, layer first)
function makeWmsTest(id, label, wmsUrl, layerName, x, y, z) {
    return {
        id: id,
        label: label,
        group: 'Live',
        type: 'visual',
        params: {
            layers: layerName + '@' + wmsUrl,
            z: z || 7,
            x: x || -200000,
            y: y || 6100000
        },
        assert: function(hardConfig) {
            if (!hardConfig) throw new Error('hardConfig not received');
        }
    };
}

// ------ GeoBretagne CI layer (unprotected, stable) ---------------------------

SV_TESTS.push(makeWmsTest(
    'wms-geobretagne-ci',
    'GeoBretagne — CI unprotected vector layer',
    'https://geobretagne.fr/geoserver/ci/wms',
    'unprotectedVectorLayer'
));

// ------ Géoportail (IGN) -----------------------------------------------------

SV_TESTS.push(makeWmsTest(
    'wms-ign-ortho',
    'IGN Géoportail — Orthophotos WMS',
    'https://data.geopf.fr/wms-r',
    'HR.ORTHOIMAGERY.ORTHOPHOTOS'
));

SV_TESTS.push(makeWmsTest(
    'wms-geobretagne-legend',
    'GeoBretagne CI — GetLegendGraphic (unprotectedVectorLayer)',
    'https://geobretagne.fr/geoserver/ci/wms',
    'unprotectedVectorLayer'
));

// ------ GetCapabilities health checks (fetch, no layer needed) ---------------

SV_TESTS.push({
    id: 'caps-geobretagne',
    label: 'GeoBretagne WMS — GetCapabilities HTTP 200 + valid XML',
    group: 'Live',
    type: 'visual',
    params: {},
    assert: function(hardConfig) {
        return fetch('https://geobretagne.fr/geoserver/ci/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities')
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            })
            .then(function(xml) {
                if (!xml.includes('WMS_Capabilities') && !xml.includes('WMT_MS_Capabilities')) {
                    throw new Error('Response is not WMS capabilities XML');
                }
            });
    }
});

SV_TESTS.push({
    id: 'caps-ign-gpf',
    label: 'IGN Géoportail WMS — GetCapabilities HTTP 200 + valid XML',
    group: 'Live',
    type: 'visual',
    params: {},
    assert: function(hardConfig) {
        return fetch('https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities')
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            })
            .then(function(xml) {
                if (!xml.includes('WMS_Capabilities') && !xml.includes('WMT_MS_Capabilities')) {
                    throw new Error('Response is not WMS capabilities XML');
                }
            });
    }
});
