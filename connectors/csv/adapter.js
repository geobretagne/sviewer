/**
 * sViewer adapter — CSV
 *
 * Converts a CSV text response to a GeoJSON FeatureCollection.
 * Registered as window.SViewerAdapters['csv'].
 *
 * Activated via customConfig.js:  adapters: ['csv']
 *
 * Input:  raw CSV text (UTF-8, comma or semicolon separated, optional BOM,
 *         first row = header)
 * Output: GeoJSON FeatureCollection (EPSG:4326)
 *
 * URL hints (same system as grist adapter, appended to the ?geojson= URL):
 *   _format    — must be 'csv' when URL has no .csv extension (e.g. data.gouv.fr redirects)
 *   _geomcol   — column name for GeoJSON geometry or WKT
 *   _geommode  — geojson | latlon | latlon_str | lonlat_str | wkt
 *   _collat    — latitude column (latlon mode)
 *   _collon    — longitude column (latlon mode)
 *   _labelcol  — column used as feature label (_label property)
 *
 * When hints are absent, geometry is auto-detected from column names and values.
 * Same detection logic as connectors/grist/adapter.js — keep in sync.
 *
 * CORS required: the CSV file must be served with Access-Control-Allow-Origin.
 * Known compatible sources: data.gouv.fr (static.data.gouv.fr), GitHub raw,
 * Google Sheets published CSV.
 *
 * Encoding: UTF-8 only. No automatic charset detection — same constraint as CORS
 * (both require modern server config; the operator who enables CORS can also set
 * Content-Type: text/csv; charset=utf-8).
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

    // Find the first column in `row` that looks like a GeoJSON geometry.
    // Tries GEOM_CANDIDATES by name first (case-insensitive), then scans values.
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

    // Parse CSV text into an array of row objects keyed by header columns.
    // Handles: UTF-8 BOM, comma and semicolon separators, CRLF and LF,
    // double-quoted fields (including fields containing the separator or newlines),
    // escaped quotes ("" inside quoted fields).
    function parseCSV(text) {
        // Strip UTF-8 BOM if present.
        if (text.charCodeAt(0) === 0xFEFF) { text = text.slice(1); }
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Auto-detect separator: semicolon wins if more frequent in first line than comma.
        var firstLine = text.split('\n')[0] || '';
        var sep = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';

        // Tokenise one CSV line into an array of field strings.
        // Handles quoted fields spanning multiple characters; does NOT handle
        // fields containing literal newlines (rare, out of scope for sViewer).
        function splitLine(line) {
            var fields = [];
            var i = 0;
            while (i < line.length) {
                if (line[i] === '"') {
                    // Quoted field: consume until closing quote, unescape "" → "
                    var val = '';
                    i++; // skip opening quote
                    while (i < line.length) {
                        if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
                        else if (line[i] === '"') { i++; break; }
                        else { val += line[i++]; }
                    }
                    fields.push(val);
                    if (line[i] === sep) { i++; } // skip separator after closing quote
                } else {
                    // Unquoted field: read until separator or end of line.
                    var start = i;
                    while (i < line.length && line[i] !== sep) { i++; }
                    fields.push(line.slice(start, i));
                    if (line[i] === sep) { i++; }
                }
            }
            return fields;
        }

        var lines = text.split('\n');
        // Skip empty trailing lines.
        while (lines.length && !lines[lines.length - 1].trim()) { lines.pop(); }
        if (lines.length < 2) { return []; } // no data rows

        var headers = splitLine(lines[0]).map(function(h) { return h.trim(); });
        var rows = [];
        for (var i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) { continue; }
            var vals = splitLine(lines[i]);
            var row = {};
            headers.forEach(function(h, idx) { row[h] = vals[idx] !== undefined ? vals[idx] : ''; });
            rows.push(row);
        }
        return rows;
    }

    // Core conversion: CSV text → GeoJSON FeatureCollection.
    // response is a raw string. sourceUrl carries optional geometry hints.
    function convert(response, sourceUrl) {
        if (typeof response !== 'string') { return null; }

        // Read geometry hints from URL query string (same system as grist adapter).
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

        var rows = parseCSV(response);
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
                // Auto-detect from first row column names and values.
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

    // Register in the global adapter registry.
    // wantsText: true signals sviewer.js to fetch this URL as text, not JSON.
    window.SViewerAdapters = window.SViewerAdapters || {};
    window.SViewerAdapters['csv'] = {
        // Activate for .csv URLs or when user appends &_format=csv for extension-less URLs.
        match: function(url) {
            return typeof url === 'string' && (
                /\.csv(\?|#|$)/i.test(url) ||
                /[?&]_format=csv(&|$)/.test(url)
            );
        },
        label: function(url) {
            try { return decodeURIComponent(new URL(url).pathname.split('/').pop()) || 'CSV'; }
            catch(e) { return 'CSV'; }
        },
        // Signal to sviewer.js dispatcher that this adapter needs raw text, not parsed JSON.
        wantsText: true,
        convert: convert
    };
}());
