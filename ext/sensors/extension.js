/**
 * Capteurs (SensorThings) — display an OGC SensorThings service in sViewer.
 *
 * Stations on the map; click a station → pick a "mesure" (datastream) from a
 * chip row → time-series chart with drag-to-zoom on a time interval.
 * Scope v1 = one chart at a time (mviewer default). See ext/sensors/SPEC.md.
 *
 * Chart = uPlot (MIT, vendored + lazy-loaded). Config: ?ext=sensors&sta=<URL>
 * or paste in the panel. Reuses ext/panoramax (click detail) + ext/field
 * (paste-URL config) patterns. Full API: ext/EXT_API.md
 */
(function () {
    'use strict';

    var PANEL    = 'sensors';
    var PAGE_OBS = 1000;   // page size for the Observations request ($top)
    var DEF_MAX  = 2000;   // default ceiling without pagination
    var HARD_MAX = 200000; // absolute safety cap (memory / canvas)
    var LOAD_MORE_STEP = 4000; // "load more" raises the session ceiling by this
    var MAX_LOC  = 500;    // safety cap on paginated Locations

    // uPlot (MIT, vendored ext/sensors/uplot.min.{js,css}) — lazy-loaded on the
    // first chart so core + map load stay fast and non-sensors pages pay nothing.
    var BASE = SViewer.extensionBase();   // must read at module scope (currentScript)
    var uplotReady = null;                // cached load Promise
    function loadUplot() {
        if (uplotReady) { return uplotReady; }
        uplotReady = new Promise(function (resolve, reject) {
            var link = document.createElement('link');
            link.rel = 'stylesheet'; link.href = BASE + 'uplot.min.css';
            document.head.appendChild(link);
            var s = document.createElement('script');
            s.src = BASE + 'uplot.min.js';
            s.onload = function () { resolve(window.uPlot); };
            s.onerror = function () { reject(new Error('uplot-load-failed')); };
            document.head.appendChild(s);
        });
        return uplotReady;
    }

    // --- i18n -----------------------------------------------------------------
    var I18N = {
        fr: {
            'btn.title':    'Capteurs (SensorThings)',
            'panel.title':  'Capteurs',
            'cfg.label':    'URL du service SensorThings',
            'cfg.ph':       'https://exemple.fr/.../v1.1/',
            'cfg.load':     'Charger',
            'cfg.hint':     'Collez l’URL d’un service SensorThings pour afficher ses stations.',
            'loading':      'Chargement…',
            'stations.count': 'station(s)',
            'station.measures': 'Mesures',
            'measures.none': 'Aucune mesure pour cette station.',
            'obs.none':     'Aucune donnée pour cette mesure.',
            'back':         '‹ Stations',
            'err.url':      'URL invalide.',
            'err.fetch':    'Service injoignable ou non conforme.',
            'err.nosta':    'Ce service ne ressemble pas à du SensorThings.',
            'chart.zoom':   'Glissez sur le graphique pour zoomer sur une période ; double-clic pour réinitialiser.',
            'chart.points': 'relevés',
            'chart.more':   'Charger plus',
            'err.chart':    'Graphique indisponible.'
        },
        en: {
            'btn.title':    'Sensors (SensorThings)',
            'panel.title':  'Sensors',
            'cfg.label':    'SensorThings service URL',
            'cfg.ph':       'https://example.com/.../v1.1/',
            'cfg.load':     'Load',
            'cfg.hint':     'Paste a SensorThings service URL to show its stations.',
            'loading':      'Loading…',
            'stations.count': 'station(s)',
            'station.measures': 'Measures',
            'measures.none': 'No measure for this station.',
            'obs.none':     'No data for this measure.',
            'back':         '‹ Stations',
            'err.url':      'Invalid URL.',
            'err.fetch':    'Service unreachable or non-conformant.',
            'err.nosta':    'This does not look like a SensorThings service.',
            'chart.zoom':   'Drag on the chart to zoom a time interval; double-click to reset.',
            'chart.points': 'readings',
            'chart.more':   'Load more',
            'err.chart':    'Chart unavailable.'
        },
        es: {
            'btn.title':    'Sensores (SensorThings)',
            'panel.title':  'Sensores',
            'cfg.label':    'URL del servicio SensorThings',
            'cfg.ph':       'https://ejemplo.com/.../v1.1/',
            'cfg.load':     'Cargar',
            'cfg.hint':     'Pegue una URL de servicio SensorThings para ver sus estaciones.',
            'loading':      'Cargando…',
            'stations.count': 'estación(es)',
            'station.measures': 'Medidas',
            'measures.none': 'Ninguna medida para esta estación.',
            'obs.none':     'Sin datos para esta medida.',
            'back':         '‹ Estaciones',
            'err.url':      'URL no válida.',
            'err.fetch':    'Servicio inaccesible o no conforme.',
            'err.nosta':    'Esto no parece un servicio SensorThings.',
            'chart.zoom':   'Arrastre sobre el gráfico para ampliar un intervalo; doble clic para restablecer.',
            'chart.points': 'lecturas',
            'chart.more':   'Cargar más',
            'err.chart':    'Gráfico no disponible.'
        },
        de: {
            'btn.title':    'Sensoren (SensorThings)',
            'panel.title':  'Sensoren',
            'cfg.label':    'SensorThings-Dienst-URL',
            'cfg.ph':       'https://beispiel.de/.../v1.1/',
            'cfg.load':     'Laden',
            'cfg.hint':     'Fügen Sie eine SensorThings-Dienst-URL ein, um die Stationen anzuzeigen.',
            'loading':      'Lädt…',
            'stations.count': 'Station(en)',
            'station.measures': 'Messungen',
            'measures.none': 'Keine Messung für diese Station.',
            'obs.none':     'Keine Daten für diese Messung.',
            'back':         '‹ Stationen',
            'err.url':      'Ungültige URL.',
            'err.fetch':    'Dienst nicht erreichbar oder nicht konform.',
            'err.nosta':    'Dies sieht nicht nach einem SensorThings-Dienst aus.',
            'chart.zoom':   'Auf dem Diagramm ziehen, um einen Zeitraum zu zoomen; Doppelklick zum Zurücksetzen.',
            'chart.points': 'Messwerte',
            'chart.more':   'Mehr laden',
            'err.chart':    'Diagramm nicht verfügbar.'
        }
    };
    function lang() {
        var l = (SViewer.state && SViewer.state.lang) || (SViewer.config && SViewer.config.lang) || 'fr';
        return I18N[l] ? l : 'fr';
    }
    function t(key) { var L = I18N[lang()]; return (L && L[key]) || I18N.fr[key] || key; }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // --- URL validation (sta is untrusted) ------------------------------------
    function validService(u) {
        try {
            var url = new URL(u);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') { return null; }
            // normalise: ensure trailing slash
            var s = url.href;
            return s.charAt(s.length - 1) === '/' ? s : s + '/';
        } catch (e) { return null; }
    }
    // Validate an @iot.id taken from a URL param before it goes into an OData
    // path segment (Locations(<id>) / Datastreams(<id>)). STA ids are integers
    // or single-quoted strings; accept those two shapes only, reject anything
    // that could break out of the path. Returns the cleaned id or null.
    function validId(v) {
        if (v == null) { return null; }
        v = String(v).trim();
        if (/^[0-9]+$/.test(v)) { return v; }                 // integer id
        if (/^'[^'"\\<>()\s]+'$/.test(v)) { return v; }       // quoted string id
        return null;
    }

    SViewer.onMapReady(function (ctx) {
        var map = ctx.map;
        var active  = false;
        var service = null;      // validated base URL
        var stations = [];       // [{ id, name, coords(4326) }]
        var curStation = null;   // selected station object
        var datastreams = [];    // current station's [{ id, name, unit }]
        var selDs = null;        // selected datastream id
        var fetchSeq = 0;        // stale-response guard
        var maxObs = DEF_MAX;    // observation ceiling (raised by ?sta_pagination=)
        var autoDsPending = null; // deep-link datastream id, consumed once by openStation

        var geojsonFmt = new ol.format.GeoJSON();

        // --- Vector layer (own) ----------------------------------------------
        var source = new ol.source.Vector();
        // declutter: drop overlapping station labels instead of letting them
        // collide (seen with close stations).
        var layer  = new ol.layer.Vector({ source: source, zIndex: 940, declutter: true, style: stationStyle });
        map.addLayer(layer);

        function stationStyle(feature) {
            var sel = feature.get('id') === (curStation && curStation.id);
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: sel ? 9 : 7,
                    fill:   new ol.style.Fill({ color: sel ? '#0d6efd' : '#198754' }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
                }),
                text: new ol.style.Text({
                    text: feature.get('name') || '',
                    offsetY: -14, font: '600 12px system-ui, sans-serif',
                    fill: new ol.style.Fill({ color: '#1a1a1a' }),
                    stroke: new ol.style.Stroke({ color: 'rgba(255,255,255,0.95)', width: 4 }),
                    overflow: true
                })
            });
        }

        // --- STA fetch helpers ------------------------------------------------
        function staGet(url) {
            return fetch(url, { headers: { Accept: 'application/json' } })
                .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); });
        }

        // --- Step 2: Locations → station features -----------------------------
        // auto = { station, ds } — optional deep-link target from KVP params.
        // After stations load, auto-select that station (and datastream), opening
        // the panel straight on the chart. A missing id falls back gracefully to
        // the normal station view (no crash, no empty panel).
        function loadStations(url, auto) {
            var svc = validService(url);
            if (!svc) { showError(t('err.url')); return; }
            service = svc;
            curStation = null; selDs = null;
            showLoading();
            fetchAllLocations(service + 'Locations', []).then(function (locs) {
                stations = locs;
                rebuildStations();
                if (stations.length) { fitStations(); }
                renderStationList();
                if (auto && auto.station) { autoSelect(auto); }
            }).catch(function (e) {
                showError(/sta|json|unexpected/i.test(String(e)) ? t('err.nosta') : t('err.fetch'));
            });
        }
        // Deep-link: select the station whose id matches, centre on it, and if a
        // datastream id is given, chart it (otherwise openStation defaults to the
        // first mesure, mviewer-style). Unknown ids degrade to the normal view.
        function autoSelect(auto) {
            var st = null;
            for (var i = 0; i < stations.length; i++) {
                if (String(stations[i].id) === String(auto.station)) { st = stations[i]; break; }
            }
            if (!st) { return; }   // station not in this service → leave normal view
            map.getView().animate({
                center: geojsonFmt.readGeometry({ type: 'Point', coordinates: st.coords },
                    { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }).getCoordinates(),
                duration: 350
            });
            // openStation loads datastreams then selects one; stash the requested
            // ds so it picks that instead of the first (consumed once, in openStation).
            autoDsPending = auto.ds || null;
            openStation(st);
        }
        // SensorThings "location" comes in two shapes in the wild:
        //   standard:     { geometry: { type:'Point', coordinates:[...] }, ... }  (GeoJSON Feature)
        //   non-standard: { type:'Point', coordinates:[...] }                     (geometry inline — majority)
        // Accept both. Returns [lon,lat] or null.
        function pointGeom(location) {
            if (!location || typeof location !== 'object') { return null; }
            var g = location.geometry || location;   // unwrap Feature, else use as-is
            if (g && g.type === 'Point' && Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
                return g.coordinates;
            }
            return null;
        }
        function fetchAllLocations(url, acc) {
            return staGet(url).then(function (j) {
                if (!j || !Array.isArray(j.value)) { return Promise.reject('not-sta'); }
                j.value.forEach(function (loc) {
                    var g = pointGeom(loc.location);
                    if (!g) { return; }
                    acc.push({ id: loc['@iot.id'], name: loc.name || ('#' + loc['@iot.id']), coords: g });
                });
                if (j['@iot.nextLink'] && acc.length < MAX_LOC) {
                    return fetchAllLocations(j['@iot.nextLink'], acc);
                }
                return acc;
            });
        }
        function rebuildStations() {
            source.clear();
            stations.forEach(function (s) {
                var f = new ol.Feature({
                    geometry: geojsonFmt.readGeometry({ type: 'Point', coordinates: s.coords },
                        { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' })
                });
                f.set('id', s.id); f.set('name', s.name);
                source.addFeature(f);
            });
        }
        function fitStations() {
            var ext = source.getExtent();
            if (ext && isFinite(ext[0])) {
                map.getView().fit(ext, { maxZoom: 15, duration: 350, padding: [60, 60, 60, 60] });
            }
        }

        // --- Step 3: click station → Things + Datastreams --------------------
        function openStation(st) {
            curStation = st; selDs = null; layer.changed();
            if (!active) { open(); }
            showLoading();
            var seq = ++fetchSeq;
            var url = service + 'Locations(' + encodeURIComponent(st.id) + ')/Things' +
                '?$select=id&$expand=Datastreams($select=name,id,unitOfMeasurement)';
            staGet(url).then(function (j) {
                if (seq !== fetchSeq) { return; }
                datastreams = [];
                (j.value || []).forEach(function (thing) {
                    (thing.Datastreams || []).forEach(function (ds) {
                        datastreams.push({
                            id: ds['@iot.id'], name: ds.name || ('#' + ds['@iot.id']),
                            unit: (ds.unitOfMeasurement && ds.unitOfMeasurement.symbol) || ''
                        });
                    });
                });
                renderStationDetail();
                if (datastreams.length) {
                    // Deep-link ds if requested AND present in this station, else the
                    // first mesure (mviewer default). autoDsPending consumed here.
                    var want = autoDsPending; autoDsPending = null;
                    var wantDs = want && dsById(want);
                    selectDatastream(wantDs ? wantDs.id : datastreams[0].id);
                }
            }).catch(function () { if (seq === fetchSeq) { showError(t('err.fetch')); } });
        }

        // --- Step 4: Observations → chart ------------------------------------
        function selectDatastream(id) {
            selDs = id;
            // Reflect selection on the chips without rebuilding the panel
            // (rebuilding would wipe the chart). Only the chart area changes below.
            document.querySelectorAll('#sv-panel-ext-sensors .sv-sensors-chip').forEach(function (c) {
                var on = c.getAttribute('data-ds') === String(id);
                c.classList.toggle('sel', on);
                c.setAttribute('aria-checked', on);
                c.tabIndex = on ? 0 : -1;   // roving tabindex follows selection
            });
            var seq = ++fetchSeq;
            var ds = dsById(id);
            var host = document.getElementById('sv-sensors-chart');
            if (host) { host.textContent = t('loading'); }
            var first = service + 'Datastreams(' + encodeURIComponent(id) + ')/Observations' +
                '?$top=' + PAGE_OBS + '&$select=result,phenomenonTime&$orderby=phenomenonTime desc';
            fetchObservations(first, [], seq).then(function (res) {
                if (seq !== fetchSeq) { return; }
                res.obs.sort(function (a, b) { return a.t - b.t; });   // ascending for the chart
                renderChart(res.obs, ds, seq, res.hasMore);
            }).catch(function () {
                var h = document.getElementById('sv-sensors-chart');
                if (h && seq === fetchSeq) { h.textContent = t('obs.none'); }
            });
        }
        // Follow @iot.nextLink until maxObs is reached. Returns { obs, hasMore }
        // where hasMore = more pages exist beyond the current ceiling (drives the
        // in-panel "load more" button — pagination from the UI, not just the URL).
        function fetchObservations(url, acc, seq) {
            return staGet(url).then(function (j) {
                if (seq !== fetchSeq) { return { obs: acc, hasMore: false }; }
                (j.value || []).forEach(function (o) {
                    var t0 = Date.parse(o.phenomenonTime), v = parseFloat(o.result);
                    if (isFinite(t0) && isFinite(v)) { acc.push({ t: t0, v: v }); }
                });
                var next = j['@iot.nextLink'];
                if (next && acc.length < maxObs) { return fetchObservations(next, acc, seq); }
                return { obs: acc, hasMore: !!next };   // next link left = more available
            });
        }
        // "Load more" raises the ceiling for THIS SESSION (users examine the same
        // period across stations/mesures, so the depth sticks while the page is
        // open), then reloads the current mesure. NOT persisted to localStorage —
        // a reload returns to the fast default, so a deep cap can never become a
        // permanent trap.
        function loadMore() {
            maxObs = Math.min(maxObs + LOAD_MORE_STEP, HARD_MAX);
            if (selDs != null) { selectDatastream(selDs); }
        }
        function dsById(id) {
            // Loose String() compare: @iot.id may be a number from JSON while a
            // URL-param / data-attr id is a string ("42" vs 42).
            for (var i = 0; i < datastreams.length; i++) {
                if (String(datastreams[i].id) === String(id)) { return datastreams[i]; }
            }
            return null;
        }

        // --- Time-series chart via uPlot (lazy-loaded, MIT) -------------------
        // Drag on the plot to zoom a time interval; double-click resets.
        var chart = null;   // active uPlot instance
        function destroyChart() { if (chart) { try { chart.destroy(); } catch (e) { /* */ } chart = null; } }

        // Core fires this when the user drags the dock taller/shorter → resize the
        // chart to fill the new height (a taller dock = a less-flat curve).
        SViewer.on('sv:panelResize', function () {
            if (!chart) { return; }
            var host = document.getElementById('sv-sensors-chart');
            var foot = host && host.querySelector('.sv-sensors-foot');
            if (!host) { return; }
            var hh = Math.max(90, host.clientHeight - (foot ? foot.offsetHeight : 24) - 6);
            chart.setSize({ width: host.clientWidth, height: hh });
        });

        function renderChart(obs, ds, seq, hasMore) {
            var host = document.getElementById('sv-sensors-chart');
            if (!host) { return; }
            if (!obs.length) { destroyChart(); host.textContent = t('obs.none'); return; }
            loadUplot().then(function (uPlot) {
                if (seq !== fetchSeq) { return; }                 // stale fetch
                var h = document.getElementById('sv-sensors-chart');
                if (!h) { return; }
                destroyChart();
                h.textContent = '';
                var unit = ds && ds.unit ? ds.unit : '';
                var chartDiv = document.createElement('div');
                h.appendChild(chartDiv);
                // uPlot wants [ xs(seconds), ys ] column arrays.
                var xs = obs.map(function (o) { return o.t / 1000; });
                var ys = obs.map(function (o) { return o.v; });
                // Fixed European formats, locale-independent (no am/pm, no MM/DD):
                // 24-hour HH:MM(:SS) for time, DD/MM/YY for dates.
                var fmtTime    = uPlot.fmtDate('{HH}:{mm}');
                var fmtTimeSec = uPlot.fmtDate('{HH}:{mm}:{ss}');
                var fmtDay     = uPlot.fmtDate('{DD}/{MM}/{YY}');
                var fmtFull    = uPlot.fmtDate('{DD}/{MM}/{YY} {HH}:{mm}:{ss}');
                // Fill the available box (dock is wide + short). Reserve room for
                // uPlot's legend row (~34px) + the footer line below.
                var availW = h.clientWidth || 300;
                // Footer first (so its height is known), then size the plot to fill
                // the rest. uPlot's own legend is OFF (it wraps + clips in a short
                // dock); the hover value goes into our single-line footer instead.
                var foot = document.createElement('p');
                foot.className = 'sv-sensors-foot';
                var readout = document.createElement('span');
                readout.className = 'sv-sensors-readout';
                var count = document.createElement('span');
                count.textContent = obs.length + ' ' + t('chart.points');
                foot.appendChild(readout);
                foot.appendChild(count);
                if (hasMore && maxObs < HARD_MAX) {
                    var more = document.createElement('button');
                    more.type = 'button';
                    more.className = 'btn btn-outline-secondary btn-sm';
                    more.textContent = t('chart.more');
                    more.addEventListener('click', loadMore);
                    foot.appendChild(more);
                }
                h.appendChild(foot);

                var availH = Math.max(90, h.clientHeight - foot.offsetHeight - 6);
                var opts = {
                    width: availW,
                    height: availH,
                    cursor: { drag: { x: true, y: false } },          // drag = zoom time interval
                    scales: { x: { time: true } },
                    legend: { show: false },                          // custom footer readout instead
                    series: [
                        {},
                        { stroke: '#0d6efd', width: 1.5, points: { show: false } }
                    ],
                    axes: [
                        { stroke: '#888', grid: { stroke: 'rgba(127,127,127,.18)' },
                          // 24h time within a day, DD/MM/YY once ticks span days+.
                          values: function (u, splits, ai, space, incr) {
                              var fmt = incr < 86400 ? (incr < 60 ? fmtTimeSec : fmtTime) : fmtDay;
                              return splits.map(function (s) { return fmt(new Date(s * 1000)); });
                          } },
                        { stroke: '#888', grid: { stroke: 'rgba(127,127,127,.18)' },
                          values: function (u, vals) { return vals.map(function (v) { return trimNum(v) + (unit ? ' ' + unit : ''); }); } }
                    ],
                    hooks: {
                        setCursor: [function (u) {
                            var i = u.cursor.idx;
                            if (i == null) { readout.textContent = ''; return; }
                            var x = u.data[0][i], y = u.data[1][i];
                            readout.textContent = y == null ? '' :
                                fmtFull(new Date(x * 1000)) + ' — ' + trimNum(y) + (unit ? ' ' + unit : '');
                        }]
                    }
                };
                chart = new uPlot(opts, [xs, ys], chartDiv);
            }).catch(function () {
                var h = document.getElementById('sv-sensors-chart');
                if (h && seq === fetchSeq) { h.textContent = t('err.chart'); }
            });
        }
        function trimNum(v) {
            return Math.abs(v) >= 100 ? Math.round(v).toString()
                 : (Math.round(v * 100) / 100).toString();
        }

        // --- Click handler: select station -----------------------------------
        SViewer.addClickHandler(function (evt) {
            if (!stations.length) { return; }
            var hit = null;
            map.forEachFeatureAtPixel(evt.pixel, function (feature, lyr) {
                if (hit !== null || lyr !== layer) { return; }
                hit = feature.get('id');
            }, { hitTolerance: 8 });
            if (hit === null) { return; }
            var st = stations.filter(function (s) { return s.id === hit; })[0];
            if (st) { openStation(st); return true; }
        });

        // --- Toolbar button ---------------------------------------------------
        var toolbar = document.getElementById('sv-panel-controls');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-dark sv-map-btn sv-alt-toggle';
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', t('btn.title'));
        btn.title = t('btn.title');
        // Inline SVG (broadcast/reception icon) — not relying on the icon subset.
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
            '<path d="M3.05 3.05a7 7 0 0 0 0 9.9.5.5 0 0 1-.707.707 8 8 0 0 1 0-11.314.5.5 0 0 1 .707.707m2.122 2.122a4 4 0 0 0 0 5.656.5.5 0 1 1-.708.708 5 5 0 0 1 0-7.072.5.5 0 0 1 .708.708m5.656-.708a.5.5 0 0 1 .708 0 5 5 0 0 1 0 7.072.5.5 0 1 1-.708-.708 4 4 0 0 0 0-5.656.5.5 0 0 1 0-.708m2.122-2.12a.5.5 0 0 1 .707 0 8 8 0 0 1 0 11.313.5.5 0 1 1-.707-.707 7 7 0 0 0 0-9.9.5.5 0 0 1 0-.707zM10 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0"/></svg>';
        toolbar.appendChild(btn);
        btn.addEventListener('click', function () { if (active) { SViewer.panel.close(); } else { open(); } });

        function open() {
            active = true;
            btn.setAttribute('aria-pressed', 'true'); btn.classList.add('active');
            injectStyle();
            // Bottom dock (full-width, ~1/3 height): time-series charts read
            // horizontally, so a wide strip beats a narrow side panel.
            SViewer.panel.open(PANEL, t('panel.title'), '<div id="sv-sensors-root"></div>', { dock: 'bottom' });
            if (!service) { renderConfig(); }
            else if (curStation) {
                renderStationDetail();
                // Chart was destroyed on close — redraw the selected mesure.
                if (selDs != null) { selectDatastream(selDs); }
            }
            else { renderStationList(); }
        }
        SViewer.panel.onClose(PANEL, function () {
            active = false; destroyChart();
            btn.setAttribute('aria-pressed', 'false'); btn.classList.remove('active');
        });

        // --- Render ----------------------------------------------------------
        function root() { return document.getElementById('sv-sensors-root'); }
        function showLoading() { var r = root(); if (r) { r.innerHTML = '<p class="sv-sensors-msg">' + esc(t('loading')) + '</p>'; } }
        function showError(msg) { var r = root(); if (r) { r.innerHTML = '<p class="sv-sensors-err">' + esc(msg) + '</p>' + configFormHtml(); bindConfig(); } }

        function configFormHtml() {
            return '<label class="sv-sensors-lbl">' + esc(t('cfg.label')) +
                '<input type="url" id="sv-sensors-url" placeholder="' + esc(t('cfg.ph')) +
                '" value="' + esc(service || '') + '"></label>' +
                '<button type="button" class="btn btn-primary btn-sm" id="sv-sensors-load">' + esc(t('cfg.load')) + '</button>';
        }
        function renderConfig() {
            var r = root(); if (!r) { return; }
            r.innerHTML = '<p class="sv-sensors-hint">' + esc(t('cfg.hint')) + '</p>' + configFormHtml();
            bindConfig();
        }
        function bindConfig() {
            var b = document.getElementById('sv-sensors-load');
            if (b) { b.addEventListener('click', function () {
                var v = document.getElementById('sv-sensors-url');
                if (v) { loadStations(v.value.trim()); }
            }); }
        }

        function renderStationList() {
            var r = root(); if (!r) { return; }
            var list = stations.length
                ? '<ul class="sv-sensors-list">' + stations.map(function (s) {
                    return '<li class="sv-sensors-row" data-id="' + esc(s.id) + '">' + esc(s.name) + '</li>';
                  }).join('') + '</ul><p class="sv-sensors-count">' + stations.length + ' ' + esc(t('stations.count')) + '</p>'
                : '<p class="sv-sensors-msg">0 ' + esc(t('stations.count')) + '</p>';
            r.innerHTML = list + '<hr>' + configFormHtml();
            r.querySelectorAll('[data-id]').forEach(function (row) {
                row.addEventListener('click', function () {
                    var st = stations.filter(function (s) { return String(s.id) === row.getAttribute('data-id'); })[0];
                    if (st) {
                        map.getView().animate({ center: ol.proj.fromLonLat(st.coords), duration: 350 });
                        openStation(st);
                    }
                });
            });
            bindConfig();
        }

        function renderStationDetail() {
            var r = root(); if (!r || !curStation) { return; }
            // Horizontal chips (one per mesure) rather than a <select>: all
            // options are visible = discoverable, and a horizontal row uses the
            // wide dock's WIDTH, not its scarce height. Latest value rides in each
            // chip. role=radiogroup — exactly one selected at a time.
            var picker = datastreams.length
                ? '<div class="sv-sensors-chips" role="radiogroup" aria-label="' + esc(t('station.measures')) + '">' +
                  datastreams.map(function (ds) {
                      var on = ds.id === selDs;
                      var label = ds.name + (ds.unit ? ' (' + ds.unit + ')' : '');
                      return '<button type="button" class="sv-sensors-chip' + (on ? ' sel' : '') + '" ' +
                          'data-ds="' + esc(ds.id) + '" role="radio" aria-checked="' + on + '">' +
                          esc(label) + '</button>';
                  }).join('') + '</div>'
                : '<span class="sv-sensors-msg">' + esc(t('measures.none')) + '</span>';
            r.innerHTML =
                '<div class="sv-sensors-bar">' +
                '<button type="button" class="btn btn-link btn-sm sv-sensors-back" id="sv-sensors-back">' + esc(t('back')) + '</button>' +
                '<span class="sv-sensors-title">' + esc(curStation.name) + '</span>' +
                '</div>' +
                picker +
                '<div id="sv-sensors-chart" class="sv-sensors-chart"></div>' +
                (datastreams.length ? '<p class="sv-sensors-zoomhint">' + esc(t('chart.zoom')) + '</p>' : '');
            document.getElementById('sv-sensors-back').addEventListener('click', function () {
                destroyChart(); curStation = null; selDs = null; layer.changed(); renderStationList();
            });
            var chips = Array.prototype.slice.call(r.querySelectorAll('[data-ds]'));
            chips.forEach(function (chip, i) {
                chip.addEventListener('click', function () { selectDatastream(parseInt(chip.getAttribute('data-ds'), 10)); });
                // Roving-tabindex radiogroup: only the selected chip is tabbable;
                // arrow keys move + select (WCAG radio pattern).
                chip.tabIndex = (chip.getAttribute('data-ds') === String(selDs)) ? 0 : -1;
                chip.addEventListener('keydown', function (e) {
                    var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1
                          : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
                    if (!d) { return; }
                    e.preventDefault();
                    var next = chips[(i + d + chips.length) % chips.length];
                    next.focus();
                    selectDatastream(parseInt(next.getAttribute('data-ds'), 10));
                });
            });
        }

        // --- Scoped style -----------------------------------------------------
        var styled = false;
        function injectStyle() {
            if (styled) { return; }
            styled = true;
            var P = '#sv-panel-ext-sensors ';
            var css = [
                // Fill the panel height so the chart can grow into the dock.
                P + '#sv-sensors-root{display:flex;flex-direction:column;height:100%;min-height:0}',
                P + '.sv-sensors-hint,' + P + '.sv-sensors-msg{font-size:.85rem;color:#666;margin:.3rem 0 .6rem}',
                P + '.sv-sensors-err{font-size:.85rem;color:#c0392b;margin:.3rem 0 .6rem}',
                P + '.sv-sensors-lbl{display:block;font-size:.82rem;color:#555;margin:.5rem 0}',
                P + '.sv-sensors-lbl input{display:block;width:100%;margin-top:.2rem;padding:.35rem .5rem;font-size:.9rem;border:1px solid var(--sv-panel-border,#ccc);border-radius:4px;background:var(--sv-panel-bg,#fff);color:inherit}',
                P + '.sv-sensors-list{list-style:none;margin:0 0 .4rem;padding:0}',
                P + '.sv-sensors-row{padding:.45rem .25rem;border-bottom:1px solid var(--sv-panel-border,#e0e0e0);cursor:pointer}',
                P + '.sv-sensors-row:hover{background:rgba(127,127,127,.08)}',
                P + '.sv-sensors-count{font-size:.78rem;color:#666;margin:.2rem 0}',
                // Compact horizontal toolbar (back + station name + mesure select).
                P + '.sv-sensors-bar{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;flex-shrink:0}',
                P + '.sv-sensors-back{padding:0;white-space:nowrap}',
                P + '.sv-sensors-title{font-size:.95rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:30%}',
                P + '.sv-sensors-chips{display:flex;flex-wrap:wrap;gap:.35rem;flex-shrink:0;margin:.3rem 0}',
                P + '.sv-sensors-chip{font-size:.82rem;padding:.3rem .6rem;border:1px solid var(--sv-panel-border,#ccc);border-radius:14px;background:var(--sv-panel-bg,#fff);color:inherit;cursor:pointer;white-space:nowrap}',
                P + '.sv-sensors-chip:hover{background:rgba(127,127,127,.1)}',
                P + '.sv-sensors-chip.sel{background:#0d6efd;border-color:#0d6efd;color:#fff;font-weight:600}',
                // Chart fills the remaining height; uPlot sizes to it.
                P + '.sv-sensors-chart{flex:1;min-height:0;margin-top:.4rem;display:flex;flex-direction:column}',
                P + '.sv-sensors-foot{font-size:.78rem;color:#666;margin:.3rem 0 0;display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;flex-shrink:0}',
                P + '.sv-sensors-readout{flex:1;min-width:0;color:#0d6efd;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
                P + '.sv-sensors-zoomhint{font-size:.72rem;color:#999;margin:.2rem 0 0;flex-shrink:0}'
            ].join('');
            var style = document.createElement('style');
            style.id = 'sv-sensors-style';
            style.textContent = css;
            document.head.appendChild(style);
        }

        // --- Boot: ceiling = ?sta_pagination > default (each page load) -------
        // ?sta_pagination (admin/share default) : raise the per-mesure observation
        // ceiling beyond 2000 by following @iot.nextLink. A number = max
        // observations; "1"/"true"/"all" = hard cap. The in-panel "load more"
        // button raises it further at runtime, for THIS session only (not
        // persisted — every page load starts from this URL/default, fast).
        var params = new URLSearchParams(window.location.search);
        var pag = (params.get('sta_pagination') || '').toLowerCase();
        if (pag) {
            var n = parseInt(pag, 10);
            maxObs = (pag === '1' || pag === 'true' || pag === 'all' || (isFinite(n) && n === 1))
                ? HARD_MAX
                : (isFinite(n) && n > 0 ? Math.min(n, HARD_MAX) : DEF_MAX);
        }
        var sta = params.get('sta');
        if (sta) {
            var svc = validService(sta);
            // Deep-link: ?sta_station=<@iot.id> opens that station; with
            // ?sta_ds=<@iot.id> it charts that mesure and opens the panel
            // straight on it. IDs validated (OData-path-safe); unknown ids
            // degrade to the normal station view.
            var auto = null;
            var stId = validId(params.get('sta_station'));
            if (stId) { auto = { station: stId, ds: validId(params.get('sta_ds')) }; }
            if (svc) { loadStations(svc, auto); }
        }
    });
}());
