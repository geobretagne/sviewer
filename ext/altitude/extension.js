/**
 * Altitude — IGN Géoplateforme altimétrie.
 *   Mode "point"   : clic carte → altitude ponctuelle
 *   Mode "profile" : tracé + profil en long
 *
 * Activer :
 *   customConfig = { extensions: ['altitude'] };
 *   ou ?ext=altitude
 *
 * API : https://data.geopf.fr/altimetrie/
 */
(function () {
    'use strict';

    var BASE     = SViewer.extensionBase();
    var PANEL    = 'altitude';
    var API_LINE  = 'https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevationLine.json';
    var API_POINT = 'https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json';
    var RESOURCE  = 'ign_rge_alti_wld';
    var SAMPLING  = 100;

    // --- State -----------------------------------------------------------

    var mode        = null;    // 'point' | 'profile' | null
    var btnEl       = null;
    var active      = false;
    var mapRef      = null;

    // Profile mode state
    var profilePoints  = [];
    var profileDrawing = false;
    var pointerMoveKey = null;

    // Point mode state
    var pointDots     = [];   // [{ coord3857, z }]
    var pointOverlays = [];   // one OL Overlay per dot

    // OL layers / overlays
    var drawSource   = null;   // profile committed points + line + result
    var rubberSource = null;   // profile rubber-band
    var dotSource    = null;   // point mode dots
    var markerSource = null;   // profile graph-hover marker
    var altOverlay   = null;   // altitude pill on map

    // --- i18n ------------------------------------------------------------

    var _i18n = {};
    function t(key) {
        var lang = (SViewer.config && SViewer.config.lang) || 'fr';
        return (_i18n[lang] && _i18n[lang][key]) || (_i18n['fr'] && _i18n['fr'][key]) || key;
    }
    function tf(key) {
        var str = t(key);
        var args = Array.prototype.slice.call(arguments, 1);
        return str.replace(/\{(\d+)\}/g, function (_, i) { return args[i] !== undefined ? args[i] : ''; });
    }

    // --- Bootstrap -------------------------------------------------------

    fetch(BASE + 'i18n.json')
        .then(function (r) { return r.ok ? r.json() : {}; })
        .catch(function ()  { return {}; })
        .then(function (data) { _i18n = data; init(); });

    function init() {

    SViewer.onMapReady(function (ctx) {
        mapRef = ctx.map;

        // Profile draw layer
        drawSource = new ol.source.Vector();
        mapRef.addLayer(new ol.layer.Vector({
            source: drawSource,
            style: function (f) {
                if (f.getGeometry().getType() === 'Point') {
                    return new ol.style.Style({ image: new ol.style.RegularShape({ points: 4, radius: 7, radius2: 0, angle: 0, stroke: new ol.style.Stroke({ color: '#ff6600', width: 2.5 }) }) });
                }
                return new ol.style.Style({ stroke: new ol.style.Stroke({ color: '#ff6600', width: 2 }) });
            },
            zIndex: 10
        }));

        // Rubber-band layer
        rubberSource = new ol.source.Vector();
        mapRef.addLayer(new ol.layer.Vector({
            source: rubberSource,
            style:  new ol.style.Style({ stroke: new ol.style.Stroke({ color: '#ff6600', width: 1.5, lineDash: [6, 4] }) }),
            zIndex: 10
        }));

        // Point mode dots
        dotSource = new ol.source.Vector();
        mapRef.addLayer(new ol.layer.Vector({
            source: dotSource,
            style:  new ol.style.Style({ image: new ol.style.RegularShape({ points: 4, radius: 7, radius2: 0, angle: 0, stroke: new ol.style.Stroke({ color: '#ff6600', width: 2.5 }) }) }),
            zIndex: 11
        }));

        // Graph-hover marker
        markerSource = new ol.source.Vector();
        mapRef.addLayer(new ol.layer.Vector({
            source: markerSource,
            style:  new ol.style.Style({ image: new ol.style.Circle({ radius: 6, fill: new ol.style.Fill({ color: '#ff6600' }), stroke: new ol.style.Stroke({ color: '#fff', width: 2 }) }) }),
            zIndex: 20
        }));

        // Altitude overlay pill
        var altEl = document.createElement('div');
        altEl.style.cssText = 'background:rgba(0,0,0,.75);color:#fff;font-size:.8rem;font-weight:600;padding:.15rem .45rem;border-radius:.25rem;white-space:nowrap;pointer-events:none;display:none';
        altOverlay = new ol.Overlay({ element: altEl, positioning: 'bottom-center', offset: [0, -14], stopEvent: false });
        mapRef.addOverlay(altOverlay);

        // Toolbar button
        btnEl = document.createElement('button');
        btnEl.type = 'button';
        btnEl.className = 'btn btn-dark sv-map-btn sv-alt-toggle';
        btnEl.title = t('panel.title');
        btnEl.setAttribute('aria-pressed', 'false');
        btnEl.setAttribute('aria-label', t('panel.title'));
        btnEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M0 0h1v15h15v1H0zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07"/></svg>';
        document.getElementById('sv-panel-controls').appendChild(btnEl);

        btnEl.addEventListener('click', function () {
            active = !active;
            btnEl.setAttribute('aria-pressed', String(active));
            btnEl.classList.toggle('active', active);
            if (active) {
                mode = 'point';
                openPanel();
            } else {
                profileStopDrawing();
                clearAll();
                SViewer.panel.close();
            }
        });

        SViewer.panel.onClose(PANEL, function () {
            active = false;
            mode   = null;
            btnEl.setAttribute('aria-pressed', 'false');
            btnEl.classList.remove('active');
            profileStopDrawing();
            clearAll();
        });

        // Shared click handler
        SViewer.addClickHandler(function (evt) {
            if (!active) { return; }
            if (mode === 'profile' && profileDrawing) {
                var coord = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
                profilePoints.push([Math.round(coord[0] * 1e6) / 1e6, Math.round(coord[1] * 1e6) / 1e6]);
                redrawProfile();
                openPanel();
                if (profilePoints.length >= 2) { computeProfile(); }
                return true;
            }
            if (mode === 'point') {
                fetchPointAlt(evt.coordinate);
                return true;
            }
        });
    });

    // --- Shared ----------------------------------------------------------

    function clearAll() {
        profilePoints = [];
        pointDots     = [];
        clearPointOverlays();
        if (drawSource)   { drawSource.clear(); }
        if (rubberSource) { rubberSource.clear(); }
        if (dotSource)    { dotSource.clear(); }
        if (markerSource) { markerSource.clear(); }
        hideAltOverlay();
    }

    function clearPointOverlays() {
        pointOverlays.forEach(function (ov) { if (mapRef) { mapRef.removeOverlay(ov); } });
        pointOverlays = [];
    }

    function hideAltOverlay() {
        if (altOverlay) { altOverlay.getElement().style.display = 'none'; altOverlay.setPosition(undefined); }
    }

    // --- Panel -----------------------------------------------------------

    function openPanel() {
        SViewer.panel.open(PANEL, t('panel.title'), buildPanelHtml());
        bindPanelEvents();
    }

    function buildPanelHtml() {
        var isPoint   = mode === 'point';
        var isProfile = mode === 'profile';

        var modeBar = [
            '<div style="display:flex;gap:.4rem;margin-bottom:.5rem">',
            '<button id="sv-alt-mode-point"   type="button" class="btn btn-sm ' + (isPoint   ? 'btn-primary' : 'btn-secondary') + '" aria-pressed="' + isPoint   + '">' + t('mode.point')   + '</button>',
            '<button id="sv-alt-mode-profile" type="button" class="btn btn-sm ' + (isProfile ? 'btn-primary' : 'btn-secondary') + '" aria-pressed="' + isProfile + '">' + t('mode.profile') + '</button>',
            '</div>'
        ].join('');

        var body = isPoint   ? buildPointHtml()   : buildProfileHtml();
        var credits = '<div style="font-size:.75rem;color:var(--sv-panel-fg-muted);margin-top:.75rem">' + t('credits') + '</div>';

        return '<div style="padding:0.75rem;display:flex;flex-direction:column;gap:.25rem">' + modeBar + body + credits + '</div>';
    }

    function bindPanelEvents() {
        var modePoint   = document.getElementById('sv-alt-mode-point');
        var modeProfile = document.getElementById('sv-alt-mode-profile');

        modePoint && modePoint.addEventListener('click', function () {
            if (mode === 'point') { return; }
            profileStopDrawing();
            clearAll();
            mode = 'point';
            openPanel();
        });

        modeProfile && modeProfile.addEventListener('click', function () {
            if (mode === 'profile') { return; }
            clearAll();
            mode = 'profile';
            profileStartDrawing();
            openPanel();
        });

        if (mode === 'point')   { bindPointEvents(); }
        if (mode === 'profile') { bindProfileEvents(); }
    }

    // --- Point mode ------------------------------------------------------

    function buildPointHtml() {
        var hasPoints = pointDots.length > 0;
        var items = pointDots.map(function (d, i) {
            var z = d.z !== null ? (d.z >= 0 ? '+' : '') + Math.round(d.z) + ' m' : '—';
            return '<span style="color:var(--sv-panel-fg-muted)">' + (i + 1) + '.</span> <strong>' + z + '</strong>';
        }).join('&emsp;');

        var hint = hasPoints ? '' : '<div style="font-size:.8rem;color:var(--sv-panel-fg-muted);margin-bottom:.5rem">' + t('hint.point') + '</div>';
        var list = hasPoints ? '<div style="font-size:.9rem;margin-bottom:.5rem;line-height:1.8">' + items + '</div>' : '';
        var clearBtn = '<button id="sv-alt-clear" type="button" class="btn btn-sm btn-danger" ' + (hasPoints ? '' : 'disabled') + '>' + t('btn.clear') + '</button>';
        var copyBtn  = hasPoints ? ' <button id="sv-alt-copy" type="button" class="btn btn-sm btn-secondary">' + t('btn.copy') + '</button>' : '';

        return hint + list + clearBtn + copyBtn + '<div id="sv-alt-point-result"></div>';
    }

    function bindPointEvents() {
        var clearBtn = document.getElementById('sv-alt-clear');
        clearBtn && clearBtn.addEventListener('click', function () {
            pointDots = [];
            clearPointOverlays();
            if (dotSource) { dotSource.clear(); }
            openPanel();
        });

        var copyBtn = document.getElementById('sv-alt-copy');
        copyBtn && copyBtn.addEventListener('click', function () {
            var lines = ['#\tlon\tlat\taltitude (m)'];
            pointDots.forEach(function (d, i) {
                var coord4326 = ol.proj.transform(d.coord3857, 'EPSG:3857', 'EPSG:4326');
                var lon = Math.round(coord4326[0] * 1e6) / 1e6;
                var lat = Math.round(coord4326[1] * 1e6) / 1e6;
                var z   = d.z !== null ? Math.round(d.z) : '';
                lines.push((i + 1) + '\t' + lon + '\t' + lat + '\t' + z);
            });
            navigator.clipboard.writeText(lines.join('\n')).then(function () {
                copyBtn.textContent = t('btn.copied');
                setTimeout(function () { copyBtn.textContent = t('btn.copy'); }, 2000);
            });
        });
    }

    function fetchPointAlt(coord3857) {
        var coord4326 = ol.proj.transform(coord3857, 'EPSG:3857', 'EPSG:4326');
        var lon = Math.round(coord4326[0] * 1e6) / 1e6;
        var lat = Math.round(coord4326[1] * 1e6) / 1e6;

        var params = new URLSearchParams({ resource: RESOURCE, lon: lon, lat: lat });

        fetch(API_POINT + '?' + params.toString())
            .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
            .then(function (data) {
                if (!active || mode !== 'point') { return; }
                var z = (data.elevations && data.elevations[0] && data.elevations[0].z !== -9999) ? data.elevations[0].z : null;
                pointDots.push({ coord3857: coord3857, z: z });
                dotSource.addFeature(new ol.Feature(new ol.geom.Point(coord3857)));
                addPointOverlay(coord3857, z);
                openPanel();
            })
            .catch(function (err) {
                if (!active || mode !== 'point') { return; }
                var el = document.getElementById('sv-alt-point-result');
                if (el) { el.innerHTML = '<div class="alert alert-danger" role="alert" style="font-size:.85rem;padding:.5rem .75rem;margin-top:.25rem">' + tf('msg.error', err.message || err) + '</div>'; }
            });
    }

    function addPointOverlay(coord3857, z) {
        var zLabel = z !== null ? (z >= 0 ? '+' : '') + Math.round(z) + ' m' : '—';
        var el = document.createElement('div');
        el.style.cssText = 'background:rgba(0,0,0,.75);color:#fff;font-size:.8rem;font-weight:600;padding:.15rem .45rem;border-radius:.25rem;white-space:nowrap;pointer-events:none';
        el.textContent = zLabel;
        var ov = new ol.Overlay({ element: el, positioning: 'bottom-center', offset: [0, -14], stopEvent: false });
        mapRef.addOverlay(ov);
        ov.setPosition(coord3857);
        pointOverlays.push(ov);
    }

    // --- Profile mode ----------------------------------------------------

    function buildProfileHtml() {
        var hint = profilePoints.length === 0 ? t('hint.start')
                 : profilePoints.length === 1 ? t('hint.one_point')
                 : null;

        return [
            '<div style="font-size:.8rem;color:#ff6600;margin-bottom:.25rem">' + t('hint.draw') + '</div>',
            hint ? '<div style="font-size:.8rem;color:var(--sv-panel-fg-muted);margin-bottom:.25rem">' + hint + '</div>' : '',
            '<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.25rem">',
            '<button id="sv-elev-clear" type="button" class="btn btn-sm btn-danger" ' + (profilePoints.length === 0 ? 'disabled' : '') + '>' + t('btn.clear') + '</button>',
            '</div>',
            '<div id="sv-elev-result"></div>'
        ].join('');
    }

    function bindProfileEvents() {
        var clearBtn = document.getElementById('sv-elev-clear');

        clearBtn && clearBtn.addEventListener('click', function () {
            profileStopDrawing();
            profilePoints = [];
            if (drawSource)   { drawSource.clear(); }
            if (markerSource) { markerSource.clear(); }
            hideAltOverlay();
            profileStartDrawing();
            openPanel();
        });
    }

    function redrawProfile() {
        drawSource.clear();
        if (profilePoints.length === 0) { return; }
        profilePoints.forEach(function (pt) {
            drawSource.addFeature(new ol.Feature(new ol.geom.Point(ol.proj.transform(pt, 'EPSG:4326', 'EPSG:3857'))));
        });
        if (profilePoints.length >= 2) {
            drawSource.addFeature(new ol.Feature(new ol.geom.LineString(
                profilePoints.map(function (pt) { return ol.proj.transform(pt, 'EPSG:4326', 'EPSG:3857'); })
            )));
        }
    }

    function profileStartDrawing() {
        if (profileDrawing) { return; }
        profileDrawing = true;
        var mapEl = document.getElementById('sv-frame-map');
        if (mapEl) { mapEl.style.cursor = 'crosshair'; }
        pointerMoveKey = mapRef.on('pointermove', function (evt) {
            rubberSource.clear();
            if (profilePoints.length === 0) { return; }
            var last = ol.proj.transform(profilePoints[profilePoints.length - 1], 'EPSG:4326', 'EPSG:3857');
            rubberSource.addFeature(new ol.Feature(new ol.geom.LineString([last, evt.coordinate])));
        });
    }

    function profileStopDrawing() {
        profileDrawing = false;
        var mapEl = document.getElementById('sv-frame-map');
        if (mapEl) { mapEl.style.cursor = ''; }
        if (pointerMoveKey) { ol.unByKey(pointerMoveKey); pointerMoveKey = null; }
        if (rubberSource)   { rubberSource.clear(); }
    }

    // --- Profile compute -------------------------------------------------

    function computeProfile() {
        if (profilePoints.length < 2) { return; }

        var lons = profilePoints.map(function (p) { return p[0]; }).join('|');
        var lats = profilePoints.map(function (p) { return p[1]; }).join('|');
        var params = new URLSearchParams({ resource: RESOURCE, lon: lons, lat: lats, sampling: String(SAMPLING) });

        openPanel();
        showProfileResult('<div style="color:#aaa;font-size:.8rem">' + t('msg.computing') + '</div>');

        fetch(API_LINE + '?' + params.toString())
            .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.json(); })
            .then(function (data) {
                if (!active || mode !== 'profile') { return; }
                if (!data.elevations || data.elevations.length === 0) { throw new Error(t('msg.no_data')); }
                renderProfile(data);
            })
            .catch(function (err) {
                if (!active || mode !== 'profile') { return; }
                showProfileResult('<div class="alert alert-danger" role="alert" style="font-size:.85rem;padding:.5rem .75rem;margin-top:.25rem">' + tf('msg.error', err.message || err) + '</div>');
                profileStartDrawing();
            });
    }

    function showProfileResult(html) {
        var el = document.getElementById('sv-elev-result');
        if (el) { el.innerHTML = html; }
    }

    // --- Profile rendering -----------------------------------------------

    function renderProfile(data) {
        var elevs = data.elevations;
        var diff  = data.height_differences || {};

        var dists = [0];
        for (var i = 1; i < elevs.length; i++) {
            dists.push(dists[i - 1] + haversine(elevs[i - 1], elevs[i]));
        }
        var totalKm   = dists[dists.length - 1] / 1000;
        var totalDist = dists[dists.length - 1] || 1;

        var zValues = elevs.map(function (e) { return e.z; }).filter(function (z) { return z !== -9999; });
        if (zValues.length === 0) { throw new Error(t('msg.no_data')); }
        var zMin = zValues.reduce(function (a, b) { return Math.min(a, b); });
        var zMax = zValues.reduce(function (a, b) { return Math.max(a, b); });
        var zRange = zMax - zMin || 1;

        var W = 276, H = 130;
        var PAD = { t: 8, r: 8, b: 24, l: 36 };
        var iW = W - PAD.l - PAD.r;
        var iH = H - PAD.t - PAD.b;

        function px(idx) { return PAD.l + (dists[idx] / totalDist) * iW; }
        function py(idx) {
            var z = elevs[idx].z !== -9999 ? elevs[idx].z : zMin;
            return PAD.t + iH - ((z - zMin) / zRange) * iH;
        }

        var d = 'M' + px(0) + ',' + py(0);
        for (var j = 1; j < elevs.length; j++) { d += ' L' + px(j) + ',' + py(j); }
        d += ' L' + px(elevs.length - 1) + ',' + (PAD.t + iH) + ' L' + px(0) + ',' + (PAD.t + iH) + ' Z';

        var NS = 'http://www.w3.org/2000/svg';

        function niceTicks(lo, hi) {
            var range = hi - lo || 1;
            var roughStep = range / 4;
            var mag  = Math.pow(10, Math.floor(Math.log(roughStep) / Math.LN10));
            var norm = roughStep / mag;
            var nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
            var step = nice * mag;
            var ticks = [];
            var start = Math.ceil(lo / step) * step;
            for (var v = start; v <= hi + 1e-9; v += step) { ticks.push(Math.round(v)); }
            return ticks;
        }

        function svgEl(tag, attrs) {
            var el = document.createElementNS(NS, tag);
            Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
            return el;
        }
        function svgText(tag, attrs, text) {
            var el = svgEl(tag, attrs); el.textContent = text; return el;
        }

        var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-labelledby': 'sv-elev-svg-title sv-elev-svg-desc', style: 'display:block;touch-action:none' });

        var titleEl = svgEl('title', { id: 'sv-elev-svg-title' }); titleEl.textContent = tf('svg.title', totalKm.toFixed(1));
        var descEl  = svgEl('desc',  { id: 'sv-elev-svg-desc'  }); descEl.textContent  = tf('svg.desc', Math.round(zMin), Math.round(zMax), Math.round(diff.positive || 0));
        svg.appendChild(titleEl); svg.appendChild(descEl);

        // Y ticks
        niceTicks(zMin, zMax).forEach(function (z) {
            var yPos = PAD.t + iH - ((z - zMin) / zRange) * iH;
            svg.appendChild(svgEl('line', { x1: PAD.l, y1: yPos, x2: PAD.l + iW, y2: yPos, stroke: '#555', 'stroke-dasharray': '2,3' }));
            svg.appendChild(svgText('text', { x: PAD.l - 4, y: yPos + 3, 'text-anchor': 'end', 'font-size': '9', fill: '#bbb' }, z + ' m'));
        });

        // Area
        svg.appendChild(svgEl('path', { d: d, fill: '#ff6600', 'fill-opacity': '.25', stroke: '#ff6600', 'stroke-width': '1.5' }));

        // X ticks
        niceTicks(0, totalKm).forEach(function (km) {
            var xPos = PAD.l + (km / totalKm) * iW;
            svg.appendChild(svgEl('line', { x1: xPos, y1: PAD.t, x2: xPos, y2: PAD.t + iH, stroke: '#555', 'stroke-dasharray': '2,3' }));
            svg.appendChild(svgText('text', { x: xPos, y: PAD.t + iH + 14, 'text-anchor': 'middle', 'font-size': '9', fill: '#bbb' }, km + ' km'));
        });
        svg.appendChild(svgText('text', { x: PAD.l + iW, y: PAD.t + iH + 14, 'text-anchor': 'end', 'font-size': '9', fill: '#bbb' }, totalKm.toFixed(1) + ' km'));

        // Axes
        svg.appendChild(svgEl('line', { x1: PAD.l, y1: PAD.t,      x2: PAD.l,      y2: PAD.t + iH, stroke: '#444', 'stroke-width': '1' }));
        svg.appendChild(svgEl('line', { x1: PAD.l, y1: PAD.t + iH, x2: PAD.l + iW, y2: PAD.t + iH, stroke: '#444', 'stroke-width': '1' }));

        // Crosshair
        var xhLine  = svgEl('line',   { x1: 0, y1: PAD.t, x2: 0, y2: PAD.t + iH, stroke: '#ff6600', 'stroke-width': '1', 'stroke-dasharray': '3,2', visibility: 'hidden' });
        var xhDot   = svgEl('circle', { cx: 0, cy: 0, r: '4', fill: '#ff6600', stroke: '#fff', 'stroke-width': '1.5', visibility: 'hidden' });
        var xhLabel = svgEl('text',   { x: 0, y: PAD.t - 2, 'text-anchor': 'middle', 'font-size': '9', 'font-weight': '600', fill: '#ff6600', visibility: 'hidden' });
        svg.appendChild(xhLine); svg.appendChild(xhDot); svg.appendChild(xhLabel);

        var hitRect = svgEl('rect', { x: PAD.l, y: PAD.t, width: iW, height: iH, fill: 'transparent', style: 'cursor:crosshair' });
        svg.appendChild(hitRect);

        var resultCoords3857 = elevs.map(function (e) { return ol.proj.transform([e.lon, e.lat], 'EPSG:4326', 'EPSG:3857'); });

        function updateCrosshair(clientX) {
            var rect = svg.getBoundingClientRect();
            var ratio = Math.max(0, Math.min(1, ((clientX - rect.left) / rect.width * W - PAD.l) / iW));
            var targetDist = ratio * totalDist;
            var lo = 0, hi = elevs.length - 1;
            while (lo < hi) { var mid = (lo + hi) >> 1; if (dists[mid] < targetDist) { lo = mid + 1; } else { hi = mid; } }
            var xPos = PAD.l + ratio * iW;
            var yPos = py(lo);
            var z = elevs[lo].z !== -9999 ? Math.round(elevs[lo].z) : null;
            var zLabel = z !== null ? (z >= 0 ? '+' : '') + z + ' m' : '—';
            xhLine.setAttribute('x1', xPos); xhLine.setAttribute('x2', xPos);
            xhDot.setAttribute('cx', xPos);  xhDot.setAttribute('cy', yPos);
            xhLabel.setAttribute('x', xPos); xhLabel.textContent = zLabel;
            xhLine.setAttribute('visibility', 'visible');
            xhDot.setAttribute('visibility', 'visible');
            xhLabel.setAttribute('visibility', 'visible');
            markerSource.clear();
            markerSource.addFeature(new ol.Feature(new ol.geom.Point(resultCoords3857[lo])));
            var altEl = altOverlay.getElement();
            altEl.textContent = zLabel; altEl.style.display = '';
            altOverlay.setPosition(resultCoords3857[lo]);
        }

        function hideCrosshair() {
            xhLine.setAttribute('visibility', 'hidden');
            xhDot.setAttribute('visibility', 'hidden');
            xhLabel.setAttribute('visibility', 'hidden');
            markerSource.clear();
            hideAltOverlay();
        }

        hitRect.addEventListener('mousemove', function (e) { updateCrosshair(e.clientX); });
        hitRect.addEventListener('mouseleave', hideCrosshair);
        hitRect.addEventListener('touchmove', function (e) { e.preventDefault(); updateCrosshair(e.touches[0].clientX); }, { passive: false });
        hitRect.addEventListener('touchend', hideCrosshair);
        hitRect.addEventListener('touchcancel', hideCrosshair);

        // Stats
        function statBlock(value, label) {
            return '<div style="display:flex;flex-direction:column;align-items:center;min-width:4rem">' +
                   '<span style="font-size:1.4rem;font-weight:700">' + value + '</span>' +
                   '<span style="font-size:.85rem;color:var(--sv-panel-fg-muted);margin-top:.1rem">' + label + '</span></div>';
        }
        var statsEl = document.createElement('div');
        statsEl.style.cssText = 'display:flex;gap:1rem;margin-top:.6rem;flex-wrap:wrap';
        statsEl.innerHTML =
            statBlock('<span style="color:#4caf50">+' + Math.round(diff.positive || 0) + ' m</span>', t('stat.ascent')) +
            statBlock('<span style="color:#e57373">-' + Math.round(diff.negative || 0) + ' m</span>', t('stat.descent')) +
            statBlock((Math.round(zMin) >= 0 ? '+' : '') + Math.round(zMin) + ' m', t('stat.alt_min')) +
            statBlock((Math.round(zMax) >= 0 ? '+' : '') + Math.round(zMax) + ' m', t('stat.alt_max')) +
            statBlock(totalKm.toFixed(1) + ' km', t('stat.distance'));

        // Draw result line on map
        drawSource.clear();
        rubberSource.clear();
        drawSource.addFeature(new ol.Feature(new ol.geom.LineString(resultCoords3857)));

        var resultEl = document.getElementById('sv-elev-result');
        if (resultEl) {
            resultEl.innerHTML = '';
            resultEl.appendChild(svg);
            resultEl.appendChild(statsEl);
        }
    }

    // --- Haversine -------------------------------------------------------

    function haversine(a, b) {
        var R = 6371000;
        var f1 = a.lat * Math.PI / 180, f2 = b.lat * Math.PI / 180;
        var df = (b.lat - a.lat) * Math.PI / 180, dl = (b.lon - a.lon) * Math.PI / 180;
        var s = Math.sin(df / 2) * Math.sin(df / 2) + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    }

    } // end init()

}());
