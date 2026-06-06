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

    var minZoom = DEF_MINZOOM;

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
            'soon':        'Courbe de marée et inondation : prochaines étapes.'
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
            'soon':        'Tide curve and flooding: next steps.'
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
            'soon':        'Curva de marea e inundación: próximos pasos.'
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
            'soon':        'Gezeitenkurve und Überflutung: nächste Schritte.'
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
                    renderPort();
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
        function renderPort() {
            var r = root(); if (!r || !port) { return; }
            var levels =
                levelRow(t('lvl.phma'), port.phma) +
                levelRow(t('lvl.pmve'), port.pmve) +
                levelRow(t('lvl.nm'),   port.nm);
            r.innerHTML =
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
                // Next milestones placeholder
                '<p class="sv-tide-soon">' + esc(t('soon')) + '</p>';
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
            active = false;
            btn.setAttribute('aria-pressed', 'false'); btn.classList.remove('active');
        });

        // --- Scoped style ----------------------------------------------------
        var styled = false;
        function injectStyle() {
            if (styled) { return; }
            styled = true;
            var P = '#sv-panel-ext-tide ';
            var css = [
                P + '#sv-tide-root{display:flex;flex-direction:column;gap:.4rem;height:100%;min-height:0;overflow:auto;padding-right:.3rem}',
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
                P + '.sv-tide-soon{font-size:.78rem;color:#aaa;margin:.4rem 0 0;border-top:1px solid rgba(127,127,127,.18);padding-top:.4rem}',
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
