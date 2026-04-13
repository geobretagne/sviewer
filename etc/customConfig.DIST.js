customConfig = {
    title: 'geOrchestra mobile',

    /**
     * force default language, see etc/i18n.js
     */
    // lang: 'fr',

    /**
     * base url of the geOrchetra SDI. Layers coming from this SDI
     * will have enhanced features.
     */
    geOrchestraBaseUrl: 'https://sdi.georchestra.org/',

    /**
     * projection
     */
    projcode: 'EPSG:3857',

    /**
     * map bounds
     */
    initialExtent: [-12880000,-1080000,5890000,7540000],
    maxExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
    restrictedExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],

    /**
     * getFeatureInfo control
     */
    maxFeatures: 10,
    nodata: '<!--nodatadetect-->\n<!--nodatadetect-->',

    /**
     * IGN Géoplateforme geocoding (replaces former OpenLS/gpp3-wxs.ign.fr)
     * Docs: https://geoservices.ign.fr/documentation/services/api-et-services-ogc/geocodage
     */
    openLSGeocodeUrl: "https://data.geopf.fr/geocodage/search",

    /**
     * background layers (EPSG:3857)
     */
    layersBackground: [
        new ol.layer.Tile({
              source: new ol.source.OSM()
        }),
        new ol.layer.Tile({
            source: new ol.source.TileWMS({
                url: 'https://sdi.georchestra.org/geoserver/dem/wms',
                params: {
                    'LAYERS': 'altitude',
                    'TILED': true
                },
                extent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
                attributions: ['tiles from geOrchestra, data <a href="https://www.cgiar-csi.org/data/srtm-90m-digital-elevation-database-v4-1">(c) CGIAR-CSI</a>']
            })
        }),
        new ol.layer.Tile({
            source: new ol.source.TileWMS({
                url: 'https://sdi.georchestra.org/geoserver/unearthedoutdoors/wms',
                params: {
                    'LAYERS': 'truemarble',
                    'TILED': true
                },
                extent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
                attributions: ['tiles from geOrchestra, data <a href="https://www.unearthedoutdoors.net/global_data/true_marble/">(c) Unearthed Outdoors</a>']
            })
        }),
        new ol.layer.Tile({
            source: new ol.source.TileWMS({
                url: 'https://sdi.georchestra.org/geoserver/nasa/wms',
                params: {
                    'LAYERS': 'night_2012',
                    'TILED': true
                },
                extent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
                attributions: ['tiles from geOrchestra, data <a href="https://earthobservatory.nasa.gov/Features/NightLights/page3.php">(c) NASA</a>']
            })
        })
    ],

    /**
     * social media links (prefixes)
     */
    socialMedia: {
        'Twitter'  : 'https://twitter.com/intent/tweet?text=',
        'LinkedIn' : 'https://www.linkedin.com/sharing/share-offsite/?url=',
        'Facebook' : 'https://www.facebook.com/sharer/sharer.php?u='
    }
};
