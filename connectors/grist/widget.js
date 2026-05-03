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
        'settings':           'Paramètres de la carte',
        'settings.geom.mode':          'Mode géométrie',
        'settings.geom.mode.auto':     'Auto',
        'settings.geom.mode.geojson':  'GeoJSON',
        'settings.geom.mode.latlon':   'Lat / Lon (colonnes)',
        'settings.geom.mode.lonlat_str': 'Lon,Lat (texte)',
        'settings.geom.mode.latlon_str': 'Lat,Lon (texte)',
        'settings.geom.mode.wkt':        'WKT',
        'settings.geom':      'Colonne géométrie',
        'settings.lat':       'Colonne latitude',
        'settings.lon':       'Colonne longitude',
        'settings.label':     'Colonne étiquette',
        'settings.fill':          'Remplissage entités',
        'settings.fill.opacity':  'Opacité remplissage',
        'settings.stroke':        'Contour entités',
        'settings.stroke.opacity':'Opacité contour',
        'settings.stroke.width':  'Épaisseur contour (px)',
        'settings.sel.fill':          'Remplissage sélection',
        'settings.sel.fill.opacity':  'Opacité remplissage',
        'settings.sel.stroke':        'Contour sélection',
        'settings.sel.stroke.opacity':'Opacité contour',
        'settings.sel.stroke.width':  'Épaisseur contour (px)',
        'settings.title':     'Titre (title=)',
        'settings.layers':    'Données WMS (layers=)',
        'settings.md':        'Métadonnée CSW (md=)',
        'settings.lb':        'Fond de carte (lb=)',
        'settings.x':         'Centre X (x=)',
        'settings.y':         'Centre Y (y=)',
        'settings.z':         'Zoom (z=)',
        'settings.svbase':    'URL de base sViewer',
        'settings.apibase':   'URL de base API Grist',
        'settings.georchestra':    'URL de base geOrchestra',
        'settings.fit':            'Ajuster à l\'étendue des données',
        'settings.section.map':    'Carte',
        'settings.section.data':   'Données',
        'settings.section.share':  'Partage',
        'settings.section.help':   'Aide',
        'settings.save':           'Enregistrer',
        'settings.cancel':         'Annuler',
        'settings.export':             'Exporter',
        'settings.import':             'Importer',
        'settings.import.apply':       'Appliquer',
        'settings.import.placeholder': 'Coller le JSON exporté ici…',
        'settings.export.done':        'Paramètres copiés dans le presse-papiers',
        'settings.import.error':       'JSON invalide ou incompatible',
        'settings.save.reminder':      '⚠ Cliquez sur Enregistrer dans Grist pour figer les paramètres'
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
        'settings':           'Map settings',
        'settings.geom.mode':          'Geometry mode',
        'settings.geom.mode.auto':     'Auto',
        'settings.geom.mode.geojson':  'GeoJSON',
        'settings.geom.mode.latlon':   'Lat / Lon (columns)',
        'settings.geom.mode.lonlat_str': 'Lon,Lat (text)',
        'settings.geom.mode.latlon_str': 'Lat,Lon (text)',
        'settings.geom.mode.wkt':        'WKT',
        'settings.geom':      'Geometry column',
        'settings.lat':       'Latitude column',
        'settings.lon':       'Longitude column',
        'settings.label':     'Label column',
        'settings.fill':          'Feature fill',
        'settings.fill.opacity':  'Fill opacity',
        'settings.stroke':        'Feature stroke',
        'settings.stroke.opacity':'Stroke opacity',
        'settings.stroke.width':  'Stroke width (px)',
        'settings.sel.fill':          'Selection fill',
        'settings.sel.fill.opacity':  'Fill opacity',
        'settings.sel.stroke':        'Selection stroke',
        'settings.sel.stroke.opacity':'Stroke opacity',
        'settings.sel.stroke.width':  'Stroke width (px)',
        'settings.title':     'Title (title=)',
        'settings.layers':    'WMS data (layers=)',
        'settings.md':        'CSW metadata (md=)',
        'settings.lb':        'Background (lb=)',
        'settings.x':         'Center X (x=)',
        'settings.y':         'Center Y (y=)',
        'settings.z':         'Zoom (z=)',
        'settings.svbase':    'sViewer base URL',
        'settings.apibase':   'Grist API base URL',
        'settings.georchestra':    'geOrchestra base URL',
        'settings.fit':            'Fit map to data extent',
        'settings.section.map':    'Map',
        'settings.section.data':   'Data',
        'settings.section.share':  'Sharing',
        'settings.section.help':   'Help',
        'settings.save':           'Save',
        'settings.cancel':         'Cancel',
        'settings.export':             'Export',
        'settings.import':             'Import',
        'settings.import.apply':       'Apply',
        'settings.import.placeholder': 'Paste exported JSON here…',
        'settings.export.done':        'Settings copied to clipboard',
        'settings.import.error':       'Invalid or incompatible JSON',
        'settings.save.reminder':      '⚠ Click Save in Grist to keep settings'
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
        'settings':           'Configuración del mapa',
        'settings.geom.mode':          'Modo geometría',
        'settings.geom.mode.auto':     'Auto',
        'settings.geom.mode.geojson':  'GeoJSON',
        'settings.geom.mode.latlon':   'Lat / Lon (columnas)',
        'settings.geom.mode.lonlat_str': 'Lon,Lat (texto)',
        'settings.geom.mode.latlon_str': 'Lat,Lon (texto)',
        'settings.geom.mode.wkt':        'WKT',
        'settings.geom':      'Columna de geometría',
        'settings.lat':       'Columna de latitud',
        'settings.lon':       'Columna de longitud',
        'settings.label':     'Columna de etiqueta',
        'settings.fill':          'Relleno entidades',
        'settings.fill.opacity':  'Opacidad relleno',
        'settings.stroke':        'Contorno entidades',
        'settings.stroke.opacity':'Opacidad contorno',
        'settings.stroke.width':  'Grosor contorno (px)',
        'settings.sel.fill':          'Relleno selección',
        'settings.sel.fill.opacity':  'Opacidad relleno',
        'settings.sel.stroke':        'Contorno selección',
        'settings.sel.stroke.opacity':'Opacidad contorno',
        'settings.sel.stroke.width':  'Grosor contorno (px)',
        'settings.title':     'Título (title=)',
        'settings.layers':    'Datos WMS (layers=)',
        'settings.md':        'Metadato CSW (md=)',
        'settings.lb':        'Mapa base (lb=)',
        'settings.x':         'Centro X (x=)',
        'settings.y':         'Centro Y (y=)',
        'settings.z':         'Zoom (z=)',
        'settings.svbase':    'URL base sViewer',
        'settings.apibase':   'URL base API Grist',
        'settings.georchestra':    'URL base geOrchestra',
        'settings.fit':            'Ajustar mapa a la extensión de datos',
        'settings.section.map':    'Mapa',
        'settings.section.data':   'Datos',
        'settings.section.share':  'Compartir',
        'settings.section.help':   'Ayuda',
        'settings.save':           'Guardar',
        'settings.cancel':         'Cancelar',
        'settings.export':             'Exportar',
        'settings.import':             'Importar',
        'settings.import.apply':       'Aplicar',
        'settings.import.placeholder': 'Pegar JSON exportado aquí…',
        'settings.export.done':        'Configuración copiada al portapapeles',
        'settings.import.error':       'JSON inválido o incompatible',
        'settings.save.reminder':      '⚠ Haga clic en Guardar en Grist para conservar los ajustes'
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
        'settings':           'Karteneinstellungen',
        'settings.geom.mode':          'Geometriemodus',
        'settings.geom.mode.auto':     'Auto',
        'settings.geom.mode.geojson':  'GeoJSON',
        'settings.geom.mode.latlon':   'Lat / Lon (Spalten)',
        'settings.geom.mode.lonlat_str': 'Lon,Lat (Text)',
        'settings.geom.mode.latlon_str': 'Lat,Lon (Text)',
        'settings.geom.mode.wkt':        'WKT',
        'settings.geom':      'Geometriespalte',
        'settings.lat':       'Breitengradpalte',
        'settings.lon':       'Längengradpalte',
        'settings.label':     'Beschriftungsspalte',
        'settings.fill':          'Füllung Objekte',
        'settings.fill.opacity':  'Fülldeckkraft',
        'settings.stroke':        'Kontur Objekte',
        'settings.stroke.opacity':'Konturdeckkraft',
        'settings.stroke.width':  'Konturstärke (px)',
        'settings.sel.fill':          'Füllung Auswahl',
        'settings.sel.fill.opacity':  'Fülldeckkraft',
        'settings.sel.stroke':        'Kontur Auswahl',
        'settings.sel.stroke.opacity':'Konturdeckkraft',
        'settings.sel.stroke.width':  'Konturstärke (px)',
        'settings.title':     'Titel (title=)',
        'settings.layers':    'WMS-Daten (layers=)',
        'settings.md':        'CSW-Metadaten (md=)',
        'settings.lb':        'Hintergrund (lb=)',
        'settings.x':         'Mittelpunkt X (x=)',
        'settings.y':         'Mittelpunkt Y (y=)',
        'settings.z':         'Zoom (z=)',
        'settings.svbase':    'sViewer Basis-URL',
        'settings.apibase':   'Grist API Basis-URL',
        'settings.georchestra':    'geOrchestra Basis-URL',
        'settings.fit':            'Karte an Datenausdehnung anpassen',
        'settings.section.map':    'Karte',
        'settings.section.data':   'Daten',
        'settings.section.share':  'Teilen',
        'settings.section.help':   'Hilfe',
        'settings.save':           'Speichern',
        'settings.cancel':         'Abbrechen',
        'settings.export':             'Exportieren',
        'settings.import':             'Importieren',
        'settings.import.apply':       'Anwenden',
        'settings.import.placeholder': 'Exportiertes JSON hier einfügen…',
        'settings.export.done':        'Einstellungen in Zwischenablage kopiert',
        'settings.import.error':       'Ungültiges oder inkompatibles JSON',
        'settings.save.reminder':      '⚠ Klicken Sie in Grist auf Speichern, um die Einstellungen zu behalten'
    }
};

// slice(0,2) : garde uniquement le code langue sans le sous-tag région (ex. "fr-FR" → "fr")
var lang = (navigator.language || 'en').slice(0, 2);
var t = I18N[lang] || I18N['en'];

function tr(key) { return t[key] || key; }

function applyDomTranslations() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n],[data-i18n-title],[data-i18n-aria],[data-i18n-placeholder]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        if (key && t[key]) { el.textContent = t[key]; }
        var titleKey = el.getAttribute('data-i18n-title');
        if (titleKey && t[titleKey]) { el.title = t[titleKey]; }
        var ariaKey = el.getAttribute('data-i18n-aria');
        if (ariaKey && t[ariaKey]) { el.setAttribute('aria-label', t[ariaKey]); }
        var phKey = el.getAttribute('data-i18n-placeholder');
        if (phKey && t[phKey]) { el.placeholder = t[phKey]; }
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
var colGeomMode = 'auto';          // mode géométrie : auto|geojson|latlon|lonlat_str|latlon_str|wkt
var initialLayers = null;          // valeur de layers= à l'init — rechargement si modifiée
var initialMd = null;              // valeur de md= à l'init — rechargement si modifiée
var optionsLoaded = false;         // vrai une fois applyOptions() appelé au moins une fois
var widgetOptions = null;          // options widget Grist (surcharges par instance)
var vectorLayer = null;            // couche OL vecteur portant les entités Grist
var featureByRowId = {};           // id ligne Grist → OL Feature
var allColumns = [];               // noms de colonnes du dernier onRecords
var allRecords = [];               // enregistrements bruts du dernier onRecords
var svConfig = {};                 // clés de configuration (widget options)
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
// Retourne { geom, lat, lon, label, mode } — chaque champ peut être null.
// Priorité : GeoJSON > paire lat/lon > colonne texte "lat,lon" ou "lon,lat".
function detectColumns(columns, firstRow) {
    var names = columns.map(function(c) { return c.toLowerCase(); });
    var geom = null, lbl = null, lat = null, lon = null, mode = 'auto';
    GEOM_CANDIDATES.forEach(function(c) {
        if (!geom && names.indexOf(c) !== -1) { geom = columns[names.indexOf(c)]; }
    });
    // Fallback : scan de la première ligne si aucun nom candidat ne correspond
    if (!geom && firstRow) {
        columns.forEach(function(c) {
            if (!geom && parseGeom(firstRow[c])) { geom = c; }
        });
    }
    if (geom) { mode = 'geojson'; }
    // Si pas de colonne géométrie, chercher une paire lat/lon
    if (!geom) {
        LAT_CANDIDATES.forEach(function(c) { if (!lat && names.indexOf(c) !== -1) { lat = columns[names.indexOf(c)]; } });
        LON_CANDIDATES.forEach(function(c) { if (!lon && names.indexOf(c) !== -1) { lon = columns[names.indexOf(c)]; } });
        if (!lat || !lon) { lat = null; lon = null; }
        if (lat && lon) { mode = 'latlon'; }
    }
    // Fallback : chercher une colonne WKT
    if (!geom && !lat && firstRow) {
        var wktParser = new ol.format.WKT();
        columns.forEach(function(c) {
            if (geom || lat) { return; }
            var val = firstRow[c];
            if (typeof val !== 'string') { return; }
            try { wktParser.readGeometry(val); geom = c; mode = 'wkt'; } catch(e) { /* not WKT */ }
        });
    }
    // Fallback : chercher une colonne texte "N,N" — tente geo_point_2d (lat,lon) puis lon,lat
    if (!geom && !lat && firstRow) {
        columns.forEach(function(c) {
            if (geom || lat) { return; }
            var val = firstRow[c];
            if (typeof val !== 'string') { return; }
            var parts = val.split(',');
            if (parts.length !== 2) { return; }
            var a = parseFloat(parts[0].trim()), b = parseFloat(parts[1].trim());
            if (isNaN(a) || isNaN(b)) { return; }
            // lat in [-90,90], lon in [-180,180] → first value is lat → latlon_str
            if (Math.abs(a) <= 90 && Math.abs(b) <= 180) { geom = c; mode = 'latlon_str'; }
            // otherwise assume lon,lat
            else if (Math.abs(b) <= 90 && Math.abs(a) <= 180) { geom = c; mode = 'lonlat_str'; }
        });
    }
    LABEL_CANDIDATES.forEach(function(c) {
        if (!lbl && names.indexOf(c) !== -1) { lbl = columns[names.indexOf(c)]; }
    });
    return { geom: geom, lat: lat, lon: lon, label: lbl, mode: mode };
}

// Remplit les selects géométrie, lat, lon et étiquette du panneau de configuration.
// Affiche la ligne géométrie OU les lignes lat/lon selon le mode actif.
function populateColumnPicker(columns) {
    var selGeom = document.getElementById('sv-cfg-geom');
    var selLat  = document.getElementById('sv-cfg-lat');
    var selLon  = document.getElementById('sv-cfg-lon');
    var selLbl  = document.getElementById('sv-cfg-label');
    var noneLbl = lang === 'fr' ? '(aucune)' : lang === 'de' ? '(keine)' : lang === 'es' ? '(ninguna)' : '(none)';

    selGeom.options.length = 0;
    selLat.options.length  = 0;
    selLon.options.length  = 0;
    selLbl.options.length  = 0;

    // Placeholder désactivé pour géométrie, lat, lon
    [['sv-cfg-geom', 'choose.col'], ['sv-cfg-lat', 'choose.lat'], ['sv-cfg-lon', 'choose.lon']].forEach(function(pair) {
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

    syncColumnPickerMode();
}

// Affiche les bons sélecteurs de colonnes selon le mode géométrie actif.
// latlon → lat+lon; geojson/auto/lonlat_str/latlon_str → colonne unique.
function syncColumnPickerMode() {
    var modeEl  = document.getElementById('sv-cfg-geom-mode');
    var selGeom = document.getElementById('sv-cfg-geom');
    var selLat  = document.getElementById('sv-cfg-lat');
    var selLon  = document.getElementById('sv-cfg-lon');
    var selLbl  = document.getElementById('sv-cfg-label');
    if (!selGeom) { return; }

    var mode = modeEl ? modeEl.value : colGeomMode;
    var isLatLon   = (mode === 'latlon');
    var isStrMode  = (mode === 'lonlat_str' || mode === 'latlon_str');

    var lblGeom = document.querySelector('label[for="sv-cfg-geom"]');
    var lblLat  = document.querySelector('label[for="sv-cfg-lat"]');
    var lblLon  = document.querySelector('label[for="sv-cfg-lon"]');

    // geom column: visible for geojson/auto/str modes; hidden for latlon
    if (lblGeom) { lblGeom.style.display = isLatLon ? 'none' : ''; }
    selGeom.style.display = isLatLon ? 'none' : '';
    // lat/lon columns: visible only for latlon mode
    if (lblLat) { lblLat.style.display = isLatLon ? '' : 'none'; }
    if (lblLon) { lblLon.style.display = isLatLon ? '' : 'none'; }
    selLat.style.display = isLatLon ? '' : 'none';
    selLon.style.display = isLatLon ? '' : 'none';

    // sync column select values to current state (but never overwrite the mode select —
    // this function is called from the change handler, so modeEl already has the user's value)
    if (!isLatLon) {
        selGeom.value = colGeom || '';
    } else {
        selLat.value = colLat || '';
        selLon.value = colLon || '';
    }
    if (selLbl) { selLbl.value = colLabel || ''; }
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

// Construit une couleur rgba à partir d'une couleur CSS et d'une opacité (0–1).
function colorWithOpacity(color, opacity) {
    var arr = ol.color.asArray(color).slice();
    arr[3] = opacity;
    return 'rgba(' + arr.join(',') + ')';
}

// Retourne une fonction de style OL : cercle pour Point/MultiPoint, fill+stroke pour les autres.
// Lit la propriété _label posée sur chaque feature dans rebuildLayer.
function makeFeatureStyle(cfg, selected) {
    var fillColor   = colorWithOpacity(cfg.fillColor,   cfg.fillOpacity);
    var strokeColor = colorWithOpacity(cfg.strokeColor, cfg.strokeOpacity);
    var radius      = selected ? 10 : 7;
    return function(feature) {
        var geomType = feature.getGeometry() ? feature.getGeometry().getType() : '';
        var text = makeTextStyle(feature.get('_label'), selected);
        if (geomType === 'Point' || geomType === 'MultiPoint') {
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: radius,
                    fill: new ol.style.Fill({ color: fillColor }),
                    stroke: new ol.style.Stroke({ color: strokeColor, width: cfg.strokeWidth })
                }),
                text: text
            });
        }
        return new ol.style.Style({
            fill: new ol.style.Fill({ color: fillColor }),
            stroke: new ol.style.Stroke({ color: strokeColor, width: cfg.strokeWidth }),
            text: text
        });
    };
}

// Extrait les paramètres de style depuis svConfig pour les entités normales ou sélectionnées.
function getStyleCfg(selected) {
    if (selected) {
        return {
            fillColor:     safeColor(svConfig.sel_fill_color,   '#e74c3c'),
            fillOpacity:   svConfig.sel_fill_opacity   !== undefined ? parseFloat(svConfig.sel_fill_opacity)   : 1,
            strokeColor:   safeColor(svConfig.sel_stroke_color, '#ffffff'),
            strokeOpacity: svConfig.sel_stroke_opacity !== undefined ? parseFloat(svConfig.sel_stroke_opacity) : 1,
            strokeWidth:   svConfig.sel_stroke_width   !== undefined ? parseFloat(svConfig.sel_stroke_width)   : 2.5
        };
    }
    return {
        fillColor:     safeColor(svConfig.fill_color,   '#ffcc00'),
        fillOpacity:   svConfig.fill_opacity   !== undefined ? parseFloat(svConfig.fill_opacity)   : 0.85,
        strokeColor:   safeColor(svConfig.stroke_color, '#ffffff'),
        strokeOpacity: svConfig.stroke_opacity !== undefined ? parseFloat(svConfig.stroke_opacity) : 1,
        strokeWidth:   svConfig.stroke_width   !== undefined ? parseFloat(svConfig.stroke_width)   : 1.5
    };
}

// Surligne selectedFeat ; remet toutes les autres au style de base.
// Passer null réinitialise toutes les entités au style de base.
function applySelectionStyle(selectedFeat) {
    if (!vectorLayer) { return; }
    var baseCfg = getStyleCfg(false);
    var selCfg  = getStyleCfg(true);
    var baseStyleFn = makeFeatureStyle(baseCfg, false);
    var selStyleFn  = makeFeatureStyle(selCfg,  true);
    vectorLayer.getSource().getFeatures().forEach(function(f) {
        f.setStyle((f === selectedFeat ? selStyleFn : baseStyleFn)(f));
    });
}

// ---------------------------------------------------------------------------
// Widget options (persistance par instance via grist.widgetApi)
// ---------------------------------------------------------------------------

// Persiste les colonnes actives + les clés svConfig dans les options widget Grist.
function saveOptions() {
    if (!grist.widgetApi || typeof grist.widgetApi.setOptions !== 'function') { return; }
    var opts = {};
    if (colGeom)  { opts._colGeom  = colGeom; }
    if (colLat)   { opts._colLat   = colLat; }
    if (colLon)   { opts._colLon   = colLon; }
    if (colLabel) { opts._colLabel = colLabel; }
    var configKeys = ['fill_color', 'fill_opacity', 'stroke_color', 'stroke_opacity', 'stroke_width',
                      'sel_fill_color', 'sel_fill_opacity', 'sel_stroke_color', 'sel_stroke_opacity', 'sel_stroke_width',
                      'title', 'layers', 'md', 'lb', 'x', 'y', 'z', 'sviewer_base', 'grist_api_base', 'georchestra_base', 'fit_on_load',
                      'geom_mode'];
    configKeys.forEach(function(k) { if (svConfig[k] !== undefined) { opts[k] = svConfig[k]; } });
    grist.widgetApi.setOptions(opts).catch(function(e) { console.warn('[sviewer] setOptions failed:', e); });
}

// Applique les options widget : restaure svConfig + colonnes actives.
function applyOptions(opts) {
    if (!opts) { return; }
    widgetOptions = opts;
    optionsLoaded = true;
    var configKeys = ['fill_color', 'fill_opacity', 'stroke_color', 'stroke_opacity', 'stroke_width',
                      'sel_fill_color', 'sel_fill_opacity', 'sel_stroke_color', 'sel_stroke_opacity', 'sel_stroke_width',
                      'title', 'layers', 'md', 'lb', 'x', 'y', 'z', 'sviewer_base', 'grist_api_base', 'georchestra_base', 'fit_on_load',
                      'geom_mode'];
    configKeys.forEach(function(k) { if (opts[k] !== undefined) { svConfig[k] = opts[k]; } });
    // migrate legacy keys
    if (opts.feature_color && !opts.fill_color)                 { svConfig.fill_color      = opts.feature_color; }
    if (opts.feature_highlight_color && !opts.sel_fill_color)   { svConfig.sel_fill_color  = opts.feature_highlight_color; }
    if (opts.geom_mode) { colGeomMode = opts.geom_mode; }
    if (opts._colGeom)  { colGeom  = opts._colGeom;  colLat = null; colLon = null; }
    if (opts._colLat)   { colLat   = opts._colLat;   colGeom = null; }
    if (opts._colLon)   { colLon   = opts._colLon;   colGeom = null; }
    if (opts._colLabel) { colLabel = opts._colLabel; }
}

// Returns a human-readable label for an OL layer: attribution text first, then title.
// Strips HTML tags (attributions may contain <a> markup).
function layerLabel(layer) {
    if (!layer) { return ''; }
    try {
        var src = layer.getSource ? layer.getSource() : null;
        var attrFn = src ? src.getAttributions() : null;
        if (attrFn) {
            var arr = typeof attrFn === 'function' ? attrFn(null) : attrFn;
            if (!Array.isArray(arr)) { arr = [arr]; }
            var text = arr.join(', ').replace(/<[^>]+>/g, '').trim();
            if (text) { return text; }
        }
    } catch(e) { /* fall through */ }
    return layer.get('title') || '';
}

// ---------------------------------------------------------------------------
// Panneau de configuration (onEditOptions)
// ---------------------------------------------------------------------------

function openSettings() {
    var panel = document.getElementById('sv-settings');
    if (!panel) { return; }
    document.querySelectorAll('.sv-tab-btn').forEach(function(b) { b.classList.remove('sv-tab-active'); });
    document.querySelectorAll('.sv-tab-panel[data-tab]').forEach(function(fs) { fs.classList.remove('sv-tab-visible'); });
    var firstBtn = document.querySelector('.sv-tab-btn[data-tab="data"]');
    var firstFs  = document.querySelector('.sv-tab-panel[data-tab="data"]');
    if (firstBtn) { firstBtn.classList.add('sv-tab-active'); }
    if (firstFs)  { firstFs.classList.add('sv-tab-visible'); }
    var modeElOs = document.getElementById('sv-cfg-geom-mode');
    if (modeElOs) { modeElOs.value = colGeomMode; }
    syncColumnPickerMode();
    document.getElementById('sv-cfg-title').value               = svConfig.title || '';
    document.getElementById('sv-cfg-fill-color').value          = safeColor(svConfig.fill_color,       '#ffcc00');
    document.getElementById('sv-cfg-fill-opacity').value        = svConfig.fill_opacity    !== undefined ? svConfig.fill_opacity    : 0.85;
    document.getElementById('sv-cfg-stroke-color').value        = safeColor(svConfig.stroke_color,     '#ffffff');
    document.getElementById('sv-cfg-stroke-opacity').value      = svConfig.stroke_opacity  !== undefined ? svConfig.stroke_opacity  : 1;
    document.getElementById('sv-cfg-stroke-width').value        = svConfig.stroke_width    !== undefined ? svConfig.stroke_width    : 1.5;
    document.getElementById('sv-cfg-sel-fill-color').value      = safeColor(svConfig.sel_fill_color,   '#e74c3c');
    document.getElementById('sv-cfg-sel-fill-opacity').value    = svConfig.sel_fill_opacity   !== undefined ? svConfig.sel_fill_opacity   : 1;
    document.getElementById('sv-cfg-sel-stroke-color').value    = safeColor(svConfig.sel_stroke_color, '#ffffff');
    document.getElementById('sv-cfg-sel-stroke-opacity').value  = svConfig.sel_stroke_opacity !== undefined ? svConfig.sel_stroke_opacity : 1;
    document.getElementById('sv-cfg-sel-stroke-width').value    = svConfig.sel_stroke_width   !== undefined ? svConfig.sel_stroke_width   : 2.5;
    document.getElementById('sv-cfg-layers').value  = svConfig.layers || '';
    document.getElementById('sv-cfg-md').value      = svConfig.md     || '';
    var hc     = window.hardConfig || {};
var bgLayers  = hc.layersBackground  || [];
    var loLayers  = hc.layersOverlay     || [];
    var presets   = hc.backgroundPresets && hc.backgroundPresets.length ? hc.backgroundPresets : null;
    var lbSel = document.getElementById('sv-cfg-lb-sel');
    var lbNum = document.getElementById('sv-cfg-lb');
    var pool = presets || bgLayers;
    if (pool.length) {
        lbSel.options.length = 0;
        var noneOpt = document.createElement('option');
        noneOpt.value = ''; noneOpt.textContent = lang === 'fr' ? '(défaut)' : lang === 'de' ? '(Standard)' : lang === 'es' ? '(defecto)' : '(default)';
        lbSel.appendChild(noneOpt);
        pool.forEach(function(item, idx) {
            var opt = document.createElement('option');
            opt.value = idx;
var label = presets ? (item.title || idx) : layerLabel(item);
            opt.textContent = label || idx;
            lbSel.appendChild(opt);
        });
        lbSel.value = svConfig.lb !== undefined ? svConfig.lb : '';
        lbSel.style.display = '';
        lbNum.style.display = 'none';
    } else {
        lbSel.style.display = 'none';
        lbNum.style.display = '';
        lbNum.value = svConfig.lb !== undefined ? svConfig.lb : '';
    }
    document.getElementById('sv-cfg-x').value       = svConfig.x  !== undefined ? svConfig.x  : '';
    document.getElementById('sv-cfg-y').value       = svConfig.y  !== undefined ? svConfig.y  : '';
    document.getElementById('sv-cfg-z').value       = svConfig.z  !== undefined ? svConfig.z  : '';
    var defaultSvBase = svConfig.sviewer_base || (function() {
        var loc = window.location;
        var dir = loc.pathname.replace(/\/[^\/]*$/, '/');
        return loc.origin + dir.replace(/connectors\/grist\/$/, '');
    }());
    document.getElementById('sv-cfg-svbase').value = defaultSvBase;
    var defaultApiBase = svConfig.grist_api_base || (function() {
        try { return document.referrer ? new URL(document.referrer).origin : ''; } catch(e) { return ''; }
    }());
    document.getElementById('sv-cfg-apibase').value = defaultApiBase;
    document.getElementById('sv-cfg-georchestra').value = svConfig.georchestra_base ||
        (window.hardConfig && window.hardConfig.geOrchestraBaseUrl) ||
        (window.customConfig && window.customConfig.geOrchestraBaseUrl) || '';
    // fit_on_load: true = always fit; false = never fit; undefined = fit only when no x/y saved
    document.getElementById('sv-cfg-fit').checked = svConfig.fit_on_load === true ||
        (svConfig.fit_on_load === undefined && !svConfig.x && !svConfig.y);
    panel.style.display = 'flex';
    document.getElementById('sv-map').style.display    = 'none';
    document.getElementById('sv-toolbar').style.display = 'none';
}

function closeSettings(save) {
    if (save) {
        // Column selects — driven by mode selector
        var modeEl  = document.getElementById('sv-cfg-geom-mode');
        var selGeom = document.getElementById('sv-cfg-geom');
        var selLat  = document.getElementById('sv-cfg-lat');
        var selLon  = document.getElementById('sv-cfg-lon');
        var selLbl  = document.getElementById('sv-cfg-label');
        var newMode = modeEl ? modeEl.value : 'auto';
        colGeomMode = newMode;
        svConfig.geom_mode = newMode;
        if (newMode === 'latlon') {
            var newLat = selLat.value; var newLon = selLon.value;
            if (newLat && newLon) { colLat = newLat; colLon = newLon; colGeom = null; }
        } else {
            var newGeom = selGeom.value;
            if (newGeom) { colGeom = newGeom; colLat = null; colLon = null; }
        }
        colLabel = selLbl.value || null;

        function readFloat(id, fallback) { var v = parseFloat(document.getElementById(id).value); return isNaN(v) ? fallback : v; }
        svConfig.fill_color          = document.getElementById('sv-cfg-fill-color').value;
        svConfig.fill_opacity        = readFloat('sv-cfg-fill-opacity',       0.85);
        svConfig.stroke_color        = document.getElementById('sv-cfg-stroke-color').value;
        svConfig.stroke_opacity      = readFloat('sv-cfg-stroke-opacity',     1);
        svConfig.stroke_width        = readFloat('sv-cfg-stroke-width',       1.5);
        svConfig.sel_fill_color      = document.getElementById('sv-cfg-sel-fill-color').value;
        svConfig.sel_fill_opacity    = readFloat('sv-cfg-sel-fill-opacity',   1);
        svConfig.sel_stroke_color    = document.getElementById('sv-cfg-sel-stroke-color').value;
        svConfig.sel_stroke_opacity  = readFloat('sv-cfg-sel-stroke-opacity', 1);
        svConfig.sel_stroke_width    = readFloat('sv-cfg-sel-stroke-width',   2.5);

        var title   = document.getElementById('sv-cfg-title').value.trim();
        var layers  = document.getElementById('sv-cfg-layers').value.trim();
        var md      = document.getElementById('sv-cfg-md').value.trim();
        var lbSelEl = document.getElementById('sv-cfg-lb-sel');
        var lb = (lbSelEl.style.display !== 'none') ? lbSelEl.value.trim() : document.getElementById('sv-cfg-lb').value.trim();
        var x       = document.getElementById('sv-cfg-x').value.trim();
        var y       = document.getElementById('sv-cfg-y').value.trim();
        var z       = document.getElementById('sv-cfg-z').value.trim();
        var apibase = document.getElementById('sv-cfg-apibase').value.trim();
        if (title)   { svConfig.title   = title;  } else { delete svConfig.title; }
        if (layers)  { svConfig.layers  = layers; } else { delete svConfig.layers; }
        if (md)      { svConfig.md      = md;     } else { delete svConfig.md; }
        if (lb !== '')      { svConfig.lb = parseInt(lb, 10);   } else { delete svConfig.lb; }
        if (x !== '')       { svConfig.x  = parseFloat(x);     } else { delete svConfig.x; }
        if (y !== '')       { svConfig.y  = parseFloat(y);     } else { delete svConfig.y; }
        if (z !== '')       { svConfig.z  = parseInt(z, 10);   } else { delete svConfig.z; }
        var svbase  = document.getElementById('sv-cfg-svbase').value.trim();
        if (svbase)  { svConfig.sviewer_base   = svbase;  } else { delete svConfig.sviewer_base; }
        if (apibase) { svConfig.grist_api_base = apibase; } else { delete svConfig.grist_api_base; }
        var georchestra = document.getElementById('sv-cfg-georchestra').value.trim();
        if (georchestra) { svConfig.georchestra_base = georchestra; } else { delete svConfig.georchestra_base; }
        svConfig.fit_on_load = document.getElementById('sv-cfg-fit').checked;
        saveOptions();
        if ((svConfig.layers || null) !== initialLayers || (svConfig.md || null) !== initialMd) { window.location.reload(); return; }
        viewFitted = false;
        rebuildLayer();
        setStatus(tr('settings.save.reminder'));
    }
    document.getElementById('sv-settings').style.display    = 'none';
    document.getElementById('sv-import-area').style.display = 'none';
    document.getElementById('sv-import-json').value         = '';
    document.getElementById('sv-map').style.display         = '';
    document.getElementById('sv-toolbar').style.display     = '';
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
    var hasGeomSource = colGeom || (colLat && colLon);
    if (!mapReady || !hasGeomSource) { return; }

    // colonnes actives dans l'empreinte : force le rebuild si la colonne change sans que les données bougent
    var fingerprint = JSON.stringify(allRecords) + '|' + colGeom + '|' + colLat + '|' + colLon + '|' + colLabel + '|' + colGeomMode;
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

    allRecords.forEach(function(row) {
        var geomVal;
        if (colGeomMode === 'latlon') {
            var lat = parseFloat(row[colLat]);
            var lon = parseFloat(row[colLon]);
            if (!isNaN(lat) && !isNaN(lon)) { geomVal = { type: 'Point', coordinates: [lon, lat] }; }
        } else if (colGeomMode === 'latlon_str' || colGeomMode === 'lonlat_str') {
            var val = row[colGeom];
            if (typeof val === 'string') {
                var parts = val.split(',');
                if (parts.length === 2) {
                    var a = parseFloat(parts[0].trim()), b = parseFloat(parts[1].trim());
                    if (!isNaN(a) && !isNaN(b)) {
                        // latlon_str: "lat,lon" → coordinates [lon, lat]
                        // lonlat_str: "lon,lat" → coordinates [lon, lat] (already in order)
                        geomVal = colGeomMode === 'latlon_str'
                            ? { type: 'Point', coordinates: [b, a] }
                            : { type: 'Point', coordinates: [a, b] };
                    }
                }
            }
        } else if (colGeomMode === 'wkt') {
            var wktVal = row[colGeom];
            if (typeof wktVal === 'string') {
                try {
                    var wktFmt = new ol.format.WKT();
                    var wktOlGeom = wktFmt.readGeometry(wktVal, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
                    var feat = new ol.Feature({ geometry: wktOlGeom });
                    var rowId = row.id;
                    feat.set('_gristRowId', rowId);
                    if (colLabel && row[colLabel] !== undefined && row[colLabel] !== null) { feat.set('_label', row[colLabel]); }
                    featureByRowId[rowId] = feat;
                    features.push(feat);
                } catch(e) { skipped++; }
            } else { skipped++; }
            return; // skip generic geomVal path below
        } else {
            // geojson or auto
            geomVal = colGeom ? parseGeom(row[colGeom]) : null;
            if (!geomVal && colLat && colLon) {
                var lat2 = parseFloat(row[colLat]);
                var lon2 = parseFloat(row[colLon]);
                if (!isNaN(lat2) && !isNaN(lon2)) { geomVal = { type: 'Point', coordinates: [lon2, lat2] }; }
            }
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
        style: makeFeatureStyle(getStyleCfg(false), false)
    });

    map.addLayer(vectorLayer);

    // Refresh share URL with current column hints after each rebuild
    var geojsonUrl = buildGristGeojsonUrl();
    if (geojsonUrl) { SViewer.setGeojsonUrl(geojsonUrl); }

    setStatus(allRecords.length + tr('features') + (skipped ? ' (' + skipped + tr('skipped') + ')' : ''));

    // fit_on_load===true: always fit; false: never; undefined: fit only when no x/y saved
    var shouldFit = svConfig.fit_on_load === true ||
        (svConfig.fit_on_load !== false && !svConfig.x && !svConfig.y);
    if (features.length && !viewFitted && shouldFit) {
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
    var base = gristBase + '/api/docs/' + encodeURIComponent(gristDocId) + '/tables/' + encodeURIComponent(gristTableId) + '/records';
    var params = [];
    if (colGeomMode && colGeomMode !== 'auto') { params.push('_geommode=' + encodeURIComponent(colGeomMode)); }
    if (colGeomMode === 'latlon') {
        if (colLat) { params.push('_collat=' + encodeURIComponent(colLat)); }
        if (colLon) { params.push('_collon=' + encodeURIComponent(colLon)); }
    } else if (colGeom) {
        params.push('_geomcol=' + encodeURIComponent(colGeom));
    }
    if (colLabel) { params.push('_labelcol=' + encodeURIComponent(colLabel)); }
    return params.length ? base + '?' + params.join('&') : base;
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
    if (svConfig.md && !svConfig.layers) { opts.md = svConfig.md; }
    initialLayers = svConfig.layers || null;
    initialMd = svConfig.md || null;
    if (svConfig.lb !== undefined) { opts.lb = parseInt(svConfig.lb, 10); }
    var georchestraBase = safeHttpUrl(svConfig.georchestra_base);
    if (georchestraBase && window.hardConfig) { window.hardConfig.geOrchestraBaseUrl = georchestraBase; }

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
document.getElementById('sv-btn-cfg-save').addEventListener('click', function() { closeSettings(true); });
document.getElementById('sv-btn-cfg-cancel').addEventListener('click', function() { closeSettings(false); });

document.getElementById('sv-btn-cfg-export').addEventListener('click', function() {
    function rf(id) { return document.getElementById(id) ? document.getElementById(id).value : undefined; }
    function rn(id) { var v = parseFloat(rf(id)); return isNaN(v) ? undefined : v; }
    var lbSel = document.getElementById('sv-cfg-lb-sel');
    var lbNum = document.getElementById('sv-cfg-lb');
    var lbVal = (lbSel.style.display !== 'none') ? lbSel.value : lbNum.value;
    var out = {
        stroke_color:        rf('sv-cfg-stroke-color'),
        stroke_opacity:      rn('sv-cfg-stroke-opacity'),
        stroke_width:        rn('sv-cfg-stroke-width'),
        fill_color:          rf('sv-cfg-fill-color'),
        fill_opacity:        rn('sv-cfg-fill-opacity'),
        sel_stroke_color:    rf('sv-cfg-sel-stroke-color'),
        sel_stroke_opacity:  rn('sv-cfg-sel-stroke-opacity'),
        sel_stroke_width:    rn('sv-cfg-sel-stroke-width'),
        sel_fill_color:      rf('sv-cfg-sel-fill-color'),
        sel_fill_opacity:    rn('sv-cfg-sel-fill-opacity'),
        fit_on_load:         document.getElementById('sv-cfg-fit').checked
    };
    var title = rf('sv-cfg-title'); if (title)   { out.title          = title; }
    var layers = rf('sv-cfg-layers'); if (layers) { out.layers         = layers; }
    var md = rf('sv-cfg-md'); if (md)             { out.md             = md; }
    if (lbVal !== '')                             { out.lb             = parseInt(lbVal, 10); }
    var x = rf('sv-cfg-x'); if (x !== '')        { out.x              = parseFloat(x); }
    var y = rf('sv-cfg-y'); if (y !== '')        { out.y              = parseFloat(y); }
    var z = rf('sv-cfg-z'); if (z !== '')        { out.z              = parseInt(z, 10); }
    var svbase = rf('sv-cfg-svbase'); if (svbase) { out.sviewer_base   = svbase; }
    var api = rf('sv-cfg-apibase'); if (api)      { out.grist_api_base = api; }
    var geo = rf('sv-cfg-georchestra'); if (geo)  { out.georchestra_base = geo; }
    var gmode = rf('sv-cfg-geom-mode'); if (gmode && gmode !== 'auto') { out.geom_mode = gmode; }
    var json = JSON.stringify(out, null, 2);
    navigator.clipboard.writeText(json).then(function() {
        var btn = document.getElementById('sv-btn-cfg-export');
        var orig = btn.textContent;
        btn.textContent = tr('settings.export.done');
        setTimeout(function() { btn.textContent = orig; }, 2000);
    }).catch(function() { alert(json); });
});

function applyImportData(data) {
    var lbSel = document.getElementById('sv-cfg-lb-sel');
    var lbNum = document.getElementById('sv-cfg-lb');
    if (data.fill_color !== undefined)          { document.getElementById('sv-cfg-fill-color').value         = safeColor(data.fill_color, '#ffcc00'); }
    if (data.fill_opacity !== undefined)        { document.getElementById('sv-cfg-fill-opacity').value       = data.fill_opacity; }
    if (data.stroke_color !== undefined)        { document.getElementById('sv-cfg-stroke-color').value       = safeColor(data.stroke_color, '#ffffff'); }
    if (data.stroke_opacity !== undefined)      { document.getElementById('sv-cfg-stroke-opacity').value     = data.stroke_opacity; }
    if (data.stroke_width !== undefined)        { document.getElementById('sv-cfg-stroke-width').value       = data.stroke_width; }
    if (data.sel_fill_color !== undefined)      { document.getElementById('sv-cfg-sel-fill-color').value     = safeColor(data.sel_fill_color, '#e74c3c'); }
    if (data.sel_fill_opacity !== undefined)    { document.getElementById('sv-cfg-sel-fill-opacity').value   = data.sel_fill_opacity; }
    if (data.sel_stroke_color !== undefined)    { document.getElementById('sv-cfg-sel-stroke-color').value   = safeColor(data.sel_stroke_color, '#ffffff'); }
    if (data.sel_stroke_opacity !== undefined)  { document.getElementById('sv-cfg-sel-stroke-opacity').value = data.sel_stroke_opacity; }
    if (data.sel_stroke_width !== undefined)    { document.getElementById('sv-cfg-sel-stroke-width').value   = data.sel_stroke_width; }
    if (data.title !== undefined)               { document.getElementById('sv-cfg-title').value              = data.title; }
    if (data.layers !== undefined)              { document.getElementById('sv-cfg-layers').value             = data.layers; }
    if (data.md !== undefined)                  { document.getElementById('sv-cfg-md').value                 = data.md; }
    if (data.lb !== undefined) {
        if (lbSel.style.display !== 'none') { lbSel.value = data.lb; } else { lbNum.value = data.lb; }
    }
    if (data.x !== undefined)                   { document.getElementById('sv-cfg-x').value      = data.x; }
    if (data.y !== undefined)                   { document.getElementById('sv-cfg-y').value      = data.y; }
    if (data.z !== undefined)                   { document.getElementById('sv-cfg-z').value      = data.z; }
    if (data.sviewer_base !== undefined)        { document.getElementById('sv-cfg-svbase').value = data.sviewer_base; }
    if (data.grist_api_base !== undefined)      { document.getElementById('sv-cfg-apibase').value = data.grist_api_base; }
    if (data.georchestra_base !== undefined)    { document.getElementById('sv-cfg-georchestra').value = data.georchestra_base; }
    if (data.fit_on_load !== undefined)         { document.getElementById('sv-cfg-fit').checked  = data.fit_on_load; }
    if (data.geom_mode !== undefined) {
        var modeElAi = document.getElementById('sv-cfg-geom-mode');
        if (modeElAi) { modeElAi.value = data.geom_mode; syncColumnPickerMode(); }
    }
}

document.getElementById('sv-btn-cfg-import').addEventListener('click', function() {
    var area = document.getElementById('sv-import-area');
    var visible = area.style.display === 'flex';
    area.style.display = visible ? 'none' : 'flex';
    if (!visible) { document.getElementById('sv-import-json').focus(); }
});

document.getElementById('sv-btn-cfg-apply').addEventListener('click', function() {
    var text = document.getElementById('sv-import-json').value.trim();
    var data;
    try { data = JSON.parse(text); } catch(e) { alert(tr('settings.import.error')); return; }
    if (typeof data !== 'object' || Array.isArray(data)) { alert(tr('settings.import.error')); return; }
    applyImportData(data);
    document.getElementById('sv-import-area').style.display = 'none';
    document.getElementById('sv-import-json').value = '';
});

// ---------------------------------------------------------------------------
// Séquence d'initialisation Grist
// ---------------------------------------------------------------------------

grist.ready({ requiredAccess: 'read table', onEditOptions: function() { openSettings(); } });

if (grist.widgetApi && typeof grist.widgetApi.onOptions === 'function') {
    grist.widgetApi.onOptions(function(opts) {
        applyOptions(opts);
        // user clicked Save in Grist — dismiss the reminder
        var s = document.getElementById('sv-status');
        if (s && s.textContent === tr('settings.save.reminder')) { setStatus(''); }
        if (mapReady) {
            viewFitted = false;
            rebuildLayer();
        }
    });
}


// Enregistré immédiatement après ready() — Grist envoie le premier onRecords
// dès réception de Ready ; un enregistrement tardif (dans une Promise) le manquerait.
grist.onRecords(function(records) {
    allRecords = records;
    if (!recordsReady) { recordsReady = true; maybeSetupMapClick(); }

    if (records.length) {
        allColumns = Object.keys(records[0]).filter(function(k) { return k !== 'id'; });
        populateColumnPicker(allColumns);
        // auto-detect only when no manual mode is saved, or saved mode is explicitly 'auto'
        var savedMode = svConfig.geom_mode;
        var canAutoDetect = !colGeom && !colLat && !colLon &&
            (!optionsLoaded || !savedMode || savedMode === 'auto');
        if (canAutoDetect) {
            var detected = detectColumns(allColumns, records[0]);
            if (detected.geom) {
                colGeom = detected.geom;
                colGeomMode = detected.mode;
                colLabel = colLabel || detected.label;
                setStatus(tr('auto.detected') + colGeom);
            } else if (detected.lat && detected.lon) {
                colLat = detected.lat;
                colLon = detected.lon;
                colGeomMode = 'latlon';
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
    if (colGeomMode === 'latlon') {
        var lat = parseFloat(record[colLat]);
        var lon = parseFloat(record[colLon]);
        if (!isNaN(lat) && !isNaN(lon)) { geomVal = { type: 'Point', coordinates: [lon, lat] }; }
    } else if (colGeomMode === 'latlon_str' || colGeomMode === 'lonlat_str') {
        var val = record[colGeom];
        if (typeof val === 'string') {
            var parts = val.split(',');
            if (parts.length === 2) {
                var a = parseFloat(parts[0].trim()), b = parseFloat(parts[1].trim());
                if (!isNaN(a) && !isNaN(b)) {
                    geomVal = colGeomMode === 'latlon_str'
                        ? { type: 'Point', coordinates: [b, a] }
                        : { type: 'Point', coordinates: [a, b] };
                }
            }
        }
    } else if (colGeomMode === 'wkt') {
        var wktRec = record[colGeom];
        if (typeof wktRec === 'string') {
            try {
                var wktFmtR = new ol.format.WKT();
                var wktOlGeomR = wktFmtR.readGeometry(wktRec, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
                var rowId = record.id;
                var feat = featureByRowId[rowId];
                var view = SViewer.getView();
                if (view) {
                    selectedRowId = rowId;
                    document.getElementById('sv-btn-clear').disabled = false;
                    var ext = wktOlGeomR.getExtent();
                    view.fit(ext, { padding: [60, 60, 60, 60], maxZoom: 17, duration: 400 });
                    if (feat) { applySelectionStyle(feat); }
                }
            } catch(e) { /* invalid WKT */ }
        }
        return;
    } else {
        if (colGeom) { geomVal = parseGeom(record[colGeom]); }
        if (!geomVal && colLat && colLon) {
            var lat2 = parseFloat(record[colLat]);
            var lon2 = parseFloat(record[colLon]);
            if (!isNaN(lat2) && !isNaN(lon2)) { geomVal = { type: 'Point', coordinates: [lon2, lat2] }; }
        }
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

document.getElementById('sv-cfg-geom-mode').addEventListener('change', function() {
    syncColumnPickerMode();
});

document.getElementById('sv-tab-bar').addEventListener('click', function(e) {
    var btn = e.target.closest('.sv-tab-btn');
    if (!btn) { return; }
    var tab = btn.getAttribute('data-tab');
    document.querySelectorAll('.sv-tab-btn').forEach(function(b) { b.classList.remove('sv-tab-active'); });
    document.querySelectorAll('.sv-tab-panel[data-tab]').forEach(function(fs) { fs.classList.remove('sv-tab-visible'); });
    btn.classList.add('sv-tab-active');
    var target = document.querySelector('.sv-tab-panel[data-tab="' + tab + '"]');
    if (target) { target.classList.add('sv-tab-visible'); }
});

// Chaîne de démarrage : options widget + IDs doc/table → init carte.
var optionsPromise = (grist.widgetApi && typeof grist.widgetApi.getOptions === 'function')
    ? grist.widgetApi.getOptions().then(function(opts) { applyOptions(opts); }).catch(function() {})
    : Promise.resolve();
var docPromise = (grist.docApi && typeof grist.docApi.getDocName === 'function')
    ? grist.docApi.getDocName().then(function(id) { gristDocId = id; }).catch(function() {})
    : Promise.resolve();
var tablePromise = (grist.selectedTable)
    ? grist.selectedTable.getTableId().then(function(id) { gristTableId = id; }).catch(function() {})
    : Promise.resolve();

Promise.all([optionsPromise, docPromise, tablePromise]).then(function() {
    initMap();
});
