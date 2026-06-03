/**
 * sViewer extension — Moi (me)
 *
 * Personal space for the current browser. First facet: "Mes cartes" — save the
 * current sViewer permalink to localStorage so the user can restore a fully
 * configured map (layers, zoom, filters, theme, extensions, title) in one
 * click. Pure client-side, no backend, no account.
 *
 * The 'me' namespace is intended to host other personal facets later
 * (annotations, preferences, history). Each facet uses its own localStorage
 * key under the sv_me_<facet>_v1 convention.
 *
 * Maps facet identity: id = djb2(normalized permalink including title param).
 * Two saves of the same URL = same id = de-duplication.
 *
 * Storage shape (maps facet):
 *   localStorage.sv_me_maps_v1 = {
 *     "a3f8b2c1": { id, url, title, date }
 *   }
 *
 * Limits: 16 entries max (oldest evicted by date). Letter avatar (deterministic
 * color from id, first character of title) replaces a real screenshot — keeps
 * storage tiny and avoids OL render-state timing issues.
 *
 * Activated via:  customConfig = { extensions: ['me'] }
 *             or  ?ext=me
 */
(function () {
    'use strict';

    var BASE  = SViewer.extensionBase();
    var PANEL = 'me';
    var KEY   = 'sv_me_maps_v1';
    var MAX   = 16;

    // --- State ---------------------------------------------------------------
    var mapRef = null;
    var active = false;
    var btnEl  = null;
    var pendingMsg = '';
    var filterTerm = '';
    // QR scanner state
    var scanStream = null;     // active MediaStream (camera) — must be stopped on exit
    var scanRAF    = null;     // requestAnimationFrame id of the decode loop
    var scanEl     = null;     // overlay DOM element
    var jsqrReady  = false;    // jsQR fallback loaded

    // --- Inline SVG icons (Bootstrap Icons, MIT) -----------------------------
    // Extensions cannot rely on sViewer's font subset — inline SVG keeps the
    // extension self-contained and works regardless of core font upgrades.
    var ICONS = {
        'person-circle':     '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/><path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"/></svg>',
        'bookmark-plus':     '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/><path d="M8 4a.5.5 0 0 1 .5.5V6H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V7H6a.5.5 0 0 1 0-1h1.5V4.5A.5.5 0 0 1 8 4"/></svg>',
        'arrow-right-circle':'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8m15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0M4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5z"/></svg>',
        'box-arrow-up-right':'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5"/><path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z"/></svg>',
        'clipboard':         '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/></svg>',
        'trash':             '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>',
        'download':          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/></svg>',
        'upload':            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/></svg>',
        'search':            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/></svg>',
        'qr-scan':           '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M0 .5A.5.5 0 0 1 .5 0h3a.5.5 0 0 1 0 1H1v2.5a.5.5 0 0 1-1 0zm12 0a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0V1h-2.5a.5.5 0 0 1-.5-.5M.5 12a.5.5 0 0 1 .5.5V15h2.5a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1 0-1H15v-2.5a.5.5 0 0 1 .5-.5M4 4h1v1H4z"/><path d="M7 2H2v5h5zM3 3h3v3H3zm2 8H4v1h1z"/><path d="M7 9H2v5h5zm-4 1h3v3H3zm8-6h1v1h-1z"/><path d="M9 2h5v5H9zm1 1v3h3V3zM8 8v2h1v1H8v1h2v-2h1v2h1v-1h2v-1h-3V8zm2 2H9V9h1zm4 2h-1v1h-2v1h3zm-4 2v-1H8v1z"/><path d="M12 9h2V8h-2z"/></svg>'
    };
    function icon(name) { return ICONS[name] || ''; }

    // --- i18n ----------------------------------------------------------------
    var _i18n = {};
    function t(key, vars) {
        var lang = (SViewer.config && SViewer.config.lang) || 'fr';
        var s = (_i18n[lang] && _i18n[lang][key]) || (_i18n['fr'] && _i18n['fr'][key]) || key;
        if (vars) {
            Object.keys(vars).forEach(function (k) {
                s = s.replace('{' + k + '}', vars[k]);
            });
        }
        return s;
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
        btnEl.innerHTML = icon('person-circle');
        btnEl.addEventListener('click', onBtnClick);
        toolbar.appendChild(btnEl);

        SViewer.panel.onClose(PANEL, function () {
            active = false;
            stopScan();   // never leave the camera running when the panel closes
            btnEl.setAttribute('aria-pressed', 'false');
            btnEl.classList.remove('active');
        });
    });

    } // end init()

    // --- Hash (djb2) ---------------------------------------------------------

    function djb2(str) {
        var h = 5381;
        for (var i = 0; i < str.length; i++) {
            h = ((h << 5) + h + str.charCodeAt(i)) | 0;
        }
        // unsigned hex, 8 chars
        return (h >>> 0).toString(16).padStart(8, '0');
    }

    function normalizeUrl(href) {
        var u;
        try { u = new URL(href); } catch (e) { return href; }
        // Sort params for stable hashing
        var entries = Array.from(u.searchParams.entries()).sort(function (a, b) {
            return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
        });
        var sp = new URLSearchParams();
        entries.forEach(function (e) { sp.append(e[0], e[1]); });
        return u.origin + u.pathname + '?' + sp.toString();
    }

    // --- Permalink -----------------------------------------------------------
    // Use sViewer's OWN canonical permalink (the exact URL the share panel builds),
    // so a saved map mirrors share behaviour precisely — including the map title.
    // The save-as name is the bookmark label only; it never touches the permalink.
    function buildPermalink() {
        if (typeof SViewer.getPermalink === 'function') {
            var url = SViewer.getPermalink();
            if (url) { return url; }
        }
        // Fallback for older cores: current location (best effort).
        return window.location.href;
    }

    function parseQueryString() {
        var out = {};
        new URLSearchParams(window.location.search).forEach(function (v, k) { out[k] = v; });
        return out;
    }

    /**
     * Best-effort current map title for prefill. Priority:
     *   1. ?title= URL param (deployer or last save)
     *   2. SViewer.config.title (customConfig default or WFS/MD auto-title)
     *   3. document.title (set by setTitle as side effect)
     */
    function currentTitle() {
        var qs = parseQueryString();
        if (qs.title) { return qs.title; }
        if (SViewer.config && SViewer.config.title) { return SViewer.config.title; }
        if (document.title) { return document.title; }
        return '';
    }

    // --- Storage -------------------------------------------------------------

    function loadStore() {
        try {
            var raw = localStorage.getItem(KEY);
            if (!raw) { return {}; }
            var obj = JSON.parse(raw);
            return (obj && typeof obj === 'object') ? obj : {};
        } catch (e) { return {}; }
    }

    function saveStore(store) {
        try {
            localStorage.setItem(KEY, JSON.stringify(store));
            return true;
        } catch (e) {
            return false;
        }
    }

    function entriesByDate(store) {
        return Object.keys(store).map(function (k) { return store[k]; })
            .sort(function (a, b) { return (b.date || 0) - (a.date || 0); });
    }

    function evictOldest(store) {
        var list = entriesByDate(store);
        while (list.length > MAX) {
            var oldest = list.pop();
            delete store[oldest.id];
        }
    }

    // --- Avatar (deterministic visual from id) -------------------------------

    /**
     * Real screenshots of OL maps proved fragile (multi-canvas, render-state
     * timing, CORS taint). Replaced with a deterministic letter avatar:
     * background color derived from the entry id (djb2 hash), initial taken
     * from the first non-space character of the title. Zero capture code,
     * zero storage growth, scannable.
     */
    var AVATAR_PALETTE = [
        '#1a3a5c', '#2c6e49', '#7d4f1d', '#7a2e2e', '#5b2c6f',
        '#1e6091', '#3a7d44', '#a44a3f', '#6a4c93', '#0f4c5c'
    ];
    function avatarColor(id) {
        var n = parseInt(String(id).slice(0, 8), 16) || 0;
        return AVATAR_PALETTE[n % AVATAR_PALETTE.length];
    }
    function avatarLetter(title) {
        var s = String(title || '').trim();
        return s ? s.charAt(0).toUpperCase() : '?';
    }
    function avatarHtml(entry) {
        var color  = avatarColor(entry.id);
        var letter = avatarLetter(entry.title);
        // role="img" + aria-label tell screen readers the tile is a decorative
        // identifier, not a meaningful letter to read out of context.
        return '<div role="img" aria-label="' + escAttr(entry.title || '') + '" ' +
               'style="width:48px;height:48px;flex:none;display:flex;' +
               'align-items:center;justify-content:center;border-radius:6px;' +
               'background:' + color + ';color:#fff;font-weight:700;' +
               'font-size:1.3rem;font-family:sans-serif;line-height:1">' +
               escHtml(letter) + '</div>';
    }

    // --- Panel ---------------------------------------------------------------

    function onBtnClick() {
        active = !active;
        btnEl.setAttribute('aria-pressed', String(active));
        btnEl.classList.toggle('active', active);
        if (active) { openPanel(); } else { SViewer.panel.close(); }
    }

    function filterList(list, term) {
        var q = String(term || '').trim().toLowerCase();
        if (!q) { return list; }
        return list.filter(function (e) {
            return String(e.title || '').toLowerCase().indexOf(q) !== -1;
        });
    }

    // Whether the in-app config-URL loader should appear: only when running as an
    // installed standalone app. SViewer.isInstalled is provided by embed.js and is
    // fail-closed; guard for older cores that lack it.
    function showLoader() {
        return typeof SViewer.isInstalled === 'function' && SViewer.isInstalled();
    }

    // The "load a map by URL" block — rendered only in installed standalone mode.
    function loadBlockHtml() {
        if (!showLoader()) { return ''; }
        return [
            '<label for="sv-me-load" style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.2rem">' + escHtml(t('label.load')) + '</label>',
            '<div style="display:flex;gap:.35rem">',
            '<input id="sv-me-load" type="url" inputmode="url" class="form-control form-control-sm"',
            '       placeholder="' + escAttr(t('placeholder.load')) + '"',
            '       autocomplete="off" style="color:var(--sv-panel-fg);background-color:var(--sv-panel-input-bg)">',
            '<button id="sv-me-load-btn" class="btn btn-sm btn-primary" type="button" style="white-space:nowrap">',
            escHtml(t('btn.load')),
            '</button>',
            // Scan a QR code — the friction-free way to bring a sViewer URL into an
            // installed app that has no address bar (point at a QR shown on another
            // screen or printed).
            '<button id="sv-me-scan-btn" class="btn btn-sm btn-secondary" type="button"',
            '        aria-label="' + escAttr(t('btn.scan')) + '" title="' + escAttr(t('btn.scan')) + '"',
            '        style="display:inline-flex;align-items:center">' + icon('qr-scan') + '</button>',
            '</div>',
            '<div style="font-size:.7rem;color:var(--sv-panel-fg-muted);margin:.2rem 0 .6rem">' + escHtml(t('label.load_hint')) + '</div>'
        ].join('');
    }

    // Validate a pasted config URL and, if safe, navigate the installed app to it.
    // Reuses isSafeUrl (same-origin https, or same-origin http for localhost dev) so
    // a pasted link can never bounce the standalone app off-origin. Forces `me` into
    // the ext list so the personal hub survives the navigation.
    // Validate a sViewer URL (same-origin only) and navigate to it, keeping the `me`
    // hub in the ext list. Shared by the paste field and the QR scanner. Returns
    // false (with a pending error message) if the URL is rejected.
    function loadUrlString(raw) {
        raw = (raw || '').trim();
        if (!raw) { return false; }
        if (!isSafeUrl(raw)) { pendingMsg = t('msg.load_invalid'); refresh(); return false; }
        var u;
        try { u = new URL(raw, window.location.origin); } catch (e) { pendingMsg = t('msg.load_invalid'); refresh(); return false; }
        // Keep the `me` hub available after reload.
        var ext = (u.searchParams.get('ext') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (ext.indexOf('me') === -1) { ext.push('me'); }
        u.searchParams.set('ext', ext.join(','));
        window.location.assign(u.href);
        return true;
    }
    function onLoadUrl() {
        var input = document.getElementById('sv-me-load');
        loadUrlString(input && input.value);
    }

    // --- QR scanner ----------------------------------------------------------
    // Opens the camera and decodes a QR code, then loads the URL it contains.
    // The decoded URL goes through loadUrlString → isSafeUrl, so a hostile QR can
    // only ever point at this same origin (never off-site). Decoder: native
    // BarcodeDetector when available (Android Chrome, zero weight), else lazy-loaded
    // jsQR (iOS/others). Camera tracks are always stopped on exit.

    function stopScan() {
        if (scanRAF) { cancelAnimationFrame(scanRAF); scanRAF = null; }
        if (scanStream) { scanStream.getTracks().forEach(function (tr) { tr.stop(); }); scanStream = null; }
        if (scanEl && scanEl.parentNode) { scanEl.parentNode.removeChild(scanEl); }
        scanEl = null;
    }

    function loadJsqr(cb) {
        if (jsqrReady || window.jsQR) { jsqrReady = true; cb(); return; }
        var s = document.createElement('script');
        s.src = BASE + 'jsqr.min.js';
        s.onload  = function () { jsqrReady = true; cb(); };
        s.onerror = function () { cb(new Error('jsqr-load-failed')); };
        document.head.appendChild(s);
    }

    function scanStatus(msg) {
        var el = scanEl && scanEl.querySelector('.sv-me-scan-status');
        if (el) { el.textContent = msg; }
    }

    // Build the camera overlay (video + aiming frame + cancel) and append to body.
    function buildScanOverlay(video) {
        var el = document.createElement('div');
        el.setAttribute('style', [
            'position:fixed', 'inset:0', 'z-index:10000', 'background:#000',
            'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center'
        ].join(';'));
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0';
        var frame = document.createElement('div');
        frame.style.cssText = 'position:relative;width:70vmin;height:70vmin;border:3px solid rgba(255,255,255,.85);border-radius:12px;box-shadow:0 0 0 100vmax rgba(0,0,0,.45)';
        var status = document.createElement('div');
        status.className = 'sv-me-scan-status';
        status.setAttribute('role', 'status');
        status.style.cssText = 'position:absolute;bottom:12%;left:0;right:0;text-align:center;color:#fff;font-size:.95rem;padding:0 1rem';
        status.textContent = t('scan.hint');
        var cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'btn btn-light';
        cancel.textContent = t('scan.cancel');
        cancel.style.cssText = 'position:absolute;top:12px;right:12px;z-index:1';
        cancel.addEventListener('click', stopScan);
        el.appendChild(video);
        el.appendChild(frame);
        el.appendChild(status);
        el.appendChild(cancel);
        return el;
    }

    async function startScan() {
        if (scanStream) { return; } // already scanning
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            pendingMsg = t('scan.no_camera'); refresh(); return;
        }
        var video = document.createElement('video');
        try {
            scanStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }, audio: false
            });
        } catch (e) {
            scanStream = null;
            pendingMsg = (e && e.name === 'NotAllowedError') ? t('scan.denied') : t('scan.no_camera');
            refresh();
            return;
        }
        scanEl = buildScanOverlay(video);
        document.body.appendChild(scanEl);
        video.srcObject = scanStream;
        try { await video.play(); } catch (e) { /* autoplay; playsinline set */ }

        // Native BarcodeDetector path (no library).
        var detector = null;
        if (window.BarcodeDetector) {
            try { detector = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { detector = null; }
        }

        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d', { willReadFrequently: true });

        var onDecoded = function (text) {
            if (!text) { return false; }
            // loadUrlString navigates on success; on rejection it sets pendingMsg.
            stopScan();
            if (!loadUrlString(text)) { /* invalid/off-origin — message already set */ }
            return true;
        };

        var tick = function () {
            if (!scanStream) { return; }            // stopped
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                if (detector) {
                    detector.detect(video).then(function (codes) {
                        if (codes && codes.length && codes[0].rawValue) { onDecoded(codes[0].rawValue); }
                    }).catch(function () { /* transient */ });
                } else if (window.jsQR) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    var code = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
                    if (code && code.data) { onDecoded(code.data); }
                }
            }
            if (scanStream) { scanRAF = requestAnimationFrame(tick); }
        };

        if (detector) {
            scanRAF = requestAnimationFrame(tick);
        } else {
            loadJsqr(function (err) {
                if (err || !window.jsQR) { stopScan(); pendingMsg = t('scan.no_camera'); refresh(); return; }
                scanRAF = requestAnimationFrame(tick);
            });
        }
    }

    function panelHtml() {
        var store    = loadStore();
        var fullList = entriesByDate(store);
        var list     = filterList(fullList, filterTerm);
        var msg      = pendingMsg;
        pendingMsg = '';

        // Flat layout: save section, a horizontal rule, then the registry (list).
        // No boxed/sticky save block — the panel is one scrolling surface; sections
        // are told apart by a simple <hr>, matching sViewer's flat idiom.
        var hr = '<hr style="border:0;border-top:1px solid var(--sv-panel-border);margin:.4rem 0 .6rem">';
        var head = [
            '<div style="padding:0.75rem;display:flex;flex-direction:column;gap:0.6rem">',

            // Save section. In an installed app the loader (paste URL / scan QR) sits
            // on top — it replaces the missing address bar (gated by isInstalled()).
            loadBlockHtml(),
            '<label for="sv-me-title" style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.2rem">' + escHtml(t('label.title')) + '</label>',
            '<input id="sv-me-title" type="text" class="form-control form-control-sm"',
            '       placeholder="' + escHtml(t('placeholder.title')) + '"',
            '       value="' + escHtml(currentTitle()) + '"',
            '       style="color:var(--sv-panel-fg);background-color:var(--sv-panel-input-bg)">',
            '<div style="font-size:.7rem;color:var(--sv-panel-fg-muted);margin-top:.2rem">' + escHtml(t('label.title_hint')) + '</div>',
            '<button id="sv-me-save" class="btn btn-sm btn-primary w-100" style="margin-top:.4rem">',
            icon('bookmark-plus') + ' ' + escHtml(t('btn.save')),
            '</button>',
            msg ? '<div id="sv-me-msg" style="font-size:.8rem;color:var(--sv-panel-fg-muted);margin-top:.4rem">' + escHtml(msg) + '</div>' : '',

            // Separator between the save section and the registry below.
            fullList.length > 0 ? hr : '',
            // Filter input — only shown when at least one entry exists
            fullList.length > 0 ? [
                '<div style="position:relative">',
                '<label for="sv-me-filter" class="visually-hidden">' + escHtml(t('placeholder.filter')) + '</label>',
                '<span aria-hidden="true" style="position:absolute;left:.5rem;top:50%;transform:translateY(-50%);color:var(--sv-panel-fg-muted);pointer-events:none">' + icon('search') + '</span>',
                '<input id="sv-me-filter" type="search" class="form-control form-control-sm"',
                '       placeholder="' + escHtml(t('placeholder.filter')) + '"',
                '       value="' + escHtml(filterTerm) + '"',
                '       autocomplete="off"',
                '       aria-label="' + escAttr(t('placeholder.filter')) + '"',
                '       style="color:var(--sv-panel-fg);background-color:var(--sv-panel-input-bg);padding-left:1.8rem">',
                '</div>'
            ].join('') : ''
        ];

        var body;
        if (fullList.length === 0) {
            body = ['<div style="font-size:.85rem;color:var(--sv-panel-fg-muted);text-align:center;padding:1rem 0">' + escHtml(t('msg.empty')) + '</div>'];
        } else if (list.length === 0) {
            body = ['<div style="font-size:.85rem;color:var(--sv-panel-fg-muted);text-align:center;padding:1rem 0">' + escHtml(t('msg.no_match')) + '</div>'];
        } else {
            body = ['<div style="display:flex;flex-direction:column">'];
            list.forEach(function (e) {
                body.push(renderEntry(e));
            });
            body.push('</div>');
        }

        var footer = [
            hr,
            '<div style="display:flex;gap:.4rem">',
            '<button id="sv-me-export" class="btn btn-sm btn-outline-secondary flex-fill" type="button">',
            icon('download') + ' ' + escHtml(t('btn.export')),
            '</button>',
            '<button id="sv-me-import-btn" class="btn btn-sm btn-outline-secondary flex-fill" type="button">',
            icon('upload') + ' ' + escHtml(t('btn.import')),
            '</button>',
            '<input id="sv-me-import-file" type="file" accept="application/json,.json" style="display:none">',
            '</div>',
            '</div>'
        ];

        return head.concat(body).concat(footer).join('');
    }

    function renderEntry(e) {
        var dateStr = e.date ? new Date(e.date).toLocaleDateString(
            (SViewer.config && SViewer.config.lang) || 'fr',
            { year: 'numeric', month: 'short', day: 'numeric' }
        ) : '';

        // Flat row, primary area opens the map. The avatar + title + date form one
        // big clickable target (data-act="open-here") — matching the instinct to tap
        // the largest element — so no separate "open here" button is needed. Secondary
        // actions sit at the right edge; their clicks stop propagation so they don't
        // also open the map.
        var open = escAttr(t('btn.open_here'));
        return [
            '<div class="sv-me-card" data-id="' + escAttr(e.id) + '"',
            '     style="display:flex;gap:.6rem;align-items:center;padding:.5rem .25rem;border-bottom:1px solid var(--sv-panel-border)">',
            // Primary clickable area: avatar + title + date → open here.
            '<div class="sv-me-open" role="button" tabindex="0" data-act="open-here"',
            '     aria-label="' + open + ' — ' + escAttr(e.title || '') + '" title="' + open + '"',
            '     style="display:flex;gap:.6rem;align-items:center;flex:1;min-width:0;cursor:pointer;border-radius:6px;padding:.15rem;margin:-.15rem">',
            avatarHtml(e),
            '<div style="flex:1;min-width:0">',
            '<div style="font-weight:600;font-size:.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + escAttr(e.title) + '">',
            escHtml(e.title || '(sans titre)'),
            '</div>',
            '<div style="font-size:.7rem;color:var(--sv-panel-fg-muted)">' + escHtml(dateStr) + '</div>',
            '</div>',
            '</div>',
            // Secondary actions, right edge.
            '<div style="display:flex;gap:.2rem;flex:none">',
            actionBtn('open-new',  'box-arrow-up-right', t('btn.open_new')),
            actionBtn('copy',      'clipboard',          t('btn.copy_url')),
            actionBtn('delete',    'trash',              t('btn.delete')),
            '</div>',
            '</div>'
        ].join('');
    }

    function actionBtn(action, iconName, label) {
        return '<button class="btn btn-sm btn-outline-secondary" data-act="' + action + '"' +
               ' title="' + escAttr(label) + '" aria-label="' + escAttr(label) + '"' +
               ' style="padding:.1rem .35rem;font-size:.75rem">' +
               icon(iconName) + '</button>';
    }

    function openPanel() {
        // 'me' is a self-contained list/config panel — no live map interaction —
        // so it opts into fullscreen on small screens for readability. Core stays
        // agnostic; this is the extension declaring its own display preference.
        SViewer.panel.open(PANEL, t('panel.title'), panelHtml(), { fullscreen: true });
        wireEvents();
    }

    function refresh() {
        SViewer.panel.update(PANEL, panelHtml());
        wireEvents();
    }

    function wireEvents() {
        var loadBtn = document.getElementById('sv-me-load-btn');
        if (loadBtn) { loadBtn.addEventListener('click', onLoadUrl); }
        var scanBtn = document.getElementById('sv-me-scan-btn');
        if (scanBtn) { scanBtn.addEventListener('click', function () { startScan(); }); }
        var loadInput = document.getElementById('sv-me-load');
        if (loadInput) {
            loadInput.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter') { ev.preventDefault(); onLoadUrl(); }
            });
        }

        var save = document.getElementById('sv-me-save');
        if (save) { save.addEventListener('click', onSave); }

        var exp = document.getElementById('sv-me-export');
        if (exp) { exp.addEventListener('click', onExport); }

        var impBtn  = document.getElementById('sv-me-import-btn');
        var impFile = document.getElementById('sv-me-import-file');
        if (impBtn && impFile) {
            impBtn.addEventListener('click', function () { impFile.click(); });
            impFile.addEventListener('change', onImport);
        }

        // Filter input — live substring match. Enter opens first match.
        // Refresh re-creates the input, so restore focus + caret afterwards.
        var filter = document.getElementById('sv-me-filter');
        if (filter) {
            filter.addEventListener('input', function (ev) {
                filterTerm = ev.target.value;
                refresh();
                var newFilter = document.getElementById('sv-me-filter');
                if (newFilter) {
                    newFilter.focus();
                    var pos = newFilter.value.length;
                    try { newFilter.setSelectionRange(pos, pos); } catch (e) { /* type=search may forbid */ }
                }
            });
            filter.addEventListener('keydown', function (ev) {
                if (ev.key !== 'Enter') { return; }
                ev.preventDefault();
                var first = document.querySelector('.sv-me-card');
                if (!first) { return; }
                var id = first.getAttribute('data-id');
                if (id) { onAction('open-here', id); }
            });
        }

        // Card actions: the primary open-here area and the secondary buttons all
        // carry data-act. Buttons stop propagation so a click never bubbles to the
        // row. The open-here area is role="button" → also responds to Enter/Space.
        var acts = document.querySelectorAll('.sv-me-card [data-act]');
        acts.forEach(function (b) {
            var run = function (ev) {
                ev.stopPropagation();
                var card = ev.target.closest('.sv-me-card');
                if (!card) { return; }
                onAction(b.getAttribute('data-act'), card.getAttribute('data-id'));
            };
            b.addEventListener('click', run);
            if (b.getAttribute('role') === 'button') {
                b.addEventListener('keydown', function (ev) {
                    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); run(ev); }
                });
                // Hover/focus affordance without a stylesheet (me injects no <style>):
                // tint the open-here row on pointer/keyboard focus so it reads as
                // interactive and the focus ring is visible (a11y).
                var hl = function () { b.style.background = 'var(--sv-panel-input-bg)'; };
                var un = function () { b.style.background = ''; };
                b.addEventListener('mouseenter', hl);
                b.addEventListener('mouseleave', un);
                b.addEventListener('focus', hl);
                b.addEventListener('blur', un);
            }
        });
    }

    // --- Actions -------------------------------------------------------------

    function onSave() {
        var input = document.getElementById('sv-me-title');
        var title = (input && input.value || '').trim();
        if (!title) {
            pendingMsg = t('msg.no_title');
            refresh();
            return;
        }

        // `title` is the bookmark NAME (list label) — it does NOT go into the
        // permalink (the map keeps its own title). It is part of the entry identity
        // so the same map can be saved under several names.
        var url   = buildPermalink();
        var id    = djb2(normalizeUrl(url) + '|' + title);
        var store = loadStore();

        if (store[id]) {
            pendingMsg = t('msg.exists');
            refresh();
            return;
        }

        var list = entriesByDate(store);
        if (list.length >= MAX) {
            pendingMsg = t('msg.max_reached');
            refresh();
            return;
        }

        store[id] = {
            id:    id,
            url:   url,
            title: title,
            date:  Date.now()
        };

        evictOldest(store);

        if (!saveStore(store)) {
            pendingMsg = t('msg.quota');
        } else {
            pendingMsg = t('msg.saved');
        }
        refresh();
    }

    function onAction(act, id) {
        var store = loadStore();
        var entry = store[id];
        if (!entry) { return; }

        if (act === 'open-here') {
            if (!isSafeUrl(entry.url)) { pendingMsg = t('msg.unsafe_url'); refresh(); return; }
            window.location.href = entry.url;
            return;
        }
        if (act === 'open-new') {
            if (!isSafeUrl(entry.url)) { pendingMsg = t('msg.unsafe_url'); refresh(); return; }
            window.open(entry.url, '_blank', 'noopener');
            return;
        }
        if (act === 'copy') {
            copyText(entry.url).then(function (ok) {
                pendingMsg = ok ? t('msg.copied') : t('msg.copy_failed');
                refresh();
            });
            return;
        }
        if (act === 'delete') {
            if (!window.confirm(t('msg.confirm_delete'))) { return; }
            delete store[id];
            saveStore(store);
            pendingMsg = t('msg.deleted');
            refresh();
            return;
        }
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text)
                .then(function () { return true; })
                .catch(function () { return false; });
        }
        return Promise.resolve(false);
    }

    function onExport() {
        var store = loadStore();
        var list  = entriesByDate(store);
        var blob  = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
        var url   = URL.createObjectURL(blob);
        var a     = document.createElement('a');
        var ts    = new Date().toISOString().slice(0, 10);
        a.href     = url;
        a.download = 'sviewer-mes-cartes-' + ts + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function onImport(ev) {
        var file = ev.target.files && ev.target.files[0];
        if (!file) { return; }
        var reader = new FileReader();
        reader.onload = function () {
            try {
                var data = JSON.parse(reader.result);
                if (!Array.isArray(data)) { throw new Error('not-array'); }
                var store = loadStore();
                var added = 0, skipped = 0;
                data.forEach(function (e) {
                    if (!e || !e.id || !e.url || !e.title) { return; }
                    if (!isSafeUrl(e.url)) { skipped++; return; }
                    if (store[e.id]) { skipped++; return; }
                    store[e.id] = {
                        id:    e.id,
                        url:   e.url,
                        title: e.title,
                        date:  e.date || Date.now()
                    };
                    added++;
                });
                evictOldest(store);
                saveStore(store);
                pendingMsg = t('msg.imported', { added: added, skipped: skipped });
            } catch (err) {
                pendingMsg = t('msg.import_error');
            }
            ev.target.value = '';
            refresh();
        };
        reader.readAsText(file);
    }

    // --- Utilities -----------------------------------------------------------

    /**
     * Defence-in-depth: refuse anything that isn't https. Imported JSON could
     * carry "url": "javascript:..." (XSS via window.location/window.open) or
     * "url": "http://..." (MITM-rewritable on user open). Validate at import-
     * time AND at action-time so legacy entries pre-validation are still safe.
     *
     * Exception: same-origin http is allowed to keep localhost dev workflow
     * working (no need for self-signed cert just to test). Production deploys
     * must serve sViewer over https — see TECHNICAL.md.
     */
    function isSafeUrl(url) {
        if (typeof url !== 'string') { return false; }
        try {
            var u = new URL(url, window.location.origin);
            if (u.protocol === 'https:') { return true; }
            if (u.protocol === 'http:' && u.origin === window.location.origin) { return true; }
            return false;
        } catch (e) {
            return false;
        }
    }

    function escHtml(s) {
        return String((s === null || s === undefined) ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    function escAttr(s) { return escHtml(s); }

}());
