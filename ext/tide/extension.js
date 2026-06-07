/**
 * Marée (tide) — show the predicted SEA extent on a coastal zone for a chosen
 * date/time, near one port. NOT a flood-risk tool: it visualises the astronomical
 * tide (predicted sea level), not a flood/inondation forecast (surge, swell,
 * river are ignored). Wording deliberately avoids "flood".
 *
 * Combines SHOM bathymetry (sea floor, WMS, altitude IGN69) with an Open-Meteo
 * Marine tide curve (free, no key, CORS-direct) calibrated to the RAM
 * (Références Altimétriques Maritimes, open SHOM data) so the curve's mean sits
 * at the port's true mean sea level in IGN69.
 *
 * Physics (see ext/tide/INVESTIGATION.md):
 *   S           = zh_ref (RAM port, ZH height in IGN69)   // datum separation
 *   water_IGN69 = tide_ZH(t) + S
 *   submerged   ⟺ seafloor_IGN69 < water_IGN69            // painted by GeoServer SLD
 * Measured ΔS = 1 cm / 5 km → flat-S honest at 4 nm.
 *
 * SCIENTIFIC TRACEABILITY RULE: every datum used in the computation (its source,
 * date, value) is displayed to the user. No hidden numbers.
 *
 * Build plan: ext/tide/PLAN.md. Sea overlay = one bathymetry WMS, dynamic SLD
 * thresholded at water_IGN69; tide curve (uPlot) drives the level.
 */
(function () {
    'use strict';

    var PANEL = 'tide';

    // RAM — Références Altimétriques Maritimes (SHOM, Licence Ouverte 2.0, no key).
    // WFS GeoJSON, features already in EPSG:3857 (matches the map view → no
    // reprojection for distance maths). Property zh_ref = cote du ZH dans le
    // système légal (reference="IGN69") = our datum separation S.
    var RAM_WFS   = 'https://services.data.shom.fr/INSPIRE/wfs';
    var RAM_LAYER = 'RAM_BDD_WLD_WGS84G_WFS:ram_3857';
    var RAM_SRC   = 'SHOM — Références Altimétriques Maritimes (RAM)';
    var SEARCH_M  = 30000;     // half-width (m) of the WFS bbox around map center
    var DEF_MINZOOM = 13;      // coastal scale gate (single-port flat-S validity)

    // SHOM bathymetry 5 m (GeoServer WMS). Pixel = sea-floor altitude IGN69 in
    // metres (GRAY_INDEX), nodata = -99999. IGN69 → the tide's water_IGN69
    // thresholds it directly, no extra correction. SEA tool: paint where the sea
    // floor is BELOW the water level (submerged) blue, at/above orange; nodata
    // transparent. Tide rises → waterline creeps up the shore; falls → flats
    // emerge. 5 m grid (vs 1 m): smoother coast, less speckle, faster.
    //
    // CRITICAL: GeoServer matches the SLD <NamedLayer><Name> to the layer only
    // when WORKSPACE-QUALIFIED ('shom:bathy_5m'). A bare name parses but is
    // silently ignored → default style renders. Verified on geobretagne.
    //
    // We do NOT use the terrestrial Litto3D here: it covers only the land above
    // lowest tide (open sea = nodata) and overlapped the intertidal band. One
    // bathymetry layer = no overlap, no land taint.
    var WMS_URL   = 'https://geobretagne.fr/geoserver/shom/bathy_5m/wms';
    var WMS_LAYER = 'shom:bathy_5m';
    var WMS_SRC   = 'GéoBretagne / SHOM — bathymétrie 5 m (altitude IGN69)';
    // Below the water level = blue (submerged), at/above = orange (exposed). The
    // safe blue is graded into a three-step ramp by water under the keel (+1 m per
    // step). Hard thresholds (SLD type=intervals). See seaSLD().

    var minZoom = DEF_MINZOOM;

    // uPlot (MIT, vendored ext/tide/uplot.min.{js,css}) — lazy-loaded on the
    // first chart so core + map load stay fast and non-tide pages pay nothing.
    var BASE = SViewer.extensionBase();   // must read at module scope (currentScript)
    var uplotReady = null;
    function loadUplot() {
        if (uplotReady) { return uplotReady; }
        uplotReady = new Promise(function (resolve, reject) {
            var link = document.createElement('link');
            link.rel = 'stylesheet'; link.href = BASE + 'uplot.min.css';
            document.head.appendChild(link);
            var s = document.createElement('script');
            s.src = BASE + 'uplot.min.js';
            s.onload = function () { resolve(window.uPlot); };
            s.onerror = function () { reject(new Error('uplot-load-failed')); };
            document.head.appendChild(s);
        });
        return uplotReady;
    }

    // Tide curve = Open-Meteo Marine API (free, no key, CORS-open → called
    // DIRECTLY from the browser, no proxy). Returns sea-surface height vs MSL,
    // 15-min step. The model gives the right SHAPE/timing (range matches SHOM
    // within ~cm on a test day) but its absolute MSL→IGN69 offset is uncertain,
    // so we CALIBRATE to RAM: anchor the curve's daily mean to the port's true
    // mean sea level in IGN69 (NM_IGN69 = zh_ref + NM_ZH). This removes the
    // absolute datum error while keeping Open-Meteo's oscillation.
    //
    // Heights are stored as ZH-equivalent so the existing readout/marks (which do
    // h + S = water_IGN69) work unchanged:  h_ZH(t) = om_msl(t) + offset − zh_ref,
    // with offset = NM_IGN69 − mean(om_msl over the day).
    var OM_URL = 'https://marine-api.open-meteo.com/v1/marine';
    var OM_SRC = 'Open-Meteo Marine (modèle), calibré sur SHOM-RAM';

    // Waves = Open-Meteo Marine (same host/endpoint as the tide, keyless, CORS-open).
    // Hourly mean sea state at the port: significant height, mean direction, period.
    // Loaded LAZILY like the wind, on the first open of the Vagues tab (and eagerly
    // for the on-map badge). NOTE: global wave models are COARSE (~5–25 km) — valid
    // offshore, unreliable in sheltered bays/estuaries (labelled "au large").
    var WAVE_SRC = 'Open-Meteo Marine — état de mer (modèle global, vague au large)';

    // SHOM tidal-current atlas (Courants de marée 2D) — WMTS, keyless, CORS-open,
    // transparent RGBA PNG. Layers are indexed relative to HIGH WATER AT BREST:
    //   COURANTS2D_WMTS_<ME|VE><PM | AP1..6 | AV1..6>_3857
    //   ME = morte-eau (neap, coef 45), VE = vive-eau (spring, coef 95)
    //   PM = at HW; APn = n hours after HW; AVn = n hours before HW (±6 h)
    // We pick the layer automatically from the selected instant: offset = round
    // (instant − nearest Brest HW), clamped ±6; spring/neap from Brest's daily
    // range (the atlas only has two buckets, like the product itself). No toggle,
    // no picker — the current follows the cursor like the sea does. Brest's tide
    // curve (for HW times + range) is fetched from Open-Meteo, same as the port.
    var CUR_WMTS  = 'https://services.data.shom.fr/INSPIRE/wmts';
    var CUR_SRC   = 'SHOM — Atlas de courants de marée 2D (référence Brest)';
    var BREST_LL  = [-4.4944, 48.3833];   // Brest [lon, lat] for the reference curve
    var BREST_RANGE_SPRING = 4.5;          // day range (m) ≥ → vive-eau, else morte-eau

    // Wind forecast = Open-Meteo (same provider, keyless, CORS-direct). Model =
    // best_match: Open-Meteo auto-selects Météo-France AROME 1.3 km near France
    // for the short term and a global model beyond — seamless, no nulls (AROME
    // alone stops at ~57 h). Wind/gust in km/h + direction; loaded LAZILY on the
    // first open of the Vent tab.
    var WIND_URL  = 'https://api.open-meteo.com/v1/forecast';
    var WIND_SRC  = 'Open-Meteo — Météo-France AROME 1,3 km près des côtes, modèle global au-delà';

    // Seamarks = OpenSeaMap XYZ overlay (transparent PNG, navigation marks only:
    // buoys, beacons, lights, harbours). Static (no time dependency) → always on
    // while the tool is active, like a chart's symbology. Free, ODbL/CC-BY-SA,
    // CORS-open. Drawn above the sea + current overlays so marks stay legible.
    var SEAMARK_URL = 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png';
    var SEAMARK_SRC = 'OpenSeaMap (ODbL) — amers et balisage';
    var SEAMARK_MAXZ = 18;   // OpenSeaMap seamark tiles published to z18

    // Canonical resource page per data source (traceability rule: the user can
    // open the provider's own documentation/dataset). Keyed by the *_SRC label so
    // provHtml/foot render the source name as a link when a page is known.
    var SRC_URL = {};
    SRC_URL[RAM_SRC]     = 'https://www.data.gouv.fr/datasets/references-altimetriques-maritimes';
    SRC_URL[WMS_SRC]     = 'https://diffusion.shom.fr/donnees/bathymerie.html';
    SRC_URL[OM_SRC]      = 'https://open-meteo.com/en/docs/marine-weather-api';
    SRC_URL[WAVE_SRC]    = 'https://open-meteo.com/en/docs/marine-weather-api';
    SRC_URL[CUR_SRC]     = 'https://diffusion.shom.fr/marees/courants-de-maree/courants-2d.html';
    SRC_URL[WIND_SRC]    = 'https://open-meteo.com/en/docs/meteofrance-api';
    SRC_URL[SEAMARK_SRC] = 'https://www.openseamap.org/';

    // --- i18n -----------------------------------------------------------------
    var I18N = {
        fr: {
            'btn.title':   'Marée (étendue d’eau prévue)',
            'panel.title': 'Marée',
            'tab.tide':    'Marée',
            'tab.data':    'Données',
            'tab.wind':    'Vent',
            'tab.wave':    'Vagues',
            'wind.spd':    'Vent',
            'wind.gust':   'Rafales',
            'wind.err':    'Prévision de vent indisponible.',
            'wind.bf':     'Bf {f}',
            'badge.aria':  'Hauteur d’eau {h} m, vent {spd} nœuds direction {dir}°',
            'wind.fetched':'prévision récupérée le {when}',
            'wind.stale':  '— peut être obsolète',
            'wave.h':      'Hauteur',
            'wave.swell':  'Houle',
            'wave.label':  'État de mer (vagues)',
            'wave.expl':   'Hauteur significative, direction et période des vagues au large, à l’emplacement du port (modèle global Open-Meteo, grossier près des côtes abritées).',
            'wave.err':    'Prévision de vagues indisponible.',
            'wave.fetched':'prévision récupérée le {when}',
            'wave.stale':  '— peut être obsolète',
            'gate.hint':   'Zoomez sur une zone côtière près d’un port pour activer l’outil.',
            'loading':     'Recherche du port le plus proche…',
            'port.label':  'Port de référence',
            'port.dist':   'à {d} du centre de la carte',
            'port.repick': 'Port le plus proche ici',
            'port.faraway':'Vous vous êtes éloigné de ce port — actualisez pour le port le plus proche.',
            'sep.label':   'Référence verticale',
            'sep.val':     'Zéro hydrographique à {v} m / IGN69',
            'sep.expl':    'Décalage appliqué aux hauteurs de marée (comptées sur le zéro hydrographique) pour les ramener en altitude IGN69.',
            'levels.label':'Niveaux caractéristiques (sur le zéro hydrographique)',
            'lvl.phma':    'PHMA (plus haute mer astronomique)',
            'lvl.pmve':    'PMVE (pleine mer vive-eau)',
            'lvl.nm':      'NM (niveau moyen)',
            'prov.source': 'Source',
            'prov.date':   'Date de la donnée',
            'err.none':    'Aucun port de référence à proximité. Déplacez la carte vers la côte.',
            'err.fetch':   'Service RAM (SHOM) injoignable.',
            'curve.label': 'Marée prévue',
            'draft.label': 'Tirant d’eau',
            'draft.expl':  'Dégradé de bleu = eau sûre, gradué par tranche d’1 m d’eau sous la quille (bleu clair = 0–1 m, bleu marine = 2 m et plus) ; rouge = immergé mais moins que le tirant d’eau (risque d’échouage) ; orange = découvert.',
            'date.prev':   'Jour précédent',
            'date.next':   'Jour suivant',
            'date.today':  'Maintenant',
            'date.nodata': 'Pas de prévision pour cette date (au-delà de l’horizon du modèle).',
            'curve.pm':    'PM',
            'curve.bm':    'BM',
            'curve.coef':  'coef. {c}',
            'curve.range': 'Marnage',
            'curve.coefApprox': 'coef. ~{c}',
            'coef.method': 'Marnage = PM la plus haute − BM la plus basse du jour (réel). Coefficient ~ approché : 95 × marnage / marnage de vive-eau moyen, estimé à 2·(PMVE − NM) — repère vive-eau/morte-eau, pas le coefficient officiel du SHOM (le modèle libre n’en fournit pas).',
            'curve.model': 'Marée prédite (modèle Open-Meteo, calé sur SHOM-RAM) — non garantie pour la navigation.',
            'err.curve':   'Courbe de marée indisponible.',
            'cursor.label':'Heure sélectionnée (flèches gauche/droite pour ajuster)',
            'wms.loading': 'Chargement de la carte de la mer…',
            'probe.title':     'Point cliqué',
            'probe.floor':     'Fond marin',
            'probe.water':     'Niveau de la mer',
            'probe.depth':     'Hauteur d’eau',
            'probe.clearance': 'Sous la quille',
            'probe.dry':       'Découvert',
            'probe.aground':   'Échouage',
            'probe.loading':   'Lecture du fond…',
            'probe.nodata':    'Pas de donnée de fond ici',
            'probe.nodata.sub':'Un vide de données n’est PAS une eau sûre — ne pas s’y fier.',
            'probe.err':       'Lecture du fond impossible',
            'probe.close':     'Fermer',
            'terrain.label':'Fond marin (bathymétrie)',
            'terrain.expl':'La mer est calculée par le serveur : tout pixel dont l’altitude du fond (IGN69) est inférieure au niveau de la mer est peint.',
            'cur.label':   'Courants de marée',
            'cur.expl':    'Superposition automatique selon l’heure choisie : superposition SHOM la plus proche (heure relative à la pleine mer de Brest, vive-eau/morte-eau d’après le marnage).',
            'mark.label':  'Amers et balisage',
            'mark.expl':   'Superposition des marques de navigation (bouées, balises, feux, ports) d’OpenSeaMap, toujours affichée pendant l’outil.'
        },
        en: {
            'btn.title':   'Tide (predicted water extent)',
            'panel.title': 'Tide',
            'tab.tide':    'Tide',
            'tab.data':    'Data',
            'tab.wind':    'Wind',
            'tab.wave':    'Waves',
            'wind.spd':    'Wind',
            'wind.gust':   'Gusts',
            'wind.err':    'Wind forecast unavailable.',
            'wind.bf':     'Bf {f}',
            'badge.aria':  'Water height {h} m, wind {spd} knots direction {dir}°',
            'wind.fetched':'forecast retrieved {when}',
            'wind.stale':  '— may be outdated',
            'wave.h':      'Height',
            'wave.swell':  'Swell',
            'wave.label':  'Sea state (waves)',
            'wave.expl':   'Significant height, direction and period of offshore waves at the port location (Open-Meteo global model, coarse near sheltered coasts).',
            'wave.err':    'Wave forecast unavailable.',
            'wave.fetched':'forecast retrieved {when}',
            'wave.stale':  '— may be outdated',
            'gate.hint':   'Zoom in on a coastal area near a port to enable the tool.',
            'loading':     'Finding nearest port…',
            'port.label':  'Reference port',
            'port.dist':   '{d} from map centre',
            'port.repick': 'Nearest port here',
            'port.faraway':'You have panned away from this port — refresh for the nearest one.',
            'sep.label':   'Vertical reference',
            'sep.val':     'Chart datum at {v} m / IGN69',
            'sep.expl':    'Offset applied to tide heights (measured above chart datum) to bring them to IGN69 altitude.',
            'levels.label':'Characteristic levels (above chart datum)',
            'lvl.phma':    'HAT (highest astronomical tide)',
            'lvl.pmve':    'MHWS (mean high water springs)',
            'lvl.nm':      'MSL (mean sea level)',
            'prov.source': 'Source',
            'prov.date':   'Data date',
            'err.none':    'No reference port nearby. Pan the map toward the coast.',
            'err.fetch':   'RAM service (SHOM) unreachable.',
            'curve.label': 'Predicted tide',
            'draft.label': 'Draft',
            'draft.expl':  'Blue ramp = safe water, graded by 1 m of water under the keel (light blue = 0–1 m, navy = 2 m and more); red = submerged but less than the draft (grounding risk); orange = exposed.',
            'date.prev':   'Previous day',
            'date.next':   'Next day',
            'date.today':  'Now',
            'date.nodata': 'No forecast for this date (beyond the model horizon).',
            'curve.pm':    'HW',
            'curve.bm':    'LW',
            'curve.coef':  'coef. {c}',
            'curve.range': 'Range',
            'curve.coefApprox': 'coef. ~{c}',
            'coef.method': 'Range = highest HW − lowest LW of the day (real). Approx coefficient ~: 95 × range / mean spring range, estimated as 2·(MHWS − ML) — a spring/neap guide, not the official SHOM coefficient (the free model provides none).',
            'curve.model': 'Predicted tide (Open-Meteo model, calibrated to SHOM-RAM) — not for navigation.',
            'err.curve':   'Tide curve unavailable.',
            'cursor.label':'Selected time (left/right arrows to adjust)',
            'wms.loading': 'Loading sea map…',
            'probe.title':     'Clicked point',
            'probe.floor':     'Sea floor',
            'probe.water':     'Sea level',
            'probe.depth':     'Water depth',
            'probe.clearance': 'Under keel',
            'probe.dry':       'Exposed',
            'probe.aground':   'Grounding',
            'probe.loading':   'Reading the floor…',
            'probe.nodata':    'No floor data here',
            'probe.nodata.sub':'A data gap is NOT safe water — do not rely on it.',
            'probe.err':       'Could not read the floor',
            'probe.close':     'Close',
            'terrain.label':'Sea floor (bathymetry)',
            'terrain.expl':'The sea is computed server-side: every pixel whose sea-floor altitude (IGN69) is below the sea level is painted.',
            'cur.label':   'Tidal currents',
            'cur.expl':    'Overlaid automatically for the selected hour: the nearest SHOM layer (hour relative to Brest high water, spring/neap from the tidal range).',
            'mark.label':  'Seamarks',
            'mark.expl':   'OpenSeaMap navigation marks (buoys, beacons, lights, harbours) overlaid throughout the tool.'
        },
        es: {
            'btn.title':   'Marea (extensión de agua prevista)',
            'panel.title': 'Marea',
            'tab.tide':    'Marea',
            'tab.data':    'Datos',
            'tab.wind':    'Viento',
            'tab.wave':    'Olas',
            'wind.spd':    'Viento',
            'wind.gust':   'Rachas',
            'wind.err':    'Previsión de viento no disponible.',
            'wind.bf':     'Bf {f}',
            'badge.aria':  'Altura del agua {h} m, viento {spd} nudos dirección {dir}°',
            'wind.fetched':'previsión obtenida el {when}',
            'wind.stale':  '— puede estar desactualizada',
            'wave.h':      'Altura',
            'wave.swell':  'Mar de fondo',
            'wave.label':  'Estado del mar (olas)',
            'wave.expl':   'Altura significativa, dirección y período de las olas en mar abierto, en la ubicación del puerto (modelo global Open-Meteo, impreciso cerca de costas resguardadas).',
            'wave.err':    'Previsión de olas no disponible.',
            'wave.fetched':'previsión obtenida el {when}',
            'wave.stale':  '— puede estar desactualizada',
            'gate.hint':   'Acérquese a una zona costera cerca de un puerto para activar la herramienta.',
            'loading':     'Buscando el puerto más cercano…',
            'port.label':  'Puerto de referencia',
            'port.dist':   'a {d} del centro del mapa',
            'port.repick': 'Puerto más cercano aquí',
            'port.faraway':'Se ha alejado de este puerto — actualice para el más cercano.',
            'sep.label':   'Referencia vertical',
            'sep.val':     'Cero hidrográfico a {v} m / IGN69',
            'sep.expl':    'Desfase aplicado a las alturas de marea (medidas sobre el cero hidrográfico) para llevarlas a altitud IGN69.',
            'levels.label':'Niveles característicos (sobre el cero hidrográfico)',
            'lvl.phma':    'PMAS (pleamar máxima astronómica)',
            'lvl.pmve':    'PMVE (pleamar viva equinoccial)',
            'lvl.nm':      'NM (nivel medio)',
            'prov.source': 'Fuente',
            'prov.date':   'Fecha del dato',
            'err.none':    'Ningún puerto de referencia cerca. Desplace el mapa hacia la costa.',
            'err.fetch':   'Servicio RAM (SHOM) inaccesible.',
            'curve.label': 'Marea prevista',
            'draft.label': 'Calado',
            'draft.expl':  'Degradado de azul = agua segura, graduado por cada metro de agua bajo la quilla (azul claro = 0–1 m, azul marino = 2 m o más); rojo = sumergido pero menos que el calado (riesgo de varada); naranja = descubierto.',
            'date.prev':   'Día anterior',
            'date.next':   'Día siguiente',
            'date.today':  'Ahora',
            'date.nodata': 'Sin previsión para esta fecha (más allá del horizonte del modelo).',
            'curve.pm':    'PM',
            'curve.bm':    'BM',
            'curve.coef':  'coef. {c}',
            'curve.range': 'Amplitud',
            'curve.coefApprox': 'coef. ~{c}',
            'coef.method': 'Amplitud = pleamar más alta − bajamar más baja del día (real). Coeficiente ~ aproximado: 95 × amplitud / amplitud de marea viva media, estimada como 2·(PMVE − NM) — referencia viva/muerta, no el coeficiente oficial del SHOM (el modelo libre no lo da).',
            'curve.model': 'Marea prevista (modelo Open-Meteo, calibrado con SHOM-RAM) — no apta para navegación.',
            'err.curve':   'Curva de marea no disponible.',
            'cursor.label':'Hora seleccionada (flechas izquierda/derecha para ajustar)',
            'wms.loading': 'Cargando el mapa del mar…',
            'probe.title':     'Punto pulsado',
            'probe.floor':     'Fondo marino',
            'probe.water':     'Nivel del mar',
            'probe.depth':     'Altura de agua',
            'probe.clearance': 'Bajo la quilla',
            'probe.dry':       'Descubierto',
            'probe.aground':   'Varada',
            'probe.loading':   'Leyendo el fondo…',
            'probe.nodata':    'Sin dato de fondo aquí',
            'probe.nodata.sub':'Un vacío de datos NO es agua segura — no confíe en ello.',
            'probe.err':       'No se pudo leer el fondo',
            'probe.close':     'Cerrar',
            'terrain.label':'Fondo marino (batimetría)',
            'terrain.expl':'El mar lo calcula el servidor: se pinta todo píxel cuya altitud del fondo (IGN69) es inferior al nivel del mar.',
            'cur.label':   'Corrientes de marea',
            'cur.expl':    'Superposición automática según la hora elegida: capa SHOM más próxima (hora relativa a la pleamar de Brest, viva/muerta según la amplitud).',
            'mark.label':  'Señales marítimas',
            'mark.expl':   'Marcas de navegación (boyas, balizas, luces, puertos) de OpenSeaMap, superpuestas mientras la herramienta está activa.'
        },
        de: {
            'btn.title':   'Gezeiten (vorhergesagte Wasserausdehnung)',
            'panel.title': 'Gezeiten',
            'tab.tide':    'Gezeit',
            'tab.data':    'Daten',
            'tab.wind':    'Wind',
            'tab.wave':    'Wellen',
            'wind.spd':    'Wind',
            'wind.gust':   'Böen',
            'wind.err':    'Windvorhersage nicht verfügbar.',
            'wind.bf':     'Bft {f}',
            'badge.aria':  'Wasserhöhe {h} m, Wind {spd} Knoten Richtung {dir}°',
            'wind.fetched':'Vorhersage abgerufen am {when}',
            'wind.stale':  '— möglicherweise veraltet',
            'wave.h':      'Höhe',
            'wave.swell':  'Dünung',
            'wave.label':  'Seegang (Wellen)',
            'wave.expl':   'Signifikante Höhe, Richtung und Periode der Wellen auf offener See am Hafenstandort (globales Open-Meteo-Modell, grob an geschützten Küsten).',
            'wave.err':    'Wellenvorhersage nicht verfügbar.',
            'wave.fetched':'Vorhersage abgerufen am {when}',
            'wave.stale':  '— möglicherweise veraltet',
            'gate.hint':   'Zoomen Sie auf ein Küstengebiet nahe einem Hafen, um das Werkzeug zu aktivieren.',
            'loading':     'Nächstgelegenen Hafen suchen…',
            'port.label':  'Referenzhafen',
            'port.dist':   '{d} vom Kartenzentrum',
            'port.repick': 'Nächster Hafen hier',
            'port.faraway':'Sie haben sich von diesem Hafen entfernt — aktualisieren für den nächsten.',
            'sep.label':   'Höhenbezug',
            'sep.val':     'Seekartennull bei {v} m / IGN69',
            'sep.expl':    'Versatz, der auf Gezeitenhöhen (über Seekartennull gemessen) angewandt wird, um sie auf IGN69-Höhe zu bringen.',
            'levels.label':'Charakteristische Pegel (über Seekartennull)',
            'lvl.phma':    'HAT (höchste astronomische Tide)',
            'lvl.pmve':    'MHWS (mittleres Springhochwasser)',
            'lvl.nm':      'MSL (mittlerer Meeresspiegel)',
            'prov.source': 'Quelle',
            'prov.date':   'Datum der Daten',
            'err.none':    'Kein Referenzhafen in der Nähe. Verschieben Sie die Karte zur Küste.',
            'err.fetch':   'RAM-Dienst (SHOM) nicht erreichbar.',
            'curve.label': 'Vorhergesagte Gezeit',
            'draft.label': 'Tiefgang',
            'draft.expl':  'Blau-Verlauf = sicheres Wasser, abgestuft je 1 m Wasser unter dem Kiel (hellblau = 0–1 m, marineblau = 2 m und mehr); rot = unter Wasser, aber weniger als der Tiefgang (Grundberührungsrisiko); orange = trockengefallen.',
            'date.prev':   'Vorheriger Tag',
            'date.next':   'Nächster Tag',
            'date.today':  'Jetzt',
            'date.nodata': 'Keine Vorhersage für dieses Datum (über den Modellhorizont hinaus).',
            'curve.pm':    'HW',
            'curve.bm':    'NW',
            'curve.coef':  'Koef. {c}',
            'curve.range': 'Tidenhub',
            'curve.coefApprox': 'Koef. ~{c}',
            'coef.method': 'Tidenhub = höchstes HW − niedrigstes NW des Tages (real). Näherungskoeffizient ~: 95 × Tidenhub / mittlerer Springtidenhub, geschätzt als 2·(MHWS − MW) — Spring/Nipp-Anhalt, nicht der offizielle SHOM-Koeffizient (das freie Modell liefert keinen).',
            'curve.model': 'Vorhergesagte Gezeit (Open-Meteo-Modell, auf SHOM-RAM kalibriert) — nicht für die Navigation.',
            'err.curve':   'Gezeitenkurve nicht verfügbar.',
            'cursor.label':'Gewählte Uhrzeit (Pfeiltasten links/rechts zum Anpassen)',
            'wms.loading': 'Meereskarte wird geladen…',
            'probe.title':     'Angeklickter Punkt',
            'probe.floor':     'Meeresboden',
            'probe.water':     'Meeresspiegel',
            'probe.depth':     'Wassertiefe',
            'probe.clearance': 'Unter dem Kiel',
            'probe.dry':       'Trockengefallen',
            'probe.aground':   'Grundberührung',
            'probe.loading':   'Boden wird gelesen…',
            'probe.nodata':    'Keine Bodendaten hier',
            'probe.nodata.sub':'Eine Datenlücke ist KEIN sicheres Wasser — nicht darauf verlassen.',
            'probe.err':       'Boden konnte nicht gelesen werden',
            'probe.close':     'Schließen',
            'terrain.label':'Meeresboden (Bathymetrie)',
            'terrain.expl':'Das Meer wird serverseitig berechnet: jedes Pixel, dessen Meeresboden-Höhe (IGN69) unter dem Meeresspiegel liegt, wird eingefärbt.',
            'cur.label':   'Gezeitenströmungen',
            'cur.expl':    'Automatisch für die gewählte Stunde überlagert: nächstgelegene SHOM-Ebene (Stunde relativ zum Brest-Hochwasser, Spring/Nipp nach Tidenhub).',
            'mark.label':  'Seezeichen',
            'mark.expl':   'OpenSeaMap-Navigationszeichen (Bojen, Baken, Feuer, Häfen), während des Werkzeugs eingeblendet.'
        }
    };
    function lang() {
        var l = (SViewer.state && SViewer.state.lang) || (SViewer.config && SViewer.config.lang) || 'fr';
        return I18N[l] ? l : 'fr';
    }
    function t(key, vars) {
        var L = I18N[lang()];
        var s = (L && L[key]) || I18N.fr[key] || key;
        if (vars) { Object.keys(vars).forEach(function (k) { s = s.replace('{' + k + '}', vars[k]); }); }
        return s;
    }
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    // Format a metre value with explicit sign and 3 decimals (RAM precision is mm).
    function fmtSep(v) {
        var n = Number(v);
        return (n >= 0 ? '+' : '') + n.toFixed(3);
    }
    function fmtDist(m) {
        return m >= 1000 ? (Math.round(m / 100) / 10) + ' km' : Math.round(m) + ' m';
    }
    // Wind is fetched + stored in km/h (Beaufort table is defined in km/h), but
    // displayed in KNOTS — the unit every sailor, almanac and VHF forecast uses.
    var KMH_PER_KT = 1.852;
    function kmhToKt(kmh) { return kmh / KMH_PER_KT; }
    function toKtOrNull(kmh) { return kmh == null ? null : kmh / KMH_PER_KT; }
    // Chart axis tick font/colour — BOLD and high-contrast so it stays legible on
    // a phone in bright sun. Colour follows the panel foreground (near-black on the
    // light theme, near-white on dark) resolved at chart-build time.
    var AXIS_FONT = '700 12px system-ui, -apple-system, "Segoe UI", sans-serif';
    function axisStroke() {
        var probe = document.querySelector('#sv-panel-ext-tide') || document.body;
        var c = getComputedStyle(probe).getPropertyValue('--sv-panel-fg').trim();
        return c || '#111';
    }

    // --- Offline persistence (localStorage) -----------------------------------
    // Tide/Brest curves + RAM port are deterministic/static → cached forever and
    // valid offline. Wind is a forecast → cached too but stamped with fetch time
    // so a stale prediction is shown as such, not trusted blindly. Keyed under one
    // versioned namespace; quota errors swallowed (cache is an optimisation, never
    // required). On a full quota we drop our oldest entries and retry once.
    var STORE_PREFIX = 'sv_tide_v1.';
    // Each entry is wrapped { _ts: <fetch ms>, v: <value> } — _ts drives LRU
    // eviction on quota and lets callers show how old a forecast is. Returns the
    // wrapper ({_ts, v}) or undefined.
    function storeGet(key) {
        try { var raw = localStorage.getItem(STORE_PREFIX + key); return raw ? JSON.parse(raw) : undefined; }
        catch (e) { return undefined; }
    }
    function storeSet(key, val) {
        var s;
        try { s = JSON.stringify({ _ts: Date.now(), v: val }); } catch (e) { return; }
        try { localStorage.setItem(STORE_PREFIX + key, s); }
        catch (e) {
            // Quota: evict our oldest entries (by stored `_ts`), retry once.
            try {
                var mine = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var k = localStorage.key(i);
                    if (k && k.indexOf(STORE_PREFIX) === 0) {
                        var v = localStorage.getItem(k);
                        var ts = 0; try { ts = (JSON.parse(v) || {})._ts || 0; } catch (e2) { /* */ }
                        mine.push({ k: k, ts: ts });
                    }
                }
                mine.sort(function (a, b) { return a.ts - b.ts; });
                for (var j = 0; j < Math.ceil(mine.length / 3); j++) { localStorage.removeItem(mine[j].k); }
                localStorage.setItem(STORE_PREFIX + key, s);
            } catch (e3) { /* give up — cache is optional */ }
        }
    }

    SViewer.onMapReady(function (ctx) {
        var map  = ctx.map;
        var view = ctx.view || map.getView();

        var active   = false;
        var port     = null;   // selected RAM port { site, S, phma, pmve, nm, date, x, y }
        var fetchSeq = 0;      // stale-response guard
        var wantPort = null;   // ?tide_port= preselection (by name)
        var tide     = null;   // loaded tide series { points, highs, lows, date, source, ... }
        var curDate  = new Date();  // selected day for the tide curve (default today)
        var tideCache = {};    // 'site|date' → series | null (null = known no-data)
        var chart    = null;   // active uPlot instance
        var curIdx   = 0;      // selected sample index in tide.points (cursor position)
        var seaLayer = null; // OL WMS layer painting the sea (own, removed on close)
        var seaSrc   = null; // its ol.source.TileWMS (512² tiles)
        var seaTimer = null; // debounce handle for the sea WMS request
        var draft    = 0;    // tirant d'eau (m) — safety clearance; lowers the blue/orange break
        var nautScale = null;    // OL nautical ScaleLine control (own, removed on close)
        var probeOverlay = null; // OL Overlay popup for a clicked-point depth probe
        var probeMarkSrc = null; // its marker vector source
        var probeSeq = 0;        // stale-GFI guard (last click wins)
        var probeLast = null;    // { coord, floor } → recompute on time/draft change
        var wantT    = null; // ?tide_t= deep-link instant (epoch ms), consumed once on first curve
        var curLayer = null; // OL WMTS tidal-current overlay (own, removed on close)
        var curId    = null; // current layer identifier in use (avoid needless reloads)
        var markLayer = null; // OL XYZ OpenSeaMap seamark overlay (own, removed on close)
        var brestCache = {}; // 'date' → { highs:[ms], range } | null  (Brest HW + range per day)
        var windChart  = null; // uPlot wind instance (Vent tab)
        var windData   = null; // { t:[], spd:[], gust:[], dir:[] } for the current port
        var windLoaded = false; // lazy: fetched on first Vent-tab open
        var windFetchedAt = 0; // epoch ms of the wind data in use (for staleness)
        var waveChart  = null; // uPlot wave instance (Vagues tab)
        var waveData   = null; // { t:[], h:[], swell:[], per:[], dir:[] } for the current port
        var waveLoaded = false; // lazy: fetched on first Vagues-tab open
        var waveFetchedAt = 0; // epoch ms of the wave data in use (for staleness)

        // --- RAM nearest-port fetch ------------------------------------------
        // Query the open RAM WFS for ports within a bbox around the map centre,
        // pick the nearest one carrying a non-null zh_ref (datum separation).
        // Coarse (~10 km) cell key for caching the picked port — so an offline
        // re-open near the same place recovers the port without the WFS.
        function portCellKey(c) { return 'port.' + Math.round(c[0] / 10000) + '_' + Math.round(c[1] / 10000); }
        function findPort() {
            var c = view.getCenter();
            if (!c) { return; }
            var seq = ++fetchSeq;
            showLoading();
            var bbox = [c[0] - SEARCH_M, c[1] - SEARCH_M, c[0] + SEARCH_M, c[1] + SEARCH_M, 'EPSG:3857'].join(',');
            var url = RAM_WFS +
                '?service=WFS&version=2.0.0&request=GetFeature' +
                '&typeNames=' + encodeURIComponent(RAM_LAYER) +
                '&outputFormat=application/json&srsName=EPSG:3857' +
                '&bbox=' + encodeURIComponent(bbox);
            fetch(url, { headers: { Accept: 'application/json' } })
                .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
                .then(function (j) {
                    if (seq !== fetchSeq) { return; }
                    var p = pickNearest(j, c);
                    // wantPort is a ONE-SHOT deep-link preference (?tide_port=). If
                    // its named port isn't in range, fall back to nearest rather
                    // than failing. Consume it either way so the re-pick button
                    // (and later opens) always use nearest-to-view.
                    if (!p && wantPort) { wantPort = null; p = pickNearest(j, c); }
                    wantPort = null;
                    if (!p) { showError(t('err.none')); return; }
                    storeSet(portCellKey(c), p);   // persist for offline re-open
                    port = p;
                    resetWind();    // new port → wind reloads lazily on next Vent open
                    resetWave();    // ditto for waves
                    renderLayout();
                    syncUrl();      // reflect the port immediately (tide_t added once the curve loads)
                    loadTide();
                })
                .catch(function () {
                    if (seq !== fetchSeq) { return; }
                    // Offline / WFS down → recover a previously-picked port for this
                    // map cell (datum + tide are deterministic → still valid).
                    var st = storeGet(portCellKey(c));
                    if (st && st.v) {
                        port = st.v; resetWind(); resetWave(); renderLayout(); syncUrl(); loadTide();
                    } else { showError(t('err.fetch')); }
                });
        }
        // Pick the nearest feature with a usable zh_ref; or, if ?tide_port= is set,
        // True ground distance (metres) between two EPSG:3857 points. Web Mercator
        // distances are stretched by 1/cos(lat) (≈1.5× at 48°N); multiply the 3857
        // hypot by cos(lat) at the mean latitude to get real metres. (ol.sphere is
        // not in our custom OL build, so we correct manually — exact enough for the
        // ~10 km coastal scale here.)
        function geoDist(a, b) {
            var latA = ol.proj.toLonLat(a)[1], latB = ol.proj.toLonLat(b)[1];
            var k = Math.cos((latA + latB) / 2 * Math.PI / 180);
            return Math.hypot(a[0] - b[0], a[1] - b[1]) * k;
        }
        // that named port. Validates every numeric (untrusted service input).
        function pickNearest(fc, center) {
            if (!fc || !Array.isArray(fc.features)) { return null; }
            var best = null, bestD = Infinity;
            fc.features.forEach(function (f) {
                var pr = f.properties || {};
                var S  = Number(pr.zh_ref);
                if (!isFinite(S)) { return; }                 // no datum sep → unusable
                var g = f.geometry;
                if (!g || g.type !== 'Point' || !Array.isArray(g.coordinates)) { return; }
                var x = Number(g.coordinates[0]), y = Number(g.coordinates[1]);
                if (!isFinite(x) || !isFinite(y)) { return; }
                var cand = {
                    site: String(pr.site || pr.zone || '?'),
                    S:    S,
                    phma: numOrNull(pr.phma), pmve: numOrNull(pr.pmve), nm: numOrNull(pr.nm),
                    date: pr.date_ch != null ? String(pr.date_ch) : (pr.date_rf != null ? String(pr.date_rf) : null),
                    x: x, y: y
                };
                var d = geoDist([x, y], center);   // true ground metres
                cand.dist = d;   // real distance to the map centre, always
                // ?tide_port= match wins by NAME, but keeps its true distance.
                if (wantPort && cand.site.toLowerCase() === wantPort.toLowerCase()) {
                    best = cand; bestD = -1; return;        // -1 = locked by name
                }
                if (bestD !== -1 && d < bestD) { bestD = d; best = cand; }
            });
            return best;
        }
        function numOrNull(v) { var n = Number(v); return isFinite(n) ? n : null; }

        // --- Render ----------------------------------------------------------
        function root() { return document.getElementById('sv-tide-root'); }
        function showLoading() {
            var r = root(); if (r) { r.innerHTML = '<p class="sv-tide-msg">' + esc(t('loading')) + '</p>'; }
        }
        function showError(msg) {
            var r = root(); if (r) { r.innerHTML = '<p class="sv-tide-err">' + esc(msg) + '</p>'; }
        }
        // Provenance line — source + date, shown under every datum block. The
        // scientific-traceability rule: the user always sees where a number came
        // from and when.
        // Render a source label, linked to the provider's own page when known
        // (SRC_URL). External link → new tab, rel guards the opener. Falls back to
        // plain escaped text for an unknown source.
        function srcLink(src) {
            var u = SRC_URL[src];
            if (!u) { return esc(src); }
            return '<a class="sv-tide-prov-link" href="' + esc(u) +
                '" target="_blank" rel="noopener noreferrer">' + esc(src) + '</a>';
        }
        function provHtml(src, date) {
            var d = date ? '<span class="sv-tide-prov-date"> · ' + esc(t('prov.date')) + ' ' + esc(date) + '</span>' : '';
            return '<p class="sv-tide-prov">' + esc(t('prov.source')) + ' : ' + srcLink(src) + d + '</p>';
        }
        function levelRow(label, val) {
            if (val == null) { return ''; }
            return '<tr><th scope="row">' + esc(label) + '</th><td>' + esc(val.toFixed(2)) + ' m</td></tr>';
        }
        // Données tab: port + datum separation + characteristic levels + bathymetry.
        // Every block carries source + date (scientific-traceability rule).
        function dataHtml() {
            if (!port) { return ''; }
            var levels =
                levelRow(t('lvl.phma'), port.phma) +
                levelRow(t('lvl.pmve'), port.pmve) +
                levelRow(t('lvl.nm'),   port.nm);
            return (
                // Port
                '<section class="sv-tide-block">' +
                  '<h3 class="sv-tide-h">' + esc(t('port.label')) + '</h3>' +
                  '<p class="sv-tide-port-name">' + esc(port.site) +
                    (port.dist != null ? ' <span class="sv-tide-dim">(' + esc(t('port.dist', { d: fmtDist(port.dist) })) + ')</span>' : '') +
                  '</p>' +
                  provHtml(RAM_SRC, port.date) +
                '</section>' +
                // Datum separation S
                '<section class="sv-tide-block">' +
                  '<h3 class="sv-tide-h">' + esc(t('sep.label')) + '</h3>' +
                  '<p class="sv-tide-sep">' + esc(t('sep.val', { v: fmtSep(port.S) })) + '</p>' +
                  '<p class="sv-tide-expl">' + esc(t('sep.expl')) + '</p>' +
                  '<p class="sv-tide-formula"><code>niveau_IGN69 = hauteur_marée + (' + esc(fmtSep(port.S)) + ')</code></p>' +
                  provHtml(RAM_SRC, port.date) +
                '</section>' +
                // Characteristic levels
                (levels ?
                '<section class="sv-tide-block">' +
                  '<h3 class="sv-tide-h">' + esc(t('levels.label')) + '</h3>' +
                  '<table class="sv-tide-levels">' + levels + '</table>' +
                  '<p class="sv-tide-expl">' + esc(t('coef.method')) + '</p>' +
                  provHtml(RAM_SRC, port.date) +
                '</section>' : '') +
                // Bathymetry data behind the sea overlay (traceability)
                '<section class="sv-tide-block">' +
                  '<h3 class="sv-tide-h">' + esc(t('terrain.label')) + '</h3>' +
                  '<p class="sv-tide-expl">' + esc(t('terrain.expl')) + '</p>' +
                  '<p class="sv-tide-expl">' + esc(t('draft.expl')) + '</p>' +
                  provHtml(WMS_SRC, null) +
                '</section>' +
                // Tidal currents (traceability)
                '<section class="sv-tide-block">' +
                  '<h3 class="sv-tide-h">' + esc(t('cur.label')) + '</h3>' +
                  '<p class="sv-tide-expl">' + esc(t('cur.expl')) + '</p>' +
                  provHtml(CUR_SRC, null) +
                '</section>' +
                // Seamarks (traceability)
                '<section class="sv-tide-block">' +
                  '<h3 class="sv-tide-h">' + esc(t('mark.label')) + '</h3>' +
                  '<p class="sv-tide-expl">' + esc(t('mark.expl')) + '</p>' +
                  provHtml(SEAMARK_SRC, null) +
                '</section>' +
                // Tide curve source + disclaimer (filled by renderCurve into the foot)
                '<section class="sv-tide-block">' +
                  '<h3 class="sv-tide-h">' + esc(t('curve.label')) + '</h3>' +
                  '<p class="sv-tide-prov sv-tide-curve-foot" id="sv-tide-curve-foot"></p>' +
                '</section>' +
                // Wind forecast source + age (filled by renderWind into the foot)
                '<section class="sv-tide-block">' +
                  '<h3 class="sv-tide-h">' + esc(t('tab.wind')) + '</h3>' +
                  '<p class="sv-tide-prov sv-tide-wind-foot" id="sv-tide-wind-foot"></p>' +
                '</section>' +
                // Wave forecast (traceability) — explanation + source/age foot
                '<section class="sv-tide-block">' +
                  '<h3 class="sv-tide-h">' + esc(t('wave.label')) + '</h3>' +
                  '<p class="sv-tide-expl">' + esc(t('wave.expl')) + '</p>' +
                  '<p class="sv-tide-prov sv-tide-wave-foot" id="sv-tide-wave-foot"></p>' +
                '</section>');
        }
        // Two tabs (compact, mobile-first): "Marée" = live controls + graph,
        // "Données" = port/datum/levels/bathymetry provenance. A tablist (WCAG)
        // toggles the panes; both share the short bottom dock.
        function renderLayout() {
            var r = root(); if (!r) { return; }
            r.innerHTML =
                '<div class="sv-tide-tabs" role="tablist" aria-label="' + esc(t('panel.title')) + '">' +
                  '<button type="button" role="tab" class="sv-tide-tab" id="sv-tide-tab-tide" ' +
                       'aria-controls="sv-tide-pane-tide" aria-selected="true" tabindex="0">' + esc(t('tab.tide')) + '</button>' +
                  '<button type="button" role="tab" class="sv-tide-tab" id="sv-tide-tab-wind" ' +
                       'aria-controls="sv-tide-pane-wind" aria-selected="false" tabindex="-1">' + esc(t('tab.wind')) + '</button>' +
                  '<button type="button" role="tab" class="sv-tide-tab" id="sv-tide-tab-wave" ' +
                       'aria-controls="sv-tide-pane-wave" aria-selected="false" tabindex="-1">' + esc(t('tab.wave')) + '</button>' +
                  '<button type="button" role="tab" class="sv-tide-tab" id="sv-tide-tab-data" ' +
                       'aria-controls="sv-tide-pane-data" aria-selected="false" tabindex="-1">' + esc(t('tab.data')) + '</button>' +
                '</div>' +
                // Marée pane
                '<div class="sv-tide-pane sv-tide-curve" id="sv-tide-pane-tide" role="tabpanel" aria-labelledby="sv-tide-tab-tide">' +
                  // One compact line: port button (refresh icon + name = re-pick) ·
                  // date nav · draft. The button IS the port label and the re-pick
                  // control — one bigger tap target (mobile-friendly).
                  '<div class="sv-tide-topline">' +
                    '<button type="button" class="btn btn-secondary btn-sm sv-tide-repick" id="sv-tide-repick" ' +
                         'aria-label="' + esc((port ? port.site + ' — ' : '') + t('port.repick')) + '" ' +
                         'title="' + esc(t('port.repick')) + '">' +
                      '<svg class="sv-tide-repick-ico" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
                        '<path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>' +
                        '<path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>' +
                      '</svg>' +
                      '<span class="sv-tide-topname" id="sv-tide-topname">' + esc(port ? port.site : '') + '</span>' +
                    '</button>' +
                    // Date nav (‹ date › today) filled by renderCurve once the
                    // series loads — between port name and draft to save a line.
                    '<div class="sv-tide-datenav-slot" id="sv-tide-datenav-slot"></div>' +
                    '<label class="sv-tide-draft-lbl" for="sv-tide-draft-sel">' + esc(t('draft.label')) + '</label>' +
                    // Dropdown beats a slider on a phone (precise tap, no drag). 10 cm
                    // step, 0–3 m (covers the documented tide_draft range).
                    '<select id="sv-tide-draft-sel" class="sv-tide-draft-sel" ' +
                         'aria-label="' + esc(t('draft.label')) + '">' + draftOptions(draft) + '</select>' +
                  '</div>' +
                  '<p class="sv-tide-faraway" id="sv-tide-faraway" hidden>' + esc(t('port.faraway')) + '</p>' +
                  '<div class="sv-tide-curve-head" id="sv-tide-curve-head"></div>' +
                  '<div class="sv-tide-plot" id="sv-tide-plot"></div>' +
                  '<div class="sv-tide-readrow">' +
                    '<div class="sv-tide-readout" id="sv-tide-readout" tabindex="0" role="slider" ' +
                         'aria-label="' + esc(t('cursor.label')) + '"></div>' +
                  '</div>' +
                '</div>' +
                // Vent pane (hidden; lazily filled on first open) — graph only,
                // source/age moved to Données.
                '<div class="sv-tide-pane sv-tide-curve" id="sv-tide-pane-wind" role="tabpanel" aria-labelledby="sv-tide-tab-wind" hidden>' +
                  '<div class="sv-tide-wind-plot" id="sv-tide-wind-plot"></div>' +
                '</div>' +
                // Vagues pane (hidden; lazily filled on first open) — graph only,
                // source/age moved to Données.
                '<div class="sv-tide-pane sv-tide-curve" id="sv-tide-pane-wave" role="tabpanel" aria-labelledby="sv-tide-tab-wave" hidden>' +
                  '<div class="sv-tide-wave-plot" id="sv-tide-wave-plot"></div>' +
                '</div>' +
                // Données pane (hidden by default) — dataHtml already contains the
                // tide-curve + wind source lines (filled by renderCurve/renderWind),
                // each under its own header.
                '<div class="sv-tide-pane sv-tide-info" id="sv-tide-pane-data" role="tabpanel" aria-labelledby="sv-tide-tab-data" hidden>' +
                  dataHtml() +
                '</div>';
            bindTabs();
            bindRepick();
            bindDraft();
            updateFaraway();
            updateWindFoot();   // refill the wind source/age line if data is already loaded
            updateWaveFoot();   // ditto for waves
        }
        // Tab switching: aria-selected + roving tabindex + show/hide panes. Left/
        // Right arrows move between tabs (WCAG tablist pattern). The chart must be
        // resized when its pane becomes visible (uPlot sizes to a 0-height hidden
        // box otherwise).
        function bindTabs() {
            var tabs = [
                { tab: 'sv-tide-tab-tide', pane: 'sv-tide-pane-tide' },
                { tab: 'sv-tide-tab-wind', pane: 'sv-tide-pane-wind' },
                { tab: 'sv-tide-tab-wave', pane: 'sv-tide-pane-wave' },
                { tab: 'sv-tide-tab-data', pane: 'sv-tide-pane-data' }
            ];
            function select(idx) {
                tabs.forEach(function (tt, i) {
                    var tb = document.getElementById(tt.tab), pn = document.getElementById(tt.pane);
                    var on = i === idx;
                    if (tb) { tb.setAttribute('aria-selected', on); tb.tabIndex = on ? 0 : -1; }
                    if (pn) { pn.hidden = !on; }
                });
                if (idx === 0 && chart) {
                    var host = document.getElementById('sv-tide-plot');
                    if (host) { chart.setSize({ width: host.clientWidth, height: Math.max(120, host.clientHeight) }); }
                }
                if (idx === 1) { openWind(); }   // Vent tab: lazy-load + (re)size
                if (idx === 2) { openWave(); }   // Vagues tab: lazy-load + (re)size
            }
            tabs.forEach(function (tt, i) {
                var tb = document.getElementById(tt.tab);
                if (!tb) { return; }
                tb.addEventListener('click', function () { select(i); });
                tb.addEventListener('keydown', function (e) {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        var n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
                        var nt = document.getElementById(tabs[n].tab);
                        if (nt) { nt.focus(); select(n); }
                    }
                });
            });
        }
        function bindRepick() {
            var b = document.getElementById('sv-tide-repick');
            if (b) { b.addEventListener('click', function () { findPort(); }); }
        }
        // Draft <select> options: 0.0 → 3.0 m, 10 cm step. Selected one marked.
        function draftOptions(sel) {
            var out = '';
            for (var i = 0; i <= 30; i++) {
                var v = i / 10;
                out += '<option value="' + v.toFixed(1) + '"' +
                    (Math.abs(v - sel) < 0.05 ? ' selected' : '') + '>' +
                    v.toFixed(1) + ' m</option>';
            }
            return out;
        }
        function bindDraft() {
            var sel = document.getElementById('sv-tide-draft-sel');
            if (!sel) { return; }
            sel.addEventListener('change', function () {
                draft = parseFloat(sel.value) || 0;
                updateSea();   // re-paint with the lowered break (debounced)
                reprobe();     // re-run an open depth probe for the new draft
                syncUrl();
            });
        }
        // Show the "you have panned away" hint when the map centre is far from the
        // current port (beyond the single-port flat-S validity, ~10 km).
        var FARAWAY_M = 10000;
        function updateFaraway() {
            var el = document.getElementById('sv-tide-faraway');
            if (!el || !port) { return; }
            var c = view.getCenter();
            var far = c && geoDist(c, [port.x, port.y]) > FARAWAY_M;
            el.hidden = !far;
        }

        // --- M6: tide curve from Open-Meteo Marine (calibrated to RAM) --------
        function destroyChart() { if (chart) { try { chart.destroy(); } catch (e) { /* */ } chart = null; } }
        // YYYY-MM-DD for a Date in local time.
        function isoDate(d) {
            return d.getFullYear() + '-' +
                ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
        }
        // Render the selected day. If it's already cached → instant, no network.
        // Otherwise fetch a WINDOW (one Open-Meteo call covers ~2 weeks at weight
        // 1.0) around the day and cache every day in it, so stepping ±days within
        // the window costs ZERO extra calls. Keeps us well under the free limits
        // (600/min, 10000/day, per visitor IP).
        var WINDOW_BACK = 3;    // days fetched before curDate
        var WINDOW_FWD  = 10;   // days after (Open-Meteo forecast horizon ~2 weeks)
        var MAX_HORIZON_DAYS = 14;  // hard cap on end_date from TODAY (Open-Meteo
                                    // marine horizon ~16 d; 14 stays safely inside)
        function loadTide() {
            if (!port) { return; }
            var date = isoDate(curDate);
            var cached = tideCache[cacheKey(date)];
            // Memory miss → try localStorage (survives reload + works offline).
            if (cached === undefined) {
                var stored = storeGet('tide.' + cacheKey(date));
                if (stored !== undefined) { tideCache[cacheKey(date)] = cached = stored.v; }
            }
            if (cached) { ++fetchSeq; tide = cached; renderCurve(); return; }
            if (cached === null) { ++fetchSeq; showNoData(date); return; }  // known no-data
            // Past the forecast horizon → no point calling the API (it would reject
            // start_date too). Show "no prediction" directly.
            if (beyondHorizon(curDate)) { ++fetchSeq; showNoData(date); return; }
            fetchWindow();
        }
        // True if a day is past Open-Meteo's forecast horizon (today + cap).
        function beyondHorizon(d) {
            var maxEnd = new Date(); maxEnd.setHours(0, 0, 0, 0);
            maxEnd.setDate(maxEnd.getDate() + MAX_HORIZON_DAYS);
            var day = new Date(d); day.setHours(0, 0, 0, 0);
            return day > maxEnd;
        }
        // One range request → per-day series, all cached. Days the API doesn't
        // cover (beyond horizon) are cached as null so we never refetch them.
        function fetchWindow() {
            var seq = ++fetchSeq;
            var head = document.getElementById('sv-tide-curve-head');
            if (head) { head.textContent = t('loading'); }
            var start = new Date(curDate); start.setDate(start.getDate() - WINDOW_BACK);
            var end   = new Date(curDate); end.setDate(end.getDate() + WINDOW_FWD);
            // Pre-clamp end_date to a safe cap from today (the horizon is ~today+16,
            // requesting beyond it fails the WHOLE call). The cap can still be off if
            // the live horizon is shorter, so requestRange also self-heals: on the
            // API's "end_date out of allowed range" error it reads the stated max and
            // retries once, clamped to it.
            var maxEnd = new Date(); maxEnd.setHours(0, 0, 0, 0);
            maxEnd.setDate(maxEnd.getDate() + MAX_HORIZON_DAYS);
            if (end > maxEnd) { end = maxEnd; }
            if (end < start) { end = new Date(start); }   // curDate at the very edge
            requestRange(start, end, seq, true);
        }
        // Build series for [start..end] and cache per day. `allowRetry` guards the
        // one-shot self-heal against the horizon (avoids an infinite retry loop).
        function requestRange(start, end, seq, allowRetry) {
            var ll = ol.proj.toLonLat([port.x, port.y]);
            var url = OM_URL +
                '?latitude=' + encodeURIComponent(ll[1].toFixed(4)) +
                '&longitude=' + encodeURIComponent(ll[0].toFixed(4)) +
                '&minutely_15=sea_level_height_msl' +
                '&start_date=' + isoDate(start) + '&end_date=' + isoDate(end) +
                '&timezone=' + encodeURIComponent('Europe/Paris');
            fetch(url, { headers: { Accept: 'application/json' } })
                .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
                .then(function (res) {
                    if (seq !== fetchSeq) { return; }            // superseded → drop
                    var j = res.j;
                    // Horizon overshoot → API states its max in `reason`; retry once.
                    if (j && j.error && allowRetry) {
                        var m = /from\s+\d{4}-\d{2}-\d{2}\s+to\s+(\d{4}-\d{2}-\d{2})/.exec(j.reason || '');
                        if (m) {
                            var cap = new Date(m[1] + 'T00:00:00');
                            if (isFinite(cap) && cap >= start) { requestRange(start, cap, seq, false); return; }
                        }
                    }
                    if (!res.ok || (j && j.error)) { return Promise.reject(j && j.reason || 'HTTP'); }
                    var byDay = splitByDay(j);                   // { 'YYYY-MM-DD': [{t,msl}] }
                    var d = new Date(start);
                    while (d <= end) {
                        var ds = isoDate(d);
                        var raw = byDay[ds];
                        var ser = (raw && raw.length) ? buildSeriesFromRaw(raw, ds) : null;
                        tideCache[cacheKey(ds)] = ser;
                        storeSet('tide.' + cacheKey(ds), ser);   // persist (incl. null = known no-data)
                        d.setDate(d.getDate() + 1);
                    }
                    var sel = tideCache[cacheKey(isoDate(curDate))];
                    if (sel) { tide = sel; renderCurve(); } else { showNoData(isoDate(curDate)); }
                })
                .catch(function () {
                    if (seq !== fetchSeq) { return; }
                    var h = document.getElementById('sv-tide-curve-head');
                    if (h) { h.innerHTML = '<span class="sv-tide-err">' + esc(t('err.curve')) + '</span>'; }
                });
        }
        // Group a multi-day minutely_15 response into raw {t,msl} arrays per local
        // calendar day. Open-Meteo returns local wall-clock times (timezone=
        // Europe/Paris) with no offset; parseLocal interprets them in the browser's
        // local zone — correct for a French user, and DST-safe (no hardcoded +02).
        function splitByDay(j) {
            var out = {};
            var m = j && j.minutely_15;
            if (!m || !Array.isArray(m.time)) { return out; }
            var times = m.time, msl = m.sea_level_height_msl || [];
            for (var i = 0; i < times.length; i++) {
                var v = Number(msl[i]);
                var ts = parseLocal(times[i]);
                if (!isFinite(v) || !isFinite(ts)) { continue; }
                var day = times[i].slice(0, 10);            // 'YYYY-MM-DD'
                (out[day] || (out[day] = [])).push({ t: ts, msl: v });
            }
            return out;
        }
        // Parse 'YYYY-MM-DDTHH:MM' as LOCAL time (no zone suffix) → epoch ms. Avoids
        // the hardcoded-offset bug (CEST vs CET); new Date(y,mo,d,h,mi) uses the
        // browser's zone with correct DST.
        function parseLocal(s) {
            var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s);
            if (!m) { return NaN; }
            return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)).getTime();
        }
        // No tide data for a date (beyond the forecast horizon). Render the date
        // nav + a note, clear the plot, so the user can navigate back.
        function showNoData(date) {
            destroyChart();
            tide = null;
            var nav  = document.getElementById('sv-tide-datenav-slot');
            var head = document.getElementById('sv-tide-curve-head');
            var plot = document.getElementById('sv-tide-plot');
            if (plot) { plot.innerHTML = ''; }
            if (nav)  { nav.innerHTML = dateNavHtml(date); bindDateNav(); }
            if (head) { head.innerHTML = '<p class="sv-tide-msg">' + esc(t('date.nodata')) + '</p>'; }
        }
        // Convert one day's raw {t,msl}[] → our ZH-equivalent series, calibrated to
        // RAM. h_ZH = om_msl + offset − zh_ref, offset = NM_IGN69 − mean(om over
        // the day); so the day's mean sea level matches RAM's NM in IGN69.
        function buildSeriesFromRaw(raw, date) {
            if (!raw || !raw.length) { return null; }
            var sum = 0; raw.forEach(function (p) { sum += p.msl; });
            var mean = sum / raw.length;
            var nmIGN69 = Number(port.S) + (port.nm != null ? Number(port.nm) : 0);  // zh_ref + NM_ZH
            var offset  = nmIGN69 - mean;                 // MSL → IGN69 anchor
            var points = raw.map(function (p) {
                // store ZH-equivalent: h + S = water_IGN69 = msl + offset
                return { t: p.t, h: +((p.msl + offset) - Number(port.S)).toFixed(3) };
            });
            var ex = extrema(points);
            return {
                port: port.site, date: date, tz: 'Europe/Paris',
                step: 15, datum: 'ZH', unit: 'm', source: OM_SRC,
                points: points, highs: ex.highs, lows: ex.lows
            };
        }
        // Date navigation: shift curDate by ±1 day (or back to today) and reload.
        // Predictions are deterministic per (port, day) → cache the built series by
        // "site|date" so revisiting a day is instant; a window fetch fills many
        // days at once. Value null = known no-data (beyond horizon), never refetch.
        function cacheKey(date) { return (port ? port.site : '?') + '|' + date; }
        // Debounce loadTide on rapid date stepping: clicking ‹/› five times fast
        // loads only the final day (cache hits render instantly; only a real fetch
        // is deferred). Update the title immediately so the UI stays responsive.
        var dateTimer = null;
        var DATE_DEBOUNCE = 250;
        function requestDay() {
            var el = document.getElementById('sv-tide-curve-title');
            if (el) { el.textContent = isoDate(curDate); }
            if (dateTimer) { clearTimeout(dateTimer); }
            dateTimer = setTimeout(function () { dateTimer = null; loadTide(); }, DATE_DEBOUNCE);
        }
        function shiftDate(days) {
            var d = new Date(curDate);
            d.setDate(d.getDate() + days);
            curDate = d;
            requestDay();
        }
        function goToday() { curDate = new Date(); requestDay(); }
        function bindDateNav() {
            var prev = document.getElementById('sv-tide-prev');
            var next = document.getElementById('sv-tide-next');
            var today = document.getElementById('sv-tide-today');
            if (prev)  { prev.addEventListener('click', function () { shiftDate(-1); }); }
            if (next)  { next.addEventListener('click', function () { shiftDate(1); }); }
            if (today) { today.addEventListener('click', goToday); }
        }
        // Local minima/maxima of the height series → PM (highs) / BM (lows). No
        // coef (the free model doesn't provide SHOM coefficients).
        function extrema(points) {
            var highs = [], lows = [];
            for (var i = 1; i < points.length - 1; i++) {
                var a = points[i - 1].h, b = points[i].h, c = points[i + 1].h;
                if (b >= a && b >= c) { highs.push({ t: points[i].t, h: b }); i += 6; }
                else if (b <= a && b <= c) { lows.push({ t: points[i].t, h: b }); i += 6; }
            }
            return { highs: highs, lows: lows };
        }
        // Date nav (‹ date › today) — rendered into the topline slot, between port
        // name and draft, to save a vertical line.
        function dateNavHtml(dateText) {
            return '<div class="sv-tide-datenav">' +
                '<button type="button" class="btn btn-secondary btn-sm sv-tide-datebtn" id="sv-tide-prev"' +
                    ' aria-label="' + esc(t('date.prev')) + '" title="' + esc(t('date.prev')) + '">‹</button>' +
                '<span class="sv-tide-curve-title" id="sv-tide-curve-title">' + esc(dateText) + '</span>' +
                '<button type="button" class="btn btn-secondary btn-sm sv-tide-datebtn" id="sv-tide-next"' +
                    ' aria-label="' + esc(t('date.next')) + '" title="' + esc(t('date.next')) + '">›</button>' +
                '<button type="button" class="btn btn-secondary btn-sm sv-tide-today" id="sv-tide-today">' +
                    esc(t('date.today')) + '</button>' +
                '</div>';
        }
        function renderCurve() {
            if (!tide) { return; }
            var nav  = document.getElementById('sv-tide-datenav-slot');
            var head = document.getElementById('sv-tide-curve-head');
            var foot = document.getElementById('sv-tide-curve-foot');
            // Date nav goes in the topline (compact: just the date); high/low
            // marks stay above the plot. The full "hauteurs sur ZH" label lives in
            // the footer provenance.
            if (nav) { nav.innerHTML = dateNavHtml(tide.date || ''); bindDateNav(); }
            if (head) {
                var marks = '';
                // Day range (marnage) = highest HW − lowest LW, in metres (real, from
                // the curve). Drives an approximate tidal coefficient — see coefApprox.
                var range = dayRange();
                var coef  = coefApprox(range);
                (tide.highs || []).forEach(function (hi) {
                    marks += '<span class="sv-tide-mark sv-tide-mark-pm">' + esc(t('curve.pm')) + ' ' +
                        esc(hhmm(hi.t)) + ' · ' + esc(Number(hi.h).toFixed(2)) + ' m' +
                        (hi.coef != null ? ' · ' + esc(t('curve.coef', { c: hi.coef })) : '') + '</span>';
                });
                (tide.lows || []).forEach(function (lo) {
                    marks += '<span class="sv-tide-mark sv-tide-mark-bm">' + esc(t('curve.bm')) + ' ' +
                        esc(hhmm(lo.t)) + ' · ' + esc(Number(lo.h).toFixed(2)) + ' m</span>';
                });
                // Marnage + approximate coefficient chip (the spring/neap read a
                // sailor plans by). Coef is marked "~" — it is estimated from the
                // range, not the official SHOM number (the free model gives none).
                if (range != null) {
                    marks += '<span class="sv-tide-mark sv-tide-mark-range">' +
                        esc(t('curve.range')) + ' ' + esc(range.toFixed(1)) + ' m' +
                        (coef != null ? ' · ' + esc(t('curve.coefApprox', { c: coef })) : '') +
                        '</span>';
                }
                head.innerHTML = '<div class="sv-tide-marks">' + marks + '</div>';
            }
            // Footer: provenance of the curve (source + date) + a "modelled,
            // not navigation-grade" disclaimer (Open-Meteo model, calibrated to
            // RAM; surge/atmospheric effects not guaranteed).
            if (foot) {
                foot.innerHTML = esc(t('prov.source')) + ' : ' + srcLink(tide.source || '?') +
                    (tide.date ? '<span class="sv-tide-prov-date"> · ' + esc(t('prov.date')) + ' ' + esc(tide.date) + '</span>' : '') +
                    ' — <em>' + esc(t('curve.model')) + '</em>';
            }
            drawPlot();
        }
        // Day range (marnage), metres: highest HW − lowest LW of the shown day.
        // Null if the curve has no clear HW/LW pair.
        function dayRange() {
            var hs = (tide && tide.highs) || [], ls = (tide && tide.lows) || [];
            if (!hs.length || !ls.length) { return null; }
            var hiMax = Math.max.apply(null, hs.map(function (h) { return Number(h.h); }));
            var loMin = Math.min.apply(null, ls.map(function (l) { return Number(l.h); }));
            var r = hiMax - loMin;
            return isFinite(r) && r > 0 ? r : null;
        }
        // APPROXIMATE tidal coefficient (20–120) from the day range. The free model
        // gives no official SHOM coefficient, so we estimate: coef 95 corresponds to
        // the mean SPRING range, taken as 2·(PMVE − NM) from the port's RAM levels.
        // coef ≈ 95 · range / springRange, clamped to the standard 20–120 scale.
        // Always shown with a "~" — an estimate to plan springs/neaps by, never the
        // official number (scientific-traceability: the method is stated in Données).
        function coefApprox(range) {
            if (range == null || !port) { return null; }
            var pmve = Number(port.pmve), nm = Number(port.nm);
            if (!isFinite(pmve) || !isFinite(nm) || pmve <= nm) { return null; }
            var springRange = 2 * (pmve - nm);
            if (!(springRange > 0)) { return null; }
            var c = Math.round(95 * range / springRange);
            return Math.max(20, Math.min(120, c));
        }
        function drawPlot() {
            var hostC = document.getElementById('sv-tide-plot');
            if (!hostC || !tide) { return; }
            loadUplot().then(function (uPlot) {
                var host = document.getElementById('sv-tide-plot');
                if (!host || !tide) { return; }
                destroyChart();
                host.textContent = '';
                var xs = tide.points.map(function (p) { return p.t / 1000; });
                var ys = tide.points.map(function (p) { return Number(p.h); });
                var unit = tide.unit || 'm';
                var fmtTime = uPlot.fmtDate('{HH}:{mm}');
                var fmtDay  = uPlot.fmtDate('{DD}/{MM}');
                var w = host.clientWidth || 320;
                var h = Math.max(120, host.clientHeight || 160);
                var opts = {
                    width: w, height: h,
                    cursor: {
                        drag: { x: false, y: false },
                        // Hover/click → adopt that sample as the selected instant.
                        points: { show: true }
                    },
                    scales: { x: { time: true } },
                    legend: { show: false },
                    series: [
                        {},
                        { stroke: '#0d6efd', width: 2, fill: 'rgba(13,110,253,.12)',
                          points: { show: false } }
                    ],
                    axes: [
                        // Two-line x ticks: HH:MM (the boater's priority) over DD/MM.
                        { stroke: axisStroke(), font: AXIS_FONT, size: 44, grid: { stroke: 'rgba(127,127,127,.15)' },
                          values: function (u, splits) {
                              return splits.map(function (s) {
                                  var d = new Date(s * 1000);
                                  return fmtTime(d) + '\n' + fmtDay(d);
                              });
                          } },
                        { stroke: axisStroke(), font: AXIS_FONT, grid: { stroke: 'rgba(127,127,127,.15)' },
                          values: function (u, vals) { return vals.map(function (v) { return v + ' ' + unit; }); } }
                    ],
                    hooks: {
                        // Blue "now" vertical line + the orange selection line, drawn
                        // each frame. Hover does NOT move the selection — only a
                        // click commits (see the click handler below), so the orange
                        // line sticks to the clicked time, not the pointer.
                        draw: [drawNowLine, drawSelMarker]
                    }
                };
                chart = new uPlot(opts, [xs, ys], host);
                // Commit the selection on CLICK (not hover): read uPlot's cursor
                // index at click time and move there. Hover still shows uPlot's own
                // cursor for feedback, but the orange line + map stay on the click.
                chart.over.addEventListener('click', function () {
                    if (chart && chart.cursor.idx != null) { setIdx(chart.cursor.idx); }
                });
                // Default selection = current time, clamped into the series' day.
                curIdx = nearestIdxToNow();
                lockCursor();
                chart.redraw(false, false);   // draw the selection marker at "now"
                redrawAuxCharts();            // sync wind/wave selected line to the new day
                bindReadoutKeys();
                updateReadout();
                updateWindBadge();   // show water height in the badge straight away
                // Paint the sea for "now" (the cursor's default position) as soon
                // as the series is loaded.
                updateSea();
                loadBrest();   // Brest curve → auto current overlay for this instant
                loadWindIfNeeded();   // wind for the on-map badge (independent of the Vent tab)
                loadWaveIfNeeded();   // waves for the on-map badge (independent of the Vagues tab)
            }).catch(function () {
                var h = document.getElementById('sv-tide-curve-head');
                if (h) { h.innerHTML = '<span class="sv-tide-err">' + esc(t('err.curve')) + '</span>'; }
            });
        }
        // --- Cursor / readout ------------------------------------------------
        // Default cursor position: the deep-link instant (tide_t) on the first
        // curve, consumed once; otherwise the sample nearest "now". Clamps to the
        // series ends when the target is outside the shown day.
        function nearestIdxToNow() {
            var target = Date.now();
            if (wantT != null) { target = wantT; wantT = null; }
            return nearestIdxTo(target);
        }
        function nearestIdxTo(ms) {
            if (!tide || !tide.points.length) { return 0; }
            var best = 0, bestD = Infinity;
            tide.points.forEach(function (p, i) {
                var d = Math.abs(p.t - ms);
                if (d < bestD) { bestD = d; best = i; }
            });
            return best;
        }
        // Commit a selection (from a click or the keyboard). Pins uPlot's cursor,
        // repaints the orange line, and updates the map. Hover does NOT call this.
        function setIdx(i) {
            if (!tide) { return; }
            var n = tide.points.length;
            i = Math.max(0, Math.min(n - 1, i | 0));
            if (i === curIdx) { return; }
            curIdx = i;
            updateReadout();
            lockCursor();
            if (chart) { chart.redraw(false, false); }   // refresh the orange line
            redrawAuxCharts();                            // keep wind/wave lines in sync
            updateSea();                                  // re-paint the sea (debounced)
            updateCurrent();                              // swap current overlay if hour changed
            updateWindBadge();                            // refresh the on-map wind badge
            reprobe();                                    // re-run an open depth probe for the new instant
            syncUrl();
        }
        // Reflect the current state in the address bar (URL = persistence): port,
        // selected instant, draft. replaceState preserves every other param. A
        // shared/bookmarked link reopens at this exact port + moment + draft.
        function syncUrl() {
            if (!port) { return; }
            var p = new URLSearchParams(window.location.search);
            if (!p.get('ext')) { p.set('ext', 'tide'); }   // so a shared link auto-loads the tool
            p.set('tide_port', port.site);
            if (draft > 0) { p.set('tide_draft', draft.toFixed(1)); } else { p.delete('tide_draft'); }
            var sel = selected();
            if (sel) {
                // local ISO 'YYYY-MM-DDTHH:MM' (no seconds, no zone — Europe/Paris)
                var d = new Date(sel.t);
                p.set('tide_t', isoDate(d) + 'T' +
                    ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2));
            }
            try { history.replaceState(null, '', window.location.pathname + '?' + p.toString()); } catch (e) { /* */ }
        }
        // Pin uPlot's visual cursor to curIdx (so keyboard moves show on the plot).
        // Only x matters for the vertical cursor line; top is the data y so the
        // hover point sits on the curve. valToPos returns CSS px (over: true).
        function lockCursor() {
            if (!chart || !tide) { return; }
            var left = chart.valToPos(tide.points[curIdx].t / 1000, 'x', true);
            var top  = chart.valToPos(Number(tide.points[curIdx].h), 'y', true);
            chart.setCursor({ left: left, top: top });
        }
        // --- Shared time markers (all three graphs share the same instants) -----
        // The blue "now" line and the orange "selected" line are GENERIC: any uPlot
        // whose x-axis is epoch SECONDS (tide, wind, wave) can host them. They read
        // the global instants (Date.now() and the committed selection) and clip to
        // the plot box. With canvas=true, valToPos returns DEVICE pixels, matching
        // u.bbox (also device px) — do NOT multiply by pxRatio again.
        function drawVLineAt(u, ms, color, widthPx) {
            if (ms == null) { return; }
            var s = ms / 1000;
            var data = u.data && u.data[0];
            if (!data || !data.length) { return; }
            if (s < data[0] || s > data[data.length - 1]) { return; }   // outside view
            var cx = Math.round(u.valToPos(s, 'x', true));
            var ctx = u.ctx;
            ctx.save();
            ctx.beginPath();
            ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
            ctx.clip();
            ctx.setLineDash([]);
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(1, widthPx * u.pxRatio);
            ctx.beginPath();
            ctx.moveTo(cx, u.bbox.top);
            ctx.lineTo(cx, u.bbox.top + u.bbox.height);
            ctx.stroke();
            ctx.restore();
        }
        // Blue = now (red reserved for the danger zone). Drawn from each chart's
        // `draw` hook after its series.
        function drawNowLine(u) { drawVLineAt(u, Date.now(), '#0d6efd', 1.5); }
        // Orange = the committed selected instant — the time that drives the map.
        // selectedMs() is the single source of truth, shared by all three graphs.
        function drawSelMarker(u) { drawVLineAt(u, selectedMs(), '#e8852b', 2); }
        // The committed selected instant (epoch ms), from the tide cursor. Null
        // until the tide series is loaded.
        function selectedMs() {
            return (tide && tide.points[curIdx]) ? tide.points[curIdx].t : null;
        }
        // Redraw the wind + wave graphs (if built) so their now/selected lines stay
        // in sync after a commit elsewhere. redraw(false,false) re-fires draw hooks
        // without recomputing the series.
        function redrawAuxCharts() {
            if (windChart) { windChart.redraw(false, false); }
            if (waveChart) { waveChart.redraw(false, false); }
        }
        // Commit an instant (epoch ms) from ANY graph. Same day as the loaded tide
        // series → just move the cursor. Different day → switch the tide day and let
        // the curve reload place the cursor (wantT), keeping tide + sea consistent.
        function commitInstant(ms) {
            if (!isFinite(ms)) { return; }
            var pts = tide && tide.points;
            if (pts && pts.length && ms >= pts[0].t && ms <= pts[pts.length - 1].t) {
                setIdx(nearestIdxTo(ms));   // same day → move cursor (redraws aux too)
            } else {
                // Other day: reload that day; wantT lands the cursor on this instant.
                curDate = new Date(ms);
                wantT = ms;
                requestDay();
            }
        }
        // Wire click-to-set-time on an aux graph's overlay: clicking commits the
        // hovered sample's instant (its x value), exactly like the tide graph.
        function bindAuxChartClick(chart, dataRef) {
            chart.over.addEventListener('click', function () {
                if (!chart || chart.cursor.idx == null) { return; }
                var d = dataRef();
                if (!d || !d.t || chart.cursor.idx >= d.t.length) { return; }
                commitInstant(d.t[chart.cursor.idx] * 1000);   // d.t is epoch seconds
            });
        }
        // The selected instant, in both datums. waterIGN69 = h_ZH + S (the whole
        // datum correction, shown to the user, never hidden).
        function selected() {
            if (!tide || !tide.points[curIdx]) { return null; }
            var p = tide.points[curIdx];
            var hZH = Number(p.h);
            var S   = port ? Number(port.S) : 0;
            return { t: p.t, hZH: hZH, ign: hZH + S, S: S };
        }
        function waterIGN69() { var s = selected(); return s ? s.ign : null; }
        // The numeric height now lives on the on-map badge; the readout stays only
        // as the KEYBOARD scrub control (role=slider). No visible numbers — just a
        // hint label — but ARIA still announces the selected time + IGN69 level.
        function updateReadout() {
            var el = document.getElementById('sv-tide-readout');
            var s  = selected();
            if (!el || !s) { return; }
            // No visible text (the on-map badge already shows time + height). The
            // element stays as a screen-reader keyboard scrub control only.
            el.setAttribute('aria-valuemin', '0');
            el.setAttribute('aria-valuemax', String(tide.points.length - 1));
            el.setAttribute('aria-valuenow', String(curIdx));
            el.setAttribute('aria-valuetext', hhmm(s.t) + ' — ' + s.ign.toFixed(2) + ' m IGN69');
        }
        function bindReadoutKeys() {
            var el = document.getElementById('sv-tide-readout');
            if (!el || el._tideBound) { return; }
            el._tideBound = true;
            // Arrow keys = ±1 sample; Home/End = day ends; PageUp/Down = ±1 hour.
            el.addEventListener('keydown', function (e) {
                if (!tide) { return; }
                var step = Math.max(1, Math.round(60 / (tide.step || 10)));   // samples per hour
                var d = 0;
                switch (e.key) {
                    case 'ArrowRight': case 'ArrowUp':   d = 1; break;
                    case 'ArrowLeft':  case 'ArrowDown': d = -1; break;
                    case 'PageUp':   d = step; break;
                    case 'PageDown': d = -step; break;
                    case 'Home': setIdx(0); e.preventDefault(); return;
                    case 'End':  setIdx(tide.points.length - 1); e.preventDefault(); return;
                    default: return;
                }
                e.preventDefault();
                setIdx(curIdx + d);
            });
        }
        function hhmm(ms) {
            var d = new Date(ms);
            return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
        }
        // Core fires this when the user drags the dock taller/shorter → resize the
        // plot to fill the new height.
        // Panel resized → re-fit every live chart to its (flex-grown) host. uPlot's
        // canvas is fixed until setSize is called, so each visible graph needs it.
        SViewer.on('sv:panelResize', function () {
            fitChart(chart, 'sv-tide-plot');
            fitChart(windChart, 'sv-tide-wind-plot');
            fitChart(waveChart, 'sv-tide-wave-plot');
        });
        function fitChart(c, hostId) {
            if (!c) { return; }
            var host = document.getElementById(hostId);
            if (!host || !host.clientWidth) { return; }   // hidden pane → 0 width, skip
            c.setSize({ width: host.clientWidth, height: Math.max(120, host.clientHeight) });
        }

        // --- M4: server-side sea via inline SLD ------------------------------
        // Zones at the water level `water` (m IGN69) and the boat's `draft`, on the
        // bathymetry. type=intervals = hard step; a pixel falls in the interval
        // whose quantity is its UPPER bound (sea-floor altitude). The SAFE water
        // (floor ≤ water-draft, i.e. ≥ draft of clearance under the keel) is graded
        // into a THREE-STEP blue ramp by clearance under the keel (c = water-draft-
        // floor): each step = +1 m more water under the keel. Highest blue = the
        // shallowest safe step (0–1 m under keel, current tone); navy = the deepest
        // (≥ 2 m under keel). Below the keel:
        //   (-∞ .. -50000]            → transparent  (nodata -99999)
        //   (.. water-draft-2]        → NAVY    ≥ 2 m clearance (deep, safest)
        //   (water-draft-2 .. -1]     → MID     1–2 m clearance
        //   (water-draft-1 .. -draft] → BLUE    0–1 m clearance (shallow but safe)
        //   (water-draft .. water]    → RED     submerged but < draft = grounding
        //   (water .. 20000]          → ORANGE  floor at/above water = exposed
        // draft = 0 collapses the red band → blue ramp (safe) vs orange (exposed).
        var SEA_BLUE   = '#1d6fdb';   // shallowest safe step (0–1 m under keel)
        var SEA_BLUE_2 = '#1450a8';   // 1–2 m under keel
        var SEA_NAVY   = '#0a2a6b';   // ≥ 2 m under keel (deepest, safest)
        var SEA_RED    = '#d9342b';
        var SEA_ORANGE = '#e8852b';
        var SEA_OPACITY = 0.6;
        function seaSLD(water, draft) {
            var W = Number(water);
            var D = Math.max(0, Number(draft) || 0);
            var K = W - D;   // keel-clearance datum: floor here = exactly draft of water
            function entry(color, q, op) {
                return '<ColorMapEntry color="' + color + '" quantity="' + (typeof q === 'number' ? q.toFixed(3) : q) + '" opacity="' + op + '"/>';
            }
            var cm = entry(SEA_NAVY, -50000, 0);             // nodata guard (-99999)
            // Three-step blue ramp over the safe water, +1 m clearance per step.
            cm += entry(SEA_NAVY, K - 2, SEA_OPACITY) +      // ≥ 2 m under keel
                  entry(SEA_BLUE_2, K - 1, SEA_OPACITY) +    // 1–2 m under keel
                  entry(SEA_BLUE,   K,     SEA_OPACITY);     // 0–1 m under keel
            if (D > 0) {
                cm += entry(SEA_RED, W, SEA_OPACITY);        // submerged but < draft
            }
            cm += entry(SEA_ORANGE, 20000, SEA_OPACITY);     // above water → orange
            return '<?xml version="1.0" encoding="UTF-8"?>' +
                '<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc">' +
                '<NamedLayer><Name>' + WMS_LAYER + '</Name>' +
                '<UserStyle><Name>sea</Name><FeatureTypeStyle><Rule>' +
                '<RasterSymbolizer><Opacity>1.0</Opacity>' +
                '<ColorMap type="intervals">' + cm + '</ColorMap>' +
                '</RasterSymbolizer>' +
                '</Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>';
        }
        // Create the OL WMS sea layer once (above background, below UI). SLD_BODY
        // carries the style inline; STYLES must be present (empty) for GeoServer to
        // honour SLD_BODY.
        //
        // TILED (512×512): on a wide hi-res screen a single full-view GetMap forces
        // GeoServer to render+threshold one huge image — slow and CPU-heavy. 512²
        // tiles split that into many small renders that run in parallel and cache
        // per tile (a scrub of the draft/cursor changes SLD_BODY → a fresh tile set,
        // but pan/zoom reuses tiles). A bigger tile than the default 256 halves the
        // request count for the same area. Trade-off vs the old ImageWMS: a failed
        // tile leaves a transparent hole instead of a whole-view miss — acceptable
        // for the perf win, and the bathymetry is already a coastal ribbon.
        function ensureSeaLayer() {
            if (seaLayer) { return; }
            // No crossOrigin: we never read the pixels (no canvas export), so a
            // tainted image is fine and we avoid a hard failure if the WMS omits
            // CORS headers.
            seaSrc = new ol.source.TileWMS({
                url: WMS_URL,
                params: { LAYERS: WMS_LAYER, STYLES: '', FORMAT: 'image/png', TRANSPARENT: true, TILED: true },
                tileGrid: ol.tilegrid.createXYZ({ tileSize: 512 }),
                transition: 0   // no fade — keep the sea in lock-step with the cursor
            });
            // Loading indicator: TileWMS fires tile load start/end/error per tile.
            // Count in-flight tiles (a scrub + a map move can overlap) and show the
            // spinner while any is pending.
            seaSrc.on('tileloadstart', function () { seaLoading++; updateSeaSpinner(); });
            seaSrc.on('tileloadend',   function () { seaLoading = Math.max(0, seaLoading - 1); updateSeaSpinner(); });
            seaSrc.on('tileloaderror', function () { seaLoading = Math.max(0, seaLoading - 1); updateSeaSpinner(); });
            seaLayer = new ol.layer.Tile({ source: seaSrc, zIndex: 850, opacity: 1 });
            map.addLayer(seaLayer);
        }
        var seaLoading = 0;
        function updateSeaSpinner() {
            var el = document.getElementById('sv-tide-spinner');
            if (el) { el.hidden = seaLoading <= 0; }
        }
        function removeSeaLayer() {
            if (seaLayer) { map.removeLayer(seaLayer); seaLayer = null; seaSrc = null; }
            seaLoading = 0; updateSeaSpinner();
        }
        // Re-render the sea at the current water level (cursor-derived
        // waterIGN69()). updateParams re-requests the WMS image at the new SLD
        // threshold. updateSea is DEBOUNCED: scrubbing the cursor fires on every
        // move/keypress — without this each one would launch a WMS GetMap.
        // Coalesce to the last value after a short idle so a fast scrub = one
        // request, not dozens.
        var SEA_DEBOUNCE = 160;   // ms idle before the WMS request
        function applySea() {
            // water_IGN69 = tide_ZH + S. Three zones: blue (≥ draft clearance),
            // red (submerged but < draft = grounding danger), orange (above water).
            var water = waterIGN69();
            if (water == null) { return; }
            ensureSeaLayer();
            seaSrc.updateParams({ SLD_BODY: seaSLD(water, draft) });
        }
        function updateSea() {
            if (seaTimer) { clearTimeout(seaTimer); }
            seaTimer = setTimeout(function () { seaTimer = null; applySea(); }, SEA_DEBOUNCE);
        }

        // --- Click-point depth probe -----------------------------------------
        // Click the map → GetFeatureInfo on the SAME bathymetry source we render
        // (seaSrc) to read the sea-floor altitude (GRAY_INDEX, IGN69) under the
        // pointer, then compute the water column for the selected instant exactly
        // like the SLD does: water_IGN69 = tide_ZH + S ; depth = water − floor ;
        // clearance under keel = depth − draft. A marker + popup show every number
        // with explicit ± signs, colour-coded to the map ramp.
        var PROBE_NODATA = -9000;   // bathy nodata is -99999; guard well below real depths
        function ensureProbe() {
            if (probeOverlay) { return; }
            probeMarkSrc = new ol.source.Vector();
            map.addLayer(new ol.layer.Vector({
                source: probeMarkSrc,
                style: new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 6,
                        fill: new ol.style.Fill({ color: '#e8852b' }),
                        stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
                    })
                }),
                zIndex: 870   // above sea/currents/seamarks
            }));
            var el = document.createElement('div');
            el.className = 'sv-tide-probe';
            el.hidden = true;
            probeOverlay = new ol.Overlay({
                element: el, positioning: 'bottom-center', offset: [0, -16],
                // stopEvent:false → the overlay container does NOT capture map
                // gestures (with true it swallowed pan/click on mobile). The close
                // button is a real DOM button → its click still fires.
                stopEvent: false
            });
            map.addOverlay(probeOverlay);
        }
        function removeProbe() {
            if (probeOverlay) { map.removeOverlay(probeOverlay); probeOverlay = null; }
            if (probeMarkSrc) { probeMarkSrc.clear(); probeMarkSrc = null; }
        }
        function hideProbe() {
            if (probeMarkSrc) { probeMarkSrc.clear(); }
            if (probeOverlay) {
                probeOverlay.setPosition(undefined);
                var el = probeOverlay.getElement();
                if (el) { el.hidden = true; }
            }
        }
        // Run a probe at a map coordinate (EPSG:3857). Needs the sea layer present
        // (it carries the bathy source + GetFeatureInfoUrl) and a tide selection.
        function probeAt(coord) {
            if (!seaSrc || waterIGN69() == null) { return; }
            ensureProbe();
            probeMarkSrc.clear();
            probeMarkSrc.addFeature(new ol.Feature(new ol.geom.Point(coord)));
            showProbe(coord, esc(t('probe.loading')));
            var seq = ++probeSeq;
            var url = seaSrc.getFeatureInfoUrl(
                coord, view.getResolution(), 'EPSG:3857',
                { INFO_FORMAT: 'application/json', FEATURE_COUNT: 1 }
            );
            if (!url) { renderProbe(coord, null); return; }
            fetch(url, { headers: { Accept: 'application/json' } })
                .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
                .then(function (j) {
                    if (seq !== probeSeq) { return; }   // superseded by a later click
                    var f = j && j.features && j.features[0];
                    var floor = f && f.properties ? firstNumeric(f.properties) : null;
                    renderProbe(coord, floor);
                })
                .catch(function () {
                    if (seq !== probeSeq) { return; }
                    showProbe(coord, '<span class="sv-tide-probe-err">' + esc(t('probe.err')) + '</span>');
                });
        }
        // Pull the first finite numeric property (GeoServer names it GRAY_INDEX, but
        // a coverage may expose a differently-named band) — robust to the band name.
        function firstNumeric(props) {
            var keys = Object.keys(props);
            for (var i = 0; i < keys.length; i++) {
                var v = Number(props[keys[i]]);
                if (isFinite(v)) { return v; }
            }
            return null;
        }
        // Build the depth read-out for a clicked point. floor = sea-floor altitude
        // (m IGN69) or null/nodata = no bathymetry here.
        function renderProbe(coord, floor) {
            probeLast = (floor != null && floor > PROBE_NODATA) ? { coord: coord, floor: floor } : null;
            if (floor == null || floor <= PROBE_NODATA) {
                // A data gap must NOT read as safe water — make it a loud caution.
                showProbe(coord,
                    '<div class="sv-tide-probe-warn">⚠ ' + esc(t('probe.nodata')) + '</div>' +
                    '<div class="sv-tide-probe-warnsub">' + esc(t('probe.nodata.sub')) + '</div>');
                return;
            }
            var water = waterIGN69();             // sea level, m IGN69 (tide_ZH + S)
            var depth = water - floor;            // water column above the floor (m)
            var D = Math.max(0, Number(draft) || 0);
            // Signed metre string, always with an explicit + or − and one decimal.
            // Round first, then sign — avoids a "−0.0 m" for a tiny negative value.
            function sgn(v) {
                var r = Math.round(v * 10) / 10;
                if (r === 0) { r = 0; }   // normalise -0 → 0
                return (r >= 0 ? '+' : '−') + Math.abs(r).toFixed(1) + ' m';
            }
            var rows =
                row(t('probe.floor'), sgn(floor) + ' <small>IGN69</small>', '') +
                row(t('probe.water'), sgn(water) + ' <small>IGN69</small>', '');
            if (depth > 0) {
                // Submerged: water depth (blue), then clearance under the keel.
                rows += row(t('probe.depth'), '+' + depth.toFixed(1) + ' m', 'sv-tide-probe-blue');
                if (D > 0) {
                    var clr = depth - D;          // > 0 safe, < 0 grounding
                    var cls = clr >= 0 ? 'sv-tide-probe-safe' : 'sv-tide-probe-danger';
                    var tag = clr < 0 ? ' <small>(' + esc(t('probe.aground')) + ')</small>' : '';
                    rows += row(t('probe.clearance'), sgn(clr) + tag, cls);
                }
            } else {
                // Floor at/above the sea level → exposed (orange), by how much.
                rows += row(t('probe.depth'),
                    '<span class="sv-tide-probe-dry">' + esc(t('probe.dry')) + ' (' + sgn(depth) + ')</span>', '');
            }
            showProbe(coord,
                '<div class="sv-tide-probe-h">' + esc(t('probe.title')) + ' · ' + esc(hhmm(selected().t)) + '</div>' +
                '<table class="sv-tide-probe-t">' + rows + '</table>');
        }
        function row(label, valHtml, cls) {
            return '<tr><th scope="row">' + esc(label) + '</th>' +
                   '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + valHtml + '</td></tr>';
        }
        function showProbe(coord, innerHtml) {
            ensureProbe();
            var el = probeOverlay.getElement();
            el.innerHTML =
                '<button type="button" class="sv-tide-probe-x" aria-label="' + esc(t('probe.close')) + '">×</button>' +
                innerHtml;
            el.hidden = false;
            var x = el.querySelector('.sv-tide-probe-x');
            if (x) { x.addEventListener('click', hideProbe); }
            probeOverlay.setPosition(coord);
        }
        // Recompute an open probe for the new instant/draft (the sea floor is fixed,
        // so no refetch — just re-run the water-column maths). No-op if none open.
        function reprobe() {
            if (probeLast && probeOverlay && !probeOverlay.getElement().hidden) {
                renderProbe(probeLast.coord, probeLast.floor);
            }
        }

        // --- Tidal currents (SHOM atlas, Brest-referenced, auto layer) -------
        // Fetch Brest's tide curve for the same window and cache, per day, its HW
        // times + range — the inputs to pick the right current layer. One extra
        // Open-Meteo call per window; cached so date stepping costs nothing.
        function loadBrest() {
            var date = isoDate(curDate);
            if (brestCache[date] !== undefined) { updateCurrent(); return; }   // cached (incl. null)
            // localStorage (Brest tide is deterministic → valid offline).
            var st = storeGet('brest.' + date);
            if (st !== undefined) { brestCache[date] = st.v; updateCurrent(); return; }
            var start = new Date(curDate); start.setDate(start.getDate() - WINDOW_BACK);
            var end   = new Date(curDate); end.setDate(end.getDate() + WINDOW_FWD);
            var url = OM_URL +
                '?latitude=' + BREST_LL[1] + '&longitude=' + BREST_LL[0] +
                '&minutely_15=sea_level_height_msl' +
                '&start_date=' + isoDate(start) + '&end_date=' + isoDate(end) +
                '&timezone=' + encodeURIComponent('Europe/Paris');
            fetch(url, { headers: { Accept: 'application/json' } })
                .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
                .then(function (j) {
                    var byDay = splitByDay(j);
                    var d = new Date(start);
                    while (d <= end) {
                        var ds = isoDate(d);
                        var bd = brestDay(byDay[ds]);
                        brestCache[ds] = bd;
                        storeSet('brest.' + ds, bd);
                        d.setDate(d.getDate() + 1);
                    }
                    updateCurrent();
                })
                .catch(function () { /* currents are a bonus — fail silently */ });
        }
        // Reduce one day's raw {t,msl}[] to HW timestamps + tidal range.
        function brestDay(raw) {
            if (!raw || raw.length < 3) { return null; }
            var highs = [], min = Infinity, max = -Infinity;
            for (var i = 0; i < raw.length; i++) {
                if (raw[i].msl < min) { min = raw[i].msl; }
                if (raw[i].msl > max) { max = raw[i].msl; }
            }
            for (var k = 1; k < raw.length - 1; k++) {
                if (raw[k].msl >= raw[k - 1].msl && raw[k].msl >= raw[k + 1].msl) {
                    highs.push(raw[k].t); k += 6;
                }
            }
            return { highs: highs, range: max - min };
        }
        // Choose the SHOM current layer id for an instant (epoch ms): spring/neap
        // from Brest's day range, offset = round(instant − nearest Brest HW) in
        // hours, clamped ±6. Returns the layer identifier or null.
        function pickCurrentLayer(ms) {
            var bd = brestCache[isoDate(new Date(ms))];
            if (!bd || !bd.highs.length) { return null; }
            var cond = bd.range >= BREST_RANGE_SPRING ? 'VE' : 'ME';
            var nearest = bd.highs[0], best = Infinity;
            bd.highs.forEach(function (hw) {
                var dd = Math.abs(hw - ms);
                if (dd < best) { best = dd; nearest = hw; }
            });
            var off = Math.round((ms - nearest) / 3600000);   // hours from HW
            off = Math.max(-6, Math.min(6, off));
            var phase = off === 0 ? 'PM' : (off > 0 ? 'AP' + off : 'AV' + (-off));
            return 'COURANTS2D_WMTS_' + cond + phase + '_3857';
        }
        function ensureCurrentLayer(id) {
            if (curLayer && curId === id) { return; }
            removeCurrentLayer();
            var proj = ol.proj.get('EPSG:3857');
            var src = new ol.source.WMTS({
                url: CUR_WMTS, layer: id, matrixSet: '3857', format: 'image/png',
                projection: proj, style: 'normal', requestEncoding: 'KVP',
                tileGrid: wmtsGrid3857(),
                attributions: [CUR_SRC]
            });
            curLayer = new ol.layer.Tile({ source: src, zIndex: 855, opacity: 0.85 });
            map.addLayer(curLayer);
            curId = id;
        }
        function removeCurrentLayer() {
            if (curLayer) { map.removeLayer(curLayer); curLayer = null; curId = null; }
        }
        // Seamark overlay (OpenSeaMap). Static, time-independent → added once on
        // open, removed on close. zIndex 860 = above sea (850) and currents (855)
        // so navigation marks stay readable. maxZoom caps requests at z18 (the
        // overlay's published range); OL over-zooms beyond that without 404s.
        function ensureSeamarkLayer() {
            if (markLayer) { return; }
            var src = new ol.source.XYZ({
                url: SEAMARK_URL, maxZoom: SEAMARK_MAXZ,
                attributions: [SEAMARK_SRC], crossOrigin: 'anonymous'
            });
            markLayer = new ol.layer.Tile({ source: src, zIndex: 860 });
            map.addLayer(markLayer);
        }
        function removeSeamarkLayer() {
            if (markLayer) { map.removeLayer(markLayer); markLayer = null; }
        }
        // Swap the current overlay to match the selected instant. Called on every
        // cursor commit (cheap: a no-op when the layer id is unchanged).
        function updateCurrent() {
            var s = selected();
            if (!s) { return; }
            var id = pickCurrentLayer(s.t);
            if (!id) { removeCurrentLayer(); return; }
            ensureCurrentLayer(id);
        }
        // Standard EPSG:3857 WMTS grid (20 zooms) — matches the SHOM matrixset.
        // The current atlas only publishes matrices 0..13 (it is a coarse regional
        // field). Build the grid to z13 ONLY — requesting z14+ would 404. Above
        // z13 OL over-zooms the z13 tile (the current field just looks coarser,
        // which is honest: the data IS coarse).
        var CUR_MAXZ = 13;
        var _wmtsGrid = null;
        function wmtsGrid3857() {
            if (_wmtsGrid) { return _wmtsGrid; }
            var ext = ol.proj.get('EPSG:3857').getExtent();
            var res = [], mat = [], r0 = 156543.03392804097;
            for (var z = 0; z <= CUR_MAXZ; z++) { res.push(r0 / Math.pow(2, z)); mat.push(String(z)); }
            _wmtsGrid = new ol.tilegrid.WMTS({
                origin: ol.extent.getTopLeft(ext), resolutions: res, matrixIds: mat
            });
            return _wmtsGrid;
        }

        // --- Wind forecast (Open-Meteo AROME) --------------------------------
        // Loaded once per port (eagerly, after the tide curve, so the on-map badge
        // works without opening the Vent tab). The chart renders only when the Vent
        // tab is visible; the badge updates with the tide cursor.
        function loadWindIfNeeded() { if (!windLoaded) { windLoaded = true; loadWind(); } }
        function openWind() {
            loadWindIfNeeded();
            if (windChart) {
                var host = document.getElementById('sv-tide-wind-plot');
                if (host) { windChart.setSize({ width: host.clientWidth, height: Math.max(120, host.clientHeight) }); }
            } else if (windData) { renderWind(); }   // data ready but chart not built yet
        }
        function resetWind() {
            windLoaded = false; windData = null;
            if (windChart) { try { windChart.destroy(); } catch (e) { /* */ } windChart = null; }
            updateWindBadge();
        }
        function windPaneVisible() {
            var p = document.getElementById('sv-tide-pane-wind');
            return p && !p.hidden;
        }
        var WIND_FRESH_MS = 3 * 3600 * 1000;   // < 3 h old → skip the network
        function windKey() { return 'wind.' + (port ? port.site : '?'); }
        function useWind(d, ts) {
            windData = d; windFetchedAt = ts || Date.now();
            updateWindFoot();   // Données source/age line (independent of the Vent chart)
            if (windPaneVisible()) { renderWind(); }
            updateWindBadge();
        }
        function loadWind() {
            if (!port) { return; }
            // Cache-first: a fresh (<3 h) stored forecast or being offline → use the
            // cache, skip the network. Wind is a forecast, so we stamp + show its age.
            var stored = storeGet(windKey());
            var fresh  = stored && (Date.now() - stored._ts) < WIND_FRESH_MS;
            if (stored && (fresh || navigator.onLine === false)) {
                useWind(stored.v, stored._ts);
                if (fresh) { return; }   // offline+stale: shown, but still try below
            }
            var ll = ol.proj.toLonLat([port.x, port.y]);
            var url = WIND_URL +
                '?latitude=' + encodeURIComponent(ll[1].toFixed(4)) +
                '&longitude=' + encodeURIComponent(ll[0].toFixed(4)) +
                '&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m' +
                '&wind_speed_unit=kmh&timezone=' + encodeURIComponent('Europe/Paris') +
                '&forecast_days=5';
            fetch(url, { headers: { Accept: 'application/json' } })
                .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
                .then(function (j) {
                    var h = j && j.hourly;
                    if (!h || !Array.isArray(h.time)) { return Promise.reject('empty'); }
                    var d = { t: [], spd: [], gust: [], dir: [] };
                    for (var i = 0; i < h.time.length; i++) {
                        var ts = parseLocal(h.time[i]);
                        var sp = Number(h.wind_speed_10m[i]);
                        if (!isFinite(ts) || !isFinite(sp)) { continue; }
                        d.t.push(ts / 1000);
                        d.spd.push(sp);
                        d.gust.push(numOrNull(h.wind_gusts_10m[i]));
                        d.dir.push(numOrNull(h.wind_direction_10m[i]));
                    }
                    if (!d.t.length) { return Promise.reject('empty'); }
                    storeSet(windKey(), d);
                    useWind(d, Date.now());
                })
                .catch(function () {
                    // Network failed → fall back to any stored forecast (offline use).
                    var st = storeGet(windKey());
                    if (st) { useWind(st.v, st._ts); return; }
                    var hh = document.getElementById('sv-tide-wind-plot');
                    if (hh) { hh.innerHTML = '<p class="sv-tide-err">' + esc(t('wind.err')) + '</p>'; }
                });
        }
        // Fill the wind provenance/age line (in Données). Independent of the chart
        // so it shows even when the Vent tab was never opened.
        function updateWindFoot() {
            var foot = document.getElementById('sv-tide-wind-foot');
            if (!foot) { return; }
            if (!windData) { foot.textContent = ''; return; }
            var ageH = (Date.now() - windFetchedAt) / 3600000;
            var when = windFetchedAt ? (isoDate(new Date(windFetchedAt)) + ' ' + hhmm(windFetchedAt)) : '?';
            var stale = ageH > 6 ? ' <em class="sv-tide-stale">' + esc(t('wind.stale')) + '</em>' : '';
            foot.innerHTML = esc(t('prov.source')) + ' : ' + srcLink(WIND_SRC) +
                ' — ' + esc(t('wind.fetched', { when: when })) + stale;
        }
        function renderWind() {
            var host = document.getElementById('sv-tide-wind-plot');
            updateWindFoot();
            if (!host || !windData) { return; }
            loadUplot().then(function (uPlot) {
                var h2 = document.getElementById('sv-tide-wind-plot');
                if (!h2 || !windData) { return; }
                if (windChart) { try { windChart.destroy(); } catch (e) { /* */ } windChart = null; }
                h2.innerHTML = '';
                var fmtTime = uPlot.fmtDate('{HH}:{mm}');
                var fmtDay  = uPlot.fmtDate('{DD}/{MM}');
                var w = h2.clientWidth || 320;
                var hgt = Math.max(140, h2.clientHeight || 180);
                var opts = {
                    width: w, height: hgt,
                    legend: { show: false },
                    // No drag-zoom; hover shows a point, click commits the instant.
                    cursor: { drag: { x: false, y: false }, points: { show: true } },
                    scales: { x: { time: true } },
                    series: [
                        {},
                        { label: t('wind.spd'),  stroke: '#0d6efd', width: 2, fill: 'rgba(13,110,253,.14)', points: { show: false } },
                        { label: t('wind.gust'), stroke: '#d9342b', width: 1.5, points: { show: false } }
                    ],
                    axes: [
                        // Two-line x ticks: HH:MM over DD/MM (hour first = boater priority).
                        { stroke: axisStroke(), font: AXIS_FONT, size: 44, grid: { stroke: 'rgba(127,127,127,.15)' },
                          values: function (u, splits) {
                              return splits.map(function (s) {
                                  var d = new Date(s * 1000);
                                  return fmtTime(d) + '\n' + fmtDay(d);
                              });
                          } },
                        // Knots on the ticks (no legend) — the sailor's unit.
                        { stroke: axisStroke(), font: AXIS_FONT, size: 52, grid: { stroke: 'rgba(127,127,127,.15)' },
                          values: function (u, vals) { return vals.map(function (v) { return v + ' kn'; }); } }
                    ],
                    hooks: { draw: [drawBeaufort, drawWindArrows, drawNowLine, drawSelMarker] }
                };
                // Plot in knots (data is stored km/h → convert for display).
                windChart = new uPlot(opts,
                    [windData.t, windData.spd.map(kmhToKt), windData.gust.map(toKtOrNull)], h2);
                bindAuxChartClick(windChart, function () { return windData; });
            }).catch(function () {
                var hh = document.getElementById('sv-tide-wind-plot');
                if (hh) { hh.innerHTML = '<p class="sv-tide-err">' + esc(t('err.curve')) + '</p>'; }
            });
        }
        // Beaufort scale: upper wind-speed bound (km/h) of each force 0–11. A
        // horizontal reference line is drawn at each bound that falls inside the
        // plot's y-range, labelled with the force number it tops — so the reader
        // sees at a glance which Beaufort band the wind/gust curve sits in.
        var BEAUFORT = [
            { f: 0, kmh: 1 },   { f: 1, kmh: 5 },   { f: 2, kmh: 11 },
            { f: 3, kmh: 19 },  { f: 4, kmh: 28 },  { f: 5, kmh: 38 },
            { f: 6, kmh: 49 },  { f: 7, kmh: 61 },  { f: 8, kmh: 74 },
            { f: 9, kmh: 88 },  { f: 10, kmh: 102 }, { f: 11, kmh: 117 }
        ];
        function drawBeaufort(u) {
            var ctx = u.ctx, pr = u.pxRatio || 1;
            var y0 = u.scales.y.min, y1 = u.scales.y.max;
            if (y0 == null || y1 == null) { return; }
            var left = u.bbox.left, right = u.bbox.left + u.bbox.width;
            ctx.save();
            ctx.setLineDash([]);                          // solid lines
            ctx.lineWidth = Math.max(1, 1.5 * pr);        // ×2 thicker (mobile-legible)
            ctx.strokeStyle = 'rgba(13,110,253,.7)';      // blue (wind tint)
            ctx.fillStyle = '#0d6efd';                    // same blue, bold labels
            ctx.font = '700 ' + (18 * pr) + 'px sans-serif';   // ×2 bigger
            ctx.textBaseline = 'bottom';
            for (var i = 0; i < BEAUFORT.length; i++) {
                var v = kmhToKt(BEAUFORT[i].kmh);            // y-axis is knots
                if (v <= y0 || v >= y1) { continue; }        // outside visible range
                var y = u.valToPos(v, 'y', true);
                ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
                // Force label of the band BELOW this line (the band it tops).
                ctx.fillText(t('wind.bf', { f: BEAUFORT[i].f }), left + 3 * pr, y - 1 * pr);
            }
            ctx.restore();
        }
        // Wind-direction arrows along the bottom of the plot — a small glyph every
        // ~3 h pointing where the wind blows TO (meteo dir = FROM, so +180°).
        function drawWindArrows(u) {
            if (!windData) { return; }
            var ctx = u.ctx, n = windData.t.length;
            var pr = u.pxRatio || 1;
            var step = Math.max(1, Math.round(n / 24));   // ~24 arrows across
            // A band just inside the top of the plot (clear of the x-axis labels).
            var y = u.bbox.top + 18 * pr;
            var len = 14 * pr;
            ctx.save();
            ctx.strokeStyle = '#0d6efd';
            ctx.fillStyle = '#0d6efd';
            ctx.lineWidth = Math.max(2.4, 2.8 * pr);
            ctx.lineCap = 'round';
            ctx.setLineDash([]);   // clear any dash left by the gust series
            for (var i = 0; i < n; i += step) {
                var dir = windData.dir[i];
                if (dir == null) { continue; }
                var cx = u.valToPos(windData.t[i], 'x', true);
                if (cx < u.bbox.left || cx > u.bbox.left + u.bbox.width) { continue; }
                // Meteo direction = wind FROM; the arrow points TO (+180°).
                var a = (dir + 180) * Math.PI / 180;
                var ux = Math.sin(a), uy = -Math.cos(a);     // unit vector "to"
                var tipx = cx + ux * len, tipy = y + uy * len;
                var tailx = cx - ux * len, taily = y - uy * len;
                // shaft
                ctx.beginPath(); ctx.moveTo(tailx, taily); ctx.lineTo(tipx, tipy); ctx.stroke();
                // arrowhead (two barbs at the tip)
                var ha = 0.5, hl = 8 * pr;
                ctx.beginPath();
                ctx.moveTo(tipx, tipy);
                ctx.lineTo(tipx - (ux * Math.cos(ha) - uy * Math.sin(ha)) * hl,
                           tipy - (ux * Math.sin(ha) + uy * Math.cos(ha)) * hl);
                ctx.moveTo(tipx, tipy);
                ctx.lineTo(tipx - (ux * Math.cos(-ha) - uy * Math.sin(-ha)) * hl,
                           tipy - (ux * Math.sin(-ha) + uy * Math.cos(-ha)) * hl);
                ctx.stroke();
            }
            ctx.restore();
        }
        // Nearest wind sample (hourly) to an instant (epoch ms). Returns
        // { spd, gust, dir } or null.
        function windAt(ms) {
            if (!windData || !windData.t.length) { return null; }
            var s = ms / 1000, best = 0, bestD = Infinity;
            for (var i = 0; i < windData.t.length; i++) {
                var dd = Math.abs(windData.t[i] - s);
                if (dd < bestD) { bestD = dd; best = i; }
            }
            return { spd: windData.spd[best], gust: windData.gust[best], dir: windData.dir[best] };
        }

        // --- Wave forecast (Open-Meteo Marine) -------------------------------
        // Same provider/endpoint as the tide (keyless, CORS-direct). Loaded once per
        // port — eagerly for the on-map badge, lazily rendered when the Vagues tab is
        // open. Mirrors the wind flow. Global wave model → coarse near sheltered
        // coasts; honest as "vague au large".
        var WAVE_FRESH_MS = 3 * 3600 * 1000;   // < 3 h old → skip the network
        function waveKey() { return 'wave.' + (port ? port.site : '?'); }
        function loadWaveIfNeeded() { if (!waveLoaded) { waveLoaded = true; loadWave(); } }
        function openWave() {
            loadWaveIfNeeded();
            if (waveChart) {
                var host = document.getElementById('sv-tide-wave-plot');
                if (host) { waveChart.setSize({ width: host.clientWidth, height: Math.max(120, host.clientHeight) }); }
            } else if (waveData) { renderWave(); }
        }
        function resetWave() {
            waveLoaded = false; waveData = null;
            if (waveChart) { try { waveChart.destroy(); } catch (e) { /* */ } waveChart = null; }
            updateWindBadge();   // badge shows wave height too
        }
        function wavePaneVisible() {
            var p = document.getElementById('sv-tide-pane-wave');
            return p && !p.hidden;
        }
        function useWave(d, ts) {
            waveData = d; waveFetchedAt = ts || Date.now();
            updateWaveFoot();
            if (wavePaneVisible()) { renderWave(); }
            updateWindBadge();
        }
        function loadWave() {
            if (!port) { return; }
            var stored = storeGet(waveKey());
            var fresh  = stored && (Date.now() - stored._ts) < WAVE_FRESH_MS;
            if (stored && (fresh || navigator.onLine === false)) {
                useWave(stored.v, stored._ts);
                if (fresh) { return; }
            }
            var ll = ol.proj.toLonLat([port.x, port.y]);
            var url = OM_URL +
                '?latitude=' + encodeURIComponent(ll[1].toFixed(4)) +
                '&longitude=' + encodeURIComponent(ll[0].toFixed(4)) +
                '&hourly=wave_height,wave_direction,wave_period,swell_wave_height' +
                '&timezone=' + encodeURIComponent('Europe/Paris') +
                '&forecast_days=5';
            fetch(url, { headers: { Accept: 'application/json' } })
                .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
                .then(function (j) {
                    var h = j && j.hourly;
                    if (!h || !Array.isArray(h.time)) { return Promise.reject('empty'); }
                    var d = { t: [], h: [], swell: [], per: [], dir: [] };
                    for (var i = 0; i < h.time.length; i++) {
                        var ts = parseLocal(h.time[i]);
                        var hv = Number(h.wave_height[i]);
                        if (!isFinite(ts) || !isFinite(hv)) { continue; }
                        d.t.push(ts / 1000);
                        d.h.push(hv);
                        d.swell.push(numOrNull(h.swell_wave_height[i]));
                        d.per.push(numOrNull(h.wave_period[i]));
                        d.dir.push(numOrNull(h.wave_direction[i]));
                    }
                    if (!d.t.length) { return Promise.reject('empty'); }
                    storeSet(waveKey(), d);
                    useWave(d, Date.now());
                })
                .catch(function () {
                    var st = storeGet(waveKey());
                    if (st) { useWave(st.v, st._ts); return; }
                    var hh = document.getElementById('sv-tide-wave-plot');
                    if (hh) { hh.innerHTML = '<p class="sv-tide-err">' + esc(t('wave.err')) + '</p>'; }
                });
        }
        // Wave provenance/age line (in Données), independent of the chart.
        function updateWaveFoot() {
            var foot = document.getElementById('sv-tide-wave-foot');
            if (!foot) { return; }
            if (!waveData) { foot.textContent = ''; return; }
            var ageH = (Date.now() - waveFetchedAt) / 3600000;
            var when = waveFetchedAt ? (isoDate(new Date(waveFetchedAt)) + ' ' + hhmm(waveFetchedAt)) : '?';
            var stale = ageH > 6 ? ' <em class="sv-tide-stale">' + esc(t('wave.stale')) + '</em>' : '';
            foot.innerHTML = esc(t('prov.source')) + ' : ' + srcLink(WAVE_SRC) +
                ' — ' + esc(t('wave.fetched', { when: when })) + stale;
        }
        function renderWave() {
            var host = document.getElementById('sv-tide-wave-plot');
            updateWaveFoot();
            if (!host || !waveData) { return; }
            loadUplot().then(function (uPlot) {
                var h2 = document.getElementById('sv-tide-wave-plot');
                if (!h2 || !waveData) { return; }
                if (waveChart) { try { waveChart.destroy(); } catch (e) { /* */ } waveChart = null; }
                h2.innerHTML = '';
                var fmtTime = uPlot.fmtDate('{HH}:{mm}');
                var fmtDay  = uPlot.fmtDate('{DD}/{MM}');
                var w = h2.clientWidth || 320;
                var hgt = Math.max(140, h2.clientHeight || 180);
                var opts = {
                    width: w, height: hgt,
                    legend: { show: false },
                    // No drag-zoom; hover shows a point, click commits the instant.
                    cursor: { drag: { x: false, y: false }, points: { show: true } },
                    scales: { x: { time: true } },
                    series: [
                        {},
                        { label: t('wave.h'),     stroke: '#1d6fdb', width: 2, fill: 'rgba(29,111,219,.14)', points: { show: false } },
                        { label: t('wave.swell'), stroke: '#0a2a6b', width: 1.5, points: { show: false } }
                    ],
                    axes: [
                        // Two-line x ticks: HH:MM over DD/MM (hour first = boater priority).
                        { stroke: axisStroke(), font: AXIS_FONT, size: 44, grid: { stroke: 'rgba(127,127,127,.15)' },
                          values: function (u, splits) {
                              return splits.map(function (s) {
                                  var d = new Date(s * 1000);
                                  return fmtTime(d) + '\n' + fmtDay(d);
                              });
                          } },
                        // metres on the ticks (no legend); wide gutter so never clipped.
                        { stroke: axisStroke(), font: AXIS_FONT, size: 52, grid: { stroke: 'rgba(127,127,127,.15)' },
                          values: function (u, vals) { return vals.map(function (v) { return v + ' m'; }); } }
                    ],
                    hooks: { draw: [drawWaveArrows, drawNowLine, drawSelMarker] }
                };
                waveChart = new uPlot(opts, [waveData.t, waveData.h, waveData.swell], h2);
                bindAuxChartClick(waveChart, function () { return waveData; });
            }).catch(function () {
                var hh = document.getElementById('sv-tide-wave-plot');
                if (hh) { hh.innerHTML = '<p class="sv-tide-err">' + esc(t('err.curve')) + '</p>'; }
            });
        }
        // Wave-direction arrows along the top of the plot — pointing where the waves
        // travel TO (model direction = FROM, so +180°), like the wind arrows.
        function drawWaveArrows(u) {
            if (!waveData) { return; }
            var ctx = u.ctx, n = waveData.t.length;
            var pr = u.pxRatio || 1;
            var step = Math.max(1, Math.round(n / 24));
            var y = u.bbox.top + 18 * pr;
            var len = 14 * pr;
            ctx.save();
            ctx.strokeStyle = '#1d6fdb';
            ctx.fillStyle = '#1d6fdb';
            ctx.lineWidth = Math.max(2.4, 2.8 * pr);
            ctx.lineCap = 'round';
            ctx.setLineDash([]);   // clear any dash left by the swell series
            for (var i = 0; i < n; i += step) {
                var dir = waveData.dir[i];
                if (dir == null) { continue; }
                var cx = u.valToPos(waveData.t[i], 'x', true);
                if (cx < u.bbox.left || cx > u.bbox.left + u.bbox.width) { continue; }
                var a = (dir + 180) * Math.PI / 180;
                var ux = Math.sin(a), uy = -Math.cos(a);
                var tipx = cx + ux * len, tipy = y + uy * len;
                var tailx = cx - ux * len, taily = y - uy * len;
                ctx.beginPath(); ctx.moveTo(tailx, taily); ctx.lineTo(tipx, tipy); ctx.stroke();
                var ha = 0.5, hl = 8 * pr;
                ctx.beginPath();
                ctx.moveTo(tipx, tipy);
                ctx.lineTo(tipx - (ux * Math.cos(ha) - uy * Math.sin(ha)) * hl,
                           tipy - (ux * Math.sin(ha) + uy * Math.cos(ha)) * hl);
                ctx.moveTo(tipx, tipy);
                ctx.lineTo(tipx - (ux * Math.cos(-ha) - uy * Math.sin(-ha)) * hl,
                           tipy - (ux * Math.sin(-ha) + uy * Math.cos(-ha)) * hl);
                ctx.stroke();
            }
            ctx.restore();
        }
        // Nearest wave sample (hourly) to an instant. Returns { h, swell, per, dir }.
        function waveAt(ms) {
            if (!waveData || !waveData.t.length) { return null; }
            var s = ms / 1000, best = 0, bestD = Infinity;
            for (var i = 0; i < waveData.t.length; i++) {
                var dd = Math.abs(waveData.t[i] - s);
                if (dd < bestD) { bestD = dd; best = i; }
            }
            return { h: waveData.h[best], swell: waveData.swell[best], per: waveData.per[best], dir: waveData.dir[best] };
        }
        // On-map badge (top-centre): water height + wind for the tide cursor's
        // selected instant — so the key info stays visible even when the bottom
        // panel is hidden. Updated on every cursor commit and when wind reloads.
        function updateWindBadge() {
            var el = document.getElementById('sv-tide-windbadge');
            if (!el) { return; }
            var s = selected();
            if (!s) { el.hidden = true; return; }   // no tide selection → nothing to show
            el.hidden = false;
            // Date over time, two lines.
            var when = '<span class="sv-tide-wb-when">' +
                '<span class="sv-tide-wb-date">' + esc(isoDate(new Date(s.t))) + '</span>' +
                '<span class="sv-tide-wb-time">' + esc(hhmm(s.t)) + '</span></span>' +
                '<span class="sv-tide-wb-sep" aria-hidden="true"></span>';
            // Water height on the chart datum (the annuaire value boaters read).
            var water = '<span class="sv-tide-wb-water">' +
                '<svg class="sv-tide-wb-wave" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
                  '<path d="M.5 11a3 3 0 0 1 2.1.9 2 2 0 0 0 2.8 0 3 3 0 0 1 4.2 0 2 2 0 0 0 2.8 0A3 3 0 0 1 15.5 11a.5.5 0 0 1 0 1 2 2 0 0 0-1.4.6 3 3 0 0 1-4.2 0 2 2 0 0 0-2.8 0 3 3 0 0 1-4.2 0A2 2 0 0 0 .5 12a.5.5 0 0 1 0-1"/></svg>' +
                esc(s.hZH.toFixed(1)) + ' <small>m</small></span>';
            // Wind (optional — may not be loaded yet / outside AROME).
            var w = windAt(s.t);
            var wind = '';
            if (w && w.spd != null) {
                var rot = (w.dir == null) ? 0 : (w.dir + 180);
                var gust = (w.gust != null)
                    ? ' <span class="sv-tide-wb-gust">(' + esc(Math.round(kmhToKt(w.gust))) + ')</span>' : '';
                wind =
                    '<span class="sv-tide-wb-sep" aria-hidden="true"></span>' +
                    // Wind identifier glyph (bi-wind) — names the segment at a glance.
                    '<svg class="sv-tide-wb-windicon" width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
                      '<path d="M12.5 2A2.5 2.5 0 0 0 10 4.5a.5.5 0 0 1-1 0A3.5 3.5 0 1 1 12.5 8H.5a.5.5 0 0 1 0-1h12a2.5 2.5 0 0 0 0-5m-7 1a1 1 0 0 0-1 1 .5.5 0 0 1-1 0 2 2 0 1 1 2 2h-5a.5.5 0 0 1 0-1h5a1 1 0 0 0 0-2M0 9.5A.5.5 0 0 1 .5 9h10.042a3 3 0 1 1-3 3 .5.5 0 0 1 1 0 2 2 0 1 0 2-2H.5a.5.5 0 0 1-.5-.5"/></svg>' +
                    '<svg class="sv-tide-wb-arrow" style="transform:rotate(' + rot.toFixed(0) + 'deg)" ' +
                         'width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
                      '<path d="M8 0 4 7h3v9h2V7h3z"/></svg>' +
                    '<span class="sv-tide-wb-spd">' + esc(Math.round(kmhToKt(w.spd))) + gust + ' <small>kn</small></span>';
            }
            // Wave (optional). Significant height + a direction arrow (travel TO).
            var wv = waveAt(s.t);
            var wave = '';
            if (wv && wv.h != null) {
                var wrot = (wv.dir == null) ? 0 : (wv.dir + 180);
                var per = (wv.per != null)
                    ? ' <span class="sv-tide-wb-per">' + esc(Math.round(wv.per)) + ' s</span>' : '';
                wave =
                    '<span class="sv-tide-wb-sep" aria-hidden="true"></span>' +
                    // Wave identifier glyph (wavy lines) — names the segment at a glance.
                    '<svg class="sv-tide-wb-waveicon" width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
                      '<path d="M.5 11a3 3 0 0 1 2.1.9 2 2 0 0 0 2.8 0 3 3 0 0 1 4.2 0 2 2 0 0 0 2.8 0A3 3 0 0 1 15.5 11a.5.5 0 0 1 0 1 2 2 0 0 0-1.4.6 3 3 0 0 1-4.2 0 2 2 0 0 0-2.8 0 3 3 0 0 1-4.2 0A2 2 0 0 0 .5 12a.5.5 0 0 1 0-1m0-4a3 3 0 0 1 2.1.9 2 2 0 0 0 2.8 0 3 3 0 0 1 4.2 0 2 2 0 0 0 2.8 0A3 3 0 0 1 15.5 7a.5.5 0 0 1 0 1 2 2 0 0 0-1.4.6 3 3 0 0 1-4.2 0 2 2 0 0 0-2.8 0 3 3 0 0 1-4.2 0A2 2 0 0 0 .5 8a.5.5 0 0 1 0-1"/></svg>' +
                    '<svg class="sv-tide-wb-warrow" style="transform:rotate(' + wrot.toFixed(0) + 'deg)" ' +
                         'width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
                      '<path d="M8 0 4 7h3v9h2V7h3z"/></svg>' +
                    '<span class="sv-tide-wb-wh">' + esc(wv.h.toFixed(1)) + ' <small>m</small>' + per + '</span>';
            }
            el.innerHTML = when + water + wind + wave;
            el.setAttribute('aria-label', t('badge.aria', {
                h: s.hZH.toFixed(1),
                spd: (w && w.spd != null) ? Math.round(kmhToKt(w.spd)) : '?',
                dir: (w && w.dir != null) ? Math.round(w.dir) : '?'
            }));
        }

        // --- Toolbar button + zoom gate --------------------------------------
        var toolbar = document.getElementById('sv-panel-controls');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-dark sv-map-btn sv-alt-toggle';
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', t('btn.title'));
        btn.title = t('btn.title');
        // Inline SVG (water/wave — bi tsunami-ish) — not relying on the icon subset.
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
            '<path d="M.036 3.314a.5.5 0 0 1 .65-.278l1.757.703a1.5 1.5 0 0 0 1.114 0l1.733-.694a2.5 2.5 0 0 1 1.857 0l1.733.694a1.5 1.5 0 0 0 1.114 0l1.733-.694a2.5 2.5 0 0 1 1.857 0l1.757.703a.5.5 0 1 1-.372.928l-1.757-.703a1.5 1.5 0 0 0-1.114 0l-1.733.694a2.5 2.5 0 0 1-1.857 0l-1.733-.694a1.5 1.5 0 0 0-1.114 0l-1.733.694a2.5 2.5 0 0 1-1.857 0L.314 3.964a.5.5 0 0 1-.278-.65m0 4a.5.5 0 0 1 .65-.278l1.757.703a1.5 1.5 0 0 0 1.114 0l1.733-.694a2.5 2.5 0 0 1 1.857 0l1.733.694a1.5 1.5 0 0 0 1.114 0l1.733-.694a2.5 2.5 0 0 1 1.857 0l1.757.703a.5.5 0 1 1-.372.928l-1.757-.703a1.5 1.5 0 0 0-1.114 0l-1.733.694a2.5 2.5 0 0 1-1.857 0l-1.733-.694a1.5 1.5 0 0 0-1.114 0l-1.733.694a2.5 2.5 0 0 1-1.857 0L.314 7.964a.5.5 0 0 1-.278-.65m0 4a.5.5 0 0 1 .65-.278l1.757.703a1.5 1.5 0 0 0 1.114 0l1.733-.694a2.5 2.5 0 0 1 1.857 0l1.733.694a1.5 1.5 0 0 0 1.114 0l1.733-.694a2.5 2.5 0 0 1 1.857 0l1.757.703a.5.5 0 1 1-.372.928l-1.757-.703a1.5 1.5 0 0 0-1.114 0l-1.733.694a2.5 2.5 0 0 1-1.857 0l-1.733-.694a1.5 1.5 0 0 0-1.114 0l-1.733.694a2.5 2.5 0 0 1-1.857 0L.314 11.964a.5.5 0 0 1-.278-.65"/></svg>';
        toolbar.appendChild(btn);
        btn.addEventListener('click', function () {
            if (btn.disabled) { return; }
            if (active) { SViewer.panel.close(); } else { open(); }
        });

        // Map tap → depth probe at that point. We do NOT rely on OL's `singleclick`
        // (via SViewer.addClickHandler): on Android/Brave a tap carries a few px of
        // finger movement, so OL classifies it as a drag and singleclick never
        // fires. Instead detect a tap ourselves on the map viewport: a pointerup
        // close in space + time to the pointerdown, with no real pan in between.
        (function bindMapTap() {
            var vp = map.getViewport();
            if (!vp) { return; }
            var downX = 0, downY = 0, downT = 0, moved = false;
            var TAP_MOVE = 12;     // px tolerance (finger jitter)
            var TAP_TIME = 600;    // ms max for a tap
            vp.addEventListener('pointerdown', function (e) {
                downX = e.clientX; downY = e.clientY; downT = Date.now(); moved = false;
            }, { passive: true });
            vp.addEventListener('pointermove', function (e) {
                if (Math.abs(e.clientX - downX) > TAP_MOVE ||
                    Math.abs(e.clientY - downY) > TAP_MOVE) { moved = true; }
            }, { passive: true });
            vp.addEventListener('pointerup', function (e) {
                if (!active || !seaLayer || waterIGN69() == null) { return; }
                if (moved || (Date.now() - downT) > TAP_TIME) { return; }   // pan, not tap
                // Ignore taps on our own popup / its close button.
                if (e.target && e.target.closest && e.target.closest('.sv-tide-probe')) { return; }
                var coord = map.getEventCoordinate(e);
                if (coord) { probeAt(coord); }
            }, { passive: true });
        }());
        // Suppress core WMS GetFeatureInfo while the tool is active. The pointer-tap
        // above owns the map click; without this, on a clean (desktop) click OL's
        // `singleclick` would ALSO fire core GFI → a stray query marker behind the
        // dock. Returning true suppresses it. (On a mobile drag-tap singleclick
        // doesn't fire at all, so core GFI is already skipped — symmetric.)
        SViewer.addClickHandler(function () { return active ? true : undefined; });

        // Zoom gate: disable below the coastal scale limit (single-port flat-S
        // validity). Updated on every view change.
        function updateGate() {
            var z = view.getZoom();
            var ok = z != null && z >= minZoom;
            // Gate only the toolbar BUTTON (can't OPEN fresh when too far out).
            // An already-open panel stays put — unzooming keeps the full state
            // (port, date, draft, graph); zooming back in needs no reopen/refetch.
            btn.disabled = !ok && !active;
            btn.classList.toggle('sv-tide-gated', !ok && !active);
            btn.title = (ok || active) ? t('btn.title') : t('gate.hint');
            btn.setAttribute('aria-label', btn.title);
        }
        view.on('change:resolution', function () { updateGate(); if (active) { updateNautUnits(); } });
        // Panning → update the "panned away from port" hint (no auto re-pick).
        view.on('change:center', function () { if (active) { updateFaraway(); } });
        updateGate();

        function open() {
            active = true;
            btn.setAttribute('aria-pressed', 'true'); btn.classList.add('active');
            injectStyle();
            ensureWindBadge();
            ensureSeaSpinner();
            ensureNautScale();
            ensureSeamarkLayer();
            SViewer.panel.open(PANEL, t('panel.title'), '<div id="sv-tide-root"></div>', { dock: 'bottom' });
            findPort();
        }
        // Floating wind badge over the map (top-centre). Created once in the map
        // frame; theme-independent dark-glass (map overlay rule). role=status.
        function ensureWindBadge() {
            if (document.getElementById('sv-tide-windbadge')) { return; }
            var frame = document.getElementById('sv-frame-map') || map.getTargetElement();
            if (!frame) { return; }
            var el = document.createElement('div');
            el.id = 'sv-tide-windbadge';
            el.className = 'sv-tide-windbadge';
            el.setAttribute('role', 'status');
            el.hidden = true;
            frame.appendChild(el);
        }
        function removeWindBadge() {
            var el = document.getElementById('sv-tide-windbadge');
            if (el && el.parentNode) { el.parentNode.removeChild(el); }
        }
        // Nautical scale bar (nm / cables) for the tool. The core scale-line is
        // metric and sits bottom-left — hidden behind the bottom dock and useless
        // for navigation. We add our OWN ScaleLine in NAUTICAL units, rendered into
        // a fixed box at TOP-LEFT of the map (clear of the bottom dock and the
        // top-centre badge), only while the tool is active.
        function ensureNautScale() {
            if (nautScale) { return; }
            // Top-CENTRE of the map (clear of both top corners' toolbars and the
            // bottom dock). It sits just above the wind/wave badge, which is also
            // top-centre but lower (top:3.4rem) — the two stack, never overlap.
            var frame = document.getElementById('sv-frame-map') || map.getTargetElement();
            if (!frame) { return; }
            var box = document.getElementById('sv-tide-nautscale');
            if (!box) {
                box = document.createElement('div');
                box.id = 'sv-tide-nautscale';
                box.className = 'sv-tide-nautscale';
                frame.appendChild(box);
            }
            nautScale = new ol.control.ScaleLine({ units: 'nautical', target: box, minWidth: 64 });
            map.addControl(nautScale);
            updateNautUnits();     // nm offshore, metres when zoomed in close
        }
        // Switch the scale to METRES below ~500 m, NAUTICAL above — a navigator wants
        // metres for close-quarters work and nm at passage scale. Decide from the
        // ground resolution (3857 metres/px corrected for latitude) × the bar's min
        // width: the smallest distance the bar can show. < 500 m → metric.
        var NAUT_METRIC_BELOW_M = 500;
        function updateNautUnits() {
            if (!nautScale) { return; }
            var res = view.getResolution();
            if (res == null) { return; }
            var lat = ol.proj.toLonLat(view.getCenter() || [0, 0])[1];
            var groundRes = res * Math.cos(lat * Math.PI / 180);   // m/px on the ground
            var minBarM = groundRes * 64;                          // ≈ minWidth px
            var units = minBarM < NAUT_METRIC_BELOW_M ? 'metric' : 'nautical';
            if (nautScale.getUnits() !== units) { nautScale.setUnits(units); }
        }
        function removeNautScale() {
            if (nautScale) { map.removeControl(nautScale); nautScale = null; }
            var box = document.getElementById('sv-tide-nautscale');
            if (box && box.parentNode) { box.parentNode.removeChild(box); }
        }
        // Floating sea-map loading spinner over the map (top-centre, just under the
        // badge). Lives in the map frame so it stays visible whatever tab is open or
        // when the dock is collapsed — the sea WMS keeps loading regardless.
        function ensureSeaSpinner() {
            if (document.getElementById('sv-tide-spinner')) { return; }
            var frame = document.getElementById('sv-frame-map') || map.getTargetElement();
            if (!frame) { return; }
            var el = document.createElement('span');
            el.id = 'sv-tide-spinner';
            el.className = 'sv-tide-spinner';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-label', t('wms.loading'));
            el.title = t('wms.loading');
            el.hidden = true;
            frame.appendChild(el);
        }
        function removeSeaSpinner() {
            var el = document.getElementById('sv-tide-spinner');
            if (el && el.parentNode) { el.parentNode.removeChild(el); }
        }
        SViewer.panel.onClose(PANEL, function () {
            active = false; destroyChart(); resetWind(); resetWave();
            if (seaTimer) { clearTimeout(seaTimer); seaTimer = null; }
            removeSeaLayer(); removeCurrentLayer(); removeSeamarkLayer(); removeWindBadge(); removeSeaSpinner(); removeProbe(); removeNautScale();
            btn.setAttribute('aria-pressed', 'false'); btn.classList.remove('active');
        });

        // --- Scoped style ----------------------------------------------------
        var styled = false;
        function injectStyle() {
            if (styled) { return; }
            styled = true;
            var P = '#sv-panel-ext-tide ';
            var css = [
                // Tabbed layout: tablist on top, one pane (Marée|Données) fills the rest.
                P + '#sv-tide-root{display:flex;flex-direction:column;gap:.4rem;height:100%;min-height:0}',
                P + '.sv-tide-tabs{flex:none;display:flex;gap:.25rem;border-bottom:1px solid var(--sv-panel-border,#ccc)}',
                P + '.sv-tide-tab{appearance:none;background:none;border:none;border-bottom:2px solid transparent;padding:.3rem .7rem;font-size:.85rem;font-weight:600;color:var(--sv-panel-fg-muted,#52525b);cursor:pointer}',
                P + '.sv-tide-tab[aria-selected="true"]{color:var(--sv-panel-fg,#18181b);border-bottom-color:#0d6efd}',
                P + '.sv-tide-tab:focus-visible{outline:2px solid #0d6efd;outline-offset:-2px}',
                P + '.sv-tide-pane{flex:1;min-height:0}',
                P + '.sv-tide-pane[hidden]{display:none}',
                P + '.sv-tide-info{overflow:auto;display:flex;flex-direction:column;gap:.4rem;padding-right:.3rem}',
                P + '.sv-tide-curve{min-width:0;min-height:0;display:flex;flex-direction:column}',
                // Compact top line: icon re-pick · port name · draft slider.
                P + '.sv-tide-topline{flex:none;display:flex;align-items:center;gap:.4rem .5rem;flex-wrap:wrap;margin-bottom:.3rem}',
                // Port button = refresh icon + name (the re-pick control + status).
                P + '.sv-tide-repick{flex:none;display:inline-flex;align-items:center;gap:.35rem;min-height:2.2rem;padding:.2rem .6rem;max-width:13em}',
                P + '.sv-tide-repick-ico{flex:none;opacity:.75}',
                P + '.sv-tide-topname{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
                P + '.sv-tide-draft-lbl{font-size:.78rem;font-weight:600;color:var(--sv-panel-fg-muted,#52525b);white-space:nowrap;margin-left:auto}',
                // Draft dropdown — tap-friendly on a phone (≥44px touch target).
                P + '.sv-tide-draft-sel{flex:none;min-height:2.2rem;padding:.2rem .4rem;font-size:.9rem;font-weight:600;font-variant-numeric:tabular-nums;color:var(--sv-panel-fg,#18181b);background:var(--sv-panel-input-bg,#fff);border:1px solid var(--sv-panel-border,#ccc);border-radius:6px}',
                P + '.sv-tide-curve-head{flex:none}',
                P + '.sv-tide-datenav-slot{display:flex;align-items:center;min-width:0}',
                P + '.sv-tide-datenav{display:flex;align-items:center;gap:.2rem;min-width:0}',
                P + '.sv-tide-curve-title{font-size:.8rem;font-weight:600;color:var(--sv-panel-fg,#18181b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
                P + '.sv-tide-datebtn{padding:.1rem .5rem;line-height:1.2;font-weight:700}',
                P + '.sv-tide-today{padding:.1rem .5rem;font-size:.74rem}',
                P + '.sv-tide-marks{display:flex;flex-wrap:wrap;gap:.3rem;margin:.2rem 0}',
                P + '.sv-tide-mark{font-size:.74rem;padding:.1rem .45rem;border-radius:10px;font-variant-numeric:tabular-nums;white-space:nowrap}',
                P + '.sv-tide-mark{color:var(--sv-panel-fg,#18181b)}',
                P + '.sv-tide-mark-pm{background:rgba(13,110,253,.14)}',
                P + '.sv-tide-mark-bm{background:rgba(127,127,127,.18)}',
                // Marnage + approx-coef chip: teal tint, distinct from PM/BM.
                P + '.sv-tide-mark-range{background:rgba(15,143,143,.16);font-weight:600}',
                P + '.sv-tide-plot{flex:1;min-height:120px}',
                P + '.sv-tide-wind-plot{flex:1;min-height:140px;margin-top:.3rem}',
                P + '.sv-tide-wave-plot{flex:1;min-height:140px;margin-top:.3rem}',
                P + '.sv-tide-wind-foot{flex:none;margin-top:.25rem}',
                P + '.sv-tide-stale{color:#8a6d00;font-style:normal;font-weight:600}',
                // Cursor readout strip — selected instant in both datums. Focusable
                // slider; visible focus ring (keyboard scrub). Hardcoded colors are
                // fine here (panel, not a map overlay).
                P + '.sv-tide-readrow{flex:none;display:flex;align-items:center;gap:.5rem;margin-top:.25rem}',
                // Slim keyboard scrub bar (no numbers — height is on the map badge).
                // Selected-time readout: screen-reader keyboard scrub only (no visible
                // box — the on-map badge already shows time + height). sr-only but
                // focusable so keyboard users keep the slider.
                P + '.sv-tide-readout{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}',
                P + '.sv-tide-readout:focus-visible{outline:2px solid #0d6efd;outline-offset:1px}',
                // WMS loading spinner — floats over the map (top-centre, just under
                // the badge) so it stays visible on any tab or with the dock hidden.
                // A glass disc lifts it off busy tiles; theme-independent like the
                // other map overlays.
                '.sv-scope .sv-tide-spinner{position:absolute;top:6.6rem;left:50%;transform:translateX(-50%);z-index:8399;box-sizing:border-box;width:2rem;height:2rem;padding:.45rem;border-radius:50%;background:rgb(24 24 27 / 78%);box-shadow:0 2px 8px rgb(0 0 0 / 28%);pointer-events:none}',
                '.sv-scope .sv-tide-spinner::after{content:"";display:block;width:100%;height:100%;border:2px solid rgb(255 255 255 / 30%);border-top-color:#fff;border-radius:50%;animation:sv-tide-spin .7s linear infinite}',
                '.sv-scope .sv-tide-spinner[hidden]{display:none}',
                '@keyframes sv-tide-spin{to{transform:rotate(360deg)}}',
                // Nautical scale box — TOP-CENTRE, just above the wind/wave badge.
                // Follows the light/dark theme via the panel vars (glass bg + panel
                // fg), like the badge. Sizes to content (width:max-content) so the
                // bar is never clipped.
                '.sv-scope .sv-tide-nautscale{position:absolute;top:.5rem;left:50%;transform:translateX(-50%);z-index:8398;width:max-content;padding:.15rem .4rem;border-radius:.3rem;background:var(--sv-panel-bg,rgb(255 255 255 / 92%));border:1px solid var(--sv-panel-border,rgb(0 0 0 / 10%));backdrop-filter:blur(6px);box-shadow:0 2px 8px rgb(0 0 0 / 22%);pointer-events:none}',
                // Style the OL ScaleLine inside the box: bar + label use the panel fg.
                '.sv-scope .sv-tide-nautscale .ol-scale-line{position:static;background:none;box-shadow:none;padding:0;width:max-content;overflow:visible}',
                '.sv-scope .sv-tide-nautscale .ol-scale-line-inner{color:var(--sv-panel-fg,#18181b);border-color:var(--sv-panel-fg,#18181b);font-weight:700;font-size:.72rem;font-variant-numeric:tabular-nums}',
                '@media (prefers-reduced-motion:reduce){.sv-scope .sv-tide-spinner::after{animation-duration:1.6s}}',
                P + '.sv-tide-curve-foot{flex:none;margin-top:.25rem}',
                P + '.sv-tide-msg{font-size:.85rem;color:var(--sv-panel-fg-muted,#52525b);margin:.3rem 0}',
                P + '.sv-tide-err{font-size:.85rem;color:var(--sv-panel-fg,#18181b);margin:.3rem 0;border-left:3px solid #d9534f;padding-left:.4rem}',
                P + '.sv-tide-block{margin:0}',
                P + '.sv-tide-h{font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--sv-panel-fg-muted,#52525b);margin:.2rem 0 .15rem}',
                P + '.sv-tide-port-name{font-size:1rem;font-weight:600;margin:0}',
                P + '.sv-tide-faraway{font-size:.74rem;color:var(--sv-panel-fg-muted,#52525b);margin:.25rem 0 0;font-style:italic;border-left:3px solid #e8852b;padding-left:.4rem}',
                P + '.sv-tide-faraway[hidden]{display:none}',
                P + '.sv-tide-dim{font-weight:400;color:var(--sv-panel-fg-muted,#52525b);font-size:.85rem}',
                P + '.sv-tide-sep{font-size:.95rem;font-weight:600;color:var(--sv-panel-fg,#18181b);margin:0}',
                P + '.sv-tide-expl{font-size:.8rem;color:var(--sv-panel-fg-muted,#52525b);margin:.15rem 0 0}',
                P + '.sv-tide-formula{margin:.2rem 0 0}',
                P + '.sv-tide-formula code{font-size:.82rem;background:rgba(127,127,127,.12);padding:.15rem .4rem;border-radius:4px}',
                P + '.sv-tide-levels{border-collapse:collapse;font-size:.85rem;margin:.1rem 0 0}',
                P + '.sv-tide-levels th,' + P + '.sv-tide-levels td{text-align:left;padding:.1rem .6rem .1rem 0;font-weight:400}',
                P + '.sv-tide-levels td{font-variant-numeric:tabular-nums;color:var(--sv-panel-fg,#18181b)}',
                // Provenance line — always visible, dimmed but legible (traceability).
                P + '.sv-tide-prov{font-size:.72rem;color:var(--sv-panel-fg-muted,#52525b);margin:.1rem 0 0;font-style:italic}',
                P + '.sv-tide-prov-date{color:var(--sv-panel-fg-muted,#52525b)}',
                // Source link → provider page. Underlined (a11y: not colour-only),
                // inherits the muted prov colour, accent on hover/focus.
                P + '.sv-tide-prov-link{color:inherit;text-decoration:underline}',
                P + '.sv-tide-prov-link:hover,' + P.trim() + ' .sv-tide-prov-link:focus-visible{color:var(--sv-accent,#0d6efd)}',
                // Zoom-gated toolbar button (disabled look without losing the icon).
                '.sv-scope .sv-tide-gated{opacity:.45;cursor:not-allowed}',
                // On-map wind badge (top-centre). Follows sViewer light/dark theme
                // via panel vars (glass bg + panel fg), like the dock panel. Accent
                // wave/wind tints kept fixed (readable on both light and dark glass).
                '.sv-scope .sv-tide-windbadge{position:absolute;top:3.4rem;left:50%;transform:translateX(-50%);z-index:8400;display:flex;align-items:center;gap:.45rem;padding:.3rem .6rem;border-radius:999px;background:var(--sv-panel-bg,rgb(255 255 255 / 92%));color:var(--sv-panel-fg,#18181b);border:1px solid var(--sv-panel-border,rgb(0 0 0 / 10%));backdrop-filter:blur(6px);box-shadow:0 2px 8px rgb(0 0 0 / 22%);pointer-events:none;font-variant-numeric:tabular-nums;white-space:nowrap;max-width:calc(100% - 1rem)}',
                '.sv-scope .sv-tide-windbadge[hidden]{display:none}',
                '.sv-scope .sv-tide-wb-when{display:flex;flex-direction:column;align-items:center;line-height:1.05;white-space:nowrap}',
                '.sv-scope .sv-tide-wb-date{font-size:.68rem;color:var(--sv-panel-fg-muted,#52525b)}',
                '.sv-scope .sv-tide-wb-time{font-size:.86rem;font-weight:700}',
                '.sv-scope .sv-tide-wb-water{display:inline-flex;align-items:center;gap:.25rem;font-size:.95rem;font-weight:700}',
                '.sv-scope .sv-tide-wb-wave{color:#2b7cd3}',
                '.sv-scope .sv-tide-wb-water small,' + '.sv-scope .sv-tide-wb-spd small{font-weight:400;color:var(--sv-panel-fg-muted,#52525b);font-size:.78rem}',
                '.sv-scope .sv-tide-wb-sep{width:1px;height:1.1em;background:var(--sv-panel-border,rgb(0 0 0 / 14%))}',
                '.sv-scope .sv-tide-wb-arrow{color:#2b7cd3;transition:transform .15s ease}',
                '.sv-scope .sv-tide-wb-spd{font-size:.95rem;font-weight:700}',
                '.sv-scope .sv-tide-wb-gust{color:#cf6a1a;font-weight:700}',
                // Identifier glyphs: wind (blue) vs wave (teal) so each segment is
                // named at a glance, distinct from the shared direction arrow.
                '.sv-scope .sv-tide-wb-windicon{color:#2b7cd3;margin-right:.1rem}',
                '.sv-scope .sv-tide-wb-waveicon{color:#0f8f8f;margin-right:.1rem}',
                // Wave segment: arrow (waves travel TO) + significant height. A
                // teal tint, distinct from the wind arrow and legible on both
                // light and dark glass.
                '.sv-scope .sv-tide-wb-warrow{color:#0f8f8f;transition:transform .15s ease}',
                '.sv-scope .sv-tide-wb-wh{font-size:.95rem;font-weight:700}',
                '.sv-scope .sv-tide-wb-per{font-weight:400;color:var(--sv-panel-fg-muted,#52525b);font-size:.78rem}',
                // Click-point depth probe popup. Theme-aware glass card (panel vars),
                // anchored above the marker. Colours match the map ramp.
                '.sv-scope .sv-tide-probe{position:relative;box-sizing:border-box;min-width:12rem;max-width:min(20rem,calc(100vw - 1.5rem));padding:.4rem .55rem .45rem;border-radius:.4rem;background:var(--sv-panel-bg,rgb(255 255 255 / 96%));color:var(--sv-panel-fg,#18181b);border:1px solid var(--sv-panel-border,rgb(0 0 0 / 12%));box-shadow:0 3px 12px rgb(0 0 0 / 28%);backdrop-filter:blur(6px);font-size:.8rem;font-variant-numeric:tabular-nums}',
                '.sv-scope .sv-tide-probe[hidden]{display:none}',
                // little pointer tail
                '.sv-scope .sv-tide-probe::after{content:"";position:absolute;left:50%;bottom:-7px;transform:translateX(-50%);border:7px solid transparent;border-top-color:var(--sv-panel-bg,rgb(255 255 255 / 96%));border-bottom:0}',
                '.sv-scope .sv-tide-probe-x{position:absolute;top:.1rem;right:.2rem;border:0;background:none;color:var(--sv-panel-fg-muted,#52525b);font-size:1rem;line-height:1;cursor:pointer;padding:.1rem .25rem}',
                '.sv-scope .sv-tide-probe-h{font-weight:700;margin:0 1rem .25rem 0;white-space:nowrap}',
                '.sv-scope .sv-tide-probe-t{border-collapse:collapse;width:100%}',
                '.sv-scope .sv-tide-probe-t th{font-weight:400;color:var(--sv-panel-fg-muted,#52525b);text-align:left;padding:.05rem .5rem .05rem 0;white-space:nowrap;vertical-align:top}',
                '.sv-scope .sv-tide-probe-t td{font-weight:700;text-align:right;overflow-wrap:anywhere}',
                '.sv-scope .sv-tide-probe-t small{font-weight:400;color:var(--sv-panel-fg-muted,#52525b);font-size:.72rem}',
                // Probe accent colours — darkened for WCAG AA on the light panel
                // (≥4.5:1 on #fff). The dark-theme block lifts them for AA on the
                // dark panel (one fixed value can't pass on both backgrounds).
                '.sv-scope .sv-tide-probe-blue{color:#1d6fdb}',
                '.sv-scope .sv-tide-probe-safe{color:#157a3f}',
                '.sv-scope .sv-tide-probe-danger{color:#c62f27}',
                '.sv-scope .sv-tide-probe-dry{color:#b85c00;font-weight:700}',
                '.sv-scope .sv-tide-probe-err{color:#c62f27}',
                '.sv-scope[data-theme="dark"] .sv-tide-probe-blue,:root[data-theme="dark"] .sv-scope .sv-tide-probe-blue{color:#5a9bf0}',
                '.sv-scope[data-theme="dark"] .sv-tide-probe-safe,:root[data-theme="dark"] .sv-scope .sv-tide-probe-safe{color:#3fbf72}',
                '.sv-scope[data-theme="dark"] .sv-tide-probe-danger,:root[data-theme="dark"] .sv-scope .sv-tide-probe-danger{color:#ef5b52}',
                '.sv-scope[data-theme="dark"] .sv-tide-probe-dry,:root[data-theme="dark"] .sv-scope .sv-tide-probe-dry{color:#e8852b}',
                '.sv-scope[data-theme="dark"] .sv-tide-probe-err,:root[data-theme="dark"] .sv-scope .sv-tide-probe-err{color:#ef5b52}',
                '.sv-scope .sv-tide-probe-muted{color:var(--sv-panel-fg-muted,#52525b)}',
                // Data-gap caution — loud amber so a hole is never read as safe water.
                '.sv-scope .sv-tide-probe-warn{color:#b85c00;font-weight:700;margin-right:1rem}',
                '.sv-scope[data-theme="dark"] .sv-tide-probe-warn,:root[data-theme="dark"] .sv-scope .sv-tide-probe-warn{color:#e8852b}',
                '.sv-scope .sv-tide-probe-warnsub{color:var(--sv-panel-fg-muted,#52525b);font-size:.72rem;margin-top:.15rem;max-width:13rem}'
            ].join('');
            var style = document.createElement('style');
            style.id = 'sv-tide-style';
            style.textContent = css;
            document.head.appendChild(style);
        }

        // --- Boot: params (permanent tide_* names — never rename) -------------
        var params = new URLSearchParams(window.location.search);
        var mz = parseInt(params.get('tide_minzoom'), 10);
        if (isFinite(mz) && mz > 0 && mz < 22) { minZoom = mz; updateGate(); }
        var wp = params.get('tide_port');
        if (wp) { wantPort = wp.trim(); }
        // tide_t = deep-link instant (ISO 'YYYY-MM-DDTHH:MM'). Sets the day and the
        // cursor position so a shared link reopens at that exact moment.
        var tp = params.get('tide_t');
        if (tp) {
            // Local 'YYYY-MM-DDTHH:MM' (our own syncUrl format) → parseLocal,
            // DST-safe. An explicitly-zoned value (Z/+hh) is honoured via Date.parse.
            var ts = /[zZ]|[+]\d\d:?\d\d$/.test(tp) ? Date.parse(tp) : parseLocal(tp);
            if (isFinite(ts)) { wantT = ts; curDate = new Date(ts); }
        }
        // tide_draft = boat draft in metres (0..3, clamped). Reflected on the slider
        // when the panel renders.
        var td = parseFloat(params.get('tide_draft'));
        if (isFinite(td)) { draft = Math.max(0, Math.min(3, td)); }
    });
}());
