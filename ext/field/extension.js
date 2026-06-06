/**
 * sViewer extension — Terrain (field)
 *
 * Field data collection. Walk a zone perimeter, capture GPS waypoints into a
 * polygon, fill attributes from a Grist table schema, persist offline in
 * IndexedDB, push to Grist when the network is available.
 *
 * Single backend: self-hosted Grist. Document-scoped Bearer token.
 * v1: geometry + attributes. Photos = v2 (queue schema already reserves a
 * `photos` field — see MISSION.md).
 *
 * Activate via:  customConfig = { extensions: ['field'] }   or   ?ext=field
 *
 * Design + invariants: ext/field/MISSION.md
 */
(function () {
    'use strict';

    var PANEL = 'field';
    var CFG_KEY    = 'sv_field_cfg_v1';
    var SCHEMA_KEY = 'sv_field_schema_v1';
    var DB_NAME = 'sv_field';
    var DB_STORE = 'queue';
    var MAX_SYNCED = 50;          // cap on retained synced records (oldest evicted)
    var AVG_MS    = 3000;         // vertex sampling window (ms) — average fixes while stationary
    var ACC_GATE  = 25;           // reject fixes worse than this accuracy (m) during sampling
    var PHOTO_MAX = 1600;         // photo max edge (px) — downscaled before storage/upload
    var PHOTO_Q   = 0.8;          // photo JPEG quality

    // --- State ---------------------------------------------------------------
    var mapRef   = null;
    var active   = false;
    var btnEl    = null;
    var watchId  = null;          // navigator.geolocation.watchPosition id
    var vertices = [];            // captured vertices, EPSG:4326 [lon, lat]
    var lastFix  = null;          // { lon, lat, accuracy }
    var firstFix = false;         // first GPS fix of the current capture (triggers auto-zoom)
    var gpsLayer = null;          // own OL layer: live position dot + accuracy circle
    var gpsDotFeat = null, gpsAccFeat = null;
    var sampling = false;         // true while averaging fixes for a vertex
    var sampleBuf = [];           // fixes collected during the sampling window
    var vertexMeta = [];          // parallel to vertices: { accuracy, gated } per vertex
    var lastWeak = false;         // last committed vertex failed the accuracy gate
    var geomMode = 'Polygon';     // 'MultiPoint' | 'LineString' | 'Polygon'
    var schema   = null;          // [{ id, type, label }] — writable Grist columns
    var attachCol = null;         // id of the first Attachments column (photo target), or null
    var formPhotos = [];          // Blobs picked in the current attribute form
    var cfg      = loadCfg();     // { apiBase, docId, tableId, token, geomCol }

    // --- Inline SVG icons (Bootstrap Icons, MIT) -----------------------------
    var ICONS = {
        'geo-alt':     '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A32 32 0 0 1 8 14.58a32 32 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10"/><path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4m0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/></svg>',
        // pin on a map plane — "mark a location on site" (GPS field collection),
        // more field-ish than a pen, and distinct from the query panel's bare pin.
        'pin-map':     '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M3.1 11.2a.5.5 0 0 1 .4-.2H6a.5.5 0 0 1 0 1H3.75L1.5 15h13l-2.25-3H10a.5.5 0 0 1 0-1h2.5a.5.5 0 0 1 .4.2l3 4a.5.5 0 0 1-.4.8H.5a.5.5 0 0 1-.4-.8z"/><path fill-rule="evenodd" d="M8 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6M4 4a4 4 0 1 1 4.5 3.969V13.5a.5.5 0 0 1-1 0V7.97A4 4 0 0 1 4 3.999z"/></svg>',
        'plus-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/></svg>',
        'arrow-repeat':'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9"/><path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5 5 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"/></svg>',
        'gear':        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z"/></svg>',
        'x-lg':        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/></svg>',
        'check2':      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0"/></svg>',
        'arrow-undo':  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"/></svg>',
        'share':       '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5m-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/></svg>',
        'pentagon':    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M7.685 1.545a.5.5 0 0 1 .63 0l6.263 5.088a.5.5 0 0 1 .161.539l-2.362 7.479a.5.5 0 0 1-.476.349H4.099a.5.5 0 0 1-.476-.35L1.26 7.173a.5.5 0 0 1 .161-.54l6.263-5.087Zm8.213 5.28a.5.5 0 0 0-.162-.54L8.316.257a.5.5 0 0 0-.631 0L.264 6.286a.5.5 0 0 0-.162.538l2.788 8.827a.5.5 0 0 0 .476.349h9.268a.5.5 0 0 0 .476-.35l2.788-8.826Z"/></svg>',
        'trash':       '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>',
        'crosshair':   '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M8.5.5a.5.5 0 0 0-1 0v.518A7 7 0 0 0 1.018 7.5H.5a.5.5 0 0 0 0 1h.518A7 7 0 0 0 7.5 14.982v.518a.5.5 0 0 0 1 0v-.518A7 7 0 0 0 14.982 8.5h.518a.5.5 0 0 0 0-1h-.518A7 7 0 0 0 8.5 1.018zm-6.48 7A6 6 0 0 1 7.5 2.02v.48a.5.5 0 0 0 1 0v-.48a6 6 0 0 1 5.48 5.48h-.48a.5.5 0 0 0 0 1h.48a6 6 0 0 1-5.48 5.48v-.48a.5.5 0 0 0-1 0v.48A6 6 0 0 1 2.02 8.5h.48a.5.5 0 0 0 0-1zM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/></svg>'
    };
    function icon(name) { return ICONS[name] || ''; }

    // --- i18n (fr default, en, es, de) — 100% coverage required --------------
    var I18N = {
        fr: {
            'title':          'Collecte terrain',
            'btn.aria':       'Collecte terrain',
            'cfg.title':      'Configuration Grist',
            'cfg.btn':        'Configuration',
            'cfg.apiBase':    'URL API Grist',
            'cfg.docId':      'Identifiant du document',
            'cfg.tableId':    'Identifiant de la table',
            'cfg.geomCol':    'Colonne géométrie',
            'cfg.accTarget':  'Précision cible (m)',
            'cfg.token':      'Jeton d’accès (scopé document)',
            'cfg.save':       'Enregistrer la configuration',
            'cfg.reload':     'Recharger le formulaire',
            'cfg.paste':      'Coller une URL Grist',
            'cfg.pastehint':  'Remplit le serveur et le document, puis liste les tables.',
            'cfg.tablesload': 'Lister les tables',
            'cfg.tablesloaderr':'Tables introuvables :',
            'cfg.reloaded':   'Formulaire rechargé :',
            'cfg.fields':     'champs',
            'cfg.reloaderr':  'Échec du rechargement :',
            'mode.point':     'Points',
            'mode.line':      'Ligne',
            'mode.polygon':   'Polygone',
            'mode.label':     'Type de géométrie',
            'capture.min.line':'Au moins 2 sommets pour fermer la ligne.',
            'capture.min.point':'Ajoutez au moins un point.',
            'capture.stop':   'Arrêter le GPS',
            'capture.vertex': 'Ajouter un sommet',
            'capture.recenter':'Recentrer sur ma position',
            'capture.nogate': 'Signal faible — point au mieux disponible.',
            'capture.accwarn':'Précision insuffisante — enregistrer ce point quand même ?',
            'capture.undo':   'Supprimer le dernier sommet',
            'capture.min':    'Au moins 3 sommets pour fermer la zone.',
            'capture.done':   'Zone fermée. Saisir les attributs.',
            'form.save':      'Enregistrer la zone',
            'form.title':     'Attributs',
            'form.choose':    'Choisissez une valeur',
            'photo.label':    'Photos',
            'photo.remove':   'Retirer la photo',
            'queue.empty':    'Aucune zone enregistrée.',
            'queue.purge':    'Vider la liste',
            'queue.purgeconfirm':'Supprimer toutes les zones locales, y compris celles non transmises ? Action irréversible.',
            'queue.sync':     'Synchroniser',
            'queue.pending':  'en attente',
            'queue.synced':   'transmise',
            'queue.error':    'erreur',
            'tbl.date':       'Date',
            'tbl.status':     'État',
            'tbl.attrs':      'Attributs',
            'tbl.zoom':       'Zoomer sur la zone',
            'tbl.delete':     'Supprimer',
            'tbl.count':      'zones',
            'queue.offline':  'Hors ligne — la zone sera transmise au retour du réseau.',
            'sync.running':   'Transmission en cours…',
            'sync.ok':        'Transmission terminée.',
            'capture.abort':  'Abandonner la capture et perdre les points relevés ?',
            'form.saved':     'Zone enregistrée.',
            'tbl.errshow':    'Voir l’erreur',
            'err.geo':        'Géolocalisation indisponible sur cet appareil.',
            'err.schema':     'Impossible de charger le formulaire depuis Grist.'
        },
        en: {
            'title':          'Field collection',
            'btn.aria':       'Field collection',
            'cfg.title':      'Grist configuration',
            'cfg.btn':        'Configuration',
            'cfg.apiBase':    'Grist API URL',
            'cfg.docId':      'Document id',
            'cfg.tableId':    'Table id',
            'cfg.geomCol':    'Geometry column',
            'cfg.accTarget':  'Target accuracy (m)',
            'cfg.token':      'Access token (document-scoped)',
            'cfg.save':       'Save configuration',
            'cfg.reload':     'Reload form',
            'cfg.paste':      'Paste a Grist URL',
            'cfg.pastehint':  'Fills server and document, then lists tables.',
            'cfg.tablesload': 'List tables',
            'cfg.tablesloaderr':'Tables not found:',
            'cfg.reloaded':   'Form reloaded:',
            'cfg.fields':     'fields',
            'cfg.reloaderr':  'Reload failed:',
            'mode.point':     'Points',
            'mode.line':      'Line',
            'mode.polygon':   'Polygon',
            'mode.label':     'Geometry type',
            'capture.min.line':'At least 2 vertices to close the line.',
            'capture.min.point':'Add at least one point.',
            'capture.stop':   'Stop GPS',
            'capture.vertex': 'Add vertex',
            'capture.recenter':'Recenter on my position',
            'capture.nogate': 'Weak signal — best available point used.',
            'capture.accwarn':'Accuracy below target — record this point anyway?',
            'capture.undo':   'Remove last vertex',
            'capture.min':    'At least 3 vertices to close the zone.',
            'capture.done':   'Zone closed. Fill in attributes.',
            'form.save':      'Save zone',
            'form.title':     'Attributes',
            'form.choose':    'Choose a value',
            'photo.label':    'Photos',
            'photo.remove':   'Remove photo',
            'queue.empty':    'No saved zone.',
            'queue.purge':    'Clear list',
            'queue.purgeconfirm':'Delete all local zones, including untransmitted ones? This cannot be undone.',
            'queue.sync':     'Sync',
            'queue.pending':  'pending',
            'queue.synced':   'transmitted',
            'queue.error':    'error',
            'tbl.date':       'Date',
            'tbl.status':     'Status',
            'tbl.attrs':      'Attributes',
            'tbl.zoom':       'Zoom to zone',
            'tbl.delete':     'Delete',
            'tbl.count':      'zones',
            'queue.offline':  'Offline — the zone will be sent when the network returns.',
            'sync.running':   'Transmitting…',
            'sync.ok':        'Transmission complete.',
            'capture.abort':  'Abandon capture and lose the captured points?',
            'form.saved':     'Zone saved.',
            'tbl.errshow':    'Show the error',
            'err.geo':        'Geolocation unavailable on this device.',
            'err.schema':     'Could not load the form from Grist.'
        },
        es: {
            'title':          'Recogida de campo',
            'btn.aria':       'Recogida de campo',
            'cfg.title':      'Configuración Grist',
            'cfg.btn':        'Configuración',
            'cfg.apiBase':    'URL API Grist',
            'cfg.docId':      'Identificador del documento',
            'cfg.tableId':    'Identificador de la tabla',
            'cfg.geomCol':    'Columna de geometría',
            'cfg.accTarget':  'Precisión objetivo (m)',
            'cfg.token':      'Token de acceso (ámbito documento)',
            'cfg.save':       'Guardar configuración',
            'cfg.reload':     'Recargar el formulario',
            'cfg.paste':      'Pegar una URL de Grist',
            'cfg.pastehint':  'Rellena el servidor y el documento, luego lista las tablas.',
            'cfg.tablesload': 'Listar tablas',
            'cfg.tablesloaderr':'Tablas no encontradas:',
            'cfg.reloaded':   'Formulario recargado:',
            'cfg.fields':     'campos',
            'cfg.reloaderr':  'Error al recargar:',
            'mode.point':     'Puntos',
            'mode.line':      'Línea',
            'mode.polygon':   'Polígono',
            'mode.label':     'Tipo de geometría',
            'capture.min.line':'Al menos 2 vértices para cerrar la línea.',
            'capture.min.point':'Añada al menos un punto.',
            'capture.stop':   'Detener GPS',
            'capture.vertex': 'Añadir vértice',
            'capture.recenter':'Centrar en mi posición',
            'capture.nogate': 'Señal débil — se usa el mejor punto disponible.',
            'capture.accwarn':'Precisión insuficiente — ¿registrar este punto igualmente?',
            'capture.undo':   'Eliminar último vértice',
            'capture.min':    'Al menos 3 vértices para cerrar la zona.',
            'capture.done':   'Zona cerrada. Rellenar atributos.',
            'form.save':      'Guardar zona',
            'form.title':     'Atributos',
            'form.choose':    'Elija un valor',
            'photo.label':    'Fotos',
            'photo.remove':   'Quitar foto',
            'queue.empty':    'Ninguna zona guardada.',
            'queue.purge':    'Vaciar la lista',
            'queue.purgeconfirm':'¿Eliminar todas las zonas locales, incluidas las no transmitidas? Acción irreversible.',
            'queue.sync':     'Sincronizar',
            'queue.pending':  'pendiente',
            'queue.synced':   'transmitida',
            'queue.error':    'error',
            'tbl.date':       'Fecha',
            'tbl.status':     'Estado',
            'tbl.attrs':      'Atributos',
            'tbl.zoom':       'Acercar a la zona',
            'tbl.delete':     'Eliminar',
            'tbl.count':      'zonas',
            'queue.offline':  'Sin conexión — la zona se enviará al volver la red.',
            'sync.running':   'Transmitiendo…',
            'sync.ok':        'Transmisión completada.',
            'capture.abort':  '¿Abandonar la captura y perder los puntos tomados?',
            'form.saved':     'Zona guardada.',
            'tbl.errshow':    'Ver el error',
            'err.geo':        'Geolocalización no disponible en este dispositivo.',
            'err.schema':     'No se pudo cargar el formulario desde Grist.'
        },
        de: {
            'title':          'Felderfassung',
            'btn.aria':       'Felderfassung',
            'cfg.title':      'Grist-Konfiguration',
            'cfg.btn':        'Konfiguration',
            'cfg.apiBase':    'Grist-API-URL',
            'cfg.docId':      'Dokument-ID',
            'cfg.tableId':    'Tabellen-ID',
            'cfg.geomCol':    'Geometriespalte',
            'cfg.accTarget':  'Zielgenauigkeit (m)',
            'cfg.token':      'Zugriffstoken (dokumentbezogen)',
            'cfg.save':       'Konfiguration speichern',
            'cfg.reload':     'Formular neu laden',
            'cfg.paste':      'Grist-URL einfügen',
            'cfg.pastehint':  'Füllt Server und Dokument, listet dann die Tabellen.',
            'cfg.tablesload': 'Tabellen auflisten',
            'cfg.tablesloaderr':'Tabellen nicht gefunden:',
            'cfg.reloaded':   'Formular neu geladen:',
            'cfg.fields':     'Felder',
            'cfg.reloaderr':  'Neuladen fehlgeschlagen:',
            'mode.point':     'Punkte',
            'mode.line':      'Linie',
            'mode.polygon':   'Polygon',
            'mode.label':     'Geometrietyp',
            'capture.min.line':'Mindestens 2 Eckpunkte zum Schließen der Linie.',
            'capture.min.point':'Mindestens einen Punkt hinzufügen.',
            'capture.stop':   'GPS stoppen',
            'capture.vertex': 'Eckpunkt hinzufügen',
            'capture.recenter':'Auf meine Position zentrieren',
            'capture.nogate': 'Schwaches Signal — bester verfügbarer Punkt verwendet.',
            'capture.accwarn':'Genauigkeit unter Ziel — diesen Punkt trotzdem aufnehmen?',
            'capture.undo':   'Letzten Eckpunkt entfernen',
            'capture.min':    'Mindestens 3 Eckpunkte zum Schließen der Zone.',
            'capture.done':   'Zone geschlossen. Attribute ausfüllen.',
            'form.save':      'Zone speichern',
            'form.title':     'Attribute',
            'form.choose':    'Wert auswählen',
            'photo.label':    'Fotos',
            'photo.remove':   'Foto entfernen',
            'queue.empty':    'Keine gespeicherte Zone.',
            'queue.purge':    'Liste leeren',
            'queue.purgeconfirm':'Alle lokalen Zonen löschen, auch nicht übertragene? Nicht umkehrbar.',
            'queue.sync':     'Synchronisieren',
            'queue.pending':  'ausstehend',
            'queue.synced':   'übertragen',
            'queue.error':    'Fehler',
            'tbl.date':       'Datum',
            'tbl.status':     'Status',
            'tbl.attrs':      'Attribute',
            'tbl.zoom':       'Zur Zone zoomen',
            'tbl.delete':     'Löschen',
            'tbl.count':      'Zonen',
            'queue.offline':  'Offline — die Zone wird bei Netzrückkehr gesendet.',
            'sync.running':   'Übertrage…',
            'sync.ok':        'Übertragung abgeschlossen.',
            'capture.abort':  'Erfassung abbrechen und erfasste Punkte verlieren?',
            'form.saved':     'Zone gespeichert.',
            'tbl.errshow':    'Fehler anzeigen',
            'err.geo':        'Standortbestimmung auf diesem Gerät nicht verfügbar.',
            'err.schema':     'Formular konnte nicht aus Grist geladen werden.'
        }
    };
    function lang() {
        var l = (SViewer.state && SViewer.state.lang) || (SViewer.config && SViewer.config.lang) || 'fr';
        return I18N[l] ? l : 'fr';
    }
    function t(key) {
        var L = I18N[lang()];
        return (L && L[key]) || I18N.fr[key] || key;
    }

    // --- Config (localStorage) -----------------------------------------------
    function loadCfg() {
        var empty = { apiBase: '', docId: '', tableId: '', token: '', geomCol: 'geometry', accTarget: ACC_GATE };
        try {
            var c = JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
            // Target accuracy (m): a fix worse than this triggers a pre-commit warning.
            var acc = parseFloat(c.accTarget);
            return {
                apiBase:  c.apiBase  || '',
                docId:    c.docId    || '',
                tableId:  c.tableId  || '',
                token:    c.token    || '',
                geomCol:  c.geomCol  || 'geometry',
                accTarget: (isFinite(acc) && acc > 0) ? acc : ACC_GATE
            };
        } catch (e) {
            return empty;
        }
    }
    function saveCfg() {
        try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* quota — ignore */ }
    }
    // Token is optional: a public Grist doc accepts anonymous read/write.
    // Completeness requires only the endpoint coordinates.
    function cfgComplete() {
        return !!(cfg.apiBase && cfg.docId && cfg.tableId);
    }
    // Validate and normalise an API base — HTTPS origin only, no path/query injected.
    function safeApiBase(input) {
        try {
            var u = new URL(input);
            if (u.protocol !== 'https:') { return ''; }
            return u.origin;
        } catch (e) { return ''; }
    }

    // Parse a Grist URL into { apiBase, docId }. The browser URL's last path
    // segment is a PAGE slug (e.g. /o/docs/{docId}/grist-widget/p/6), NOT the table
    // id — so we never extract a table id from a URL. The table is chosen from a
    // dropdown filled via GET /tables once the doc is known.
    // Handles:
    //   https://host/o/{org}/{docId}/{page}/p/N
    //   https://host/{docId}/...
    //   https://host/doc/{docId}
    //   https://host/api/docs/{docId}/...
    // Grist doc ids are long [A-Za-z0-9_-] tokens (≥10 chars).
    function parseGristUrl(input) {
        var out = { apiBase: '', docId: '' };
        var u;
        try { u = new URL(String(input).trim()); } catch (e) { return out; }
        if (u.protocol !== 'https:') { return out; }
        out.apiBase = u.origin;
        var segs = u.pathname.split('/').filter(Boolean);
        // API form: /api/docs/{docId}/...
        if (segs[0] === 'api' && segs.indexOf('docs') !== -1) {
            out.docId = segs[segs.indexOf('docs') + 1] || '';
            return out;
        }
        // Browser form: first long token = docId. /o/{org} and /ws/{id} consume a value.
        for (var i = 0; i < segs.length; i++) {
            if (segs[i] === 'o' || segs[i] === 'ws') { i++; continue; }
            if (segs[i] === 'doc') { continue; }            // /doc/{docId} — keep the value
            if (/^[A-Za-z0-9_-]{10,}$/.test(segs[i])) { out.docId = segs[i]; break; }
        }
        return out;
    }

    // GET /tables → array of table ids for the current doc.
    async function fetchTables() {
        var res = await fetch(gristUrl0('/tables'), { headers: authHeaders() });
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        var data = await res.json();
        return (data.tables || []).map(function (t) { return t.id; });
    }
    // Doc-level Grist URL (no table) for endpoints like /tables.
    function gristUrl0(suffix) {
        return safeApiBase(cfg.apiBase) + '/api/docs/' + encodeURIComponent(cfg.docId) + suffix;
    }
    // GET /tables/{tableId}/columns → all column ids (unfiltered — includes the
    // geometry column, since this feeds the geometry-column picker).
    async function fetchColumnIds(tableId) {
        var url = safeApiBase(cfg.apiBase) + '/api/docs/' + encodeURIComponent(cfg.docId) +
                  '/tables/' + encodeURIComponent(tableId) + '/columns';
        var res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        var data = await res.json();
        return (data.columns || []).map(function (c) { return c.id; });
    }
    // Guess the geometry column from a list of ids (name heuristic, in order).
    function guessGeomCol(ids) {
        var cands = ['geojson', 'geometry', 'geom', 'geo', 'shape', 'wkt', 'wkb_geometry'];
        var lower = ids.map(function (i) { return i.toLowerCase(); });
        for (var k = 0; k < cands.length; k++) {
            var idx = lower.indexOf(cands[k]);
            if (idx !== -1) { return ids[idx]; }
        }
        return '';
    }

    // --- IndexedDB queue -----------------------------------------------------
    function idbOpen() {
        return new Promise(function (resolve, reject) {
            var req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = function () {
                var db = req.result;
                if (!db.objectStoreNames.contains(DB_STORE)) {
                    db.createObjectStore(DB_STORE, { keyPath: 'uuid' });
                }
            };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror   = function () { reject(req.error); };
        });
    }
    function idbTx(mode, fn) {
        return idbOpen().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(DB_STORE, mode);
                var store = tx.objectStore(DB_STORE);
                var out = fn(store);
                tx.oncomplete = function () { resolve(out); };
                tx.onerror    = function () { reject(tx.error); };
            });
        });
    }
    function idbPut(rec)  { return idbTx('readwrite', function (s) { s.put(rec); return rec; }); }
    function idbDel(uuid) { return idbTx('readwrite', function (s) { s.delete(uuid); }); }
    function idbClear()   { return idbTx('readwrite', function (s) { s.clear(); }); }
    function idbAll()     {
        return idbTx('readonly', function (s) {
            var acc = [];
            s.openCursor().onsuccess = function (e) {
                var c = e.target.result;
                if (c) { acc.push(c.value); c.continue(); }
            };
            return acc;
        });
    }

    // Storage model: always-cache. Every zone is written to IndexedDB before any
    // network attempt (invariant #1 — crash-safe). Synced records are kept so the
    // agent can review today's work offline, but bounded: once synced records
    // exceed MAX_SYNCED, the oldest are evicted. Pending/error are never evicted.
    async function evictSynced() {
        var all = await idbAll();
        var synced = all.filter(function (r) { return r.status === 'synced'; })
                        .sort(function (a, b) { return (a.syncedAt || 0) - (b.syncedAt || 0); });
        var over = synced.length - MAX_SYNCED;
        for (var i = 0; i < over; i++) { await idbDel(synced[i].uuid); }
    }

    function uuid() {
        if (crypto && crypto.randomUUID) { return crypto.randomUUID(); }
        return 'f-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    }

    // --- Grist schema + write ------------------------------------------------
    function gristUrl(suffix) {
        var base = safeApiBase(cfg.apiBase);
        return base + '/api/docs/' + encodeURIComponent(cfg.docId) +
               '/tables/' + encodeURIComponent(cfg.tableId) + suffix;
    }
    function authHeaders(extra) {
        // X-Requested-With is required by Grist for anonymous writes (CSRF guard)
        // and is harmless when a token is present.
        var h = { 'X-Requested-With': 'XMLHttpRequest' };
        if (cfg.token) { h['Authorization'] = 'Bearer ' + cfg.token; } // omit on public doc
        if (extra) { Object.keys(extra).forEach(function (k) { h[k] = extra[k]; }); }
        return h;
    }
    // GET /columns → [{ id, type, label }] excluding the geometry column.
    // Persisted to localStorage keyed by doc+table so the form renders offline.
    function schemaStorageKey() {
        return SCHEMA_KEY + '.' + cfg.docId + '.' + cfg.tableId;
    }
    function loadCachedSchema() {
        try {
            var raw = localStorage.getItem(schemaStorageKey());
            if (!raw) { return null; }
            var saved = JSON.parse(raw);
            schema    = saved.schema;
            attachCol = saved.attachCol || null;
            return schema;
        } catch (e) { return null; }
    }
    function saveCachedSchema() {
        try {
            localStorage.setItem(schemaStorageKey(),
                JSON.stringify({ schema: schema, attachCol: attachCol }));
        } catch (e) { /* quota — ignore */ }
    }
    async function fetchSchema() {
        if (schema) { return schema; }
        try {
            var res = await fetch(gristUrl('/columns'), { headers: authHeaders() });
            if (!res.ok) { throw new Error('HTTP ' + res.status); }
            var data = await res.json();
            // First Attachments column = photo target (excluded from the normal form).
            attachCol = null;
            (data.columns || []).some(function (c) {
                if (c.fields && baseType(c.fields.type) === 'Attachments' && c.id !== cfg.geomCol) {
                    attachCol = c.id; return true;
                }
                return false;
            });
            var cols = (data.columns || []).map(function (c) {
                var f = c.fields || {};
                // Choice / ChoiceList store their options in widgetOptions JSON.
                var choices = null;
                if (f.widgetOptions) {
                    try { choices = (JSON.parse(f.widgetOptions) || {}).choices || null; } catch (e) { /* ignore */ }
                }
                // Read-only only if it's a real computed formula (isFormula AND non-empty
                // formula). A fresh/empty column is isFormula:true but formula:'' — still
                // writable, so it must NOT be excluded.
                var computed = !!f.isFormula && !!(f.formula && f.formula.trim());
                return { id: c.id, type: f.type || 'Text', label: f.label || c.id,
                         computed: computed, choices: choices };
            }).filter(function (c) {
                // Skip geometry, internal sort, computed columns, and (v1) attachments.
                return c.id !== cfg.geomCol && c.id !== 'manualSort' &&
                       !c.computed && baseType(c.type) !== 'Attachments';
            });
            schema = cols;
            saveCachedSchema();
            return schema;
        } catch (e) {
            // Network failed — try cached schema so offline capture still works.
            if (loadCachedSchema()) { return schema; }
            throw e;
        }
    }
    // Upload one photo Blob to Grist; returns its attachment id.
    // POST /api/docs/{doc}/attachments, multipart field "upload".
    async function uploadAttachment(blob, name) {
        var base = safeApiBase(cfg.apiBase);
        var url = base + '/api/docs/' + encodeURIComponent(cfg.docId) + '/attachments';
        var fd = new FormData();
        fd.append('upload', blob, name || 'photo.jpg');
        // Do not set Content-Type — the browser sets the multipart boundary.
        var res = await fetch(url, { method: 'POST', headers: authHeaders(), body: fd });
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        var ids = await res.json();          // [id]
        return Array.isArray(ids) ? ids[0] : null;
    }

    // POST a single queued record to Grist. Uploads any photos first (so the
    // record can reference them), then creates the row. Returns the new row id.
    async function postRecord(rec) {
        var fields = {};
        Object.keys(rec.fields).forEach(function (k) { fields[k] = rec.fields[k]; });
        fields[cfg.geomCol] = JSON.stringify(rec.geometry); // GeoJSON string, EPSG:4326

        // Photos → upload each, collect ids, reference as a Grist L-list.
        if (attachCol && rec.photos && rec.photos.length) {
            var ids = [];
            for (var i = 0; i < rec.photos.length; i++) {
                var ph = rec.photos[i];
                var id = await uploadAttachment(ph.blob || ph, ph.name); // throws → record stays pending
                if (id != null) { ids.push(id); }
            }
            if (ids.length) { fields[attachCol] = ['L'].concat(ids); }
        }

        var res = await fetch(gristUrl('/records'), {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ records: [{ fields: fields }] })
        });
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        var data = await res.json();
        // Grist returns { records: [{ id: N }] } — surface the new row id.
        return (data.records && data.records[0] && data.records[0].id) || null;
    }

    // --- GPS capture ---------------------------------------------------------
    function startWatch(onUpdate) {
        if (!navigator.geolocation) { return false; }
        var onPos = function (pos) {
            lastFix = { lon: pos.coords.longitude, lat: pos.coords.latitude,
                        accuracy: pos.coords.accuracy };
            if (sampling) { sampleBuf.push(lastFix); }        // collect for vertex averaging
            updateGpsLayer();                                 // live dot + accuracy circle
            if (!firstFix) { firstFix = true; zoomToFix(); }  // auto-zoom on first fix
            onUpdate();
        };
        // Immediate single read for a fast first fix, then continuous tracking.
        navigator.geolocation.getCurrentPosition(onPos, function () {}, { enableHighAccuracy: true });
        watchId = navigator.geolocation.watchPosition(
            onPos,
            function () { lastFix = null; onUpdate(); },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
        return true;
    }
    // Own GPS layer: position dot + accuracy circle (meter radius, EPSG:3857).
    // Independent of sViewer's built-in locate tool — one watcher, no conflict.
    function ensureGpsLayer() {
        if (gpsLayer || !mapRef) { return; }
        gpsAccFeat = new ol.Feature();
        gpsAccFeat.setStyle(new ol.style.Style({
            fill:   new ol.style.Fill({ color: 'rgba(37, 99, 235, 0.12)' }),
            stroke: new ol.style.Stroke({ color: 'rgba(37, 99, 235, 0.6)', width: 1.5 })
        }));
        gpsDotFeat = new ol.Feature();
        gpsDotFeat.setStyle(new ol.style.Style({
            image: new ol.style.Circle({
                radius: 7,
                fill:   new ol.style.Fill({ color: 'rgba(37, 99, 235, 1)' }),
                stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
            })
        }));
        gpsLayer = new ol.layer.Vector({
            source: new ol.source.Vector({ features: [gpsAccFeat, gpsDotFeat] }),
            zIndex: 999
        });
        mapRef.addLayer(gpsLayer);
    }
    function updateGpsLayer() {
        if (!lastFix) { return; }
        ensureGpsLayer();
        var p = ol.proj.fromLonLat([lastFix.lon, lastFix.lat]);
        gpsDotFeat.setGeometry(new ol.geom.Point(p));
        gpsAccFeat.setGeometry(lastFix.accuracy > 0 ? new ol.geom.Circle(p, lastFix.accuracy) : null);
    }
    function removeGpsLayer() {
        if (gpsLayer && mapRef) { mapRef.removeLayer(gpsLayer); }
        gpsLayer = null; gpsDotFeat = null; gpsAccFeat = null;
    }

    // Pan/zoom the map to the current fix (called once per capture, on first fix).
    function zoomToFix() {
        if (!mapRef || !lastFix) { return; }
        var view = mapRef.getView();
        view.animate({
            center: ol.proj.fromLonLat([lastFix.lon, lastFix.lat]),
            zoom: Math.max(view.getZoom(), 18),
            duration: 400
        });
    }
    // Recenter on the current fix without changing zoom (user "find me" button).
    function recenter() {
        if (!mapRef || !lastFix) { return; }
        mapRef.getView().animate({ center: ol.proj.fromLonLat([lastFix.lon, lastFix.lat]), duration: 300 });
    }
    function stopWatch() {
        if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
        sampling = false; sampleBuf = [];
        removeGpsLayer();
    }
    // Capture one vertex by averaging GPS fixes over AVG_MS while the agent stands
    // still at a corner. Fixes worse than the target accuracy (cfg.accTarget) are
    // rejected; the rest are combined by inverse-variance weighting (weight =
    // 1/accuracy²) so better fixes dominate. Falls back to the single best fix if
    // none pass the gate.
    // onProgress(remainingMs), onDone(committed:boolean, gated:boolean).
    function captureVertex(onProgress, onDone) {
        if (!lastFix) { onDone(false, false); return; }
        sampling = true;
        sampleBuf = lastFix ? [lastFix] : [];
        var start = Date.now();
        var tick = setInterval(function () {
            var left = AVG_MS - (Date.now() - start);
            if (left > 0) { if (onProgress) { onProgress(left); } return; }
            clearInterval(tick);
            sampling = false;
            var pts = sampleBuf.filter(function (f) { return f.accuracy <= cfg.accTarget; });
            var gated = pts.length > 0;
            if (!gated) {
                // No fix passed the gate — keep the single best (lowest accuracy).
                pts = sampleBuf.slice().sort(function (a, b) { return a.accuracy - b.accuracy; }).slice(0, 1);
            }
            var sw = 0, slon = 0, slat = 0, sacc = 0;
            pts.forEach(function (f) {
                var w = 1 / Math.max(f.accuracy * f.accuracy, 1); // 1/acc², guard /0
                sw += w; slon += f.lon * w; slat += f.lat * w; sacc += f.accuracy;
            });
            if (sw === 0) { onDone(false, gated); return; }
            vertices.push([slon / sw, slat / sw]);
            vertexMeta.push({ accuracy: sacc / pts.length, gated: gated }); // parallel to vertices
            sampleBuf = [];
            onDone(true, gated);
        }, 200);
    }

    // Minimum vertices required to finalise the current geometry mode.
    function minVertices() {
        return geomMode === 'MultiPoint' ? 1 : geomMode === 'LineString' ? 2 : 3;
    }
    function canFinalize() { return vertices.length >= minVertices(); }
    // Hint shown when not enough vertices yet, per mode.
    function minHint() {
        return geomMode === 'MultiPoint' ? t('capture.min.point')
             : geomMode === 'LineString' ? t('capture.min.line') : t('capture.min');
    }

    // Build a GeoJSON geometry (EPSG:4326) from captured vertices, per mode.
    function buildGeometry() {
        if (!canFinalize()) { return null; }
        if (geomMode === 'MultiPoint') {
            return { type: 'MultiPoint', coordinates: vertices.slice() };
        }
        if (geomMode === 'LineString') {
            return { type: 'LineString', coordinates: vertices.slice() };
        }
        var ring = vertices.map(function (v) { return [v[0], v[1]]; });
        ring.push([ring[0][0], ring[0][1]]); // close the ring
        return { type: 'Polygon', coordinates: [ring] };
    }

    // --- Display zones on the map --------------------------------------------
    // Shows stored zones (from IndexedDB) plus, during capture, a live preview of
    // the polygon being walked: the captured vertices as points and, once ≥3,
    // the forming ring. Lets the field agent see the shape take form on the map.
    async function refreshMapLayer() {
        var all = await idbAll();
        var feats = all.map(function (rec) {
            return { type: 'Feature', geometry: rec.geometry,
                     properties: { _status: rec.status } };
        });
        // Live capture preview — connector geometry depends on the active mode.
        if (watchId !== null) {
            if (geomMode === 'Polygon' && vertices.length >= 3) {
                var ring = vertices.map(function (v) { return [v[0], v[1]]; });
                ring.push([ring[0][0], ring[0][1]]);
                feats.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] },
                             properties: { _status: 'draft' } });
            } else if (geomMode !== 'MultiPoint' && vertices.length >= 2) {
                feats.push({ type: 'Feature',
                             geometry: { type: 'LineString', coordinates: vertices.slice() },
                             properties: { _status: 'draft' } });
            }
            vertices.forEach(function (v, i) {
                // Weak-signal vertices (gate fallback) are tinted red so the agent can
                // spot and re-measure them. _sv_color/_sv_radius are honoured by core.
                var weak = vertexMeta[i] && vertexMeta[i].gated === false;
                feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [v[0], v[1]] },
                             properties: { _status: 'vertex', _label: String(i + 1),
                                           _sv_color: weak ? '#dc3545' : '#2563eb' } });
            });
        }
        SViewer.loadFeatures({ type: 'FeatureCollection', features: feats });
    }

    // --- Sync ----------------------------------------------------------------
    async function syncQueue(render) {
        if (!cfgComplete() || !navigator.onLine) { return; }
        var all = await idbAll();
        var pending = all.filter(function (r) { return r.status === 'pending' || r.status === 'error'; });
        for (var i = 0; i < pending.length; i++) {
            var rec = pending[i];
            try {
                rec.gristId = await postRecord(rec);
                rec.status = 'synced';
                rec.syncedAt = Date.now();
                rec.error = null;
            } catch (e) {
                rec.status = 'error';
                rec.error = String(e.message || e);
            }
            await idbPut(rec);
            if (render) { render(); }
        }
        await evictSynced();
    }

    // --- HTML escaping -------------------------------------------------------
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // --- UI: render the panel ------------------------------------------------
    // v1 panel uses a single rebuildable HTML body; handlers bound after each render.
    var view = 'idle'; // 'idle' (mode buttons + queue) | 'form' | 'config'

    function render() {
        var html;
        if (view === 'config' || !cfgComplete()) {
            html = renderConfig();
        } else if (view === 'form') {
            html = renderForm();
        } else {
            html = renderIdle();
        }
        SViewer.panel.update(PANEL, html);
        bind();
    }

    function renderConfig() {
        return '<div class="sv-field" style="padding:.5rem">' +
            '<h3 style="font-size:1rem">' + esc(t('cfg.title')) + '</h3>' +
            field('fld-paste', t('cfg.paste'), '', 'url', 'https://grist…/{doc}/{table}') +
            '<div style="font-size:.78rem;color:#555;margin:-.2rem 0 .4rem">' + esc(t('cfg.pastehint')) + '</div>' +
            field('fld-apiBase', t('cfg.apiBase'), cfg.apiBase, 'url', 'https://grist.example.org') +
            field('fld-docId',   t('cfg.docId'),   cfg.docId,   'text') +
            tableField() +
            geomField() +
            field('fld-accTarget', t('cfg.accTarget'), cfg.accTarget, 'number') +
            field('fld-token',   t('cfg.token'),   cfg.token,   'password') +
            '<div style="display:flex;gap:.35rem;margin-top:.5rem">' +
                '<button type="button" id="fld-cfg-save" class="btn btn-primary btn-sm">' +
                    icon('check2') + ' ' + esc(t('cfg.save')) + '</button>' +
                '<button type="button" id="fld-cfg-reload" class="btn btn-secondary btn-sm">' +
                    icon('arrow-repeat') + ' ' + esc(t('cfg.reload')) + '</button>' +
            '</div>' +
            '<div id="fld-cfg-msg" role="status" aria-live="polite" style="font-size:.8rem;color:#555;margin-top:.3rem"></div>' +
        '</div>';
    }
    function field(id, label, val, type, ph) {
        return '<div style="margin:.35rem 0">' +
            '<label for="' + id + '" style="display:block;font-size:.85rem">' + esc(label) + '</label>' +
            '<input id="' + id + '" type="' + type + '" class="form-control form-control-sm"' +
            ' value="' + esc(val) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') +
            (type === 'password' ? ' autocomplete="off"' : '') + '>' +
        '</div>';
    }

    // Table picker: a <select> beside a button that lists the doc's tables (GET
    // /tables). Starts with the saved value as the only option so the config holds
    // even before the list is loaded.
    function tableField() {
        var cur = cfg.tableId;
        var opt = cur ? '<option value="' + esc(cur) + '" selected>' + esc(cur) + '</option>'
                      : '<option value=""></option>';
        return '<div style="margin:.35rem 0">' +
            '<label for="fld-tableId" style="display:block;font-size:.85rem">' + esc(t('cfg.tableId')) + '</label>' +
            '<div style="display:flex;gap:.35rem">' +
                '<select id="fld-tableId" class="form-select form-select-sm" style="flex:1">' + opt + '</select>' +
                '<button type="button" id="fld-tables-load" class="btn btn-secondary btn-sm" ' +
                    'aria-label="' + esc(t('cfg.tablesload')) + '" title="' + esc(t('cfg.tablesload')) + '">' +
                    icon('arrow-repeat') + '</button>' +
            '</div></div>';
    }
    // Fill the table <select> with ids, preserving the current selection if present.
    function fillTableOptions(ids) {
        var sel = document.getElementById('fld-tableId');
        if (!sel) { return; }
        var cur = sel.value || cfg.tableId;
        sel.innerHTML = '';
        if (ids.indexOf(cur) === -1 && cur) { ids = [cur].concat(ids); }
        ids.forEach(function (id) {
            var o = document.createElement('option');
            o.value = id; o.textContent = id;
            if (id === cur) { o.selected = true; }
            sel.appendChild(o);
        });
    }

    // Geometry-column picker: a <select> of the selected table's columns. Filled
    // from GET /columns; starts with the saved value so the config holds before load.
    function geomField() {
        var cur = cfg.geomCol;
        var opt = cur ? '<option value="' + esc(cur) + '" selected>' + esc(cur) + '</option>'
                      : '<option value=""></option>';
        return '<div style="margin:.35rem 0">' +
            '<label for="fld-geomCol" style="display:block;font-size:.85rem">' + esc(t('cfg.geomCol')) + '</label>' +
            '<select id="fld-geomCol" class="form-select form-select-sm">' + opt + '</select>' +
        '</div>';
    }
    // Fill the geometry-column <select>. Keeps the current value if present;
    // otherwise pre-selects a name-guessed geometry column.
    function fillGeomOptions(ids) {
        var sel = document.getElementById('fld-geomCol');
        if (!sel) { return; }
        var cur = sel.value || cfg.geomCol;
        if (!cur || ids.indexOf(cur) === -1) { cur = guessGeomCol(ids) || cur; }
        sel.innerHTML = '';
        if (cur && ids.indexOf(cur) === -1) { ids = [cur].concat(ids); }
        ids.forEach(function (id) {
            var o = document.createElement('option');
            o.value = id; o.textContent = id;
            if (id === cur) { o.selected = true; }
            sel.appendChild(o);
        });
    }
    // Fetch the selected table's columns and fill the geometry picker.
    async function loadGeomCols() {
        cfg.apiBase = safeApiBase(val('fld-apiBase'));
        cfg.docId   = val('fld-docId').trim();
        cfg.token   = val('fld-token');
        var tableId = val('fld-tableId').trim();
        if (!cfg.apiBase || !cfg.docId || !tableId) { return; }
        try {
            var ids = await fetchColumnIds(tableId);
            fillGeomOptions(ids);
        } catch (e) { /* leave the saved value as-is */ }
    }

    // Panel "idle" view: not capturing. Three mode buttons (each starts a capture)
    // + the features table. Actual capture runs in the floating bar (map visible).
    function renderIdle() {
        // Each button starts a capture directly in its geometry mode — the mode
        // choice IS the start action (no separate Start button).
        var modeBtn = function (mode, label, ic) {
            return '<button type="button" class="btn btn-secondary" data-mode="' + mode +
                '" style="flex:1;padding:.55rem .3rem;font-size:.95rem;display:flex;flex-direction:column;align-items:center;gap:.2rem">' +
                ic + '<span>' + esc(label) + '</span></button>';
        };
        return '<div class="sv-field" style="padding:.5rem">' +
            '<div role="status" aria-live="polite" id="fld-status" style="font-size:.85rem;color:#333;min-height:1.2em"></div>' +
            '<div role="group" aria-label="' + esc(t('mode.label')) + '" style="display:flex;gap:.35rem;margin:.3rem 0">' +
                modeBtn('MultiPoint', t('mode.point'), icon('geo-alt')) +
                modeBtn('LineString', t('mode.line'), icon('share')) +
                modeBtn('Polygon', t('mode.polygon'), icon('pentagon')) +
            '</div>' +
            '<hr>' + renderQueueSummary() +
        '</div>';
    }

    // Bare Grist type, dropping any ":timezone" suffix on DateTime.
    function baseType(type) { return String(type || 'Text').split(':')[0]; }

    // Safe DOM id from a Grist column id. Grist already constrains ids to
    // [A-Za-z0-9_], but strip anything else as defence-in-depth so a column id can
    // never break out of an id=/for= attribute. The same transform is used when
    // building and when reading the control, so they always match.
    function attrId(colId) { return 'fld-attr-' + String(colId).replace(/[^A-Za-z0-9_-]/g, '_'); }

    // Build a form control matched to a column's Grist type.
    function fieldForCol(c) {
        var id = attrId(c.id);
        var bt = baseType(c.type);
        var lbl = '<label for="' + id + '" style="display:block;font-size:.85rem">' + esc(c.label) + '</label>';
        var wrap = function (inner) { return '<div style="margin:.35rem 0">' + lbl + inner + '</div>'; };

        if (bt === 'Bool') {
            // checkbox — label sits beside it, so no block label above
            return '<div style="margin:.35rem 0;display:flex;align-items:center;gap:.4rem">' +
                '<input id="' + id + '" type="checkbox" class="form-check-input" style="margin:0">' +
                '<label for="' + id + '" style="font-size:.85rem;margin:0">' + esc(c.label) + '</label></div>';
        }
        if ((bt === 'Choice' || bt === 'ChoiceList') && c.choices && c.choices.length) {
            var multi = bt === 'ChoiceList' ? ' multiple' : '';
            // Single Choice: a disabled, pre-selected placeholder ("choose a value")
            // with empty value — readCol skips empty, so it stays optional.
            var ph = (bt === 'Choice')
                ? '<option value="" disabled selected>' + esc(t('form.choose')) + '</option>' : '';
            var opts = ph + c.choices.map(function (o) {
                return '<option value="' + esc(o) + '">' + esc(o) + '</option>';
            }).join('');
            return wrap('<select id="' + id + '" class="form-select form-select-sm"' + multi + '>' + opts + '</select>');
        }
        var inputType = bt === 'Numeric' || bt === 'Int' ? 'number'
                      : bt === 'Date' ? 'date'
                      : bt === 'DateTime' ? 'datetime-local' : 'text';
        var step = bt === 'Numeric' ? ' step="any"' : '';
        return wrap('<input id="' + id + '" type="' + inputType + '" class="form-control form-control-sm"' + step + '>');
    }

    function renderForm() {
        var rows = (schema || []).map(fieldForCol).join('');
        var photoBlock = attachCol ? (
            '<div style="margin:.5rem 0">' +
                '<label for="fld-photo-input" style="display:block;font-size:.85rem">' + esc(t('photo.label')) + '</label>' +
                '<input id="fld-photo-input" type="file" accept="image/*" capture="environment" multiple ' +
                    'class="form-control form-control-sm">' +
                '<div id="fld-photo-thumbs" style="display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.3rem"></div>' +
            '</div>'
        ) : '';
        return '<div class="sv-field" style="padding:.5rem">' +
            '<h3 style="font-size:1rem">' + esc(t('form.title')) + '</h3>' +
            (rows || '<p style="font-size:.85rem;color:#555">—</p>') +
            photoBlock +
            '<button type="button" id="fld-form-save" class="btn btn-primary btn-sm" style="margin-top:.5rem">' +
                icon('check2') + ' ' + esc(t('form.save')) + '</button>' +
        '</div>';
    }

    // Downscale an image File/Blob client-side before storage and upload: fit to
    // PHOTO_MAX on the longest edge, re-encode JPEG at PHOTO_Q. Auto-rotates from
    // EXIF and drops metadata (smaller, and removes embedded GPS — we store our own
    // geometry). Falls back to the original blob if the browser can't process it.
    async function downscaleImage(file) {
        try {
            var bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
            var scale = Math.min(1, PHOTO_MAX / Math.max(bmp.width, bmp.height));
            var w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
            var canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
            bmp.close && bmp.close();
            var blob = await new Promise(function (resolve) {
                canvas.toBlob(resolve, 'image/jpeg', PHOTO_Q);
            });
            return blob || file;
        } catch (e) {
            return file; // unsupported format / no createImageBitmap — keep original
        }
    }

    // Drop the form's picked photos and revoke their object URLs.
    function clearFormPhotos() {
        formPhotos.forEach(function (p) { try { URL.revokeObjectURL(p.url); } catch (e) { /* */ } });
        formPhotos = [];
    }

    // Render thumbnails for photos picked in the current form.
    function renderThumbs() {
        var host = document.getElementById('fld-photo-thumbs');
        if (!host) { return; }
        host.textContent = '';
        formPhotos.forEach(function (p, idx) {
            var wrap = document.createElement('div');
            wrap.style.cssText = 'position:relative;width:56px;height:56px';
            var img = document.createElement('img');
            img.src = p.url;
            img.alt = p.name || ('photo ' + (idx + 1));
            img.style.cssText = 'width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid #ccc';
            var del = document.createElement('button');
            del.type = 'button';
            del.className = 'btn btn-danger btn-sm';
            del.setAttribute('aria-label', t('photo.remove'));
            del.title = t('photo.remove');
            del.style.cssText = 'position:absolute;top:-6px;right:-6px;padding:0;width:20px;height:20px;line-height:1;border-radius:50%';
            del.textContent = '×';
            del.addEventListener('click', function () {
                URL.revokeObjectURL(formPhotos[idx].url);
                formPhotos.splice(idx, 1);
                renderThumbs();
            });
            wrap.appendChild(img);
            wrap.appendChild(del);
            host.appendChild(wrap);
        });
    }

    function renderQueueSummary() {
        return '<div id="fld-queue">' +
            '<div style="display:flex;gap:.35rem;align-items:center;margin-bottom:.4rem">' +
                '<button type="button" id="fld-sync" class="btn btn-primary btn-sm" ' +
                    'style="display:inline-flex;align-items:center" aria-label="' + esc(t('queue.sync')) +
                    '" title="' + esc(t('queue.sync')) + '">' + icon('arrow-repeat') + '</button>' +
                '<button type="button" id="fld-config" class="btn btn-secondary btn-sm" ' +
                    'style="display:inline-flex;align-items:center" aria-label="' + esc(t('cfg.btn')) +
                    '" title="' + esc(t('cfg.btn')) + '">' + icon('gear') + '</button>' +
                '<span id="fld-queue-count" style="font-size:.8rem;color:#555;margin-left:auto"></span>' +
                '<button type="button" id="fld-purge" class="btn btn-outline-danger btn-sm" ' +
                    'style="display:inline-flex;align-items:center" aria-label="' + esc(t('queue.purge')) +
                    '" title="' + esc(t('queue.purge')) + '">' + icon('trash') + '</button>' +
            '</div>' +
            '<div id="fld-queue-table"></div></div>';
    }

    // Status badge background. Darkened from the Bootstrap defaults to ~6.5:1
    // contrast with white text — extra headroom for outdoor/field readability.
    function statusColor(s) {
        return s === 'synced' ? '#146c43' : s === 'error' ? '#b02a37' : '#565e64';
    }
    // One-line preview of a record's attributes (first non-empty values).
    function attrsPreview(rec) {
        var parts = [];
        Object.keys(rec.fields || {}).forEach(function (k) {
            if (rec.fields[k] !== '' && rec.fields[k] != null) { parts.push(rec.fields[k]); }
        });
        return parts.join(' · ') || '—';
    }

    // Build the features table in the panel: one row per captured zone, newest first.
    // Columns: date, status badge, attributes preview, zoom + delete (pending only).
    async function refreshQueueList() {
        var host = document.getElementById('fld-queue-table');
        var countEl = document.getElementById('fld-queue-count');
        if (!host) { return; }
        host.textContent = '';
        var all = await idbAll();
        all.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        if (countEl) { countEl.textContent = all.length + ' ' + t('tbl.count'); }
        // Disable Sync when nothing is waiting (all transmitted, or empty).
        var syncBtn = document.getElementById('fld-sync');
        if (syncBtn) {
            var waiting = all.some(function (r) { return r.status === 'pending' || r.status === 'error'; });
            syncBtn.disabled = !waiting;
        }
        var purgeBtn = document.getElementById('fld-purge');
        if (purgeBtn) { purgeBtn.disabled = !all.length; } // nothing to clear when empty
        if (!all.length) {
            var p = document.createElement('p');
            p.style.cssText = 'font-size:.85rem;color:#555;margin:.3rem 0';
            p.textContent = t('queue.empty');
            host.appendChild(p);
            return;
        }
        var table = document.createElement('table');
        table.className = 'table table-sm';
        table.style.cssText = 'font-size:.8rem;margin:0';
        var thead = document.createElement('thead');
        var htr = document.createElement('tr');
        [t('tbl.date'), t('tbl.status'), t('tbl.attrs'), ''].forEach(function (h) {
            var th = document.createElement('th');
            th.textContent = h;
            th.style.cssText = 'padding:.25rem .35rem';
            htr.appendChild(th);
        });
        thead.appendChild(htr);
        table.appendChild(thead);
        var tbody = document.createElement('tbody');
        all.forEach(function (rec) {
            var tr = document.createElement('tr');
            // date
            var tdDate = document.createElement('td');
            tdDate.style.cssText = 'padding:.25rem .35rem;white-space:nowrap';
            tdDate.textContent = rec.createdAt ? new Date(rec.createdAt).toLocaleString() : '—';
            tr.appendChild(tdDate);
            // status badge
            var tdSt = document.createElement('td');
            tdSt.style.cssText = 'padding:.25rem .35rem';
            // Error badge is a button: hover title is unreachable on touch, so a tap
            // reveals the reason. Other statuses stay a plain (non-interactive) span.
            var badge;
            if (rec.status === 'error' && rec.error) {
                badge = document.createElement('button');
                badge.type = 'button';
                badge.setAttribute('aria-label', t('queue.error') + ' — ' + t('tbl.errshow'));
                badge.title = rec.error;
                badge.style.cssText = 'border:0;cursor:pointer;display:inline-block;padding:.1rem .4rem;border-radius:6px;color:#fff;font-size:.72rem;background:' + statusColor(rec.status);
                badge.textContent = (t('queue.error') || 'error') + ' ⓘ';
                badge.addEventListener('click', function () { window.alert(rec.error); });
            } else {
                badge = document.createElement('span');
                badge.style.cssText = 'display:inline-block;padding:.1rem .4rem;border-radius:6px;color:#fff;font-size:.72rem;background:' + statusColor(rec.status);
                badge.textContent = t('queue.' + rec.status) || rec.status;
            }
            tdSt.appendChild(badge);
            if (rec.status === 'synced' && rec.gristId != null) {
                var idSpan = document.createElement('span');
                idSpan.style.cssText = 'margin-left:.3rem;color:#555;font-variant-numeric:tabular-nums';
                idSpan.textContent = '#' + rec.gristId;
                tdSt.appendChild(idSpan);
            }
            tr.appendChild(tdSt);
            // attrs preview
            var tdA = document.createElement('td');
            tdA.style.cssText = 'padding:.25rem .35rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
            var preview = attrsPreview(rec);
            tdA.textContent = preview;
            tdA.title = preview;
            tr.appendChild(tdA);
            // actions
            var tdAct = document.createElement('td');
            tdAct.style.cssText = 'padding:.25rem .35rem;white-space:nowrap;text-align:right';
            var zoomBtn = document.createElement('button');
            zoomBtn.type = 'button';
            zoomBtn.className = 'btn btn-secondary btn-sm';
            zoomBtn.style.cssText = 'padding:.1rem .3rem';
            zoomBtn.setAttribute('aria-label', t('tbl.zoom'));
            zoomBtn.title = t('tbl.zoom');
            zoomBtn.innerHTML = icon('geo-alt');
            zoomBtn.addEventListener('click', function () { zoomToGeometry(rec.geometry); });
            tdAct.appendChild(zoomBtn);
            if (rec.status === 'pending' || rec.status === 'error') {
                var delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'btn btn-outline-danger btn-sm';
                delBtn.style.cssText = 'padding:.1rem .3rem;margin-left:.2rem';
                delBtn.setAttribute('aria-label', t('tbl.delete'));
                delBtn.title = t('tbl.delete');
                delBtn.innerHTML = icon('x-lg');
                delBtn.addEventListener('click', async function () {
                    await idbDel(rec.uuid);
                    await refreshMapLayer();
                    refreshQueueList();
                });
                tdAct.appendChild(delBtn);
            }
            tr.appendChild(tdAct);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        host.appendChild(table);
    }

    // Zoom the map to a stored GeoJSON geometry (EPSG:4326).
    function zoomToGeometry(geom) {
        if (!mapRef || !geom) { return; }
        try {
            var fmt = new ol.format.GeoJSON();
            var olGeom = fmt.readGeometry(geom, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
            mapRef.getView().fit(olGeom.getExtent(), { padding: [40, 40, 40, 40], duration: 400, maxZoom: 19 });
        } catch (e) { /* malformed geometry — ignore */ }
    }

    // Read apiBase/docId from the config inputs, fetch the doc's tables, and fill
    // the dropdown. Uses the live input values (not saved cfg) so it works right
    // after a paste, before Save.
    async function loadTablesInto() {
        var msg = document.getElementById('fld-cfg-msg');
        cfg.apiBase = safeApiBase(val('fld-apiBase'));
        cfg.docId   = val('fld-docId').trim();
        cfg.token   = val('fld-token');
        if (!cfg.apiBase || !cfg.docId) { return; }
        try {
            var ids = await fetchTables();
            fillTableOptions(ids);
            if (msg) { msg.textContent = ids.length + ' ' + t('cfg.tableId'); }
            await loadGeomCols();   // populate geometry-column picker for the selected table
        } catch (e) {
            if (msg) { msg.textContent = t('cfg.tablesloaderr') + ' ' + (e.message || e); }
        }
    }

    // --- UI: bind handlers after each render ---------------------------------
    function bind() {
        var on = function (id, ev, fn) { var el = document.getElementById(id); if (el) { el.addEventListener(ev, fn); } };

        // config — paste a Grist URL to auto-fill server + document, then list tables
        on('fld-paste', 'input', function (e) {
            var parsed = parseGristUrl(e.target.value);
            if (!parsed.apiBase) { return; }                 // not a usable URL yet
            var set = function (id, v) { var el = document.getElementById(id); if (el && v) { el.value = v; } };
            set('fld-apiBase', parsed.apiBase);
            set('fld-docId',   parsed.docId);
            if (parsed.docId) { loadTablesInto(); }          // populate the table dropdown
        });
        on('fld-tables-load', 'click', loadTablesInto);
        on('fld-tableId', 'change', loadGeomCols);  // table picked → refresh geometry-column list
        // On opening config with an existing table, populate the column pickers.
        if (document.getElementById('fld-geomCol') && val('fld-tableId').trim()) { loadGeomCols(); }

        on('fld-cfg-save', 'click', function () {
            cfg.apiBase = safeApiBase(val('fld-apiBase'));
            cfg.docId   = val('fld-docId').trim();
            cfg.tableId = val('fld-tableId').trim();
            cfg.geomCol = val('fld-geomCol').trim() || 'geometry';
            cfg.accTarget = valAccTarget();
            cfg.token   = val('fld-token');
            saveCfg();
            schema = null; // force schema refetch with new config
            view = 'idle';
            render();
        });
        on('fld-config', 'click', function () { view = 'config'; render(); });

        // reload Grist schema — clear the in-memory cache and refetch
        on('fld-cfg-reload', 'click', async function () {
            var msg = document.getElementById('fld-cfg-msg');
            // Persist any edited config first so the fetch hits the right table.
            cfg.apiBase = safeApiBase(val('fld-apiBase'));
            cfg.docId   = val('fld-docId').trim();
            cfg.tableId = val('fld-tableId').trim();
            cfg.geomCol = val('fld-geomCol').trim() || 'geometry';
            cfg.accTarget = valAccTarget();
            cfg.token   = val('fld-token');
            saveCfg();
            schema = null;
            try {
                var cols = await fetchSchema();
                if (msg) { msg.textContent = t('cfg.reloaded') + ' ' + cols.length + ' ' + t('cfg.fields'); }
            } catch (e) {
                if (msg) { msg.textContent = t('cfg.reloaderr') + ' ' + (e.message || e); }
            }
        });

        // geometry mode buttons — each starts a capture directly in its mode
        Array.prototype.forEach.call(document.querySelectorAll('.sv-field [data-mode]'), function (b) {
            b.addEventListener('click', function () {
                geomMode = b.getAttribute('data-mode');
                startCapture();
            });
        });

        // form
        on('fld-form-save', 'click', onFormSave);
        on('fld-photo-input', 'change', async function (e) {
            var files = Array.prototype.slice.call(e.target.files || []);
            e.target.value = ''; // allow re-picking the same file
            for (var i = 0; i < files.length; i++) {
                var small = await downscaleImage(files[i]);             // resize before storage
                var name = (files[i].name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
                formPhotos.push({ blob: small, name: name, url: URL.createObjectURL(small) });
                renderThumbs();
            }
        });
        renderThumbs(); // restore thumbs if the form re-rendered

        // queue
        on('fld-sync', 'click', async function () {
            setStatus(t('sync.running'));
            await syncQueue(refreshQueueList);
            await refreshMapLayer();
            setStatus(t('sync.ok'));
            refreshQueueList();
        });
        on('fld-purge', 'click', async function () {
            // Destroys unsent zones too — confirm before wiping.
            if (!window.confirm(t('queue.purgeconfirm'))) { return; }
            await idbClear();
            await refreshMapLayer();
            refreshQueueList();
        });

        refreshQueueList();
    }
    function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
    // Parse the target-accuracy input; fall back to the default when blank/invalid.
    function valAccTarget() {
        var n = parseFloat(val('fld-accTarget'));
        return (isFinite(n) && n > 0) ? n : ACC_GATE;
    }
    function setStatus(msg) { var el = document.getElementById('fld-status'); if (el) { el.textContent = msg; } }

    // Read one form control and coerce its value to the Grist type, or null to skip.
    // Grist expects: Numeric/Int → number, Date/DateTime → epoch seconds, Bool →
    // boolean, ChoiceList → ['L', ...] tag list, Choice/Text → string.
    function readCol(c) {
        var id = attrId(c.id);
        var el = document.getElementById(id);
        if (!el) { return null; }
        var bt = baseType(c.type);
        if (bt === 'Bool') { return el.checked; }
        if (bt === 'ChoiceList') {
            var sel = Array.prototype.filter.call(el.options || [], function (o) { return o.selected; })
                           .map(function (o) { return o.value; });
            return sel.length ? ['L'].concat(sel) : null; // Grist ChoiceList encoding
        }
        var v = el.value;
        if (v === '' || v == null) { return null; }
        if (bt === 'Numeric' || bt === 'Int') {
            var n = parseFloat(v);
            return isNaN(n) ? null : (bt === 'Int' ? Math.round(n) : n);
        }
        if (bt === 'Date') {
            // <input type=date> → "YYYY-MM-DD" → epoch seconds at UTC midnight.
            var ms = Date.parse(v + 'T00:00:00Z');
            return isNaN(ms) ? null : Math.floor(ms / 1000);
        }
        if (bt === 'DateTime') {
            // <input type=datetime-local> → local time → epoch seconds.
            var ms2 = Date.parse(v);
            return isNaN(ms2) ? null : Math.floor(ms2 / 1000);
        }
        return v; // Text, Choice
    }

    async function onFormSave() {
        var geom = buildGeometry();
        if (!geom) { setStatus(minHint()); return; }
        var fields = {};
        (schema || []).forEach(function (c) {
            var v = readCol(c);
            if (v !== null) { fields[c.id] = v; }
        });
        // Snapshot picked photos as {blob, name} for the queue (object URLs are
        // session-only and dropped — recreated for display from the blob if needed).
        var photos = formPhotos.map(function (p) { return { blob: p.blob, name: p.name }; });
        var rec = {
            uuid: uuid(),
            geometry: geom,           // GeoJSON Polygon, EPSG:4326
            fields: fields,
            photos: photos,           // Blobs, uploaded to Grist Attachments on sync
            status: 'pending',
            gristId: null,            // Grist row id, filled on successful sync
            createdAt: Date.now(),
            syncedAt: null,
            error: null
        };
        await idbPut(rec);            // INVARIANT: persist before any network attempt
        clearFormPhotos();
        stopWatch();
        resetCapture();
        view = 'idle';
        render();
        // Confirm the local save loudly and first — the zone is safe on the device
        // regardless of what the network does next. Sync state is appended after.
        if (navigator.onLine && cfgComplete()) {
            setStatus(t('form.saved') + ' ' + t('sync.running'));
            await syncQueue(refreshQueueList);
            setStatus(t('form.saved') + ' ' + t('sync.ok'));
        } else {
            setStatus(t('form.saved') + ' ' + t('queue.offline'));
        }
        await refreshMapLayer();
        refreshQueueList();
    }

    // --- Floating capture bar ------------------------------------------------
    // During GPS capture the panel is closed so the map (and the forming polygon)
    // stays fully visible. A floating bar at the bottom carries the few capture
    // actions with large touch targets — built inside .sv-scope, inline styles,
    // no <style> injection (embed-safe per EXT_API rules).
    var barEl = null;

    function barRoot() {
        // Append to the positioned map frame (like .sv-map-controls) so absolute
        // positioning anchors correctly and the bar sits above the map canvas.
        return document.getElementById('sv-frame-map') ||
               document.querySelector('.sv-framemap') || document.body;
    }

    function showBar() {
        if (barEl) { return; }
        barEl = document.createElement('div');
        barEl.id = 'fld-bar';
        barEl.setAttribute('style', [
            'position:absolute', 'left:50%', 'bottom:14px', 'transform:translateX(-50%)',
            'max-width:calc(100% - 28px)',
            'z-index:8000',                 // above map canvas; matches .sv-map-controls
            'pointer-events:auto',          // ensure taps reach the bar, not the map
            'box-sizing:border-box',
            'background:rgba(24,24,27,.92)', 'color:#fff', 'border-radius:12px',
            'box-shadow:0 4px 18px rgba(0,0,0,.4)', 'padding:7px 8px',
            'display:flex', 'gap:7px', 'align-items:center'
        ].join(';'));
        barRoot().appendChild(barEl);
        renderBar();
    }
    function hideBar() {
        if (barEl && barEl.parentNode) { barEl.parentNode.removeChild(barEl); }
        barEl = null;
    }

    // Bar readout: GPS accuracy + vertex count (e.g. "◎4m · ●5"). A weak-signal
    // fallback on the last vertex appends a compact ⚠ glyph only — keeping the
    // readout near-constant width so it never reflows the buttons (the full reason
    // lives in the glyph's title, and the weak vertex is tinted red on the map).
    function barStatusText() {
        var base = '◎' + (lastFix ? Math.round(lastFix.accuracy) + 'm' : '…') + ' · ●' + vertices.length;
        return lastWeak ? base + ' ⚠' : base;
    }
    // Whether a new vertex can be added now (Point mode holds a single vertex).
    function canAddVertex() {
        return !!lastFix; // all modes accept unlimited vertices (MultiPoint, Line, Polygon)
    }

    function renderBar() {
        if (!barEl) { return; }
        var canClose = canFinalize();
        var canAdd = canAddVertex();
        // Single compact row, icon-only buttons (44px touch targets), to keep the
        // map maximally visible. Readout = accuracy + vertex count.
        var sq = 'min-height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center;padding:0';
        barEl.innerHTML =
            '<span role="status" aria-live="polite" id="fld-bar-status"' +
                (lastWeak ? ' title="' + esc(t('capture.nogate')) + '"' : '') +
                ' style="font-size:.85rem;white-space:nowrap;padding:0 6px;min-width:78px;' +
                'text-align:left;font-variant-numeric:tabular-nums">' +
                barStatusText() + '</span>' +
            '<button type="button" id="fld-bar-recenter" class="btn btn-light"' +
                ' aria-label="' + esc(t('capture.recenter')) +
                '" title="' + esc(t('capture.recenter')) + '" style="' + sq + '">' + icon('crosshair') + '</button>' +
            '<button type="button" id="fld-bar-vertex" class="btn btn-success"' +
                (canAdd ? '' : ' disabled') + ' aria-label="' + esc(t('capture.vertex')) +
                '" title="' + esc(t('capture.vertex')) + '" style="' + sq + '">' + icon('plus-circle') + '</button>' +
            '<button type="button" id="fld-bar-undo" class="btn btn-light"' +
                (vertices.length ? '' : ' disabled') + ' aria-label="' + esc(t('capture.undo')) +
                '" title="' + esc(t('capture.undo')) + '" style="' + sq + '">' + icon('arrow-undo') + '</button>' +
            '<button type="button" id="fld-bar-close" class="btn btn-light"' +
                (canClose ? '' : ' disabled') + ' aria-label="' + esc(t('capture.done')) +
                '" title="' + esc(t('capture.done')) + '" style="' + sq + '">' + icon('check2') + '</button>' +
            '<button type="button" id="fld-bar-stop" class="btn btn-outline-light"' +
                ' aria-label="' + esc(t('capture.stop')) +
                '" title="' + esc(t('capture.stop')) + '" style="' + sq + '">' + icon('x-lg') + '</button>';
        bindBar();
        applyVertexAccState(document.getElementById('fld-bar-vertex')); // initial amber/green state
    }
    function bindBar() {
        var on = function (id, fn) { var el = document.getElementById(id); if (el) { el.addEventListener('click', fn); } };
        on('fld-bar-vertex', function () {
            if (!lastFix || sampling) { return; }
            // Pre-commit accuracy gate: if the current fix is worse than the target,
            // warn before recording rather than silently averaging a bad point. The
            // agent can override (the point is then flagged weak, tinted red on map).
            if (lastFix.accuracy > cfg.accTarget && !window.confirm(t('capture.accwarn'))) { return; }
            var vbtn = document.getElementById('fld-bar-vertex');
            if (vbtn) { vbtn.disabled = true; }
            captureVertex(
                function (left) {
                    // Progress ring on the + button: a conic-gradient sweeps as the
                    // ~3s average fills — the sole "keep still" cue. The old text
                    // countdown was redundant with the ring, so it's gone.
                    var pct = Math.max(0, Math.min(100, (1 - left / AVG_MS) * 100));
                    if (vbtn) {
                        vbtn.style.background =
                            'conic-gradient(#fff ' + pct + '%, rgba(255,255,255,.25) ' + pct + '%)';
                    }
                },
                function (committed, gated) {
                    // Remember whether this vertex was a weak-signal fallback so the
                    // warning persists in the readout until the next vertex (it used
                    // to flash once, then get wiped by the next GPS update).
                    if (committed) { lastWeak = !gated; }
                    if (vbtn) { vbtn.style.background = ''; }   // clear the progress ring
                    renderBar();          // restores normal status + re-enables button
                    refreshMapLayer();
                }
            );
        });
        on('fld-bar-recenter', recenter);
        on('fld-bar-undo', function () {
            vertices.pop(); vertexMeta.pop();
            lastWeak = false;                 // clear any stale weak-signal warning
            renderBar(); refreshMapLayer();
        });
        on('fld-bar-stop', function () { if (confirmAbort()) { stopCapture(); } });
        on('fld-bar-close', async function () {
            if (!canFinalize()) { return; }
            try { await fetchSchema(); }
            catch (e) {
                var s = document.getElementById('fld-bar-status');
                if (s) { s.textContent = t('err.schema') + ' ' + (e.message || e); }
                return;
            }
            stopWatch();              // keep vertices — needed to build the polygon on save
            hideBar();
            clearFormPhotos();        // fresh photo set for this zone
            view = 'form';
            SViewer.panel.open(PANEL, t('title'), '<p>…</p>', { fullscreen: true });
            render();
        });
    }
    // In-place refresh of the bar's live GPS readout on each fix (no full rebuild).
    // Current fix is worse than the target accuracy (pre-commit warning state).
    function overTarget() { return !!lastFix && lastFix.accuracy > cfg.accTarget; }
    // Tint the + button amber when the current fix is below target, so the agent
    // sees the warning before tapping (not only in the confirm dialog after).
    function applyVertexAccState(vbtn) {
        if (!vbtn || sampling) { return; }   // leave the progress-ring state alone
        var warn = overTarget();
        vbtn.classList.toggle('btn-warning', warn);
        vbtn.classList.toggle('btn-success', !warn);
    }
    function updateBarStatus() {
        if (!barEl) { return; }
        var vbtn = document.getElementById('fld-bar-vertex');
        if (vbtn) { vbtn.disabled = !canAddVertex(); applyVertexAccState(vbtn); }
        var s = document.getElementById('fld-bar-status');
        if (s) { s.textContent = barStatusText(); }
    }

    // Clear all in-progress capture state (vertices + their meta + flags).
    function resetCapture() {
        vertices = []; vertexMeta = []; lastWeak = false;
    }
    // Start GPS + show the floating bar; close the panel so the map is visible.
    function startCapture() {
        firstFix = false;             // re-arm auto-zoom for this capture
        var ok = startWatch(function () { updateBarStatus(); });
        if (!ok) { setStatus(t('err.geo')); return; }
        resetCapture();
        showBar();                    // create the bar BEFORE closing the panel so the
        SViewer.panel.close();        // panel.onClose handler sees capture in progress
        refreshMapLayer();
    }
    // Guard against losing captured vertices to a stray tap. Each vertex costs the
    // agent a ~3s stationary measurement, so an accidental abort is real lost work.
    // No prompt when nothing is captured yet (cancelling an empty capture is free).
    function confirmAbort() {
        if (!vertices.length) { return true; }
        return window.confirm(t('capture.abort'));
    }
    // Abort capture: stop GPS, drop the bar and any in-progress vertices, reopen panel.
    function stopCapture() {
        stopWatch();
        hideBar();
        resetCapture();
        view = 'idle';
        if (active) {
            SViewer.panel.open(PANEL, t('title'), '<p>…</p>', { fullscreen: true });
            render();
        }
        refreshMapLayer();
    }

    // --- Activation ----------------------------------------------------------
    function open() {
        active = true;
        view = cfgComplete() ? 'idle' : 'config';
        SViewer.panel.open(PANEL, t('title'), '<p>…</p>', { fullscreen: true });
        render();
        refreshMapLayer();
    }
    function close() {
        // Panel closed. If capture is in progress (bar showing), keep it: the bar
        // is the capture UI and the panel is meant to be hidden during capture.
        if (barEl) { return; }
        active = false;
        stopWatch();
        if (btnEl) { btnEl.setAttribute('aria-pressed', 'false'); btnEl.classList.remove('active'); }
    }

    // --- Entry point ---------------------------------------------------------
    SViewer.onMapReady(function (ctx) {
        mapRef = ctx.map;

        var toolbar = document.getElementById('sv-panel-controls');
        btnEl = document.createElement('button');
        btnEl.type = 'button';
        btnEl.className = 'btn btn-dark sv-map-btn sv-alt-toggle';
        btnEl.setAttribute('aria-pressed', 'false');
        btnEl.setAttribute('aria-label', t('btn.aria'));
        btnEl.title = t('btn.aria');
        btnEl.innerHTML = icon('pin-map');
        btnEl.addEventListener('click', function () {
            // If capture is running, the toolbar button aborts it and deactivates.
            if (barEl) {
                if (!confirmAbort()) { return; }   // protect captured vertices
                stopWatch(); hideBar(); resetCapture(); refreshMapLayer();
                active = false;
                btnEl.setAttribute('aria-pressed', 'false');
                btnEl.classList.remove('active');
                return;
            }
            active = !active;
            btnEl.setAttribute('aria-pressed', String(active));
            btnEl.classList.toggle('active', active);
            if (active) { open(); } else { SViewer.panel.close(); }
        });
        toolbar.appendChild(btnEl);

        SViewer.panel.onClose(PANEL, close);

        // Auto-flush the queue when the network returns.
        window.addEventListener('online', function () {
            if (cfgComplete()) {
                syncQueue(refreshQueueList).then(function () {
                    if (active) { refreshMapLayer(); refreshQueueList(); }
                });
            }
        });
    });
})();
