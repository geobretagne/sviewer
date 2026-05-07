/* Suite 05 — GeoJSON auto-simplify (live WFS load test)
 * Fetches real cadastral parcels from IGN Géoplateforme WFS (public, CORS-enabled).
 * BBOX over Eu (Seine-Maritime) — ~2200 parcels, MultiPolygon geometries.
 * group: 'Live' — network-dependent, run manually.
 */

var WFS_EU = 'https://data.geopf.fr/wfs/ows'
    + '?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature'
    + '&TYPENAMES=CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle'
    + '&BBOX=1.440196,50.090879,1.468349,50.106488,EPSG:4326'
    + '&OUTPUTFORMAT=application/json';

SV_TESTS.push({
    id: 'geojson-wfs-eu-parcels',
    label: 'GeoJSON WFS — commune Eu bbox, ~2200 parcels (IGN Géoplateforme)',
    group: 'Live',
    type: 'visual',
    timeout: 30000,
    params: {
        geojson: WFS_EU,
        z: 14,
        x: 161300,
        y: 6482000
    },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received — sViewer did not start');
    }
});
