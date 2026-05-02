// sViewer × Grist widget

var GEOM_CANDIDATES = ['geometry', 'geom', 'geo', 'shape', 'wkb_geometry'];
var LABEL_CANDIDATES = ['label', 'nom', 'name', 'libelle', 'titre', 'title'];

var colGeom = null;
var colLabel = null;
var svApp = null;
var vectorLayer = null;
var rowIdByFeature = new WeakMap();
var featureByRowId = {};
var allColumns = [];
var allRecords = [];
var svConfig = {};
var mapReady = false;
var gristDocId = null;
var gristTableId = null;
var debounceTimer = null;

function setStatus(msg) {
    document.getElementById('sv-status').textContent = msg;
}

function parseGeom(val) {
    if (!val) { return null; }
    var g = (typeof val === 'string') ? (function() { try { return JSON.parse(val); } catch(e) { return null; } }()) : val;
    if (g && g.type && g.coordinates) { return g; }
    return null;
}

function detectColumns(columns, firstRow) {
    var names = columns.map(function(c) { return c.toLowerCase(); });
    var geom = null, lbl = null;

    GEOM_CANDIDATES.forEach(function(c) {
        if (!geom && names.indexOf(c) !== -1) { geom = columns[names.indexOf(c)]; }
    });
    if (!geom && firstRow) {
        columns.forEach(function(c) {
            if (!geom && parseGeom(firstRow[c])) { geom = c; }
        });
    }
    LABEL_CANDIDATES.forEach(function(c) {
        if (!lbl && names.indexOf(c) !== -1) { lbl = columns[names.indexOf(c)]; }
    });

    return { geom: geom, label: lbl };
}

function populateColumnPicker(columns) {
    var selGeom = document.getElementById('sv-sel-geom');
    var selLbl = document.getElementById('sv-sel-label');

    selGeom.innerHTML = '';
    selLbl.innerHTML = '<option value="">(none)</option>';

    columns.forEach(function(col) {
        var opt = document.createElement('option');
        opt.value = col;
        opt.textContent = col;
        selGeom.appendChild(opt);

        var opt2 = document.createElement('option');
        opt2.value = col;
        opt2.textContent = col;
        selLbl.appendChild(opt2);
    });

    if (colGeom) { selGeom.value = colGeom; }
    if (colLabel) { selLbl.value = colLabel; }
}

function showColPicker() {
    populateColumnPicker(allColumns);
    document.getElementById('sv-col-picker').style.display = 'flex';
}

function hideColPicker() {
    document.getElementById('sv-col-picker').style.display = 'none';
}

function makeFeatureStyle(color, fillOpacity, radius, strokeWidth) {
    var fillArr = ol.color.asArray(color).slice();
    fillArr[3] = fillOpacity;
    var fillColor = 'rgba(' + fillArr.join(',') + ')';
    return function(feature) {
        var geomType = feature.getGeometry() ? feature.getGeometry().getType() : '';
        if (geomType === 'Point' || geomType === 'MultiPoint') {
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: radius,
                    fill: new ol.style.Fill({ color: fillColor }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: strokeWidth })
                })
            });
        }
        return new ol.style.Style({
            fill: new ol.style.Fill({ color: fillColor }),
            stroke: new ol.style.Stroke({ color: color, width: strokeWidth })
        });
    };
}

function applySelectionStyle(selectedFeat) {
    if (!vectorLayer) { return; }
    var baseColor = svConfig.geojson_color || '#e74c3c';
    var selColor = '#ffcc00';
    vectorLayer.getSource().getFeatures().forEach(function(f) {
        var isSel = f === selectedFeat;
        var c = isSel ? selColor : baseColor;
        var fillArr = ol.color.asArray(c).slice();
        fillArr[3] = isSel ? 1 : 0.85;
        var fillColor = 'rgba(' + fillArr.join(',') + ')';
        var geomType = f.getGeometry() ? f.getGeometry().getType() : '';
        if (geomType === 'Point' || geomType === 'MultiPoint') {
            f.setStyle(new ol.style.Style({
                image: new ol.style.Circle({
                    radius: isSel ? 10 : 7,
                    fill: new ol.style.Fill({ color: fillColor }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: isSel ? 2.5 : 1.5 })
                })
            }));
        } else {
            f.setStyle(new ol.style.Style({
                fill: new ol.style.Fill({ color: fillColor }),
                stroke: new ol.style.Stroke({ color: c, width: isSel ? 3 : 2 })
            }));
        }
    });
}

function scheduleRebuildLayer() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(rebuildLayer, 300);
}

function rebuildLayer() {
    if (!mapReady || !colGeom) { return; }

    var map = SViewer.getMap();
    if (!map) { return; }

    if (vectorLayer) { map.removeLayer(vectorLayer); }
    featureByRowId = {};

    var features = [];
    var skipped = 0;
    var format = new ol.format.GeoJSON();
    var color = svConfig.geojson_color || '#e74c3c';

    allRecords.forEach(function(row) {
        var geomVal = parseGeom(row[colGeom]);
        if (!geomVal) { skipped++; return; }

        var olGeom;
        try {
            olGeom = format.readGeometry({ type: geomVal.type, coordinates: geomVal.coordinates }, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            });
        } catch(e) { skipped++; return; }

        var feat = new ol.Feature({ geometry: olGeom });
        Object.keys(row).forEach(function(k) {
            if (k !== colGeom) { feat.set(k, row[k]); }
        });

        var rowId = row.id;
        feat.set('_gristRowId', rowId);
        rowIdByFeature.set(feat, rowId);
        featureByRowId[rowId] = feat;
        features.push(feat);
    });

    vectorLayer = new ol.layer.Vector({
        source: new ol.source.Vector({ features: features }),
        style: makeFeatureStyle(color, 0.85, 7, 1.5)
    });

    map.addLayer(vectorLayer);

    var total = allRecords.length;
    setStatus(total + ' features' + (skipped ? ' (' + skipped + ' skipped)' : ''));

    if (features.length && !svConfig._viewSet) {
        var ext = vectorLayer.getSource().getExtent();
        if (ext && isFinite(ext[0])) {
            map.getView().fit(ext, { padding: [40, 40, 40, 40], maxZoom: 16, duration: 400 });
        }
        svConfig._viewSet = true;
    }
}

function setupMapClick() {
    var map = SViewer.getMap();
    map.on('singleclick', function(e) {
        if (!vectorLayer) { return; }
        map.forEachFeatureAtPixel(e.pixel, function(feature) {
            var rowId = feature.get('_gristRowId');
            if (rowId !== undefined) {
                grist.setSelectedRows([rowId]);
                document.getElementById('sv-btn-clear').style.display = '';
            }
            return true;
        }, { layerFilter: function(l) { return l === vectorLayer; }, hitTolerance: 8 });
    });
}

function initMap() {
    var opts = {
        x: svConfig.center_x ? parseFloat(svConfig.center_x) : 0,
        y: svConfig.center_y ? parseFloat(svConfig.center_y) : 6000000,
        z: svConfig.zoom_default ? parseInt(svConfig.zoom_default, 10) : 5,
        title: 'sViewer — Grist'
    };

    if (svConfig.wms_url && svConfig.wms_layers) {
        opts.layers = svConfig.wms_layers;
        opts.lb = svConfig.wms_url;
    }

    SViewer.init('#sv-map', opts).then(function(app) {
        svApp = app;
        mapReady = true;
        setupMapClick();
        rebuildLayer();
    });
}

function buildShareUrl() {
    var view = SViewer.getView();
    if (!view) { return ''; }

    var cx = view.getCenter();
    var params = {
        x: Math.round(cx[0]),
        y: Math.round(cx[1]),
        z: Math.round(view.getZoom())
    };

    if (svConfig.wms_url && svConfig.wms_layers) {
        params.lb = svConfig.wms_url;
        params.layers = svConfig.wms_layers;
    }

    if (gristDocId && gristTableId) {
        var gristBase = svConfig.grist_api_base || 'https://docs.getgrist.com';
        params.geojson = gristBase + '/api/docs/' + gristDocId + '/tables/' + gristTableId + '/records';
    }

    var base = svConfig.sviewer_base_url || '../../index.html';
    return base + '?' + Object.keys(params).map(function(k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
}

function showSharePanel() {
    document.getElementById('sv-share-url').value = buildShareUrl();
    document.getElementById('sv-share-panel').style.display = 'block';
    document.getElementById('sv-overlay').style.display = 'block';
    document.getElementById('sv-share-url').select();
}

function hideSharePanel() {
    document.getElementById('sv-share-panel').style.display = 'none';
    document.getElementById('sv-overlay').style.display = 'none';
}

// Toolbar events
document.getElementById('sv-btn-clear').addEventListener('click', function() {
    grist.setSelectedRows(null);
    document.getElementById('sv-btn-clear').style.display = 'none';
    if (vectorLayer) {
        vectorLayer.getSource().getFeatures().forEach(function(f) { f.setStyle(null); });
    }
});
document.getElementById('sv-btn-share').addEventListener('click', showSharePanel);
document.getElementById('sv-btn-cols').addEventListener('click', function() {
    var picker = document.getElementById('sv-col-picker');
    if (picker.style.display === 'flex') { hideColPicker(); } else { showColPicker(); }
});
document.getElementById('sv-btn-apply-cols').addEventListener('click', function() {
    colGeom = document.getElementById('sv-sel-geom').value;
    colLabel = document.getElementById('sv-sel-label').value || null;
    hideColPicker();
    svConfig._viewSet = false;
    rebuildLayer();
});
document.getElementById('sv-btn-copy').addEventListener('click', function() {
    var inp = document.getElementById('sv-share-url');
    inp.select();
    document.execCommand('copy');
    document.getElementById('sv-btn-copy').textContent = 'Copied!';
    setTimeout(function() { document.getElementById('sv-btn-copy').textContent = 'Copy link'; }, 2000);
});
document.getElementById('sv-btn-open').addEventListener('click', function() {
    var url = document.getElementById('sv-share-url').value;
    if (url) { window.open(url, '_blank'); }
});
document.getElementById('sv-btn-close-share').addEventListener('click', hideSharePanel);
document.getElementById('sv-overlay').addEventListener('click', hideSharePanel);

// Grist init
var CONFIG_TABLE = '_sv_config';

grist.ready({ requiredAccess: 'full' });

grist.onOptions(function(options) {
    if (options && options.colGeom) { colGeom = options.colGeom; }
    if (options && options.colLabel) { colLabel = options.colLabel; }
});

grist.onRecords(function(records) {
    allRecords = records;
    if (!gristTableId && grist.selectedTable) {
        grist.selectedTable.getTableId().then(function(id) { gristTableId = id; }).catch(function() {});
    }

    if (records.length) {
        allColumns = Object.keys(records[0]).filter(function(k) { return k !== 'id'; });
        if (!colGeom) {
            var detected = detectColumns(allColumns, records[0]);
            if (detected.geom) {
                colGeom = detected.geom;
                colLabel = colLabel || detected.label;
                setStatus('Geometry column auto-detected: ' + colGeom);
            } else {
                setStatus('Choose geometry column');
                showColPicker();
            }
        }
    }

    scheduleRebuildLayer();
});

grist.onRecord(function(record) {
    if (!mapReady || !record || !colGeom) { return; }
    var geomVal = parseGeom(record[colGeom]);
    if (!geomVal || !geomVal.coordinates) { return; }

    var rowId = record.id;
    var feat = featureByRowId[rowId];
    document.getElementById('sv-btn-clear').style.display = '';

    var view = SViewer.getView();
    if (view && feat) {
        var ext = feat.getGeometry().getExtent();
        view.fit(ext, { padding: [60, 60, 60, 60], maxZoom: 17, duration: 400 });
    }

    applySelectionStyle(feat);
});

grist.docApi.fetchTable(CONFIG_TABLE).then(function(data) {
    var keys = data.key || data.Key || [];
    var vals = data.value || data.Value || [];
    keys.forEach(function(k, i) { svConfig[k] = vals[i]; });
}).catch(function() {
}).then(function() {
    if (grist.docApi && typeof grist.docApi.getDocName === 'function') {
        grist.docApi.getDocName().then(function(id) { gristDocId = id; }).catch(function() {});
    }
    initMap();
});
