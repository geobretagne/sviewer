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
        'search':            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/></svg>'
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

    // --- Permalink (independent of share panel) ------------------------------
    /**
     * Reads sViewer state directly to build a permalink. The built-in
     * setPermalink() only runs when the share panel is visible — we cannot
     * rely on #sv-permalink-url.href being current.
     */
    function buildPermalink(overrideTitle) {
        var view   = SViewer.getView();
        var config = SViewer.config || {};
        var state  = SViewer.state  || {};
        var qs     = parseQueryString();
        var c      = view.getCenter();

        var p = {};
        p.x = Math.round(c[0]);
        p.y = Math.round(c[1]);
        p.z = view.getZoom();
        if (state.lb !== undefined && state.lb !== null) { p.lb = state.lb; }
        if (config.customConfigName)                     { p.c = config.customConfigName; }
        if (config.layersQueryString)                    { p.layers = config.layersQueryString; }
        if (config.metadataIds && config.metadataIds.length && !config.layersQueryString) {
            p.md = config.metadataIds.join(',');
        }
        if (state.theme && state.theme !== 'light')      { p.theme = state.theme; }
        if (state.position)                              { p.position = '1'; }
        if (state.opacity !== null && state.opacity !== undefined && state.opacity !== 1) { p.opacity = state.opacity; }
        if (state.geojson)                               { p.geojson = state.geojson; }
        if (state.label)                                 { p.label = state.label; }
        // Preserve full ?ext= list — including 'me' itself so restored maps
        // keep access to the personal panel without manual re-activation.
        if (qs.ext) { p.ext = qs.ext; }
        var titleVal = (typeof overrideTitle === 'string') ? overrideTitle.trim() : (config.title || '');
        if (titleVal) { p.title = titleVal; }

        var base = window.SViewer.baseUrl
            ? window.SViewer.baseUrl + 'index.html'
            : window.location.origin + window.location.pathname;
        return base + '?' + new URLSearchParams(p).toString();
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

    function panelHtml() {
        var store    = loadStore();
        var fullList = entriesByDate(store);
        var list     = filterList(fullList, filterTerm);
        var msg      = pendingMsg;
        pendingMsg = '';

        // Sticky save block (top) + sticky footer (bottom) + naturally-scrolling
        // list in between. One scrollbar (the panel's own); no nested overflow.
        // 'position:sticky' on direct children of the scroll container does the
        // trick without JS or fixed heights.
        var head = [
            '<div style="padding:0.75rem;display:flex;flex-direction:column;gap:0.6rem">',

            '<div id="sv-me-save-block" style="position:sticky;top:0;z-index:2;background:#fff;padding-bottom:.5rem;border-bottom:1px solid #dee2e6;margin:-0.75rem -0.75rem 0;padding:0.75rem">',
            '<label for="sv-me-title" style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.2rem">' + escHtml(t('label.title')) + '</label>',
            '<input id="sv-me-title" type="text" class="form-control form-control-sm"',
            '       placeholder="' + escHtml(t('label.title')) + '"',
            '       value="' + escHtml(currentTitle()) + '"',
            '       style="color:#212529;background-color:#fff">',
            '<div style="font-size:.7rem;color:var(--bs-secondary);margin-top:.2rem">' + escHtml(t('label.title_hint')) + '</div>',
            '<button id="sv-me-save" class="btn btn-sm btn-primary w-100" style="margin-top:.4rem">',
            icon('bookmark-plus') + ' ' + escHtml(t('btn.save')),
            '</button>',
            msg ? '<div id="sv-me-msg" style="font-size:.8rem;color:var(--bs-secondary);margin-top:.4rem">' + escHtml(msg) + '</div>' : '',
            // Filter input — only shown when at least one entry exists
            fullList.length > 0 ? [
                '<div style="position:relative;margin-top:.5rem">',
                '<label for="sv-me-filter" class="visually-hidden">' + escHtml(t('placeholder.filter')) + '</label>',
                '<span aria-hidden="true" style="position:absolute;left:.5rem;top:50%;transform:translateY(-50%);color:#6c757d;pointer-events:none">' + icon('search') + '</span>',
                '<input id="sv-me-filter" type="search" class="form-control form-control-sm"',
                '       placeholder="' + escHtml(t('placeholder.filter')) + '"',
                '       value="' + escHtml(filterTerm) + '"',
                '       autocomplete="off"',
                '       aria-label="' + escAttr(t('placeholder.filter')) + '"',
                '       style="color:#212529;background-color:#fff;padding-left:1.8rem">',
                '</div>'
            ].join('') : '',
            '</div>'
        ];

        var body;
        if (fullList.length === 0) {
            body = ['<div style="font-size:.85rem;color:var(--bs-secondary);text-align:center;padding:1rem 0">' + escHtml(t('msg.empty')) + '</div>'];
        } else if (list.length === 0) {
            body = ['<div style="font-size:.85rem;color:var(--bs-secondary);text-align:center;padding:1rem 0">' + escHtml(t('msg.no_match')) + '</div>'];
        } else {
            body = ['<div style="display:flex;flex-direction:column;gap:.5rem">'];
            list.forEach(function (e) {
                body.push(renderEntry(e));
            });
            body.push('</div>');
        }

        var footer = [
            '<div style="position:sticky;bottom:0;z-index:2;background:#fff;display:flex;gap:.4rem;border-top:1px solid #dee2e6;margin:0 -0.75rem -0.75rem;padding:0.6rem 0.75rem">',
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

        return [
            '<div class="sv-me-card" data-id="' + escAttr(e.id) + '"',
            '     style="display:flex;gap:.5rem;align-items:center;padding:.4rem;border:1px solid #dee2e6;border-radius:4px;background:#fff">',
            avatarHtml(e),
            '<div style="flex:1;min-width:0">',
            '<div style="font-weight:600;font-size:.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + escAttr(e.title) + '">',
            escHtml(e.title || '(sans titre)'),
            '</div>',
            '<div style="font-size:.7rem;color:var(--bs-secondary)">' + escHtml(dateStr) + '</div>',
            '<div style="display:flex;gap:.2rem;margin-top:.2rem;flex-wrap:wrap">',
            actionBtn('open-here', 'arrow-right-circle', t('btn.open_here')),
            actionBtn('open-new',  'box-arrow-up-right', t('btn.open_new')),
            actionBtn('copy',      'clipboard',          t('btn.copy_url')),
            actionBtn('delete',    'trash',              t('btn.delete')),
            '</div>',
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
        SViewer.panel.open(PANEL, t('panel.title'), panelHtml());
        wireEvents();
    }

    function refresh() {
        SViewer.panel.update(PANEL, panelHtml());
        wireEvents();
    }

    function wireEvents() {
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

        // Delegated action buttons on cards
        var cards = document.querySelectorAll('.sv-me-card [data-act]');
        cards.forEach(function (b) {
            b.addEventListener('click', function (ev) {
                var card = ev.target.closest('.sv-me-card');
                if (!card) { return; }
                var id  = card.getAttribute('data-id');
                var act = ev.currentTarget.getAttribute('data-act');
                onAction(act, id);
            });
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

        var url   = buildPermalink(title);
        var id    = djb2(normalizeUrl(url));
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
