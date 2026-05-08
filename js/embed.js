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

    var SVIEWER_VERSION='0.9.1';
    var SVIEWER_COMMIT='9328038';

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

    var SV_SHELL_HTML = `
        <div id="sv-spinner" class="sv-spinner">
            <div class="spinner-border text-light" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>

        <a href="#sv-map" class="sv-skip-to-content i18n" data-i18n="btn.skip_to_map">Skip to map</a>

        <div id="sv-frame-map" class="sv-framemap">
            <div id="sv-map" class="sv-map" tabindex="0" role="region" aria-label="Interactive map">
                <div id="sv-marker"></div>
                <div id="sv-loading-bar" class="sv-loading-bar" aria-hidden="true" style="display:none;"></div>
            </div>

            <div id="sv-skill-toolbar" class="sv-map-controls" role="group" aria-label="Skill controls"></div>

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
                <button type="button" accesskey="m" id="sv-btn-panel-share" class="i18n btn btn-dark sv-map-btn sv-panel-toggle" data-sv-panel="share" title="Map" data-i18n-title="btn.panel_map" aria-label="Map panel" aria-pressed="false">
                    <span id="sv-panel-share-title">Map</span><span class="d-none">&nbsp;</span>
                    <i class="bi bi-gear" aria-hidden="true"></i>
                </button>
                <button type="button" accesskey="i" id="sv-btn-panel-legend" class="i18n btn btn-dark sv-map-btn sv-panel-toggle" data-sv-panel="legend" title="Legend" data-i18n-title="btn.panel_legend" aria-label="Legend panel" aria-pressed="false">
                    <i class="bi bi-info-square" aria-hidden="true"></i>
                </button>
                <button type="button" accesskey="q" id="sv-btn-panel-query" class="i18n btn btn-dark sv-map-btn sv-panel-toggle" data-sv-panel="query" title="Query" data-i18n-title="btn.panel_query" aria-label="Query panel" aria-pressed="false">
                    <i class="bi bi-geo-fill" aria-hidden="true"></i>
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
    window.SViewerBaseUrl = baseUrl;
    window.SViewerEmbedded = true;

    var config = {
        baseUrl: baseUrl,
        container: null,
        instance: null
    };

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

        // jQuery and proj4 are independent — load in parallel, then OL after both
        return Promise.all([
            loadResource(baseUrl + 'static/lib/jquery/jquery-4.0.0.min.js', 'js'),
            loadResource(baseUrl + 'static/lib/ol/proj4.js', 'js')
        ])
            .then(function() { return loadResource(baseUrl + 'static/lib/ol/ol.js', 'js'); })
            .then(function() {
                var qs = new URLSearchParams(window.location.search);
                var c = qs.get('c');
                var cfgFile = (c && /^[A-Za-z0-9_-]+$/.test(c))
                    ? 'local/customConfig_' + c + '.js'
                    : 'local/customConfig.js';
                return loadResource(baseUrl + cfgFile, 'js').catch(function() {});
            })
            .then(function() {
                var adapterPromises = ((window.customConfig && window.customConfig.adapters) || [])
                    .map(function(name) { return loadResource(baseUrl + 'skill/' + name + '/adapter.js', 'js'); });
                return Promise.all([
                    Promise.all(adapterPromises),
                    loadResource(baseUrl + 'static/lib/mustache/mustache.min.js', 'js'),
                    Promise.all(cssPromises),
                    bootstrapPromise,
                    loadTemplates(baseUrl)
                ]);
            });
    }

    // Fetch all Mustache templates and store them in window.SViewerTemplates
    function loadTemplates(baseUrl) {
        var names = ['sv-layer-panel', 'sv-iso-table', 'sv-query-header', 'sv-search-item', 'sv-search-header', 'sv-share-modal'];
        window.SViewerTemplates = {};
        return Promise.all(names.map(function(name) {
            return fetch(baseUrl + 'static/templates/' + name + '.html')
                .then(function(r) { return r.text(); })
                .then(function(t) { window.SViewerTemplates[name] = t; });
        }));
    }

    // Insert share modal from template into the DOM
    function insertShareModal() {
        return new Promise(function(resolve) {
            // Wait for templates to be loaded
            if (window.SViewerTemplates && window.SViewerTemplates['sv-share-modal']) {
                var scope = document.querySelector('.sv-scope');
                if (scope) {
                    var tempDiv = document.createElement('div');
                    tempDiv.innerHTML = window.SViewerTemplates['sv-share-modal'];
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
        if (!window.SViewerHardConfig) {
            window.SViewerHardConfig = window.customConfig || {};
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
        init: function(containerSelector, options) {
            options = options || {};
            config.container = containerSelector;

            console.info('sViewer ' + SVIEWER_VERSION + ' (' + SVIEWER_COMMIT + ')');
            console.log('SViewer: Initializing with options:', options);

            // Create container structure
            createContainer(containerSelector);

            // Store embed options for sviewer.js — applied on top of qs after customConfig.js loads
            window._svEmbedOptions = options;

            // Load all resources
            return loadDependencies()
                .then(insertShareModal)
                .then(loadI18nScript)
                .then(loadSViewerScript)
                .then(function() {
                    // SViewerApp instance is now available
                    if (window.SViewerApp) {
                        console.log('SViewer: Ready');
                        // Patch version footer with active adapter names
                        var versionEl = document.querySelector('.sv-scope .mt-3.text-end');
                        if (versionEl) {
                            var adapterNames = (window.customConfig && window.customConfig.adapters) || [];
                            var adapterStr = adapterNames.length ? ' ' + adapterNames.join(', ') : '';
                            versionEl.innerHTML = '<a href="https://github.com/geobretagne/sviewer/" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;">sViewer ' + SVIEWER_VERSION + '</a> <span style="font-family:monospace">' + SVIEWER_COMMIT + '</span>' + adapterStr;
                        }
                        // Load skills after map ready — each skill wraps init in SViewer.onReady()
                        var skillNames = (window.customConfig && window.customConfig.skills) || [];
                        skillNames.forEach(function(name) {
                            loadResource(baseUrl + 'skill/' + name + '/skill.js', 'js')
                                .catch(function(e) { console.warn('SViewer: skill ' + name + ' failed to load', e); });
                        });
                        return window.SViewerApp;
                    } else {
                        throw new Error('SViewerApp instance not found after loading');
                    }
                })
                .catch(function(error) {
                    console.error('SViewer: Failed to load:', error);
                });
        },

        // Public API methods
        getApp: function() {
            return window.SViewerApp;
        },

        getMap: function() {
            return window.SViewerApp ? window.SViewerApp.getMap() : null;
        },

        getView: function() {
            return window.SViewerApp ? window.SViewerApp.getView() : null;
        },

        // Set the geojson URL baked into share/embed permalinks without rendering a layer.
        setGeojsonUrl: function(url) {
            if (window.SViewerApp && window.SViewerApp.setGeojsonUrl) {
                window.SViewerApp.setGeojsonUrl(url);
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
        onMapReady: function(fn) { _svBus.on('sv:mapReady', fn); },

        // Register callback fired when user clicks a vector feature on the map.
        // fn({ feature, coordinate, properties })
        onFeatureClick: function(fn) { _svBus.on('sv:featureClick', fn); },

        // Register callback fired when selection changes (click or selectFeature).
        // fn({ feature, properties }) — feature/properties null on deselect.
        onFeatureSelect: function(fn) { _svBus.on('sv:featureSelect', fn); },

        // Register callback fired after loadFeatures completes and layer is on map.
        // fn({ features, count })
        onFeaturesLoaded: function(fn) { _svBus.on('sv:featuresLoaded', fn); },

        // Switch background preset by index (0-based). No-op if map not ready.
        switchBackground: function(idx) {
            if (window.SViewerApp && window.SViewerApp.switchBackground) {
                window.SViewerApp.switchBackground(idx);
            }
        },

        // Trigger vector layer redraw (style function re-evaluated per feature).
        refreshVector: function() {
            if (window.SViewerApp && window.SViewerApp.refreshVector) {
                window.SViewerApp.refreshVector();
            }
        }
    };

    console.log('SViewer: Embed script loaded');
})();
