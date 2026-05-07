/* Suite 05 — GeoJSON auto-simplify (live WFS load test)
 * Fetches real cadastral parcels from IGN Géoplateforme WFS (public, CORS-enabled).
 * Commune Eu (Seine-Maritime) — 5161 parcels, ~50K vertices — hits mobile simplify threshold.
 * group: 'Live' — network-dependent, run manually.
 */

var WFS_EU = 'https://data.geopf.fr/wfs/ows'
    + '?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature'
    + '&TYPENAMES=CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle'
    + "&CQL_FILTER=nom_com='Eu'"
    + '&OUTPUTFORMAT=application/json';

// Brest center in EPSG:3857 — replaced by Eu coords: lon=1.42, lat=50.05
var EU_CENTER = { x: 158100, y: 6480000, z: 14 };

SV_TESTS.push({
    id: 'geojson-wfs-eu-parcels',
    label: 'GeoJSON WFS — commune Eu, 5161 parcels (~50K vertices, IGN Géoplateforme)',
    group: 'Live',
    type: 'visual',
    timeout: 30000,
    params: {
        geojson: WFS_EU,
        z: EU_CENTER.z,
        x: EU_CENTER.x,
        y: EU_CENTER.y
    },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received — sViewer did not start');
    }
});
