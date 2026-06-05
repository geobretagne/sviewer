/**
 * sViewer extension — Print / PDF
 *
 * Re-renders the OL map at target print resolution, opens a print tab with
 * the full-page map image and an optional QR code overlay (bottom-right),
 * then triggers window.print().
 *
 * Method: map.setSize([w, h]) — bypasses DOM measurement, forces OL to render
 * at exact print pixel dimensions. After rendercomplete, grab canvas.toDataURL(),
 * then map.setSize(origSize) to restore. Zero DOM manipulation needed.
 *
 * A4 landscape @ 150 dpi = 1754 × 1240 px (full page, no header).
 *
 * QR code: optional, lazy-loads qr-creator.min.js only when checked.
 * Encodes the current permalink minus ?ext=print.
 *
 * Activated via:  customConfig = { extensions: ['print'] }
 *             or  ?ext=print
 */
(function () {
    'use strict';

    var BASE  = SViewer.extensionBase();
    var PANEL = 'print';

    // A4 @ 150 dpi: landscape 1754 × 1240 px, portrait 1240 × 1754 px
    var FORMATS = {
        landscape: { w: 1754, h: 1240, page: 'A4 landscape' },
        portrait:  { w: 1240, h: 1754, page: 'A4 portrait'  }
    };

    var RENDER_TIMEOUT_MS = 12000;

    // --- State ---------------------------------------------------------------
    var mapRef     = null;
    var active     = false;
    var btnEl      = null;
    var rendering  = false;
    var qrLibReady = false;
    var lastOrient = 'landscape';   // persists across updateMsg re-renders

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

        var toolbar = document.getElementById('sv-panel-controls');
        btnEl = document.createElement('button');
        btnEl.type      = 'button';
        btnEl.className = 'btn btn-dark sv-map-btn sv-alt-toggle';
        btnEl.setAttribute('aria-pressed', 'false');
        btnEl.setAttribute('aria-label', t('btn.label'));
        btnEl.setAttribute('title', t('btn.label'));
        // Inline bi-printer SVG (not the font) — extension icons are inline SVG by
        // convention; only core uses the bi webfont. Real Bootstrap-Icons path data.
        btnEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1"/><path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1"/></svg>';
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
        if (active) { openPanel(); } else { SViewer.panel.close(); }
    }

    function panelHtml(msg) {
        return [
            '<div style="padding:0.75rem;display:flex;flex-direction:column;gap:0.75rem">',

            '<div>',
            '<label for="sv-print-orient" style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.2rem">' + t('label.format') + '</label>',
            '<div style="display:flex;gap:.5rem;align-items:center">',
            '<select id="sv-print-orient" class="form-select form-select-sm" style="width:auto;color:#212529;background-color:#fff">',
            '<option value="landscape"' + (lastOrient === 'landscape' ? ' selected' : '') + '>' + t('orient.landscape') + '</option>',
            '<option value="portrait"'  + (lastOrient === 'portrait'  ? ' selected' : '') + '>' + t('orient.portrait')  + '</option>',
            '</select>',
            '<span style="font-size:.75rem;color:var(--bs-secondary)">150 dpi</span>',
            '</div>',
            '</div>',

            '<label style="display:flex;align-items:center;gap:.5rem;font-size:.85rem;cursor:pointer">',
            '<input id="sv-print-qr" type="checkbox">',
            t('label.qr'),
            '</label>',

            '<button id="sv-print-btn" class="btn btn-sm btn-primary w-100"',
            (rendering ? ' disabled' : '') + '>',
            t('btn.print'),
            '</button>',

            msg ? '<div style="font-size:.8rem;color:var(--bs-secondary)">' + escHtml(msg) + '</div>' : '',

            '</div>'
        ].join('');
    }

    function openPanel() {
        SViewer.panel.open(PANEL, t('panel.title'), panelHtml(''));
        document.getElementById('sv-print-btn').addEventListener('click', doPrint);
    }

    function updateMsg(msg, keepQr) {
        SViewer.panel.update(PANEL, panelHtml(msg));
        var btn = document.getElementById('sv-print-btn');
        if (btn) { btn.addEventListener('click', doPrint); }
        var chk = document.getElementById('sv-print-qr');
        if (chk && keepQr) { chk.checked = true; }
        // orientation already reflected via lastOrient in panelHtml
    }

    // --- Scale bar -----------------------------------------------------------

    function scaleBarInfo(view) {
        var res      = view.getResolution();
        var targetPx = 120;
        var rawM     = res * targetPx;
        var magnitude = Math.pow(10, Math.floor(Math.log10(rawM)));
        var nice = [1, 2, 5, 10].reduce(function (best, f) {
            return Math.abs(f * magnitude - rawM) < Math.abs(best - rawM) ? f * magnitude : best;
        }, magnitude);
        var barPx = Math.round(nice / res);
        var label = nice >= 1000 ? (nice / 1000) + ' km' : nice + ' m';
        return { px: barPx, label: label };
    }

    // --- Permalink without ext=print -----------------------------------------

    function permalink() {
        var url    = new URL(window.location.href);
        var extVal = url.searchParams.get('ext');
        if (extVal) {
            // Remove 'print' from comma-separated ext list; drop param if empty
            var parts = extVal.split(',').map(function (s) { return s.trim(); })
                              .filter(function (s) { return s && s !== 'print'; });
            if (parts.length) {
                url.searchParams.set('ext', parts.join(','));
            } else {
                url.searchParams.delete('ext');
            }
        }
        return url.toString();
    }

    // --- QR lib lazy load ----------------------------------------------------

    function loadQrLib(cb) {
        if (qrLibReady) { cb(); return; }
        var s = document.createElement('script');
        s.src = BASE + 'qr-creator.min.js';
        s.onload  = function () { qrLibReady = true; cb(); };
        s.onerror = function () { cb(new Error('qr-load-failed')); };
        document.head.appendChild(s);
    }

    // --- Print ---------------------------------------------------------------

    function doPrint() {
        if (rendering) { return; }
        rendering = true;

        var wantQr = !!(document.getElementById('sv-print-qr') || {}).checked;
        var orientEl = document.getElementById('sv-print-orient');
        lastOrient = (orientEl && orientEl.value === 'portrait') ? 'portrait' : 'landscape';
        var fmt = FORMATS[lastOrient];

        updateMsg(t('msg.rendering'), wantQr);

        var view   = mapRef.getView();
        var scale  = scaleBarInfo(view);
        var link   = wantQr ? permalink() : null;

        // Capture attribution — expand if collapsed so full text is available
        var attrEl = mapRef.getViewport().querySelector('.ol-attribution');
        var attrText = '';
        if (attrEl) {
            var wasCollapsed = attrEl.classList.contains('ol-collapsed');
            if (wasCollapsed) { attrEl.classList.remove('ol-collapsed'); }
            attrText = (attrEl.innerText || attrEl.textContent || '').trim();
            if (wasCollapsed) { attrEl.classList.add('ol-collapsed'); }
        }

        var origSize = mapRef.getSize();
        mapRef.setSize([fmt.w, fmt.h]);

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
            if (!canvas) { restore(); updateMsg('', wantQr); return; }

            var dataUrl;
            try {
                dataUrl = canvas.toDataURL('image/png');
            } catch (e) {
                restore();
                updateMsg(t('err.tainted'), wantQr);
                return;
            }

            restore();

            if (wantQr) {
                loadQrLib(function (err) {
                    var opened = openPrintTab(dataUrl, scale, err ? null : link, attrText, fmt);
                    updateMsg(opened ? (err ? t('err.qr') : t('msg.done')) : t('err.popup'), wantQr);
                });
            } else {
                var opened = openPrintTab(dataUrl, scale, null, attrText, fmt);
                updateMsg(opened ? t('msg.done') : t('err.popup'), wantQr);
            }
        }

        timer = setTimeout(function () {
            if (done) { return; }
            done = true;
            mapRef.un('rendercomplete', onRenderComplete);
            restore();
            updateMsg(t('err.timeout'), wantQr);
        }, RENDER_TIMEOUT_MS);

        mapRef.once('rendercomplete', onRenderComplete);
        mapRef.renderSync();
    }

    // --- QR data URL ---------------------------------------------------------

    function qrDataUrl(text) {
        var c = document.createElement('canvas');
        // QrCreator renders at size × size px
        QrCreator.render({ text: text, radius: 0, ecLevel: 'M', fill: '#000', background: '#fff', size: 128 }, c);
        return c.toDataURL('image/png');
    }

    // --- Print page ----------------------------------------------------------

    function openPrintTab(dataUrl, scale, qrUrl, attrText, fmt) {
        var dateStr = new Date().toLocaleDateString(
            (SViewer.config && SViewer.config.lang) || 'fr',
            { year: 'numeric', month: 'long', day: 'numeric' }
        );

        var barSvg = [
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + (scale.px + 4) + '" height="22">',
            '<rect x="2" y="8" width="' + scale.px + '" height="6" fill="white" stroke="black" stroke-width="1.5"/>',
            '<rect x="2" y="8" width="' + Math.round(scale.px / 2) + '" height="6" fill="black"/>',
            '<text x="' + (scale.px / 2 + 2) + '" y="22" text-anchor="middle"',
            ' font-family="sans-serif" font-size="10" fill="black">' + escHtml(scale.label) + '</text>',
            '</svg>'
        ].join('');

        var qrImg = qrUrl ? '<img src="' + qrDataUrl(qrUrl) + '" width="96" height="96" alt="QR" style="display:block">' : '';
        var attrHtml = attrText ? '<div id="attr">' + escHtml(attrText) + '</div>' : '';

        var html = [
            '<!DOCTYPE html><html><head>',
            '<meta charset="utf-8">',
            '<title>sViewer</title>',
            '<style>',
            '* { margin:0; padding:0; box-sizing:border-box; }',
            'html, body { width:' + (fmt.w > fmt.h ? '297mm' : '210mm') + '; height:' + (fmt.w > fmt.h ? '210mm' : '297mm') + '; overflow:hidden; background:#fff; }',
            '@page { size: ' + fmt.page + '; margin:0; }',
            'body { position:relative; font-family:sans-serif; }',
            '#pm { width:100%; height:100%; display:flex; }',
            '#pm img.map { display:block; width:100%; height:100%; object-fit:fill; }',
            '.ov { position:absolute; background:rgba(255,255,255,0.82); padding:5px 7px; border-radius:3px; }',
            '#qrov { top:6mm; right:6mm; }',
            '#scov { bottom:6mm; right:6mm; display:flex; flex-direction:column; align-items:flex-end; gap:4px; }',
            '#scov .date { font-size:8pt; color:#333; }',
            '#attr { position:absolute; bottom:6mm; left:6mm;',
            '        font-size:7pt; color:#333; max-width:140mm;',
            '        background:rgba(255,255,255,0.82); padding:4px 6px; border-radius:3px; }',
            '@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }',
            '</style>',
            '</head><body>',
            '<div id="pm"><img class="map" src="' + dataUrl + '" alt="map"></div>',
            qrImg ? '<div id="qrov" class="ov">' + qrImg + '</div>' : '',
            '<div id="scov" class="ov">',
            barSvg,
            '<span class="date">' + escHtml(dateStr) + '</span>',
            '</div>',
            attrHtml,
            '<script>window.onload = function() { window.print(); };<\/script>',
            '</body></html>'
        ].join('');

        var w = window.open('', '_blank');
        if (!w) { return false; }
        w.document.write(html);
        w.document.close();
        return true;
    }

    // --- Utilities -----------------------------------------------------------

    function escHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

}());
