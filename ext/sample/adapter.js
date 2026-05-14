/**
 * sViewer adapter — SAMPLE / TEMPLATE
 *
 * THIS IS A REFERENCE IMPLEMENTATION — not intended for production use.
 * Copy this file to ext/{yourname}/adapter.js and adapt it.
 *
 * Demonstrates the minimal extension adapter pattern:
 *   - How to register in the adapter registry
 *   - How to implement match() and convert()
 *   - How to read geometry hints from the URL
 *   - How to build a GeoJSON FeatureCollection from a flat JSON array
 *
 * Input: a flat JSON array of objects, each with latitude + longitude fields.
 *   Example: [{ "name": "Paris", "latitude": 48.85, "longitude": 2.35 }, …]
 *
 * This format is intentionally simple — real extensions handle more complex
 * envelopes (see ext/grist/adapter.js for a production example).
 *
 * Activated via customConfig.js:  adapters: ['sample']
 * Trigger URL:  ?geojson=https://example.com/data.json&_format=sample
 *
 * URL hints supported:
 *   _format=sample  — required when URL has no recognisable pattern
 *   _collat         — latitude column name  (default: 'latitude')
 *   _collon         — longitude column name (default: 'longitude')
 *   _labelcol       — column used as map label (_label property)
 */
(function() {
    'use strict';

    // ---------------------------------------------------------------------------
    // STEP 1 — implement convert(response, sourceUrl)
    //
    // response   : already-parsed JS object (wantsText is absent → fetch parsed JSON)
    // sourceUrl  : the original ?geojson= URL — read hints from its query string
    // returns    : GeoJSON FeatureCollection, or null if conversion is impossible
    // ---------------------------------------------------------------------------
    function convert(response, sourceUrl) {

        // --- Read optional hints from the URL query string -------------------
        // Hints let the user override auto-detection from the URL parameters.
        // Always use URL.searchParams — never parse the query string manually.
        var collat  = 'latitude';   // default column name for latitude
        var collon  = 'longitude';  // default column name for longitude
        var labelcol = null;
        if (sourceUrl) {
            try {
                var u = new URL(sourceUrl);
                collat   = u.searchParams.get('_collat')   || collat;
                collon   = u.searchParams.get('_collon')   || collon;
                labelcol = u.searchParams.get('_labelcol') || null;
            } catch(e) { /* malformed URL — use defaults */ }
        }

        // --- Unwrap the source envelope ---------------------------------------
        // Different APIs wrap their rows differently. Unwrap to a plain array.
        // This sample expects a bare array: [{…}, {…}, …]
        // Grist example:  response.records.map(r => r.fields)
        // CKAN example:   response.result.records
        var rows = Array.isArray(response) ? response : null;
        if (!rows || !rows.length) { return null; }

        // --- Build GeoJSON features ------------------------------------------
        var features = rows.map(function(row) {

            // Parse coordinates — always GeoJSON order: [longitude, latitude]
            var lat = parseFloat(row[collat]);
            var lon = parseFloat(row[collon]);
            if (isNaN(lat) || isNaN(lon)) { return null; } // skip rows without valid coords

            var geometry = {
                type: 'Point',
                coordinates: [lon, lat]  // GeoJSON is [lon, lat] — never [lat, lon]
            };

            // All remaining columns become GeoJSON properties.
            // Exclude the geometry columns that were consumed above.
            var props = {};
            Object.keys(row).forEach(function(k) {
                if (k !== collat && k !== collon) { props[k] = row[k]; }
            });

            var feature = { type: 'Feature', geometry: geometry, properties: props };

            // _label is read by sviewer.js to render text labels on the map.
            if (labelcol && row[labelcol] !== undefined) {
                feature.properties._label = row[labelcol];
            }

            return feature;
        }).filter(Boolean); // remove nulls (rows with no valid coordinates)

        return { type: 'FeatureCollection', features: features };
    }

    // ---------------------------------------------------------------------------
    // STEP 2 — implement match(url)
    //
    // Return true only for URLs this adapter should handle.
    // Be specific — a match that is too broad will intercept URLs meant for
    // other adapters or for sViewer's native GeoJSON loader.
    //
    // This sample only fires when the user explicitly appends &_format=sample,
    // because a bare JSON array has no distinguishable URL pattern.
    // ---------------------------------------------------------------------------
    function match(url) {
        return typeof url === 'string' && /[?&]_format=sample(&|$)/.test(url);
    }

    // ---------------------------------------------------------------------------
    // STEP 3 — register in the global adapter registry
    //
    // window.SViewerAdapters is initialised by sviewer.js but may not exist yet
    // when this file loads — the || {} guard handles both load orders.
    //
    // wantsText: absent (or false) → sviewer.js fetches as JSON (default)
    //            true              → sviewer.js fetches as plain text (CSV, XML…)
    // ---------------------------------------------------------------------------
    window.SViewerAdapters = window.SViewerAdapters || {};
    window.SViewerAdapters['sample'] = {
        match:   match,
        convert: convert
        // wantsText not set — response is parsed JSON, not raw text
    };

}());
