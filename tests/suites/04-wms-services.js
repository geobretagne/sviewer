/* Suite 04 — Live WMS service health (visual tests)
 * Tests fire real GetCapabilities requests against known WMS endpoints.
 * group: 'Live' — skipped in CI, manual only.
 *
 * To add an endpoint: copy a block, change id/label/params.layers.
 * params.layers format: "WMS_URL|LAYER_NAME"
 */

function makeWmsTest(id, label, wmsUrl, layerName) {
    return {
        id: id,
        label: label,
        group: 'Live',
        type: 'visual',
        // Load sViewer with the WMS layer — map shows the service live
        params: {
            layers: wmsUrl + '|' + layerName,
            z: 7,
            x: -200000,
            y: 6100000
        },
        assert: function(hardConfig) {
            // sViewer started — layer load errors show in map, not here
            if (!hardConfig) throw new Error('hardConfig not received');
        }
    };
}

// ------ GeoBretagne ----------------------------------------------------------

SV_TESTS.push(makeWmsTest(
    'wms-geobretagne-scan25',
    'GeoBretagne — Scan25 (IGN raster)',
    'https://geobretagne.fr/geoserver/ign/wms',
    'scan25'
));

SV_TESTS.push(makeWmsTest(
    'wms-geobretagne-communes',
    'GeoBretagne — Communes (vector)',
    'https://geobretagne.fr/geoserver/ref/wms',
    'communes'
));

// ------ Géoportail (IGN) -----------------------------------------------------

SV_TESTS.push(makeWmsTest(
    'wms-ign-ortho',
    'IGN Géoportail — Orthophotos WMS',
    'https://data.geopf.fr/wms-r',
    'HR.ORTHOIMAGERY.ORTHOPHOTOS'
));

SV_TESTS.push(makeWmsTest(
    'wms-ign-scan',
    'IGN Géoportail — Carte SCAN (WMS)',
    'https://data.geopf.fr/wms-r',
    'GEOGRAPHICALGRIDSYSTEMS.MAPS'
));

// ------ GetCapabilities health checks (no layer needed) ----------------------
// These tests check the endpoint directly via fetch, not via sViewer layer load.

SV_TESTS.push({
    id: 'caps-geobretagne',
    label: 'GeoBretagne WMS — GetCapabilities HTTP 200 + valid XML',
    group: 'Live',
    type: 'visual',
    params: {},
    assert: function(hardConfig) {
        // Piggyback: run fetch check after sViewer loads
        return fetch('https://geobretagne.fr/geoserver/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities')
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
