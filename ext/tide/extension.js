/**
 * Marée (tide) — show predicted water extent on a coastal zone for a chosen
 * date/time, near one port. Combines Litto3D bathymetry (WMS, IGN69) with SHOM
 * tide predictions (above Zéro Hydrographique), datum-corrected via the RAM
 * (Références Altimétriques Maritimes, open SHOM data).
 *
 * Physics (see ext/tideflood/INVESTIGATION.md):
 *   S           = zh_ref (RAM port, ZH height in IGN69)   // datum separation
 *   water_IGN69 = tide_ZH(t) + S
 *   flood       ⟺ terrain_IGN69 < water_IGN69             // painted by GeoServer SLD
 * Measured ΔS = 1 cm / 5 km ≪ Litto3D 10 cm precision → flat-S honest at 4 nm.
 *
 * SCIENTIFIC TRACEABILITY RULE: every datum used in the computation (its source,
 * date, value) is displayed to the user. No hidden numbers.
 *
 * Build plan: ext/tide/PLAN.md. This file = M0 (button + zoom gate + dock) and
 * M1 (nearest RAM port + datum separation, displayed with full provenance).
 * Chart (uPlot) + SHOM + SLD flood come in later milestones.
 */
(function () {
    'use strict';

    var PANEL = 'tide';

    // RAM — Références Altimétriques Maritimes (SHOM, Licence Ouverte 2.0, no key).
    // WFS GeoJSON, features already in EPSG:3857 (matches the map view → no
    // reprojection for distance maths). Property zh_ref = cote du ZH dans le
    // système légal (reference="IGN69") = our datum separation S.
    var RAM_WFS   = 'https://services.data.shom.fr/INSPIRE/wfs';
    var RAM_LAYER = 'RAM_BDD_WLD_WGS84G_WFS:ram_3857';
    var RAM_SRC   = 'SHOM — Références Altimétriques Maritimes (RAM)';
    var SEARCH_M  = 30000;     // half-width (m) of the WFS bbox around map center
    var DEF_MINZOOM = 13;      // coastal scale gate (single-port flat-S validity)

    // Litto3D bathymetry/MNT (GeoServer WMS). Pixel value = altitude IGN69 in
    // metres (GRAY_INDEX), nodata = -9999. Flood is painted server-side by an
    // inline SLD whose ColorMap break = water_IGN69 (the flat-S threshold).
    //
    // CRITICAL: GeoServer matches the SLD <NamedLayer><Name> to the layer only
    // when WORKSPACE-QUALIFIED ('alti:litto3d'). The bare name ('litto3d') parses
    // but is silently ignored → default style renders. Verified on geobretagne.
    var WMS_URL   = 'https://geobretagne.fr/geoserver/alti/litto3d/wms';
    var WMS_LAYER = 'alti:litto3d';
    var WMS_SRC   = 'GéoBretagne / SHOM-IGN — Litto3D (MNT, altitude IGN69)';
    // Depth-graded flood palette (ColorBrewer Blues, sequential, colourblind-safe):
    // deepest water dark navy → shoreline near-white. The ColorMap reads the pixel
    // = terrain altitude (IGN69 m); depth = level − terrain, so LOW terrain = deep =
    // dark. Darkest pinned to a fixed floor (-10 m IGN69); fades toward the shore so
    // the terrain shows through at the waterline.
    var DEEP_FLOOR = -10;   // terrain altitude (m) mapped to the darkest stop
    var FLOOD_STOPS = [
        { c: '#08306b', o: 0.85 },  // deepest  (terrain = DEEP_FLOOR)
        { c: '#2171b5', o: 0.70 },  // mid      (terrain = level*0.5)
        { c: '#9ecae1', o: 0.55 },  // shallow  (terrain = level*0.9)
        { c: '#deebf7', o: 0.45 }   // shoreline (terrain = level, depth 0)
    ];

    // Sea floor (SHOM bathymetry, GéoBretagne). litto3d is the TERRESTRIAL part
    // only (above lowest tide) → open sea is nodata there. bathy_1m fills the sea:
    // it is always below any tide we show, so it is painted as a STATIC blue
    // underlay (deep navy → shallow light), under the dynamic flood. Not coupled
    // to the tide level. Recolourable (dynamic SLD verified). nodata = -99999.
    var SEA_URL   = 'https://geobretagne.fr/geoserver/shom/bathy_1m/wms';
    var SEA_LAYER = 'shom:bathy_1m';
    var SEA_SRC   = 'GéoBretagne / SHOM — bathymétrie 1 m';

    var minZoom = DEF_MINZOOM;

    // uPlot (MIT, vendored ext/tide/uplot.min.{js,css}) — lazy-loaded on the
    // first chart so core + map load stay fast and non-tide pages pay nothing.
    var BASE = SViewer.extensionBase();   // must read at module scope (currentScript)
    var uplotReady = null;
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

    // M2 — tide curve comes from a static FIXTURE (synthetic harmonic, NOT SHOM).
    // Swapped for the real SHOM proxy at M6 behind the same JSON shape:
    //   { port, date, tz, step, datum:'ZH', unit, source, points:[{t,h}],
    //     highs:[{t,h,coef}], lows:[{t,h}] }
    // Fixture per reference port (keyed by RAM `site`). Picked by the nearest
    // port found in M1; falls back to the default if no fixture for that port.
    // At M6 this whole map is replaced by one proxy call ?port=<site>.
    var FIXTURES = {
        'Concarneau':           'fixtures/tide-concarneau-2026-06-06.json',
        'Saint-Quay-Portrieux': 'fixtures/tide-sqp-2026-06-06.json'
    };
    var FIXTURE_DEFAULT = 'fixtures/tide-concarneau-2026-06-06.json';
    function fixtureFor(site) { return (site && FIXTURES[site]) || FIXTURE_DEFAULT; }

    // --- i18n -----------------------------------------------------------------
    var I18N = {
        fr: {
            'btn.title':   'Marée (étendue d’eau prévue)',
            'panel.title': 'Marée',
            'gate.hint':   'Zoomez sur une zone côtière près d’un port pour activer l’outil.',
            'loading':     'Recherche du port le plus proche…',
            'port.label':  'Port de référence',
            'port.dist':   'à {d} du centre de la carte',
            'sep.label':   'Référence verticale',
            'sep.val':     'Zéro hydrographique à {v} m / IGN69',
            'sep.expl':    'Décalage appliqué aux hauteurs de marée (comptées sur le zéro hydrographique) pour les ramener en altitude IGN69.',
            'levels.label':'Niveaux caractéristiques (sur le zéro hydrographique)',
            'lvl.phma':    'PHMA (plus haute mer astronomique)',
            'lvl.pmve':    'PMVE (pleine mer vive-eau)',
            'lvl.nm':      'NM (niveau moyen)',
            'prov.source': 'Source',
            'prov.date':   'Date de la donnée',
            'err.none':    'Aucun port de référence à proximité. Déplacez la carte vers la côte.',
            'err.fetch':   'Service RAM (SHOM) injoignable.',
            'curve.label': 'Marée prévue',
            'curve.date':  'Hauteurs d’eau sur le zéro hydrographique — {date}',
            'curve.pm':    'PM',
            'curve.bm':    'BM',
            'curve.coef':  'coef. {c}',
            'curve.fixture':'Données synthétiques (démonstration) — à remplacer par les prédictions SHOM.',
            'err.curve':   'Courbe de marée indisponible.',
            'cursor.label':'Heure sélectionnée (flèches gauche/droite pour ajuster)',
            'read.zh':     'sur le zéro hydrographique',
            'read.ign':    'en altitude IGN69',
            'terrain.label':'Terrain (bathymétrie)',
            'terrain.expl':'L’étendue inondée est calculée par le serveur : tout pixel dont l’altitude IGN69 est inférieure au niveau d’eau est peint.',
            'soon':        'Inondation sur la carte : prochaine étape.'
        },
        en: {
            'btn.title':   'Tide (predicted water extent)',
            'panel.title': 'Tide',
            'gate.hint':   'Zoom in on a coastal area near a port to enable the tool.',
            'loading':     'Finding nearest port…',
            'port.label':  'Reference port',
            'port.dist':   '{d} from map centre',
            'sep.label':   'Vertical reference',
            'sep.val':     'Chart datum at {v} m / IGN69',
            'sep.expl':    'Offset applied to tide heights (measured above chart datum) to bring them to IGN69 altitude.',
            'levels.label':'Characteristic levels (above chart datum)',
            'lvl.phma':    'HAT (highest astronomical tide)',
            'lvl.pmve':    'MHWS (mean high water springs)',
            'lvl.nm':      'MSL (mean sea level)',
            'prov.source': 'Source',
            'prov.date':   'Data date',
            'err.none':    'No reference port nearby. Pan the map toward the coast.',
            'err.fetch':   'RAM service (SHOM) unreachable.',
            'curve.label': 'Predicted tide',
            'curve.date':  'Water heights above chart datum — {date}',
            'curve.pm':    'HW',
            'curve.bm':    'LW',
            'curve.coef':  'coef. {c}',
            'curve.fixture':'Synthetic data (demo) — to be replaced by SHOM predictions.',
            'err.curve':   'Tide curve unavailable.',
            'cursor.label':'Selected time (left/right arrows to adjust)',
            'read.zh':     'above chart datum',
            'read.ign':    'IGN69 altitude',
            'terrain.label':'Terrain (bathymetry)',
            'terrain.expl':'The flooded extent is computed server-side: every pixel whose IGN69 altitude is below the water level is painted.',
            'soon':        'Flood the map: next step.'
        },
        es: {
            'btn.title':   'Marea (extensión de agua prevista)',
            'panel.title': 'Marea',
            'gate.hint':   'Acérquese a una zona costera cerca de un puerto para activar la herramienta.',
            'loading':     'Buscando el puerto más cercano…',
            'port.label':  'Puerto de referencia',
            'port.dist':   'a {d} del centro del mapa',
            'sep.label':   'Referencia vertical',
            'sep.val':     'Cero hidrográfico a {v} m / IGN69',
            'sep.expl':    'Desfase aplicado a las alturas de marea (medidas sobre el cero hidrográfico) para llevarlas a altitud IGN69.',
            'levels.label':'Niveles característicos (sobre el cero hidrográfico)',
            'lvl.phma':    'PMAS (pleamar máxima astronómica)',
            'lvl.pmve':    'PMVE (pleamar viva equinoccial)',
            'lvl.nm':      'NM (nivel medio)',
            'prov.source': 'Fuente',
            'prov.date':   'Fecha del dato',
            'err.none':    'Ningún puerto de referencia cerca. Desplace el mapa hacia la costa.',
            'err.fetch':   'Servicio RAM (SHOM) inaccesible.',
            'curve.label': 'Marea prevista',
            'curve.date':  'Alturas de agua sobre el cero hidrográfico — {date}',
            'curve.pm':    'PM',
            'curve.bm':    'BM',
            'curve.coef':  'coef. {c}',
            'curve.fixture':'Datos sintéticos (demostración) — a sustituir por las predicciones del SHOM.',
            'err.curve':   'Curva de marea no disponible.',
            'cursor.label':'Hora seleccionada (flechas izquierda/derecha para ajustar)',
            'read.zh':     'sobre el cero hidrográfico',
            'read.ign':    'en altitud IGN69',
            'terrain.label':'Terreno (batimetría)',
            'terrain.expl':'La extensión inundada la calcula el servidor: se pinta todo píxel cuya altitud IGN69 es inferior al nivel del agua.',
            'soon':        'Inundación en el mapa: próximo paso.'
        },
        de: {
            'btn.title':   'Gezeiten (vorhergesagte Wasserausdehnung)',
            'panel.title': 'Gezeiten',
            'gate.hint':   'Zoomen Sie auf ein Küstengebiet nahe einem Hafen, um das Werkzeug zu aktivieren.',
            'loading':     'Nächstgelegenen Hafen suchen…',
            'port.label':  'Referenzhafen',
            'port.dist':   '{d} vom Kartenzentrum',
            'sep.label':   'Höhenbezug',
            'sep.val':     'Seekartennull bei {v} m / IGN69',
            'sep.expl':    'Versatz, der auf Gezeitenhöhen (über Seekartennull gemessen) angewandt wird, um sie auf IGN69-Höhe zu bringen.',
            'levels.label':'Charakteristische Pegel (über Seekartennull)',
            'lvl.phma':    'HAT (höchste astronomische Tide)',
            'lvl.pmve':    'MHWS (mittleres Springhochwasser)',
            'lvl.nm':      'MSL (mittlerer Meeresspiegel)',
            'prov.source': 'Quelle',
            'prov.date':   'Datum der Daten',
            'err.none':    'Kein Referenzhafen in der Nähe. Verschieben Sie die Karte zur Küste.',
            'err.fetch':   'RAM-Dienst (SHOM) nicht erreichbar.',
            'curve.label': 'Vorhergesagte Gezeit',
            'curve.date':  'Wasserhöhen über Seekartennull — {date}',
            'curve.pm':    'HW',
            'curve.bm':    'NW',
            'curve.coef':  'Koef. {c}',
            'curve.fixture':'Synthetische Daten (Demo) — durch SHOM-Vorhersagen zu ersetzen.',
            'err.curve':   'Gezeitenkurve nicht verfügbar.',
            'cursor.label':'Gewählte Uhrzeit (Pfeiltasten links/rechts zum Anpassen)',
            'read.zh':     'über Seekartennull',
            'read.ign':    'IGN69-Höhe',
            'terrain.label':'Gelände (Bathymetrie)',
            'terrain.expl':'Die überflutete Ausdehnung wird serverseitig berechnet: jedes Pixel, dessen IGN69-Höhe unter dem Wasserstand liegt, wird eingefärbt.',
            'soon':        'Karte überfluten: nächster Schritt.'
        }
    };
    function lang() {
        var l = (SViewer.state && SViewer.state.lang) || (SViewer.config && SViewer.config.lang) || 'fr';
        return I18N[l] ? l : 'fr';
    }
    function t(key, vars) {
        var L = I18N[lang()];
        var s = (L && L[key]) || I18N.fr[key] || key;
        if (vars) { Object.keys(vars).forEach(function (k) { s = s.replace('{' + k + '}', vars[k]); }); }
        return s;
    }
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    // Format a metre value with explicit sign and 3 decimals (RAM precision is mm).
    function fmtSep(v) {
        var n = Number(v);
        return (n >= 0 ? '+' : '') + n.toFixed(3);
    }
    function fmtDist(m) {
        return m >= 1000 ? (Math.round(m / 100) / 10) + ' km' : Math.round(m) + ' m';
    }

    SViewer.onMapReady(function (ctx) {
        var map  = ctx.map;
        var view = ctx.view || map.getView();

        var active   = false;
        var port     = null;   // selected RAM port { site, S, phma, pmve, nm, date, x, y }
        var fetchSeq = 0;      // stale-response guard
        var wantPort = null;   // ?tide_port= preselection (by name)
        var tide     = null;   // loaded tide series { points, highs, lows, date, source, ... }
        var chart    = null;   // active uPlot instance
        var curIdx   = 0;      // selected sample index in tide.points (cursor position)
        var floodLayer = null; // OL WMS layer painting the flood (own, removed on close)
        var floodSrc   = null; // its ol.source.ImageWMS
        var debugLevel = null; // M4 throwaway manual override (null = use waterIGN69)
        var floodTimer = null; // debounce handle for the flood WMS request
        var seaLayer   = null; // static blue sea-floor underlay (bathy_1m)

        // --- RAM nearest-port fetch ------------------------------------------
        // Query the open RAM WFS for ports within a bbox around the map centre,
        // pick the nearest one carrying a non-null zh_ref (datum separation).
        function findPort() {
            var c = view.getCenter();
            if (!c) { return; }
            var seq = ++fetchSeq;
            showLoading();
            var bbox = [c[0] - SEARCH_M, c[1] - SEARCH_M, c[0] + SEARCH_M, c[1] + SEARCH_M, 'EPSG:3857'].join(',');
            var url = RAM_WFS +
                '?service=WFS&version=2.0.0&request=GetFeature' +
                '&typeNames=' + encodeURIComponent(RAM_LAYER) +
                '&outputFormat=application/json&srsName=EPSG:3857' +
                '&bbox=' + encodeURIComponent(bbox);
            fetch(url, { headers: { Accept: 'application/json' } })
                .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
                .then(function (j) {
                    if (seq !== fetchSeq) { return; }
                    var p = pickNearest(j, c);
                    if (!p) { showError(t('err.none')); return; }
                    port = p;
                    renderLayout();
                    loadTide();
                })
                .catch(function () { if (seq === fetchSeq) { showError(t('err.fetch')); } });
        }
        // Pick the nearest feature with a usable zh_ref; or, if ?tide_port= is set,
        // that named port. Validates every numeric (untrusted service input).
        function pickNearest(fc, center) {
            if (!fc || !Array.isArray(fc.features)) { return null; }
            var best = null, bestD = Infinity;
            fc.features.forEach(function (f) {
                var pr = f.properties || {};
                var S  = Number(pr.zh_ref);
                if (!isFinite(S)) { return; }                 // no datum sep → unusable
                var g = f.geometry;
                if (!g || g.type !== 'Point' || !Array.isArray(g.coordinates)) { return; }
                var x = Number(g.coordinates[0]), y = Number(g.coordinates[1]);
                if (!isFinite(x) || !isFinite(y)) { return; }
                var cand = {
                    site: String(pr.site || pr.zone || '?'),
                    S:    S,
                    phma: numOrNull(pr.phma), pmve: numOrNull(pr.pmve), nm: numOrNull(pr.nm),
                    ref:  String(pr.reference || 'IGN69'),
                    date: pr.date_ch != null ? String(pr.date_ch) : (pr.date_rf != null ? String(pr.date_rf) : null),
                    x: x, y: y
                };
                if (wantPort && cand.site.toLowerCase() === wantPort.toLowerCase()) {
                    best = cand; bestD = 0; return;
                }
                var d = Math.hypot(x - center[0], y - center[1]);
                if (!wantPort && d < bestD) { bestD = d; best = cand; }
            });
            if (best) { best.dist = bestD; }
            return best;
        }
        function numOrNull(v) { var n = Number(v); return isFinite(n) ? n : null; }

        // --- Render ----------------------------------------------------------
        function root() { return document.getElementById('sv-tide-root'); }
        function showLoading() {
            var r = root(); if (r) { r.innerHTML = '<p class="sv-tide-msg">' + esc(t('loading')) + '</p>'; }
        }
        function showError(msg) {
            var r = root(); if (r) { r.innerHTML = '<p class="sv-tide-err">' + esc(msg) + '</p>'; }
        }
        // Provenance line — source + date, shown under every datum block. The
        // scientific-traceability rule: the user always sees where a number came
        // from and when.
        function provHtml(src, date) {
            var d = date ? '<span class="sv-tide-prov-date"> · ' + esc(t('prov.date')) + ' ' + esc(date) + '</span>' : '';
            return '<p class="sv-tide-prov">' + esc(t('prov.source')) + ' : ' + esc(src) + d + '</p>';
        }
        function levelRow(label, val) {
            if (val == null) { return ''; }
            return '<tr><th scope="row">' + esc(label) + '</th><td>' + esc(val.toFixed(2)) + ' m</td></tr>';
        }
        // Pure HTML for the provenance column (port + datum separation + levels).
        // Every block carries source + date (scientific-traceability rule).
        function portHtml() {
            if (!port) { return ''; }
            var levels =
                levelRow(t('lvl.phma'), port.phma) +
                levelRow(t('lvl.pmve'), port.pmve) +
                levelRow(t('lvl.nm'),   port.nm);
            return (
                // Port
                '<section class="sv-tide-block">' +
                  '<h3 class="sv-tide-h">' + esc(t('port.label')) + '</h3>' +
                  '<p class="sv-tide-port-name">' + esc(port.site) +
                    (port.dist != null ? ' <span class="sv-tide-dim">(' + esc(t('port.dist', { d: fmtDist(port.dist) })) + ')</span>' : '') +
                  '</p>' +
                  provHtml(RAM_SRC, port.date) +
                '</section>' +
                // Datum separation S
                '<section class="sv-tide-block">' +
                  '<h3 class="sv-tide-h">' + esc(t('sep.label')) + '</h3>' +
                  '<p class="sv-tide-sep">' + esc(t('sep.val', { v: fmtSep(port.S) })) + '</p>' +
                  '<p class="sv-tide-expl">' + esc(t('sep.expl')) + '</p>' +
                  '<p class="sv-tide-formula"><code>niveau_IGN69 = hauteur_marée + (' + esc(fmtSep(port.S)) + ')</code></p>' +
                  provHtml(RAM_SRC, port.date) +
                '</section>' +
                // Characteristic levels
                (levels ?
                '<section class="sv-tide-block">' +
                  '<h3 class="sv-tide-h">' + esc(t('levels.label')) + '</h3>' +
                  '<table class="sv-tide-levels">' + levels + '</table>' +
                  provHtml(RAM_SRC, port.date) +
                '</section>' : '') +
                // Terrain + sea data behind the flood (traceability of the overlay)
                '<section class="sv-tide-block">' +
                  '<h3 class="sv-tide-h">' + esc(t('terrain.label')) + '</h3>' +
                  '<p class="sv-tide-expl">' + esc(t('terrain.expl')) + '</p>' +
                  provHtml(WMS_SRC, null) +
                  provHtml(SEA_SRC, null) +
                '</section>');
        }
        // The dock is split: a scrollable provenance column (port + datum + levels)
        // on the left, and the tide curve filling the rest on the right. Wide dock
        // → curve reads horizontally, provenance stays visible (traceability).
        function renderLayout() {
            var r = root(); if (!r) { return; }
            r.innerHTML =
                '<div class="sv-tide-info" id="sv-tide-info">' + portHtml() + '</div>' +
                '<div class="sv-tide-curve" id="sv-tide-curve">' +
                  '<div class="sv-tide-curve-head" id="sv-tide-curve-head"></div>' +
                  '<div class="sv-tide-plot" id="sv-tide-plot"></div>' +
                  // Cursor readout — focusable (role=slider) so arrow keys scrub
                  // the time without a mouse (WCAG). Shows the selected instant in
                  // BOTH datums (ZH and the computed IGN69) — no hidden number.
                  '<div class="sv-tide-readout" id="sv-tide-readout" tabindex="0" role="slider" ' +
                       'aria-label="' + esc(t('cursor.label')) + '"></div>' +
                  // M4 throwaway: manual level slider to prove the SLD flood in
                  // isolation. Removed in M5 once the cursor drives the flood.
                  '<div class="sv-tide-debug" id="sv-tide-debug">' +
                    '<label>débug niveau IGN69 ' +
                      '<input type="range" id="sv-tide-debug-range" min="-2" max="14" step="0.1" value="3">' +
                      '<output id="sv-tide-debug-out">3.0 m</output>' +
                    '</label>' +
                  '</div>' +
                  '<p class="sv-tide-prov sv-tide-curve-foot" id="sv-tide-curve-foot"></p>' +
                '</div>';
            bindDebug();
        }
        // M4 throwaway slider wiring — drives the flood from a literal level so the
        // SLD threshold can be proven before the cursor coupling (M5).
        function bindDebug() {
            var r = document.getElementById('sv-tide-debug-range');
            var o = document.getElementById('sv-tide-debug-out');
            if (!r) { return; }
            r.addEventListener('input', function () {
                debugLevel = parseFloat(r.value);
                if (o) { o.textContent = debugLevel.toFixed(1) + ' m'; }
                updateFlood();
            });
            // Apply the initial slider value immediately so a flood shows on open.
            debugLevel = parseFloat(r.value);
            if (o) { o.textContent = debugLevel.toFixed(1) + ' m'; }
            updateFlood();
        }

        // --- M2: tide curve (fixture → SHOM proxy at M6) ----------------------
        function destroyChart() { if (chart) { try { chart.destroy(); } catch (e) { /* */ } chart = null; } }
        // Fetch the tide series. M2 = static fixture; the JSON shape is the M6
        // proxy contract, so swapping the source later touches only this URL.
        function loadTide() {
            var seq = fetchSeq;                 // tie to the port fetch generation
            var head = document.getElementById('sv-tide-curve-head');
            if (head) { head.textContent = t('loading'); }
            fetch(BASE + fixtureFor(port && port.site), { headers: { Accept: 'application/json' } })
                .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
                .then(function (j) {
                    if (seq !== fetchSeq) { return; }            // map moved → stale
                    if (!j || !Array.isArray(j.points) || !j.points.length) { return Promise.reject('empty'); }
                    tide = j;
                    renderCurve();
                })
                .catch(function () {
                    if (seq !== fetchSeq) { return; }
                    var h = document.getElementById('sv-tide-curve-head');
                    if (h) { h.innerHTML = '<span class="sv-tide-err">' + esc(t('err.curve')) + '</span>'; }
                });
        }
        function renderCurve() {
            if (!tide) { return; }
            var head = document.getElementById('sv-tide-curve-head');
            var foot = document.getElementById('sv-tide-curve-foot');
            // Header: title + date; high/low water marks with coef (sailors think
            // in coefficients). All from the series itself — no hidden derivation.
            if (head) {
                var marks = '';
                (tide.highs || []).forEach(function (hi) {
                    marks += '<span class="sv-tide-mark sv-tide-mark-pm">' + esc(t('curve.pm')) + ' ' +
                        esc(hhmm(hi.t)) + ' · ' + esc(Number(hi.h).toFixed(2)) + ' m' +
                        (hi.coef != null ? ' · ' + esc(t('curve.coef', { c: hi.coef })) : '') + '</span>';
                });
                (tide.lows || []).forEach(function (lo) {
                    marks += '<span class="sv-tide-mark sv-tide-mark-bm">' + esc(t('curve.bm')) + ' ' +
                        esc(hhmm(lo.t)) + ' · ' + esc(Number(lo.h).toFixed(2)) + ' m</span>';
                });
                head.innerHTML =
                    '<div class="sv-tide-curve-title">' + esc(t('curve.date', { date: tide.date || '' })) + '</div>' +
                    '<div class="sv-tide-marks">' + marks + '</div>';
            }
            // Footer: provenance of the curve itself (source + date). Fixture is
            // explicitly flagged as synthetic so no one mistakes it for SHOM.
            if (foot) {
                foot.innerHTML = esc(t('prov.source')) + ' : ' + esc(tide.source || '?') +
                    (tide.date ? '<span class="sv-tide-prov-date"> · ' + esc(t('prov.date')) + ' ' + esc(tide.date) + '</span>' : '') +
                    ' — <em>' + esc(t('curve.fixture')) + '</em>';
            }
            drawPlot();
        }
        function drawPlot() {
            var hostC = document.getElementById('sv-tide-plot');
            if (!hostC || !tide) { return; }
            loadUplot().then(function (uPlot) {
                var host = document.getElementById('sv-tide-plot');
                if (!host || !tide) { return; }
                destroyChart();
                host.textContent = '';
                var xs = tide.points.map(function (p) { return p.t / 1000; });
                var ys = tide.points.map(function (p) { return Number(p.h); });
                var unit = tide.unit || 'm';
                var fmtTime = uPlot.fmtDate('{HH}:{mm}');
                var w = host.clientWidth || 320;
                var h = Math.max(120, host.clientHeight || 160);
                var opts = {
                    width: w, height: h,
                    cursor: {
                        drag: { x: false, y: false },
                        // Hover/click → adopt that sample as the selected instant.
                        points: { show: true }
                    },
                    scales: { x: { time: true } },
                    legend: { show: false },
                    series: [
                        {},
                        { stroke: '#0d6efd', width: 2, fill: 'rgba(13,110,253,.12)',
                          points: { show: false } }
                    ],
                    axes: [
                        { stroke: '#888', grid: { stroke: 'rgba(127,127,127,.15)' },
                          values: function (u, splits) {
                              return splits.map(function (s) { return fmtTime(new Date(s * 1000)); });
                          } },
                        { stroke: '#888', grid: { stroke: 'rgba(127,127,127,.15)' },
                          values: function (u, vals) { return vals.map(function (v) { return v + ' ' + unit; }); } }
                    ],
                    hooks: {
                        // Mouse scrub: as uPlot moves its OWN cursor, follow its
                        // index — but do NOT re-drive the cursor (fromMouse=true),
                        // else we fight the pointer every frame and it disappears.
                        // idx is null when the pointer leaves the plot → ignore,
                        // keeping the last locked value.
                        setCursor: [function (u) {
                            if (u.cursor.idx != null) { setIdx(u.cursor.idx, true); }
                        }]
                    }
                };
                chart = new uPlot(opts, [xs, ys], host);
                // When the pointer leaves the plot, uPlot hides its cursor — pin it
                // back to the selected index so the chosen instant stays marked.
                chart.over.addEventListener('mouseleave', function () { lockCursor(); });
                // Default selection = current time, clamped into the series' day.
                curIdx = nearestIdxToNow();
                lockCursor();
                bindReadoutKeys();
                updateReadout();
            }).catch(function () {
                var h = document.getElementById('sv-tide-curve-head');
                if (h) { h.innerHTML = '<span class="sv-tide-err">' + esc(t('err.curve')) + '</span>'; }
            });
        }
        // --- Cursor / readout (M3) -------------------------------------------
        // Index of the sample nearest to "now"; clamps to the series ends when the
        // current clock is outside the fixture's day.
        function nearestIdxToNow() {
            if (!tide || !tide.points.length) { return 0; }
            var now = Date.now(), best = 0, bestD = Infinity;
            tide.points.forEach(function (p, i) {
                var d = Math.abs(p.t - now);
                if (d < bestD) { bestD = d; best = i; }
            });
            return best;
        }
        // fromMouse: the index came from uPlot's own cursor (hover) — the visual
        // cursor is already in place, so skip lockCursor. Keyboard/default paths
        // pass fromMouse=false → lockCursor pins the cursor to the new index.
        function setIdx(i, fromMouse) {
            if (!tide) { return; }
            var n = tide.points.length;
            i = Math.max(0, Math.min(n - 1, i | 0));
            if (i === curIdx) { return; }
            curIdx = i;
            updateReadout();
            if (!fromMouse) { lockCursor(); }
            // M5 will re-flood the map here from waterIGN69().
        }
        // Pin uPlot's visual cursor to curIdx (so keyboard moves show on the plot).
        // Only x matters for the vertical cursor line; top is the data y so the
        // hover point sits on the curve. valToPos returns CSS px (over: true).
        function lockCursor() {
            if (!chart || !tide) { return; }
            var left = chart.valToPos(tide.points[curIdx].t / 1000, 'x', true);
            var top  = chart.valToPos(Number(tide.points[curIdx].h), 'y', true);
            chart.setCursor({ left: left, top: top });
        }
        // The selected instant, in both datums. waterIGN69 = h_ZH + S (the whole
        // datum correction, shown to the user, never hidden).
        function selected() {
            if (!tide || !tide.points[curIdx]) { return null; }
            var p = tide.points[curIdx];
            var hZH = Number(p.h);
            var S   = port ? Number(port.S) : 0;
            return { t: p.t, hZH: hZH, ign: hZH + S, S: S };
        }
        function waterIGN69() { var s = selected(); return s ? s.ign : null; }
        function updateReadout() {
            var el = document.getElementById('sv-tide-readout');
            var s  = selected();
            if (!el || !s) { return; }
            el.innerHTML =
                '<span class="sv-tide-read-time">' + esc(hhmm(s.t)) + '</span>' +
                '<span class="sv-tide-read-val">' + esc(s.hZH.toFixed(2)) + ' m ' +
                    '<span class="sv-tide-read-ref">' + esc(t('read.zh')) + '</span></span>' +
                '<span class="sv-tide-read-arrow" aria-hidden="true">→</span>' +
                '<span class="sv-tide-read-val sv-tide-read-ign">' + esc(s.ign.toFixed(2)) + ' m ' +
                    '<span class="sv-tide-read-ref">' + esc(t('read.ign')) + '</span></span>';
            // ARIA slider state — announce the selected time + IGN69 level.
            el.setAttribute('aria-valuemin', '0');
            el.setAttribute('aria-valuemax', String(tide.points.length - 1));
            el.setAttribute('aria-valuenow', String(curIdx));
            el.setAttribute('aria-valuetext', hhmm(s.t) + ' — ' + s.ign.toFixed(2) + ' m IGN69');
        }
        function bindReadoutKeys() {
            var el = document.getElementById('sv-tide-readout');
            if (!el || el._tideBound) { return; }
            el._tideBound = true;
            // Arrow keys = ±1 sample; Home/End = day ends; PageUp/Down = ±1 hour.
            el.addEventListener('keydown', function (e) {
                if (!tide) { return; }
                var step = Math.max(1, Math.round(60 / (tide.step || 10)));   // samples per hour
                var d = 0;
                switch (e.key) {
                    case 'ArrowRight': case 'ArrowUp':   d = 1; break;
                    case 'ArrowLeft':  case 'ArrowDown': d = -1; break;
                    case 'PageUp':   d = step; break;
                    case 'PageDown': d = -step; break;
                    case 'Home': setIdx(0); e.preventDefault(); return;
                    case 'End':  setIdx(tide.points.length - 1); e.preventDefault(); return;
                    default: return;
                }
                e.preventDefault();
                setIdx(curIdx + d);
            });
        }
        function hhmm(ms) {
            var d = new Date(ms);
            return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
        }
        // Core fires this when the user drags the dock taller/shorter → resize the
        // plot to fill the new height.
        SViewer.on('sv:panelResize', function () {
            if (!chart) { return; }
            var host = document.getElementById('sv-tide-plot');
            if (!host) { return; }
            chart.setSize({ width: host.clientWidth, height: Math.max(120, host.clientHeight) });
        });

        // --- M4: server-side flood via inline SLD ----------------------------
        // Build the SLD that paints water DEPTH below `level` (m IGN69). type=ramp
        // interpolates between stops keyed on the pixel = terrain altitude:
        //   -9998        → transparent  (guards nodata -9999, which in `ramp` would
        //                                otherwise take the first stop's colour)
        //   DEEP_FLOOR   → darkest navy (deepest water)
        //   level*0.5    → mid blue
        //   level*0.9    → shallow
        //   level        → shoreline (depth 0), near-white, faint
        //   level+eps    → transparent (dry land starts)
        //   20000        → transparent (cap)
        function floodSLD(level) {
            var L = Number(level);
            function entry(color, q, op) {
                return '<ColorMapEntry color="' + color + '" quantity="' + q + '" opacity="' + op + '"/>';
            }
            var qDeep = DEEP_FLOOR;
            var qMid  = (L * 0.5).toFixed(3);
            var qShal = (L * 0.9).toFixed(3);
            var qShore = L.toFixed(3);
            var qDry  = (L + 0.001).toFixed(3);
            var cm =
                entry(FLOOD_STOPS[0].c, -9998, 0) +              // nodata guard
                entry(FLOOD_STOPS[0].c, qDeep, FLOOD_STOPS[0].o) +
                entry(FLOOD_STOPS[1].c, qMid,  FLOOD_STOPS[1].o) +
                entry(FLOOD_STOPS[2].c, qShal, FLOOD_STOPS[2].o) +
                entry(FLOOD_STOPS[3].c, qShore, FLOOD_STOPS[3].o) +
                entry(FLOOD_STOPS[3].c, qDry,  0) +              // dry land
                entry(FLOOD_STOPS[3].c, 20000, 0);              // cap
            return '<?xml version="1.0" encoding="UTF-8"?>' +
                '<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc">' +
                '<NamedLayer><Name>' + WMS_LAYER + '</Name>' +
                '<UserStyle><Name>flood</Name><FeatureTypeStyle><Rule>' +
                '<RasterSymbolizer><Opacity>1.0</Opacity>' +
                '<ColorMap type="ramp">' + cm + '</ColorMap>' +
                '</RasterSymbolizer>' +
                '</Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>';
        }
        // Create the OL WMS flood layer once (above background, below UI). SLD_BODY
        // carries the style inline; STYLES must be present (empty) for GeoServer to
        // honour SLD_BODY.
        function ensureFloodLayer() {
            if (floodLayer) { return; }
            // No crossOrigin: we never read the pixels (no canvas export), so a
            // tainted image is fine and we avoid a hard failure if the WMS omits
            // CORS headers.
            floodSrc = new ol.source.ImageWMS({
                url: WMS_URL,
                params: { LAYERS: WMS_LAYER, STYLES: '', FORMAT: 'image/png', TRANSPARENT: true },
                ratio: 1
            });
            floodLayer = new ol.layer.Image({ source: floodSrc, zIndex: 850, opacity: 1 });
            map.addLayer(floodLayer);
        }
        function removeFloodLayer() {
            if (floodLayer) { map.removeLayer(floodLayer); floodLayer = null; floodSrc = null; }
        }

        // Static blue sea-floor underlay. Painted ONCE on open (sea is below every
        // tide we show, so it never changes with the level). Sits below the flood
        // layer (zIndex 840 < 850). Depth-graded deep navy → shallow light.
        function seaSLD() {
            function entry(c, q, op) {
                return '<ColorMapEntry color="' + c + '" quantity="' + q + '" opacity="' + op + '"/>';
            }
            var cm =
                entry('#0a2a5e', -50000, 0) +      // nodata guard (-99999)
                entry('#0a2a5e', -40, 0.90) +      // deep
                entry('#1d6fdb', -10, 0.80) +
                entry('#6db3e8', 0,   0.70) +
                entry('#aed6f2', 6,   0.60);       // shallow / intertidal flats
            return '<?xml version="1.0" encoding="UTF-8"?>' +
                '<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc">' +
                '<NamedLayer><Name>' + SEA_LAYER + '</Name>' +
                '<UserStyle><Name>sea</Name><FeatureTypeStyle><Rule>' +
                '<RasterSymbolizer><Opacity>1.0</Opacity>' +
                '<ColorMap type="ramp">' + cm + '</ColorMap>' +
                '</RasterSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>';
        }
        function ensureSeaLayer() {
            if (seaLayer) { return; }
            var src = new ol.source.ImageWMS({
                url: SEA_URL,
                params: { LAYERS: SEA_LAYER, STYLES: '', FORMAT: 'image/png', TRANSPARENT: true, SLD_BODY: seaSLD() },
                ratio: 1
            });
            seaLayer = new ol.layer.Image({ source: src, zIndex: 840, opacity: 1 });
            map.addLayer(seaLayer);
        }
        function removeSeaLayer() {
            if (seaLayer) { map.removeLayer(seaLayer); seaLayer = null; }
        }
        // Re-render the flood at the current water level. M4 uses debugLevel if set
        // (throwaway slider); otherwise the cursor-derived waterIGN69(). Updating
        // SLD_BODY via updateParams re-requests the image at the new threshold.
        // updateFlood is DEBOUNCED: dragging the slider (M4) or scrubbing the
        // cursor (M5) fires on every input/keypress — without this each one would
        // launch a WMS GetMap. Coalesce to the last value after a short idle so a
        // fast drag = one request, not dozens.
        var FLOOD_DEBOUNCE = 160;   // ms idle before the WMS request
        function applyFlood() {
            var level = debugLevel != null ? debugLevel : waterIGN69();
            if (level == null) { return; }
            ensureSeaLayer();   // static sea underlay (paints once, below the flood)
            ensureFloodLayer();
            floodSrc.updateParams({ SLD_BODY: floodSLD(level) });
        }
        function updateFlood() {
            if (floodTimer) { clearTimeout(floodTimer); }
            floodTimer = setTimeout(function () { floodTimer = null; applyFlood(); }, FLOOD_DEBOUNCE);
        }

        // --- Toolbar button + zoom gate --------------------------------------
        var toolbar = document.getElementById('sv-panel-controls');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-dark sv-map-btn sv-alt-toggle';
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', t('btn.title'));
        btn.title = t('btn.title');
        // Inline SVG (water/wave — bi tsunami-ish) — not relying on the icon subset.
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
            '<path d="M.036 3.314a.5.5 0 0 1 .65-.278l1.757.703a1.5 1.5 0 0 0 1.114 0l1.733-.694a2.5 2.5 0 0 1 1.857 0l1.733.694a1.5 1.5 0 0 0 1.114 0l1.733-.694a2.5 2.5 0 0 1 1.857 0l1.757.703a.5.5 0 1 1-.372.928l-1.757-.703a1.5 1.5 0 0 0-1.114 0l-1.733.694a2.5 2.5 0 0 1-1.857 0l-1.733-.694a1.5 1.5 0 0 0-1.114 0l-1.733.694a2.5 2.5 0 0 1-1.857 0L.314 3.964a.5.5 0 0 1-.278-.65m0 4a.5.5 0 0 1 .65-.278l1.757.703a1.5 1.5 0 0 0 1.114 0l1.733-.694a2.5 2.5 0 0 1 1.857 0l1.733.694a1.5 1.5 0 0 0 1.114 0l1.733-.694a2.5 2.5 0 0 1 1.857 0l1.757.703a.5.5 0 1 1-.372.928l-1.757-.703a1.5 1.5 0 0 0-1.114 0l-1.733.694a2.5 2.5 0 0 1-1.857 0l-1.733-.694a1.5 1.5 0 0 0-1.114 0l-1.733.694a2.5 2.5 0 0 1-1.857 0L.314 7.964a.5.5 0 0 1-.278-.65m0 4a.5.5 0 0 1 .65-.278l1.757.703a1.5 1.5 0 0 0 1.114 0l1.733-.694a2.5 2.5 0 0 1 1.857 0l1.733.694a1.5 1.5 0 0 0 1.114 0l1.733-.694a2.5 2.5 0 0 1 1.857 0l1.757.703a.5.5 0 1 1-.372.928l-1.757-.703a1.5 1.5 0 0 0-1.114 0l-1.733.694a2.5 2.5 0 0 1-1.857 0l-1.733-.694a1.5 1.5 0 0 0-1.114 0l-1.733.694a2.5 2.5 0 0 1-1.857 0L.314 11.964a.5.5 0 0 1-.278-.65"/></svg>';
        toolbar.appendChild(btn);
        btn.addEventListener('click', function () {
            if (btn.disabled) { return; }
            if (active) { SViewer.panel.close(); } else { open(); }
        });

        // Zoom gate: disable below the coastal scale limit (single-port flat-S
        // validity). Updated on every view change.
        function updateGate() {
            var z = view.getZoom();
            var ok = z != null && z >= minZoom;
            btn.disabled = !ok;
            btn.classList.toggle('sv-tide-gated', !ok);
            btn.title = ok ? t('btn.title') : t('gate.hint');
            btn.setAttribute('aria-label', btn.title);
            if (!ok && active) { SViewer.panel.close(); }
        }
        view.on('change:resolution', updateGate);
        updateGate();

        function open() {
            active = true;
            btn.setAttribute('aria-pressed', 'true'); btn.classList.add('active');
            injectStyle();
            SViewer.panel.open(PANEL, t('panel.title'), '<div id="sv-tide-root"></div>', { dock: 'bottom' });
            findPort();
        }
        SViewer.panel.onClose(PANEL, function () {
            active = false; destroyChart();
            if (floodTimer) { clearTimeout(floodTimer); floodTimer = null; }
            removeFloodLayer(); removeSeaLayer(); debugLevel = null;
            btn.setAttribute('aria-pressed', 'false'); btn.classList.remove('active');
        });

        // --- Scoped style ----------------------------------------------------
        var styled = false;
        function injectStyle() {
            if (styled) { return; }
            styled = true;
            var P = '#sv-panel-ext-tide ';
            var css = [
                // Split dock: provenance column (scrolls) + curve column (fills).
                // Stacks to a single column on narrow screens.
                P + '#sv-tide-root{display:flex;flex-direction:row;gap:1rem;height:100%;min-height:0}',
                P + '.sv-tide-info{flex:0 0 260px;min-width:0;overflow:auto;display:flex;flex-direction:column;gap:.4rem;padding-right:.3rem}',
                P + '.sv-tide-curve{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}',
                P + '.sv-tide-curve-head{flex:none}',
                P + '.sv-tide-curve-title{font-size:.85rem;font-weight:600;color:#333}',
                P + '.sv-tide-marks{display:flex;flex-wrap:wrap;gap:.3rem;margin:.2rem 0}',
                P + '.sv-tide-mark{font-size:.74rem;padding:.1rem .45rem;border-radius:10px;font-variant-numeric:tabular-nums;white-space:nowrap}',
                P + '.sv-tide-mark-pm{background:rgba(13,110,253,.14);color:#0d6efd}',
                P + '.sv-tide-mark-bm{background:rgba(127,127,127,.16);color:#555}',
                P + '.sv-tide-plot{flex:1;min-height:120px}',
                // Cursor readout strip — selected instant in both datums. Focusable
                // slider; visible focus ring (keyboard scrub). Hardcoded colors are
                // fine here (panel, not a map overlay).
                P + '.sv-tide-readout{flex:none;display:flex;align-items:center;flex-wrap:wrap;gap:.4rem;margin-top:.35rem;padding:.3rem .5rem;border:1px solid var(--sv-panel-border,#ccc);border-radius:6px;background:rgba(13,110,253,.06);font-variant-numeric:tabular-nums;cursor:ew-resize}',
                P + '.sv-tide-readout:focus-visible{outline:2px solid #0d6efd;outline-offset:1px}',
                P + '.sv-tide-read-time{font-weight:700;font-size:.95rem;color:#0d6efd}',
                P + '.sv-tide-read-val{font-size:.9rem;color:#333}',
                P + '.sv-tide-read-ign{font-weight:600}',
                P + '.sv-tide-read-ref{font-size:.72rem;color:#888;font-weight:400}',
                P + '.sv-tide-read-arrow{color:#888}',
                // M4 throwaway debug slider (dashed = temporary).
                P + '.sv-tide-debug{flex:none;margin-top:.3rem;padding:.25rem .4rem;border:1px dashed #c0392b;border-radius:6px}',
                P + '.sv-tide-debug label{display:flex;align-items:center;gap:.5rem;font-size:.74rem;color:#c0392b}',
                P + '.sv-tide-debug input[type=range]{flex:1}',
                P + '.sv-tide-debug output{font-variant-numeric:tabular-nums;min-width:3.5em;text-align:right}',
                P + '.sv-tide-curve-foot{flex:none;margin-top:.25rem}',
                '@media (max-width:640px){' + P + '#sv-tide-root{flex-direction:column;overflow:auto}' +
                    P + '.sv-tide-info{flex:none}' + P + '.sv-tide-curve{min-height:200px}}',
                P + '.sv-tide-msg{font-size:.85rem;color:#666;margin:.3rem 0}',
                P + '.sv-tide-err{font-size:.85rem;color:#c0392b;margin:.3rem 0}',
                P + '.sv-tide-block{margin:0}',
                P + '.sv-tide-h{font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:#888;margin:.2rem 0 .15rem}',
                P + '.sv-tide-port-name{font-size:1rem;font-weight:600;margin:0}',
                P + '.sv-tide-dim{font-weight:400;color:#888;font-size:.85rem}',
                P + '.sv-tide-sep{font-size:.95rem;font-weight:600;color:#0d6efd;margin:0}',
                P + '.sv-tide-expl{font-size:.8rem;color:#666;margin:.15rem 0 0}',
                P + '.sv-tide-formula{margin:.2rem 0 0}',
                P + '.sv-tide-formula code{font-size:.82rem;background:rgba(127,127,127,.12);padding:.15rem .4rem;border-radius:4px}',
                P + '.sv-tide-levels{border-collapse:collapse;font-size:.85rem;margin:.1rem 0 0}',
                P + '.sv-tide-levels th,' + P + '.sv-tide-levels td{text-align:left;padding:.1rem .6rem .1rem 0;font-weight:400}',
                P + '.sv-tide-levels td{font-variant-numeric:tabular-nums;color:#333}',
                // Provenance line — always visible, dimmed but legible (traceability).
                P + '.sv-tide-prov{font-size:.72rem;color:#999;margin:.1rem 0 0;font-style:italic}',
                P + '.sv-tide-prov-date{color:#999}',
                // Zoom-gated toolbar button (disabled look without losing the icon).
                '.sv-scope .sv-tide-gated{opacity:.45;cursor:not-allowed}'
            ].join('');
            var style = document.createElement('style');
            style.id = 'sv-tide-style';
            style.textContent = css;
            document.head.appendChild(style);
        }

        // --- Boot: params -----------------------------------------------------
        var params = new URLSearchParams(window.location.search);
        var mz = parseInt(params.get('tide_minzoom'), 10);
        if (isFinite(mz) && mz > 0 && mz < 22) { minZoom = mz; updateGate(); }
        var wp = params.get('tide_port');
        if (wp) { wantPort = wp.trim(); }
    });
}());
