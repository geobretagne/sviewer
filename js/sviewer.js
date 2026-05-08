/*globals $:false, ol:false, proj4:false*/

// Isolated SViewer instance - encapsulates all state and DOM interactions
window.SViewerApp = (function() {
    // Projection: EPSG:3857 (Web Mercator)
    proj4.defs([
        ["EPSG:4326", "+title=WGS 84, +proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs"],
        ["EPSG:3857", "+title=Web Spherical Mercator, +proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs"]
    ]);
    ol.proj.proj4.register(proj4);

    // Bus shared with embed.js — null when running standalone (no embed.js loaded).
    var _bus = (window._SViewerInternals && window._SViewerInternals.bus) || null;
    function _emit(event, data) { if (_bus) { _bus.emit(event, data); } }

    var config = {};
    var state = {};
    var customConfig = window.customConfig || {};

    // Ensure hardConfig exists (created by embed.js before i18n.js loaded)
    window.SViewerHardConfig = window.SViewerHardConfig || {};

    // Fill in defaults — existing keys (from customConfig via embed.js) are preserved
    window.SViewerHardConfig = $.extend({
        title: 'sViewer',
        geOrchestraBaseUrl: 'https://demo.georchestra.org',
        projcode: 'EPSG:3857',
        initialExtent: [-567000, 5047000, 1068000, 6639000],
        maxExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
        restrictedExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
        maxFeatures: 3,
        maxGeocodeResults: 5,
        maxWfsSearchFeatures: 3,
        nodata: '<!--nodatadetect-->\n<!--nodatadetect-->',
        searchPlaceholder: 'adresse, lieu-dit, commune...',
        openLSGeocodeUrl: "https://data.geopf.fr/geocodage/search",
        geocodeParams: {},
        geocodeAdapter: function(response) {
            return (response.features || []).map(function(f) {
                var zoomByType = { municipality: 13, street: 17, housenumber: 18 };
                return {
                    label: f.properties.label,
                    coords: f.geometry.coordinates,
                    score: f.properties.score || 0,
                    zoom: zoomByType[f.properties.type] || 16
                };
            });
        },
        layersBackground: [
            new ol.layer.Tile({
                source: new ol.source.WMTS((function() {
                    var proj = ol.proj.get('EPSG:3857');
                    var ext = proj.getExtent();
                    var res = [156543.03392811998,78271.51696419998,39135.758481959984,19567.879241008988,9783.939620504494,4891.969810252247,2445.9849051261233,1222.9924525765016,611.4962262882508,305.74811314412537,152.87405657206268,76.43702828603134,38.21851414301567,19.109257071507836,9.554628535753918,4.777314267876959,2.3886571339384795,1.1943285669692398,0.5971642834846199,0.29858214174231994];
                    var ids = ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19'];
                    return {
                        attributions: ['IGN-F/Géoportail'],
                        url: 'https://data.geopf.fr/wmts',
                        layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
                        matrixSet: 'PM',
                        format: 'image/jpeg',
                        projection: proj,
                        tileGrid: new ol.tilegrid.WMTS({ origin: ol.extent.getTopLeft(ext), resolutions: res, matrixIds: ids }),
                        style: 'normal',
                        crossOrigin: 'anonymous'
                    };
                })()),
                title: 'Photo aérienne (BDORTHO)'
            }),
            new ol.layer.Tile({
                source: new ol.source.OSM(),
                title: 'OpenStreetMap'
            })
        ],
        layersOverlay: [
            new ol.layer.Tile({
                source: new ol.source.XYZ({
                    attributions: ['IGN-F/Géoportail'],
                    url: 'https://data.geopf.fr/tms/1.0.0/GEOGRAPHICALNAMES.NAMES/{z}/{x}/{y}.png',
                    minZoom: 6,
                    maxZoom: 18,
                    crossOrigin: 'anonymous'
                }),
                opacity: 1,
                title: 'Noms de lieux (IGN)'
            })
        ],
        backgroundPresets: [
            { lb: 0, lo: -1, title: 'Photo aérienne' },
            { lb: 0, lo: 0,  title: 'Photo aérienne + noms de lieux' },
            { lb: 1, lo: -1, title: 'OpenStreetMap' }
        ]
    }, window.SViewerHardConfig, window.customConfig || {});

    var hardConfig = window.SViewerHardConfig;

    // Spinner for the impatients
    var svSpinner = {
        show: function() {
            $('#sv-spinner').addClass('show');
            loadingBar.start();
        },
        hide: function() {
            $('#sv-spinner').removeClass('show');
            loadingBar.end();
        }
    };

    var loadingBar = (function() {
        var count = 0;
        var bar = null;
        function el() {
            if (!bar) { bar = document.getElementById('sv-loading-bar'); }
            return bar;
        }
        return {
            start: function() {
                count++;
                var b = el();
                if (b) { b.style.display = 'block'; b.removeAttribute('aria-hidden'); }
            },
            end: function() {
                if (--count <= 0) {
                    count = 0;
                    var b = el();
                    if (b) { b.style.display = 'none'; b.setAttribute('aria-hidden', 'true'); }
                }
            }
        };
    }());

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
        _el: function(id) {
            return document.getElementById(id.replace(/^#/, ''));
        },
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
            script.src = (window.SViewerBaseUrl || '') + 'static/lib/qrcode/qrcode.min.js';
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
    var vectorLayer;
    var _onReadyCallbacks = [];

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

            var layerParts = layerPart.split('*', 3);
            self.options.nslayername = layerParts[0];
            self.options.stylename   = layerParts.length > 1 ? layerParts[1] : '';
            self.options.cql_filter  = layerParts.length > 2 ? layerParts[2] : '';

            self.options.namespace = (self.options.nslayername.indexOf(":")>0) ? self.options.nslayername.split(':',2)[0]:''; // namespace
            self.options.layername = (self.options.nslayername.indexOf(':')>0) ? self.options.nslayername.split(':',2)[1] : self.options.nslayername; // layername

            if (customWmsUrl) {
                if (!isDomainAllowed(customWmsUrl)) {
                    console.warn('sViewer: blocked WMS URL not in allowedDomains:', customWmsUrl);
                    return;
                }
                // Use custom WMS endpoint — namespace not required for alien WMS
                self.options.wmsurl_global = customWmsUrl;
                self.options.wmsurl_ns = customWmsUrl;
                self.options.wmsurl_layer = customWmsUrl;
            } else {
                // Use default geOrchestra endpoints — namespace required
                if (!self.options.namespace) {
                    console.warn('Layer parameter format error: namespace required for geOrchestra layers, expected "namespace:layername", got "' + s + '"');
                    return;
                }
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
        }

        /**
         * Creates the ol3 WMS layer
         */
        function createLayer() {
            var wms_params = {
                'url': self.options.wmsurl_ns,
                crossOrigin: 'anonymous',
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
            var wmsSource = new ol.source.TileWMS(wms_params);
            wmsSource.on('tileloadstart', function() { loadingBar.start(); });
            wmsSource.on('tileloadend',   function() { loadingBar.end(); _emit('sv:layerLoad', { layer: self }); });
            wmsSource.on('tileloaderror', function() { loadingBar.end(); });
            self.wmslayer = new ol.layer.Tile({
                opacity: isNaN(self.options.opacity)?1:self.options.opacity,
                source: wmsSource
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
                        $('#sv-legend-content').append(panel);
                        log('Legend appended to DOM');

                        var xmlMetaUrl = null;
                        if (Object.prototype.hasOwnProperty.call(mdLayer, 'MetadataURL')) {
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
            return $(Mustache.render(window.SViewerTemplates['sv-layer-panel'], {
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

    /* Returns true when config.allowedDomains is absent/empty (allow-all) or the URL hostname
       matches an entry exactly or as a subdomain. Prevents SSRF to attacker-controlled OGC servers. */
    function isDomainAllowed(url) {
        if (!config.allowedDomains || !config.allowedDomains.length) { return true; }
        try {
            var host = new URL(url).hostname;
            return config.allowedDomains.some(function(d) {
                return host === d || host.slice(-(d.length + 1)) === '.' + d;
            });
        } catch(_e) { return false; }
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
        var cswBase = hardConfig.geOrchestraBaseUrl + '/geonetwork/srv/eng/csw';
        var atIdx = metadataId.indexOf('@http');
        if (atIdx !== -1) {
            cswBase = metadataId.slice(atIdx + 1);
            metadataId = metadataId.slice(0, atIdx);
        }
        var url = cswBase + '?' + $.param({
            SERVICE: 'CSW',
            VERSION: '2.0.2',
            REQUEST: 'GetRecordById',
            Id: metadataId,
            ElementSetName: 'full',
            OutputSchema: 'http://www.isotc211.org/2005/gmd'
        });
        loadingBar.start();
        $.ajax({
            url: ajaxURL(url),
            type: 'GET',
            dataType: 'xml',
            success: function(xmlDoc) {
                var result = parseCSWForWMS(xmlDoc);
                if (result) {
                    callback(result.wmsUrl, result.layername, xmlDoc);
                } else {
                    $('#sv-legend-content').append($('<div class="alert alert-warning mt-2">').text(tr('msg.csw_no_wms')));
                }
            },
            error: function(xhr, status, error) {
                log('CSW GetRecordById failed:', status, error);
                $('#sv-legend-content').append($('<div class="alert alert-warning mt-2">').text(tr('msg.csw_error')));
            },
            complete: function() { loadingBar.end(); }
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
                if (!isDomainAllowed(wmsUrl)) {
                    console.warn('sViewer: blocked CSW-extracted WMS URL not in allowedDomains:', wmsUrl);
                    return null;
                }
                return { wmsUrl: wmsUrl, layername: layername };
            }
        }
        return null;
    }

    function parseISOMetadata(xmlDoc) {
        var root = xmlDoc.documentElement;
        var xt = function(node, xpath) { return isoXt(xmlDoc, node, xpath); };
        var xr = function(node, xpath) {
            return xmlDoc.evaluate(xpath, node, isoNsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        };
        var dateRaw = xt(root, '//gmd:dateStamp/gco:DateTime') ||
                      xt(root, '//gmd:dateStamp/gco:Date');
        var dateFormatted = null;
        if (dateRaw) {
            var d = new Date(dateRaw);
            dateFormatted = isNaN(d.getTime()) ? dateRaw : d.toLocaleDateString(config.lang);
        }
        var idInfo = xr(root, '//gmd:identificationInfo');
        var producer = idInfo ? xt(idInfo, './/gmd:pointOfContact//gmd:organisationName/gco:CharacterString') : null;
        var email = idInfo ? xt(idInfo, './/gmd:pointOfContact//gmd:electronicMailAddress/gco:CharacterString') : null;
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
        return $(Mustache.render(window.SViewerTemplates['sv-iso-table'], {
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
     * Translates strings
     * @param {String} s input string
     * @return {String} translated string
     */
    function tr(s) {
        var t = (typeof hardConfig.i18n[config.lang][s] === 'string') ? hardConfig.i18n[config.lang][s] : s;
        // Replace {0}, {1}, … with extra arguments passed to tr().
        for (var i = 1; i < arguments.length; i++) {
            t = t.replace('{' + (i - 1) + '}', arguments[i]);
        }
        return t;
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
            content = $("#sv-frame-map"),
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
            if (p.length !== 2) {
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
     * Cycles to the next background preset (preset mode) or next background layer (legacy mode).
     * Preset mode: config.backgroundPresets defined — each preset is {lb, lo} driving both
     *   layersBackground[lb] and layersOverlay[lo] atomically. state.lb = preset index.
     * Legacy mode: config.layersBackground only — cycles backgrounds independently, no overlay.
     *   layersBackground is deprecated; prefer backgroundPresets in new configs.
     * @param {Integer} idx optional preset/layer index to jump to directly
     */
    function switchBackground(idx) {
        if (config.backgroundPresets && config.backgroundPresets.length) {
            // preset mode
            var presets = config.backgroundPresets;
            var n = presets.length;
            state.lb = typeof idx === 'number' ? idx % n : (state.lb + 1) % n;
            var preset = presets[state.lb];

            $.each(config.layersBackground, function(i, layer) {
                layer.setVisible(i === preset.lb);
            });
            if (config.layersOverlay) {
                $.each(config.layersOverlay, function(i, layer) {
                    layer.setVisible(i === preset.lo);
                });
            }
        } else {
            // legacy mode: cycle layersBackground only
            var bgLayers = config.layersBackground;
            var nb = bgLayers.length;
            var lv = 0;
            $.each(bgLayers, function(i, layer) {
                if (layer.getVisible()) { lv = i; }
                layer.setVisible(false);
            });
            state.lb = typeof idx === 'number' ? idx % nb : (lv + 1) % nb;
            bgLayers[state.lb].setVisible(true);
        }
        setPermalink();
    }

    /**
     * Method: setPermalink
     * keeps permalinks synchronized with the map extent
     */
    function setPermalink () {
        // permalink, social links & QR code update only if share panel is visible
        if ($('#sv-panel-share').is(':visible')) {
            var permalinkQuery;
            var c = view.getCenter();
            var linkParams = {};
            linkParams.x = encodeURIComponent(Math.round(c[0]));
            linkParams.y = encodeURIComponent(Math.round(c[1]));
            linkParams.z = encodeURIComponent(view.getZoom());
            if (state.gficoord && state.gfiok) {
                linkParams.q = '1';
            }
            linkParams.lb = encodeURIComponent(state.lb);
            if (config.customConfigName) { linkParams.c = config.customConfigName; }
            if (state.search) { linkParams.s = '1'; }
            if (config.layersQueryString) { linkParams.layers = config.layersQueryString; }
            if (config.metadataIds && config.metadataIds.length && !config.layersQueryString) { linkParams.md = config.metadataIds.join(','); }
            if (state.theme && state.theme !== 'light') { linkParams.theme = state.theme; }
            if (state.position) { linkParams.position = '1'; }
            if (state.opacity !== null && state.opacity !== 1) { linkParams.opacity = state.opacity; }
            if (state.geojson) { linkParams.geojson = state.geojson; }
            if (state.label) { linkParams.label = state.label; }
            if (config.title) { linkParams.title = config.title; }
            // In embed mode, permalink must point to the standalone sViewer, not the host page
            var standaloneBase = window.SViewerBaseUrl
                ? window.SViewerBaseUrl + 'index.html'
                : window.location.origin + window.location.pathname;
            permalinkQuery = standaloneBase + "?" + $.param(linkParams);

            $('#sv-permalink-url')
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
    function generateIframeCode() {
        var href = $('#sv-permalink-url').prop('href');
        return '<iframe src="' + href + '" width="100%" height="500" frameborder="0" allowfullscreen></iframe>';
    }

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
        if (config.metadataIds && config.metadataIds.length && !config.layersQueryString) {
            embedParams.md = config.metadataIds.join(',');
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
        if (state.position) {
            embedParams.position = 1;
        }
        if (state.opacity !== null && state.opacity !== 1) {
            embedParams.opacity = state.opacity;
        }
        if (state.geojson) {
            embedParams.geojson = state.geojson;
        }
        var baseUrl = window.SViewerBaseUrl || config.baseUrl || window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
        var code = '<div id="sviewer-map" style="width: 100%; height: 500px;"></div>\n' +
                   '<script src="' + baseUrl + 'static/js/embed.min.js"></script>\n' +
                   '<script>\n' +
                   '  SViewer.init("#sviewer-map", ' + JSON.stringify(embedParams, null, 2).split('\n').join('\n    ') + ');\n' +
                   '</script>';
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
                var results = config.geocodeAdapter(response);
                if (results.length > 0) {
                    var items = results.map(function(r) {
                        var coords = ol.proj.transform(r.coords, 'EPSG:4326', config.projcode);
                        return renderSearchItem(
                            { label: r.label, icon: 'bi-geo-alt-fill' },
                            { extent: [], coordinates: coords, zoom: r.zoom }
                        );
                    });
                    $('#sv-search-results')
                        .prepend(items)
                        .prepend(Mustache.render(window.SViewerTemplates['sv-search-header'], { label: tr('lbl.geocode_results') }));
                }
            } catch(_err) {
                $('#sv-locate-msg').text(tr('msg.geolocation_failed'));
            }
        }

        function onGeocodeFailure(xhr) {
            if (xhr.statusText === 'abort') { return; }
            $('#sv-locate-msg').text(tr('msg.geolocation_failed'));
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
                openLsXhr = $.ajax({
                    url: config.openLSGeocodeUrl,
                    type: 'GET',
                    dataType: 'json',
                    data: $.extend({ q: q, limit: config.maxGeocodeResults, bbox: bbox.join(',') }, config.geocodeParams || {}),
                    success: onGeocodeSuccess,
                    error: onGeocodeFailure
                });
                svSpinner.show();
            }
        } catch(_err) {
            messagePopup(tr('msg.geolocation_failed'));
            svSpinner.hide();
        }
    }

    /**
     * Silent auto-geocode for ?address= param.
     * High-confidence result (score >= 0.8): centers map silently.
     * Ambiguous result: opens search panel with results listed.
     */
    function autoGeocodeAddress(text) {
        var bbox = ol.proj.transformExtent(
            config.initialExtent,
            map.getView().getProjection().getCode(),
            'EPSG:4326'
        );
        $.ajax({
            url: config.openLSGeocodeUrl,
            type: 'GET',
            dataType: 'json',
            data: $.extend({ q: text.trim(), limit: config.maxGeocodeResults, bbox: bbox.join(',') }, config.geocodeParams || {}),
            success: function(response) {
                var results = config.geocodeAdapter(response);
                if (!results.length) { return; }
                var best = results[0];
                if (best.score >= 0.8) {
                    var coords = ol.proj.transform(best.coords, 'EPSG:4326', config.projcode);
                    marker.setPosition(coords);
                    view.setCenter(coords);
                    view.setZoom(best.zoom);
                    $('#sv-marker').show();
                } else {
                    // Ambiguous — fall back to interactive search panel
                    $('#sv-search-input').val(text);
                    togglePanel('locate');
                    openLsRequest(text);
                }
            }
        });
    }

    // Build an OL vector layer from a feature array using geojsonStyle config.
    // options.styleOverride: ol.style.StyleFunction — skips built-in style when provided.
    function _buildVectorLayer(features, options) {
        options = options || {};
        if (vectorLayer) { map.removeLayer(vectorLayer); }
        var vectorSource = new ol.source.Vector({ features: features });
        if (options.styleOverride) {
            vectorLayer = new ol.layer.Vector({ source: vectorSource, style: options.styleOverride });
        } else {
            var gs = config.geojsonStyle || {};
            var gsColor = gs.color || '#ff6600';
            var gsFill = ol.color.asArray(gsColor).slice();
            gsFill[3] = gs.fillOpacity !== undefined ? gs.fillOpacity : 0.35;
            var gsStrokeWidth = gs.strokeWidth || 4;
            // Per-type styles: lines and polygon strokes get a white halo underneath for contrast.
            var gsStylePoint = new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 9,
                    fill:   new ol.style.Fill({ color: gsColor }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 1.5 })
                })
            });
            var gsStylePolyHalo  = new ol.style.Style({ stroke: new ol.style.Stroke({ color: '#fff', width: gsStrokeWidth + 2 }) });
            var gsStylePoly      = new ol.style.Style({ fill: new ol.style.Fill({ color: gsFill }), stroke: new ol.style.Stroke({ color: gsColor, width: gsStrokeWidth }) });
            var gsStyleLineHalo  = new ol.style.Style({ stroke: new ol.style.Stroke({ color: '#fff', width: gsStrokeWidth + 2 }) });
            var gsStyleLine      = new ol.style.Style({ stroke: new ol.style.Stroke({ color: gsColor, width: gsStrokeWidth }) });
            vectorLayer = new ol.layer.Vector({
                source: vectorSource,
                style: function(feature, resolution) {
                    var lbl = feature.get('_label');
                    var showLabel = lbl !== undefined && lbl !== null && lbl !== '' && resolution <= 19.11;
                    var type = feature.getGeometry() ? feature.getGeometry().getType() : '';
                    var isLine = type === 'LineString' || type === 'MultiLineString';
                    var isPoly = type === 'Polygon' || type === 'MultiPolygon';
                    var base;
                    if (isLine) {
                        base = [gsStyleLineHalo, gsStyleLine];
                    } else if (isPoly) {
                        base = [gsStylePolyHalo, gsStylePoly];
                    } else {
                        base = [gsStylePoint];
                    }
                    if (!showLabel) { return base; }
                    var labelStyle = new ol.style.Style({
                        text: new ol.style.Text({
                            text: String(lbl),
                            font: 'bold 13px sans-serif',
                            fill: new ol.style.Fill({ color: '#222' }),
                            stroke: new ol.style.Stroke({ color: '#fff', width: 3 }),
                            offsetY: isLine || isPoly ? 0 : -14
                        })
                    });
                    return base.concat([labelStyle]);
                }
            });
        }
        map.addLayer(vectorLayer);
        return vectorLayer;
    }

    var _selectedVectorFeature = null;

    function _buildPropertiesTable(props) {
        var $tbody = $('<tbody>');
        $.each(props, function(key, val) {
            if (key === 'geometry' || typeof val === 'object') { return; }
            if (key.charAt(0) === '_') { return; }
            if (val === null || val === undefined || val === '') { return; }
            $tbody.append($('<tr>').append($('<th scope="row">').text(key).attr('title', key)).append($('<td>').text(val)));
        });
        return $('<table class="table table-sm table-bordered sv-feature-props" role="table">').append($tbody);
    }

    function _buildSelectionStyle(feature) {
        var gs = config.geojsonStyle || {};
        var selColor = gs.selectionColor || '#ee7733';
        var sw = (gs.strokeWidth || 4) + 1;
        var type = feature.getGeometry() ? feature.getGeometry().getType() : '';
        var isLine = type === 'LineString' || type === 'MultiLineString';
        var isPoly = type === 'Polygon' || type === 'MultiPolygon';
        var fillArr = ol.color.asArray(selColor).slice();
        fillArr[3] = gs.fillOpacity !== undefined ? gs.fillOpacity : 0.35;
        var haloStyle = new ol.style.Style({ stroke: new ol.style.Stroke({ color: '#fff', width: sw + 2 }) });
        var colorStyle = new ol.style.Style({
            fill:   (isLine) ? null : new ol.style.Fill({ color: isLine ? null : 'rgba(' + fillArr.join(',') + ')' }),
            stroke: new ol.style.Stroke({ color: selColor, width: sw }),
            image:  (!isLine && !isPoly) ? new ol.style.Circle({
                radius: 11,
                fill:   new ol.style.Fill({ color: selColor }),
                stroke: new ol.style.Stroke({ color: '#fff', width: 1.5 })
            }) : null
        });
        return isLine || isPoly ? [haloStyle, colorStyle] : colorStyle;
    }

    function _clearVectorSelection() {
        if (_selectedVectorFeature) {
            _selectedVectorFeature.setStyle(null);
            _selectedVectorFeature = null;
        }
    }

    // Wire the singleclick handler on the current vectorLayer.
    // Shows feature properties in query panel + emits sv:featureClick / sv:featureSelect.
    // Must be called once per layer rebuild (OL event listeners are per-map, not per-layer,
    // so we track the active layer via closure over vectorLayer).
    var _vectorClickBound = false;
    function _bindVectorClick() {
        if (_vectorClickBound) { return; }
        _vectorClickBound = true;
        map.on('singleclick', function(e) {
            if (!vectorLayer) { return; }
            var hit = false;
            map.forEachFeatureAtPixel(e.pixel, function(feature) {
                if (hit) { return; }
                hit = true;
                _clearVectorSelection();
                _selectedVectorFeature = feature;
                feature.setStyle(_buildSelectionStyle(feature));
                var props = feature.getProperties();
                $('#sv-query-content').html('').append(_buildPropertiesTable(props));
                marker.setPosition(e.coordinate);
                $('#sv-marker').show();
                closePanel();
                togglePanel('query');
                _emit('sv:featureClick', { feature: feature, coordinate: e.coordinate, properties: props });
                _emit('sv:featureSelect', { feature: feature, properties: props });
            }, { layerFilter: function(l) { return l === vectorLayer; }, hitTolerance: 8 });
            if (!hit) { _clearVectorSelection(); }
        });
    }

    // Select feature by OL feature id (set via feature.setId()). Zooms to feature,
    // shows properties panel, emits sv:featureSelect.
    function selectFeatureById(id) {
        if (!vectorLayer) { return; }
        if (id === null || id === undefined) {
            closePanel();
            _emit('sv:featureSelect', { feature: null, properties: null });
            return;
        }
        var feature = vectorLayer.getSource().getFeatureById(id);
        if (!feature) { return; }
        var geom = feature.getGeometry();
        if (geom) { view.fit(geom.getExtent(), { maxZoom: 16, duration: 400, padding: [40,40,40,40] }); }
        var props = feature.getProperties();
        $('#sv-query-content').html('').append(_buildPropertiesTable(props));
        closePanel();
        togglePanel('query');
        _emit('sv:featureSelect', { feature: feature, properties: props });
    }

    // Load pre-built OL Feature objects directly into the map (no fetch, no reprojection).
    // features: OL Feature array, already in map projection.
    // options.styleOverride: ol.style.StyleFunction — use widget's own style function.
    // options.fitExtent: boolean — zoom to fit features after load (default false).
    function loadFeatureObjects(features, options) {
        options = options || {};
        if (!features || !features.length) { return; }
        _buildVectorLayer(features, options);
        _bindVectorClick();
        if (options.fitExtent) {
            var ext = vectorLayer.getSource().getExtent();
            if (ext && isFinite(ext[0])) { view.fit(ext, { maxZoom: 16, duration: 400, padding: [40,40,40,40] }); }
        }
        _emit('sv:featuresLoaded', { features: features, count: features.length });
        log('loadFeatureObjects: loaded', features.length, 'features');
    }

    // Auto-simplify vector features when total vertex count exceeds device threshold.
    // Runs once on load; skips Point/MultiPoint (no vertices to remove).
    var _SIMPLIFY_POINT_TYPES = { 'Point': true, 'MultiPoint': true };
    function _simplifyFeatures(features) {
        var isMobile = window.innerWidth < 768 || window.devicePixelRatio > 1.5;
        var threshold = isMobile ? 25000 : 100000;
        var tolerance  = isMobile ? 10    : 20;    // meters, EPSG:3857
        var t0 = Date.now();
        var totalBefore = 0;
        features.forEach(function(f) {
            var g = f.getGeometry();
            if (!g || _SIMPLIFY_POINT_TYPES[g.getType()]) { return; }
            totalBefore += g.getFlatCoordinates().length / 2;
        });
        if (totalBefore <= threshold) {
            log('_simplifyFeatures: skip (', totalBefore, 'vertices <=', threshold, ')');
            return features;
        }
        var totalAfter = 0;
        features.forEach(function(f) {
            var g = f.getGeometry();
            if (!g || _SIMPLIFY_POINT_TYPES[g.getType()]) { return; }
            var simplified = g.simplify(tolerance);
            f.setGeometry(simplified);
            totalAfter += simplified.getFlatCoordinates().length / 2;
        });
        log('_simplifyFeatures:', totalBefore, '->', totalAfter, 'vertices | tolerance=', tolerance, 'm | device=', isMobile ? 'mobile' : 'desktop', '|', (Date.now() - t0), 'ms');
        return features;
    }

    /**
     * Loads an external GeoJSON URL as a vector layer.
     * Points, lines and polygons all supported. Features are clickable — properties
     * displayed as a table in the query panel (same UX as WMS GetFeatureInfo).
     */
    // Shared: parse a GeoJSON FeatureCollection into OL features + build layer.
    function _applyGeoJSON(geojson, sourceUrl, adapter) {
        var format = new ol.format.GeoJSON();
        var features = format.readFeatures(geojson, {
            dataProjection: 'EPSG:4326',
            featureProjection: config.projcode
        });
        if (!features.length) { return; }
        features = features.filter(function(f) {
            var g = f.getGeometry();
            if (!g) { return false; }
            try { g.getType(); return true; }
            catch(_e) { return false; }
        });
        log('_applyGeoJSON: OL features after reprojection filter=', features.length);
        if (state.label) {
            features.forEach(function(f) { f.set('_label', f.get(state.label)); });
        }
        features = _simplifyFeatures(features);
        _buildVectorLayer(features, {});
        _bindVectorClick();
        _renderGeoJSONInfoPanel(features.length, sourceUrl || state.geojson, adapter);
        _emit('sv:featuresLoaded', { features: features, count: features.length });
    }

    function _sourceLabel(url, adapter) {
        if (adapter && typeof adapter.label === 'function') { return adapter.label(url); }
        if (!url) { return 'GeoJSON'; }
        try {
            var u = new URL(url);
            return decodeURIComponent(u.pathname.split('/').pop()) || u.hostname;
        } catch(_e) { return 'GeoJSON'; }
    }

    function _renderGeoJSONInfoPanel(count, sourceUrl, adapter) {
        if (!window.SViewerTemplates || !window.SViewerTemplates['sv-layer-panel']) { return; }
        var $card = $(Mustache.render(window.SViewerTemplates['sv-layer-panel'], {
            title:        _sourceLabel(sourceUrl, adapter),
            featureCount: count,
            labelCount:   tr('msg.feature_count'),
            labelSource:  tr('msg.source_url'),
            sourceUrl:    sourceUrl || null
        })).attr('id', 'sv-geojson-info');
        var $existing = $('#sv-geojson-info');
        if ($existing.length) { $existing.replaceWith($card); }
        else { $('#sv-legend-content').prepend($card); }
    }

    // url: GeoJSON URL to fetch. geojsonDirect: pre-parsed FeatureCollection (skips fetch).
    function loadGeoJSON(url, geojsonDirect) {
        // Direct data path — skip fetch entirely.
        if (geojsonDirect) {
            log('loadGeoJSON: direct data, features=', geojsonDirect.features ? geojsonDirect.features.length : '?');
            _applyGeoJSON(geojsonDirect);
            return;
        }
        // Warn early if _format hint names an adapter that is not loaded.
        var formatHint = (function() { try { return new URL(url).searchParams.get('_format'); } catch(_e) { return null; } }());
        if (formatHint) {
            var hintedAdapter = (window.SViewerAdapters || {})[formatHint];
            if (!hintedAdapter) {
                messagePopup(tr('msg.adapter_not_loaded', formatHint));
                log('_format hint "' + formatHint + '" found but adapter not loaded — add to customConfig adapters[]');
                return;
            }
        }
        // Check if any loaded adapter needs raw text instead of parsed JSON (e.g. CSV adapter).
        var textAdapter = null;
        var matchedAdapter = null;
        var adapters = window.SViewerAdapters || {};
        for (var adName in adapters) {
            if (adapters[adName].wantsText && adapters[adName].match && adapters[adName].match(url)) {
                textAdapter = adapters[adName];
                matchedAdapter = textAdapter;
                break;
            }
        }
        log('loadGeoJSON:', url, '| textAdapter:', textAdapter ? 'yes' : 'no', '| adapters loaded:', Object.keys(adapters).join(',') || 'none');
        $.ajax({
            url: url,
            type: 'GET',
            dataType: textAdapter ? 'text' : 'json',
            success: function(data) {
                // Text adapters (e.g. CSV) receive raw string; dispatch directly.
                var geojson = textAdapter ? textAdapter.convert(data, url) : (
                // Non-GeoJSON response → normalize via registered adapters (customConfig.adapters)
                (data && data.type === 'FeatureCollection') ? data : (function() {
                    var jsonAdapters = window.SViewerAdapters || {};
                    for (var name in jsonAdapters) {
                        var a = jsonAdapters[name];
                        if (a.wantsText) { continue; } // text adapters already handled above
                        if (a.match && !a.match(url)) { continue; }
                        var result = a.convert(data, url);
                        if (result) { matchedAdapter = a; return result; }
                    }
                    // Legacy: single-function adapter in customConfig
                    return (typeof config.jsonLayerAdapter === 'function') ? config.jsonLayerAdapter(data, url) : null;
                }()));
                log('loadGeoJSON: geojson features=', geojson ? geojson.features.length : 'null (no adapter matched or conversion failed)');
                if (!geojson) {
                    messagePopup(tr('msg.query_failed'));
                    return;
                }
                _applyGeoJSON(geojson, url, matchedAdapter);
            },
            error: function() {
                messagePopup(tr('msg.query_failed'));
            }
        });
    }

    /**
     * getFeatureInfo
     */
    function queryMap(coord) {
        state.gficoord = coord;
        state.gfiok = false;
        state.gfiz = view.getZoom();
        var viewResolution = view.getResolution();

        marker.setPosition(state.gficoord);
        $('#sv-marker').show();
        view.animate({center: state.gficoord, duration: 1000});
        closePanel();
        $('#sv-query-content').html('');

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
            var domResponse = $(Mustache.render(window.SViewerTemplates['sv-query-header'], { title: this.md.title }));
            $('#sv-query-content').append(domResponse);
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
                        /* parseHTML(html, ctx, false) parses without executing scripts — prevents XSS
                           from attacker-controlled WMS servers returning malicious GetFeatureInfo HTML */
                        $(this).append($.parseHTML(response, document, false));
                        state.gfiok = true;
                        $('#panelQuery a').attr("rel","external");
                        togglePanel('query');
                    }
                    else {
                        // empty response: keep panel closed, notify via toast
                        $(this).remove();
                        messagePopup(tr('msg.no_item_found'));
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
    function setQueryEmptyHint() {
        $('#sv-query-content').html(
            $('<p class="sv-noitem">').text(tr('lbl.query_the_map'))
        );
    }

    function clearQuery() {
        $('#sv-marker').hide('fast');
        closePanel();
        setQueryEmptyHint();
        state.gficoord = null;
        state.gfiz = null;
        state.gfiok = false;
    }


    function xmlEscape(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
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
                    '<ogc:Literal>*' + xmlEscape(value) + '*</ogc:Literal></ogc:PropertyIsLike>');
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
                loadingBar.start();
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
                    },
                    complete: function() { loadingBar.end(); }
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
        if (data.extent.length === 4 && !(data.extent[0] === data.extent[2] && data.extent[1] === data.extent[3])) {
            view.fit(data.extent);
        } else {
            view.setCenter(data.coordinates);
            view.setZoom(data.zoom || 16);
        }
        $('#sv-marker').show();
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
    var searchItemIdx = 0;

    function renderSearchItem(templateData, clickData) {
        if (!templateData.ariaLabel) {
            templateData.ariaLabel = templateData.label || '—';
        }
        templateData.idx = searchItemIdx++;
        return $(Mustache.render(window.SViewerTemplates['sv-search-item'], templateData))
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
    var WFS_TITLE_FIELD_HINTS = ['titre', 'title', 'nom', 'name', 'label', 'libelle', 'libellé', 'denomination', 'dénomination', 'designation', 'désignation'];

    function detectTitleField(keys) {
        var lower = keys.map(function(k) { return k.toLowerCase(); });
        for (var i = 0; i < WFS_TITLE_FIELD_HINTS.length; i++) {
            var idx = lower.indexOf(WFS_TITLE_FIELD_HINTS[i]);
            if (idx >= 0) { return keys[idx]; }
        }
        /* fallback: first string key that isn't an id/fid/gid */
        for (var j = 0; j < keys.length; j++) {
            if (!/^(f?id|gid|objectid|pk)\b/i.test(keys[j])) { return keys[j]; }
        }
        return null;
    }

    function isNilValue(val) {
        if (val === null || val === undefined) { return true; }
        var s = String(val).trim().toLowerCase();
        return s === '' || s === 'nil' || s === 'null' || s === 'undefined';
    }

    function featuresToList(features, label) {
        var $results = $("#sv-search-results");
        $results.append(Mustache.render(window.SViewerTemplates['sv-search-header'], {
            label: label || tr('msg.top_layer')
        }));

        $.each(features, function(i, feature) {
            var geom       = feature.getGeometry(),
                props      = feature.getProperties(),
                fieldItems = [],
                titleField = detectTitleField(Object.keys(props));

            $.map(props, function(val, key) {
                /* skip geometry objects (ol.geom.*); null check required first: typeof null === 'object' in JS */
                if (val !== null && typeof val === 'object' && typeof val.getType === 'function') { return; }
                if (isNilValue(val)) { return; }
                if (key === titleField) { return; } /* rendered separately as label */
                var str = (val instanceof Date) ? val.toISOString().substring(0, 10) : String(val);
                fieldItems.push({ key: key, val: str });
            });

            var titleVal = titleField && !isNilValue(props[titleField]) ? String(props[titleField]) : '';
            /* fallback ariaLabel from fields if no title found */
            var ariaLabel = titleVal || fieldItems.map(function(f) { return f.val; }).join(', ');
            var center = geom.getType() === 'Point' ? geom.getCoordinates() : ol.extent.getCenter(geom.getExtent());
            renderSearchItem(
                { label: titleVal, ariaLabel: ariaLabel, icon: 'bi-database', fields: fieldItems.length ? [{ items: fieldItems }] : [] },
                { extent: geom.getExtent(), coordinates: center, queryGFI: true }
            ).appendTo($results);
        });
    }

    var searchXhrs = [];

    function abortSearchXhrs() {
        $.each(searchXhrs, function() { this.abort(); });
        searchXhrs = [];
    }

    function clearSearchResults() {
        abortSearchXhrs();
        $('#sv-search-results').html('');
        $('#sv-search-input').attr('aria-expanded', 'false').attr('aria-activedescendant', '');
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
        searchItemIdx = 0;
        $("#sv-search-results").html("");
        $('#sv-locate-msg').text('');
        $('#sv-search-input').attr('aria-expanded', 'true').attr('aria-activedescendant', '');
        try {
            openLsRequest($("#sv-search-input").val());
            if (state.search) {
                searchAllWFSLayers($("#sv-search-input").val());
            }
        }
        catch(_err) {
            messagePopup(tr('msg.geolocation_failed'));
            svSpinner.hide();
        }
        // after all in-flight searches settle, show "no results" if list still empty
        var poll = setInterval(function() {
            pruneSearchXhrs();
            var openLsDone = !openLsXhr || openLsXhr.readyState === 4;
            if (searchXhrs.length === 0 && openLsDone) {
                clearInterval(poll);
                if ($("#sv-search-results").is(':empty')) {
                    $('#sv-locate-msg').text(tr('msg.no_item_found'));
                    $('#sv-search-input').attr('aria-expanded', 'false');
                }
            }
        }, 200);
        return false;
    }

    // panel size and placement to fit small screens
    function panelLayout (_e) {
        var panel = $(this);
        panel.css('max-width', Math.min($(window).width() - 44, 450) + 'px');
        panel.css('max-height', $(window).height() - 64 + 'px');
    }

    function resetPanel() {
        var sidepanel = $('#sv-sidepanel');
        sidepanel.find('.sv-panel-section').hide();
        sidepanel.removeClass('active');
        $('#sv-panel-controls .sv-panel-toggle').removeClass('active').attr('aria-pressed', 'false');
        $('#sv-frame-map').removeClass('sv-panel-open');
    }

    function togglePanel(panelName) {
        var sidepanel = $('#sv-sidepanel');
        var targetSection = sidepanel.find('[data-sv-section="' + panelName + '"]');
        var button = $('[data-sv-panel="' + panelName + '"]');
        if (button.hasClass('active') || targetSection.is(':visible')) {
            resetPanel();
            return;
        }
        resetPanel();
        targetSection.show();
        button.addClass('active').attr('aria-pressed', 'true');
        sidepanel.addClass('active');
        $('#sv-frame-map').addClass('sv-panel-open');
        if (panelName === 'share') { setPermalink(); }
        if (panelName === 'locate') { setTimeout(function() { $('#sv-search-input').focus(); }, 50); }
        if (panelName === 'query' && !$('#sv-query-content').text().trim()) { setQueryEmptyHint(); }
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
   function setTitle(title, silent) {
        config.title = title;
        document.title = config.title;
       if (config.title!=='') {
            $('#sv-panel-share-title').text(config.title);
       }
        if ($("#sv-share-title").val()==='') {
            $("#sv-share-title").val(config.title);
        }
        if (!silent && typeof SViewer.onTitleChange === 'function') {
            SViewer.onTitleChange(title);
        }
    }

    // updates title on keypress
    function onTitle(_e) {
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

    // GPS tracking state
    var gpsWatchId = null;
    var gpsAutoStopTimer = null;
    var gpsLayer = null;
    var gpsAccuracyFeature = null;

    function initGpsLayer() {
        gpsAccuracyFeature = new ol.Feature();
        gpsAccuracyFeature.setStyle(new ol.style.Style({
            fill:   new ol.style.Fill({ color: 'rgba(37, 99, 235, 0.12)' }),
            stroke: new ol.style.Stroke({ color: 'rgba(37, 99, 235, 0.6)', width: 1.5 })
        }));
        gpsLayer = new ol.layer.Vector({
            source: new ol.source.Vector({ features: [gpsAccuracyFeature] }),
            zIndex: 999
        });
        map.addLayer(gpsLayer);
    }

    function gpsOnPosition(pos) {
        var p = ol.proj.transform([pos.coords.longitude, pos.coords.latitude], 'EPSG:4326', config.projcode);
        marker.setPosition(p);
        view.animate({ center: p, duration: 500 });
        var acc = pos.coords.accuracy || 0;
        if (acc > 0) {
            gpsAccuracyFeature.setGeometry(new ol.geom.Circle(p, acc));
        } else {
            gpsAccuracyFeature.setGeometry(null);
        }
        $('#sv-gps-accuracy').text(acc ? Math.round(acc) + 'm' : '').toggle(!!acc);
    }

    function gpsOnError() {
        messagePopup(tr('msg.position_error'));
        stopTracking();
    }

    function stopTracking() {
        if (gpsWatchId !== null) {
            navigator.geolocation.clearWatch(gpsWatchId);
            gpsWatchId = null;
        }
        if (gpsAutoStopTimer !== null) {
            clearTimeout(gpsAutoStopTimer);
            gpsAutoStopTimer = null;
        }
        if (gpsLayer !== null) {
            map.removeLayer(gpsLayer);
            gpsLayer = null;
            gpsAccuracyFeature = null;
        }
        $('#sv-btn-locate').attr('aria-pressed', 'false').removeClass('active');
        $('#sv-gps-accuracy').hide().text('');
        state.position = 0;
        setPermalink();
        messagePopup(tr('msg.gps_tracking_off'));
    }

    function startTracking() {
        if (!navigator.geolocation) {
            messagePopup(tr('msg.position_unavailable'));
            return;
        }
        initGpsLayer();
        messagePopup(tr('msg.estimating_position'));
        var interval = (config.gpsTrackingInterval || 5) * 1000;
        gpsWatchId = navigator.geolocation.watchPosition(
            gpsOnPosition,
            gpsOnError,
            { maximumAge: interval, enableHighAccuracy: true, timeout: 30000 }
        );
        $('#sv-btn-locate').attr('aria-pressed', 'true').addClass('active');
        state.position = 1;
        setPermalink();
        messagePopup(tr('msg.gps_tracking_on'));
        var timeout = config.gpsTrackingTimeout || 0;
        if (timeout > 0) {
            gpsAutoStopTimer = setTimeout(stopTracking, timeout * 1000);
        }
    }

    function toggleTracking() {
        if (gpsWatchId !== null) {
            stopTracking();
        } else {
            startTracking();
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
     * loads application profile located in local/customConfig_[configname].js
     * ie &c=cadastral& : loads local/customConfig_cadastral.js instead of customConfig.js
     * configname MUST MATCH ^[A-Za-z0-9_-]+$
     */
    function init() {
        var configBase = window.SViewerBaseUrl || '';
        var qsconfig;
        function startApp() {
            if (qs.c) { customConfig.customConfigName = qs.c; }
            doConfiguration();
            doMap();
            doGUI();
        }
        if (qs.c && qs.c.match(/^[A-Za-z0-9_-]+$/)) {
            qsconfig = configBase + "local/customConfig_"+qs.c+".js";
            $.getScript(qsconfig).done(startApp).fail(startApp);
        } else if (window.SViewerEmbedded) {
            // embed.js already loaded customConfig.js — skip redundant fetch
            startApp();
        } else {
            qsconfig = configBase + "local/customConfig.js";
            $.getScript(qsconfig).done(startApp).fail(startApp);
        }
    }
    
    /**
     * reads configuration from querystring
     */
    function doConfiguration() {

        // static configuration (merged from hardConfig + customConfig)
        // Check if i18n has been loaded (via i18n.js)
        var i18n = (hardConfig && hardConfig.i18n) || {};
        config = {
            lang: 'en',
            layersQueryable: [],
            layersQueryString: ''
        };
        $.extend(config, hardConfig);
        $.extend(config, window.customConfig || {});

        // language priority: ?lang= URL param > customConfig.lang > browser > default 'en'
        var browserLang = ((navigator.language) ? navigator.language : navigator.userLanguage).substring(0,2);
        var resolvedLang = (qs.lang && /^[a-z]{2}$/.test(qs.lang)) ? qs.lang
                         : (window.customConfig && window.customConfig.lang) ? window.customConfig.lang
                         : browserLang;
        config.lang = Object.prototype.hasOwnProperty.call(i18n, resolvedLang) ? resolvedLang : 'en';

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
            searchparams: {},
            position: 0,
            opacity: config.layerOpacity !== undefined ? config.layerOpacity : 1,
            address: null,
            geojson: null,
            label: null
        };

        // querystring param: theme (light | dark), else OS preference
        if (qs.theme === 'light' || qs.theme === 'dark') {
            state.theme = qs.theme;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            state.theme = 'dark';
        }

        // querystring param: lb — preset index (preset mode) or background index (legacy mode)
        if (qs.lb) {
            var lbPool = config.backgroundPresets && config.backgroundPresets.length
                ? config.backgroundPresets
                : config.layersBackground;
            state.lb = parseInt(qs.lb, 10) % lbPool.length;
        }

        // querystring param: layers
        if (qs.layers) {
            config.layersQueryString = qs.layers;
            // parser to retrieve serialized namespace:name[*style[*cql_filter]] and store the description in config
            var ns_layer_style_list = (typeof qs.layers === 'string') ? qs.layers.split(',') : qs.layers;
            $.each(ns_layer_style_list, function() {
                config.layersQueryable.push(new LayerQueryable(this));
            });
        }
        
        // querystring param: md (metadata identifier, comma-separated for multiple layers)
        // fetches ISO19139 record(s) from CSW, extracts OGC:WMS endpoint and layername
        if (qs.md && !qs.layers) {
            var mdIds = qs.md.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
            config.metadataIds = mdIds;
            mdIds.forEach(function(mdId) {
                fetchCSWRecord(mdId, function(wmsUrl, layername, xmlDoc) {
                    var root     = xmlDoc.documentElement;
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
                    // Auto-title only when a single metadata is loaded — ambiguous with multiple.
                    // Use &title= explicitly for multi-md views.
                    if (mdIds.length === 1) { setTitle(title, true); }
                    var legendUrl = wmsUrl + '?' + $.param({
                        SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetLegendGraphic',
                        FORMAT: 'image/png', LAYER: layername
                    });
                    // Extract HTML catalog links from CSW distributionInfo
                    var metadataLinks = [];
                    try {
                        var linkNodes = xmlDoc.evaluate(
                            '//gmd:distributionInfo//gmd:CI_OnlineResource',
                            root, isoNsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
                        );
                        for (var li = 0; li < linkNodes.snapshotLength; li++) {
                            var ln = linkNodes.snapshotItem(li);
                            var lproto = isoXt(xmlDoc, ln, 'gmd:protocol/gco:CharacterString');
                            var lurl   = isoXt(xmlDoc, ln, 'gmd:linkage/gmd:URL');
                            if (lproto === 'WWW:LINK-1.0-http--link' && lurl) {
                                metadataLinks.push({ url: safeURL(lurl), label: tr('msg.full_record'), newTab: tr('msg.new_tab') });
                            }
                        }
                    } catch(e) { /* XPath unsupported — skip links */ }
                    var $panel = $(Mustache.render(window.SViewerTemplates['sv-layer-panel'], {
                        title:         title,
                        abstract:      abstract,
                        legendUrl:     legendUrl,
                        legendAlt:     tr('msg.legend_of') + ' ' + title,
                        attribution:   null,
                        metadataLinks: metadataLinks
                    }));
                    var meta = parseISOMetadata(xmlDoc);
                    if (meta) { $panel.find('.sv-md-doclink').before(buildISOTable(meta)); }
                    $('#sv-legend-content').append($panel);
                });
            });
        } else if (qs.md && qs.layers) {
            log('md= ignored: layers= takes precedence');
        }

        // querystring param: qcl_filters
        if (qs.qcl_filters) {
            var qcl_filters_list = (typeof qs.qcl_filters === 'string') ? qs.qcl_filters.split(';') : qs.qcl_filters;

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
            setTitle(qs.title, true);
        }
        else {
            setTitle(config.title, true);
        }

        // querystring param: perform getFeatureInfo on map center
        if (qs.q) {
            state.gfiok = true;
        }

        // querystring param: silent auto-geocode + recenter (?address=)
        if (qs.address) {
            state.address = qs.address;
        }

        // querystring param: load external GeoJSON layer (?geojson=URL)
        if (qs.geojson) {
            state.geojson = qs.geojson;
        }

        // querystring param: property to use as label (?label=propertyName)
        if (qs.label) {
            state.label = qs.label;
        }

        // querystring param: activate WFS feature search alongside geocoding
        if (qs.s) {
            state.search = true;
            $.each(config.layersQueryable, function() { this.discoverWFS(); });
        }

        // querystring param: auto-start GPS tracking
        if (qs.position) {
            state.position = 1;
        }

        // querystring param: layer opacity (0–1)
        if (qs.opacity !== undefined) {
            var parsedOpacity = parseFloat(qs.opacity);
            if (!isNaN(parsedOpacity) && parsedOpacity >= 0 && parsedOpacity <= 1) {
                state.opacity = parsedOpacity;
            }
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
        var mapEl = document.getElementById('sv-map');
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
            target: 'sv-map',
            view: view
        });

        // adding background layers (opaque, non queryable, mutually exclusive)
        $.each(config.layersBackground, function() {
                this.setVisible(false);
                map.addLayer(this);
            }
        );

        // adding queryable WMS layers from querystring
        $.each(config.layersQueryable, function() {
            map.addLayer(this.wmslayer);
        });

        // adding overlay layers (above all data layers, not queryable)
        // in preset mode, visibility is driven by switchBackground() below
        if (config.layersOverlay && config.layersOverlay.length) {
            $.each(config.layersOverlay, function() {
                this.setVisible(false);
                map.addLayer(this);
            });
        }

        // apply initial background (and overlay in preset mode)
        switchBackground(state.lb);

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
            element: $('#sv-marker')[0],
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
        _emit('sv:mapReady', { map: map, view: view });

        // map events
        map.on('singleclick', function(e) {
            // Skip WMS GetFeatureInfo when user clicked any vector feature —
            // covers both sViewer's own GeoJSON layer and external widget layers.
            var hitVector = false;
            map.forEachFeatureAtPixel(e.pixel, function() { hitVector = true; return true; },
                { hitTolerance: 8 });
if (!hitVector) { queryMap(e.coordinate); }
        });
        map.on('moveend', setPermalink);
        map.on('moveend', function() { _emit('sv:viewChange', { center: view.getCenter(), zoom: view.getZoom() }); });
        $('#sv-marker').on('click', clearQuery);


        // map buttons
        $('#sv-btn-zoom-in').on('click', function() { adjustZoom(+1); });
        $('#sv-btn-zoom-out').on('click', function() { adjustZoom(-1); });
        $('#sv-btn-home').on('click', zoomInit);
        $('#sv-btn-background').on('click', switchBackground);

        // fullscreen toggle
        var fsContainer = document.querySelector('.sv-scope') || document.documentElement;
        function updateFsButton() {
            var active = !!(document.fullscreenElement || document.webkitFullscreenElement);
            $('#sv-btn-fullscreen').attr('aria-pressed', String(active)).toggleClass('active', active)
                .find('i').attr('class', active ? 'bi bi-fullscreen-exit' : 'bi bi-fullscreen');
        }
        $('#sv-btn-fullscreen').on('click', function() {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            } else {
                (fsContainer.requestFullscreen || fsContainer.webkitRequestFullscreen).call(fsContainer);
            }
        });
        document.addEventListener('fullscreenchange', updateFsButton);
        document.addEventListener('webkitfullscreenchange', updateFsButton);
        // pointer: coarse = touch/mobile device. navigator.geolocation exists on all modern
        // desktop browsers so checking the API alone won't filter desktop — coarse is the right signal.
        var isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
        if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) {
            $('#sv-btn-fullscreen').hide();
        }
        // GPS useful on mobile (hardware GPS); desktop users never need it in this context
        if (!navigator.geolocation || !isCoarsePointer) {
            $('#sv-btn-locate').hide();
        }

        // layer opacity slider — only relevant when WMS layers are loaded
        if (config.layersQueryable.length === 0) { $('.sv-opacity-bar').hide(); }

        function applyLayerOpacity(val) {
            state.opacity = val;
            $.each(config.layersQueryable, function() {
                this.wmslayer.setOpacity(val);
            });
            $('#sv-opacity-value').text(Math.round(val * 100) + '%');
            $('#sv-opacity-slider').val(Math.round(val * 100)).attr('aria-valuenow', Math.round(val * 100));
            setPermalink();
        }
        $('#sv-opacity-slider').on('input', function() {
            applyLayerOpacity(parseInt($(this).val(), 10) / 100);
        });
        applyLayerOpacity(state.opacity);

        // geolocation toggle
        $('#sv-btn-locate').on('click', toggleTracking);
        if (state.position) { startTracking(); }

        // prevent form submit (Enter key) from reloading the page
        $('#sv-search-form').on('submit', function(e) {
            e.preventDefault();
            searchPlace();
        });

        // search with autocomplete - trigger on keyup after 3 characters, debounced
        var searchDebounceTimer = null;
        $('#sv-search-input').on('keyup focus', function(e) {
            var query = $(this).val();
            // keyboard navigation within results
            if (e.type === 'keyup') {
                var key = e.key;
                var $items = $('#sv-search-results .sv-search-item');
                var $active = $('#sv-search-results .sv-search-item.sv-search-active');
                var idx = $items.index($active);
                if (key === 'ArrowDown') {
                    e.preventDefault();
                    var $next = idx < $items.length - 1 ? $items.eq(idx + 1) : $items.eq(0);
                    $active.removeClass('sv-search-active').attr('aria-selected', 'false');
                    $next.addClass('sv-search-active').attr('aria-selected', 'true');
                    $('#sv-search-input').attr('aria-activedescendant', $next.attr('id'));
                    return;
                }
                if (key === 'ArrowUp') {
                    e.preventDefault();
                    var $prev = idx > 0 ? $items.eq(idx - 1) : $items.last();
                    $active.removeClass('sv-search-active').attr('aria-selected', 'false');
                    $prev.addClass('sv-search-active').attr('aria-selected', 'true');
                    $('#sv-search-input').attr('aria-activedescendant', $prev.attr('id'));
                    return;
                }
                if (key === 'Enter' && $active.length) {
                    e.preventDefault();
                    $active.find('.sv-search-item-link').trigger('click');
                    return;
                }
                if (key === 'Escape') {
                    clearSearchResults();
                    return;
                }
            }
            clearTimeout(searchDebounceTimer);
            if (query.length >= 3) {
                $('#sv-locate-msg').text('');
                searchDebounceTimer = setTimeout(searchPlace, 350);
            } else {
                clearSearchResults();
                $('#sv-locate-msg').text(tr('msg.search_hint'));
            }
        });

        // set title dialog (both panel and modal)
        $('#sv-share-title').on('keyup', onTitle);
        $('#sv-share-title').on('blur', setPermalink);

        // theme switch
        $('#sv-theme-switch')
            .prop('checked', state.theme === 'dark')
            .attr('aria-checked', String(state.theme === 'dark'))
            .on('change', function() {
                state.theme = this.checked ? 'dark' : 'light';
                $(this).attr('aria-checked', String(this.checked));
                applyTheme(state.theme);
                setPermalink();
            });

        // WebComponent button (can appear in side panel or modal)
        $(document).on('click', '.sv-embed-btn', function() {
            $('#sv-embed-iframe-code').val(generateIframeCode());
            $('#sv-embed-js-code').val(generateEmbedCode());
            closePanel();
            svModal.open('#sv-modal-embed');
        });

        // Snapshot button — export map canvas as PNG download
        $(document).on('click', '#sv-btn-snapshot', function() {
            closePanel();
            map.once('rendercomplete', function() {
                var canvas = map.getViewport().querySelector('canvas');
                if (!canvas) { return; }
                try {
                    canvas.toBlob(function(blob) {
                        var url = URL.createObjectURL(blob);
                        var a = document.createElement('a');
                        a.href = url;
                        a.download = 'sviewer-' + Date.now() + '.png';
                        a.click();
                        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
                    });
                } catch (e) {
                    // Canvas tainted by cross-origin tiles lacking crossOrigin on their OL source
                    console.warn('Snapshot failed (canvas tainted by cross-origin tiles):', e);
                }
            });
            map.renderSync();
        });

        // Permalink button — close share panel and show link in modal
        $(document).on('click', '#sv-btn-permalink', function() {
            var href = $('#sv-permalink-url').prop('href');
            $('#sv-permalink-url').prop('href', href).text(href);
            closePanel();
            svModal.open('#sv-modal-permalink');

            // Generate QR code for the permalink
            if (!href) {
                console.warn('No permalink available for QR code');
                $('#sv-qrcode-display').html('<div class="alert alert-warning" role="alert">No link available</div>');
                return;
            }

            var qrcodeDisplayEl = document.getElementById('sv-qrcode-display');
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
                var img = document.createElement('img');
                img.src = dataUrl;
                img.alt = 'QR Code — ' + href; // dataUrl is a safe data: URI; href set as text property
                img.style.cssText = 'max-width:100%;height:auto;';
                qrcodeDisplayEl.innerHTML = '';
                qrcodeDisplayEl.appendChild(img);
            }).catch(function(error) {
                console.error('QR code generation failed:', error);
                var div = document.createElement('div');
                div.className = 'alert alert-warning';
                div.setAttribute('role', 'alert');
                div.textContent = 'Failed to generate QR code: ' + error.message;
                qrcodeDisplayEl.innerHTML = '';
                qrcodeDisplayEl.appendChild(div);
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

        $(document).on('click', '#sv-permalink-copy-btn', function() {
            var url = $('#sv-permalink-url').prop('href');
            copyToClipboard(url, $(this), function() { window.prompt('', url); });
        });

        $('#sv-embed-copy-js').on('click', function() {
            var textarea = document.getElementById('sv-embed-js-code');
            copyToClipboard(textarea.value, $(this), function() {
                textarea.select(); document.execCommand('copy');
            });
        });

        $('#sv-embed-copy-iframe').on('click', function() {
            var textarea = document.getElementById('sv-embed-iframe-code');
            copyToClipboard(textarea.value, $(this), function() {
                textarea.select(); document.execCommand('copy');
            });
        });

        // dynamic resize
        $(window).on('orientationchange resize pageshow updatelayout', panelLayout);

        // Side panel toggles
        $('#sv-panel-controls button').on('click', panelButton);
        $('.sv-sidepanel-close').on('click', closePanel);

        // Close panel when clicking on backdrop (small screens)
        $('#sv-frame-map').on('click', function(e) {
            if ($(this).hasClass('sv-panel-open') && window.innerWidth <= 600) {
                // On small screens, close panel if clicking backdrop area (left 15%)
                if (e.target === this && e.clientX < window.innerWidth * 0.15) {
                    closePanel();
                }
            }
        });

        // Handle sidepanel layout and permalink updates
        var observer = new MutationObserver(function() {
            if ($('#sv-sidepanel').hasClass('active')) {
                setPermalink();
            }
        });
        observer.observe(document.getElementById('sv-sidepanel'), {
            attributes: true,
            attributeFilter: ['class']
        });

        // i18n
        if (config.lang !== 'en') {
            translateDOM('.i18n');
        }

        // optional: override search placeholder from customConfig
        if (config.searchPlaceholder) {
            $('#sv-search-input').prop('placeholder', config.searchPlaceholder);
        }

        // Auto-open legend panel when a layer is loaded and screen is wide enough.
        // Below 600px the panel covers the map entirely — too disorienting on first load.
        if (config.layersQueryable.length > 0 && window.innerWidth > 600) {
            togglePanel('legend');
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

        if (state.address) {
            setTimeout(function() { autoGeocodeAddress(state.address); }, 300);
        }

        if (state.geojson) {
            loadGeoJSON(state.geojson);
        }

        // Bus inbound — embedder pushes data or drives selection via SViewer SDK.
        if (_bus) {
            _bus.on('sv:loadFeatures', function(d) { if (d && d.geojson) { loadGeoJSON(null, d.geojson); } });
            _bus.on('sv:loadFeatureObjects', function(d) { if (d && d.features) { loadFeatureObjects(d.features, d.options); } });
            _bus.on('sv:selectFeature', function(d) { selectFeatureById(d && d.id); });
        }

        // Notify parent frame (test runner or embedder) that sViewer is ready.
        // Only serialize cloneable keys — functions and OL layer objects can't cross postMessage.
        if (window.parent !== window) {
            var hc = window.SViewerHardConfig;
            var serializable = {};
            Object.keys(hc).forEach(function(k) {
                var v = hc[k];
                if (typeof v === 'function') { return; }
                if (k === 'layersBackground' || k === 'layersOverlay') { return; }
                serializable[k] = v;
            });
            window.parent.postMessage({ type: 'sv:ready', hardConfig: serializable, center: [config.x, config.y], zoom: config.z }, '*');
        }
        // Notify onReady callbacks registered by embed callers.
        _onReadyCallbacks.forEach(function(fn) { try { fn(); } catch(e) {} });
        _onReadyCallbacks = [];

    }


    // ------ Main ------------------------------------------------------------------------------------------

    this.init = init;
    this.getMap = function() { return map; };
    this.getView = function() { return view; };
    this.getConfig = function() { return config; };
    this.getState = function() { return state; };
    // Update the geojson URL in state for share/embed permalinks.
    // Does not load or render the layer — caller owns rendering.
    // setPermalink() is intentionally omitted: panel may be closed, and
    // togglePanel('share') already calls setPermalink() when panel opens.
    this.setGeojsonUrl = function(url) {
        state.geojson = url || null;
    };
    // Load pre-built OL Feature array into the map (no fetch, no reprojection).
    // options: { styleOverride, fitExtent } — see loadFeatureObjects().
    this.loadFeatureObjects = function(features, options) { loadFeatureObjects(features, options); };
    // Load a GeoJSON FeatureCollection object directly into the map (no fetch).
    this.loadGeoJSON = function(geojson) { loadGeoJSON(null, geojson); };
    // Select feature by OL feature id (feature.setId()). null clears selection.
    this.selectFeatureById = function(id) { selectFeatureById(id); };
    // Switch background/preset by index. No-op if index out of range.
    this.switchBackground = function(idx) { switchBackground(idx); };
    // Trigger a vector layer redraw without replacing the style (preserves declutter).
    this.refreshVector = function() { if (vectorLayer) { vectorLayer.changed(); map.renderSync(); } };
    // Optional callback — set by embedders to be notified when the user
    // changes the title via the share panel. Not called for programmatic
    // setTitle() calls (init, md/WFS auto-title). Null by default.
    this.onTitleChange = null;
    // Register a callback to fire once after sViewer init completes.
    this.onReady = function(fn) { _onReadyCallbacks.push(fn); };
    // Subscribe to sViewer events. Use inside onReady() to guarantee bus is wired.
    // Events: sv:mapReady, sv:featureClick, sv:featureSelect, sv:featuresLoaded,
    //         sv:viewChange, sv:layerLoad
    this.on  = function(event, fn) { if (_bus) { _bus.on(event, fn); } };
    this.off = function(event, fn) { if (_bus) { _bus.off(event, fn); } };
    // Panel API — open/close a named skill panel in the sidepanel.
    // open(name, title, html) creates the panel + toggle button if absent.
    this.panel = {
        open: function(name, title, html) {
            var panelId = 'sv-panel-skill-' + name;
            var btnId   = 'sv-btn-panel-skill-' + name;
            if (!document.getElementById(panelId)) {
                var $btn = $('<button type="button" class="btn btn-dark sv-map-btn sv-panel-toggle" aria-pressed="false">')
                    .attr('id', btnId)
                    .attr('data-sv-panel', 'skill-' + name)
                    .attr('aria-label', title)
                    .text(title);
                $('#sv-panel-controls').append($btn);
                var $section = $('<div class="sv-panel-section" role="region" style="display:none;">')
                    .attr('id', panelId)
                    .attr('data-sv-section', 'skill-' + name)
                    .attr('aria-label', title);
                var $header = $('<div class="sv-panel-header">').append(
                    $('<h3 class="sv-panel-title">').text(title),
                    $('<button type="button" class="sv-sidepanel-close" aria-label="Close panel"><i class="bi bi-x-lg" aria-hidden="true"></i></button>')
                );
                var $content = $('<div class="sv-panel-content">').html(html || '');
                $section.append($header, $content);
                $('#sv-sidepanel').append($section);
            } else {
                $('#sv-panel-skill-' + name + ' .sv-panel-content').html(html || '');
            }
            togglePanel('skill-' + name);
        },
        close: function(name) { togglePanel(null); }
    };
    }

    // Create instance
    var instance = new SViewer();

    // Expose configuration for external scripts (i18n.js, etc.)
    window.SViewerHardConfig = hardConfig;
    window.SViewerConfig = config;
    window.SViewerState = state;
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