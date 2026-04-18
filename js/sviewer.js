/*globals $:false, ol:false, proj4:false*/

// Isolated SViewer instance - encapsulates all state and DOM interactions
window.SViewerApp = (function() {
    // Projection: EPSG:3857 (Web Mercator)
    proj4.defs([
        ["EPSG:4326", "+title=WGS 84, +proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs"],
        ["EPSG:3857", "+title=Web Spherical Mercator, +proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs"]
    ]);
    // Required since OL6: register proj4 definitions into OpenLayers
    ol.proj.proj4.register(proj4);

    var config = {};
    var state = {};
    var customConfig = window.customConfig || {};

    // Ensure hardConfig exists (created by embed.js before i18n.js loaded)
    window.hardConfig = window.hardConfig || {};

    // Merge default values while preserving i18n and customConfig properties
    $.extend(window.hardConfig, {
        title: 'geOrchestra mobile',
        geOrchestraBaseUrl: 'https://geobretagne.fr/',
        projcode: 'EPSG:3857',
        initialExtent: [-12880000,-1080000,5890000,7540000],
        maxExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
        restrictedExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
        maxFeatures: 10,
        nodata: '<!--nodatadetect-->\n<!--nodatadetect-->',
        openLSGeocodeUrl: "https://data.geopf.fr/geocodage/search",
        layersBackground: [
            new ol.layer.Tile({
                  source: new ol.source.OSM()
            })
        ]
    });

    var hardConfig = window.hardConfig;

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
        open: function(id) {
            var modalId = id.replace(/^#/, '') + 'Modal';
            var modalEl = document.getElementById(modalId);
            if (modalEl) {
                bindModalInert(modalEl);
                new bootstrap.Modal(modalEl).show();
            }
        },
        close: function(id) {
            var modalId = id.replace(/^#/, '') + 'Modal';
            var modalEl = document.getElementById(modalId);
            if (modalEl) {
                var m = bootstrap.Modal.getInstance(modalEl);
                if (m) m.hide();
            }
        }
    };

    var qrcodeLoaded = false;
    function loadQRCodeLibrary() {
        if (qrcodeLoaded || typeof QRCode !== 'undefined') {
            return Promise.resolve();
        }
        return new Promise(function(resolve) {
            var script = document.createElement('script');
            script.src = 'lib/qrcode/qrcode.min.js';
            script.onload = function() {
                qrcodeLoaded = true;
                resolve();
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
     * LayerQueryable is an enhanced ol3.layer.wms
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
        this.wmslayer = null;

        // to allow usage of this. in jquery statements
        var self = this;

        /**
         * Parses a wms layer descriptor, calls the legend, returns the wms layer
         * @param {String} s the querystring describing the layer
         */
        function parseLayerParam (s) {
            self.options.nslayername = s.split('*')[0]; // namespace:layername
            self.options.stylename = (s.indexOf("*")>0) ? s.split('*',2)[1]:''; // stylename
            self.options.cql_filter = (s.indexOf("*")>1) ? s.split('*',3)[2]:''; // qcl_filter

            self.options.namespace = (self.options.nslayername.indexOf(":")>0) ? self.options.nslayername.split(':',2)[0]:''; // namespace
            self.options.layername = (self.options.nslayername.indexOf(':')>0) ? self.options.nslayername.split(':',2)[1]:''; // layername
            self.options.wmsurl_global = config.geOrchestraBaseUrl + '/geoserver/wms'; // global getcap
            self.options.wmsurl_ns = config.geOrchestraBaseUrl + '/geoserver/' + self.options.namespace + '/wms'; // virtual getcap namespace
            self.options.wmsurl_layer = config.geOrchestraBaseUrl + '/geoserver/' + self.options.namespace + '/' + self.options.layername + '/wms'; // virtual getcap layer
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
            var capabilitiesUrl = ajaxURL(self.options.wmsurl_ns + '?SERVICE=WMS&REQUEST=GetCapabilities');
            console.log('Loading capabilities from:', capabilitiesUrl, 'for layer:', self.options.nslayername);

            $.ajax({
                url: capabilitiesUrl,
                type: 'GET',
                success: function(response) {
                    var html = [];
                    var capabilities, mdLayer, legendArgs;
                    capabilities = parser.read(response);
                    console.log('Capabilities loaded, version:', capabilities.version);

                    // searching for the layer in the capabilities
                    // Workspace virtual service (/geoserver/<ns>/wms) returns names without namespace prefix,
                    // global endpoint (/geoserver/wms) returns names with namespace prefix.
                    // Match either form for robustness.
                    if (capabilities.Capability && capabilities.Capability.Layer && capabilities.Capability.Layer.Layer) {
                        $.each(capabilities.Capability.Layer.Layer, function() {
                            console.log('Found layer in capabilities:', this.Name);
                            if (this.Name === self.options.nslayername || this.Name === self.options.layername) {
                                mdLayer = this;
                                console.log('Matched layer:', this.Name);
                            }
                        });
                    } else {
                        console.warn('No layers found in capabilities structure');
                    }

                    if (mdLayer) {
                        html.push('<div class="sv-md">');
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
                        console.log('Legend URL:', legendUrl);

                        // attribution
                        if (mdLayer.Attribution) {
                            html.push('<span class="sv-md-attrib">' + escHTML(tr('source')));
                            html.push(' : <a target="_blank" href="' + escHTML(mdLayer.Attribution.OnlineResource) + '" >');
                            if (mdLayer.Attribution.LogoURL) {
                                html.push('<img class="sv-md-logo" src="' + escHTML(mdLayer.Attribution.LogoURL.OnlineResource) + '" /><br />');
                            }
                            html.push(escHTML(mdLayer.Attribution.Title));
                            html.push('</a></span>');
                        }

                        // title
                        html.push('<p><h4 class="sv-md-title">' + escHTML(mdLayer.Title) + '</h4>');
                        self.md.title = mdLayer.Title;
                        if (state.search) {
                            state.searchparams.title = self.md.title;
                        }

                        // abstract
                        html.push("<p class='sv-md-abstract'>" + escHTML(mdLayer.Abstract));
                        self.md.Abstract = mdLayer.Abstract;

                        // metadata
                        if (mdLayer.hasOwnProperty('MetadataURL')) {
                            $.each(mdLayer.MetadataURL, function() {
                                if (this.Format === "text/html") {
                                    html.push('&nbsp;<a target="_blank" class="sv-md-meta" href="' + escHTML(this.OnlineResource) + '">');
                                    html.push(tr('metadata'));
                                    html.push(" ... </a>");
                                }
                            });
                        }
                        html.push("</p>");

                        // legend
                        html.push('<img class="sv-md-legend" src="');
                        html.push(legendUrl);
                        html.push('" />');
                        html.push('</div>');

                        $('#legend').append(html.join(''));
                        console.log('Legend appended to DOM');
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

        /**
         * constructor
         */
        this.construct = function(options) {
            // layers from query string parameter
            if ($.type(options) === "string") {
                parseLayerParam(options);
            }
            else {
                $.extend(this.options, options);
            }
            createLayer();
            getMetadata(self);
        };

        this.construct(options);
    }



    // ----- methods ------------------------------------------------------------------------------------

    /**
     * Sanitize strings
     * @param {String} s input string
     * @return {String} secured string
     */
    function escHTML (s) {
        return $('<p/>').text(s).html();
    }

    /**
     * Returns the URL as-is (CORS assumed to be enabled on all services).
     * @param {String} url
     * @return {String} url
     */
    function ajaxURL (url) {
        return url;
    }

    /**
     * Translates strings
     * @param {String} s input string
     * @return {String} translated string
     */
    function tr(s) {
        if ($.type(hardConfig.i18n[config.lang][s])==='string') {
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
    function translateDOM(selector, propnames) {
        $.each($(selector), function(i,e) {
            var $e = $(e);
            // text translation - skip elements that contain SVG or other important children
            if ($e.find('svg').length === 0 && $e.find('span').length === 0 && $e.find('i').length === 0) {
                $e.text(tr($e.text()));
            }
            // properties translation
            $.each(propnames, function(j, p) {
                if (p !== "value") {
                    $(e).prop(p, tr($(e).prop(p)));
                }
                else {
                    $(e).val(tr($(e).prop(p)));
                }
            });
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
     * Loads, parses a Web Map Context and instanciates layers
     * ol3 does dot support WMC format for now
     * @param {String} wmc id of the map or URL of the web map context
     */
    function parseWMC(wmc) {
        var url = '';
        // todo : missing ol3 WMC native support
        function parseWMCResponse(response) {
            var wmc = $('ViewContext', response);
            state.wmctitle = $(wmc).children('General').children('Title').text();
            setTitle(state.wmctitle);

            // recenter on  WMC extent if xyz not specified
            if (isNaN(config.x)) {
                var vgb = $(wmc).children('General').children('BoundingBox');
                var srs = vgb.attr('SRS');
                var extent = [vgb.attr('minx'), vgb.attr('miny'), vgb.attr('maxx'), vgb.attr('maxy')];
                view.fit(ol.proj.transformExtent(extent, srs, config.projcode));
            }

            // we only consider visible and queryable layers
            $(wmc).find('LayerList > Layer[queryable=1]').each(function() {
                if ($(this).attr('hidden')!='1') {
                    var options = {};
                    options.nslayername = $(this).children('Name').text();
                    options.namespace = '';
                    options.layername = $(this).children('Name').text();
                    options.wmsurl_global = $(this).find('Server > OnlineResource').attr('xlink:href');
                    options.wmsurl_ns = options.wmsurl_global;
                    options.wmsurl_layer = options.wmsurl_global;
                    options.format = $(this).find("FormatList  > Format[current='1']").text();
                    options.sldurl = ($(this).find("StyleList  > Style[current='1'] > SLD > OnlineResource").attr('xlink:href'));
                    options.stylename = $(this).find("StyleList  > Style[current='1'] > Name").text();
                    options.opacity = parseFloat($(this).find("opacity").text());
                    var l = new LayerQueryable(options);
                    config.layersQueryable.push(l);
                    map.addLayer(l.wmslayer);
                    svSpinner.hide();
                }
            });

            //activate search if required
            if (state.search) {
                activateSearchFeatures('remote');
            }

            // perform gfi if requied
            if (state.gfiok) {
                queryMap(view.getCenter());
            }
        }

        // wmc comes from a geOrchestra map id
        if (wmc.match(wmc.match(/^[a-z\d]{32}$/))) {
            url = config.geOrchestraBaseUrl + 'mapfishapp/ws/wmc/geodoc' + wmc + '.wmc';
        }
        // wmc is an url
        else {
            url = wmc;
        }

        if (url!=='') {
            svSpinner.show();
            $.ajax({
                url: ajaxURL(url),
                type: 'GET',
                dataType: 'XML',
                success: parseWMCResponse,
                error: function(xhr) {
                    if (xhr.status==404) {
                        messagePopup(tr("map context not found"));
                    }
                    else {
                        messagePopup(tr("map context error"));
                    }
                    svSpinner.hide();
                }
            });
        }
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
            if (config.kmlUrl) { linkParams.kml = config.kmlUrl; }
            if (state.search) { linkParams.s = '1'; }
            if (config.layersQueryString) { linkParams.layers = config.layersQueryString; }
            if (config.title&&state.wmctitle!=config.title) { linkParams.title = config.title; }
            if (config.wmc) { linkParams.wmc = config.wmc; }
            permalinkHash = window.location.origin + window.location.pathname + "#" + $.param(linkParams);
            permalinkQuery = window.location.origin + window.location.pathname + "?" + $.param(linkParams);

            $('#georchestraForm').attr('action', config.geOrchestraBaseUrl + 'mapfishapp/');
            $('#permalink').prop('href',permalinkQuery);
        }
    }


    /**
     * Call external viewers
     * @param viewerId {String} the external viewer codename
     */
    function sendMapTo(viewerId) {
        // sendto : georchestra advanced viewer
        if (viewerId === "georchestra_viewer") {
            var params = {
                "services": [],
                "layers" : []
            };
            $.each(config.layersQueryable, function(i, layer) {
                params.layers.push({
                    "layername" : layer.options.layername,
                    "owstype" : "WMS",
                    "owsurl" : layer.options.wmsurl_layer
                });
            });
            $("#georchestraFormData").val(JSON.stringify(params));
            //~ return true;
            return false;
        }
    }


    /**
     * Generates embed code with current map state
     * Includes all relevant URL parameters (x, y, z, layers, lb, title, etc.)
     */
    function generateEmbedCode() {
        var c = view.getCenter();
        var embedParams = {
            geOrchestraBaseUrl: config.geOrchestraBaseUrl,
            center: [Math.round(c[0]), Math.round(c[1])],
            zoom: view.getZoom()
        };
        if (state.lb !== null && state.lb !== undefined) {
            embedParams.lb = state.lb;
        }
        if (config.layersQueryString) {
            embedParams.layers = config.layersQueryString;
        }
        if (config.title) {
            embedParams.title = config.title;
        }
        if (config.kmlUrl) {
            embedParams.kml = config.kmlUrl;
        }
        if (config.wmc) {
            embedParams.wmc = config.wmc;
        }
        if (config.customConfigName) {
            embedParams.c = config.customConfigName;
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
    function openLsRequest(text) {

        function onGeocodeSuccess(response) {
            svSpinner.hide();
            try {
                var features = response.features;
                var items = [];
                if (features && features.length > 0) {
                    $.each(features, function(_idx, feature) {
                        var coords   = feature.geometry.coordinates; // [lon, lat]
                        var props    = feature.properties;
                        var ptResult = ol.proj.transform(coords, 'EPSG:4326', config.projcode);
                        var zoom     = 16;
                        switch (props.type) {
                            case 'municipality':  zoom = 13; break;
                            case 'street':        zoom = 17; break;
                            case 'housenumber':   zoom = 18; break;
                        }
                        var label = props.label || props.name || coords.join(', ');
                        var item = $('<li class="list-group-item"><a href="#" style="text-decoration: none; color: inherit;"></a></li>')
                            .find('a')
                            .text(label)
                            .parent()
                            .attr('title', label)
                            .click({
                                'extent': [],
                                'coordinates': ptResult,
                                'zoom': zoom
                            }, onSearchItemClick);
                        items.push(item);
                    });
                    $('#searchResults').prepend(items);
                    $('#searchResults').prepend('<li class="list-group-item list-group-item-secondary">Localit&eacute;s</li>');
                    $('#searchResults');
                }
            } catch(err) {
                $('#locateMsg').text(tr('Geolocation failed'));
            }
        }

        function onGeocodeFailure() {
            $('#locateMsg').text(tr('Geolocation failed'));
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
                $.ajax({
                    url: config.openLSGeocodeUrl,
                    type: 'GET',
                    dataType: 'json',
                    data: {
                        q: q,
                        limit: config.maxFeatures,
                        bbox: bbox.join(',')
                    },
                    success: onGeocodeSuccess,
                    error: onGeocodeFailure
                });
                svSpinner.show();
            }
        } catch(err) {
            messagePopup(tr('Geolocation failed'));
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
        $('#querycontent').html('');

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
            var domResponse =  $($('<div>').append($('<span class="sv-md-title">').text(this.md.title)));
            $('#querycontent').append(domResponse);
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
                        $.each(['#panelInfo', '#panelLocate', '#panelShare'], function(i, p) {
                            closePanel();
                        });
                        $(this).append(response);
                        state.gfiok = true;
                        $('#panelQuery a').attr("rel","external");
                        togglePanel('query');
                    }
                    else {
                        // disable jquery ajax for links
                        togglePanel('query');
                        $(this).append($('<p class="sv-noitem">').text(tr('no item found')));
                        state.gfiok = false;
                    }
                    svSpinner.hide();
                },
                error: function() {
                    svSpinner.hide();
                    $(this).append($('<p class="sv-noitem">').text(tr('query failed')));
                }
            });
        });

        // KML getFeatureInfo
        if (config.kmlLayer) {
            var features = [];
            var domResponse =  $('<div class="sv-kml"></div>');
            map.forEachFeatureAtPixel(p, function(feature, layer) {
                features.push(feature);
            });
            if (features.length > 0) {
                $.each(features, function() {
                    togglePanel('query');
                    if (this.get('description')) {
                        domResponse.append(this.get('description'));
                    }
                    else {
                        $.each(this.getProperties(), function(k, v) {
                            if ($.type(v)==="string") {
                                domResponse.append($('<span class="sv-key">').text(k + ':'));
                                domResponse.append($('<span class="sv-value">').text(v));
                                domResponse.append($('<br>'));

                            }
                        });
                    }
                });
                $('#querycontent').append(domResponse);
            }
        }


    }

    /**
     * clear getFeatureInfo
     */
    function clearQuery() {
        $('#marker').hide('fast');
        closePanel();
        $('#querycontent').text(tr('Query the map'));
        state.gficoord = null;
        state.gfiz = null;
        state.gfiok = false;
    }


    /**
     * method: searchFeatures
     * search features whose string attributes match a pattern;
     * 'local' mode handles KML featureCollections
     * 'remote' mode performs a WFS getFeature query,
     * @param {String} value search pattern
     */
    function searchFeatures(value) {
        if (value.length>1) {
            state.searchparams.term = value;
            if (state.searchparams.mode === 'remote') {
                var ogcfilter = [],
                    propertynames = [],
                    getFeatureRequest;

                $.each(state.searchparams.searchfields, function(i, fieldname) {
                    /*matchCase="false" for PropertyIsLike don't works with geoserver 2.5.0* in wfs 2.0.0 version*/
                    ogcfilter.push(
                    '<ogc:PropertyIsLike wildCard="*" singleChar="." escapeChar="!" matchCase="false" >' +
                    '<ogc:PropertyName>'+fieldname+'</ogc:PropertyName>' +
                    '<ogc:Literal>*'+value+'*</ogc:Literal></ogc:PropertyIsLike>');
                    propertynames.push('<ogc:PropertyName>'+fieldname+'</ogc:PropertyName>');
                });
                propertynames.push('<ogc:PropertyName>'+state.searchparams.geom+'</ogc:PropertyName>');
                if (state.searchparams.searchfields.length > 1) {
                    ogcfilter.unshift('<ogc:Or>');
                    ogcfilter.push('</ogc:Or>');
                }
                ogcfilter.unshift('<ogc:And>');
                ogcfilter.push(['<ogc:BBOX>',
                        '<ogc:PropertyName>'+state.searchparams.geom+'</ogc:PropertyName>',
                        '<gml:Envelope xmlns:gml="http://www.opengis.net/gml" srsName="'+config.projection.getCode()+'">',
                          '<gml:lowerCorner>'+ol.extent.getBottomLeft(config.initialExtent).join(" ")+'</gml:lowerCorner>',
                          '<gml:upperCorner>'+ol.extent.getTopRight(config.initialExtent).join(" ")+'</gml:upperCorner>',
                        '</gml:Envelope>',
                      '</ogc:BBOX>'].join( ' ' ));
                ogcfilter.push('</ogc:And>');

                getFeatureRequest = ['<?xml version="1.0" encoding="UTF-8"?>',
                    '<wfs:GetFeature',
                        'xmlns:wfs="http://www.opengis.net/wfs" service="WFS" version="1.1.0"',
                        'xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd"',
                        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" maxFeatures="'+config.maxFeatures+'" outputFormat="application/json">',
                          '<wfs:Query xmlns:ogc="http://www.opengis.net/ogc"' +
                           ' typeName="'+state.searchparams.typename+'" srsName="'+config.projection.getCode()+'">',
                            propertynames.join(' '),
                            '<ogc:Filter>',
                               ogcfilter.join(' '),
                            '</ogc:Filter>',
                        '</wfs:Query>',
                    '</wfs:GetFeature>'].join (' ');
                $.ajax({
                    type: 'POST',
                    url: ajaxURL(state.searchparams.url),
                    data: getFeatureRequest,
                    dataType: 'json',
                    contentType: "application/xml",
                    success: function(response) {
                        var f =  new ol.format.GeoJSON().readFeatures(response);
                        if (f.length > 0) {
                            featuresToList(f);
                        }
                    },
                    error: function() {
                        console.log('error ');
                    }
                });
            }
            if (state.searchparams.mode === 'local') {
                // construct a pseudo index the first use
                if (!state.searchindex) {
                    var pseudoIndex = [];
                    $.each(config.kmlLayer.getSource().getFeatures(), function(i, feature) {
                        // construct an index with all text attributes
                        var id = feature.getId();
                        var props = feature.getProperties();
                        var idx = "";
                        $.each(props, function(key, value) {
                            if (key=="name" && typeof(value==='string')) {
                                idx+='|' + value.toLowerCase();
                            }
                        })
                        pseudoIndex.push({id:id, data:idx});
                    });
                    state.searchindex = pseudoIndex;
                }
                // use pseudo index to retrieve matching features
                if (state.searchindex) {
                    var features = [];
                    var responses = 0;
                    $.each(state.searchindex.slice(0,config.maxFeatures), function(i, v) {
                        if (state.searchindex[i].data.indexOf(value.toLowerCase())!=-1) {
                            features.push(config.kmlLayer.getSource().getFeatureById(state.searchindex[i].id));
                            responses +=1;
                        }
                    })
                    featuresToList(features);
                }
            }
        }
    }
    
    /**
     * method: activateSearchFeatures
     * prepares for feature search;
     * performs DescribeLayer/DescribeFeatureType if necessary
     * @param {String} mode local|remote
     */
    function activateSearchFeatures(mode) {
        state.searchparams.mode = mode;
        if (mode === 'remote') {
            var searchLayer = config.layersQueryable[config.layersQueryable.length - 1];
            if (searchLayer) {
                state.searchparams.title = searchLayer.md.title;
                $.ajax({
                    url: ajaxURL(searchLayer.options.wmsurl_ns + '?' + $.param({
                        'SERVICE': 'WMS',
                        'VERSION': '1.1.1',
                        'REQUEST': 'DescribeLayer',
                        'LAYERS': searchLayer.options.layername
                    })),
                    type: 'GET'
                }).then(function(r1) {
                    state.searchparams.url = $(r1).find('LayerDescription').attr('wfs');
                    state.searchparams.typename = $(r1).find('Query').attr('typeName');
                    return $.ajax({
                        url: ajaxURL(
                            $(r1).find('LayerDescription').attr('wfs') +
                            $.param({
                                'SERVICE': 'WFS',
                                'VERSION': '1.0.0',
                                'REQUEST': 'DescribeFeatureType',
                                'TYPENAME': $(r1).find('Query').attr('typeName')
                            })
                        ),
                        type: 'GET'
                    });
                }).then(function(r2) {
                    var fields = [];
                    $(r2.getElementsByTagNameNS('*', 'sequence')).find('[type="xsd\\:string"]')
                        .each(function() {
                            fields.push($(this).attr('name'));
                        });
                    state.searchparams.geom = $(r2.getElementsByTagNameNS('*', 'sequence'))
                        .find('[type*="gml\\:"]').attr('name');
                    state.searchparams.searchfields = fields;
                    state.searchparams.ns = $(r2.getElementsByTagNameNS('*', 'schema'))
                        .attr('targetNamespace');
                    state.searchparams.name = state.searchparams.typename.split(':')[1];
                }).fail(function() {
                    messagePopup(tr('query failed'));
                });
            }
        }
        if (mode === 'local') {
            //nothing for the moment. the local search initializes on first search.
        }
    }

    /**
     * method: onSearchItemClick
     * recenters map on feature click
     * @param {Jquery.Event} event
     */
    function onSearchItemClick (event) {
        var data = event.data;
        marker.setPosition(event.data.coordinates);
        if (data.extent.length===4 && !(data.extent[0] == data.extent[2] && data.extent[1] == data.extent[3])) {
            view.fit(data.extent);
        } else {
            view.setCenter(data.coordinates);
            view.setZoom(data.zoom || 16);
        }
        $('#marker').show();
    }

    
    /**
     * method: featuresToList
     * renders a clickable list of features
     * @param {ol.features} features
     */
    function featuresToList (features) {
        var lib = state.searchparams.title || tr('Top layer');
        $("#searchResults").append($('<li class="list-group-item list-group-item-secondary">').text(lib));

        $.each(features, function(i, feature) {
            var geom = feature.getGeometry(),
                attributes = feature.getProperties(),
                tips = [],
                title = [];

            $.map(attributes, function(val, i) {
                if (typeof(val)=== 'string') {
                    tips.push(i + ' : ' + val);
                    if (val.toLowerCase().search(state.searchparams.term.toLowerCase())!= -1) {
                        title.push(val);
                    }
                }
            });

            $('<li class="list-group-item"><a href="#" style="text-decoration: none; color: inherit;"></a></li>')
                .find("a")
                .text(title.join(", "))
                .click({
                        'extent': geom.getExtent(),
                        'coordinates': (geom.getType()==='Point') ? geom.getCoordinates() : ol.extent.getCenter(geom.getExtent())
                    }, onSearchItemClick)
                .parent()
                .attr("title", tips.join('\n'))
                .appendTo($("#searchResults"));
        });
        $("#searchResults");
    }

    /**
     * method: searchPlace
     * search for matching places (OpenLS) and features
     */
    function searchPlace() {
        $("#searchResults").html("");
        try {
            openLsRequest($("#searchInput").val());
            if (state.search) {
                searchFeatures($("#searchInput").val());
            }
        }
        catch(err) {
            messagePopup(tr('Geolocation failed'));
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

    // toggle side panels
    function togglePanel(panelName) {
        var sidepanel = $('#sidepanel');
        var targetSection = sidepanel.find('[data-section="' + panelName + '"]');
        var button = $('[data-panel="' + panelName + '"]');

        // If clicking the same panel button, close it
        if (button.hasClass('active') || targetSection.is(':visible')) {
            closePanel();
            return;
        }

        // Hide all sections
        sidepanel.find('.sv-panel-section').hide();

        // Show target section
        targetSection.show();

        // Update button states
        $('#panelcontrols .sv-panel-toggle').removeClass('active');
        button.addClass('active');

        // Activate sidepanel
        sidepanel.addClass('active');
        $('#frameMap').addClass('panel-open');

        // Update permalink when share panel is opened
        if (panelName === 'share') {
            setPermalink();
        }
    }

    function closePanel() {
        var sidepanel = $('#sidepanel');
        sidepanel.find('.sv-panel-section').hide();
        sidepanel.removeClass('active');
        $('#panelcontrols .sv-panel-toggle').removeClass('active');
        $('#frameMap').removeClass('panel-open');
    }

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

    // Zoom +
    function zoomIn() {
        view.animate({zoom: view.getZoom() + 1, duration: 500});
    }

    //Zoom -
    function zoomOut() {
        view.animate({zoom: view.getZoom() - 1, duration: 500});
    }

    // Back to initial extent
    function zoomInit() {
        view.fit(config.initialExtent, {duration: 500});
        view.setRotation(0);
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
            messagePopup(tr("estimating device position ..."));
            navigator.geolocation.getCurrentPosition(
                showPosition, 
                function(e) {
                    messagePopup(tr("device position error"));
                },
                {maximumAge: 60000, enableHighAccuracy: true, timeout: 30000}
            );
        } else {
            messagePopup(tr("device position not available on this device"));
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
        var qsconfig;
        if (qs.c && qs.c.match(/^[A-Za-z0-9_-]+$/)) {
            qsconfig = "etc/customConfig_"+qs.c+".js";
        }
        else {
            qsconfig = "etc/customConfig.js";
        }
        $.getScript(qsconfig)
            .done(function() {
                // transmits config name for persistency
                customConfig.customConfigName = qs.c;
                doConfiguration();
                doMap();
                doGUI();
            })
            .fail(function() {
                doConfiguration();
                doMap();
                doGUI();
            });
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
            wmc: '',
            layersQueryable: [],
            layersQueryString: ''
        };
        $.extend(config, hardConfig);
        $.extend(config, window.customConfig || {});

        config.projection = ol.proj.get(config.projcode);

        // runtime state (mutable after init)
        state = {
            lb: 0,
            gficoord: null,
            gfiok: false,
            gfiz: null,
            wmctitle: '',
            search: false,
            searchindex: null,
            searchparams: {}
        };

        // querystring param: lb (selected background)
        if (qs.lb) {
            state.lb = parseInt(qs.lb) % config.layersBackground.length;
        }

        // querystring param: map id
        if (qs.wmc) {
            config.wmc = qs.wmc;
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
        
        // querystring param: qcl_filters
        if (qs.qcl_filters) {
            var qcl_filters_list = [];
            qcl_filters_list = (typeof qs.qcl_filters === 'string') ? qs.qcl_filters.split(';') : qs.qcl_filters;
    
            $.each(qcl_filters_list, function(index) {
                if (index < config.layersQueryable.length) {
                    var opt = config.layersQueryable[index].options;
                    opt.cql_filter = this;
                    config.layersQueryable[index] = new LayerQueryable(opt);
                }
            });
        }

        // querystring param: xyz
        // recenters map on specified location
        if (qs.x&&qs.y&&qs.z) {
            config.z = parseInt(qs.z);
            var p = [parseFloat(qs.x), parseFloat(qs.y)];
            // is this lonlat ? anyway don't use sviewer for the vendee globe
            if (Math.abs(p[0])<=180&&Math.abs(p[1])<=180&&config.z>7) {
                p = ol.proj.transform(p, 'EPSG:4326', config.projcode);
            }
            config.x = p[0];
            config.y = p[1];
        }

        // querystring param: title
        // controls map title
        if (qs.title) {
            setTitle(qs.title);
        }
        else {
            setTitle(config.title);
        }

        // querystring param: kml overlay url
        if (qs.kml) {
            config.kmlUrl = qs.kml;
        }

        // querystring param: perform getFeatureInfo on map center
        if (qs.q) {
            state.gfiok = true;
        }

        // querystring param: activate search based on layer text attributes
        if (qs.s) {
            state.search = true;
            state.searchparams = {};
            $("#addressForm label").text('Features or ' + $("#addressForm label").text());
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
        map = new ol.Map({
            controls: [
                new ol.control.ScaleLine()
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

        // adding WMS layers from georchestra map (WMC)
        // try wmc=58a713a089cf408419b871b73110b7cb on dev.geobretagne.fr
        if (config.wmc) {
            parseWMC(config.wmc);
        }

        // adding queryable WMS layers from querystring
        $.each(config.layersQueryable, function() {
            map.addLayer(this.wmslayer);
        });

        //activate search for WMS layer (origin : ?layers=...)
        if (state.search && config.layersQueryable.length > 0) {
            activateSearchFeatures('remote');
        }

        // adding kml overlay
        if (config.kmlUrl) {
            config.kmlLayer = new ol.layer.Vector({
                source: new ol.source.Vector({
                    url: ajaxURL(config.kmlUrl),
                    format: new ol.format.KML()
                })
            });
            map.addLayer(config.kmlLayer);

            //activate search for kml layer (origin : ?kml=...)
            if (state.search) {
                activateSearchFeatures('local');
            }
        }

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
    function doGUI() {
        // opens permalink tab if required
        if (qs.qr) {
            setPermalink();
            $('#qrcodeBtn').trigger('click');
        }

        // map events
        map.on('singleclick', function(e) {
            queryMap(e.coordinate);
        });
        map.on('moveend', setPermalink);
        $('#marker').click(clearQuery);


        // map buttons
        $('#ziBt').click(zoomIn);
        $('#zoBt').click(zoomOut);
        $('#zeBt').click(zoomInit);
        $('#bgBt').click(switchBackground);

        // geolocation form
        $('#zpBt').click(locateMe);

        // search with autocomplete - trigger on keyup after 3 characters
        $('#searchInput').on('keyup', function() {
            var query = $(this).val();
            if (query.length >= 3) {
                searchPlace();
            } else {
                $("#searchResults").html("");
            }
        });

        // set title dialog (both panel and modal)
        $('#shareSetTitle').keyup(onTitle);
        $('#shareSetTitle').blur(setPermalink);

        // sendto form
        $('#georchestraForm').submit(function(e) {
            sendMapTo('georchestra_viewer');
        });

        // WebComponent button (can appear in side panel or modal)
        $(document).on('click', '.webcomponent-btn', function() {
            var embedCode = generateEmbedCode();
            $('#embedCodeTextarea').val(embedCode);
            closePanel();
            svModal.open('#webcomponent');
        });

        // QR code button — close share panel and show QR in modal
        $(document).on('click', '#qrcodeBtn', function() {
            var href = $('#permalink').prop('href');
            $('#qrcodeDisplay').empty();
            loadQRCodeLibrary().then(function() {
                QRCode.toDataURL(href, {
                    errorCorrectionLevel: 'L',
                    type: 'image/webp',
                    quality: 0.95,
                    margin: 1,
                    width: 240,
                    color: { dark: '#000000', light: '#ffffff' }
                }).then(function(dataUrl) {
                    $('#qrcodeDisplay').html('<img src="' + dataUrl + '" alt="QR Code" style="max-width: 100%; height: auto;">');
                });
            });
            closePanel();
            svModal.open('#qrcode');
        });

        // Copy embed code button
        $('#embedCodeCopyBtn').on('click', function() {
            var textarea = document.getElementById('embedCodeTextarea');
            var btn = $(this);
            var originalText = btn.html();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textarea.value).then(function() {
                    btn.html('<i class="bi bi-check" aria-hidden="true"></i> Copied!');
                    setTimeout(function() {
                        btn.html(originalText);
                    }, 2000);
                }).catch(function() {
                    textarea.select();
                    document.execCommand('copy');
                    btn.html('<i class="bi bi-check" aria-hidden="true"></i> Copied!');
                    setTimeout(function() {
                        btn.html(originalText);
                    }, 2000);
                });
            } else {
                textarea.select();
                document.execCommand('copy');
                btn.html('<i class="bi bi-check" aria-hidden="true"></i> Copied!');
                setTimeout(function() {
                    btn.html(originalText);
                }, 2000);
            }
        });

        // dynamic resize
        $(window).bind('orientationchange resize pageshow updatelayout', panelLayout);

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
            translateDOM('.i18n', ['title', 'placeholder', 'value']);
        }
        

        // resize map
        $(window).bind("orientationchange resize pageshow", fixContentHeight);
        fixContentHeight();

        if (state.gfiok && (!(config.wmc.length>0))) {
            //~ queryMap(view.getCenter());
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