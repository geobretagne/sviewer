// sViewer × Grist widget

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

var I18N = {
    fr: {
        'loading':            'Chargement…',
        'clear':              '✕ Désélectionner',
        'clear.title':        'Effacer la sélection',
        'geom.col':           'Géométrie :',
        'label.col':          'Étiquette :',
        'lat.col':            'Latitude :',
        'lon.col':            'Longitude :',
        'auto.detected':      'Colonne géométrie détectée : ',
        'auto.detected.ll':   'Colonnes lat/lon détectées : ',
        'choose.col':         'Choisir la colonne géométrie',
        'choose.lat':         'Choisir la colonne latitude',
        'choose.lon':         'Choisir la colonne longitude',
        'features':           ' entités',
        'skipped':            ' ignorées',
        'no.config':          'Pas de table _sviewer_customConfig — valeurs par défaut'
    },
    en: {
        'loading':            'Loading…',
        'clear':              '✕ Deselect',
        'clear.title':        'Clear selection',
        'geom.col':           'Geometry:',
        'label.col':          'Label:',
        'lat.col':            'Latitude:',
        'lon.col':            'Longitude:',
        'auto.detected':      'Geometry column auto-detected: ',
        'auto.detected.ll':   'Lat/lon columns auto-detected: ',
        'choose.col':         'Choose geometry column',
        'choose.lat':         'Choose latitude column',
        'choose.lon':         'Choose longitude column',
        'features':           ' features',
        'skipped':            ' skipped',
        'no.config':          'No _sviewer_customConfig table — using defaults'
    },
    es: {
        'loading':            'Cargando…',
        'clear':              '✕ Deseleccionar',
        'clear.title':        'Borrar selección',
        'geom.col':           'Geometría:',
        'label.col':          'Etiqueta:',
        'lat.col':            'Latitud:',
        'lon.col':            'Longitud:',
        'auto.detected':      'Columna de geometría detectada: ',
        'auto.detected.ll':   'Columnas lat/lon detectadas: ',
        'choose.col':         'Elegir columna de geometría',
        'choose.lat':         'Elegir columna de latitud',
        'choose.lon':         'Elegir columna de longitud',
        'features':           ' entidades',
        'skipped':            ' omitidas',
        'no.config':          'Sin tabla _sviewer_customConfig — valores por defecto'
    },
    de: {
        'loading':            'Laden…',
        'clear':              '✕ Auswahl aufheben',
        'clear.title':        'Auswahl löschen',
        'geom.col':           'Geometrie:',
        'label.col':          'Beschriftung:',
        'lat.col':            'Breitengrad:',
        'lon.col':            'Längengrad:',
        'auto.detected':      'Geometriespalte erkannt: ',
        'auto.detected.ll':   'Lat/Lon-Spalten erkannt: ',
        'choose.col':         'Geometriespalte wählen',
        'choose.lat':         'Breitengradpalte wählen',
        'choose.lon':         'Längengradpalte wählen',
        'features':           ' Objekte',
        'skipped':            ' übersprungen',
        'no.config':          'Keine _sviewer_customConfig-Tabelle — Standardwerte'
    }
};

// slice(0,2) : garde uniquement le code langue sans le sous-tag région (ex. "fr-FR" → "fr")
var lang = (navigator.language || 'en').slice(0, 2);
var t = I18N[lang] || I18N['en'];

function tr(key) { return t[key] || key; }

function applyDomTranslations() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        if (t[key]) { el.textContent = t[key]; }
        var titleKey = el.getAttribute('data-i18n-title');
        if (titleKey && t[titleKey]) { el.title = t[titleKey]; }
        // data-i18n-aria : aria-label traduit, plus fiable que title pour les lecteurs d'écran
        var ariaKey = el.getAttribute('data-i18n-aria');
        if (ariaKey && t[ariaKey]) { el.setAttribute('aria-label', t[ariaKey]); }
    });
}

// ---------------------------------------------------------------------------
// État
// ---------------------------------------------------------------------------

var GEOM_CANDIDATES = ['geometry', 'geom', 'geo', 'shape', 'wkb_geometry'];
var LABEL_CANDIDATES = ['label', 'nom', 'name', 'libelle', 'titre', 'title'];
var LAT_CANDIDATES  = ['latitude', 'lat'];
var LON_CANDIDATES  = ['longitude', 'lon', 'lng'];

var colGeom = null;                // colonne géométrie active
var colLabel = null;               // colonne étiquette active (optionnelle)
var colLat = null;                 // colonne latitude (mode lat/lon)
var colLon = null;                 // colonne longitude (mode lat/lon)
var vectorLayer = null;            // couche OL vecteur portant les entités Grist
var featureByRowId = {};           // id ligne Grist → OL Feature
var allColumns = [];               // noms de colonnes du dernier onRecords
var allRecords = [];               // enregistrements bruts du dernier onRecords
var svConfig = {};                 // paires clé/valeur de la table _sviewer_customConfig
var mapReady = false;              // vrai une fois SViewer.init() résolu
var recordsReady = false;          // vrai après le premier onRecords
var mapClickWired = false;         // vrai une fois setupMapClick exécuté
var gristDocId = null;             // identifiant du document Grist (pour l'URL de partage)
var gristTableId = null;           // identifiant de la table Grist (pour l'URL de partage)
var debounceTimer = null;
var selectedRowId = null;          // id de la ligne Grist sélectionnée (pour le surlignage post-rebuild)
var lastRecordsFingerprint = null; // empreinte JSON pour éviter un rebuild si seule la sélection a changé
var viewFitted = false;            // vrai une fois le premier fit de vue effectué

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function setStatus(msg) {
    document.getElementById('sv-status').textContent = msg;
}

// Accepte un objet GeoJSON géométrie ou une chaîne JSON équivalente.
// Retourne l'objet géométrie, ou null si non parseable.
function parseGeom(val) {
    if (!val) { return null; }
    var g = (typeof val === 'string') ? (function() { try { return JSON.parse(val); } catch(e) { return null; } }()) : val;
    if (g && g.type && g.coordinates) { return g; }
    return null;
}

// Détecte les colonnes géométrie, lat/lon et étiquette depuis les noms de colonnes et la première ligne.
// Retourne { geom, lat, lon, label } — chaque champ peut être null.
// Priorité : colonne géométrie > paire lat/lon.
function detectColumns(columns, firstRow) {
    var names = columns.map(function(c) { return c.toLowerCase(); });
    var geom = null, lbl = null, lat = null, lon = null;
    GEOM_CANDIDATES.forEach(function(c) {
        if (!geom && names.indexOf(c) !== -1) { geom = columns[names.indexOf(c)]; }
    });
    // Fallback : scan de la première ligne si aucun nom candidat ne correspond
    if (!geom && firstRow) {
        columns.forEach(function(c) {
            if (!geom && parseGeom(firstRow[c])) { geom = c; }
        });
    }
    // Si pas de colonne géométrie, chercher une paire lat/lon
    if (!geom) {
        LAT_CANDIDATES.forEach(function(c) { if (!lat && names.indexOf(c) !== -1) { lat = columns[names.indexOf(c)]; } });
        LON_CANDIDATES.forEach(function(c) { if (!lon && names.indexOf(c) !== -1) { lon = columns[names.indexOf(c)]; } });
        if (!lat || !lon) { lat = null; lon = null; }
    }
    LABEL_CANDIDATES.forEach(function(c) {
        if (!lbl && names.indexOf(c) !== -1) { lbl = columns[names.indexOf(c)]; }
    });
    return { geom: geom, lat: lat, lon: lon, label: lbl };
}

// Remplit les selects géométrie, lat, lon et étiquette de la barre d'outils.
// Affiche le groupe géométrie OU le groupe lat/lon selon le mode actif.
function populateColumnPicker(columns) {
    var selGeom = document.getElementById('sv-sel-geom');
    var selLat  = document.getElementById('sv-sel-lat');
    var selLon  = document.getElementById('sv-sel-lon');
    var selLbl  = document.getElementById('sv-sel-label');
    var noneLbl = lang === 'fr' ? '(aucune)' : lang === 'de' ? '(keine)' : lang === 'es' ? '(ninguna)' : '(none)';

    // Vide tous les selects
    selGeom.options.length = 0;
    selLat.options.length  = 0;
    selLon.options.length  = 0;
    selLbl.options.length  = 0;

    // Placeholder désactivé pour géométrie, lat, lon
    [['sv-sel-geom', 'choose.col'], ['sv-sel-lat', 'choose.lat'], ['sv-sel-lon', 'choose.lon']].forEach(function(pair) {
        var sel = document.getElementById(pair[0]);
        var ph = document.createElement('option');
        ph.value = ''; ph.textContent = tr(pair[1]); ph.disabled = true;
        sel.appendChild(ph);
    });

    var noneOpt = document.createElement('option');
    noneOpt.value = ''; noneOpt.textContent = noneLbl;
    selLbl.appendChild(noneOpt);

    columns.forEach(function(col) {
        function makeOpt() { var o = document.createElement('option'); o.value = col; o.textContent = col; o.title = col; return o; }
        selGeom.appendChild(makeOpt());
        selLat.appendChild(makeOpt());
        selLon.appendChild(makeOpt());
        selLbl.appendChild(makeOpt());
    });

    // Affiche le bon groupe selon le mode
    var isLatLon = !colGeom && (colLat || colLon);
    document.getElementById('sv-group-geom').style.display = isLatLon ? 'none' : '';
    document.getElementById('sv-group-lat').style.display  = isLatLon ? '' : 'none';
    document.getElementById('sv-group-lon').style.display  = isLatLon ? '' : 'none';

    if (colGeom)  { selGeom.value = colGeom; } else { selGeom.value = ''; }
    if (colLat)   { selLat.value  = colLat;  } else { selLat.value  = ''; }
    if (colLon)   { selLon.value  = colLon;  } else { selLon.value  = ''; }
    if (colLabel) { selLbl.value  = colLabel; } else { selLbl.value = ''; }
}

// Retourne un ol.style.Text pour une valeur d'étiquette (null-safe).
// text !== 0 : autorise la valeur zéro comme étiquette valide.
function makeTextStyle(text, bold) {
    if (!text && text !== 0) { return null; }
    return new ol.style.Text({
        text: String(text),
        font: (bold ? 'bold ' : '') + '12px sans-serif',
        fill: new ol.style.Fill({ color: '#222' }),
        stroke: new ol.style.Stroke({ color: '#fff', width: 3 }),
        overflow: true,
        offsetY: -14
    });
}

// Retourne une fonction de style OL : cercle pour Point/MultiPoint, fill+stroke pour les autres.
// Lit la propriété _label posée sur chaque feature dans rebuildLayer.
function makeFeatureStyle(color, fillOpacity, radius, strokeWidth) {
    var fillArr = ol.color.asArray(color).slice();
    fillArr[3] = fillOpacity;
    var fillColor = 'rgba(' + fillArr.join(',') + ')';
    return function(feature) {
        var geomType = feature.getGeometry() ? feature.getGeometry().getType() : '';
        var text = makeTextStyle(feature.get('_label'), false);
        if (geomType === 'Point' || geomType === 'MultiPoint') {
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: radius,
                    fill: new ol.style.Fill({ color: fillColor }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: strokeWidth })
                }),
                text: text
            });
        }
        return new ol.style.Style({
            fill: new ol.style.Fill({ color: fillColor }),
            stroke: new ol.style.Stroke({ color: color, width: strokeWidth }),
            text: text
        });
    };
}

// Surligne selectedFeat en jaune ; remet toutes les autres à la couleur de base.
// Passer null réinitialise toutes les entités au style de base.
function applySelectionStyle(selectedFeat) {
    if (!vectorLayer) { return; }
    var baseColor = safeColor(svConfig.feature_color, '#e74c3c');
    var selColor = safeColor(svConfig.feature_highlight_color, '#ffcc00');
    vectorLayer.getSource().getFeatures().forEach(function(f) {
        var isSel = f === selectedFeat;
        var c = isSel ? selColor : baseColor;
        var fillArr = ol.color.asArray(c).slice();
        fillArr[3] = isSel ? 1 : 0.85;
        var fillColor = 'rgba(' + fillArr.join(',') + ')';
        var geomType = f.getGeometry() ? f.getGeometry().getType() : '';
        var text = makeTextStyle(f.get('_label'), isSel); // étiquette en gras sur l'entité sélectionnée
        if (geomType === 'Point' || geomType === 'MultiPoint') {
            f.setStyle(new ol.style.Style({
                image: new ol.style.Circle({
                    radius: isSel ? 10 : 7,
                    fill: new ol.style.Fill({ color: fillColor }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: isSel ? 2.5 : 1.5 })
                }),
                text: text
            }));
        } else {
            f.setStyle(new ol.style.Style({
                fill: new ol.style.Fill({ color: fillColor }),
                stroke: new ol.style.Stroke({ color: c, width: isSel ? 3 : 2 }),
                text: text
            }));
        }
    });
}

// onRecords se déclenche aussi à chaque changement de sélection — le debounce évite les rebuilds inutiles.
function scheduleRebuildLayer() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(rebuildLayer, 300);
}

// Reconstruit la couche OL vecteur depuis allRecords.
// Reprojette EPSG:4326 → EPSG:3857. Fit de vue au premier chargement uniquement.
// Court-circuite le rebuild si les données n'ont pas changé (empreinte identique).
function rebuildLayer() {
    if (!mapReady || (!colGeom && !(colLat && colLon))) { return; }

    // colonnes actives dans l'empreinte : force le rebuild si la colonne change sans que les données bougent
    var fingerprint = JSON.stringify(allRecords) + '|' + colGeom + '|' + colLat + '|' + colLon + '|' + colLabel;
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
    var color = safeColor(svConfig.feature_color, '#e74c3c');

    allRecords.forEach(function(row) {
        var geomVal;
        if (colGeom) {
            geomVal = parseGeom(row[colGeom]);
        } else {
            var lat = parseFloat(row[colLat]);
            var lon = parseFloat(row[colLon]);
            if (!isNaN(lat) && !isNaN(lon)) { geomVal = { type: 'Point', coordinates: [lon, lat] }; }
        }
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
        if (colLabel && row[colLabel] !== undefined && row[colLabel] !== null) {
            feat.set('_label', row[colLabel]);
        }
        featureByRowId[rowId] = feat;
        features.push(feat);
    });

    vectorLayer = new ol.layer.Vector({
        source: new ol.source.Vector({ features: features }),
        style: makeFeatureStyle(color, 0.85, 7, 1.5)
    });

    map.addLayer(vectorLayer);

    setStatus(allRecords.length + tr('features') + (skipped ? ' (' + skipped + tr('skipped') + ')' : ''));

    // Fit uniquement si aucune position n'est configurée (x/y dans svConfig = vue imposée)
    if (features.length && !viewFitted && !svConfig.x && !svConfig.y) {
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

// Arme le clic carte uniquement après que la carte ET le premier batch d'enregistrements sont prêts.
// Évite que setSelectedRows se déclenche avant que la grille ait des données à sélectionner.
function maybeSetupMapClick() {
    if (mapClickWired || !mapReady || !recordsReady) { return; }
    mapClickWired = true;
    setupMapClick();
}

// hitTolerance: 8px facilite le clic sur les entités linéaires.
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
                // Surlignage immédiat — l'aller-retour onRecord n'est pas garanti
                // quand c'est le widget qui est la source de sélection (carte→grille).
                applySelectionStyle(feature);
            }
            return true; // arrêt après le premier hit
        }, { layerFilter: function(l) { return l === vectorLayer; }, hitTolerance: 8 });
        if (!hit) {
            selectedRowId = null;
            grist.setSelectedRows(null);
            document.getElementById('sv-btn-clear').disabled = true;
            vectorLayer.getSource().getFeatures().forEach(function(f) { f.setStyle(null); });
        }
    });
}

// Valide une couleur CSS. Retourne la couleur ou le fallback.
// ol.color.asArray lève une exception sur les valeurs invalides.
function safeColor(val, fallback) {
    if (!val || typeof val !== 'string') { return fallback; }
    try { return ol.color.asArray(val) ? val : fallback; } catch(e) { return fallback; }
}

// Valide une URL http/https. Retourne uniquement l'origine (scheme://host:port)
// pour empêcher l'injection de chemin/paramètres depuis grist_api_base.
function safeHttpUrl(url) {
    if (!url) { return null; }
    try {
        var u = new URL(url);
        return (u.protocol === 'http:' || u.protocol === 'https:') ? u.origin : null;
    } catch(e) { return null; }
}

// Construit l'URL publique de l'API Grist pour le document/table courants.
// Retourne null si les identifiants ne sont pas encore connus.
function buildGristGeojsonUrl() {
    if (!gristDocId || !gristTableId) { return null; }
    var gristBase = (safeHttpUrl(svConfig.grist_api_base) || 'https://docs.getgrist.com').replace(/\/+$/, '');
    // encodeURIComponent : évite la manipulation de chemin si les IDs contiennent '/', '?' ou '#'
    return gristBase + '/api/docs/' + encodeURIComponent(gristDocId) + '/tables/' + encodeURIComponent(gristTableId) + '/records';
}

// Initialise la carte sViewer. Les clés de config correspondent aux paramètres d'URL sViewer.
// geojson n'est pas passé à init pour éviter qu'sViewer rende une couche en double ;
// il est injecté après via setGeojsonUrl() pour que le panneau de partage l'inclue correctement.
function initMap() {
    var opts = {
        x: svConfig.x ? parseFloat(svConfig.x) : 0,
        y: svConfig.y ? parseFloat(svConfig.y) : 6000000,
        z: svConfig.z ? parseInt(svConfig.z, 10) : 5,
        title: svConfig.title || 'sViewer — Grist'
    };
    if (svConfig.layers) { opts.layers = svConfig.layers; }
    if (svConfig.lb !== undefined) { opts.lb = parseInt(svConfig.lb, 10); }

    SViewer.init('#sv-map', opts).then(function() {
        mapReady = true;
        var geojsonUrl = buildGristGeojsonUrl();
        if (geojsonUrl) { SViewer.setGeojsonUrl(geojsonUrl); }
        maybeSetupMapClick();
        rebuildLayer();
    }).catch(function(e) {
        console.error('[sviewer] init failed:', e);
        setStatus('⚠ ' + (e && e.message ? e.message : 'Map init failed'));
    });
}

// ---------------------------------------------------------------------------
// Événements barre d'outils
// ---------------------------------------------------------------------------

document.getElementById('sv-btn-clear').addEventListener('click', function() {
    selectedRowId = null;
    grist.setSelectedRows(null);
    document.getElementById('sv-btn-clear').disabled = true;
    if (vectorLayer) {
        vectorLayer.getSource().getFeatures().forEach(function(f) { f.setStyle(null); });
    }
});
document.getElementById('sv-sel-geom').addEventListener('change', function() {
    colGeom = this.value;
    colLat = null; colLon = null;
    viewFitted = false;
    rebuildLayer();
});
document.getElementById('sv-sel-lat').addEventListener('change', function() {
    colLat = this.value;
    colGeom = null;
    viewFitted = false;
    rebuildLayer();
});
document.getElementById('sv-sel-lon').addEventListener('change', function() {
    colLon = this.value;
    colGeom = null;
    viewFitted = false;
    rebuildLayer();
});
document.getElementById('sv-sel-label').addEventListener('change', function() {
    colLabel = this.value || null;
    rebuildLayer();
});

// ---------------------------------------------------------------------------
// Séquence d'initialisation Grist
// ---------------------------------------------------------------------------

// Les IDs de tables Grist suivent la convention Python : underscores initiaux supprimés,
// première lettre en majuscule. '_sviewer_customConfig' (affichage) → 'Sviewer_customConfig' (API).
var CONFIG_TABLE = 'Sviewer_customConfig';

// requiredAccess: full — nécessaire pour docApi.fetchTable sur _sviewer_customConfig
grist.ready({ requiredAccess: 'full' });

// Enregistré immédiatement après ready() — Grist envoie le premier onRecords
// dès réception de Ready ; un enregistrement tardif (dans une Promise) le manquerait.
grist.onRecords(function(records) {
    allRecords = records;
    if (!recordsReady) { recordsReady = true; maybeSetupMapClick(); }

    if (records.length) {
        allColumns = Object.keys(records[0]).filter(function(k) { return k !== 'id'; });
        populateColumnPicker(allColumns);
        if (!colGeom && !colLat && !colLon) {
            var detected = detectColumns(allColumns, records[0]);
            if (detected.geom) {
                colGeom = detected.geom;
                colLabel = colLabel || detected.label;
                setStatus(tr('auto.detected') + colGeom);
            } else if (detected.lat && detected.lon) {
                colLat = detected.lat;
                colLon = detected.lon;
                colLabel = colLabel || detected.label;
                setStatus(tr('auto.detected.ll') + colLat + ' / ' + colLon);
            } else {
                setStatus(tr('choose.col'));
            }
        }
    }

    scheduleRebuildLayer();
});

// Ligne sélectionnée dans la grille → pan/zoom carte sur l'entité et surlignage
grist.onRecord(function(record) {
    if (!mapReady || !record) { return; }
    var geomVal;
    if (colGeom) {
        geomVal = parseGeom(record[colGeom]);
    } else if (colLat && colLon) {
        var lat = parseFloat(record[colLat]);
        var lon = parseFloat(record[colLon]);
        if (!isNaN(lat) && !isNaN(lon)) { geomVal = { type: 'Point', coordinates: [lon, lat] }; }
    }
    if (!geomVal || !geomVal.coordinates) { return; }

    var rowId = record.id;
    selectedRowId = rowId;
    var feat = featureByRowId[rowId];

    var view = SViewer.getView();
    if (view && feat) {
        document.getElementById('sv-btn-clear').disabled = false;
        var ext = feat.getGeometry().getExtent();
        view.fit(ext, { padding: [60, 60, 60, 60], maxZoom: 17, duration: 400 });
        applySelectionStyle(feat);
    }
});

// ---------------------------------------------------------------------------
// Démarrage : i18n, chargement config, init carte
// ---------------------------------------------------------------------------

applyDomTranslations();

// Chaîne de démarrage : config → IDs doc/table → init carte avec URL geojson intégrée.
// Les IDs sont attendus avant initMap() pour que le panneau de partage sViewer
// inclue l'URL des données Grist dès le départ.
grist.docApi.fetchTable(CONFIG_TABLE)
    .then(function(data) {
        var keys = data.key || [];
        var vals = data.value || [];
        keys.forEach(function(k, i) { svConfig[k] = vals[i]; });
    })
    .catch(function(e) { console.warn('[sviewer] config table missing or error:', e); setStatus(tr('no.config')); })
    .then(function() {
        var docPromise = (grist.docApi && typeof grist.docApi.getDocName === 'function')
            ? grist.docApi.getDocName().then(function(id) { gristDocId = id; }).catch(function() {})
            : Promise.resolve();
        var tablePromise = (grist.selectedTable)
            ? grist.selectedTable.getTableId().then(function(id) { gristTableId = id; }).catch(function() {})
            : Promise.resolve();
        return Promise.all([docPromise, tablePromise]);
    })
    .then(function() {
        initMap();
    });
