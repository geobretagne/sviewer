// sViewer × Grist widget

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

var I18N = {
    fr: {
        'loading':       'Chargement…',
        'share':         'Partager',
        'share.title':   'Partager la carte en lien permanent',
        'share.title2':  'Partager cette carte',
        'share.note':    'Lien public — les données doivent être accessibles sans authentification.',
        'cols':          'Colonnes',
        'cols.title':    'Configurer la colonne géométrie',
        'clear':         '✕ Effacer',
        'clear.title':   'Effacer la sélection',
        'geom.col':      'Colonne géométrie :',
        'apply':         'Appliquer',
        'copy':          'Copier le lien',
        'copy.done':     'Copié !',
        'open':          'Ouvrir dans un onglet',
        'close':         'Fermer',
        'auto.detected': 'Colonne géométrie détectée : ',
        'choose.col':    'Choisir la colonne géométrie',
        'features':      ' entités',
        'skipped':       ' ignorées'
    },
    en: {
        'loading':       'Loading…',
        'share':         'Share',
        'share.title':   'Share map as permalink',
        'share.title2':  'Share this map',
        'share.note':    'Public link — data must be accessible without authentication.',
        'cols':          'Columns',
        'cols.title':    'Configure geometry column',
        'clear':         '✕ Clear',
        'clear.title':   'Clear selection',
        'geom.col':      'Geometry column:',
        'apply':         'Apply',
        'copy':          'Copy link',
        'copy.done':     'Copied!',
        'open':          'Open in new tab',
        'close':         'Close',
        'auto.detected': 'Geometry column auto-detected: ',
        'choose.col':    'Choose geometry column',
        'features':      ' features',
        'skipped':       ' skipped'
    }
};

var lang = (navigator.language || 'en').slice(0, 2);
var t = I18N[lang] || I18N['en'];

function tr(key) { return t[key] || key; }

function applyDomTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        if (t[key]) { el.textContent = t[key]; }
        var titleKey = el.getAttribute('data-i18n-title');
        if (titleKey && t[titleKey]) { el.title = t[titleKey]; }
    });
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

var GEOM_CANDIDATES = ['geometry', 'geom', 'geo', 'shape', 'wkb_geometry'];

var colGeom = null;                // active geometry column name
var vectorLayer = null;            // OL vector layer holding Grist features
var featureByRowId = {};           // Grist row id → OL Feature
var allColumns = [];               // column names from last onRecords
var allRecords = [];               // raw records from last onRecords
var svConfig = {};                 // key/value pairs from _sviewer_customConfig table
var mapReady = false;              // true once SViewer.init() resolves
var gristDocId = null;             // Grist document id (for share URL)
var gristTableId = null;           // Grist table id (for share URL)
var debounceTimer = null;
var selectedRowId = null;          // currently selected Grist row id (for post-rebuild highlight)
var lastRecordsFingerprint = null; // JSON fingerprint to skip rebuild when only selection changed
var viewFitted = false;            // true once initial view fit has been done

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setStatus(msg) {
    document.getElementById('sv-status').textContent = msg;
}

// Parse a geometry value from a Grist cell.
// Accepts a GeoJSON geometry object or a JSON string thereof.
// Returns the geometry object, or null if unparseable.
function parseGeom(val) {
    if (!val) { return null; }
    var g = (typeof val === 'string') ? (function() { try { return JSON.parse(val); } catch(e) { return null; } }()) : val;
    if (g && g.type && g.coordinates) { return g; }
    return null;
}

// Auto-detect geometry column from column names, then first-row value scan.
function detectGeomColumn(columns, firstRow) {
    var names = columns.map(function(c) { return c.toLowerCase(); });
    var geom = null;
    GEOM_CANDIDATES.forEach(function(c) {
        if (!geom && names.indexOf(c) !== -1) { geom = columns[names.indexOf(c)]; }
    });
    if (!geom && firstRow) {
        columns.forEach(function(c) {
            if (!geom && parseGeom(firstRow[c])) { geom = c; }
        });
    }
    return geom;
}

// Populate the geometry column picker select.
function populateColumnPicker(columns) {
    var selGeom = document.getElementById('sv-sel-geom');
    selGeom.innerHTML = '';
    columns.forEach(function(col) {
        var opt = document.createElement('option');
        opt.value = col;
        opt.textContent = col;
        selGeom.appendChild(opt);
    });
    if (colGeom) { selGeom.value = colGeom; }
}

function showColPicker() {
    populateColumnPicker(allColumns);
    document.getElementById('sv-col-picker').style.display = 'flex';
}

function hideColPicker() {
    document.getElementById('sv-col-picker').style.display = 'none';
}

// Return an OL style function that renders Point/MultiPoint as circles
// and all other geometries (Line, Polygon, …) as fill+stroke.
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

// Highlight selectedFeat in yellow; reset all others to base color.
// Pass null to reset all features to base style.
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

// Debounce rebuildLayer calls — onRecords fires on every selection change too.
function scheduleRebuildLayer() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(rebuildLayer, 300);
}

// Rebuild the OL vector layer from allRecords.
// Reprojects EPSG:4326 → EPSG:3857. Fits view on first load only.
// Skips full rebuild when records are unchanged (fingerprint match).
function rebuildLayer() {
    if (!mapReady || !colGeom) { return; }

    var fingerprint = JSON.stringify(allRecords);
    if (vectorLayer && fingerprint === lastRecordsFingerprint) {
        applySelectionStyle(selectedRowId !== null ? featureByRowId[selectedRowId] : null);
        return;
    }
    lastRecordsFingerprint = fingerprint;

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
        var rowId = row.id;
        feat.set('_gristRowId', rowId);
        featureByRowId[rowId] = feat;
        features.push(feat);
    });

    vectorLayer = new ol.layer.Vector({
        source: new ol.source.Vector({ features: features }),
        style: makeFeatureStyle(color, 0.85, 7, 1.5)
    });

    map.addLayer(vectorLayer);

    setStatus(allRecords.length + tr('features') + (skipped ? ' (' + skipped + tr('skipped') + ')' : ''));

    if (features.length && !viewFitted) {
        var ext = vectorLayer.getSource().getExtent();
        if (ext && isFinite(ext[0])) {
            map.getView().fit(ext, { padding: [40, 40, 40, 40], maxZoom: 16, duration: 400 });
        }
        viewFitted = true;
    }

    if (selectedRowId !== null && featureByRowId[selectedRowId]) {
        applySelectionStyle(featureByRowId[selectedRowId]);
    }
}

// Wire map singleclick: hit-test vector layer, call setSelectedRows on match.
// hitTolerance: 8px makes line features easier to click.
function setupMapClick() {
    var map = SViewer.getMap();
    map.on('singleclick', function(e) {
        if (!vectorLayer) { return; }
        var hit = false;
        map.forEachFeatureAtPixel(e.pixel, function(feature) {
            var rowId = feature.get('_gristRowId');
            if (rowId !== undefined) {
                hit = true;
                selectedRowId = rowId;
                grist.setSelectedRows([rowId]);
                document.getElementById('sv-btn-clear').disabled = false;
                // Apply highlight immediately — onRecord round-trip not guaranteed
                // when this widget is the selection source (map→grid direction).
                applySelectionStyle(feature);
            }
            return true; // stop after first hit
        }, { layerFilter: function(l) { return l === vectorLayer; }, hitTolerance: 8 });
        if (!hit) {
            selectedRowId = null;
            grist.setSelectedRows(null);
            document.getElementById('sv-btn-clear').style.display = 'none';
            vectorLayer.getSource().getFeatures().forEach(function(f) { f.setStyle(null); });
        }
    });
}

// Initialize sViewer map. Config keys match sViewer embed param names (x, y, z, lb, layers).
function initMap() {
    var opts = {
        x: svConfig.x ? parseFloat(svConfig.x) : 0,
        y: svConfig.y ? parseFloat(svConfig.y) : 6000000,
        z: svConfig.z ? parseInt(svConfig.z, 10) : 5,
        title: 'sViewer — Grist'
    };
    if (svConfig.layers) { opts.layers = svConfig.layers; }
    if (svConfig.lb !== undefined) { opts.lb = parseInt(svConfig.lb, 10); }

    SViewer.init('#sv-map', opts).then(function() {
        mapReady = true;
        setupMapClick();
        rebuildLayer();
    });
}

// Validate a URL string is http or https. Returns the URL or null.
function safeHttpUrl(url) {
    if (!url) { return null; }
    try {
        var u = new URL(url);
        return (u.protocol === 'http:' || u.protocol === 'https:') ? url : null;
    } catch(e) { return null; }
}

// Build a sViewer standalone share URL pointing to the Grist public records API.
function buildShareUrl() {
    var view = SViewer.getView();
    if (!view) { return ''; }

    var cx = view.getCenter();
    var params = {
        x: Math.round(cx[0]),
        y: Math.round(cx[1]),
        z: Math.round(view.getZoom())
    };

    if (svConfig.layers) { params.layers = svConfig.layers; }
    if (svConfig.lb !== undefined) { params.lb = parseInt(svConfig.lb, 10); }

    if (gristDocId && gristTableId) {
        var gristBase = safeHttpUrl(svConfig.grist_api_base) || 'https://docs.getgrist.com';
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

// ---------------------------------------------------------------------------
// Toolbar events
// ---------------------------------------------------------------------------

document.getElementById('sv-btn-clear').addEventListener('click', function() {
    selectedRowId = null;
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
    hideColPicker();
    viewFitted = false; // allow re-fit after manual column change
    rebuildLayer();
});
document.getElementById('sv-btn-copy').addEventListener('click', function() {
    var url = document.getElementById('sv-share-url').value;
    var btn = document.getElementById('sv-btn-copy');
    function markCopied() {
        btn.textContent = tr('copy.done');
        setTimeout(function() { btn.textContent = tr('copy'); }, 2000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(markCopied).catch(function() {
            document.getElementById('sv-share-url').select();
        });
    } else {
        document.getElementById('sv-share-url').select();
    }
});
document.getElementById('sv-btn-open').addEventListener('click', function() {
    var url = document.getElementById('sv-share-url').value;
    // Reject non-http(s) URLs — sviewer_base_url could be attacker-controlled via Grist doc.
    // Relative paths (../../index.html) are also safe; safeHttpUrl returns null for them,
    // so we allow them explicitly.
    var isSafe = !url.match(/^[a-z][a-z0-9+\-.]*:/i) || safeHttpUrl(url);
    if (url && isSafe) { window.open(url, '_blank', 'noopener'); }
});
document.getElementById('sv-btn-close-share').addEventListener('click', hideSharePanel);
document.getElementById('sv-overlay').addEventListener('click', hideSharePanel);

// ---------------------------------------------------------------------------
// Grist API init sequence
// ---------------------------------------------------------------------------

// Grist table IDs follow Python class naming: leading underscores stripped,
// first letter uppercased. '_sviewer_customConfig' (display) → 'Sviewer_customConfig' (API id).
var CONFIG_TABLE = 'Sviewer_customConfig';

// requiredAccess: full — needed for docApi.fetchTable on _sviewer_customConfig
grist.ready({ requiredAccess: 'full' });

// Registered immediately after ready() — Grist fires the initial onRecords
// event right after receiving Ready; late registration (inside a Promise chain)
// misses it.
grist.onRecords(function(records) {
    allRecords = records;
    if (!gristTableId && grist.selectedTable) {
        grist.selectedTable.getTableId().then(function(id) { gristTableId = id; }).catch(function() {});
    }

    if (records.length) {
        allColumns = Object.keys(records[0]).filter(function(k) { return k !== 'id'; });
        if (!colGeom) {
            var detected = detectGeomColumn(allColumns, records[0]);
            if (detected) {
                colGeom = detected;
                setStatus(tr('auto.detected') + colGeom);
            } else {
                setStatus(tr('choose.col'));
                showColPicker();
            }
        }
    }

    scheduleRebuildLayer();
});

// Grid row selected → pan/zoom map to feature and highlight it
grist.onRecord(function(record) {
    if (!mapReady || !record || !colGeom) { return; }
    var geomVal = parseGeom(record[colGeom]);
    if (!geomVal || !geomVal.coordinates) { return; }

    var rowId = record.id;
    selectedRowId = rowId;
    var feat = featureByRowId[rowId];

    var view = SViewer.getView();
    if (view && feat) {
        document.getElementById('sv-btn-clear').style.display = '';
        var ext = feat.getGeometry().getExtent();
        view.fit(ext, { padding: [60, 60, 60, 60], maxZoom: 17, duration: 400 });
        applySelectionStyle(feat);
    }
});

// ---------------------------------------------------------------------------
// Startup: apply i18n, load config, init map
// ---------------------------------------------------------------------------

applyDomTranslations();

grist.docApi.fetchTable(CONFIG_TABLE)
    .then(function(data) {
        var keys = data.key || [];
        var vals = data.value || [];
        keys.forEach(function(k, i) { svConfig[k] = vals[i]; });
    })
    .catch(function() {})
    .then(function() {
        if (grist.docApi && typeof grist.docApi.getDocName === 'function') {
            grist.docApi.getDocName().then(function(id) { gristDocId = id; }).catch(function() {});
        }
        initMap();
    });
