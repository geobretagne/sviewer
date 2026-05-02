/**
 * sViewer Configuration Template
 *
 * This is the default template configuration file for sViewer.
 * Copy this file to customConfig.js and edit it to suit your needs.
 *
 * Usage:
 *   cp etc/customConfig.DIST.js etc/customConfig.js
 *   then edit customConfig.js with your settings
 */

customConfig = {
    /**
     * Map title displayed at the top
     */
    title: 'GeoBretagne sviewer',

    /**
     * Default language (see etc/i18n.js for available languages)
     * Supported: en, fr, es, de, ru
     */
    lang: 'fr',

    /**
     * Base URL of the geOrchestra SDI
     * Layers coming from this SDI will have enhanced features
     * (legend, metadata, queryable layers, etc.)
     */
    geOrchestraBaseUrl: 'https://geobretagne.fr',

    /**
     * Map extent bounds (EPSG:3857 / Web Mercator)
     * [minX, minY, maxX, maxY]
     * initialExtent: shown on startup
     * maxExtent: limits of map panning
     * restrictedExtent: limits of map zooming
     */
    initialExtent: [-582000,5977000,-104000,6268000],
    maxExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
    restrictedExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],

    /**
     * getFeatureInfo control (WMS GetFeatureInfo queries)
     */
    maxFeatures: 3,
    nodata: '<!--nodatadetect-->\n<!--nodatadetect-->',

    /**
     * Maximum address suggestions returned by geocoding (address search box)
     */
    maxGeocodeResults: 4,

    /**
     * Maximum results returned per layer by WFS feature search (?s=1)
     */
    maxWfsSearchFeatures: 4,

    /**
     * Optional: override search input placeholder (otherwise uses i18n default)
     */
    searchPlaceholder: 'ex: place Guérin, Brest',

    /**
     * GPS tracking: interval in seconds between position updates (?position=1)
     */
    gpsTrackingInterval: 5,

    /**
     * GPS tracking: auto-stop after this many seconds (0 = never auto-stop)
     */
    gpsTrackingTimeout: 300,

    /**
     * Default opacity for all non-background layers when ?opacity= param is absent (0–1)
     */
    layerOpacity: 1,

    /**
     * Style for GeoJSON vector layers loaded via ?geojson=
     * color: stroke color and point fill (CSS color string)
     * fillOpacity: polygon fill opacity (0–1)
     * strokeWidth: line and polygon stroke width in pixels
     */
    geojsonStyle: {
        color: '#3388ff',
        fillOpacity: 0.2,
        strokeWidth: 2
    },

    /**
     * Adapter for non-GeoJSON JSON sources loaded via ?geojson=
     * Called when the fetched response is not a GeoJSON FeatureCollection.
     * Must return a GeoJSON FeatureCollection object.
     *
     * Default: Grist public records API format.
     * Replace with any function to support ArcGIS REST, custom APIs, etc.
     * Requires CORS support from the remote service.
     *
     * Geometry column auto-detection (first match wins):
     *   name candidates: geometry, geom, geo, shape, wkb_geometry
     *   fallback: first column whose value parses as a GeoJSON geometry object
     *
     * Geometry values must be GeoJSON geometry objects (EPSG:4326).
     * Supports Point, LineString, Polygon, Multi* — anything OL can read.
     *
     * Note: only the first page of paginated APIs is fetched — no pagination support.
     */
    jsonLayerAdapter: function(response) {
        var GEOM_CANDIDATES = ['geometry', 'geom', 'geo', 'shape', 'wkb_geometry'];

        function parseGeom(val) {
            if (!val) { return null; }
            var g = (typeof val === 'string') ? (function() { try { return JSON.parse(val); } catch(e) { return null; } }()) : val;
            if (g && g.type && g.coordinates) { return g; }
            return null;
        }

        function detectGeomKey(row) {
            var keys = Object.keys(row);
            var lower = keys.map(function(k) { return k.toLowerCase(); });
            var found = null;
            GEOM_CANDIDATES.forEach(function(c) {
                if (!found && lower.indexOf(c) !== -1) { found = keys[lower.indexOf(c)]; }
            });
            if (found) { return found; }
            // Fallback: scan values for parseable geometry
            for (var i = 0; i < keys.length; i++) {
                if (parseGeom(row[keys[i]])) { return keys[i]; }
            }
            return null;
        }

        // Grist: { records: [{id, fields: {...}}] }
        var rows = (response.records || []).map(function(r) { return r.fields || r; });
        // Fallback: plain array of objects
        if (!rows.length && Array.isArray(response)) { rows = response; }
        if (!rows.length) { return { type: 'FeatureCollection', features: [] }; }

        var geomKey = detectGeomKey(rows[0]);
        if (!geomKey) { return { type: 'FeatureCollection', features: [] }; }

        var features = rows.map(function(f) {
            var geom = parseGeom(f[geomKey]);
            if (!geom) { return null; }
            return { type: 'Feature', geometry: geom, properties: f };
        }).filter(Boolean);
        return { type: 'FeatureCollection', features: features };
    },

    /**
     * Geocoding service (address search).
     * openLSGeocodeUrl: endpoint URL.
     * geocodeParams: extra query params appended to every request (beyond q, limit, bbox).
     * geocodeAdapter: normalizes the response into [{label, coords:[lon,lat], score, zoom}].
     *
     * Default: IGN Géoplateforme (France). Switch to Nominatim block below for worldwide coverage.
     * Requires CORS support from the service.
     */
    openLSGeocodeUrl: "https://data.geopf.fr/geocodage/search",
    geocodeParams: {},
    geocodeAdapter: function(response) {
        return (response.features || []).map(function(f) {
            var zoomByType = { municipality: 13, street: 17, housenumber: 18 };
            return {
                label: f.properties.label,
                coords: f.geometry.coordinates,
                score: f.properties.score || 0,
                zoom: zoomByType[f.properties.type] || 16
            };
        });
    },

    // Nominatim (OpenStreetMap) — worldwide coverage, no API key required.
    // Uncomment the block below and comment out the IGN block above to switch.
    // openLSGeocodeUrl: "https://nominatim.openstreetmap.org/search",
    // geocodeParams: { format: "json" },
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

    /**
     * Domain allowlist for external OGC services (WMS, WFS, CSW).
     * Only hostnames matching an entry (exact or subdomain) are permitted.
     * Absent or empty array = all domains allowed (default, backward compatible).
     * Example: ['geobretagne.fr', 'data.geopf.fr'] also allows sub.geobretagne.fr
     */
    // allowedDomains: [],

    /**
     * Layer pools used by backgroundPresets below.
     * layersBackground: base maps (opaque, mutually exclusive).
     * layersOverlay: label/annotation layers shown above data (not queryable). Optional.
     *
     * @deprecated layersBackground alone (without backgroundPresets) still works for backward
     *   compatibility: the background button cycles through backgrounds, no overlay support.
     *   New configs should always define backgroundPresets.
     */
    layersBackground: [
        // [0] Photo aérienne IGN
        new ol.layer.Tile({
            source: new ol.source.WMTS((function() {
                var proj = ol.proj.get('EPSG:3857');
                var ext = proj.getExtent();
                var res = [156543.03392811998,78271.51696419998,39135.758481959984,19567.879241008988,9783.939620504494,4891.969810252247,2445.9849051261233,1222.9924525765016,611.4962262882508,305.74811314412537,152.87405657206268,76.43702828603134,38.21851414301567,19.109257071507836,9.554628535753918,4.777314267876959,2.3886571339384795,1.1943285669692398,0.5971642834846199,0.29858214174231994];
                return {
                    attributions: ['© IGNF BD ORTHO'],
                    url: 'https://data.geopf.fr/wmts',
                    layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
                    matrixSet: 'PM',
                    format: 'image/jpeg',
                    projection: proj,
                    tileGrid: new ol.tilegrid.WMTS({
                        origin: ol.extent.getTopLeft(ext),
                        resolutions: res,
                        matrixIds: ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19']
                    }),
                    style: 'normal',
                    crossOrigin: 'anonymous'
                };
            })()),
            title: 'Photos aériennes IGN'
        }),
        // [1] Carte OpenStreetMap
        new ol.layer.Tile({
            source: new ol.source.XYZ({
                attributions: ['Contributeurs OpenStreetmap'],
                url: 'https://tile.geobretagne.fr/osm/tms/osm:grey/EPSG3857/{z}/{x}/{-y}.png',
                maxResolution: 78271.51696402048,
                crossOrigin: 'anonymous'
            }),
            title: 'Carte OpenStreetmap'
        })
    ],

    layersOverlay: [
        // [0] Noms de lieux IGN
        new ol.layer.Tile({
            source: new ol.source.XYZ({
                attributions: ['© IGN'],
                url: 'https://data.geopf.fr/tms/1.0.0/GEOGRAPHICALNAMES.NAMES/{z}/{x}/{y}.png',
                minZoom: 6,
                maxZoom: 18,
                crossOrigin: 'anonymous'
            }),
            opacity: 1,
            title: 'Noms de lieux IGN'
        })
    ],

    /**
     * Background presets — single cycle button replaces the old background + overlay buttons.
     * Each preset sets background (lb = layersBackground index) and overlay (lo = layersOverlay
     * index, or -1 for none) atomically. Button hidden if fewer than 2 presets.
     * Omit or set [] to fall back to legacy behavior (background button cycles layersBackground only).
     */
    backgroundPresets: [
        { lb: 0, lo: 0  },  // Photo aérienne + étiquettes
        { lb: 0, lo: -1 },  // Photo aérienne, sans étiquettes
        { lb: 1, lo: -1 }   // Carte
    ]

};
