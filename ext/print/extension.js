/**
 * sViewer extension — Print / PDF
 *
 * Re-renders the OL map at target print resolution, assembles a print page
 * (title, map image, scale bar, date) in a new tab, then triggers window.print().
 *
 * Method: map.setSize([w, h]) — bypasses DOM measurement, forces OL to render
 * at exact print pixel dimensions. After rendercomplete, grab canvas.toDataURL(),
 * then map.setSize(origSize) to restore. Zero DOM manipulation needed.
 *
 * A4 landscape @ 150 dpi = 1754 × 1240 px map area (minus header ~80px).
 *
 * Activated via:  customConfig = { extensions: ['print'] }
 *             or  ?ext=print
 */
(function () {
    'use strict';

    var BASE  = SViewer.extensionBase();
    var PANEL = 'print';

    // --- Print dimensions (px at 150 dpi) ------------------------------------
    // A4 landscape: 297 × 210 mm → 1754 × 1240 px @ 150 dpi
    var PRINT_W   = 1754;
    var PRINT_H   = 1240;
    var HEADER_H  = 80;   // title row height in print page
    var MAP_H     = PRINT_H - HEADER_H;

    var RENDER_TIMEOUT_MS = 12000;

    // --- State ---------------------------------------------------------------
    var mapRef    = null;
    var active    = false;
    var btnEl     = null;
    var rendering = false;

    // --- i18n ----------------------------------------------------------------
    var _i18n = {};
    function t(key) {
        var lang = (SViewer.config && SViewer.config.lang) || 'fr';
        return (_i18n[lang] && _i18n[lang][key]) || (_i18n['fr'] && _i18n['fr'][key]) || key;
    }

    // --- Bootstrap -----------------------------------------------------------
    fetch(BASE + 'i18n.json')
        .then(function (r) { return r.ok ? r.json() : {}; })
        .catch(function ()  { return {}; })
        .then(function (data) { _i18n = data; init(); });

    function init() {

    SViewer.onMapReady(function (ctx) {
        mapRef = ctx.map;

        // Toolbar button
        var toolbar = document.getElementById('sv-panel-controls');
        btnEl = document.createElement('button');
        btnEl.type        = 'button';
        btnEl.className   = 'btn btn-dark sv-map-btn sv-alt-toggle';
        btnEl.setAttribute('aria-pressed', 'false');
        btnEl.setAttribute('aria-label', t('btn.label'));
        btnEl.setAttribute('title', t('btn.label'));
        btnEl.innerHTML   = '<i class="bi bi-printer" aria-hidden="true"></i>';
        btnEl.addEventListener('click', onBtnClick);
        toolbar.appendChild(btnEl);

        SViewer.panel.onClose(PANEL, function () {
            active = false;
            btnEl.setAttribute('aria-pressed', 'false');
            btnEl.classList.remove('active');
        });
    });

    } // end init()

    // --- Panel ---------------------------------------------------------------

    function onBtnClick() {
        active = !active;
        btnEl.setAttribute('aria-pressed', String(active));
        btnEl.classList.toggle('active', active);
        if (active) {
            openPanel();
        } else {
            SViewer.panel.close();
        }
    }

    function panelHtml(msg) {
        var currentTitle = (SViewer.config && SViewer.config.title) || '';
        return [
            '<div style="padding:0.75rem;display:flex;flex-direction:column;gap:0.75rem">',

            '<div>',
            '<label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.2rem">',
            t('label.title'),
            '</label>',
            '<input id="sv-print-title" type="text" class="form-control form-control-sm"',
            ' placeholder="' + escHtml(t('hint.title')) + '"',
            ' value="' + escHtml(currentTitle) + '">',
            '</div>',

            '<div style="display:flex;gap:.5rem;align-items:center">',
            '<span style="font-size:.8rem;font-weight:600;white-space:nowrap">A4 — ' + t('orient.landscape') + '</span>',
            '<span style="font-size:.75rem;color:var(--bs-secondary)">150 dpi</span>',
            '</div>',

            '<button id="sv-print-btn" class="btn btn-sm btn-primary w-100"',
            (rendering ? ' disabled' : '') + '>',
            t('btn.print'),
            '</button>',

            msg ? '<div id="sv-print-msg" style="font-size:.8rem;color:var(--bs-secondary)">' + escHtml(msg) + '</div>' : '',

            '</div>'
        ].join('');
    }

    function openPanel() {
        SViewer.panel.open(PANEL, t('panel.title'), panelHtml(''));
        document.getElementById('sv-print-btn').addEventListener('click', doPrint);
    }

    function updateMsg(msg) {
        SViewer.panel.update(PANEL, panelHtml(msg));
        var btn = document.getElementById('sv-print-btn');
        if (btn) { btn.addEventListener('click', doPrint); }
    }

    // --- Scale bar -----------------------------------------------------------

    function scaleBarInfo(view) {
        // Resolution in m/px at current centre
        var res = view.getResolution();
        // Pick a round distance that fits ~120px
        var targetPx = 120;
        var rawM = res * targetPx;
        var magnitude = Math.pow(10, Math.floor(Math.log10(rawM)));
        var nice = [1, 2, 5, 10].reduce(function (best, f) {
            return Math.abs(f * magnitude - rawM) < Math.abs(best - rawM) ? f * magnitude : best;
        }, magnitude);
        var barPx = Math.round(nice / res);
        var label = nice >= 1000 ? (nice / 1000) + ' km' : nice + ' m';
        return { px: barPx, label: label };
    }

    // --- Print ---------------------------------------------------------------

    function doPrint() {
        if (rendering) { return; }
        rendering = true;
        updateMsg(t('msg.rendering'));

        var userTitle = (document.getElementById('sv-print-title') || {}).value || '';
        var view      = mapRef.getView();
        var scale     = scaleBarInfo(view);

        // Save current size — restore after capture.
        var origSize = mapRef.getSize();

        // Force OL to render at exact print dimensions — no DOM manipulation needed.
        mapRef.setSize([PRINT_W, MAP_H]);

        var done  = false;
        var timer = null;

        function restore() {
            mapRef.setSize(origSize);
            rendering = false;
        }

        function onRenderComplete() {
            if (done) { return; }
            done = true;
            clearTimeout(timer);

            var canvas = mapRef.getViewport().querySelector('canvas');
            if (!canvas) { restore(); updateMsg(''); return; }

            var dataUrl;
            try {
                dataUrl = canvas.toDataURL('image/png');
            } catch (e) {
                restore();
                updateMsg(t('err.tainted'));
                return;
            }

            restore();
            openPrintTab(dataUrl, userTitle, scale);
            updateMsg(t('msg.done'));
        }

        timer = setTimeout(function () {
            if (done) { return; }
            done = true;
            mapRef.un('rendercomplete', onRenderComplete);
            restore();
            updateMsg(t('err.timeout'));
        }, RENDER_TIMEOUT_MS);

        mapRef.once('rendercomplete', onRenderComplete);
        mapRef.renderSync();
    }

    // --- Print page ----------------------------------------------------------

    function openPrintTab(dataUrl, title, scale) {
        var dateStr = new Date().toLocaleDateString(
            (SViewer.config && SViewer.config.lang) || 'fr',
            { year: 'numeric', month: 'long', day: 'numeric' }
        );

        // Scale bar SVG: white background, black bar, label
        var barSvg = [
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + (scale.px + 4) + '" height="22">',
            '<rect x="2" y="8" width="' + scale.px + '" height="6" fill="white" stroke="black" stroke-width="1.5"/>',
            '<rect x="2" y="8" width="' + Math.round(scale.px / 2) + '" height="6" fill="black"/>',
            '<text x="' + (scale.px / 2 + 2) + '" y="22" text-anchor="middle"',
            ' font-family="sans-serif" font-size="10" fill="black">' + escHtml(scale.label) + '</text>',
            '</svg>'
        ].join('');

        var html = [
            '<!DOCTYPE html><html><head>',
            '<meta charset="utf-8">',
            '<title>' + escHtml(title || 'sViewer') + '</title>',
            '<style>',
            '* { margin:0; padding:0; box-sizing:border-box; }',
            'html, body { width:297mm; height:210mm; overflow:hidden; background:#fff; }',
            '@page { size: A4 landscape; margin:0; }',
            'body { display:flex; flex-direction:column; font-family:sans-serif; }',
            '#ph { height:' + HEADER_H + 'px; display:flex; align-items:center;',
            '       justify-content:space-between; padding:0 12px;',
            '       border-bottom:1px solid #ccc; background:#f8f8f8; }',
            '#ph h1 { font-size:14pt; font-weight:600; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
            '#ph .meta { display:flex; align-items:center; gap:16px; flex-shrink:0; }',
            '#ph .meta span { font-size:8pt; color:#555; }',
            '#pm { flex:1; overflow:hidden; }',
            '#pm img { display:block; width:' + PRINT_W + 'px; height:' + MAP_H + 'px; }',
            '@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }',
            '</style>',
            '</head><body>',
            '<div id="ph">',
            '<h1>' + escHtml(title || 'sViewer') + '</h1>',
            '<div class="meta">',
            barSvg,
            '<span>' + escHtml(dateStr) + '</span>',
            '</div>',
            '</div>',
            '<div id="pm"><img src="' + dataUrl + '" alt="map"></div>',
            '<script>window.onload = function() { window.print(); };<\/script>',
            '</body></html>'
        ].join('');

        var w = window.open('', '_blank');
        if (!w) { return; }
        w.document.write(html);
        w.document.close();
    }

    // --- Utilities -----------------------------------------------------------

    function escHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

}());
