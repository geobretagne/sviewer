/**
 * Profil en long — IGN Géoplateforme altimétrie.
 *
 * Activer :
 *   customConfig = { extensions: ['altitude'] };
 *   ou ?ext=altitude
 *
 * API : https://data.geopf.fr/altimetrie/
 */
(function () {
    'use strict';

    var PANEL    = 'altitude';
    var API      = 'https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevationLine.json';
    var RESOURCE = 'ign_rge_alti_wld';
    var SAMPLING = 100;

    var points      = [];   // array of [lon, lat] EPSG:4326
    var drawing     = false;
    var btnEl       = null;
    var active      = false;
    var mapRef      = null;

    // OL objects — permanent draw layer (not sViewer's built-in layer)
    var drawSource     = null;
    var rubberSource   = null;  // separate source for rubber-band line
    var pointerMoveKey = null;  // OL event key for pointermove

    // --- Toolbar button ---------------------------------------------------

    SViewer.onMapReady(function (ctx) {
        mapRef = ctx.map;

        // Draw layer — committed points + line
        drawSource = new ol.source.Vector();
        var drawLayer = new ol.layer.Vector({
            source: drawSource,
            style: function (feature) {
                if (feature.getGeometry().getType() === 'Point') {
                    return new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 4,
                            fill:   new ol.style.Fill({ color: '#ff6600' }),
                            stroke: new ol.style.Stroke({ color: '#fff', width: 1.5 })
                        })
                    });
                }
                return new ol.style.Style({
                    stroke: new ol.style.Stroke({ color: '#ff6600', width: 2 })
                });
            },
            zIndex: 10
        });

        // Rubber-band layer — ghost line from last point to cursor
        rubberSource = new ol.source.Vector();
        var rubberLayer = new ol.layer.Vector({
            source: rubberSource,
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({ color: '#ff6600', width: 1.5, lineDash: [6, 4] })
            }),
            zIndex: 10
        });

        mapRef.addLayer(drawLayer);
        mapRef.addLayer(rubberLayer);

        var toolbar = document.getElementById('sv-panel-controls');
        btnEl = document.createElement('button');
        btnEl.type = 'button';
        btnEl.className = 'btn btn-dark sv-map-btn';
        btnEl.title = 'Profil en long';
        btnEl.setAttribute('aria-pressed', 'false');
        btnEl.setAttribute('aria-label', 'Profil en long');
        btnEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M0 0h1v15h15v1H0zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07"/></svg>';
        toolbar.appendChild(btnEl);

        btnEl.addEventListener('click', function () {
            active = !active;
            btnEl.setAttribute('aria-pressed', String(active));
            btnEl.classList.toggle('active', active);
            if (active) {
                openPanel();
            } else {
                SViewer.panel.close();
                stopDrawing();
                clearDraw();
            }
        });

        // Map click — add waypoint
        SViewer.addClickHandler(function (evt) {
            if (!drawing) { return; }
            var coord = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
            points.push([
                Math.round(coord[0] * 1e6) / 1e6,
                Math.round(coord[1] * 1e6) / 1e6
            ]);
            redrawCommitted();
            // Re-open panel to refresh state (re-claim ownership)
            openPanel();
            return true; // consume — suppress sViewer GFI
        });
    });

    // --- Draw layer -------------------------------------------------------

    function redrawCommitted() {
        drawSource.clear();
        if (points.length === 0) { return; }
        points.forEach(function (pt) {
            drawSource.addFeature(new ol.Feature(new ol.geom.Point(
                ol.proj.transform(pt, 'EPSG:4326', 'EPSG:3857')
            )));
        });
        if (points.length >= 2) {
            var coords = points.map(function (pt) { return ol.proj.transform(pt, 'EPSG:4326', 'EPSG:3857'); });
            drawSource.addFeature(new ol.Feature(new ol.geom.LineString(coords)));
        }
    }

    function updateRubberBand(cursorCoord3857) {
        rubberSource.clear();
        if (points.length === 0 || !cursorCoord3857) { return; }
        var last = ol.proj.transform(points[points.length - 1], 'EPSG:4326', 'EPSG:3857');
        rubberSource.addFeature(new ol.Feature(new ol.geom.LineString([last, cursorCoord3857])));
    }

    function clearDraw() {
        points = [];
        if (drawSource)   { drawSource.clear(); }
        if (rubberSource) { rubberSource.clear(); }
    }

    // --- Drawing mode -----------------------------------------------------

    function startDrawing() {
        drawing = true;
        var mapEl = document.getElementById('sv-frame-map');
        if (mapEl) { mapEl.style.cursor = 'crosshair'; }
        // Rubber-band on pointer move
        pointerMoveKey = mapRef.on('pointermove', function (evt) {
            updateRubberBand(evt.coordinate);
        });
    }

    function stopDrawing() {
        drawing = false;
        var mapEl = document.getElementById('sv-frame-map');
        if (mapEl) { mapEl.style.cursor = ''; }
        if (pointerMoveKey) { ol.unByKey(pointerMoveKey); pointerMoveKey = null; }
        if (rubberSource) { rubberSource.clear(); }
    }

    // --- Panel ------------------------------------------------------------

    function openPanel() {
        SViewer.panel.open(PANEL, 'Profil en long', buildPanelHtml());
        bindPanelEvents();
    }

    function buildPanelHtml() {
        var hint;
        if (drawing) {
            hint = '<span style="color:#ff6600">Cliquez pour ajouter des points. « Terminer » pour valider.</span>';
        } else if (points.length === 0) {
            hint = 'Tracez un itinéraire sur la carte.';
        } else {
            hint = points.length + ' point' + (points.length > 1 ? 's' : '') + ' — tracé prêt.';
        }

        var canCompute = points.length >= 2 && !drawing;

        return [
            '<div style="padding:0.75rem;display:flex;flex-direction:column;gap:0.75rem">',
            '<div style="font-size:.8rem;color:#aaa">' + hint + '</div>',
            '<div style="display:flex;gap:.5rem;flex-wrap:wrap">',
            '<button id="sv-elev-draw" type="button" class="btn btn-sm ' + (drawing ? 'btn-warning' : 'btn-outline-secondary') + '">',
            drawing ? 'Terminer le tracé' : 'Tracer',
            '</button>',
            '<button id="sv-elev-undo" type="button" class="btn btn-sm btn-outline-secondary" ' + (points.length === 0 ? 'disabled' : '') + '>Annuler dernier</button>',
            '<button id="sv-elev-clear" type="button" class="btn btn-sm btn-outline-danger" ' + (points.length === 0 ? 'disabled' : '') + '>Effacer</button>',
            '</div>',
            '<button id="sv-elev-submit" type="button" class="btn btn-primary btn-sm" ' + (canCompute ? '' : 'disabled') + '>Calculer le profil</button>',
            '<div id="sv-elev-result"></div>',
            '</div>'
        ].join('');
    }

    function bindPanelEvents() {
        var drawBtn   = document.getElementById('sv-elev-draw');
        var undoBtn   = document.getElementById('sv-elev-undo');
        var clearBtn  = document.getElementById('sv-elev-clear');
        var submitBtn = document.getElementById('sv-elev-submit');
        if (!drawBtn) { return; }

        drawBtn.addEventListener('click', function () {
            if (drawing) { stopDrawing(); } else { startDrawing(); }
            openPanel();
        });

        undoBtn && undoBtn.addEventListener('click', function () {
            points.pop();
            redrawCommitted();
            openPanel();
        });

        clearBtn && clearBtn.addEventListener('click', function () {
            stopDrawing();
            clearDraw();
            openPanel();
        });

        submitBtn && submitBtn.addEventListener('click', compute);
    }

    // --- Compute ----------------------------------------------------------

    function compute() {
        if (points.length < 2) { return; }

        var lons = points.map(function (p) { return p[0]; }).join('|');
        var lats = points.map(function (p) { return p[1]; }).join('|');

        var params = new URLSearchParams({
            resource: RESOURCE,
            lon:      lons,
            lat:      lats,
            sampling: String(SAMPLING)
        });

        showResult('<div style="color:#aaa;font-size:.8rem">Calcul en cours…</div>');
        var submitBtn = document.getElementById('sv-elev-submit');
        if (submitBtn) { submitBtn.disabled = true; }

        fetch(API + '?' + params.toString())
            .then(function (r) {
                if (!r.ok) { throw new Error('HTTP ' + r.status); }
                return r.json();
            })
            .then(function (data) {
                if (!data.elevations || data.elevations.length === 0) {
                    throw new Error('Aucune donnée altimétrique reçue');
                }
                renderResult(data);
            })
            .catch(function (err) {
                var div = document.createElement('div');
                div.style.cssText = 'color:#c00;font-size:.8rem';
                div.textContent = 'Erreur : ' + err.message;
                showResult(div.outerHTML);
            })
            .finally(function () {
                var sb = document.getElementById('sv-elev-submit');
                if (sb) { sb.disabled = false; }
            });
    }

    // --- Result rendering -------------------------------------------------

    function renderResult(data) {
        var elevs = data.elevations;
        var diff  = data.height_differences || {};

        // Cumulative distance (haversine)
        var dists = [0];
        for (var i = 1; i < elevs.length; i++) {
            dists.push(dists[i - 1] + haversine(elevs[i - 1], elevs[i]));
        }
        var totalKm   = dists[dists.length - 1] / 1000;
        var totalDist = dists[dists.length - 1] || 1;

        var zValues = elevs.map(function (e) { return e.z; }).filter(function (z) { return z > -9999; });
        var zMin = Math.min.apply(null, zValues);
        var zMax = Math.max.apply(null, zValues);
        var zRange = zMax - zMin || 1;

        // SVG profile chart
        var W = 260, H = 110;
        var PAD = { t: 8, r: 8, b: 24, l: 36 };
        var iW = W - PAD.l - PAD.r;
        var iH = H - PAD.t - PAD.b;

        function px(idx) { return PAD.l + (dists[idx] / totalDist) * iW; }
        function py(idx) {
            var z = elevs[idx].z > -9999 ? elevs[idx].z : zMin;
            return PAD.t + iH - ((z - zMin) / zRange) * iH;
        }

        var d = 'M' + px(0) + ',' + py(0);
        for (var j = 1; j < elevs.length; j++) { d += ' L' + px(j) + ',' + py(j); }
        d += ' L' + px(elevs.length - 1) + ',' + (PAD.t + iH) + ' L' + px(0) + ',' + (PAD.t + iH) + ' Z';

        var yMid = Math.round((zMin + zMax) / 2);
        var zMinR = Math.round(zMin), zMaxR = Math.round(zMax);
        var svgTitle = 'Profil altimétrique — ' + totalKm.toFixed(1) + ' km';
        var svgDesc  = 'Altitude min ' + zMinR + ' m, max ' + zMaxR + ' m, dénivelé positif ' + Math.round(diff.positive || 0) + ' m';
        var svg = [
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img" aria-labelledby="sv-elev-svg-title sv-elev-svg-desc" style="display:block;overflow:visible">',
            '<title id="sv-elev-svg-title">' + svgTitle + '</title>',
            '<desc id="sv-elev-svg-desc">' + svgDesc + '</desc>',
            // Grid lines
            '<line x1="' + PAD.l + '" y1="' + (PAD.t + iH / 2) + '" x2="' + (PAD.l + iW) + '" y2="' + (PAD.t + iH / 2) + '" stroke="#333" stroke-dasharray="2,3"/>',
            // Area
            '<path d="' + d + '" fill="#0077bb" fill-opacity=".3" stroke="#0077bb" stroke-width="1.5"/>',
            // Y axis labels
            '<text x="' + (PAD.l - 4) + '" y="' + (PAD.t + 4)        + '" text-anchor="end" font-size="8" fill="#888">' + Math.round(zMax) + '</text>',
            '<text x="' + (PAD.l - 4) + '" y="' + (PAD.t + iH / 2 + 4) + '" text-anchor="end" font-size="8" fill="#888">' + yMid + '</text>',
            '<text x="' + (PAD.l - 4) + '" y="' + (PAD.t + iH + 4)   + '" text-anchor="end" font-size="8" fill="#888">' + Math.round(zMin) + '</text>',
            // X axis labels
            '<text x="' + PAD.l          + '" y="' + (PAD.t + iH + 14) + '" text-anchor="start"  font-size="8" fill="#888">0</text>',
            '<text x="' + (PAD.l + iW)   + '" y="' + (PAD.t + iH + 14) + '" text-anchor="end"    font-size="8" fill="#888">' + totalKm.toFixed(1) + ' km</text>',
            // Axes
            '<line x1="' + PAD.l + '" y1="' + PAD.t + '" x2="' + PAD.l + '" y2="' + (PAD.t + iH) + '" stroke="#444" stroke-width="1"/>',
            '<line x1="' + PAD.l + '" y1="' + (PAD.t + iH) + '" x2="' + (PAD.l + iW) + '" y2="' + (PAD.t + iH) + '" stroke="#444" stroke-width="1"/>',
            '</svg>'
        ].join('');

        var stats = '↑ ' + Math.round(diff.positive || 0) + ' m' +
                    '&nbsp;&nbsp;↓ ' + Math.round(diff.negative || 0) + ' m' +
                    '&nbsp;&nbsp;' + Math.round(zMin) + '–' + Math.round(zMax) + ' m';

        showResult(
            '<div style="margin-top:.25rem">' + svg + '</div>' +
            '<div style="font-size:.75rem;color:#888;margin-top:.35rem">' + stats + '</div>'
        );

        // Load result line on map (replaces draw layer display — clear draw)
        SViewer.loadFeatures({
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: elevs.map(function (e) { return [e.lon, e.lat]; })
                },
                properties: {
                    label:         'Profil — ' + totalKm.toFixed(2) + ' km',
                    elevation_min: Math.round(zMin),
                    elevation_max: Math.round(zMax),
                    denivele_pos:  Math.round(diff.positive || 0),
                    denivele_neg:  Math.round(diff.negative || 0)
                }
            }]
        });
        clearDraw();
    }

    function showResult(html) {
        var el = document.getElementById('sv-elev-result');
        if (el) { el.innerHTML = html; }
    }

    // --- Haversine distance (metres) --------------------------------------

    function haversine(a, b) {
        var R  = 6371000;
        var f1 = a.lat * Math.PI / 180;
        var f2 = b.lat * Math.PI / 180;
        var df = (b.lat - a.lat) * Math.PI / 180;
        var dl = (b.lon - a.lon) * Math.PI / 180;
        var s  = Math.sin(df / 2) * Math.sin(df / 2) +
                 Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    }

}());
