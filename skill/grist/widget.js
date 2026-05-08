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
        'settings.geom.mode.auto':     'Auto (détection automatique)',
        'settings.geom.mode.geojson':  'GeoJSON {"type":"Point"…}',
        'settings.geom.mode.latlon':   'Lat + Lon (2 colonnes numériques)',
        'settings.geom.mode.lonlat_str': 'Texte "2.35,48.85" (lon,lat)',
        'settings.geom.mode.latlon_str': 'Texte "48.85,2.35" (lat,lon)',
        'settings.geom.mode.wkt':        'WKT "POINT(2.35 48.85)"',
        'settings.geom':      'Colonne géométrie',
        'settings.lat':       'Colonne latitude',
        'settings.lon':       'Colonne longitude',
        'settings.label':     'Colonne étiquette',
        'settings.autozoom':  'Zoom automatique sur sélection d\'une ligne',
        'settings.features':         'Données',
        'settings.selection':        'Ligne sélectionnée',
        'settings.fill':             'Couleur',
        'settings.fill.opacity':     'Opacité remplissage',
        'settings.sel.fill':         'Couleur',
        'settings.sel.fill.opacity': 'Opacité remplissage',
        'settings.stroke.width':     'Épaisseur contour (px)',
        'settings.sel.stroke.width': 'Épaisseur contour (px)',
        'settings.inline.opacity':   'opacité',
        'settings.inline.width':     'épaisseur',
        'settings.title':     'Titre (title=)',
        'settings.layers':      'Donnée via WMS',
        'settings.md':        'Donnée via catalogue',
        'settings.lb':          'Fond de carte',
        'settings.wms.opacity': 'Opacité données WMS',

        'settings.svbase':    'URL de base sViewer',
        'settings.apibase':   'URL de base API Grist',
        'settings.georchestra':    'URL de base geOrchestra',
        'settings.section.data':     'Données',
        'settings.section.advanced': 'Avancé',
        'settings.section.help':     'Aide',
        'settings.save':           'Appliquer',
        'settings.cancel':         'Annuler',
        'settings.json':               'Configuration JSON',
        'settings.export':             'Exporter',
        'settings.import':             'Importer',
        'settings.import.apply':       'Appliquer',
        'settings.import.placeholder': 'Coller le JSON exporté ici…',
        'settings.export.done':        'Paramètres copiés dans le presse-papiers',
        'settings.import.error':       'JSON invalide ou incompatible',
        'settings.save.reminder':      '⚠ Cliquez sur Enregistrer dans la barre Grist pour conserver les paramètres',
        'edit.label':                  'Saisir :',
        'edit.type.point':             'Point',
        'edit.type.line':              'Ligne',
        'edit.type.polygon':           'Surface',
        'edit.save':                   '✓ Enregistrer',
        'edit.cancel':                 '✗ Annuler',
        'edit.saved':                  '✓ Géométrie enregistrée — ligne ',
        'edit.error':                  '⚠ Erreur — modifications non enregistrées',
        'edit.noaccess':               '⚠ Accès complet requis pour modifier — changez le niveau d\'accès dans les paramètres du widget Grist',
        'edit.instr.type':             'Choisir le type de géométrie',
        'edit.instr.point':            'Cliquez sur la carte pour placer le point',
        'edit.instr.line':             'Cliquez pour ajouter des sommets — double-clic ou Enregistrer pour terminer',
        'edit.instr.polygon':          'Cliquez pour ajouter des sommets — double-clic ou Enregistrer pour fermer',
        'edit.instr.confirm':          'Tracé terminé — cliquez Enregistrer pour sauvegarder',
        'edit.latlon.noline':          '⚠ Mode lat/lon : édition point uniquement'
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
        'settings.geom.mode.auto':     'Auto (automatic detection)',
        'settings.geom.mode.geojson':  'GeoJSON {"type":"Point"…}',
        'settings.geom.mode.latlon':   'Lat + Lon (2 numeric columns)',
        'settings.geom.mode.lonlat_str': 'Text "2.35,48.85" (lon,lat)',
        'settings.geom.mode.latlon_str': 'Text "48.85,2.35" (lat,lon)',
        'settings.geom.mode.wkt':        'WKT "POINT(2.35 48.85)"',
        'settings.geom':      'Geometry column',
        'settings.lat':       'Latitude column',
        'settings.lon':       'Longitude column',
        'settings.label':     'Label column',
        'settings.autozoom':  'Auto-zoom on row selection',
        'settings.features':         'Data',
        'settings.selection':        'Selected row',
        'settings.fill':             'Color',
        'settings.fill.opacity':     'Fill opacity',
        'settings.sel.fill':         'Color',
        'settings.sel.fill.opacity': 'Fill opacity',
        'settings.stroke.width':     'Stroke width (px)',
        'settings.sel.stroke.width': 'Stroke width (px)',
        'settings.inline.opacity':   'opacity',
        'settings.inline.width':     'width',
        'settings.title':     'Title (title=)',
        'settings.layers':      'Data via WMS',
        'settings.md':        'Data via catalogue',
        'settings.lb':          'Background map',
        'settings.wms.opacity': 'WMS layer opacity',

        'settings.svbase':    'sViewer base URL',
        'settings.apibase':   'Grist API base URL',
        'settings.georchestra':    'geOrchestra base URL',
        'settings.section.data':     'Data',
        'settings.section.advanced': 'Advanced',
        'settings.section.help':     'Help',
        'settings.save':           'Apply',
        'settings.cancel':         'Cancel',
        'settings.json':               'JSON config',
        'settings.export':             'Export',
        'settings.import':             'Import',
        'settings.import.apply':       'Apply',
        'settings.import.placeholder': 'Paste exported JSON here…',
        'settings.export.done':        'Settings copied to clipboard',
        'settings.import.error':       'Invalid or incompatible JSON',
        'settings.save.reminder':      '⚠ Click Save in the Grist bar to persist settings',
        'edit.label':                  'Enter:',
        'edit.type.point':             'Point',
        'edit.type.line':              'Line',
        'edit.type.polygon':           'Area',
        'edit.save':                   '✓ Save',
        'edit.cancel':                 '✗ Cancel',
        'edit.saved':                  '✓ Geometry saved — row ',
        'edit.error':                  '⚠ Error — changes not saved',
        'edit.noaccess':               '⚠ Full access required to edit — change the access level in Grist widget settings',
        'edit.instr.type':             'Choose geometry type',
        'edit.instr.point':            'Click on the map to place the point',
        'edit.instr.line':             'Click to add vertices — double-click or Save to finish',
        'edit.instr.polygon':          'Click to add vertices — double-click or Save to close',
        'edit.instr.confirm':          'Drawing complete — click Save to store',
        'edit.latlon.noline':          '⚠ Lat/lon mode: point editing only'
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
        'settings.geom.mode.auto':     'Auto (detección automática)',
        'settings.geom.mode.geojson':  'GeoJSON {"type":"Point"…}',
        'settings.geom.mode.latlon':   'Lat + Lon (2 columnas numéricas)',
        'settings.geom.mode.lonlat_str': 'Texto "2.35,48.85" (lon,lat)',
        'settings.geom.mode.latlon_str': 'Texto "48.85,2.35" (lat,lon)',
        'settings.geom.mode.wkt':        'WKT "POINT(2.35 48.85)"',
        'settings.geom':      'Columna de geometría',
        'settings.lat':       'Columna de latitud',
        'settings.lon':       'Columna de longitud',
        'settings.label':     'Columna de etiqueta',
        'settings.autozoom':  'Zoom automático al seleccionar fila',
        'settings.features':         'Datos',
        'settings.selection':        'Fila seleccionada',
        'settings.fill':             'Color',
        'settings.fill.opacity':     'Opacidad relleno',
        'settings.sel.fill':         'Color',
        'settings.sel.fill.opacity': 'Opacidad relleno',
        'settings.stroke.width':     'Grosor contorno (px)',
        'settings.sel.stroke.width': 'Grosor contorno (px)',
        'settings.inline.opacity':   'opacidad',
        'settings.inline.width':     'grosor',
        'settings.title':     'Título (title=)',
        'settings.layers':      'Dato via WMS',
        'settings.md':        'Dato via catálogo',
        'settings.lb':          'Mapa de fondo',
        'settings.wms.opacity': 'Opacidad capa WMS',

        'settings.svbase':    'URL base sViewer',
        'settings.apibase':   'URL base API Grist',
        'settings.georchestra':    'URL base geOrchestra',
        'settings.section.data':     'Datos',
        'settings.section.advanced': 'Avanzado',
        'settings.section.help':     'Ayuda',
        'settings.save':           'Aplicar',
        'settings.cancel':         'Cancelar',
        'settings.json':               'Configuración JSON',
        'settings.export':             'Exportar',
        'settings.import':             'Importar',
        'settings.import.apply':       'Aplicar',
        'settings.import.placeholder': 'Pegar JSON exportado aquí…',
        'settings.export.done':        'Configuración copiada al portapapeles',
        'settings.import.error':       'JSON inválido o incompatible',
        'settings.save.reminder':      '⚠ Haga clic en Guardar en la barra Grist para conservar los ajustes',
        'edit.label':                  'Introducir:',
        'edit.type.point':             'Punto',
        'edit.type.line':              'Línea',
        'edit.type.polygon':           'Superficie',
        'edit.save':                   '✓ Guardar',
        'edit.cancel':                 '✗ Cancelar',
        'edit.saved':                  '✓ Geometría guardada — fila ',
        'edit.error':                  '⚠ Error — cambios no guardados',
        'edit.noaccess':               '⚠ Se requiere acceso completo para editar — cambie el nivel de acceso en los ajustes del widget Grist',
        'edit.instr.type':             'Elegir tipo de geometría',
        'edit.instr.point':            'Haga clic en el mapa para colocar el punto',
        'edit.instr.line':             'Haga clic para añadir vértices — doble clic o Guardar para terminar',
        'edit.instr.polygon':          'Haga clic para añadir vértices — doble clic o Guardar para cerrar',
        'edit.instr.confirm':          'Trazado terminado — haga clic en Guardar para almacenar',
        'edit.latlon.noline':          '⚠ Modo lat/lon: solo edición de punto'
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
        'settings.geom.mode.auto':     'Auto (automatische Erkennung)',
        'settings.geom.mode.geojson':  'GeoJSON {"type":"Point"…}',
        'settings.geom.mode.latlon':   'Lat + Lon (2 numerische Spalten)',
        'settings.geom.mode.lonlat_str': 'Text "2.35,48.85" (lon,lat)',
        'settings.geom.mode.latlon_str': 'Text "48.85,2.35" (lat,lon)',
        'settings.geom.mode.wkt':        'WKT "POINT(2.35 48.85)"',
        'settings.geom':      'Geometriespalte',
        'settings.lat':       'Breitengradpalte',
        'settings.lon':       'Längengradpalte',
        'settings.label':     'Beschriftungsspalte',
        'settings.autozoom':  'Automatischer Zoom bei Zeilenauswahl',
        'settings.features':         'Daten',
        'settings.selection':        'Ausgewählte Zeile',
        'settings.fill':             'Farbe',
        'settings.fill.opacity':     'Fülldeckkraft',
        'settings.sel.fill':         'Farbe',
        'settings.sel.fill.opacity': 'Fülldeckkraft',
        'settings.stroke.width':     'Konturstärke (px)',
        'settings.sel.stroke.width': 'Konturstärke (px)',
        'settings.inline.opacity':   'Deck.',
        'settings.inline.width':     'Stärke',
        'settings.title':     'Titel (title=)',
        'settings.layers':      'Daten via WMS',
        'settings.md':        'Daten via Katalog',
        'settings.lb':          'Hintergrundkarte',
        'settings.wms.opacity': 'WMS-Ebene Deckkraft',

        'settings.svbase':    'sViewer Basis-URL',
        'settings.apibase':   'Grist API Basis-URL',
        'settings.georchestra':    'geOrchestra Basis-URL',
        'settings.section.data':     'Daten',
        'settings.section.advanced': 'Erweitert',
        'settings.section.help':     'Hilfe',
        'settings.save':           'Anwenden',
        'settings.cancel':         'Abbrechen',
        'settings.json':               'JSON-Konfiguration',
        'settings.export':             'Exportieren',
        'settings.import':             'Importieren',
        'settings.import.apply':       'Anwenden',
        'settings.import.placeholder': 'Exportiertes JSON hier einfügen…',
        'settings.export.done':        'Einstellungen in Zwischenablage kopiert',
        'settings.import.error':       'Ungültiges oder inkompatibles JSON',
        'settings.save.reminder':      '⚠ Klicken Sie in der Grist-Leiste auf Speichern, um die Einstellungen zu behalten',
        'edit.label':                  'Eingabe:',
        'edit.type.point':             'Punkt',
        'edit.type.line':              'Linie',
        'edit.type.polygon':           'Fläche',
        'edit.save':                   '✓ Speichern',
        'edit.cancel':                 '✗ Abbrechen',
        'edit.saved':                  '✓ Geometrie gespeichert — Zeile ',
        'edit.error':                  '⚠ Fehler — Änderungen nicht gespeichert',
        'edit.noaccess':               '⚠ Vollzugriff erforderlich — Zugriffsebene in den Grist-Widget-Einstellungen ändern',
        'edit.instr.type':             'Geometrietyp wählen',
        'edit.instr.point':            'Klicken Sie auf die Karte, um den Punkt zu setzen',
        'edit.instr.line':             'Klicken zum Hinzufügen von Punkten — Doppelklick oder Speichern zum Beenden',
        'edit.instr.polygon':          'Klicken zum Hinzufügen von Punkten — Doppelklick oder Speichern zum Schließen',
        'edit.instr.confirm':          'Zeichnung abgeschlossen — Speichern zum Übernehmen klicken',
        'edit.latlon.noline':          '⚠ Lat/Lon-Modus: nur Punktbearbeitung'
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
var featureByRowId = {};           // id ligne Grist → OL Feature
var allColumns = [];               // noms de colonnes du dernier onRecords
var allRecords = [];               // enregistrements bruts du dernier onRecords
var svConfig = {};                 // clés de configuration (widget options)
var mapReady = false;              // vrai une fois SViewer.init() résolu
var gristDocId = null;             // identifiant du document Grist (pour l'URL de partage)
var gristTableId = null;           // identifiant de la table Grist (pour l'URL de partage)
var debounceTimer = null;
var selectedRowId = null;          // id de la ligne Grist sélectionnée (pour le surlignage post-rebuild)
var lastRecordsFingerprint = null; // empreinte JSON pour éviter un rebuild si seule la sélection a changé
var viewFitted = false;            // vrai une fois le premier fit de vue effectué
var layerBuilt = false;            // vrai une fois les données OL passées à SViewer via loadFeatureObjects
var editMode = false;              // vrai pendant l'édition de géométrie
var editRowId = null;              // id de la ligne en cours d'édition
var editOrigGeom = null;           // géométrie OL originale sérialisée (pour annulation)
var editDrawType = null;           // type Draw en cours : 'Point'|'LineString'|'Polygon'
var editDrawInteraction = null;    // instance ol.interaction.Draw active
var editDraftGeom = null;          // géométrie OL dessinée (après drawend, avant confirm)
var editVertexCount = 0;           // nombre de sommets placés (pour activer Terminer)
var gristAccessLevel = 'full';     // niveau d'accès accordé par Grist ('none'|'read table'|'full') — optimistic default, corrected by onOptions

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
    if (geom && firstRow) {
        // Name matched — check actual value to distinguish GeoJSON vs WKT
        var geomVal = firstRow[geom];
        if (parseGeom(geomVal)) {
            mode = 'geojson';
        } else if (typeof ol !== 'undefined') {
            // Value is not GeoJSON — try WKT before committing
            var wktProbe = new ol.format.WKT();
            try { wktProbe.readGeometry(geomVal); mode = 'wkt'; } catch(e) { geom = null; }
        } else {
            geom = null;
        }
    } else if (geom) {
        mode = 'geojson'; // no firstRow to probe, assume GeoJSON
    }
    // Si pas de colonne géométrie, chercher une paire lat/lon
    if (!geom) {
        LAT_CANDIDATES.forEach(function(c) { if (!lat && names.indexOf(c) !== -1) { lat = columns[names.indexOf(c)]; } });
        LON_CANDIDATES.forEach(function(c) { if (!lon && names.indexOf(c) !== -1) { lon = columns[names.indexOf(c)]; } });
        if (!lat || !lon) { lat = null; lon = null; }
        if (lat && lon) { mode = 'latlon'; }
    }
    // Fallback : chercher une colonne WKT
    if (!geom && !lat && firstRow && typeof ol !== 'undefined') {
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
var LABEL_MAX_RESOLUTION = 19.11; // ~zoom 13 in EPSG:3857

function makeTextStyle(text, bold, resolution) {
    if (!text && text !== 0) { return null; }
    if (resolution !== undefined && resolution > LABEL_MAX_RESOLUTION) { return null; }
    return new ol.style.Text({
        text: String(text),
        font: (bold ? 'bold ' : '') + '13px sans-serif',
        fill: new ol.style.Fill({ color: '#222' }),
        stroke: new ol.style.Stroke({ color: '#fff', width: 3 }),
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
    var fillColorSolid = colorWithOpacity(cfg.fillColor, 1);
    var fillColorPoly  = colorWithOpacity(cfg.fillColor, cfg.fillOpacity);
    var strokeColor = cfg.strokeColor;
    var radius      = selected ? 10 : 9;
    var sw          = cfg.strokeWidth;
    var haloWidth   = sw + 2;
    return function(feature, resolution) {
        var geomType = feature.getGeometry() ? feature.getGeometry().getType() : '';
        var isPoint  = geomType === 'Point' || geomType === 'MultiPoint';
        var isLine   = geomType === 'LineString' || geomType === 'MultiLineString';
        var text = makeTextStyle(feature.get('_label'), true, resolution);
        if (isPoint) {
            var pointStyle = new ol.style.Style({
                image: new ol.style.Circle({
                    radius: radius,
                    fill: new ol.style.Fill({ color: fillColorSolid }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 1.5 })
                }),
                text: text
            });
            var haloPoint = new ol.style.Style({
                image: new ol.style.Circle({
                    radius: radius + 2,
                    fill: new ol.style.Fill({ color: 'rgba(0,0,0,0)' }),
                    stroke: new ol.style.Stroke({ color: strokeColor, width: 2 })
                })
            });
            return selected ? [pointStyle, haloPoint] : pointStyle;
        }
        var colorStyle = new ol.style.Style({
            fill:   isLine ? null : new ol.style.Fill({ color: fillColorPoly }),
            stroke: new ol.style.Stroke({ color: strokeColor, width: sw }),
            text:   text
        });
        if (haloWidth <= 0) { return colorStyle; }
        return [
            new ol.style.Style({ stroke: new ol.style.Stroke({ color: '#fff', width: haloWidth }) }),
            colorStyle
        ];
    };
}

// Returns geojsonStyle defaults from customConfig/hardConfig, with built-in fallbacks.
function geojsonStyleDefaults() {
    var gs = (window.customConfig && window.customConfig.geojsonStyle) ||
             (window.SViewerHardConfig && window.SViewerHardConfig.geojsonStyle) || {};
    return {
        color:       safeColor(gs.color, '#0077bb'),
        fillOpacity: gs.fillOpacity  !== undefined ? gs.fillOpacity  : 0.35,
        strokeWidth: gs.strokeWidth  !== undefined ? gs.strokeWidth  : 4
    };
}

// Extrait les paramètres de style depuis svConfig pour les entités normales ou sélectionnées.
function getStyleCfg(selected) {
    var d = geojsonStyleDefaults();
    if (selected) {
        return {
            fillColor:   safeColor(svConfig.sel_fill_color, '#ee7733'),
            fillOpacity: svConfig.sel_fill_opacity !== undefined ? parseFloat(svConfig.sel_fill_opacity) : 0.5,
            strokeColor: safeColor(svConfig.sel_fill_color, '#ee7733'),
            strokeWidth: svConfig.sel_stroke_width !== undefined ? parseFloat(svConfig.sel_stroke_width) : d.strokeWidth + 1
        };
    }
    return {
        fillColor:   safeColor(svConfig.fill_color, d.color),
        fillOpacity: svConfig.fill_opacity !== undefined ? parseFloat(svConfig.fill_opacity) : d.fillOpacity,
        strokeColor: safeColor(svConfig.fill_color, d.color),
        strokeWidth: svConfig.stroke_width !== undefined ? parseFloat(svConfig.stroke_width) : d.strokeWidth
    };
}

// Builds a layer-level style function that renders selected feature differently.
// Uses selectedRowId + featureByRowId at render time — no per-feature setStyle().
function makeLayerStyleFn() {
    var baseCfg    = getStyleCfg(false);
    var selCfg     = getStyleCfg(true);
    var baseStyleFn = makeFeatureStyle(baseCfg, false);
    var selStyleFn  = makeFeatureStyle(selCfg,  true);
    return function(feature, resolution) {
        return (selectedRowId !== null && featureByRowId[selectedRowId] === feature)
            ? selStyleFn(feature, resolution)
            : baseStyleFn(feature, resolution);
    };
}

// Trigger redraw — style fn reads selectedRowId at render time, declutter preserved.
function applySelectionStyle() {
    if (!layerBuilt || !mapReady) { return; }
    SViewer.refreshVector();
}

// ---------------------------------------------------------------------------
// Édition de géométrie (point / ligne / polygone)
// ---------------------------------------------------------------------------

// Modes point-only : latlon cols et str formats ne peuvent pas stocker ligne/polygone
function isPointOnlyMode() {
    return colGeomMode === 'latlon' || colGeomMode === 'latlon_str' || colGeomMode === 'lonlat_str';
}

function syncEditButton() {
    var ids = ['sv-btn-type-point', 'sv-btn-type-line', 'sv-btn-type-polygon'];
    var noAccess = gristAccessLevel !== 'full';
    var lbl = document.getElementById('sv-edit-label');
    if (lbl) { lbl.style.display = noAccess ? 'none' : ''; }
    ids.forEach(function(id) {
        var btn = document.getElementById(id);
        if (!btn) { return; }
        btn.style.display = noAccess ? 'none' : '';
        btn.disabled = !selectedRowId || editMode;
    });
    // point-only mode: disable line/polygon
    if (!noAccess && selectedRowId && !editMode) {
        var pointOnly = isPointOnlyMode();
        var lineBtn = document.getElementById('sv-btn-type-line');
        var polyBtn = document.getElementById('sv-btn-type-polygon');
        if (lineBtn) { lineBtn.disabled = pointOnly; }
        if (polyBtn) { polyBtn.disabled = pointOnly; }
    }
}

function removeDraw() {
    var map = SViewer.getMap();
    if (map && editDrawInteraction) {
        map.removeInteraction(editDrawInteraction);
    }
    editDrawInteraction = null;
    editDrawType = null;
    editVertexCount = 0;
}

function exitEdit() {
    removeDraw();
    editMode = false;
    editRowId = null;
    editOrigGeom = null;
    editDraftGeom = null;
    document.getElementById('sv-btn-edit-finish').style.display = 'none';
    document.getElementById('sv-btn-edit-cancel').style.display = 'none';
    syncEditButton();
    setStatus('');
}

// Serialize OL geometry to string for write-back to Grist.
// Returns { fields } or null if format incompatible with geom type.
function geomToFields(olGeom) {
    var fmt = new ol.format.GeoJSON();
    var geojsonGeom = JSON.parse(fmt.writeGeometry(olGeom, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }));
    var geomType = olGeom.getType(); // 'Point', 'LineString', 'Polygon'
    var fields = {};

    if (colGeomMode === 'latlon' || colGeomMode === 'latlon_str' || colGeomMode === 'lonlat_str') {
        if (geomType !== 'Point') { return null; }
        var coords = geojsonGeom.coordinates; // [lon, lat]
        var lon = coords[0], lat = coords[1];
        if (colGeomMode === 'latlon') { fields[colLat] = lat; fields[colLon] = lon; }
        else if (colGeomMode === 'latlon_str') { fields[colGeom] = lat + ',' + lon; }
        else { fields[colGeom] = lon + ',' + lat; }
    } else if (colGeomMode === 'wkt') {
        var wktFmt = new ol.format.WKT();
        fields[colGeom] = wktFmt.writeGeometry(olGeom, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
    } else {
        // geojson or auto
        fields[colGeom] = JSON.stringify(geojsonGeom);
    }
    return fields;
}

// Phase 2: geometry drawn, waiting for confirm
function onDrawEnd(olGeom) {
    editDraftGeom = olGeom;
    removeDraw();
    // Update the feature on map immediately so user sees the result
    var feat = featureByRowId[editRowId];
    if (feat) {
        feat.setGeometry(olGeom);
        applySelectionStyle();
    }
    var finishBtn = document.getElementById('sv-btn-edit-finish');
    finishBtn.disabled = false;
    finishBtn.textContent = tr('edit.save');
    setStatus(tr('edit.instr.confirm'));
}

// Phase 1: activate Draw interaction for chosen type
function startDraw(olType) {
    var map = SViewer.getMap();
    if (!map) { return; }
    removeDraw();

    editDrawType = olType;
    editVertexCount = 0;
    var minPoints = olType === 'Point' ? 1 : olType === 'LineString' ? 2 : 3;

    // Keep existing feature visible during draw — user sees original position for reference
    var feat = featureByRowId[editRowId];
    if (feat) { feat.setStyle(null); } // null = revert to layer style

    var drawSketchStyle = new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(255,215,0,0.3)' }),
        stroke: new ol.style.Stroke({ color: '#FFD700', width: 2.5 }),
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({ color: '#FFD700' }),
            stroke: new ol.style.Stroke({ color: '#000', width: 1.5 })
        })
    });
    editDrawInteraction = new ol.interaction.Draw({
        type: olType,
        clickTolerance: 12,
        stopClick: true,
        style: drawSketchStyle
    });

    var finishBtn = document.getElementById('sv-btn-edit-finish');
    finishBtn.disabled = true;
    var instrKey = olType === 'Point' ? 'edit.instr.point' : olType === 'LineString' ? 'edit.instr.line' : 'edit.instr.polygon';
    setStatus(tr(instrKey));

    editDrawInteraction.on('drawstart', function() {
        editVertexCount = 0;
    });

    // Track vertex count via geometry change on the sketch feature
    editDrawInteraction.on('drawstart', function(evt) {
        evt.feature.getGeometry().on('change', function() {
            var geom = evt.feature.getGeometry();
            var count = 0;
            if (olType === 'Point') { count = 1; }
            else if (olType === 'LineString') { count = geom.getCoordinates().length; }
            else { count = geom.getCoordinates()[0].length - 1; } // polygon ring, last = first
            editVertexCount = count;
            finishBtn.disabled = count < minPoints;
        });
    });

    editDrawInteraction.on('drawend', function(evt) {
        onDrawEnd(evt.feature.getGeometry());
    });

    map.addInteraction(editDrawInteraction);

    // Type buttons: highlight active
    ['Point', 'LineString', 'Polygon'].forEach(function(t) {
        var id = t === 'Point' ? 'sv-btn-type-point' : t === 'LineString' ? 'sv-btn-type-line' : 'sv-btn-type-polygon';
        var b = document.getElementById(id);
        if (b) { b.style.fontWeight = t === olType ? 'bold' : ''; }
    });
}

// Called by type buttons (Point/Ligne/Polygone) — enters edit mode for chosen type
function startEdit(olType) {
    if (gristAccessLevel !== 'full') { setStatus(tr('edit.noaccess')); return; }
    if (!selectedRowId) { return; }
    if (editMode) { cancelEdit(); } // switch type mid-edit: cancel current draw first
    editMode = true;
    editRowId = selectedRowId;
    editDraftGeom = null;

    // Serialize original geometry for cancel restoration
    var feat = featureByRowId[editRowId];
    if (feat && feat.getGeometry()) {
        var fmt = new ol.format.GeoJSON();
        editOrigGeom = fmt.writeGeometry(feat.getGeometry());
    } else {
        editOrigGeom = null;
    }

    // Show save/cancel, disable type buttons during draw
    document.getElementById('sv-btn-edit-finish').style.display = '';
    document.getElementById('sv-btn-edit-cancel').style.display = '';
    syncEditButton(); // disables type buttons while editMode=true

    startDraw(olType);
}

function finishEdit() {
    if (editDraftGeom) {
        // Already drawn — confirm write-back
        if (!editRowId) { exitEdit(); return; }
        var fields = geomToFields(editDraftGeom);
        if (!fields) { setStatus(tr('edit.latlon.noline')); exitEdit(); return; }
        var rowId = editRowId;
        exitEdit();
        grist.selectedTable.update({ id: rowId, fields: fields }).then(function() {
            setStatus(tr('edit.saved') + rowId);
            setTimeout(function() { if (document.getElementById('sv-status').textContent === tr('edit.saved') + rowId) { setStatus(''); } }, 4000);
        }).catch(function(e) {
            console.error('[sviewer] geometry update failed:', e);
            setStatus(tr('edit.error'));
        });
    } else if (editDrawInteraction) {
        // Still drawing — trigger finish (OL will fire drawend)
        editDrawInteraction.finishDrawing();
    }
}

function cancelEdit() {
    // Restore original geometry on map if feature exists
    var feat = editRowId ? featureByRowId[editRowId] : null;
    if (feat) {
        if (editOrigGeom) {
            var fmt = new ol.format.GeoJSON();
            feat.setGeometry(fmt.readGeometry(editOrigGeom));
        } else {
            feat.setGeometry(null);
        }
        applySelectionStyle();
    }
    exitEdit();
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
    var configKeys = ['fill_color', 'fill_opacity', 'stroke_width',
                      'sel_fill_color', 'sel_fill_opacity', 'sel_stroke_width',
                      'title', 'layers', 'md', 'sviewer_base', 'grist_api_base', 'georchestra_base',
                      'geom_mode', 'autozoom', 'lb', 'wms_opacity'];
    configKeys.forEach(function(k) { if (svConfig[k] !== undefined) { opts[k] = svConfig[k]; } });
    grist.widgetApi.setOptions(opts).catch(function(e) { console.warn('[sviewer] setOptions failed:', e); });
}

// Applique les options widget : restaure svConfig + colonnes actives.
function applyOptions(opts) {
    if (!opts) { return; }
    widgetOptions = opts;
    optionsLoaded = true;
    var configKeys = ['fill_color', 'fill_opacity', 'stroke_width',
                      'sel_fill_color', 'sel_fill_opacity', 'sel_stroke_width',
                      'title', 'layers', 'md', 'sviewer_base', 'grist_api_base', 'georchestra_base',
                      'geom_mode', 'autozoom', 'lb', 'wms_opacity'];
    configKeys.forEach(function(k) { if (opts[k] !== undefined) { svConfig[k] = opts[k]; } });
    // migrate legacy keys
    if (opts.feature_color && !opts.fill_color)                 { svConfig.fill_color      = opts.feature_color; }
    if (opts.feature_highlight_color && !opts.sel_fill_color)   { svConfig.sel_fill_color  = opts.feature_highlight_color; }
    // migrate sel_fill_opacity=1 (old default) → 0.5
    if (svConfig.sel_fill_opacity === 1)                        { svConfig.sel_fill_opacity = 0.5; }
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
    document.querySelectorAll('.sv-tab-btn').forEach(function(b) { b.classList.remove('sv-tab-active'); b.setAttribute('aria-selected', 'false'); });
    document.querySelectorAll('.sv-tab-panel[data-tab]').forEach(function(fs) { fs.classList.remove('sv-tab-visible'); fs.setAttribute('aria-hidden', 'true'); });
    var firstBtn = document.querySelector('.sv-tab-btn[data-tab="data"]');
    var firstFs  = document.querySelector('.sv-tab-panel[data-tab="data"]');
    if (firstBtn) { firstBtn.classList.add('sv-tab-active'); firstBtn.setAttribute('aria-selected', 'true'); }
    if (firstFs)  { firstFs.classList.add('sv-tab-visible'); firstFs.setAttribute('aria-hidden', 'false'); }
    var modeElOs = document.getElementById('sv-cfg-geom-mode');
    if (modeElOs) { modeElOs.value = colGeomMode; }
    syncColumnPickerMode();
    var d = geojsonStyleDefaults();
    document.getElementById('sv-cfg-fill-color').value          = safeColor(svConfig.fill_color,       d.color);
    document.getElementById('sv-cfg-fill-opacity').value        = svConfig.fill_opacity !== undefined ? svConfig.fill_opacity : d.fillOpacity;
    document.getElementById('sv-cfg-stroke-width').value        = svConfig.stroke_width !== undefined ? svConfig.stroke_width : d.strokeWidth;
    document.getElementById('sv-cfg-sel-fill-color').value      = safeColor(svConfig.sel_fill_color,   '#ee7733');
    document.getElementById('sv-cfg-sel-fill-opacity').value    = svConfig.sel_fill_opacity !== undefined ? svConfig.sel_fill_opacity : 0.5;
    document.getElementById('sv-cfg-sel-stroke-width').value    = svConfig.sel_stroke_width !== undefined ? svConfig.sel_stroke_width : d.strokeWidth + 1;
    document.getElementById('sv-cfg-md').value       = svConfig.md     || '';
    document.getElementById('sv-cfg-layers').value  = svConfig.layers || '';
    document.getElementById('sv-cfg-md').disabled     = !!svConfig.layers;
    document.getElementById('sv-cfg-layers').disabled = !!svConfig.md;
    document.getElementById('sv-cfg-autozoom').checked = svConfig.autozoom !== false;
    var defaultSvBase = svConfig.sviewer_base || (function() {
        var loc = window.location;
        var dir = loc.pathname.replace(/\/[^\/]*$/, '/');
        return loc.origin + dir.replace(/skill\/grist\/$/, '');
    }());
    document.getElementById('sv-cfg-svbase').value = defaultSvBase;
    var defaultApiBase = svConfig.grist_api_base || (function() {
        try { return document.referrer ? new URL(document.referrer).origin : ''; } catch(e) { return ''; }
    }());
    document.getElementById('sv-cfg-apibase').value = defaultApiBase;
    document.getElementById('sv-cfg-georchestra').value = svConfig.georchestra_base ||
        (window.SViewerHardConfig && window.SViewerHardConfig.geOrchestraBaseUrl) ||
        (window.customConfig && window.customConfig.geOrchestraBaseUrl) || '';
    (function() {
        var opVal = svConfig.wms_opacity !== undefined ? svConfig.wms_opacity : 1;
        var opPct = Math.round(opVal * 100) + '%';
        var sl = document.getElementById('sv-cfg-wms-opacity');
        var lb = document.getElementById('sv-cfg-wms-opacity-val');
        if (sl) { sl.value = opVal; sl.setAttribute('aria-valuetext', opPct); }
        if (lb) { lb.textContent = opPct; }
    }());
    // Background selector — populate from backgroundPresets if available
    (function() {
        var presets = (window.customConfig && window.customConfig.backgroundPresets) ||
                      (window.SViewerHardConfig && window.SViewerHardConfig.backgroundPresets) || [];
        var sel    = document.getElementById('sv-cfg-lb');
        var lbl    = document.getElementById('sv-cfg-lb-label');
        var sep    = document.getElementById('sv-cfg-lb-sep');
        var show   = presets.length > 1;
        sel.style.display = lbl.style.display = sep.style.display = show ? '' : 'none';
        if (show) {
            sel.innerHTML = '';
            presets.forEach(function(p, i) {
                var opt = document.createElement('option');
                opt.value = i;
                opt.textContent = p.title || ('Fond ' + i);
                sel.appendChild(opt);
            });
            sel.value = svConfig.lb !== undefined ? svConfig.lb : 0;
        }
    }());
    panel.style.display = 'flex';
    document.getElementById('sv-map').style.display    = 'none';
    document.getElementById('sv-toolbar').style.display = 'none';
    var firstFocus = document.getElementById('sv-cfg-geom-mode');
    if (firstFocus) { firstFocus.focus(); }
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

        var dcs = geojsonStyleDefaults();
        function readFloat(id, fallback) { var v = parseFloat(document.getElementById(id).value); return isNaN(v) ? fallback : v; }
        svConfig.fill_color       = document.getElementById('sv-cfg-fill-color').value;
        svConfig.fill_opacity     = readFloat('sv-cfg-fill-opacity',     dcs.fillOpacity);
        svConfig.stroke_width     = readFloat('sv-cfg-stroke-width',     dcs.strokeWidth);
        svConfig.sel_fill_color   = document.getElementById('sv-cfg-sel-fill-color').value;
        svConfig.sel_fill_opacity = readFloat('sv-cfg-sel-fill-opacity', 1);
        svConfig.sel_stroke_width = readFloat('sv-cfg-sel-stroke-width', dcs.strokeWidth + 1);

        var layers  = document.getElementById('sv-cfg-layers').value.trim();
        var md      = document.getElementById('sv-cfg-md').value.trim();
        var apibase = document.getElementById('sv-cfg-apibase').value.trim();
        if (layers)  { svConfig.layers  = layers; } else { delete svConfig.layers; }
        if (md)      { svConfig.md      = md;     } else { delete svConfig.md; }
        svConfig.autozoom = document.getElementById('sv-cfg-autozoom').checked;
        var svbase  = document.getElementById('sv-cfg-svbase').value.trim();
        if (svbase)  { svConfig.sviewer_base   = svbase;  } else { delete svConfig.sviewer_base; }
        if (apibase) { svConfig.grist_api_base = apibase; } else { delete svConfig.grist_api_base; }
        var georchestra = document.getElementById('sv-cfg-georchestra').value.trim();
        if (georchestra) { svConfig.georchestra_base = georchestra; } else { delete svConfig.georchestra_base; }
        var opSlider = document.getElementById('sv-cfg-wms-opacity');
        if (opSlider) {
            var opVal = parseFloat(opSlider.value);
            svConfig.wms_opacity = isNaN(opVal) ? 1 : opVal;
        }
        var lbSel = document.getElementById('sv-cfg-lb');
        if (lbSel && lbSel.style.display !== 'none') {
            var lbVal = parseInt(lbSel.value, 10);
            if (!isNaN(lbVal)) {
                svConfig.lb = lbVal;
                if (mapReady) { SViewer.switchBackground(lbVal); }
            } else { delete svConfig.lb; }
        }
        saveOptions();
        if ((svConfig.layers || null) !== initialLayers || (svConfig.md || null) !== initialMd) { window.location.reload(); return; }
        viewFitted = false;
        var geojsonUrl = buildGristGeojsonUrl();
        if (geojsonUrl) { SViewer.setGeojsonUrl(geojsonUrl); }
        rebuildLayer();
        setStatus(tr('settings.save.reminder'));
    }
    document.getElementById('sv-settings').style.display    = 'none';
    document.getElementById('sv-import-area').style.display = 'none';
    document.getElementById('sv-import-json').value         = '';
    document.getElementById('sv-map').style.display         = '';
    document.getElementById('sv-toolbar').style.display     = '';
    var restoreFocus = document.getElementById('sv-status');
    if (restoreFocus) { restoreFocus.focus(); }
}

// onRecords se déclenche aussi à chaque changement de sélection — le debounce évite les rebuilds inutiles.
function scheduleRebuildLayer() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(rebuildLayer, 300);
}

// Reconstruit les données OL vecteur depuis allRecords et les passe à SViewer via loadFeatureObjects.
// Reprojette EPSG:4326 → EPSG:3857. Fit de vue au premier chargement uniquement.
// Court-circuite le rebuild si les données n'ont pas changé (empreinte identique).
function rebuildLayer() {
    var hasGeomSource = colGeom || (colLat && colLon);
    if (!mapReady || !hasGeomSource) { return; }

    // colonnes actives dans l'empreinte : force le rebuild si la colonne change sans que les données bougent
    var fingerprint = JSON.stringify(allRecords) + '|' + colGeom + '|' + colLat + '|' + colLon + '|' + colLabel + '|' + colGeomMode;
    if (layerBuilt && fingerprint === lastRecordsFingerprint) {
        applySelectionStyle();
        return;
    }
    lastRecordsFingerprint = fingerprint;

    featureByRowId = {};
    layerBuilt = false;

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
                    Object.keys(row).forEach(function(k) { if (k !== 'id' && k !== colGeom && k !== colLat && k !== colLon) { feat.set(k, row[k]); } });
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
        Object.keys(row).forEach(function(k) { if (k !== 'id' && k !== colGeom && k !== colLat && k !== colLon) { feat.set(k, row[k]); } });
        if (colLabel && row[colLabel] !== undefined && row[colLabel] !== null) {
            feat.set('_label', row[colLabel]);
        }
        featureByRowId[rowId] = feat;
        features.push(feat);
    });

    SViewer.loadFeatureObjects(features, {
        styleOverride: makeLayerStyleFn(),
        fitExtent: features.length > 0 && !viewFitted
    });
    layerBuilt = true;
    if (features.length) { viewFitted = true; }

    // Refresh share URL with current column hints after each rebuild
    var geojsonUrl = buildGristGeojsonUrl();
    if (geojsonUrl) { SViewer.setGeojsonUrl(geojsonUrl); }

    setStatus(allRecords.length + tr('features') + (skipped ? ' (' + skipped + tr('skipped') + ')' : ''));
    syncEditButton();
}

// Réagit au clic sur une entité de la carte (émis par sViewer via sv:featureClick).
// Met à jour selectedRowId et applique le style sélection.
function onMapFeatureClick(e) {
    var rowId = e.feature.get('_gristRowId');
    if (rowId === undefined) { return; }
    selectedRowId = rowId;
    applySelectionStyle();
    syncEditButton();
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
// geojson n'est pas passé à init pour éviter qu'sViewer rende des données en double ;
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
    if (svConfig.lb !== undefined) { opts.lb = svConfig.lb; }
    if (svConfig.wms_opacity !== undefined && svConfig.wms_opacity !== 1) { opts.opacity = svConfig.wms_opacity; }
    initialLayers = svConfig.layers || null;
    initialMd = svConfig.md || null;
    var georchestraBase = safeHttpUrl(svConfig.georchestra_base);
    if (georchestraBase && window.SViewerHardConfig) { window.SViewerHardConfig.geOrchestraBaseUrl = georchestraBase; }

    SViewer.init('#sv-map', opts).then(function() {
        mapReady = true;
        // Persist title edits made via the sViewer share panel into widget options.
        // Only fires on user interaction (not programmatic setTitle calls).
        SViewer.onTitleChange = function(title) {
            svConfig.title = title;
            saveOptions();
        };
        // React to map feature clicks — Grist-specific: track selectedRowId + apply selection style.
        SViewer.on('sv:featureClick', onMapFeatureClick);
        var geojsonUrl = buildGristGeojsonUrl();
        if (geojsonUrl) { SViewer.setGeojsonUrl(geojsonUrl); }
        // Re-run column detection if onRecords fired before OL was loaded (WKT probing skipped then)
        if (!colGeom && !colLat && !colLon && allRecords.length) {
            var savedMode = svConfig.geom_mode;
            var canAutoDetect = !optionsLoaded || !savedMode || savedMode === 'auto';
            if (canAutoDetect) {
                var det = detectColumns(allColumns, allRecords[0]);
                if (det.geom) { colGeom = det.geom; colGeomMode = det.mode; colLabel = colLabel || det.label; }
                else if (det.lat && det.lon) { colLat = det.lat; colLon = det.lon; colGeomMode = 'latlon'; colLabel = colLabel || det.label; }
            }
        }
        rebuildLayer();
    }).catch(function(e) {
        console.error('[sviewer] init failed:', e);
        setStatus('⚠ ' + (e && e.message ? e.message : 'Map init failed'));
    });
}

// ---------------------------------------------------------------------------
// Événements barre d'outils
// ---------------------------------------------------------------------------

document.getElementById('sv-btn-type-point').addEventListener('click', function() { startEdit('Point'); });
document.getElementById('sv-btn-type-line').addEventListener('click', function() { startEdit('LineString'); });
document.getElementById('sv-btn-type-polygon').addEventListener('click', function() { startEdit('Polygon'); });
document.getElementById('sv-btn-edit-finish').addEventListener('click', function() { finishEdit(); });
document.getElementById('sv-btn-edit-cancel').addEventListener('click', function() { cancelEdit(); });

document.getElementById('sv-btn-cfg-save').addEventListener('click', function() { closeSettings(true); });
document.getElementById('sv-btn-cfg-cancel').addEventListener('click', function() { closeSettings(false); });

(function() {
    var elMd     = document.getElementById('sv-cfg-md');
    var elLayers = document.getElementById('sv-cfg-layers');
    elMd.addEventListener('input', function() {
        var has = elMd.value.trim() !== '';
        elLayers.disabled = has;
        if (has) { elLayers.value = ''; }
    });
    elLayers.addEventListener('input', function() {
        var has = elLayers.value.trim() !== '';
        elMd.disabled = has;
        if (has) { elMd.value = ''; }
    });
}());

document.getElementById('sv-cfg-wms-opacity').addEventListener('input', function() {
    var pct = Math.round(parseFloat(this.value) * 100) + '%';
    var lbl = document.getElementById('sv-cfg-wms-opacity-val');
    if (lbl) { lbl.textContent = pct; }
    this.setAttribute('aria-valuetext', pct);
});

document.getElementById('sv-btn-cfg-export').addEventListener('click', function() {
    function rf(id) { return document.getElementById(id) ? document.getElementById(id).value : undefined; }
    function rn(id) { var v = parseFloat(rf(id)); return isNaN(v) ? undefined : v; }
    var out = {
        stroke_width:     rn('sv-cfg-stroke-width'),
        fill_color:       rf('sv-cfg-fill-color'),
        fill_opacity:     rn('sv-cfg-fill-opacity'),
        sel_stroke_width: rn('sv-cfg-sel-stroke-width'),
        sel_fill_color:   rf('sv-cfg-sel-fill-color'),
        sel_fill_opacity: rn('sv-cfg-sel-fill-opacity'),
    };
    if (svConfig.title)                            { out.title          = svConfig.title; }
    var layers = rf('sv-cfg-layers'); if (layers) { out.layers         = layers; }
    var md = rf('sv-cfg-md'); if (md)             { out.md             = md; }
    var svbase = rf('sv-cfg-svbase'); if (svbase) { out.sviewer_base   = svbase; }
    var api = rf('sv-cfg-apibase'); if (api)      { out.grist_api_base = api; }
    var geo = rf('sv-cfg-georchestra'); if (geo)  { out.georchestra_base = geo; }
    var gmode = rf('sv-cfg-geom-mode'); if (gmode && gmode !== 'auto') { out.geom_mode = gmode; }
    out.autozoom = document.getElementById('sv-cfg-autozoom').checked;
    var lbSelExp = document.getElementById('sv-cfg-lb');
    if (lbSelExp && lbSelExp.style.display !== 'none') { out.lb = parseInt(lbSelExp.value, 10); }
    var opSliderExp = document.getElementById('sv-cfg-wms-opacity');
    if (opSliderExp) { out.wms_opacity = parseFloat(opSliderExp.value); }
    var json = JSON.stringify(out, null, 2);
    navigator.clipboard.writeText(json).then(function() {
        var btn = document.getElementById('sv-btn-cfg-export');
        var orig = btn.textContent;
        btn.textContent = tr('settings.export.done');
        setTimeout(function() { btn.textContent = orig; }, 2000);
    }).catch(function() { alert(json); });
});

function applyImportData(data) {
    var dai = geojsonStyleDefaults();
    if (data.fill_color !== undefined)       { document.getElementById('sv-cfg-fill-color').value       = safeColor(data.fill_color, dai.color); }
    if (data.fill_opacity !== undefined)     { document.getElementById('sv-cfg-fill-opacity').value     = data.fill_opacity; }
    if (data.stroke_width !== undefined)     { document.getElementById('sv-cfg-stroke-width').value     = data.stroke_width; }
    if (data.sel_fill_color !== undefined)   { document.getElementById('sv-cfg-sel-fill-color').value   = safeColor(data.sel_fill_color, '#ee7733'); }
    if (data.sel_fill_opacity !== undefined) { document.getElementById('sv-cfg-sel-fill-opacity').value = data.sel_fill_opacity; }
    if (data.sel_stroke_width !== undefined) { document.getElementById('sv-cfg-sel-stroke-width').value = data.sel_stroke_width; }
    if (data.title !== undefined) {
        svConfig.title = data.title;
        // Update share panel field directly — bypass onTitleChange (import is not a user edit)
        var sf = document.getElementById('shareSetTitle');
        if (sf) { sf.value = data.title; }
    }
    if (data.layers !== undefined) { document.getElementById('sv-cfg-layers').value = data.layers; }
    if (data.md !== undefined)     { document.getElementById('sv-cfg-md').value     = data.md; }
    if (data.sviewer_base !== undefined)        { document.getElementById('sv-cfg-svbase').value = safeHttpUrl(data.sviewer_base) || ''; }
    if (data.grist_api_base !== undefined)      { document.getElementById('sv-cfg-apibase').value = safeHttpUrl(data.grist_api_base) || ''; }
    if (data.georchestra_base !== undefined)    { document.getElementById('sv-cfg-georchestra').value = safeHttpUrl(data.georchestra_base) || ''; }
    if (data.geom_mode !== undefined) {
        var modeElAi = document.getElementById('sv-cfg-geom-mode');
        if (modeElAi) { modeElAi.value = data.geom_mode; syncColumnPickerMode(); }
    }
    if (data.autozoom !== undefined) { document.getElementById('sv-cfg-autozoom').checked = data.autozoom; }
    if (data.lb !== undefined) {
        var lbSelAi = document.getElementById('sv-cfg-lb');
        if (lbSelAi && lbSelAi.style.display !== 'none') { lbSelAi.value = data.lb; }
    }
    if (data.wms_opacity !== undefined) {
        var opSliderAi = document.getElementById('sv-cfg-wms-opacity');
        var opLblAi    = document.getElementById('sv-cfg-wms-opacity-val');
        if (opSliderAi) { opSliderAi.value = data.wms_opacity; }
        if (opLblAi)    { opLblAi.textContent = Math.round(data.wms_opacity * 100) + '%'; }
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

if (typeof grist.onThemeChange === 'function') {
    grist.onThemeChange(function(theme) {
        document.body.classList.toggle('dark', theme.appearance === 'dark');
    });
}

if (typeof grist.onOptions === 'function') {
    grist.onOptions(function(_opts, interactionOptions) {
        if (interactionOptions && interactionOptions.accessLevel) {
            gristAccessLevel = interactionOptions.accessLevel;
            syncEditButton();
        }
    });
}

if (grist.widgetApi && typeof grist.widgetApi.onOptions === 'function') {
    grist.widgetApi.onOptions(function(opts) {
        applyOptions(opts);
        // user clicked Save in Grist — dismiss the reminder
        var s = document.getElementById('sv-status');
        if (s && s.textContent === tr('settings.save.reminder')) { setStatus(''); }
        if (mapReady) {
            var geojsonUrl = buildGristGeojsonUrl();
            if (geojsonUrl) { SViewer.setGeojsonUrl(geojsonUrl); }
            viewFitted = false;
            rebuildLayer();
        }
    });
}


// Enregistré immédiatement après ready() — Grist envoie le premier onRecords
// dès réception de Ready ; un enregistrement tardif (dans une Promise) le manquerait.
grist.onRecords(function(records) {
    if (editMode) { return; }
    allRecords = records;

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
    if (editMode || !mapReady || !record) { return; }
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
        selectedRowId = record.id;
        var wktRec = record[colGeom];
        if (typeof wktRec === 'string') {
            try {
                var wktFmtR = new ol.format.WKT();
                var wktOlGeomR = wktFmtR.readGeometry(wktRec, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
                var feat = featureByRowId[selectedRowId];
                var view = SViewer.getView();
                if (view && feat) {
                    if (svConfig.autozoom !== false) {
                        var ext = wktOlGeomR.getExtent();
                        view.fit(ext, { padding: [60, 60, 60, 60], maxZoom: 17, duration: 400 });
                    }
                    applySelectionStyle();
                }
            } catch(e) { /* invalid WKT */ }
        }
        syncEditButton();
        return;
    } else {
        if (colGeom) { geomVal = parseGeom(record[colGeom]); }
        if (!geomVal && colLat && colLon) {
            var lat2 = parseFloat(record[colLat]);
            var lon2 = parseFloat(record[colLon]);
            if (!isNaN(lat2) && !isNaN(lon2)) { geomVal = { type: 'Point', coordinates: [lon2, lat2] }; }
        }
    }
    var rowId = record.id;
    selectedRowId = rowId;
    if (!geomVal || !geomVal.coordinates) { syncEditButton(); return; }
    var feat = featureByRowId[rowId];

    var view = SViewer.getView();
    if (view && feat) {
        if (svConfig.autozoom !== false) {
            var ext = feat.getGeometry().getExtent();
            view.fit(ext, { padding: [60, 60, 60, 60], maxZoom: 17, duration: 400 });
        }
        applySelectionStyle();
    }
    syncEditButton();
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
    document.querySelectorAll('.sv-tab-btn').forEach(function(b) {
        b.classList.remove('sv-tab-active');
        b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.sv-tab-panel[data-tab]').forEach(function(fs) {
        fs.classList.remove('sv-tab-visible');
        fs.setAttribute('aria-hidden', 'true');
    });
    btn.classList.add('sv-tab-active');
    btn.setAttribute('aria-selected', 'true');
    var target = document.querySelector('.sv-tab-panel[data-tab="' + tab + '"]');
    if (target) { target.classList.add('sv-tab-visible'); target.setAttribute('aria-hidden', 'false'); }
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
