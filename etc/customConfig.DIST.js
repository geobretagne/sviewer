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
     * Geocoding service URL (address search)
     * Default: IGN Géoplateforme (French geoportal)
     * Requires CORS support from the service
     */
    openLSGeocodeUrl: "https://data.geopf.fr/geocodage/search",

    /**
     * Background layers (must be in EPSG:3857 Web Mercator)
     * Configure the base maps available in the layer switcher
     */
    layersBackground: [
        new ol.layer.Tile({
            source: new ol.source.XYZ({
                attributions: ['© IGNF BD ORTHO'],
                url: 'https://data.geopf.fr/tms/1.0.0/HR.ORTHOIMAGERY.ORTHOPHOTOS/{z}/{x}/{y}.jpeg',
                minZoom: 6,
                maxZoom: 19,
                crossOrigin: 'anonymous'
            }),
            title: 'Photos aériennes IGN'
        }),
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

    /**
     * Overlay layers displayed above all data layers (place names, cadastre outlines, etc.)
     * Cycled by the overlay button. Not queryable. Optional — omit or set [] to hide the button.
     */
    layersOverlay: [
        new ol.layer.Tile({
            source: new ol.source.XYZ({
                attributions: ['© IGN'],
                url: 'https://data.geopf.fr/tms/1.0.0/GEOGRAPHICALNAMES.NAMES/{z}/{x}/{y}.png',
                minZoom: 6,
                maxZoom: 18,
                crossOrigin: 'anonymous'
            }),
            opacity: 0.7,
            title: 'Noms de lieux IGN'
        })
    ]

};
