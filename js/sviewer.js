/*globals $:false, ol:false, proj4:false*/

// Isolated SViewer instance - encapsulates all state and DOM interactions
window.SViewerApp = (function() {
    // Projection: EPSG:3857 (Web Mercator)
    proj4.defs([
        ["EPSG:4326", "+title=WGS 84, +proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs"],
        ["EPSG:3857", "+title=Web Spherical Mercator, +proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs"]
    ]);
    ol.proj.proj4.register(proj4);

    var config = {};
    var state = {};
    var customConfig = window.customConfig || {};

    // Ensure hardConfig exists (created by embed.js before i18n.js loaded)
    window.hardConfig = window.hardConfig || {};

    // Merge default values while preserving i18n and customConfig properties
    $.extend(window.hardConfig, {
        title: 'sViewer',
        geOrchestraBaseUrl: 'https://geobretagne.fr/',
        projcode: 'EPSG:3857',
        initialExtent: [-12880000,-1080000,5890000,7540000],
        maxExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
        restrictedExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
        maxFeatures: 10,
        maxGeocodeResults: 5,
        maxWfsSearchFeatures: 8,
        nodata: '<!--nodatadetect-->\n<!--nodatadetect-->',
        openLSGeocodeUrl: "https://data.geopf.fr/geocodage/search",
        layersBackground: [
            new ol.layer.Tile({
                  source: new ol.source.OSM()
            })
        ]
    });

    // Merge customConfig (loaded from etc/customConfig.js) to override defaults
    $.extend(window.hardConfig, window.customConfig || {});

    var hardConfig = window.hardConfig;

    // Spinner for the impatients
    var svSpinner = {
        show: function() {
            $('#svSpinner').addClass('show');
        },
        hide: function() {
            $('#svSpinner').removeClass('show');
        }
    };

    // Toggle inert on modal show/hide so focus is never trapped behind
    // an inert/aria-hidden ancestor (WCAG a11y requirement).
    function bindModalInert(modalEl) {
        if (modalEl.dataset.svInertBound) return;
        modalEl.dataset.svInertBound = '1';
        modalEl.addEventListener('show.bs.modal', function() {
            modalEl.removeAttribute('inert');
        });
        modalEl.addEventListener('hidden.bs.modal', function() {
            modalEl.setAttribute('inert', '');
        });
    }

    var svModal = {
        _el: function(id) { return document.getElementById(id.replace(/^#/, '') + 'Modal'); },
        open: function(id) {
            var modalEl = this._el(id);
            if (modalEl) {
                bindModalInert(modalEl);
                new bootstrap.Modal(modalEl).show();
            }
        },
        close: function(id) {
            var modalEl = this._el(id);
            if (modalEl) {
                var m = bootstrap.Modal.getInstance(modalEl);
                if (m) m.hide();
            }
        }
    };

    var qrcodeLoaded = false;
    function loadQRCodeLibrary() {
        if (qrcodeLoaded || typeof QRCode !== 'undefined') {
            qrcodeLoaded = true;
            return Promise.resolve();
        }
        return new Promise(function(resolve, reject) {
            var script = document.createElement('script');
            script.src = (window.SViewerBaseUrl || '') + 'lib/qrcode/qrcode.min.js';
            script.async = true;
            script.onload = function() {
                qrcodeLoaded = true;
                log('QR code library loaded successfully');
                resolve();
            };
            script.onerror = function() {
                console.error('Failed to load QR code library from:', script.src);
                reject(new Error('Failed to load QR code library'));
            };
            document.head.appendChild(script);
        });
    }

    function SViewer() {
    var map;
    var view;
    var marker;

    // ----- pseudoclasses ------------------------------------------------------------------------------------

    /**
     * LayerQueryable is an enhanced ol.layer.wms
     * @constructor
     * @param {Object} options or qs layer param (string)
     */
    function LayerQueryable(options) {
        this.options = {
            nslayername: '',
            layername: '',
            namespace: '',
            stylename: '',
            cql_filter: '',
            wmsurl_global: '',
            wmsurl_ns: '',
            wmsurl_layer: '',
            sldurl: null,
            format: 'image/png',
            opacity: 1
        };
        this.md = {
            title: '',
            abstract: ''
        };
        this.wfs = {
            url: null,
            typeName: null,
            fields: [],
            geomField: null
        };
        this.wmslayer = null;

        // to allow usage of this. in jquery statements
        var self = this;

        /**
         * Parses a wms layer descriptor, query the legend, returns the wms layer
         * @param {String} s the querystring describing the layer
         */
        function parseLayerParam (s) {
            var customWmsUrl = '';
            var layerPart = s;

            // Extract custom WMS endpoint if present (format: layer@wms-url)
            // Use lastIndexOf to handle '@' in URLs (e.g., https://user@host/wms)
            var atIndex = s.lastIndexOf('@');
            if (atIndex > 0) {
                layerPart = s.substring(0, atIndex);
                customWmsUrl = s.substring(atIndex + 1);
                log('Custom WMS URL detected:', customWmsUrl);
            }

            self.options.nslayername = layerPart.split('*')[0]; // namespace:layername
            self.options.stylename = (layerPart.indexOf("*")>0) ? layerPart.split('*',2)[1]:''; // stylename
            self.options.cql_filter = (layerPart.indexOf("*")>1) ? layerPart.split('*',3)[2]:''; // qcl_filter

            self.options.namespace = (self.options.nslayername.indexOf(":")>0) ? self.options.nslayername.split(':',2)[0]:''; // namespace
            self.options.layername = (self.options.nslayername.indexOf(':')>0) ? self.options.nslayername.split(':',2)[1]:''; // layername

            if (customWmsUrl) {
                // Use custom WMS endpoint
                self.options.wmsurl_global = customWmsUrl;
                self.options.wmsurl_ns = customWmsUrl;
                self.options.wmsurl_layer = customWmsUrl;
            } else {
                // Use default geOrchestra endpoints
                var ns = encodeURIComponent(self.options.namespace);
                var ln = encodeURIComponent(self.options.layername);
                self.options.wmsurl_global = hardConfig.geOrchestraBaseUrl + '/geoserver/wms'; // global getcap
                self.options.wmsurl_ns = hardConfig.geOrchestraBaseUrl + '/geoserver/' + ns + '/wms'; // virtual getcap namespace
                self.options.wmsurl_layer = hardConfig.geOrchestraBaseUrl + '/geoserver/' + ns + '/' + ln + '/wms'; // virtual getcap layer
            }

            log('LayerParam parse:', {
                input: s,
                nslayername: self.options.nslayername,
                namespace: self.options.namespace,
                layername: self.options.layername,
                customWmsUrl: customWmsUrl,
                wmsurl_layer: self.options.wmsurl_layer
            });

            if (!self.options.namespace || !self.options.layername) {
                console.warn('Layer parameter format error: expected "namespace:layername[*style][*cql_filter][@wms-endpoint]" format, got "' + s + '"');
            }
        }

        /**
         * Creates the ol3 WMS layer
         */
        function createLayer() {
            var wms_params = {
                'url': self.options.wmsurl_ns,
                params: {
                    'LAYERS': self.options.layername,
                    'FORMAT': self.options.format,
                    'TRANSPARENT': true,
                    'STYLES': self.options.stylename
                },
                extent: config.maxExtent
            };
            if (self.options.cql_filter) {
                wms_params.params.CQL_FILTER = self.options.cql_filter;
            }
            if (self.options.sldurl) {
                wms_params.params.SLD = self.options.sldurl;
            }
            self.wmslayer = new ol.layer.Tile({
                opacity: isNaN(self.options.opacity)?1:self.options.opacity,
                source: new ol.source.TileWMS(wms_params)
            });
        }

        /**
         * Queries the layer capabilities to display its legend and metadata
         */
        function getMetadata(self) {
            var parser = new ol.format.WMSCapabilities();
            var capabilitiesUrl = ajaxURL(self.options.wmsurl_layer + '?' + $.param({
                SERVICE: 'WMS',
                REQUEST: 'GetCapabilities'
            }));
            log('Loading capabilities from:', capabilitiesUrl, 'for layer:', self.options.nslayername);

            $.ajax({
                url: capabilitiesUrl,
                type: 'GET',
                dataType: 'xml',
                success: function(response) {
                    var capabilities, mdLayer, legendArgs;
                    capabilities = parser.read(response);
                    log('Capabilities loaded, version:', capabilities.version);

                    // searching for the layer in the capabilities
                    // Layer virtual service (/geoserver/<ns>/<layer>/wms) scopes the response to this single layer.
                    // Name may appear with or without namespace prefix depending on GeoServer config; match either form.
                    if (capabilities.Capability && capabilities.Capability.Layer && capabilities.Capability.Layer.Layer) {
                        $.each(capabilities.Capability.Layer.Layer, function() {
                            log('Found layer in capabilities:', this.Name);
                            if (this.Name === self.options.nslayername || this.Name === self.options.layername) {
                                mdLayer = this;
                                log('Matched layer:', this.Name);
                            }
                        });
                    } else {
                        console.warn('No layers found in capabilities structure');
                    }

                    if (mdLayer) {
                        legendArgs = {
                            'SERVICE' : 'WMS',
                            'VERSION' : capabilities.version,
                            'REQUEST' : 'GetLegendGraphic',
                            'FORMAT' : 'image/png',
                            'LAYER': mdLayer.Name,
                            'STYLE': self.options.stylename
                        };
                        if (self.options.sldurl) {
                            legendArgs.SLD = self.options.sldurl;
                        }
                        var legendUrl = self.options.wmsurl_ns + '?' + $.param(legendArgs);
                        log('Legend URL:', legendUrl);

                        self.md.title = mdLayer.Title;
                        if (state.search) {
                            state.searchparams.title = self.md.title;
                        }
                        self.md.Abstract = mdLayer.Abstract;

                        var panel = buildLayerPanel(mdLayer, legendUrl);
                        $('#legend').append(panel);
                        log('Legend appended to DOM');

                        var xmlMetaUrl = null;
                        if (mdLayer.hasOwnProperty('MetadataURL')) {
                            $.each(mdLayer.MetadataURL, function() {
                                if (this.Format === "text/xml" && !xmlMetaUrl) {
                                    xmlMetaUrl = this.OnlineResource;
                                }
                            });
                        }
                        if (xmlMetaUrl) {
                            fetchISOMetadata(xmlMetaUrl, panel);
                        }
                    } else {
                        console.warn('Layer not found in capabilities:', self.options.nslayername);
                    }
                },
                error: function(xhr, status, error) {
                    console.error('GetCapabilities failed:', status, error, xhr.status);
                    console.error('URL was:', capabilitiesUrl);
                }
            });
        }

        function buildLayerPanel(mdLayer, legendUrl) {
            var attribution = null;
            if (mdLayer.Attribution) {
                attribution = {
                    source: tr('msg.source'),
                    url:    safeURL(mdLayer.Attribution.OnlineResource),
                    title:  mdLayer.Attribution.Title,
                    newTab: tr('msg.new_tab'),
                    logo:   mdLayer.Attribution.LogoURL
                        ? { url: safeURL(mdLayer.Attribution.LogoURL.OnlineResource) }
                        : null
                };
            }
            var metadataLinks = (mdLayer.MetadataURL || [])
                .filter(function(m) { return m.Format === 'text/html'; })
                .map(function(m) {
                    return { url: safeURL(m.OnlineResource), label: tr('msg.full_record'), newTab: tr('msg.new_tab') };
                });
            return $(Mustache.render(window.svTemplates['layer-panel'], {
                title:         mdLayer.Title,
                abstract:      mdLayer.Abstract,
                legendUrl:     legendUrl,
                legendAlt:     tr('msg.legend_of') + ' ' + mdLayer.Title,
                attribution:   attribution,
                metadataLinks: metadataLinks
            }));
        }

        function fetchISOMetadata(url, panel) {
            $.ajax({
                url: ajaxURL(url),
                type: 'GET',
                dataType: 'xml',
                success: function(xmlDoc) {
                    var meta = parseISOMetadata(xmlDoc);
                    if (meta) {
                        panel.find('.sv-md-doclink').before(buildISOTable(meta));
                    }
                },
                error: function() {
                    log('ISO metadata fetch failed for:', url);
                }
            });
        }

        function parseISOMetadata(xmlDoc) {
            var root = xmlDoc.documentElement;
            var xt = function(node, xpath) { return isoXt(xmlDoc, node, xpath); };
            var xr = function(node, xpath) {
                return xmlDoc.evaluate(xpath, node, isoNsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            };

            // date de mise à jour : dateStamp peut contenir DateTime ou Date
            var dateRaw = xt(root, '//gmd:dateStamp/gco:DateTime') ||
                          xt(root, '//gmd:dateStamp/gco:Date');
            var dateFormatted = null;
            if (dateRaw) {
                var d = new Date(dateRaw);
                dateFormatted = isNaN(d.getTime()) ? dateRaw : d.toLocaleDateString(config.lang);
            }

            // producteur et email : premier pointOfContact dans identificationInfo
            var idInfo = xr(root, '//gmd:identificationInfo');
            var producer = idInfo ? xt(idInfo, './/gmd:pointOfContact//gmd:organisationName/gco:CharacterString') : null;
            var email = idInfo ? xt(idInfo, './/gmd:pointOfContact//gmd:electronicMailAddress/gco:CharacterString') : null;

            // licence : préférer un gmx:Anchor avec href, sinon premier useLimitation
            var licenceText = null;
            var licenceUrl = null;
            var anchorNode = xr(root, '//gmd:resourceConstraints//gmd:otherConstraints/gmx:Anchor');
            if (anchorNode) {
                licenceUrl = anchorNode.getAttributeNS(ISO_NS.xlink, 'href') || null;
                licenceText = anchorNode.textContent.trim() || licenceUrl;
            }
            if (!licenceText) {
                var limits = xmlDoc.evaluate(
                    '//gmd:resourceConstraints//gmd:useLimitation/gco:CharacterString',
                    root, isoNsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
                );
                for (var i = 0; i < limits.snapshotLength; i++) {
                    var t = limits.snapshotItem(i).textContent.trim();
                    if (t) { licenceText = t; break; }
                }
            }

            if (!dateFormatted && !producer && !email && !licenceText) { return null; }
            return { date: dateFormatted, producer: producer, email: email,
                     licenceText: licenceText, licenceUrl: licenceUrl };
        }

        function buildISOTable(meta) {
            return $(Mustache.render(window.svTemplates['iso-table'], {
                dateLabel:     tr('msg.meta_date'),
                producerLabel: tr('msg.meta_producer'),
                contactLabel:  tr('msg.meta_contact'),
                licenceLabel:  tr('msg.meta_licence'),
                date:          meta.date,
                producer:      meta.producer,
                email:         meta.email,
                licenceText:   meta.licenceText,
                licenceUrl:    meta.licenceUrl ? safeURL(meta.licenceUrl) : null
            }));
        }

        /**
         * constructor
         */
        this.construct = function(options) {
            // layers from query string parameter
            // In jQuery 4, $.each may pass String object wrappers instead of primitives
            if (typeof options === "string" || (typeof options === "object" && options && options.constructor === String)) {
                parseLayerParam(String(options));
            }
            else {
                $.extend(this.options, options);
            }
            createLayer();
            if (!self.options.skipMetadataPanel) {
                getMetadata(self);
            }
        };

        this.construct(options);
    }

    /**
     * Runs WMS:DescribeLayer then WFS:DescribeFeatureType to populate this.wfs.
     * Silent on failure (CORS, no WFS endpoint, etc.).
     */
    LayerQueryable.prototype.discoverWFS = function() {
        var self = this;
        var describeLayerUrl = ajaxURL(self.options.wmsurl_ns + '?' + $.param({
            SERVICE: 'WMS',
            VERSION: '1.1.1',
            REQUEST: 'DescribeLayer',
            LAYERS: self.options.layername
        }));
        $.ajax({ url: describeLayerUrl, type: 'GET', dataType: 'xml' })
        .then(function(r1) {
            var wfsUrl = $(r1).find('LayerDescription').attr('wfs');
            var typeName = $(r1).find('Query').attr('typeName');
            if (!wfsUrl) { return $.Deferred().reject('no wfs url').promise(); }
            self.wfs.url = wfsUrl;
            self.wfs.typeName = typeName;
            var sep = wfsUrl.indexOf('?') >= 0 ? '&' : '?';
            return $.ajax({
                url: ajaxURL(wfsUrl + sep + $.param({
                    SERVICE: 'WFS',
                    VERSION: '1.0.0',
                    REQUEST: 'DescribeFeatureType',
                    TYPENAME: typeName
                })),
                type: 'GET',
                dataType: 'xml'
            });
        })
        .then(function(r2) {
            var fields = [], searchFields = [];
            $(r2.getElementsByTagNameNS('*', 'sequence')).find('[type]')
                .each(function() {
                    var type = $(this).attr('type');
                    var name = $(this).attr('name');
                    if (/^xsd:(string|date|dateTime|int|integer|long|short|decimal|double|float|boolean)$/.test(type)) {
                        fields.push(name);
                    }
                    if (type === 'xsd:string') {
                        searchFields.push(name);
                    }
                });
            self.wfs.geomField = $(r2.getElementsByTagNameNS('*', 'sequence'))
                .find('[type*="gml\\:"]').attr('name');
            self.wfs.fields = fields;
            self.wfs.searchFields = searchFields;
            log('WFS discovered for', self.options.nslayername, ':', self.wfs.url, fields);
        })
        .fail(function() {
            self.wfs.url = null;
            log('discoverWFS failed for', self.options.nslayername, '(no WFS or CORS)');
        });
    };


    // ----- methods ------------------------------------------------------------------------------------



    // Allow only http(s) URLs — blocks javascript: and data: in href/src attributes
    function safeURL(s) {
        return /^https?:\/\//i.test(s) ? s : '';
    }

    // ISO 19139 XML namespaces shared by parseISOMetadata and parseCSWForWMS
    var ISO_NS = {
        gmd:   'http://www.isotc211.org/2005/gmd',
        gco:   'http://www.isotc211.org/2005/gco',
        gmx:   'http://www.isotc211.org/2005/gmx',
        xlink: 'http://www.w3.org/1999/xlink'
    };
    function isoNsResolver(p) { return ISO_NS[p] || null; }
    function isoXt(xmlDoc, node, xpath) {
        var n = xmlDoc.evaluate(xpath, node, isoNsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        return n ? n.textContent.trim() : null;
    }

    /**
     * Returns the URL as-is (CORS assumed to be enabled on all services).
     * Replace with a proxy wrapper here if same-origin policy is a constraint.
     * @param {String} url
     * @return {String} url
     */
    function ajaxURL (url) {
        return url;
    }

    function fetchCSWRecord(metadataId, callback) {
        var url = hardConfig.geOrchestraBaseUrl + '/geonetwork/srv/eng/csw?' + $.param({
            SERVICE: 'CSW',
            VERSION: '2.0.2',
            REQUEST: 'GetRecordById',
            Id: metadataId,
            ElementSetName: 'full',
            OutputSchema: 'http://www.isotc211.org/2005/gmd'
        });
        $.ajax({
            url: ajaxURL(url),
            type: 'GET',
            dataType: 'xml',
            success: function(xmlDoc) {
                var result = parseCSWForWMS(xmlDoc);
                if (result) {
                    callback(result.wmsUrl, result.layername, xmlDoc);
                } else {
                    $('#legend').append($('<div class="alert alert-warning mt-2">').text(tr('msg.csw_no_wms')));
                }
            },
            error: function(xhr, status, error) {
                log('CSW GetRecordById failed:', status, error);
                $('#legend').append($('<div class="alert alert-warning mt-2">').text(tr('msg.csw_error')));
            }
        });
    }

    function parseCSWForWMS(xmlDoc) {
        var nodes = xmlDoc.evaluate(
            '//gmd:distributionInfo//gmd:CI_OnlineResource',
            xmlDoc.documentElement, isoNsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
        );
        for (var i = 0; i < nodes.snapshotLength; i++) {
            var node = nodes.snapshotItem(i);
            var proto    = isoXt(xmlDoc, node, 'gmd:protocol/gco:CharacterString');
            var rawUrl   = isoXt(xmlDoc, node, 'gmd:linkage/gmd:URL');
            var layername = isoXt(xmlDoc, node, 'gmd:name/gco:CharacterString');
            if (proto === 'OGC:WMS' && rawUrl && layername) {
                var wmsUrl = rawUrl.indexOf('?') > 0 ? rawUrl.split('?')[0] : rawUrl;
                return { wmsUrl: wmsUrl, layername: layername };
            }
        }
        return null;
    }

    /**
     * Translates strings
     * @param {String} s input string
     * @return {String} translated string
     */
    function tr(s) {
        if (typeof hardConfig.i18n[config.lang][s] === 'string') {
                return hardConfig.i18n[config.lang][s];
            }
        else {
            return s;
        }
    }

    /**
     * DOM elements i18n
     * @param selector {String} jQuery selector
     * @param propnames {Array} array of property names
     */
    function translateDOM(selector) {
        $.each($(selector), function(i, e) {
            var $e = $(e);
            var textKey        = $e.attr('data-i18n');
            var titleKey       = $e.attr('data-i18n-title');
            var placeholderKey = $e.attr('data-i18n-placeholder');
            if (textKey)        $e.text(tr(textKey));
            if (titleKey)       $e.prop('title', tr(titleKey));
            if (placeholderKey) $e.prop('placeholder', tr(placeholderKey));
        });
    }

    /**
     * Adjust map size on resize
     */
    function fixContentHeight() {
        var header = $("#header"),
            content = $("#frameMap"),
            viewHeight = $(window).height(),
            contentHeight = viewHeight - header.outerHeight();

        if ((content.outerHeight() + header.outerHeight()) !== viewHeight) {
            contentHeight -= (content.outerHeight() - content.height());
            content.height(contentHeight);
        }
        if (window.map) {
            map.updateSize();
        }
    }


    /**
     * Parses the query string
     *  Credits http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
     * @param {String} s param name
     * @return {String} param value
     */
     var qs = (function(s) {
        if (s === "") {
            return {};
        }
        var b = {};
        for (var i = 0; i < s.length; ++i)
        {
            var p=s[i].split('=');
            if (p.length != 2) {
                continue;
            }
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&'));

    // In embed mode, merge SViewer.init() options on top of qs.
    // customConfig.js is not yet loaded at this point — it runs later in init().
    // _svEmbedOptions has priority over qs (which may contain unrelated host-page params).
    if (window._svEmbedOptions) {
        $.extend(qs, window._svEmbedOptions);
    }

    // Debug mode: ?debug=true in URL enables console logs
    var debugMode = qs.debug === 'true';
    window.log = debugMode ? console.log : function() {};

    /**
     * Iterates over background layers, sets the visibility according to the lb parameter.
     * @param {Integer} lb layer index, optional
     * @returns {ol.layer} layer the visible background layer
     */
    function switchBackground (lb) {
        var n = config.layersBackground.length;
        var lv = 0;
        // look for the visible layer and hide all layers
        $.each(config.layersBackground, function(i, layer) {
            if (layer.getVisible()) {
                lv = i;
            }
            layer.setVisible(false);
        });
        // if lb specified, show this layer
        if (typeof(lb) === 'number') {
            config.layersBackground[state.lb].setVisible(true);
        }
        // otherwise, show next layer
        else {
            state.lb = (lv+1)%n;
            config.layersBackground[state.lb].setVisible(true);
        }
        return config.layersBackground[state.lb];
    }

    /**
     * Method: setPermalink
     * keeps permalinks synchronized with the map extent
     */
    function setPermalink () {
        // permalink, social links & QR code update only if share panel is visible
        if ($('#sharePanel').is(':visible')) {
            var permalinkHash, permalinkQuery;
            var c = view.getCenter();
            var linkParams = {};
            if (state.gficoord && state.gfiz && state.gfiok) {
                linkParams.x = encodeURIComponent(Math.round(state.gficoord[0]));
                linkParams.y = encodeURIComponent(Math.round(state.gficoord[1]));
                linkParams.z = encodeURIComponent(state.gfiz);
                linkParams.q = '1';
            }
            else {
                linkParams.x = encodeURIComponent(Math.round(c[0]));
                linkParams.y = encodeURIComponent(Math.round(c[1]));
                linkParams.z = encodeURIComponent(view.getZoom());
            }
            linkParams.lb = encodeURIComponent(state.lb);
            if (config.customConfigName) { linkParams.c = config.customConfigName; }
            if (state.search) { linkParams.s = '1'; }
            if (config.layersQueryString) { linkParams.layers = config.layersQueryString; }
            if (config.metadataId && !config.layersQueryString) { linkParams.md = config.metadataId; }
            if (state.theme && state.theme !== 'light') { linkParams.theme = state.theme; }
            // In embed mode, permalink must point to the standalone sViewer, not the host page
            var standaloneBase = window.SViewerBaseUrl
                ? window.SViewerBaseUrl + 'index.html'
                : window.location.origin + window.location.pathname;
            permalinkHash = standaloneBase + "#" + $.param(linkParams);
            permalinkQuery = standaloneBase + "?" + $.param(linkParams);

            $('#permalinkUrl')
                .prop('href', permalinkQuery)
                .prop('target', '_blank')
                .prop('rel', 'noopener')
                .text(permalinkQuery);
        }
    }




    /**
     * Generates embed code with current map state
     * Includes all relevant URL parameters (x, y, z, layers, lb, title, etc.)
     */
    function generateEmbedCode() {
        var c = view.getCenter();
        var embedParams = {};
        embedParams.x = Math.round(c[0]);
        embedParams.y = Math.round(c[1]);
        embedParams.z = view.getZoom();
        if (state.lb !== null && state.lb !== undefined) {
            embedParams.lb = state.lb;
        }
        if (config.layersQueryString) {
            embedParams.layers = config.layersQueryString;
        }
        if (config.metadataId && !config.layersQueryString) {
            embedParams.md = config.metadataId;
        }
        if (config.title) {
            embedParams.title = config.title;
        }
        if (config.customConfigName) {
            embedParams.c = config.customConfigName;
        }
        if (state.theme && state.theme !== 'light') {
            embedParams.theme = state.theme;
        }

        var baseUrl = window.SViewerBaseUrl || config.baseUrl || window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
        var code = '<div id="sviewer-map" style="width: 100%; height: 500px;"></div>\n' +
                   '<script src="' + baseUrl + 'js/embed.js"><\/script>\n' +
                   '<script>\n' +
                   '  SViewer.init("#sviewer-map", ' + JSON.stringify(embedParams, null, 2).split('\n').join('\n    ') + ');\n' +
                   '<\/script>';
        return code;
    }

    /**
     * Queries the IGN Géoplateforme geocoding API and recenters the map.
     * Replaces the former OpenLS/XLS implementation (gpp3-wxs.ign.fr, retired).
     * API docs: https://geoservices.ign.fr/documentation/services/api-et-services-ogc/geocodage
     * @param text {String} free-text address query
     */
    var openLsXhr = null;

    function openLsRequest(text) {

        if (openLsXhr) {
            openLsXhr.abort();
            openLsXhr = null;
        }

        function onGeocodeSuccess(response) {
            svSpinner.hide();
            try {
                var features = response.features;
                if (features && features.length > 0) {
                    var zoomByType = { municipality: 13, street: 17, housenumber: 18 };
                    var items = features.map(function(feature) {
                        var props    = feature.properties;
                        var coords   = ol.proj.transform(feature.geometry.coordinates, 'EPSG:4326', config.projcode);
                        var label    = props.label || props.name || coords.join(', ');
                        return renderSearchItem(
                            { label: label },
                            { extent: [], coordinates: coords, zoom: zoomByType[props.type] || 16 }
                        );
                    });
                    $('#searchResults')
                        .prepend(items)
                        .prepend(Mustache.render(window.svTemplates['search-header'], { label: tr('lbl.geocode_results') }));
                }
            } catch(err) {
                $('#locateMsg').text(tr('msg.geolocation_failed'));
            }
        }

        function onGeocodeFailure(xhr) {
            if (xhr.statusText === 'abort') { return; }
            $('#locateMsg').text(tr('msg.geolocation_failed'));
            svSpinner.hide();
        }

        try {
            var q = text.trim();
            if (q.length > 0) {
                var bbox = ol.proj.transformExtent(
                    config.initialExtent,
                    map.getView().getProjection().getCode(),
                    'EPSG:4326'
                );
                // Direct call — Géoplateforme supports CORS natively, no proxy needed
                openLsXhr = $.ajax({
                    url: config.openLSGeocodeUrl,
                    type: 'GET',
                    dataType: 'json',
                    data: {
                        q: q,
                        limit: config.maxGeocodeResults,
                        bbox: bbox.join(',')
                    },
                    success: onGeocodeSuccess,
                    error: onGeocodeFailure
                });
                svSpinner.show();
            }
        } catch(err) {
            messagePopup(tr('msg.geolocation_failed'));
            svSpinner.hide();
        }
    }

    /**
     * getFeatureInfo
     */
    function queryMap(coord) {
        var p = map.getPixelFromCoordinate(coord);
        state.gficoord = coord;
        state.gfiok = false;
        state.gfiz = view.getZoom();
        var viewResolution = view.getResolution();

        marker.setPosition(state.gficoord);
        $('#marker').show();
        view.animate({center: state.gficoord, duration: 1000});
        closePanel();
        $('#queryContent').html('');

        // WMS getFeatureInfo
        $.each(config.layersQueryable, function() {
            var url = this.wmslayer.getSource().getFeatureInfoUrl(
                state.gficoord,
                viewResolution,
                config.projection,
                {'INFO_FORMAT': 'text/html',
                'FEATURE_COUNT': config.maxFeatures}
            );

            // response order = layer order
            var domResponse = $(Mustache.render(window.svTemplates['query-header'], { title: this.md.title }));
            $('#queryContent').append(domResponse);
            // ajax request
            svSpinner.show();
            $.ajax({
                url: ajaxURL(url),
                type: 'GET',
                dataType: 'html',
                context: domResponse,
                success: function(response) {
                    // nonempty reponse detection
                    if (response.search(config.nodata)<0) {
                        closePanel();
                        $(this).append(response);
                        state.gfiok = true;
                        $('#panelQuery a').attr("rel","external");
                        togglePanel('query');
                    }
                    else {
                        // disable jquery ajax for links
                        togglePanel('query');
                        $(this).append($('<p class="sv-noitem">').text(tr('msg.no_item_found')));
                        state.gfiok = false;
                    }
                    svSpinner.hide();
                },
                error: function() {
                    svSpinner.hide();
                    $(this).append($('<p class="sv-noitem">').text(tr('msg.query_failed')));
                }
            });
        });
    }

    /**
     * clear getFeatureInfo
     */
    function clearQuery() {
        $('#marker').hide('fast');
        closePanel();
        $('#queryContent').text(tr('lbl.query_the_map'));
        state.gficoord = null;
        state.gfiz = null;
        state.gfiok = false;
    }


    /**
     * method: searchAllWFSLayers
     * for each layer with a discovered WFS endpoint and text fields,
     * performs a WFS GetFeature with PropertyIsLike filters and appends results.
     * @param {String} value search term
     */
    function searchAllWFSLayers(value) {
        if (value.length < 2) { return; }
        $.each(config.layersQueryable, function() {
            var layer = this;
            if (!layer.wfs.url || !layer.wfs.searchFields || !layer.wfs.searchFields.length) { return; }

            var ogcfilter = [], propertynames = [];
            /*matchCase="false" for PropertyIsLike don't work with geoserver 2.5.0* in wfs 2.0.0 version*/
            $.each(layer.wfs.searchFields, function(i, fieldname) {
                ogcfilter.push(
                    '<ogc:PropertyIsLike wildCard="*" singleChar="." escapeChar="!" matchCase="false">' +
                    '<ogc:PropertyName>' + fieldname + '</ogc:PropertyName>' +
                    '<ogc:Literal>*' + value + '*</ogc:Literal></ogc:PropertyIsLike>');
                propertynames.push('<ogc:PropertyName>' + fieldname + '</ogc:PropertyName>');
            });
            $.each(layer.wfs.fields, function(i, fieldname) {
                if (layer.wfs.searchFields.indexOf(fieldname) === -1) {
                    propertynames.push('<ogc:PropertyName>' + fieldname + '</ogc:PropertyName>');
                }
            });
            propertynames.push('<ogc:PropertyName>' + layer.wfs.geomField + '</ogc:PropertyName>');
            if (layer.wfs.searchFields.length > 1) {
                ogcfilter.unshift('<ogc:Or>');
                ogcfilter.push('</ogc:Or>');
            }
            ogcfilter.unshift('<ogc:And>');
            ogcfilter.push(['<ogc:BBOX>',
                '<ogc:PropertyName>' + layer.wfs.geomField + '</ogc:PropertyName>',
                '<gml:Envelope xmlns:gml="http://www.opengis.net/gml" srsName="' + config.projection.getCode() + '">',
                  '<gml:lowerCorner>' + ol.extent.getBottomLeft(config.initialExtent).join(' ') + '</gml:lowerCorner>',
                  '<gml:upperCorner>' + ol.extent.getTopRight(config.initialExtent).join(' ') + '</gml:upperCorner>',
                '</gml:Envelope>',
                '</ogc:BBOX>'].join(' '));
            ogcfilter.push('</ogc:And>');

            var getFeatureRequest = ['<?xml version="1.0" encoding="UTF-8"?>',
                '<wfs:GetFeature',
                    'xmlns:wfs="http://www.opengis.net/wfs" service="WFS" version="1.1.0"',
                    'xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd"',
                    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
                    'maxFeatures="' + config.maxWfsSearchFeatures + '" outputFormat="application/json">',
                      '<wfs:Query xmlns:ogc="http://www.opengis.net/ogc"',
                       'typeName="' + layer.wfs.typeName + '" srsName="' + config.projection.getCode() + '">',
                        propertynames.join(' '),
                        '<ogc:Filter>',
                           ogcfilter.join(' '),
                        '</ogc:Filter>',
                    '</wfs:Query>',
                '</wfs:GetFeature>'].join(' ');

            (function(lyr, term) {
                var xhr = $.ajax({
                    type: 'POST',
                    url: ajaxURL(lyr.wfs.url),
                    data: getFeatureRequest,
                    dataType: 'json',
                    contentType: 'application/xml',
                    success: function(response) {
                        pruneSearchXhrs();
                        var f = new ol.format.GeoJSON().readFeatures(response);
                        if (f.length > 0) {
                            featuresToList(f, lyr.md.title || lyr.options.nslayername, term);
                        }
                    },
                    error: function(jqXHR) {
                        pruneSearchXhrs();
                        if (jqXHR.statusText !== 'abort') {
                            log('WFS search error for', lyr.options.nslayername);
                        }
                    }
                });
                searchXhrs.push(xhr);
            }(layer, value));
        });
    }

    /**
     * method: onSearchItemClick
     * recenters map on feature click
     * @param {Jquery.Event} event
     */
    function onSearchItemClick (event) {
        var data = event.data;
        marker.setPosition(data.coordinates);
        if (data.extent.length===4 && !(data.extent[0] == data.extent[2] && data.extent[1] == data.extent[3])) {
            view.fit(data.extent);
        } else {
            view.setCenter(data.coordinates);
            view.setZoom(data.zoom || 16);
        }
        $('#marker').show();
        if (data.queryGFI) {
            queryMap(data.coordinates);
        }
    }

    
    /**
     * method: featuresToList
     * renders one search result item and binds the click handler
     * @param {Object} templateData  Mustache data ({ label, ariaLabel, fields })
     * @param {Object} clickData     event.data passed to onSearchItemClick
     * @returns {jQuery} the <li> element
     */
    function renderSearchItem(templateData, clickData) {
        if (!templateData.ariaLabel) {
            templateData.ariaLabel = templateData.label || '—';
        }
        return $(Mustache.render(window.svTemplates['search-item'], templateData))
            .find('.sv-search-item-link')
            .on('click', clickData, onSearchItemClick)
            .parent();
    }

    /**
     * renders a section header + clickable list of WFS features
     * @param {ol.Feature[]} features
     * @param {String} label section header text
     * @param {String} term search term used to highlight matching values
     */
    function featuresToList(features, label, term) {
        var searchTerm = (term || '').toLowerCase();
        var $results = $("#searchResults");
        $results.append(Mustache.render(window.svTemplates['search-header'], {
            label: label || tr('msg.top_layer')
        }));

        $.each(features, function(i, feature) {
            var geom       = feature.getGeometry(),
                fieldItems = [],
                title      = [];

            $.map(feature.getProperties(), function(val, key) {
                if (val === null || val === undefined) { return; }
                if (typeof val === 'object' && typeof val.getType === 'function') { return; }
                var str = (val instanceof Date) ? val.toISOString().substring(0, 10) : String(val);
                fieldItems.push({ key: key, val: str });
                if (typeof val === 'string' && searchTerm && val.toLowerCase().indexOf(searchTerm) !== -1) {
                    title.push(val);
                }
            });

            var center = geom.getType() === 'Point' ? geom.getCoordinates() : ol.extent.getCenter(geom.getExtent());
            var ariaLabel = title.length ? title.join(', ') : fieldItems.map(function(f) { return f.val; }).join(', ');
            renderSearchItem(
                { label: title.join(', '), ariaLabel: ariaLabel, fields: fieldItems.length ? [{ items: fieldItems }] : [] },
                { extent: geom.getExtent(), coordinates: center, queryGFI: true }
            ).appendTo($results);
        });
    }

    var searchXhrs = [];

    function abortSearchXhrs() {
        $.each(searchXhrs, function() { this.abort(); });
        searchXhrs = [];
    }

    function pruneSearchXhrs() {
        searchXhrs = searchXhrs.filter(function(xhr) { return xhr.readyState !== 4; });
    }

    /**
     * method: searchPlace
     * search for matching places (OpenLS) and features
     */
    function searchPlace() {
        abortSearchXhrs();
        $("#searchResults").html("");
        try {
            openLsRequest($("#searchInput").val());
            if (state.search) {
                searchAllWFSLayers($("#searchInput").val());
            }
        }
        catch(err) {
            messagePopup(tr('msg.geolocation_failed'));
            svSpinner.hide();
        }
        return false;
    }

    // panel size and placement to fit small screens
    function panelLayout (e) {
        var panel = $(this);
        panel.css('max-width', Math.min($(window).width() - 44, 450) + 'px');
        panel.css('max-height', $(window).height() - 64 + 'px');
    }

    function resetPanel() {
        var sidepanel = $('#sidepanel');
        sidepanel.find('.sv-panel-section').hide();
        sidepanel.removeClass('active');
        $('#panelcontrols .sv-panel-toggle').removeClass('active').attr('aria-pressed', 'false');
        $('#frameMap').removeClass('panel-open');
    }

    function togglePanel(panelName) {
        var sidepanel = $('#sidepanel');
        var targetSection = sidepanel.find('[data-section="' + panelName + '"]');
        var button = $('[data-panel="' + panelName + '"]');
        if (button.hasClass('active') || targetSection.is(':visible')) {
            resetPanel();
            return;
        }
        resetPanel();
        targetSection.show();
        button.addClass('active').attr('aria-pressed', 'true');
        sidepanel.addClass('active');
        $('#frameMap').addClass('panel-open');
        if (panelName === 'share') { setPermalink(); }
        if (panelName === 'locate') { setTimeout(function() { $('#searchInput').focus(); }, 50); }
    }

    function closePanel() { resetPanel(); }

    // panelButton kept for compatibility, now delegates to togglePanel
    function panelButton(e) {
        var button = $(e.target).closest('button');
        var panelName = button.data('panel');
        if (panelName) {
            togglePanel(panelName);
        }
    }

   // updates title
   function setTitle(title) {
        config.title = title;
        document.title = config.title;
       if (config.title!=='') {
            $('#panelShareBtnTitle').text(config.title);
       }
        if ($("#shareSetTitle").val()==='') {
            $("#shareSetTitle").val(config.title);
        }
    }

    // updates title on keypress
    function onTitle(e) {
        setTitle($(this).val());
    }

    function adjustZoom(delta) {
        view.animate({zoom: view.getZoom() + delta, duration: 500});
    }

    // Back to initial extent
    function zoomInit() {
        if (config.initialView) {
            view.animate({ center: config.initialView.center, zoom: config.initialView.zoom, rotation: 0, duration: 500 });
        } else {
            view.animate({ rotation: 0, duration: 200 });
            view.fit(config.initialExtent, {duration: 500});
        }
    }

    // recenter on device position
    function showPosition(pos) {
        var p = ol.proj.transform([pos.coords.longitude, pos.coords.latitude], 'EPSG:4326', config.projcode);
        marker.setPosition(p);
        view.animate({
            center: p,
            zoom: Math.max(view.getZoom(), 18),
            duration: 1000
        });
    }
    
    // get device position
    function locateMe() {
        if (navigator.geolocation) {
            messagePopup(tr('msg.estimating_position'));
            navigator.geolocation.getCurrentPosition(
                showPosition, 
                function(e) {
                    messagePopup(tr('msg.position_error'));
                },
                {maximumAge: 60000, enableHighAccuracy: true, timeout: 30000}
            );
        } else {
            messagePopup(tr('msg.position_unavailable'));
        }
        return false;
    }

    //  info popup
    function messagePopup(msg){
        $("<div class='alert alert-info' role='alert'>")
            .append($('<h3>').text(msg))
        .css({
            display: "block",
            position: "fixed",
            padding: "7px",
            "text-align": "center",
            "background-color": "#ffffff",
            width: "270px",
            "border-radius": "4px",
            "box-shadow": "0 2px 8px rgba(0,0,0,0.2)",
            left: ($(window).width() - 284)/2,
            top: $(window).height()/2,
            "z-index": 9000 })
            .appendTo( $('body') ).delay( 1500 )
            .fadeOut( 1000, function(){
            $(this).remove();
        });
    }

    // ----- configuration --------------------------------------------------------------------------------

    /**
     * reads optional "c" querystring arg,
     * loads application profile located in etc/customConfig_[configname].js
     * ie &c=cadastral& : loads etc/customConfig_cadastral.js instead of customConfig.js
     * configname MUST MATCH ^[A-Za-z0-9_-]+$
     */
    function init() {
        var configBase = window.SViewerBaseUrl || '';
        var qsconfig;
        if (qs.c && qs.c.match(/^[A-Za-z0-9_-]+$/)) {
            qsconfig = configBase + "etc/customConfig_"+qs.c+".js";
        }
        else {
            qsconfig = configBase + "etc/customConfig.js";
        }
        function startApp() {
            customConfig.customConfigName = qs.c;
            doConfiguration();
            doMap();
            doGUI();
        }
        $.getScript(qsconfig).done(startApp).fail(startApp);
    }
    
    /**
     * reads configuration from querystring
     */
    function doConfiguration() {

        // browser language
        var language = ((navigator.language) ? navigator.language : navigator.userLanguage).substring(0,2);

        // static configuration (merged from hardConfig + customConfig)
        // Check if i18n has been loaded (via i18n.js)
        var i18n = (hardConfig && hardConfig.i18n) || {};
        config = {
            lang: ((i18n.hasOwnProperty(language)) ? language : 'en'),
            layersQueryable: [],
            layersQueryString: ''
        };
        $.extend(config, hardConfig);
        $.extend(config, window.customConfig || {});

        document.documentElement.lang = config.lang;
        config.projection = ol.proj.get(config.projcode);

        // In embed mode, merge config values back into qs so they're available downstream
        // (config has been populated from hardConfig + customConfig, which includes embed options)
        if (config.layers && !qs.layers) {
            qs.layers = config.layers;
        }
        if (config.zoom && !qs.z) {
            qs.z = config.zoom;
        }
        if (config.center && !qs.x && !qs.y) {
            qs.x = config.center[0];
            qs.y = config.center[1];
        }
        if (config.lb && !qs.lb) {
            qs.lb = config.lb;
        }
        if (config.title && !qs.title) {
            qs.title = config.title;
        }
        if (config.q && !qs.q) {
            qs.q = config.q;
        }
        if (config.s && !qs.s) {
            qs.s = config.s;
        }
        if (config.qr && !qs.qr) {
            qs.qr = config.qr;
        }
        if (config.theme && !qs.theme) {
            qs.theme = config.theme;
        }

        // runtime state (mutable after init)
        state = {
            lb: 0,
            theme: 'light',
            gficoord: null,
            gfiok: false,
            gfiz: null,
            search: false,
            searchindex: null,
            searchparams: {}
        };

        // querystring param: theme (light | dark)
        if (qs.theme === 'light' || qs.theme === 'dark') {
            state.theme = qs.theme;
        }

        // querystring param: lb (selected background)
        if (qs.lb) {
            state.lb = parseInt(qs.lb) % config.layersBackground.length;
        }

        // querystring param: layers
        if (qs.layers) {
            config.layersQueryString = qs.layers;
            var ns_layer_style_list = [];
            // parser to retrieve serialized namespace:name[*style[*cql_filter]] and store the description in config
            ns_layer_style_list = (typeof qs.layers === 'string') ? qs.layers.split(',') : qs.layers;
            $.each(ns_layer_style_list, function() {
                config.layersQueryable.push(new LayerQueryable(this));
            });
        }
        
        // querystring param: md (metadata identifier)
        // fetches ISO19139 record from CSW, extracts OGC:WMS endpoint and layername
        if (qs.md && !qs.layers) {
            config.metadataId = qs.md;
            fetchCSWRecord(qs.md, function(wmsUrl, layername, xmlDoc) {
                var root = xmlDoc.documentElement;
                var title    = isoXt(xmlDoc, root, '//gmd:identificationInfo//gmd:citation//gmd:title/gco:CharacterString') || layername;
                var abstract = isoXt(xmlDoc, root, '//gmd:identificationInfo//gmd:abstract/gco:CharacterString') || '';
                var nsPart   = layername.indexOf(':') > 0 ? layername.split(':')[0] : '';
                var lq = new LayerQueryable({
                    nslayername: layername, layername: layername, namespace: nsPart,
                    stylename: '', cql_filter: '',
                    wmsurl_global: wmsUrl, wmsurl_ns: wmsUrl, wmsurl_layer: wmsUrl,
                    sldurl: null, format: 'image/png', opacity: 1, skipMetadataPanel: true
                });
                config.layersQueryable.push(lq);
                map.addLayer(lq.wmslayer);
                lq.md.title = title;
                setTitle(title);
                var legendUrl = wmsUrl + '?' + $.param({
                    SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetLegendGraphic',
                    FORMAT: 'image/png', LAYER: layername
                });
                var $panel = $('<div class="sv-md p-2">');
                $panel.append($('<div class="fw-bold mb-1">').text(title));
                if (abstract) { $panel.append($('<div class="text-muted small mb-2">').text(abstract)); }
                $panel.append($('<img class="img-fluid mb-2">').attr('src', legendUrl).attr('alt', tr('msg.legend_of') + ' ' + title));
                var meta = parseISOMetadata(xmlDoc);
                if (meta) { $panel.append(buildISOTable(meta)); }
                $('#legend').append($panel);
            });
        } else if (qs.md && qs.layers) {
            log('md= ignored: layers= takes precedence');
        }

        // querystring param: qcl_filters
        if (qs.qcl_filters) {
            var qcl_filters_list = [];
            qcl_filters_list = (typeof qs.qcl_filters === 'string') ? qs.qcl_filters.split(';') : qs.qcl_filters;

            $.each(qcl_filters_list, function(index) {
                if (index < config.layersQueryable.length) {
                    var opt = config.layersQueryable[index].options;
                    opt.cql_filter = String(this);
                    config.layersQueryable[index] = new LayerQueryable(opt);
                }
            });
        }

        // querystring param: xyz
        // recenters map on specified location
        if (qs.x&&qs.y&&qs.z) {
            config.z = parseFloat(qs.z);
            var p = [parseFloat(qs.x), parseFloat(qs.y)];
            // is this lonlat ? anyway don't use sviewer for the vendee globe
            if (Math.abs(p[0])<=180&&Math.abs(p[1])<=180&&config.z>7) {
                p = ol.proj.transform(p, 'EPSG:4326', config.projcode);
            }
            config.x = p[0];
            config.y = p[1];
            config.initialView = { center: [config.x, config.y], zoom: config.z };
        }

        // querystring param: title
        // controls map title
        if (qs.title) {
            setTitle(qs.title);
        }
        else {
            setTitle(config.title);
        }

        // querystring param: perform getFeatureInfo on map center
        if (qs.q) {
            state.gfiok = true;
        }

        // querystring param: activate WFS feature search alongside geocoding
        if (qs.s) {
            state.search = true;
            $.each(config.layersQueryable, function() { this.discoverWFS(); });
        }
    }


    /**
     * creates the map
     */
    function doMap() {
        // map creation
        view = new ol.View({
            projection: config.projection
        });
        // Attribution must stay visible on desktop but fold into the "i" toggle
        // on narrow containers (embed widgets, phones) where it would otherwise
        // overlap the scale line.
        var mapEl = document.getElementById('map');
        var smallMap = !!(mapEl && mapEl.clientWidth && mapEl.clientWidth < 600);
        map = new ol.Map({
            controls: [
                new ol.control.ScaleLine(),
                new ol.control.Attribution({
                    collapsible: smallMap,
                    collapsed: smallMap
                })
            ],
            // MouseWheelZoom defaults to focusWithTabindex in OL6+: zoom only works
            // when the map viewport has keyboard focus. Override with always so the
            // wheel works even after clicking jQuery Mobile panels or buttons.
            interactions: ol.interaction.defaults.defaults({mouseWheelZoom: false}).extend([
                new ol.interaction.MouseWheelZoom({
                    condition: ol.events.condition.always
                })
            ]),
            layers: [],
            overlays: [],
            target: 'map',
            view: view
        });

        // adding background layers (opaque, non queryable, mutually exclusive)
        $.each(config.layersBackground, function() {
                this.setVisible(false);
                map.addLayer(this);
            }
        );
        switchBackground(state.lb);

        // adding queryable WMS layers from querystring
        $.each(config.layersQueryable, function() {
            map.addLayer(this.wmslayer);
        });

        // map recentering
        if (config.x&&config.y&&config.z) {
            view.setCenter([config.x, config.y]);
            view.setZoom(config.z);
        }
         else {
            view.fit(config.initialExtent);
            view.setRotation(0);
        }


        // marker overlay for geoloc and queries
        marker =  new ol.Overlay({
            element: $('#marker')[0],
            positioning: 'bottom-left',
            stopEvent: false
        });
        map.addOverlay(marker);
    }

    /**
     * initiates GUI
     */
    function applyTheme(theme) {
        var scope = document.querySelector('.sv-scope');
        if (scope) {
            scope.setAttribute('data-theme', theme);
        }
        // In embed mode SViewerBaseUrl is set by embed.js — don't touch the host page's root
        if (!window.SViewerBaseUrl) {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }

    function doGUI() {
        applyTheme(state.theme);

        // opens permalink tab with QR code if required
        if (qs.qr) {
            setPermalink();
            $('#permalinkBtn').trigger('click');
        }

        // map events
        map.on('singleclick', function(e) {
            queryMap(e.coordinate);
        });
        map.on('moveend', setPermalink);
        $('#marker').on('click', clearQuery);


        // map buttons
        $('#ziBt').on('click', function() { adjustZoom(+1); });
        $('#zoBt').on('click', function() { adjustZoom(-1); });
        $('#zeBt').on('click', zoomInit);
        $('#bgBt').on('click', switchBackground);

        // geolocation form
        $('#zpBt').on('click', locateMe);

        // search with autocomplete - trigger on keyup after 3 characters, debounced
        var searchDebounceTimer = null;
        $('#searchInput').on('keyup', function() {
            var query = $(this).val();
            clearTimeout(searchDebounceTimer);
            if (query.length >= 3) {
                searchDebounceTimer = setTimeout(searchPlace, 350);
            } else {
                abortSearchXhrs();
                $("#searchResults").html("");
            }
        });

        // set title dialog (both panel and modal)
        $('#shareSetTitle').on('keyup', onTitle);
        $('#shareSetTitle').on('blur', setPermalink);

        // theme switch
        $('#themeSwitch')
            .prop('checked', state.theme === 'dark')
            .attr('aria-checked', String(state.theme === 'dark'))
            .on('change', function() {
                state.theme = this.checked ? 'dark' : 'light';
                $(this).attr('aria-checked', String(this.checked));
                applyTheme(state.theme);
                setPermalink();
            });

        // WebComponent button (can appear in side panel or modal)
        $(document).on('click', '.webcomponent-btn', function() {
            var embedCode = generateEmbedCode();
            $('#embedCodeTextarea').val(embedCode);
            closePanel();
            svModal.open('#webcomponent');
        });

        // Permalink button — close share panel and show link in modal
        $(document).on('click', '#permalinkBtn', function() {
            var href = $('#permalinkUrl').prop('href');
            $('#permalinkUrl').prop('href', href).text(href);
            closePanel();
            svModal.open('#permalink');

            // Generate QR code for the permalink
            if (!href) {
                console.warn('No permalink available for QR code');
                $('#qrcodeDisplay').html('<div class="alert alert-warning" role="alert">No link available</div>');
                return;
            }

            var qrcodeDisplayEl = document.getElementById('qrcodeDisplay');
            if (!qrcodeDisplayEl) {
                console.error('QR code display element not found in DOM');
                return;
            }

            qrcodeDisplayEl.innerHTML = '<div class="text-center"><span class="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden="true"></span></div>';

            log('Starting QR code generation for:', href);
            loadQRCodeLibrary().then(function() {
                log('QR code library ready, generating QR code');
                if (typeof QRCode === 'undefined') {
                    throw new Error('QRCode is still not defined after loading');
                }
                return QRCode.toDataURL(href, {
                    errorCorrectionLevel: 'L',
                    type: 'image/png',
                    margin: 1,
                    width: 240,
                    color: { dark: '#000000', light: '#ffffff' }
                });
            }).then(function(dataUrl) {
                log('QR code generated successfully');
                qrcodeDisplayEl.innerHTML = '<img src="' + dataUrl + '" alt="QR Code — ' + href + '" style="max-width: 100%; height: auto;">';
            }).catch(function(error) {
                console.error('QR code generation failed:', error);
                qrcodeDisplayEl.innerHTML = '<div class="alert alert-warning" role="alert">Failed to generate QR code: ' + error.message + '</div>';
            });
        });

        function copyToClipboard(text, btn, fallback) {
            var orig = btn.html();
            var onCopied = function() {
                btn.html('<i class="bi bi-check" aria-hidden="true"></i> ' + tr('btn.copied'));
                var $live = $('<span class="visually-hidden" aria-live="polite" aria-atomic="true">').text(tr('btn.copied'));
                btn.after($live);
                setTimeout(function() { btn.html(orig); $live.remove(); }, 2000);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(onCopied).catch(function() {
                    fallback(); onCopied();
                });
            } else {
                fallback(); onCopied();
            }
        }

        $(document).on('click', '#permalinkCopyBtn', function() {
            var url = $('#permalinkUrl').prop('href');
            copyToClipboard(url, $(this), function() { window.prompt('', url); });
        });

        $('#embedCodeCopyBtn').on('click', function() {
            var textarea = document.getElementById('embedCodeTextarea');
            copyToClipboard(textarea.value, $(this), function() {
                textarea.select(); document.execCommand('copy');
            });
        });

        // dynamic resize
        $(window).on('orientationchange resize pageshow updatelayout', panelLayout);

        // Side panel toggles
        $('#panelcontrols button').on('click', panelButton);
        $('.sv-sidepanel-close').on('click', closePanel);

        // Close panel when clicking on backdrop (small screens)
        $('#frameMap').on('click', function(e) {
            if ($(this).hasClass('panel-open') && window.innerWidth <= 600) {
                // On small screens, close panel if clicking backdrop area (left 15%)
                if (e.target === this && e.clientX < window.innerWidth * 0.15) {
                    closePanel();
                }
            }
        });

        // Handle sidepanel layout and permalink updates
        var observer = new MutationObserver(function() {
            if ($('#sidepanel').hasClass('active')) {
                setPermalink();
            }
        });
        observer.observe(document.getElementById('sidepanel'), {
            attributes: true,
            attributeFilter: ['class']
        });

        // i18n
        if (config.lang !== 'en') {
            translateDOM('.i18n');
        }
        

        // resize map
        $(window).on("orientationchange resize pageshow", fixContentHeight);
        fixContentHeight();

        if (state.gfiok) {
            setTimeout(
                function() { queryMap(view.getCenter()); },
                300
            );
        }
    }


    // ------ Main ------------------------------------------------------------------------------------------

    this.init = init;
    this.getMap = function() { return map; };
    this.getView = function() { return view; };
    this.getConfig = function() { return config; };
    this.getState = function() { return state; };
    }

    // Create instance
    var instance = new SViewer();

    // Expose configuration for external scripts (i18n.js, etc.)
    window.hardConfig = hardConfig;
    window.config = config;
    window.state = state;
    // Note: do NOT overwrite window.customConfig - it may have been set by embed.js or host page
    // window.customConfig was already set before sviewer.js loaded

    return instance;
})();

// Auto-initialize on document ready
$(document).ready(function() {
    if (window.SViewerApp && window.SViewerApp.init) {
        window.SViewerApp.init();
    }
});