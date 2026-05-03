/**
 * sViewer adapter — Grist public records API
 *
 * Converts Grist API responses to GeoJSON FeatureCollections.
 * Registered as window.SViewerAdapters['grist'].
 *
 * Activated via customConfig.js:  adapters: ['grist']
 *
 * Input:  { records: [ { id, fields: { geometry: '{"type":...}', col1, … } } ] }
 * Output: GeoJSON FeatureCollection (EPSG:4326)
 *
 * URL hints (added by the sViewer Grist widget in the ?geojson= URL):
 *   _geommode  — geojson | latlon | latlon_str | lonlat_str | wkt
 *   _geomcol   — column name for geometry / WKT / text coordinates
 *   _collat    — latitude column (latlon mode)
 *   _collon    — longitude column (latlon mode)
 *   _labelcol  — column used as feature label (_label property)
 *
 * When hints are absent, geometry is auto-detected from column names and values.
 */
(function() {
    'use strict';

    var GEOM_CANDIDATES = ['geometry', 'geom', 'geo', 'shape', 'wkb_geometry'];
    var LAT_CANDIDATES  = ['latitude', 'lat'];
    var LON_CANDIDATES  = ['longitude', 'lon', 'lng'];

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
        for (var i = 0; i < keys.length; i++) {
            if (parseGeom(row[keys[i]])) { return keys[i]; }
        }
        return null;
    }

    function detectLatLon(row) {
        var keys = Object.keys(row);
        var lower = keys.map(function(k) { return k.toLowerCase(); });
        var latKey = null, lonKey = null;
        LAT_CANDIDATES.forEach(function(c) { if (!latKey && lower.indexOf(c) !== -1) { latKey = keys[lower.indexOf(c)]; } });
        LON_CANDIDATES.forEach(function(c) { if (!lonKey && lower.indexOf(c) !== -1) { lonKey = keys[lower.indexOf(c)]; } });
        return (latKey && lonKey) ? { latKey: latKey, lonKey: lonKey } : null;
    }

    function convert(response, sourceUrl) {
        var hints = { mode: null, geomcol: null, collat: null, collon: null, labelcol: null };
        if (sourceUrl) {
            try {
                var u = new URL(sourceUrl);
                hints.mode    = u.searchParams.get('_geommode') || null;
                hints.geomcol = u.searchParams.get('_geomcol')  || null;
                hints.collat  = u.searchParams.get('_collat')   || null;
                hints.collon  = u.searchParams.get('_collon')   || null;
                hints.labelcol= u.searchParams.get('_labelcol') || null;
            } catch(e) { /* malformed URL — ignore hints */ }
        }

        var rows = (response.records || []).map(function(r) { return r.fields || r; });
        if (!rows.length && Array.isArray(response)) { rows = response; }
        if (!rows.length) { return { type: 'FeatureCollection', features: [] }; }

        var features = rows.map(function(f) {
            var geom = null;
            var excludeKeys = {};
            var mode = hints.mode;

            if (mode === 'latlon' && hints.collat && hints.collon) {
                var lat = parseFloat(f[hints.collat]);
                var lon = parseFloat(f[hints.collon]);
                if (isNaN(lat) || isNaN(lon)) { return null; }
                geom = { type: 'Point', coordinates: [lon, lat] };
                excludeKeys[hints.collat] = true;
                excludeKeys[hints.collon] = true;

            } else if ((mode === 'latlon_str' || mode === 'lonlat_str') && hints.geomcol) {
                var val = f[hints.geomcol];
                if (typeof val === 'string') {
                    var parts = val.split(',');
                    if (parts.length === 2) {
                        var a = parseFloat(parts[0].trim()), b = parseFloat(parts[1].trim());
                        if (!isNaN(a) && !isNaN(b)) {
                            geom = mode === 'latlon_str'
                                ? { type: 'Point', coordinates: [b, a] }
                                : { type: 'Point', coordinates: [a, b] };
                        }
                    }
                }
                excludeKeys[hints.geomcol] = true;

            } else if (mode === 'wkt' && hints.geomcol) {
                var wktVal = f[hints.geomcol];
                if (typeof wktVal === 'string') {
                    try {
                        var wktFmt = new ol.format.WKT();
                        var olGeom = wktFmt.readGeometry(wktVal, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:4326' });
                        var gjFmt = new ol.format.GeoJSON();
                        geom = JSON.parse(gjFmt.writeGeometry(olGeom));
                    } catch(e) { return null; }
                }
                excludeKeys[hints.geomcol] = true;

            } else if ((mode === 'geojson' || !mode) && hints.geomcol) {
                geom = parseGeom(f[hints.geomcol]);
                excludeKeys[hints.geomcol] = true;

            } else {
                var geomKey = detectGeomKey(rows[0]);
                var latlon  = geomKey ? null : detectLatLon(rows[0]);
                if (geomKey) {
                    geom = parseGeom(f[geomKey]);
                    excludeKeys[geomKey] = true;
                } else if (latlon) {
                    var lat2 = parseFloat(f[latlon.latKey]);
                    var lon2 = parseFloat(f[latlon.lonKey]);
                    if (isNaN(lat2) || isNaN(lon2)) { return null; }
                    geom = { type: 'Point', coordinates: [lon2, lat2] };
                    excludeKeys[latlon.latKey] = true;
                    excludeKeys[latlon.lonKey] = true;
                }
            }

            if (!geom) { return null; }
            var props = {};
            Object.keys(f).forEach(function(k) { if (!excludeKeys[k]) { props[k] = f[k]; } });
            var feat = { type: 'Feature', geometry: geom, properties: props };
            if (hints.labelcol && f[hints.labelcol] !== undefined) { feat.properties._label = f[hints.labelcol]; }
            return feat;
        }).filter(Boolean);

        return { type: 'FeatureCollection', features: features };
    }

    window.SViewerAdapters = window.SViewerAdapters || {};
    window.SViewerAdapters['grist'] = {
        // Matches Grist API record endpoints: /api/docs/{docId}/tables/{table}/records
        match: function(url) {
            return typeof url === 'string' && /\/api\/docs\/[^/]+\/tables\/[^/]+\/records/.test(url);
        },
        convert: convert
    };
}());
