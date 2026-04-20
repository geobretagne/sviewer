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

        // Load CSS in parallel immediately, JS in sequence for dependencies
        var cssPromises = [
            loadResource(baseUrl + 'build/ol.css', 'css'),
            loadResource(baseUrl + 'lib/bootstrap/bootstrap-scoped.min.css', 'css'),
            loadResource(baseUrl + 'lib/bootstrap-icons/bootstrap-icons.min.css', 'css'),
            loadResource(baseUrl + 'css/sviewer.css', 'css')
        ];

        // Load JS in sequence: jQuery → proj4 → OL.js → Bootstrap.js → customConfig.js
        return loadResource(baseUrl + 'lib/jquery/jquery-1.12.4.min.js', 'js')
            .then(function() { return loadResource(baseUrl + 'build/proj4.js', 'js'); })
            .then(function() { return loadResource(baseUrl + 'build/ol.js', 'js'); })
            .then(function() { return loadResource(baseUrl + 'lib/bootstrap/bootstrap.bundle.min.js', 'js'); })
            .then(function() { return loadResource(baseUrl + 'etc/customConfig.js', 'js'); })
            .then(function() { return Promise.all(cssPromises); });
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

        // Set container styles to enable flexbox layout
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.height = '100%';
        container.style.minHeight = '0';
        container.className = 'sv-scope';

        // Add sviewer HTML structure
        container.innerHTML = `
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
                    <button id="zeBt" type="button" accesskey="w" class="i18n btn btn-dark sv-map-btn" title="initial view" aria-label="Reset to initial view">
                        <i class="bi bi-house" aria-hidden="true"></i>
                    </button>
                    <button id="ziBt" type="button" accesskey="+" class="i18n btn btn-dark sv-map-btn" title="zoom +" aria-label="Zoom in">
                        <i class="bi bi-zoom-in" aria-hidden="true"></i>
                    </button>
                    <button id="zoBt" type="button" accesskey="-" class="i18n btn btn-dark sv-map-btn" title="zoom -" aria-label="Zoom out">
                        <i class="bi bi-zoom-out" aria-hidden="true"></i>
                    </button>
                    <button id="bgBt" type="button" accesskey="b" class="i18n btn btn-dark sv-map-btn" title="background" aria-label="Change background layer">
                        <i class="bi bi-layers" aria-hidden="true"></i>
                    </button>
                    <button id="zpBt" type="button" accesskey="g" class="i18n btn btn-dark sv-map-btn" title="Where am I ?" aria-label="Locate my position">
                        <i class="bi bi-geo-alt" aria-hidden="true"></i>
                    </button>
                </div>

                <div id="panelcontrols" class="sv-map-panels" role="group" aria-label="Side panels">
                    <button type="button" accesskey="m" id="panelShareBtn" class="i18n btn btn-dark sv-map-btn sv-panel-toggle" data-panel="share" title="Map" aria-label="Map panel" aria-pressed="false">
                        <span id="panelShareBtnTitle">Map</span><span class="d-none">&nbsp;</span>
                        <i class="bi bi-share-fill" aria-hidden="true"></i>
                    </button>
                    <button type="button" accesskey="i" id="panelInfoBtn" class="i18n btn btn-dark sv-map-btn sv-panel-toggle" data-panel="legend" title="Legend" aria-label="Legend panel" aria-pressed="false">
                        <i class="bi bi-list" aria-hidden="true"></i>
                    </button>
                    <button type="button" accesskey="q" id="panelQueryBtn" class="i18n btn btn-dark sv-map-btn sv-panel-toggle" data-panel="query" title="Query" aria-label="Query panel" aria-pressed="false">
                        <i class="bi bi-question-circle" aria-hidden="true"></i>
                    </button>
                    <button type="button" accesskey="l" id="panelLocateBtn" class="i18n btn btn-dark sv-map-btn sv-panel-toggle" data-panel="locate" title="Locate" aria-label="Locate panel" aria-pressed="false">
                        <i class="bi bi-search" aria-hidden="true"></i>
                    </button>
                </div>

                <div id="sidepanel" class="sv-sidepanel" role="complementary" aria-label="Information panel">
                    <button type="button" class="sv-sidepanel-close" aria-label="Close panel">&times;</button>
                    <div id="sharePanel" class="sv-panel-section" data-section="share" aria-label="Map sharing panel" style="display: none;">
                        <div class="sv-panel-content">
                            <div class="mb-3">
                                <label for="shareSetTitle" class="form-label i18n">Edit title</label>
                                <input type="text" name="setTitle" id="shareSetTitle" class="form-control" value="" placeholder="Edit title">
                            </div>
                            <div class="sv-share-grid">
                                <a id="permalink" class="i18n btn btn-secondary" data-ajax="false" href="#" title="Link to this map">
                                    <i class="bi bi-link" aria-hidden="true"></i>
                                    Link
                                </a>
                                <button type="button" id="qrcodeBtn" class="i18n btn btn-secondary" title="QR code">
                                    <i class="bi bi-qr-code" aria-hidden="true"></i>
                                    QR
                                </button>
                                <button type="button" class="webcomponent-btn btn btn-info" title="Get embed code">
                                    <i class="bi bi-code" aria-hidden="true"></i>
                                    HTML
                                </button>
                            </div>
                        </div>
                    </div>

                    <div id="legendPanel" class="sv-panel-section" data-section="legend" aria-label="Map legend" style="display: none;">
                        <label class="form-label i18n">Legend</label>
                        <div id="legend" class="sv-legend sv-panel-content"></div>
                    </div>

                    <div id="queryPanel" class="sv-panel-section" data-section="query" aria-label="Map query results" style="display: none;">
                        <div class="sv-panel-content">
                            <label class="form-label i18n">Query the map</label>
                            <div id="queryContent" class="sv-panel-content" role="status" aria-live="polite"></div>
                        </div>
                    </div>

                    <div id="locatePanel" class="sv-panel-section" data-section="locate" aria-label="Location search panel" style="display: none;">
                        <div class="sv-panel-content">
                            <form id="addressForm" method="post" action="#">
                                <div class="mb-3">
                                    <label for="searchInput" class="form-label i18n">Search place</label>
                                    <input type="text" name="searchInput" id="searchInput" class="form-control i18n" value="" title="Search place" placeholder="ex: 10 rue Maurice Fabre, Rennes" autocomplete="off">
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

            <div id="panelSLDModal" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="sldModalTitle" inert>
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 class="modal-title i18n" id="sldModalTitle">Parameters</h3>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="SLDsliders"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="qrcodeModal" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="qrcodeModalTitle" inert>
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body text-center">
                            <div id="qrcodeDisplay"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="webcomponentModal" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="webcomponentModalTitle" inert>
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p style="font-size: 0.9em; color: #666;">Copy and paste this code into your HTML page to embed this map:</p>
                            <div style="position: relative;">
                                <textarea id="embedCodeTextarea" class="form-control" rows="8" readonly style="font-family: monospace; font-size: 0.85em;"></textarea>
                                <button type="button" id="embedCodeCopyBtn" class="btn btn-sm btn-primary" style="position: absolute; top: 5px; right: 5px;">
                                    <i class="bi bi-clipboard" aria-hidden="true"></i> Copy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

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

            // Apply custom config BEFORE loading scripts
            window.customConfig = window.customConfig || {};
            if (options.geOrchestraBaseUrl) {
                window.customConfig.geOrchestraBaseUrl = options.geOrchestraBaseUrl;
            }
            // Merge any other options into customConfig
            Object.keys(options).forEach(function(key) {
                if (key !== 'geOrchestraBaseUrl') {
                    window.customConfig[key] = options[key];
                }
            });

            // Load all resources
            return loadDependencies()
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
