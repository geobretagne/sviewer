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
 *
 * KEEP IN SYNC with rebuildLayer() / onRecord() in widget.js — same modes, same
 * candidates, same coordinate order. Any geometry logic change must be applied
 * to both files.
 */
(function() {
    'use strict';

    // Column name candidates tried in order during auto-detection.
    var GEOM_CANDIDATES = ['geometry', 'geom', 'geo', 'shape', 'wkb_geometry'];
    var LAT_CANDIDATES  = ['latitude', 'lat'];
    var LON_CANDIDATES  = ['longitude', 'lon', 'lng'];

    // Parse a GeoJSON geometry from a raw field value.
    // Accepts an object or a JSON string. Returns null if not a valid geometry.
    function parseGeom(val) {
        if (!val) { return null; }
        var g = (typeof val === 'string') ? (function() { try { return JSON.parse(val); } catch(e) { return null; } }()) : val;
        if (g && g.type && g.coordinates) { return g; }
        return null;
    }

    var WKT_RE = /^\s*(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)\s*[Z(M]/i;

    // Parse a WKT string into a GeoJSON geometry. Returns null on failure.
    function parseWkt(val) {
        if (typeof val !== 'string' || !WKT_RE.test(val)) { return null; }
        try {
            var wktFmt = new ol.format.WKT();
            var gjFmt  = new ol.format.GeoJSON();
            var olGeom = wktFmt.readGeometry(val, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:4326' });
            return JSON.parse(gjFmt.writeGeometry(olGeom));
        } catch(e) { return null; }
    }

    // Find the first column in `row` that looks like a GeoJSON or WKT geometry.
    // Returns { key, isWkt } or null.
    function detectGeomKey(row) {
        var keys = Object.keys(row);
        var lower = keys.map(function(k) { return k.toLowerCase(); });
        var found = null;
        GEOM_CANDIDATES.forEach(function(c) {
            if (!found && lower.indexOf(c) !== -1) { found = keys[lower.indexOf(c)]; }
        });
        if (found) {
            var v = row[found];
            return { key: found, isWkt: (typeof v === 'string' && WKT_RE.test(v)) };
        }
        // Fallback: scan field values for parseable GeoJSON or WKT.
        for (var i = 0; i < keys.length; i++) {
            var val = row[keys[i]];
            if (parseGeom(val)) { return { key: keys[i], isWkt: false }; }
            if (parseWkt(val))  { return { key: keys[i], isWkt: true  }; }
        }
        return null;
    }

    // Find lat/lon column pair by name (case-insensitive).
    // Returns { latKey, lonKey } or null if either is missing.
    function detectLatLon(row) {
        var keys = Object.keys(row);
        var lower = keys.map(function(k) { return k.toLowerCase(); });
        var latKey = null, lonKey = null;
        LAT_CANDIDATES.forEach(function(c) { if (!latKey && lower.indexOf(c) !== -1) { latKey = keys[lower.indexOf(c)]; } });
        LON_CANDIDATES.forEach(function(c) { if (!lonKey && lower.indexOf(c) !== -1) { lonKey = keys[lower.indexOf(c)]; } });
        return (latKey && lonKey) ? { latKey: latKey, lonKey: lonKey } : null;
    }

    // Core conversion: Grist records response → GeoJSON FeatureCollection.
    // sourceUrl is the ?geojson= fetch URL; hints are read from its query string.
    function convert(response, sourceUrl) {

        // Read widget-encoded hints from the URL query string.
        // The Grist widget writes these via buildGristGeojsonUrl() in widget.js
        // so that standalone sViewer replicates the exact geometry column choice
        // made in the widget — without re-running auto-detection.
        var hints = { mode: null, geomcol: null, collat: null, collon: null, labelcol: null };
        if (sourceUrl) {
            try {
                var u = new URL(sourceUrl);
                hints.mode    = u.searchParams.get('_geommode') || null;
                hints.geomcol = u.searchParams.get('_geomcol')  || null;
                hints.collat  = u.searchParams.get('_collat')   || null;
                hints.collon  = u.searchParams.get('_collon')   || null;
                hints.labelcol= u.searchParams.get('_labelcol') || null;
            } catch(e) { /* malformed URL — ignore hints, fall through to auto-detect */ }
        }

        // Flatten Grist envelope: { records: [{id, fields:{…}}] } → array of field objects.
        // Also accepts a bare array (non-Grist generic JSON APIs).
        var rows = (response.records || []).map(function(r) { return r.fields || r; });
        if (!rows.length && Array.isArray(response)) { rows = response; }
        if (!rows.length) { return { type: 'FeatureCollection', features: [] }; }

        var features = rows.map(function(f) {
            var geom = null;
            // Track which columns were consumed as geometry so they are excluded from properties.
            var excludeKeys = {};
            var mode = hints.mode;

            if (mode === 'latlon' && hints.collat && hints.collon) {
                // Two separate numeric columns: latitude + longitude.
                var lat = parseFloat(f[hints.collat]);
                var lon = parseFloat(f[hints.collon]);
                if (isNaN(lat) || isNaN(lon)) { return null; }
                geom = { type: 'Point', coordinates: [lon, lat] }; // GeoJSON = [lon, lat]
                excludeKeys[hints.collat] = true;
                excludeKeys[hints.collon] = true;

            } else if ((mode === 'latlon_str' || mode === 'lonlat_str') && hints.geomcol) {
                // Single text column: "lat,lon" (latlon_str) or "lon,lat" (lonlat_str).
                var val = f[hints.geomcol];
                if (typeof val === 'string') {
                    var parts = val.split(',');
                    if (parts.length === 2) {
                        var a = parseFloat(parts[0].trim()), b = parseFloat(parts[1].trim());
                        if (!isNaN(a) && !isNaN(b)) {
                            // latlon_str: a=lat, b=lon → GeoJSON [lon, lat] = [b, a]
                            // lonlat_str: a=lon, b=lat → GeoJSON [lon, lat] = [a, b]
                            geom = mode === 'latlon_str'
                                ? { type: 'Point', coordinates: [b, a] }
                                : { type: 'Point', coordinates: [a, b] };
                        }
                    }
                }
                excludeKeys[hints.geomcol] = true;

            } else if (mode === 'wkt' && hints.geomcol) {
                // WKT string: round-trip through OL to get a GeoJSON geometry object.
                // dataProjection and featureProjection both EPSG:4326 — WKT is geographic,
                // output stays geographic; sviewer.js reprojects to 3857 when loading.
                var wktVal = f[hints.geomcol];
                if (typeof wktVal === 'string') {
                    try {
                        var wktFmt = new ol.format.WKT();
                        var olGeom = wktFmt.readGeometry(wktVal, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:4326' });
                        var gjFmt = new ol.format.GeoJSON();
                        geom = JSON.parse(gjFmt.writeGeometry(olGeom));
                    } catch(e) { return null; } // invalid WKT — skip row
                }
                excludeKeys[hints.geomcol] = true;

            } else if ((mode === 'geojson' || !mode) && hints.geomcol) {
                // Explicit GeoJSON column hint (or mode omitted but geomcol provided).
                geom = parseGeom(f[hints.geomcol]);
                excludeKeys[hints.geomcol] = true;

            } else {
                // No usable hints — auto-detect from the first row's column names and values.
                // Detection runs on rows[0] (not f) so every row uses the same column choice.
                var geomInfo = detectGeomKey(rows[0]);
                var latlon   = geomInfo ? null : detectLatLon(rows[0]);
                if (geomInfo) {
                    geom = geomInfo.isWkt ? parseWkt(f[geomInfo.key]) : parseGeom(f[geomInfo.key]);
                    excludeKeys[geomInfo.key] = true;
                } else if (latlon) {
                    var lat2 = parseFloat(f[latlon.latKey]);
                    var lon2 = parseFloat(f[latlon.lonKey]);
                    if (isNaN(lat2) || isNaN(lon2)) { return null; }
                    geom = { type: 'Point', coordinates: [lon2, lat2] };
                    excludeKeys[latlon.latKey] = true;
                    excludeKeys[latlon.lonKey] = true;
                }
            }

            if (!geom) { return null; } // no geometry found — row produces no feature

            // All non-geometry columns become GeoJSON properties.
            var props = {};
            Object.keys(f).forEach(function(k) { if (!excludeKeys[k]) { props[k] = f[k]; } });
            var feat = { type: 'Feature', geometry: geom, properties: props };

            // _label is read by sviewer.js to render text labels on features.
            if (hints.labelcol && f[hints.labelcol] !== undefined) { feat.properties._label = f[hints.labelcol]; }
            return feat;
        }).filter(Boolean); // remove nulls (rows with no valid geometry)

        return { type: 'FeatureCollection', features: features };
    }

    // Register in the global adapter registry.
    // sviewer.js iterates window.SViewerAdapters, calls match(url) then convert().
    window.SViewerAdapters = window.SViewerAdapters || {};
    window.SViewerAdapters['grist'] = {
        // Only activate for Grist records API URLs — path pattern is unambiguous.
        match: function(url) {
            return typeof url === 'string' && /\/api\/docs\/[^/]+\/tables\/[^/]+\/records/.test(url);
        },
        label: function(url) {
            var m = url.match(/\/tables\/([^/?#]+)\/records/);
            return 'Grist — ' + (m ? decodeURIComponent(m[1]) : url);
        },
        convert: convert
    };
}());
