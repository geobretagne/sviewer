/**
 * sViewer — Configuration Template
 *
 * Copy this file to customConfig.js and uncomment only the keys you want to override.
 * All values shown are the built-in defaults — no need to repeat unchanged ones.
 *
 *   cp local/customConfig.DIST.js local/customConfig.js
 *
 * Keys not listed here are URL parameters handled at runtime (?x=, ?y=, ?z=, ?layers=, etc.).
 * See TECHNICAL.md for the full parameter reference.
 */

customConfig = {

    // --- Identity ----------------------------------------------------------

    // title: 'sViewer',
    // lang: 'fr',                      // fr | en | es | de

    // --- geOrchestra integration -------------------------------------------
    // Layers from this SDI get enhanced features (legend, metadata, queryable).

    // geOrchestraBaseUrl: 'https://demo.georchestra.org',

    // --- Map extent (EPSG:3857) --------------------------------------------
    // initialExtent: shown on startup. maxExtent / restrictedExtent: pan/zoom limits.

    // initialExtent:      [-567000, 5047000, 1068000, 6639000],   // metropolitan France
    // maxExtent:          [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
    // restrictedExtent:   [-20037508.34, -20037508.34, 20037508.34, 20037508.34],

    // --- WMS GetFeatureInfo ------------------------------------------------

    // maxFeatures: 3,
    // nodata: '<!--nodatadetect-->\n<!--nodatadetect-->',

    // --- Geocoding ---------------------------------------------------------
    // Default: IGN Géoplateforme (France only).
    // Switch to Nominatim block below for worldwide coverage.

    // maxGeocodeResults: 5,
    // searchPlaceholder: 'adresse, lieu-dit, commune...',
    // openLSGeocodeUrl: 'https://data.geopf.fr/geocodage/search',
    // geocodeParams: {},
    // geocodeAdapter: function(response) {
    //     return (response.features || []).map(function(f) {
    //         var zoomByType = { municipality: 13, street: 17, housenumber: 18 };
    //         return {
    //             label: f.properties.label,
    //             coords: f.geometry.coordinates,
    //             score: f.properties.score || 0,
    //             zoom: zoomByType[f.properties.type] || 16
    //         };
    //     });
    // },

    // Nominatim (OpenStreetMap) — worldwide, no API key required.
    // Uncomment block below and comment out IGN block above to switch.
    // openLSGeocodeUrl: 'https://nominatim.openstreetmap.org/search',
    // geocodeParams: { format: 'json' },
    // geocodeAdapter: function(response) {
    //     return (response || []).map(function(r) {
    //         var zoomByType = { city: 12, town: 13, village: 14, road: 16, house: 18 };
    //         return {
    //             label: r.display_name,
    //             coords: [parseFloat(r.lon), parseFloat(r.lat)],
    //             score: 0.5,
    //             zoom: zoomByType[r.type] || 14
    //         };
    //     });
    // },

    // --- WFS search --------------------------------------------------------

    // maxWfsSearchFeatures: 3,

    // --- GPS tracking ------------------------------------------------------

    // gpsTrackingInterval: 5,    // seconds between position updates
    // gpsTrackingTimeout:  300,  // auto-stop after N seconds (0 = never)

    // --- GeoJSON style -----------------------------------------------------

    // geojsonStyle: {
    //     color:       '#ff6600',
    //     fillOpacity: 0.35,
    //     strokeWidth: 2.5
    // },

    // --- Adapters ----------------------------------------------------------
    // Each name maps to connectors/{name}/adapter.js.
    // Available: 'grist', 'csv'. Empty = no adapter loaded.

    // adapters: [],

    // --- Domain allowlist --------------------------------------------------
    // Restrict which OGC service hostnames are permitted.
    // Absent or empty = all domains allowed (default).
    // Example: ['geobretagne.fr', 'data.geopf.fr'] also allows subdomains.

    // allowedDomains: [],

    // --- Background layers -------------------------------------------------
    // WARNING: layersBackground, layersOverlay, and backgroundPresets replace
    // hardConfig wholesale. Override all three together or none.

    // layersBackground: [
    //     // [0] IGN aerial photo
    //     new ol.layer.Tile({
    //         source: new ol.source.WMTS((function() {
    //             var proj = ol.proj.get('EPSG:3857');
    //             var ext  = proj.getExtent();
    //             var res  = [156543.03392811998,78271.51696419998,39135.758481959984,19567.879241008988,9783.939620504494,4891.969810252247,2445.9849051261233,1222.9924525765016,611.4962262882508,305.74811314412537,152.87405657206268,76.43702828603134,38.21851414301567,19.109257071507836,9.554628535753918,4.777314267876959,2.3886571339384795,1.1943285669692398,0.5971642834846199,0.29858214174231994];
    //             var ids  = ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19'];
    //             return {
    //                 attributions: ['IGN-F/Géoportail'],
    //                 url: 'https://data.geopf.fr/wmts',
    //                 layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
    //                 matrixSet: 'PM', format: 'image/jpeg', projection: proj,
    //                 tileGrid: new ol.tilegrid.WMTS({ origin: ol.extent.getTopLeft(ext), resolutions: res, matrixIds: ids }),
    //                 style: 'normal', crossOrigin: 'anonymous'
    //             };
    //         })()),
    //         title: 'Photo aérienne (BDORTHO)'
    //     }),
    //     // [1] OpenStreetMap
    //     new ol.layer.Tile({
    //         source: new ol.source.OSM(),
    //         title: 'OpenStreetMap'
    //     })
    // ],

    // layersOverlay: [
    //     // [0] IGN place names
    //     new ol.layer.Tile({
    //         source: new ol.source.XYZ({
    //             attributions: ['IGN-F/Géoportail'],
    //             url: 'https://data.geopf.fr/tms/1.0.0/GEOGRAPHICALNAMES.NAMES/{z}/{x}/{y}.png',
    //             minZoom: 6, maxZoom: 18, crossOrigin: 'anonymous'
    //         }),
    //         opacity: 1,
    //         title: 'Noms de lieux (IGN)'
    //     })
    // ],

    // backgroundPresets: [
    //     { lb: 0, lo: -1, title: 'Photo aérienne' },
    //     { lb: 0, lo: 0,  title: 'Photo aérienne + noms de lieux' },
    //     { lb: 1, lo: -1, title: 'OpenStreetMap' }
    // ]

};
