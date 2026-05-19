/**
 * sViewer extension — Panoramax
 *
 * Adds a toolbar button that toggles street-level photo coverage on the map.
 * Three MVT layers: grid (zoom 0-7), sequences (zoom 7-16), pictures (zoom 16+).
 * Clicking a picture dot fetches metadata then opens a 360° viewer panel (Photo Sphere Viewer).
 *
 * Activated via customConfig.js:  extensions: ['panoramax']
 *
 * Bundled deps (self-hosted, loaded lazily on first use):
 *   ext/panoramax/mvt.min.js  — ol/layer/VectorTile + ol/source/VectorTile + ol/format/MVT
 *   ext/panoramax/psv.min.js  — @photo-sphere-viewer/core + three.js
 *   ext/panoramax/psv.min.css — PSV stylesheet
 */
(function () {
    'use strict';

    var API_BASE = 'https://api.panoramax.xyz/api';
    var TILES_URL = API_BASE + '/map/{z}/{x}/{y}.mvt';
    var PANEL    = 'panoramax';

    var active        = false;
    var gridLayer     = null;
    var seqLayer      = null;
    var picLayer      = null;
    var psvInstance   = null;
    var psvLoaded     = false;
    var psvLoading    = false;
    var mvtLoaded     = false;
    var mvtLoading    = false;
    var mvtQueue      = [];    // callbacks waiting for MVT load
    var psvQueue      = [];    // callbacks waiting for PSV load
    var selectedId    = null;  // id of selected picture feature
    var selectedAzimuth = 0;   // current viewer yaw in degrees

    // Resolve base URL of this extension (needed for relative asset paths).
    // SViewer.extensionBase() uses document.currentScript — must be called at module scope.
    var BASE = SViewer.extensionBase();

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

    fetch(BASE + 'i18n.json')
        .then(function(r) { return r.ok ? r.json() : {}; })
        .catch(function()  { return {}; })
        .then(function(data) { _i18n = data; });

    function loadMVT(cb) {
        if (mvtLoaded) { cb(); return; }
        mvtQueue.push(cb);
        if (mvtLoading) { return; }
        mvtLoading = true;
        var s = document.createElement('script');
        s.src = BASE + 'mvt.min.js';
        s.onload = function() {
            mvtLoaded = true; mvtLoading = false;
            var q = mvtQueue.splice(0); q.forEach(function(fn) { fn(); });
        };
        s.onerror = function() {
            mvtLoading = false;
            mvtQueue.splice(0); // discard — avoid orphaned callbacks
        };
        document.head.appendChild(s);
    }

    function loadPSV(cb) {
        if (psvLoaded) { cb(); return; }
        psvQueue.push(cb);
        if (psvLoading) { return; }
        psvLoading = true;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = BASE + 'psv.min.css';
        document.head.appendChild(link);
        var s = document.createElement('script');
        s.src = BASE + 'psv.min.js';
        s.onload = function() {
            psvLoaded = true; psvLoading = false;
            var q = psvQueue.splice(0); q.forEach(function(fn) { fn(); });
        };
        s.onerror = function() {
            psvLoading = false;
            psvQueue.splice(0); // discard — avoid orphaned callbacks
        };
        document.head.appendChild(s);
    }

    // --- Styles (built after OLMVT loads — use OLMVT style classes, not ol.*) ---

    var OLS = null; // set in enable() after loadMVT

    // grid: coef 0→1 mapped orange→red→dark (filter non-grid features)
    function gridStyle(feature) {
        if (feature.get('layer') !== 'grid') { return null; }
        var coef = parseFloat(feature.get('coef')) || 0;
        var r = Math.round(255 - coef * 80);
        var g = Math.round(120 - coef * 100);
        var color = 'rgba(' + r + ',' + g + ',0,0.75)';
        return new OLS.Style({
            image: new OLS.Circle({
                radius: 5,
                fill:   new OLS.Fill({ color: color }),
                stroke: new OLS.Stroke({ color: 'rgba(255,255,255,0.3)', width: 0.5 })
            })
        });
    }

    var _picStyleDefault = null; // cached after OLS init

    // Combined picture style: selected = orange wedge, default = blue dot.
    // VectorTile RenderFeatures don't support setStyle() — selection tracked by id.
    function picStyleFn(feature) {
        if (feature.get('layer') !== 'pictures') { return null; }
        if (feature.get('id') === selectedId) {
            var az = selectedAzimuth * Math.PI / 180;
            return new OLS.Style({
                renderer: function(coords, state) {
                    var ctx = state.context;
                    var x = coords[0], y = coords[1];
                    var r = 18, half = Math.PI / 4;
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(az);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.arc(0, 0, r, -Math.PI / 2 - half, -Math.PI / 2 + half);
                    ctx.closePath();
                    ctx.fillStyle   = 'rgba(220,80,0,0.80)';
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth   = 1.5;
                    ctx.stroke();
                    ctx.restore();
                    ctx.beginPath();
                    ctx.arc(x, y, 6, 0, 2 * Math.PI);
                    ctx.fillStyle   = 'rgba(220,80,0,0.95)';
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth   = 2;
                    ctx.stroke();
                }
            });
        }
        return _picStyleDefault;
    }

    // --- Layer factory ---

    function makeTileLayer(OL, styleOrFn, minZoom, maxZoom) {
        return new OL.VectorTileLayer({
            source: new OL.VectorTileSource({
                format:     new OL.MVT(),
                url:        TILES_URL,
                projection: 'EPSG:3857',
                maxZoom:    15  // server returns 400 above z15
            }),
            style:   styleOrFn,
            minZoom: minZoom,
            maxZoom: maxZoom,
            zIndex:  50
        });
    }

    function enable(map) {
        active = true;
        loadMVT(function() {
            if (!active) { return; } // disabled while loading
            var OL = window._OLMVT_panoramax;
            OLS = OL; // expose style constructors to style functions
            _picStyleDefault = new OL.Style({
                image: new OL.Circle({
                    radius: 5,
                    fill:   new OL.Fill({ color: 'rgba(220,100,0,0.85)' }),
                    stroke: new OL.Stroke({ color: '#fff', width: 1.5 })
                })
            });

            var _seqStyle = new OL.Style({
                stroke: new OL.Stroke({ color: 'rgba(220,100,0,0.7)', width: 2 })
            });
            // Style functions filter by MVT layer name — each OL layer sees all MVT layers.
            function seqStyle(f) { return f.get('layer') === 'sequences' ? _seqStyle : null; }

            gridLayer = makeTileLayer(OL, gridStyle,    0,  7);
            seqLayer  = makeTileLayer(OL, seqStyle,     7, 16);
            picLayer  = makeTileLayer(OL, picStyleFn,  16, 24);
            map.addLayer(gridLayer);
            map.addLayer(seqLayer);
            map.addLayer(picLayer);
        });
    }

    function disable(map) {
        active = false;
        selectedId = null; selectedAzimuth = 0;
        if (gridLayer) { map.removeLayer(gridLayer); gridLayer = null; }
        if (seqLayer)  { map.removeLayer(seqLayer);  seqLayer  = null; }
        if (picLayer)  { map.removeLayer(picLayer);  picLayer  = null; }
        destroyPSV();
        SViewer.panel.close();
    }

    function destroyPSV() {
        if (psvInstance) { try { psvInstance.destroy(); } catch(e) {} psvInstance = null; }
    }

    function openPanel(html) {
        SViewer.panel.open(PANEL, t('panel.title'), html);
    }

    function parseLicenseLink(links) {
        if (!Array.isArray(links)) { return null; }
        for (var i = 0; i < links.length; i++) {
            if (links[i].rel === 'license') { return links[i].href || null; }
        }
        return null;
    }

    var _licenseMap = {
        'licence-ouverte': 'Etalab 2.0',
        'etalab':          'Etalab 2.0',
        'cc-by-sa-4.0':    'CC BY-SA 4.0',
        'cc-by-4.0':       'CC BY 4.0',
        'cc-by-sa':        'CC BY-SA',
        'cc-by':           'CC BY',
        'odbl':            'ODbL',
        'cc0':             'CC0'
    };

    function licenseLabel(url) {
        var u = url.toLowerCase();
        for (var key in _licenseMap) {
            if (u.indexOf(key) !== -1) { return _licenseMap[key]; }
        }
        return t('link.licence');
    }

    function detectFov(props) {
        var io  = props['pers:interior_orientation'] || {};
        var fov = io.field_of_view;
        if (fov === 360) { return '360°'; }
        if (fov > 0)     { return fov + '°'; }
        var xmp = props.exif || {};
        if (xmp['Xmp.GPano.ProjectionType'] === 'equirectangular') { return '360°'; }
        return null;
    }

    function formatDate(dt) {
        if (!dt) { return ''; }
        var d = new Date(dt);
        if (isNaN(d.getTime())) { return dt.slice(0, 10); }
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function openSequence(feature) {
        var seqId = feature.get('id');
        if (!seqId) { return; }

        openPanel('<div style="padding:1rem;color:#888">' + t('msg.loading') + '</div>');
        destroyPSV();

        fetch(API_BASE + '/collections/' + seqId + '/items?limit=1')
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(data) {
                if (!data || !Array.isArray(data.features) || !data.features.length) { return; }
                var f        = data.features[0];
                var props    = f.properties || {};
                var coords   = (f.geometry && f.geometry.coordinates) || [];
                var lon      = coords[0] || 0;
                var lat      = coords[1] || 0;
                var picId    = f.id || '';
                var imageUrl = props['geovisio:image']     || '';
                var thumb    = props['geovisio:thumbnail'] || '';
                var date     = formatDate(props.datetime);
                var producer = props['geovisio:producer']  || '';
                var azimuth  = props['view:azimuth']       || 0;
                var license  = parseLicenseLink(f.links);
                var fov      = detectFov(props);
                selectedAzimuth = azimuth;
                showPanel({ imageUrl: imageUrl, thumb: thumb, date: date, producer: producer,
                            azimuth: azimuth, license: license, picId: picId, seqId: seqId,
                            lon: lon, lat: lat, fov: fov });
            })
            .catch(function() {});
    }

    // Fetch picture metadata (image URL etc.) from API, then show panel.
    function openPicture(feature) {
        var picId = feature.get('id');
        var seqId = feature.get('first_sequence') || feature.get('sequences');
        if (typeof seqId === 'string' && seqId.charAt(0) === '[') {
            try { seqId = JSON.parse(seqId)[0]; } catch(e) { seqId = null; }
        }
        if (!picId || !seqId) {
            openPanel('<div style="padding:1rem;color:#c00">' + t('msg.not_found') + '</div>');
            return;
        }

        openPanel('<div style="padding:1rem;color:#888">' + t('msg.loading') + '</div>');

        fetch(API_BASE + '/collections/' + seqId + '/items/' + picId)
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(data) {
                if (!data) {
                    openPanel('<div style="padding:1rem;color:#c00">' + t('msg.load_error') + '</div>');
                    return;
                }
                var props    = data.properties || {};
                var coords   = (data.geometry && data.geometry.coordinates) || [];
                var lon      = coords[0] || 0;
                var lat      = coords[1] || 0;
                var imageUrl = props['geovisio:image']     || '';
                var thumb    = props['geovisio:thumbnail'] || '';
                var date     = formatDate(props.datetime);
                var producer = props['geovisio:producer']  || '';
                var azimuth  = props['view:azimuth']       || feature.get('heading') || 0;
                var license  = parseLicenseLink(data.links);
                var fov      = detectFov(props);
                selectedAzimuth = azimuth;
                showPanel({ imageUrl: imageUrl, thumb: thumb, date: date, producer: producer,
                            azimuth: azimuth, license: license, picId: picId, seqId: seqId,
                            lon: lon, lat: lat, fov: fov });
            })
            .catch(function() {
                openPanel('<div style="padding:1rem;color:#c00">' + t('msg.network_error') + '</div>');
            });
    }

    function metaRow(label, value) {
        return '<div style="display:flex;gap:.5rem;font-size:.8rem;margin-bottom:.2rem">'
            + '<span style="color:var(--sv-panel-fg-muted);flex-shrink:0;min-width:5rem">' + label + '</span>'
            + '<span>' + value + '</span>'
            + '</div>';
    }

    function showPanel(p) {
        var lang = (SViewer.config && SViewer.config.lang) || 'fr';
        var viewerUrl = p.picId
            ? 'https://explore.panoramax.fr/' + lang + '/index?focus=pic'
                + '&map=17/' + p.lat.toFixed(6) + '/' + p.lon.toFixed(6)
                + '&pic=' + p.picId
                + (p.seqId ? '&seq=' + p.seqId : '')
                + '&speed=250&theme=default&users=default'
                + '&xyz=' + p.azimuth.toFixed(2) + '/0.00/30'
            : 'https://explore.panoramax.fr';

        var typeLabel = p.fov === '360°' ? t('type.360') : p.fov ? tf('type.perspective', p.fov.replace('°', '')) : '';
        var html = '<div id="pano-psv-container" style="width:100%;height:260px;background:#111;border-radius:4px;margin-bottom:.8rem"></div>'
            + '<div style="margin-bottom:.6rem">'
            + (p.date     ? metaRow(t('meta.date'),    p.date) : '')
            + (p.producer ? metaRow(t('meta.source'),  p.producer) : '')
            + (typeLabel  ? metaRow(t('meta.type'),    typeLabel) : '')
            + metaRow(t('meta.azimuth'), '<span id="pano-cap-value">' + Math.round(p.azimuth) + '°</span>')
            + (p.license  ? metaRow(t('meta.licence'), '<a href="' + p.license + '" target="_blank" rel="noopener noreferrer" style="color:inherit">' + licenseLabel(p.license) + '</a>') : '')
            + '</div>'
            + '<div style="font-size:.75rem;border-top:1px solid var(--sv-border);padding-top:.4rem">'
            + '<a id="pano-view-link" href="' + viewerUrl + '" target="_blank" rel="noopener noreferrer" style="color:var(--sv-panel-fg-muted)">' + t('link.view') + '</a>'
            + '</div>';

        openPanel(html);
        destroyPSV();
        if (!p.imageUrl) { return; }

        loadPSV(function() {
            var container = document.getElementById('pano-psv-container');
            if (!container || !window.PSV) { return; }
            try {
                psvInstance = new window.PSV.Viewer({
                    container:   container,
                    panorama:    p.imageUrl,
                    defaultYaw:  p.azimuth * Math.PI / 180,
                    navbar:      false,
                    touchmoveTwoFingers: false
                });
                psvInstance.addEventListener('position-updated', function(e) {
                    selectedAzimuth = e.position.yaw * 180 / Math.PI;
                    var capEl = document.getElementById('pano-cap-value');
                    if (capEl) { capEl.textContent = Math.round(selectedAzimuth) + '°'; }
                    if (selectedId && picLayer) { picLayer.changed(); }
                    var linkEl = document.getElementById('pano-view-link');
                    if (linkEl && p.picId) {
                        var lang2 = (SViewer.config && SViewer.config.lang) || 'fr';
                        linkEl.href = 'https://explore.panoramax.fr/' + lang2 + '/index?focus=pic'
                            + '&map=17/' + p.lat.toFixed(6) + '/' + p.lon.toFixed(6)
                            + '&pic=' + p.picId
                            + (p.seqId ? '&seq=' + p.seqId : '')
                            + '&speed=250&theme=default&users=default'
                            + '&xyz=' + selectedAzimuth.toFixed(2) + '/0.00/30';
                    }
                });
            } catch(e) {
                container.innerHTML = '';
                if (p.thumb) {
                    var img = document.createElement('img');
                    img.src = p.thumb;
                    img.alt = 'photo';
                    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:4px';
                    container.appendChild(img);
                } else {
                    var msg = document.createElement('div');
                    msg.style.cssText = 'color:#888;padding:1rem;text-align:center';
                    msg.textContent = t('msg.no_preview');
                    container.appendChild(msg);
                }
            }
        });
    }

    SViewer.onMapReady(function(ctx) {
        var map = ctx.map;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-dark sv-map-btn sv-alt-toggle';
        btn.title = t('panel.title');
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', t('btn.label'));
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4z"/><path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5m0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/></svg>';

        btn.addEventListener('click', function() {
            if (active) {
                disable(map);
                btn.setAttribute('aria-pressed', 'false');
                btn.classList.remove('active');
            } else {
                enable(map);
                btn.setAttribute('aria-pressed', 'true');
                btn.classList.add('active');
            }
        });

        var toolbar = document.getElementById('sv-panel-controls');
        if (toolbar) { toolbar.appendChild(btn); }

        SViewer.addClickHandler(function(evt) {
            if (!active) { return; }
            var hit = false;
            map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
                if (hit) { return; }
                if (layer !== picLayer && layer !== seqLayer) { return; }
                var mvtLayer = feature.get('layer');
                if (mvtLayer !== 'pictures' && mvtLayer !== 'sequences') { return; }
                hit = true;
                if (mvtLayer === 'pictures') {
                    selectedId = feature.get('id');
                    selectedAzimuth = parseFloat(feature.get('heading')) || 0;
                    if (picLayer) { picLayer.changed(); }
                    openPicture(feature);
                } else {
                    selectedId = null;
                    if (picLayer) { picLayer.changed(); }
                    openSequence(feature);
                }
            }, { hitTolerance: 8 });
            return hit || undefined;
        });
    });

}());
