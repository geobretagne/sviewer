/**
 * SViewer Embed Script
 *
 * Usage in host page:
 * <div id="sviewer-container"></div>
 * <script src="https://example.com/sviewer/js/embed.js"></script>
 * <script>
 *   SViewer.init('#sviewer-container', { center: [2.3, 48.8], zoom: 12 });
 * </script>
 */

(function() {

    var SV_SHELL_HTML = `
        <div id="svSpinner" class="sv-spinner">
            <div class="spinner-border text-light" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>

        <div id="frameMap" class="sv-framemap">
            <div id="map" class="sv-map" tabindex="0" role="region" aria-label="Interactive map">
                <div id="marker"></div>
            </div>

            <div id="mapcontrols" class="sv-map-controls" role="group" aria-label="Map controls">
                <button id="zeBt" type="button" accesskey="w" class="i18n btn btn-dark sv-map-btn" title="initial view" data-i18n-title="btn.initial_view" aria-label="Reset to initial view">
                    <i class="bi bi-house" aria-hidden="true"></i>
                </button>
                <button id="ziBt" type="button" accesskey="+" class="i18n btn btn-dark sv-map-btn" title="zoom +" data-i18n-title="btn.zoom_in" aria-label="Zoom in">
                    <i class="bi bi-zoom-in" aria-hidden="true"></i>
                </button>
                <button id="zoBt" type="button" accesskey="-" class="i18n btn btn-dark sv-map-btn" title="zoom -" data-i18n-title="btn.zoom_out" aria-label="Zoom out">
                    <i class="bi bi-zoom-out" aria-hidden="true"></i>
                </button>
                <button id="bgBt" type="button" accesskey="b" class="i18n btn btn-dark sv-map-btn" title="background" data-i18n-title="btn.background" aria-label="Change background layer">
                    <i class="bi bi-map" aria-hidden="true"></i>
                </button>
                <button id="zpBt" type="button" accesskey="g" class="i18n btn btn-dark sv-map-btn" title="Where am I ?" data-i18n-title="btn.where_am_i" aria-label="Locate my position">
                    <i class="bi bi-crosshair" aria-hidden="true"></i>
                </button>
            </div>

            <div id="panelcontrols" class="sv-map-panels" role="group" aria-label="Side panels">
                <button type="button" accesskey="m" id="panelShareBtn" class="i18n btn btn-dark sv-map-btn sv-panel-toggle" data-panel="share" title="Map" data-i18n-title="btn.panel_map" aria-label="Map panel" aria-pressed="false">
                    <span id="panelShareBtnTitle">Map</span><span class="d-none">&nbsp;</span>
                    <i class="bi bi-gear" aria-hidden="true"></i>
                </button>
                <button type="button" accesskey="i" id="panelInfoBtn" class="i18n btn btn-dark sv-map-btn sv-panel-toggle" data-panel="legend" title="Legend" data-i18n-title="btn.panel_legend" aria-label="Legend panel" aria-pressed="false">
                    <i class="bi bi-info-square" aria-hidden="true"></i>
                </button>
                <button type="button" accesskey="q" id="panelQueryBtn" class="i18n btn btn-dark sv-map-btn sv-panel-toggle" data-panel="query" title="Query" data-i18n-title="btn.panel_query" aria-label="Query panel" aria-pressed="false">
                    <i class="bi bi-geo-fill" aria-hidden="true"></i>
                </button>
                <button type="button" accesskey="l" id="panelLocateBtn" class="i18n btn btn-dark sv-map-btn sv-panel-toggle" data-panel="locate" title="Locate" data-i18n-title="btn.panel_locate" aria-label="Locate panel" aria-pressed="false">
                    <i class="bi bi-search" aria-hidden="true"></i>
                </button>
            </div>

            <div id="sidepanel" class="sv-sidepanel" role="complementary" aria-label="Information panel">
                <div id="sharePanel" class="sv-panel-section" data-section="share" aria-label="Map sharing panel" style="display: none;">
                    <div class="sv-panel-header">
                        <h3 class="sv-panel-title i18n" data-i18n="panel.config.title">Configuration</h3>
                        <button type="button" class="sv-sidepanel-close" aria-label="Close panel">
                            <i class="bi bi-x-lg" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div class="sv-panel-content">
                        <div class="mb-3">
                            <label for="shareSetTitle" class="form-label i18n" data-i18n="lbl.edit_title">Edit title</label>
                            <input type="text" name="setTitle" id="shareSetTitle" class="form-control" value="" placeholder="Edit title">
                        </div>
                        <div class="mb-3">
                            <label class="form-label i18n" data-i18n="lbl.choose_appearance">Choose appearance</label>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="themeSwitch" role="switch" aria-checked="false">
                                <label class="form-check-label i18n" for="themeSwitch" data-i18n="lbl.dark_theme">Dark theme</label>
                            </div>
                        </div>
                        <label class="form-label i18n" data-i18n="lbl.reuse_map">Reuse this map</label>
                        <div class="sv-share-grid">
                            <button type="button" id="permalinkBtn" class="i18n btn btn-secondary" title="Link to this map" data-i18n-title="btn.permalink">
                                <i class="bi bi-link" aria-hidden="true"></i>
                                Link
                            </button>
                            <button type="button" class="webcomponent-btn btn btn-info" title="Get embed code">
                                <i class="bi bi-code" aria-hidden="true"></i>
                                HTML
                            </button>
                        </div>
                    </div>
                </div>

                <div id="legendPanel" class="sv-panel-section" data-section="legend" aria-label="Map legend" style="display: none;">
                    <div class="sv-panel-header">
                        <h3 class="sv-panel-title i18n" data-i18n="panel.legend.title">Documentation</h3>
                        <button type="button" class="sv-sidepanel-close" aria-label="Close panel">
                            <i class="bi bi-x-lg" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div id="legend" class="sv-legend sv-panel-content"></div>
                </div>

                <div id="queryPanel" class="sv-panel-section" data-section="query" aria-label="Map query results" style="display: none;">
                    <div class="sv-panel-header">
                        <h3 class="sv-panel-title i18n" data-i18n="panel.query.title">Query results</h3>
                        <button type="button" class="sv-sidepanel-close" aria-label="Close panel">
                            <i class="bi bi-x-lg" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div class="sv-panel-content">
                        <label class="form-label i18n" data-i18n="lbl.query_the_map">Query the map</label>
                        <div id="queryContent" class="sv-panel-content" role="status" aria-live="polite"></div>
                    </div>
                </div>

                <div id="locatePanel" class="sv-panel-section" data-section="locate" aria-label="Location search panel" style="display: none;">
                    <div class="sv-panel-header">
                        <h3 class="sv-panel-title i18n" data-i18n="panel.locate.title">Location</h3>
                        <button type="button" class="sv-sidepanel-close" aria-label="Close panel">
                            <i class="bi bi-x-lg" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div class="sv-panel-content">
                        <form id="addressForm" method="post" action="#">
                            <div class="mb-3">
                                <label for="searchInput" class="form-label i18n" data-i18n="lbl.search_place">Search place</label>
                                <input type="text" name="searchInput" id="searchInput" class="form-control i18n" value="" title="Search place" data-i18n-title="lbl.search_place" placeholder="ex: 10 rue Maurice Fabre, Rennes" data-i18n-placeholder="inp.search_placeholder" autocomplete="off">
                            </div>
                        </form>
                        <div>
                            <ul id="searchResults" class="list-group" role="listbox" aria-label="Search results"></ul>
                        </div>
                        <div id="locateMsg" role="status" aria-live="polite" class="mb-3"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- share-modal will be inserted here by JavaScript -->

        <div id="webcomponentModal" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="webcomponentModalTitle" inert>
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title i18n" id="webcomponentModalTitle" data-i18n="panel.embed_modal.title">Embed in a page</h3>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="sv-embed-hint">Copy and paste this code into your HTML page to embed this map:</p>
                        <textarea id="embedCodeTextarea" class="form-control" rows="8" readonly style="font-family: monospace; font-size: 0.85em;"></textarea>
                        <div class="d-flex justify-content-end mt-2">
                            <button type="button" id="embedCodeCopyBtn" class="btn btn-secondary btn-sm">
                                <i class="bi bi-clipboard" aria-hidden="true"></i> Copy
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Base URL detection - find this script's src
    var scriptSrc = '';
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src && scripts[i].src.indexOf('embed.js') !== -1) {
            scriptSrc = scripts[i].src;
            break;
        }
    }
    var baseUrl = scriptSrc.replace(/js\/embed\.js.*$/, '');
    window.SViewerBaseUrl = baseUrl;

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
            loadResource(baseUrl + 'build/ol.css', 'css'),
            loadResource(baseUrl + 'lib/bootstrap/bootstrap-scoped.min.css', 'css'),
            loadResource(baseUrl + 'lib/bootstrap-icons/bootstrap-icons.min.css', 'css'),
            loadResource(baseUrl + 'css/sviewer.css', 'css')
        ];
        Promise.all(cssPromises).then(function() {
            if (container) container.style.visibility = 'visible';
        });

        // Bootstrap is only needed for modals — load in parallel, not blocking the map init chain
        var bootstrapPromise = loadResource(baseUrl + 'lib/bootstrap/bootstrap.bundle.min.js', 'js');

        // Load JS in sequence: jQuery → proj4 → OL.js → customConfig.js → Mustache
        return loadResource(baseUrl + 'lib/jquery/jquery-4.0.0.min.js', 'js')
            .then(function() { return loadResource(baseUrl + 'build/proj4.js', 'js'); })
            .then(function() { return loadResource(baseUrl + 'build/ol-new.js', 'js'); })
            .then(function() { return loadResource(baseUrl + 'etc/customConfig.js', 'js'); })
            .then(function() { return loadResource(baseUrl + 'lib/mustache/mustache.min.js', 'js'); })
            .then(function() { return Promise.all([Promise.all(cssPromises), bootstrapPromise, loadTemplates(baseUrl)]); });
    }

    // Fetch all Mustache templates and store them in window.svTemplates
    function loadTemplates(baseUrl) {
        var names = ['layer-panel', 'iso-table', 'query-header', 'search-item', 'search-header', 'share-modal'];
        window.svTemplates = {};
        return Promise.all(names.map(function(name) {
            return fetch(baseUrl + 'templates/' + name + '.html')
                .then(function(r) { return r.text(); })
                .then(function(t) { window.svTemplates[name] = t; });
        }));
    }

    // Insert share modal from template into the DOM
    function insertShareModal() {
        return new Promise(function(resolve) {
            // Wait for templates to be loaded
            if (window.svTemplates && window.svTemplates['share-modal']) {
                var container = document.querySelector('.sv-framemap');
                if (container) {
                    var modal = document.createElement('div');
                    modal.id = 'permalinkModal';
                    modal.innerHTML = window.svTemplates['share-modal'];
                    container.parentElement.appendChild(modal);
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
        if (!window.hardConfig) {
            window.hardConfig = window.customConfig || {};
        }
        return new Promise(function(resolve, reject) {
            var script = document.createElement('script');
            script.src = config.baseUrl + 'etc/i18n.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Load sviewer.js (must be after i18n.js for hardConfig.i18n)
    function loadSViewerScript() {
        return new Promise(function(resolve, reject) {
            var script = document.createElement('script');
            script.src = config.baseUrl + 'js/sviewer.js';
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
        init: function(containerSelector, options) {
            options = options || {};
            config.container = containerSelector;

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
        }
    };

    console.log('SViewer: Embed script loaded');
})();
