/* Suite 05 — GeoJSON auto-simplify (live WFS load test)
 * Fetches real cadastral parcels from IGN Géoplateforme WFS (public, CORS-enabled).
 * BBOX over Eu (Seine-Maritime) — ~2200 parcels, MultiPolygon geometries.
 * group: 'Live' — network-dependent, run manually.
 */

var WFS_EU = 'https://data.geopf.fr/wfs/ows'
    + '?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature'
    + '&TYPENAMES=CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle'
    + '&BBOX=1.380000,50.060000,1.520000,50.130000,EPSG:4326'
    + '&OUTPUTFORMAT=application/json';

SV_TESTS.push({
    id: 'geojson-wfs-eu-parcels',
    label: 'GeoJSON WFS — Eu area bbox, ~13K parcels ~130K vertices — triggers desktop simplify (IGN Géoplateforme)',
    group: 'Live',
    type: 'visual',
    timeout: 30000,
    params: {
        geojson: WFS_EU,
        z: 13,
        x: 161300,
        y: 6482000
    },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received — sViewer did not start');
    }
});
