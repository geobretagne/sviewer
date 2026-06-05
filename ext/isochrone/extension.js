/**
 * Isochrone extension — IGN Géoplateforme isochrone/isodistance.
 *
 * Activate:
 *   customConfig = { extensions: ['isochrone'] };
 *   or ?ext=isochrone
 *
 * API: https://data.geopf.fr/navigation/isochrone
 */
(function () {
    'use strict';

    var PANEL     = 'isochrone';
    var API       = 'https://data.geopf.fr/navigation/isochrone';
    var NOMINATIM = 'https://nominatim.openstreetmap.org/search';
    var BASE      = SViewer.extensionBase();

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

    // --- POI config (loaded from poi.json) -------------------------------

    var _poiGroups = [];  // [{key, labels:{fr,en,es,de}, items:[{key, labels}]}]

    function escHtml(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function poiLabel(item) {
        var lang = (SViewer.config && SViewer.config.lang) || 'fr';
        return escHtml((item.labels && (item.labels[lang] || item.labels['fr'])) || item.key);
    }

    function poiItemByKey(key) {
        for (var g = 0; g < _poiGroups.length; g++) {
            for (var i = 0; i < _poiGroups[g].items.length; i++) {
                if (_poiGroups[g].items[i].key === key) { return _poiGroups[g].items[i]; }
            }
        }
        return null;
    }

    // Load i18n and poi in parallel
    Promise.all([
        fetch(BASE + 'i18n.json').then(function(r) { return r.ok ? r.json() : {}; }).catch(function() { return {}; }),
        fetch(BASE + 'poi.json').then(function(r)  { return r.ok ? r.json() : []; }).catch(function() { return []; })
    ]).then(function(results) {
        _i18n      = results[0];
        _poiGroups = results[1];
    });

    // --- State -----------------------------------------------------------

    var active         = false;
    var btnEl          = null;
    var currentPoint   = null;   // [lon, lat] EPSG:4326
    var currentPolygon = null;   // GeoJSON polygon from last isochrone result
    var markerSource   = null;
    var markerLayer    = null;
    var poiSource      = null;
    var poiLayer       = null;
    var _map           = null;
    var _fetchSeq      = 0;
    var _poiSeq        = 0;
    var _debounceTimer = null;

    // --- Toolbar button --------------------------------------------------

    SViewer.onMapReady(function (ctx) {
        var map = ctx.map;
        _map = map;

        markerSource = new ol.source.Vector();
        markerLayer  = new ol.layer.Vector({
            source: markerSource,
            style: new ol.style.Style({
                image: new ol.style.RegularShape({
                    points:  4,
                    radius:  8,
                    radius2: 0,
                    angle:   0,
                    stroke:  new ol.style.Stroke({ color: '#ff6600', width: 2.5 })
                })
            }),
            zIndex: 60
        });
        map.addLayer(markerLayer);

        poiSource = new ol.source.Vector();
        poiLayer  = new ol.layer.Vector({
            source: poiSource,
            style: new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 10,
                    fill:   new ol.style.Fill({ color: '#ff6600' }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
                })
            }),
            zIndex: 61
        });
        map.addLayer(poiLayer);

        var toolbar = document.getElementById('sv-panel-controls');
        btnEl = document.createElement('button');
        btnEl.type = 'button';
        btnEl.className = 'btn btn-dark sv-map-btn sv-alt-toggle';
        btnEl.title = t('panel.title');
        btnEl.setAttribute('aria-pressed', 'false');
        btnEl.setAttribute('aria-label', t('btn.label'));
        btnEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M8.5 5.6a.5.5 0 1 0-1 0v2.9h-3a.5.5 0 0 0 0 1H8a.5.5 0 0 0 .5-.5z"/><path d="M6.5 1A.5.5 0 0 1 7 .5h2a.5.5 0 0 1 0 1v.57c1.36.196 2.594.78 3.584 1.64l.012-.013.354-.354-.354-.353a.5.5 0 0 1 .707-.708l1.414 1.415a.5.5 0 1 1-.707.707l-.353-.354-.354.354-.013.012A7 7 0 1 1 7 2.071V1.5a.5.5 0 0 1-.5-.5M8 3a6 6 0 1 0 .001 12A6 6 0 0 0 8 3"/></svg>';
        toolbar.appendChild(btnEl);

        btnEl.addEventListener('click', function () {
            active = !active;
            btnEl.setAttribute('aria-pressed', String(active));
            btnEl.classList.toggle('active', active);
            if (active) {
                openPanel();
                setMapCursor(map, 'crosshair');
            } else {
                clearAll(map);
                SViewer.panel.close();
            }
        });

        SViewer.panel.onClose(PANEL, function () {
            active = false;
            btnEl.setAttribute('aria-pressed', 'false');
            btnEl.classList.remove('active');
            clearAll(map);
        });

        SViewer.addClickHandler(function (evt) {
            if (!active) { return; }
            var coord = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
            currentPoint = [
                Math.round(coord[0] * 1e6) / 1e6,
                Math.round(coord[1] * 1e6) / 1e6
            ];
            placeMarker(evt.coordinate);
            updatePointDisplay();
            compute();
            return true;
        });
    });

    // --- Marker ----------------------------------------------------------

    function placeMarker(coord3857) {
        markerSource.clear();
        markerSource.addFeature(new ol.Feature(new ol.geom.Point(coord3857)));
    }

    function clearMarker() {
        if (markerSource) { markerSource.clear(); }
    }

    function clearPoi() {
        if (poiSource) { poiSource.clear(); }
        _poiSeq++;
    }

    function clearAll(map) {
        _fetchSeq++;
        clearMarker();
        clearPoi();
        currentPoint   = null;
        currentPolygon = null;
        setMapCursor(map, '');
        if (_debounceTimer) { clearTimeout(_debounceTimer); _debounceTimer = null; }
    }

    function setMapCursor(map, cursor) {
        var el = map.getTargetElement();
        if (el) { el.style.cursor = cursor; }
    }

    // --- Panel -----------------------------------------------------------

    function openPanel() {
        SViewer.panel.open(PANEL, t('panel.title'), buildPanelHtml());
        bindPanelEvents();
    }

    function buildPanelHtml() {
        var pointLabel = currentPoint ? t('hint.point_set') : t('hint.no_point');
        var pointColor = currentPoint ? 'var(--sv-panel-fg)' : 'var(--sv-panel-fg-muted)';

        var optionsHtml = '<option value="">' + t('poi.none') + '</option>';
        _poiGroups.forEach(function(group) {
            optionsHtml += '<optgroup label="' + poiLabel(group) + '">';
            group.items.forEach(function(item) {
                optionsHtml += '<option value="' + item.key + '">' + poiLabel(item) + '</option>';
            });
            optionsHtml += '</optgroup>';
        });

        return [
            '<div style="padding:0.75rem;display:flex;flex-direction:column;gap:0.75rem">',

            // Point hint
            '<div id="sv-iso-point-label" style="font-size:.8rem;color:' + pointColor + '">' + pointLabel + '</div>',

            // Profile
            '<div>',
            '<label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.25rem">' + t('label.profile') + '</label>',
            '<div style="display:flex;gap:.5rem">',
            '<button type="button" class="btn btn-sm btn-outline-secondary sv-iso-profile active" data-value="pedestrian" aria-pressed="true">' + t('btn.pedestrian') + '</button>',
            '<button type="button" class="btn btn-sm btn-outline-secondary sv-iso-profile" data-value="car" aria-pressed="false">' + t('btn.car') + '</button>',
            '</div>',
            '</div>',

            // Cost type
            '<div>',
            '<label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.25rem">' + t('label.type') + '</label>',
            '<div style="display:flex;gap:.5rem">',
            '<button type="button" class="btn btn-sm btn-outline-secondary sv-iso-costtype active" data-value="time" aria-pressed="true">' + t('btn.time') + '</button>',
            '<button type="button" class="btn btn-sm btn-outline-secondary sv-iso-costtype" data-value="distance" aria-pressed="false">' + t('btn.distance') + '</button>',
            '</div>',
            '</div>',

            // Cost value
            '<div id="sv-iso-cost-block">',
            '<label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.25rem">' + t('label.duration') + '</label>',
            '<div style="display:flex;gap:.5rem;align-items:center">',
            '<input id="sv-iso-slider" type="range" min="1" max="60" value="10" style="flex:1">',
            '<input id="sv-iso-value" type="number" min="1" max="9999" value="10" aria-label="' + t('label.duration') + '" style="width:4rem;text-align:right;background:var(--sv-panel-input-bg);color:var(--sv-panel-fg);border:1px solid var(--sv-panel-border);border-radius:4px;padding:2px 4px">',
            '</div>',
            '</div>',

            // POI selector
            '<div>',
            '<label for="sv-iso-poi" style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.25rem">' + t('label.poi') + '</label>',
            '<select id="sv-iso-poi" style="width:100%;background:var(--sv-panel-input-bg);color:var(--sv-panel-fg);border:1px solid var(--sv-panel-border);border-radius:4px;padding:3px 6px;font-size:.8rem">',
            optionsHtml,
            '</select>',
            '<div id="sv-iso-poi-note" style="font-size:.72rem;color:var(--sv-panel-fg-muted);margin-top:.2rem">' + t('poi.note') + '</div>',
            '</div>',

            // POI count + contribute link
            '<div id="sv-iso-poi-count" style="font-size:.95rem;font-weight:600;color:var(--sv-panel-fg);min-height:1rem"></div>',
            '<div id="sv-iso-poi-contribute" style="font-size:.72rem;color:var(--sv-panel-fg-muted);display:none"></div>',

            // Status
            '<div id="sv-iso-status" style="font-size:.8rem;color:var(--sv-panel-fg-muted);min-height:1.2rem"></div>',

            // Credits
            '<div style="font-size:.75rem;color:var(--sv-panel-fg-muted);border-top:1px solid var(--sv-border);padding-top:.4rem">' + t('credits') + '</div>',

            '</div>'
        ].join('');
    }

    function bindPanelEvents() {
        var slider   = document.getElementById('sv-iso-slider');
        var valueInp = document.getElementById('sv-iso-value');
        if (!slider) { return; }

        document.querySelectorAll('.sv-iso-profile').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.sv-iso-profile').forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                if (currentPoint) { compute(); }
            });
        });

        document.querySelectorAll('.sv-iso-costtype').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.sv-iso-costtype').forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                updateCostLabel();
                if (currentPoint) { compute(); }
            });
        });

        slider.addEventListener('input', function () {
            valueInp.value = slider.value;
            scheduleCompute();
        });
        valueInp.addEventListener('input', function () {
            var v = parseInt(valueInp.value, 10);
            if (!isNaN(v)) { slider.value = Math.min(v, parseInt(slider.max, 10)); }
            scheduleCompute();
        });

        var poiSel = document.getElementById('sv-iso-poi');
        if (poiSel) {
            poiSel.addEventListener('change', function () {
                clearPoi();
                setPoiCount('');
                if (poiSel.value && currentPolygon) {
                    fetchPoi(poiSel.value, currentPolygon);
                }
            });
        }
    }

    function scheduleCompute() {
        if (_debounceTimer) { clearTimeout(_debounceTimer); }
        _debounceTimer = setTimeout(function () {
            _debounceTimer = null;
            if (currentPoint) { compute(); }
        }, 500);
    }

    function updateCostLabel() {
        var costType = activeCostType();
        var block  = document.getElementById('sv-iso-cost-block');
        var slider = document.getElementById('sv-iso-slider');
        if (!block || !slider) { return; }
        if (costType === 'time') {
            block.querySelector('label').textContent = t('label.duration');
            slider.max = 60;
            if (parseInt(slider.value, 10) > 60) { slider.value = 60; document.getElementById('sv-iso-value').value = 60; }
        } else {
            block.querySelector('label').textContent = t('label.distance');
            slider.max = 50;
            if (parseInt(slider.value, 10) > 50) { slider.value = 50; document.getElementById('sv-iso-value').value = 50; }
        }
    }

    function updatePointDisplay() {
        var el = document.getElementById('sv-iso-point-label');
        if (!el) { return; }
        el.textContent = currentPoint ? t('hint.point_set') : t('hint.no_point');
        el.style.color = currentPoint ? 'var(--sv-panel-fg)' : 'var(--sv-panel-fg-muted)';
    }

    function activeProfile()  { var el = document.querySelector('.sv-iso-profile.active');  return el ? el.dataset.value : 'pedestrian'; }
    function activeCostType() { var el = document.querySelector('.sv-iso-costtype.active'); return el ? el.dataset.value : 'time'; }
    function activePoi()      { var el = document.getElementById('sv-iso-poi');             return el ? el.value : ''; }

    function buildOsmLink() {
        if (!_map) { return 'https://www.openstreetmap.org'; }
        var view   = _map.getView();
        var center = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
        var zoom   = Math.round(view.getZoom());
        return 'https://www.openstreetmap.org/#map=' + zoom + '/' + center[1].toFixed(5) + '/' + center[0].toFixed(5);
    }

    function setPoiCount(msg) {
        var el = document.getElementById('sv-iso-poi-count');
        if (el) { el.textContent = msg; }
        var contrib = document.getElementById('sv-iso-poi-contribute');
        if (!contrib) { return; }
        if (msg) {
            var url = buildOsmLink();
            contrib.style.display = '';
            contrib.innerHTML = '<a href="' + url + '" target="_blank" rel="noopener" style="color:inherit">' + t('poi.contribute') + '</a>';
        } else {
            contrib.style.display = 'none';
            contrib.innerHTML = '';
        }
    }

    // --- Compute ---------------------------------------------------------

    function compute() {
        if (!currentPoint) { return; }

        var seq      = ++_fetchSeq;
        var costType = activeCostType();
        var profile  = activeProfile();
        var rawValue = parseInt(document.getElementById('sv-iso-value').value, 10) || 10;
        var costValue = costType === 'time' ? rawValue * 60 : rawValue * 1000;

        var params = new URLSearchParams({
            resource:       'bdtopo-valhalla',
            point:          currentPoint[0] + ',' + currentPoint[1],
            profile:        profile,
            costType:       costType,
            costValue:      String(costValue),
            direction:      'departure',
            geometryFormat: 'geojson',
            crs:            'EPSG:4326',
            timeUnit:       'second',
            distanceUnit:   'meter'
        });

        setStatus(t('msg.computing'));
        clearPoi();
        setPoiCount('');

        fetch(API + '?' + params.toString())
            .then(function (r) {
                if (seq !== _fetchSeq) { return null; }
                if (!r.ok) { throw new Error('HTTP ' + r.status); }
                return r.json();
            })
            .then(function (data) {
                if (!data || seq !== _fetchSeq) { return; }
                if (!data.geometry) { throw new Error(t('msg.no_geometry')); }

                var labelParts = [
                    rawValue + ' ' + t(costType === 'time' ? 'unit.min' : 'unit.km'),
                    t('profile.' + profile)
                ];

                var geom = new ol.format.GeoJSON().readGeometry(data.geometry, {
                    dataProjection:       'EPSG:4326',
                    featureProjection:    'EPSG:3857'
                });
                var feat = new ol.Feature(geom);
                feat.setProperties({ profile: profile, costType: costType, costValue: rawValue, label: labelParts.join(' · ') });

                var isoStyle = [
                    new ol.style.Style({ stroke: new ol.style.Stroke({ color: 'rgba(255,255,255,0.7)', width: 8 }) }),
                    new ol.style.Style({ stroke: new ol.style.Stroke({ color: '#ff6600', width: 5 }) })
                ];

                SViewer.loadFeatureObjects([feat], { styleOverride: function() { return isoStyle; }, fitExtent: true });

                currentPolygon = data.geometry;
                setStatus(tf('msg.done', labelParts.join(' · ')));

                var poi = activePoi();
                if (poi) { fetchPoi(poi, currentPolygon); }
            })
            .catch(function (err) {
                if (seq !== _fetchSeq) { return; }
                setStatus(tf('msg.error', friendlyError(err)));
            });
    }

    // --- Nominatim + PIP -------------------------------------------------

    function bboxFromGeometry(geometry) {
        var ring;
        if (geometry.type === 'Polygon') {
            ring = geometry.coordinates[0];
        } else if (geometry.type === 'MultiPolygon') {
            ring = geometry.coordinates[0][0];
        } else {
            return null;
        }
        var minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
        ring.forEach(function(p) {
            if (p[0] < minLon) { minLon = p[0]; }
            if (p[0] > maxLon) { maxLon = p[0]; }
            if (p[1] < minLat) { minLat = p[1]; }
            if (p[1] > maxLat) { maxLat = p[1]; }
        });
        return [minLon, minLat, maxLon, maxLat];
    }

    function pointInPolygon(lon, lat, ring) {
        var inside = false;
        for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            var xi = ring[i][0], yi = ring[i][1];
            var xj = ring[j][0], yj = ring[j][1];
            if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    function insideGeometry(lon, lat, geometry) {
        if (geometry.type === 'Polygon') {
            return pointInPolygon(lon, lat, geometry.coordinates[0]);
        }
        if (geometry.type === 'MultiPolygon') {
            return geometry.coordinates.some(function(poly) {
                return pointInPolygon(lon, lat, poly[0]);
            });
        }
        return false;
    }

    function fetchPoi(poiKey, geometry) {
        var bbox = bboxFromGeometry(geometry);
        if (!bbox) { return; }

        var seq = ++_poiSeq;
        setPoiCount(t('poi.loading'));

        var params = new URLSearchParams({
            amenity:  poiKey,
            format:   'json',
            limit:    '50',
            viewbox:  bbox[0] + ',' + bbox[3] + ',' + bbox[2] + ',' + bbox[1],
            bounded:  '1'
        });

        fetch(NOMINATIM + '?' + params.toString(), {
            headers: { 'Accept-Language': (SViewer.config && SViewer.config.lang) || 'fr' }
        })
            .then(function(r) {
                if (seq !== _poiSeq) { return null; }
                if (!r.ok) { throw new Error('HTTP ' + r.status); }
                return r.json();
            })
            .then(function(data) {
                if (!data || seq !== _poiSeq) { return; }
                var inside = data.filter(function(el) {
                    return insideGeometry(parseFloat(el.lon), parseFloat(el.lat), geometry);
                });
                plotPoi(inside);
                var item = poiItemByKey(poiKey);
                var label = item ? poiLabel(item) : poiKey;
                var capped = data.length >= 50;
                setPoiCount(tf('poi.count', label, inside.length) + (capped ? ' ' + t('poi.capped') : ''));
            })
            .catch(function(err) {
                if (seq !== _poiSeq) { return; }
                setPoiCount(tf('poi.error', friendlyError(err)));
            });
    }

    function plotPoi(elements) {
        poiSource.clear();
        var features = [];
        elements.forEach(function(el) {
            var lat = parseFloat(el.lat);
            var lon = parseFloat(el.lon);
            if (isNaN(lat) || isNaN(lon)) { return; }
            var coord3857 = ol.proj.transform([lon, lat], 'EPSG:4326', 'EPSG:3857');
            var feat = new ol.Feature(new ol.geom.Point(coord3857));
            feat.setProperties({ name: el.display_name || '', type: el.type || '' });
            features.push(feat);
        });
        poiSource.addFeatures(features);
    }

    // --- Helpers ---------------------------------------------------------

    function friendlyError(err) {
        var m = err.message || '';
        if (m.indexOf('429') !== -1) { return t('msg.err_ratelimit'); }
        if (m.indexOf('50')  !== -1) { return t('msg.err_server'); }
        if (m.toLowerCase().indexOf('fetch') !== -1 || m.toLowerCase().indexOf('network') !== -1) { return t('msg.err_network'); }
        return m;
    }

    function setStatus(msg) {
        var el = document.getElementById('sv-iso-status');
        if (el) { el.textContent = msg; }
    }

}());
