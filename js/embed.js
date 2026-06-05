/**
 * SViewer Embed Script
 *
 * Usage in host page:
 * <div id="sviewer-container"></div>
 * <script src="https://example.com/sviewer/static/js/embed.min.js"></script>
 * <script>
 *   SViewer.init('#sviewer-container', { center: [2.3, 48.8], zoom: 12 });
 * </script>
 */

(function() {

    var SVIEWER_VERSION='0.17.2';
    var SVIEWER_COMMIT='a5c02a0';

    // Internal event bus — shared with sviewer.js via window._SViewerInternals.
    // Frozen after creation to prevent host-page collision or tampering.
    var _svBus = {
        _handlers: {},
        on: function(event, fn) {
            (this._handlers[event] = this._handlers[event] || []).push(fn);
        },
        off: function(event, fn) {
            if (!this._handlers[event]) { return; }
            this._handlers[event] = this._handlers[event].filter(function(h) { return h !== fn; });
        },
        emit: function(event, data) {
            (this._handlers[event] || []).forEach(function(h) { try { h(data); } catch(e) { console.error('SViewer bus handler error [' + event + ']:', e); } });
        }
    };
    Object.defineProperty(window, '_SViewerInternals', {
        value: { bus: _svBus },
        writable: false,
        configurable: false
    });

    var debug = /[?&]debug=1/.test(window.location.search);

    // True only when sViewer runs as an INSTALLED standalone app (PWA/WebAPK) at the
    // top level — never in a browser tab, an embed div, or a Grist/Superset iframe.
    // Fail-closed: any uncertainty returns false. Used to enable installed-only UI
    // (e.g. the in-app config-URL input in the `me` extension), which must never
    // appear in embedded modes where navigating would destroy the host page.
    function isInstalledStandalone() {
        try {
            var mm = window.matchMedia;
            var standalone = (mm && (mm('(display-mode: standalone)').matches ||
                                     mm('(display-mode: minimal-ui)').matches ||
                                     mm('(display-mode: fullscreen)').matches)) ||
                             navigator.standalone === true;        // iOS home-screen app
            return !!standalone && window.self === window.top;     // top-level only
        } catch (_e) {
            return false;                                          // fail-closed
        }
    }

    // Queue for addClickHandler calls made before SViewerApp is ready.
    // Drained on sv:mapReady so extensions calling addClickHandler at module scope work correctly.
    var _clickHandlerQueue = [];

    // Cached sv:mapReady payload — set once when the event fires.
    // Used by onMapReady() to call late subscribers immediately (map already ready).
    var _mapReadyPayload = null;

    _svBus.on('sv:mapReady', function(payload) {
        _mapReadyPayload = payload;
        var q = _clickHandlerQueue.splice(0);
        q.forEach(function(fn) {
            if (window.SViewer.app && window.SViewer.app.addClickHandler) {
                window.SViewer.app.addClickHandler(fn);
            }
        });
    });

    // Internal adapter registry — sviewer.js reads via window.SViewer.adapters.
    // Using a sealed object prevents extensions from accidentally overwriting the registry
    // with window.SViewer.adapters = {} (would replace the reference sviewer.js holds).
    var _adapterRegistry = {};

    var SV_SHELL_HTML = `
        <a href="#sv-ol-map" class="sv-skip-to-content i18n" data-i18n="btn.skip_to_map">Skip to map</a>

        <div id="sv-spinner" class="sv-spinner">
            <div class="spinner-border text-light" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>

        <div id="sv-frame-map" class="sv-framemap">
            <div id="sv-toast" class="sv-toast" role="status" aria-live="polite" aria-atomic="true"></div>
            <div id="sv-ol-map" class="sv-map" tabindex="-1" role="region" aria-label="Interactive map">
                <div id="sv-marker"></div>
                <div id="sv-loading-bar" class="sv-loading-bar" aria-hidden="true" style="display:none;"></div>
                <div id="sv-hint" class="sv-hint" role="note" hidden>
                    <span id="sv-hint-text" class="sv-hint-text"></span>
                    <button type="button" id="sv-hint-close" class="sv-hint-close i18n" data-i18n-title="btn.hint_dismiss" title="Dismiss" aria-label="Dismiss hint">
                        <i class="bi bi-x" aria-hidden="true"></i>
                    </button>
                </div>
            </div>

            <div id="sv-ext-toolbar" class="sv-map-controls" role="group" aria-label="Extension controls"></div>

            <div id="sv-map-controls" class="sv-map-controls" role="group" aria-label="Map controls">
                <div class="sv-map-btn-group" role="group" aria-label="Navigation">
                    <button id="sv-btn-home" type="button" accesskey="w" class="i18n btn btn-dark sv-map-btn" title="initial view" data-i18n-title="btn.initial_view" aria-label="Reset to initial view">
                        <i class="bi bi-house" aria-hidden="true"></i>
                    </button>
                    <button id="sv-btn-zoom-in" type="button" accesskey="+" class="i18n btn btn-dark sv-map-btn" title="zoom +" data-i18n-title="btn.zoom_in" aria-label="Zoom in">
                        <i class="bi bi-zoom-in" aria-hidden="true"></i>
                    </button>
                    <button id="sv-btn-zoom-out" type="button" accesskey="-" class="i18n btn btn-dark sv-map-btn" title="zoom -" data-i18n-title="btn.zoom_out" aria-label="Zoom out">
                        <i class="bi bi-zoom-out" aria-hidden="true"></i>
                    </button>
                    <button id="sv-btn-fullscreen" type="button" accesskey="f" class="i18n btn btn-dark sv-map-btn" title="Full screen" data-i18n-title="btn.fullscreen" aria-label="Toggle full screen" aria-pressed="false">
                        <i class="bi bi-fullscreen" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="sv-map-btn-group" role="group" aria-label="Layers">
                    <button id="sv-btn-background" type="button" accesskey="b" class="i18n btn btn-dark sv-map-btn" title="background" data-i18n-title="btn.background" aria-label="Change background layer">
                        <i class="bi bi-map" aria-hidden="true"></i>
                    </button>
                    <button id="sv-btn-locate" type="button" accesskey="g" class="i18n btn btn-dark sv-map-btn" title="Where am I ?" data-i18n-title="btn.where_am_i" aria-label="Locate my position" aria-pressed="false">
                        <i class="bi bi-crosshair" aria-hidden="true"></i>
                    </button>
                    <span id="sv-gps-accuracy" class="sv-gps-accuracy" aria-live="polite" style="display:none;"></span>
                </div>
            </div>

            <div id="sv-panel-controls" class="sv-map-panels" role="group" aria-label="Side panels">
                <button type="button" accesskey="m" id="sv-btn-panel-share" class="i18n btn btn-dark sv-map-btn sv-panel-toggle" data-sv-panel="share" title="Map" data-i18n-title="btn.panel_map" aria-pressed="false">
                    <span id="sv-panel-share-title">Map</span><span class="d-none">&nbsp;</span>
                    <i class="bi bi-gear" aria-hidden="true"></i>
                </button>
                <button type="button" accesskey="i" id="sv-btn-panel-legend" class="i18n btn btn-dark sv-map-btn sv-panel-toggle" data-sv-panel="legend" title="Legend" data-i18n-title="btn.panel_legend" aria-label="Legend panel" aria-pressed="false">
                    <i class="bi bi-info-circle" aria-hidden="true"></i>
                </button>
                <button type="button" accesskey="q" id="sv-btn-panel-query" class="i18n btn btn-dark sv-map-btn sv-panel-toggle" data-sv-panel="query" title="Query" data-i18n-title="btn.panel_query" aria-label="Query panel" aria-pressed="false">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A32 32 0 0 1 8 14.58a32 32 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10"/><path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4m0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/></svg>
                </button>
                <button type="button" accesskey="r" id="sv-btn-panel-locate" class="i18n btn btn-dark sv-map-btn sv-panel-toggle" data-sv-panel="locate" title="Locate" data-i18n-title="btn.panel_locate" aria-label="Locate panel" aria-pressed="false">
                    <i class="bi bi-search" aria-hidden="true"></i>
                </button>
            </div>

            <div id="sv-sidepanel" class="sv-sidepanel" role="complementary" aria-label="Information panel">
                <div id="sv-panel-share" class="sv-panel-section" role="region" data-sv-section="share" aria-label="Map sharing panel" style="display: none;">
                    <div class="sv-panel-header">
                        <h3 class="sv-panel-title i18n" data-i18n="panel.config.title">Configuration</h3>
                        <button type="button" class="sv-sidepanel-close" aria-label="Close panel">
                            <i class="bi bi-x-lg" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div class="sv-panel-content">
                        <div class="mb-3">
                            <label for="sv-share-title" class="form-label i18n" data-i18n="lbl.edit_title">Map title</label>
                            <input type="text" name="setTitle" id="sv-share-title" class="form-control i18n" value="" placeholder="Map title" data-i18n-placeholder="lbl.edit_title">
                        </div>
                        <div class="mb-3">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="sv-theme-switch" role="switch" aria-checked="false">
                                <label class="form-check-label i18n" for="sv-theme-switch" data-i18n="lbl.dark_theme">Dark theme</label>
                            </div>
                        </div>
                        <div class="sv-share-grid">
                            <button type="button" id="sv-btn-permalink" class="i18n btn btn-secondary" title="Link to this map" data-i18n-title="btn.permalink">
                                <i class="bi bi-link" aria-hidden="true"></i>
                                <span class="i18n" data-i18n="btn.permalink_label">Link</span>
                            </button>
                            <button type="button" class="sv-embed-btn i18n btn btn-info" title="Embed" data-i18n-title="btn.embed">
                                <i class="bi bi-code" aria-hidden="true"></i>
                                <span class="i18n" data-i18n="btn.embed_label">Embed</span>
                            </button>
                            <button type="button" id="sv-btn-snapshot" class="i18n btn btn-success" title="Download map as image" data-i18n-title="btn.snapshot">
                                <i class="bi bi-camera" aria-hidden="true"></i>
                                <span class="i18n" data-i18n="btn.snapshot_label">Image</span>
                            </button>
                        </div>
                        <p class="sv-trust-badge">
                            <i class="bi bi-shield-lock sv-trust-icon" aria-hidden="true"></i>
                            <span class="i18n" data-i18n="msg.trust_badge">Self-hosted, no tracker, no cookie.</span>
                        </p>
                        <div class="mt-3 text-end" style="font-size:0.7em;opacity:0.4;user-select:none;" aria-hidden="true">
                            <a href="https://github.com/geobretagne/sviewer/" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;">sViewer ` + SVIEWER_VERSION + `</a> <span style="font-family:monospace">` + SVIEWER_COMMIT + `</span>
                        </div>
                    </div>
                </div>

                <div id="sv-panel-legend" class="sv-panel-section" data-sv-section="legend" aria-label="Map legend" style="display: none;">
                    <div class="sv-panel-header">
                        <h3 class="sv-panel-title i18n" data-i18n="panel.legend.title">Documentation</h3>
                        <button type="button" class="sv-sidepanel-close" aria-label="Close panel">
                            <i class="bi bi-x-lg" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div id="sv-legend-content" class="sv-legend sv-panel-content"></div>
                    <div class="sv-opacity-bar">
                        <label for="sv-opacity-slider" class="sv-opacity-label i18n" data-i18n="lbl.layer_opacity">Opacity</label>
                        <input type="range" id="sv-opacity-slider" class="sv-opacity-slider"
                               min="0" max="100" step="1" value="100"
                               aria-label="Layer opacity" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
                        <span id="sv-opacity-value" class="sv-opacity-value" aria-hidden="true">100%</span>
                    </div>
                </div>

                <div id="sv-panel-query" class="sv-panel-section" data-sv-section="query" aria-label="Map query results" style="display: none;">
                    <div class="sv-panel-header">
                        <h3 class="sv-panel-title i18n" data-i18n="panel.query.title">Query results</h3>
                        <button type="button" class="sv-sidepanel-close" aria-label="Close panel">
                            <i class="bi bi-x-lg" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div class="sv-panel-content">
                        <div id="sv-query-content" class="sv-panel-content" role="status" aria-live="polite"></div>
                    </div>
                </div>

                <div id="sv-panel-locate" class="sv-panel-section" data-sv-section="locate" aria-label="Location search panel" style="display: none;">
                    <div class="sv-panel-header">
                        <h3 class="sv-panel-title i18n" data-i18n="panel.locate.title">Location</h3>
                        <button type="button" class="sv-sidepanel-close" aria-label="Close panel">
                            <i class="bi bi-x-lg" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div class="sv-panel-content">
                        <form id="sv-search-form" action="#">
                            <div class="mb-3">
                                <input type="search" name="searchInput" id="sv-search-input" class="form-control i18n" value="" title="Search place" data-i18n-title="lbl.search_place" placeholder="ex: 10 rue Maurice Fabre, Rennes" data-i18n-placeholder="inp.search_placeholder" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="sv-search-results" aria-autocomplete="list" aria-activedescendant="">
                            </div>
                            <button type="submit" class="visually-hidden i18n" data-i18n="lbl.search_place">Search</button>
                        </form>
                        <div>
                            <ul id="sv-search-results" class="list-group" role="listbox" aria-label="Search results"></ul>
                        </div>
                        <div id="sv-locate-msg" role="status" aria-live="polite" class="mb-3"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- share-modal will be inserted here by JavaScript -->

        <div id="sv-modal-embed" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="sv-modal-embed-title" inert>
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title i18n" id="sv-modal-embed-title" data-i18n="panel.embed_modal.title">Embed in a page</h3>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <ul class="nav nav-tabs mb-3" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active i18n" id="sv-embed-tab-iframe" data-bs-toggle="tab" data-bs-target="#sv-embed-pane-iframe" type="button" role="tab" aria-controls="sv-embed-pane-iframe" aria-selected="true" data-i18n="panel.embed_modal.tab_iframe">iFrame</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link i18n" id="sv-embed-tab-js" data-bs-toggle="tab" data-bs-target="#sv-embed-pane-js" type="button" role="tab" aria-controls="sv-embed-pane-js" aria-selected="false" data-i18n="panel.embed_modal.tab_js">JavaScript</button>
                            </li>
                        </ul>
                        <div class="tab-content">
                            <div class="tab-pane fade show active" id="sv-embed-pane-iframe" role="tabpanel" aria-labelledby="sv-embed-tab-iframe">
                                <p class="sv-embed-hint i18n" data-i18n="panel.embed_modal.hint_iframe">For CMS and blog editors (WordPress, Squarespace…)</p>
                                <textarea id="sv-embed-iframe-code" class="form-control" rows="4" readonly style="font-family: monospace; font-size: 0.85em;" aria-label="iFrame embed code"></textarea>
                                <div class="d-flex justify-content-end mt-2">
                                    <button type="button" id="sv-embed-copy-iframe" class="btn btn-secondary btn-sm i18n" data-i18n="btn.copy">
                                        <i class="bi bi-clipboard" aria-hidden="true"></i> Copy
                                    </button>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="sv-embed-pane-js" role="tabpanel" aria-labelledby="sv-embed-tab-js">
                                <p class="sv-embed-hint i18n" data-i18n="panel.embed_modal.hint_js">For developers integrating in an HTML page</p>
                                <textarea id="sv-embed-js-code" class="form-control" rows="8" readonly style="font-family: monospace; font-size: 0.85em;" aria-label="JavaScript embed code"></textarea>
                                <div class="d-flex justify-content-end mt-2">
                                    <button type="button" id="sv-embed-copy-js" class="btn btn-secondary btn-sm i18n" data-i18n="btn.copy">
                                        <i class="bi bi-clipboard" aria-hidden="true"></i> Copy
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Base URL detection — currentScript is reliable for sync scripts
    var scriptSrc = (document.currentScript && document.currentScript.src) || '';
    if (!scriptSrc) {
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            if (scripts[i].src && scripts[i].src.indexOf('embed') !== -1) {
                scriptSrc = scripts[i].src;
                break;
            }
        }
    }
    var baseUrl = scriptSrc.replace(/static\/js\/embed\..*$/, '');

    var config = {
        baseUrl: baseUrl,
        container: null,
        instance: null
    };

    // Registry of loaded extension names. Populated at boot in loadDependencies()
    // and by SViewer.loadExtension() at runtime. Used to:
    //  - dedupe boot vs runtime load (no double-execute)
    //  - allow other extensions to check what's active
    //  - return existing in-flight Promise when load is requested twice
    var _loadedExts     = Object.create(null); // name -> true
    var _pendingExts    = Object.create(null); // name -> Promise (in-flight loads)
    var EXT_NAME_RE     = /^[a-z0-9_-]+$/i;

    // Minimal semver compare: returns -1 / 0 / 1 (a vs b). Ignores pre-release.
    function semverCmp(a, b) {
        var pa = String(a || '0').split('.').map(function(n) { return parseInt(n, 10) || 0; });
        var pb = String(b || '0').split('.').map(function(n) { return parseInt(n, 10) || 0; });
        for (var i = 0; i < 3; i++) {
            var x = pa[i] || 0, y = pb[i] || 0;
            if (x !== y) { return x < y ? -1 : 1; }
        }
        return 0;
    }

    // Resource loading helper
    function loadResource(url, type) {
        return new Promise(function(resolve, reject) {
            if (type === 'css') {
                var link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = url;
                link.onload = resolve;
                link.onerror = reject;
                document.head.appendChild(link);
            } else if (type === 'js') {
                var script = document.createElement('script');
                script.src = url;
                script.defer = true;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            }
        });
    }

    // Load all required dependencies in correct order
    function loadDependencies() {
        var baseUrl = config.baseUrl;

        // Load CSS in parallel; reveal the container once all layout CSS is applied
        // (sviewer.css: flex:1 on .sv-framemap, bootstrap-scoped: form controls)
        var container = document.querySelector(config.container);
        var cssPromises = [
            loadResource(baseUrl + 'static/lib/ol/ol.css', 'css'),
            loadResource(baseUrl + 'static/lib/bootstrap/bootstrap-scoped.min.css', 'css'),
            loadResource(baseUrl + 'static/fonts/bootstrap-icons.subset.css', 'css'),
            loadResource(baseUrl + (debug ? 'static/css/sviewer.css' : 'static/css/sviewer.min.css'), 'css')
        ];
        Promise.all(cssPromises).then(function() {
            if (container) container.style.visibility = 'visible';
        });

        // Bootstrap is only needed for modals — load in parallel, not blocking the map init chain
        var bootstrapPromise = loadResource(baseUrl + 'static/lib/bootstrap/bootstrap.bundle.min.js', 'js');

        // proj4 must load before OL
        return Promise.all([
            loadResource(baseUrl + 'static/lib/ol/proj4.js', 'js')
        ])
            .then(function() { return loadResource(baseUrl + 'static/lib/ol/ol.js', 'js'); })
            .then(function() {
                var qs = new URLSearchParams(window.location.search);
                var c = qs.get('c');
                var cfgFile = (c && /^[A-Za-z0-9_-]+$/.test(c))
                    ? 'local/customConfig_' + c + '.js'
                    : 'local/customConfig.js';
                return fetch(baseUrl + cfgFile, { method: 'HEAD' })
                    .then(function(res) {
                        if (!res.ok) { return; }
                        var ct = res.headers.get('content-type') || '';
                        if (ct.indexOf('html') !== -1) { return; } // nginx 404 page
                        return loadResource(baseUrl + cfgFile, 'js');
                    })
                    .catch(function() {});
            })
            .then(function() {
                // Load all extensions before map init — adapters register on SViewer.adapters,
                // UI extensions use onMapReady() so early load is safe for both.
                // URL param ?ext=name[,name2] adds extensions without customConfig.
                var urlExts = (new URLSearchParams(window.location.search).get('ext') || '')
                    .split(',').map(function(s) { return s.trim(); }).filter(function(s) { return EXT_NAME_RE.test(s); });
                var configExts = (window.customConfig && window.customConfig.extensions) || [];
                var allExts = configExts.concat(urlExts.filter(function(e) { return !configExts.includes(e); }));
                // Installed standalone app → always load `me` as the persistent hub:
                // it provides the in-app config-URL input + saved-maps picker that
                // replace the missing address bar. No effect in tabs/embeds/iframes.
                if (isInstalledStandalone() && allExts.indexOf('me') === -1) {
                    allExts.push('me');
                }
                var extPromises = allExts
                    .map(function(name) {
                        return loadResource(baseUrl + 'ext/' + name + '/extension.js', 'js')
                            .then(function() { _loadedExts[name] = true; })
                            .catch(function() {});
                    });
                return Promise.all([
                    Promise.all(extPromises),
                    loadResource(baseUrl + 'static/lib/mustache/mustache.min.js', 'js'),
                    Promise.all(cssPromises),
                    bootstrapPromise,
                    loadTemplates(baseUrl)
                ]);
            });
    }

    // Fetch all Mustache templates and store them in window.SViewer.templates
    function loadTemplates(baseUrl) {
        var names = ['sv-layer-panel', 'sv-iso-table', 'sv-query-header', 'sv-search-item', 'sv-search-header', 'sv-share-modal'];
        window.SViewer.templates = {};
        return Promise.all(names.map(function(name) {
            return fetch(baseUrl + 'static/templates/' + name + '.html')
                .then(function(r) { return r.text(); })
                .then(function(t) { window.SViewer.templates[name] = t; });
        }));
    }

    // Insert share modal from template into the DOM
    function insertShareModal() {
        return new Promise(function(resolve) {
            // Wait for templates to be loaded
            if (window.SViewer.templates && window.SViewer.templates['sv-share-modal']) {
                var scope = document.querySelector('.sv-scope');
                if (scope) {
                    var tempDiv = document.createElement('div');
                    tempDiv.innerHTML = window.SViewer.templates['sv-share-modal'];
                    var modal = tempDiv.firstElementChild;
                    scope.appendChild(modal);
                }
                resolve();
            } else {
                // Retry after a short delay
                setTimeout(insertShareModal, 50);
            }
        });
    }

    // Load i18n first (before sviewer.js initializes)
    function loadI18nScript() {
        // Ensure hardConfig exists before i18n.js tries to extend it
        if (!window.SViewer.hardConfig) {
            window.SViewer.hardConfig = window.customConfig || {};
        }
        return new Promise(function(resolve, reject) {
            var script = document.createElement('script');
            script.src = config.baseUrl + 'static/js/i18n.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Load sviewer.js (must be after i18n.js for hardConfig.i18n)
    function loadSViewerScript() {
        return new Promise(function(resolve, reject) {
            var script = document.createElement('script');
            script.src = config.baseUrl + (debug ? 'static/js/sviewer.js' : 'static/js/sviewer.min.js');
            script.onload = function() {
                // Wait a tick to ensure DOM is ready and init completes
                setTimeout(resolve, 100);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Create container structure for sviewer
    function createContainer(selector) {
        var container = document.querySelector(selector);
        if (!container) {
            console.error('SViewer: Container not found:', selector);
            return null;
        }

        // Apply layout styles only if not already provided by host page CSS
        // (avoids a reflow/CLS shift when index.html already has these inline)
        container.className = 'sv-scope';
        var cs = window.getComputedStyle(container);
        if (cs.display !== 'flex') {
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
        }
        if (cs.height === '0px' || cs.height === 'auto') {
            container.style.height = '100%';
            container.style.minHeight = '0';
        }

        // Add sviewer HTML structure
        container.innerHTML = SV_SHELL_HTML;

        return container;
    }

    // Public API
    window.SViewer = {
        version: SVIEWER_VERSION,
        commit: SVIEWER_COMMIT,
        baseUrl: baseUrl,
        embedded: true,

        // True only when running as an installed standalone app (PWA/WebAPK) at the
        // top level. Extensions use this to gate installed-only UI. Fail-closed.
        isInstalled: isInstalledStandalone,

        // Returns the base URL of the calling extension's directory (trailing slash).
        // Call at module scope inside extension.js — relies on document.currentScript.
        // Falls back to baseUrl + 'ext/<name>/' derived from the script src if currentScript
        // is unavailable (e.g. called asynchronously after module scope).
        extensionBase: function() {
            var src = (document.currentScript && document.currentScript.src) || '';
            if (src) {
                // src = …/ext/<name>/extension.js → strip filename
                return src.replace(/\/[^/]+\.js([?#].*)?$/, '/');
            }
            console.warn('SViewer.extensionBase() called outside module scope — document.currentScript is null. Call at module scope and store the result in a variable.');
            return baseUrl + 'ext/';
        },

        // Returns true if the named extension has been loaded (at boot or via
        // loadExtension). Does not guarantee the extension has finished its
        // own async setup (e.g. i18n fetch) — only that its script has run.
        hasExtension: function(name) {
            return !!_loadedExts[name];
        },

        // Returns array of loaded extension names. Snapshot, not live.
        loadedExtensions: function() {
            return Object.keys(_loadedExts);
        },

        /**
         * Programmatically load an extension after sViewer boot.
         *
         * Resolves with the extension name on success. Rejects with an Error
         * carrying a `code` field on failure: 'invalid-name', 'manifest-fetch',
         * 'manifest-parse', 'version-mismatch', 'script-load'.
         *
         * Behaviour:
         *   - Idempotent: if already loaded, resolves immediately.
         *   - In-flight dedup: concurrent calls share one Promise.
         *   - Checks manifest.sviewer.minVersion vs SViewer.version.
         *   - Adapter extensions: register on SViewer.adapters immediately and
         *     apply to subsequent ?geojson= fetches. Already-loaded layers are
         *     not retroactively re-parsed; caller must trigger refresh.
         *   - UI extensions: SViewer.onMapReady fires synchronously for late
         *     subscribers, so toolbar injection works without ceremony.
         *
         * Caveat: extensions written for boot-only initialisation (e.g.
         * 'superset', which listens to early postMessage frames) may miss
         * events fired before the load completes. Document this per extension.
         */
        loadExtension: function(name) {
            if (typeof name !== 'string' || !EXT_NAME_RE.test(name)) {
                var e = new Error('Invalid extension name: ' + name);
                e.code = 'invalid-name';
                return Promise.reject(e);
            }
            if (_loadedExts[name])  { return Promise.resolve(name); }
            if (_pendingExts[name]) { return _pendingExts[name]; }

            var extBase = baseUrl + 'ext/' + name + '/';
            var p = fetch(extBase + 'manifest.json')
                .then(function(r) {
                    if (!r.ok) {
                        var err = new Error('manifest fetch failed: ' + r.status);
                        err.code = 'manifest-fetch';
                        throw err;
                    }
                    return r.json().catch(function() {
                        var err = new Error('manifest parse failed');
                        err.code = 'manifest-parse';
                        throw err;
                    });
                })
                .then(function(manifest) {
                    var minVersion = manifest && manifest.sviewer && manifest.sviewer.minVersion;
                    if (minVersion && semverCmp(SVIEWER_VERSION, minVersion) < 0) {
                        var err = new Error('sViewer ' + SVIEWER_VERSION + ' < required ' + minVersion + ' for extension "' + name + '"');
                        err.code = 'version-mismatch';
                        throw err;
                    }
                    return loadResource(extBase + 'extension.js', 'js').catch(function() {
                        var err = new Error('script load failed for extension "' + name + '"');
                        err.code = 'script-load';
                        throw err;
                    });
                })
                .then(function() {
                    _loadedExts[name] = true;
                    delete _pendingExts[name];
                    return name;
                })
                .catch(function(err) {
                    delete _pendingExts[name];
                    throw err;
                });

            _pendingExts[name] = p;
            return p;
        },

        init: function(containerSelector, options) {
            options = options || {};
            config.container = containerSelector;

            console.info('sViewer ' + SVIEWER_VERSION + ' (' + SVIEWER_COMMIT + ')');
            console.log('SViewer: Initializing with options:', options);

            // Create container structure
            createContainer(containerSelector);

            // Store embed options for sviewer.js — applied on top of qs after customConfig.js loads
            window.SViewer.embedOptions = options;

            // Load all resources
            return loadDependencies()
                .then(insertShareModal)
                .then(loadI18nScript)
                .then(loadSViewerScript)
                .then(function() {
                    // SViewer.app instance is now available
                    if (window.SViewer.app) {
                        console.log('SViewer: Ready');
                        // Patch version footer with active extension names
                        var versionEl = document.querySelector('.sv-scope .mt-3.text-end');
                        if (versionEl) {
                            var extNames = (window.customConfig && window.customConfig.extensions) || [];
                            var extStr = extNames.length ? ' ' + extNames.join(', ') : '';
                            versionEl.innerHTML = '<a href="https://github.com/geobretagne/sviewer/" target="_blank" rel="noopener" aria-label="sViewer ' + SVIEWER_VERSION + ' sur GitHub (nouvel onglet)" style="color:inherit;text-decoration:none;">sViewer ' + SVIEWER_VERSION + '</a> <span style="font-family:monospace">' + SVIEWER_COMMIT + '</span>' + extStr;
                        }
                        return window.SViewer.app;
                    } else {
                        throw new Error('SViewer.app instance not found after loading');
                    }
                })
                .catch(function(error) {
                    console.error('SViewer: Failed to load:', error);
                });
        },

        // Public API methods
        getApp: function() {
            return window.SViewer.app;
        },

        getMap: function() {
            return window.SViewer.app ? window.SViewer.app.getMap() : null;
        },

        getView: function() {
            return window.SViewer.app ? window.SViewer.app.getView() : null;
        },

        // Canonical permalink for the current map — identical to what the share
        // panel produces. Extensions use this to store/share the exact URL.
        getPermalink: function() {
            return (window.SViewer.app && window.SViewer.app.getPermalink)
                ? window.SViewer.app.getPermalink() : null;
        },

        // Set the geojson URL baked into share/embed permalinks without rendering a layer.
        setGeojsonUrl: function(url) {
            if (window.SViewer.app && window.SViewer.app.setGeojsonUrl) {
                window.SViewer.app.setGeojsonUrl(url);
            }
        },

        // --- Embed SDK ---
        // Push a GeoJSON FeatureCollection into the map, replacing any existing vector layer.
        // geojson: GeoJSON FeatureCollection object (already parsed, not a URL).
        loadFeatures: function(geojson) {
            _svBus.emit('sv:loadFeatures', { geojson: geojson });
        },

        // Push pre-built OL Feature objects into the map (no reprojection).
        // features: OL Feature array in map projection (EPSG:3857).
        // options: { styleOverride: ol.style.StyleFunction, fitExtent: boolean }
        loadFeatureObjects: function(features, options) {
            _svBus.emit('sv:loadFeatureObjects', { features: features, options: options });
        },

        // Drive feature selection from outside — highlights feature with matching id property.
        // id: value of the feature's 'id' property (or null / undefined to clear selection).
        selectFeature: function(id) {
            _svBus.emit('sv:selectFeature', { id: id });
        },

        // Clear current feature selection.
        clearSelection: function() {
            _svBus.emit('sv:selectFeature', { id: null });
        },

        // Generic event subscription — preferred over named onX helpers.
        on: function(event, fn) { _svBus.on(event, fn); },
        off: function(event, fn) { _svBus.off(event, fn); },

        // Register callback fired once the OL map is ready.
        // fn({ map, view })
        // Fires immediately if map is already ready (late subscriber safe).
        // Guaranteed to fire exactly once per registration.
        onMapReady: function(fn) {
            if (_mapReadyPayload) { fn(_mapReadyPayload); return; }
            function once(payload) { _svBus.off('sv:mapReady', once); fn(payload); }
            _svBus.on('sv:mapReady', once);
        },

        // Register callback fired when user clicks a vector feature on the map.
        // fn({ feature, coordinate, properties })
        onFeatureClick: function(fn) { _svBus.on('sv:featureClick', fn); },
        offFeatureClick: function(fn) { _svBus.off('sv:featureClick', fn); },

        // Register callback fired when selection changes (click or selectFeature).
        // fn({ feature, properties }) — feature/properties null on deselect.
        onFeatureSelect: function(fn) { _svBus.on('sv:featureSelect', fn); },
        offFeatureSelect: function(fn) { _svBus.off('sv:featureSelect', fn); },

        // Register callback fired after loadFeatures completes and layer is on map.
        // fn({ features, count })
        onFeaturesLoaded: function(fn) { _svBus.on('sv:featuresLoaded', fn); },
        offFeaturesLoaded: function(fn) { _svBus.off('sv:featuresLoaded', fn); },

        // Fired when a ?geojson= or loadFeatures() call fails.
        // fn({ error, url }) — error is a string ('fetch-error', 'no-data', 'adapter-not-loaded', or HTTP status)
        onFeaturesError: function(fn) { _svBus.on('sv:featuresError', fn); },
        offFeaturesError: function(fn) { _svBus.off('sv:featuresError', fn); },

        // User-edited map title via share panel (not fired for programmatic setTitle calls).
        // fn({ title })
        onTitleChange: function(fn) { _svBus.on('sv:titleChange', fn); },
        offTitleChange: function(fn) { _svBus.off('sv:titleChange', fn); },

        // Switch background preset by index (0-based). No-op if map not ready.
        switchBackground: function(idx) {
            if (window.SViewer.app && window.SViewer.app.switchBackground) {
                window.SViewer.app.switchBackground(idx);
            }
        },

        // Trigger vector layer redraw (style function re-evaluated per feature).
        refreshVector: function() {
            if (window.SViewer.app && window.SViewer.app.refreshVector) {
                window.SViewer.app.refreshVector();
            }
        },

        // Register a raw map click handler — receives OL MapBrowserEvent.
        // Return truthy to suppress sViewer built-in click handling for that click.
        // Safe to call before map ready — queued and applied on sv:mapReady.
        addClickHandler: function(fn) {
            if (typeof fn !== 'function') { return; }
            if (window.SViewer.app && window.SViewer.app.addClickHandler) {
                window.SViewer.app.addClickHandler(fn);
            } else {
                _clickHandlerQueue.push(fn);
            }
        },
        removeClickHandler: function(fn) {
            // Remove from queue if not yet applied.
            _clickHandlerQueue = _clickHandlerQueue.filter(function(h) { return h !== fn; });
            if (window.SViewer.app && window.SViewer.app.removeClickHandler) {
                window.SViewer.app.removeClickHandler(fn);
            }
        },

        // Open / update / close an extension sidepanel.
        panel: {
            open: function(name, title, html, opts) {
                if (window.SViewer.app && window.SViewer.app.panel) { window.SViewer.app.panel.open(name, title, html, opts); }
            },
            close: function() {
                if (window.SViewer.app && window.SViewer.app.panel) { window.SViewer.app.panel.close(); }
            },
            onClose: function(name, fn) {
                if (window.SViewer.app && window.SViewer.app.panel) { window.SViewer.app.panel.onClose(name, fn); }
            },
            update: function(name, html) {
                if (window.SViewer.app && window.SViewer.app.panel) { window.SViewer.app.panel.update(name, html); }
            }
        },

        // Register a data adapter for the ?geojson= fetch pipeline.
        // name    : unique key (string) — matches ?_format= hint
        // adapter : { match(url), convert(response, url), wantsText }
        // Safe to call before map ready and at extension module scope.
        // Replaces direct window.SViewer.adapters[key] = ... assignment.
        registerAdapter: function(name, adapter) {
            if (typeof name !== 'string' || !name) {
                console.warn('SViewer.registerAdapter: name must be a non-empty string');
                return;
            }
            if (!adapter || typeof adapter.convert !== 'function') {
                console.warn('SViewer.registerAdapter: adapter must have a convert() function (name=' + name + ')');
                return;
            }
            _adapterRegistry[name] = adapter;
        },

        // Read-only view of the adapter registry — sviewer.js reads this.
        adapters: _adapterRegistry
    };

    console.log('SViewer: Embed script loaded');
})();
