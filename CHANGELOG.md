# Changelog

All notable changes to sViewer are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/).

## [0.17.1] - 2026-06-05

### Added

- **Extension `sensors` → 0.3.0.** Lien profond KVP : `?sta_station=<@iot.id>`
  ouvre directement une station (centre la carte, charge ses mesures),
  `&sta_ds=<@iot.id>` ouvre le graphique droit sur cette mesure — partage d'une
  mesure précise ou widget « un graphique » embarqué. IDs validés (`validId`,
  chemin OData sûr) ; un id inconnu retombe sur la vue station normale.
- **`sensors` — barre de progression déterminée** pendant le chargement des
  observations (pagination `@iot.nextLink`) : la fraction reflète l'avancement
  réel, là où « Chargement… » statique ne disait rien sur une grosse mesure.

### Changed

- **`sensors` — « Charger plus » incrémental.** Reprend depuis le curseur
  `@iot.nextLink` et **ajoute** les observations suivantes au lieu de tout
  recharger depuis la 1re page (avant : ajouter 4000 re-téléchargeait l'ensemble).
- **`sensors` — graphique en heures 24 h (`HH:MM`) et dates `JJ/MM/AA`**,
  indépendamment de la locale (via `uPlot.fmtDate`) ; l'axe et le survol ne
  suivent plus le format en-US (am/pm, MM/JJ).
- **`sensors` — système visuel unifié** entre la liste de stations (navigation,
  chevron) et les boutons de mesure (bascule en place) : même langage
  sélection/survol, rôles distincts et lisibles ; indice « cliquez une station
  sur la carte ou dans la liste ».
- **Règle de nommage des paramètres d'URL d'extension** documentée
  (`EXT_API.md`) : `<extid>_<nom>` (namespacé par l'extension, anti-collision) ;
  le préfixe `_` est réservé aux propriétés GeoJSON injectées (`_sv_color`,
  `_label`), jamais aux paramètres d'URL ; noms permanents (alias, pas de
  renommage). Commentaire `?_ext=` obsolète corrigé en `?ext=`.

## [0.17.0] - 2026-06-05

### Added

- **Extension `annotation` — tracer et partager.** Trace des repères, traits et zones à la
  souris ou au doigt, avec libellé / couleur / note (mini-formulaire typé). Sauvegarde locale
  automatique ; **partage en un lien** (`?ext=annotation&draw=…`, GeoJSON encodé dans l'URL,
  auto-activant) ou export GeoJSON. Sans backend (persistance Grist envisagée). Sélection par
  liste **ou** par clic sur la carte. Cinq règles UX anti-jargon (voir `ext/annotation/SPEC.md`).
- **Extension `sensors` — OGC SensorThings.** Affiche les stations (`/Locations`) d'un service
  SensorThings sur la carte ; au clic, les **mesures** de la station (boutons) et un **graphique
  temporel interactif** (zoom par glissement sur une période, survol date/valeur). Configuration
  par `?sta=<URL>` ou collage. Graphique via **uPlot** (MIT, auto-hébergé, chargé paresseusement).
  Géométries `location` standard **et** non-standard acceptées ; pagination des observations
  (bouton « Charger plus », plafond de session ; `?sta_pagination` pour le défaut admin).
- **`SViewer.panel.open(id, title, html, { dock: 'bottom' })`** — affichage en **bandeau bas
  pleine largeur**, **redimensionnable** (poignée sur le bord haut), adapté au contenu large/
  horizontal (séries temporelles). Extension-agnostique (marqueur générique `sv-panel-dock`).
  Émet **`sv:panelResize`** quand l'utilisateur change la hauteur, pour que l'extension ajuste
  son contenu (ex. un graphique).
- **Robustesse permalien long** : `<meta name="referrer" content="origin">` — un permalien
  volumineux (ex. `?draw=`) ne fuite plus dans l'en-tête `Referer` des sous-ressources (évite des
  `CONNECTION_CLOSED` par dépassement de buffer serveur). Correctif `sw.js` associé.
- **Repère de prise en main** : sur une carte avec données cliquables (WMS interrogeable ou
  objets vectoriels), une bulle « Cliquez un objet… » apprend à l'utilisateur non spécialiste que
  la carte est interactive. Affichée une fois par session, fermable, jamais sur un fond seul.
- **`SViewer.toast(msg, opts)`** — message transitoire pour les retours d'action sans bouton
  propre (enregistré, erreur, chargement). Région *live* unique, annoncée aux lecteurs d'écran.
  `opts.type` : `info` (défaut) | `success` | `error`.
- **Mention de confiance** dans le panneau de partage : « Auto-hébergé, sans traceur, sans
  cookie. » — rend visible l'atout RGPD/vie privée de sViewer au moment du partage.
- **Blueprint — garde-fous de partage.** Trois avertissements honnêtes pour que l'URL partagée ne
  mente pas : **longueur** (URL longue → risque de casse e-mail/QR/serveur), **identifiant**
  (jeton/mot de passe dans une URL publique = fuite — refus visible), **CORS** (à l'aperçu, si le
  service WMS n'autorise pas l'accès tiers, l'aperçu marche pour le créateur mais échoue chez les
  destinataires). Guidage créateur, pas un contrôle de sécurité (le sViewer consommateur reste la
  frontière réelle).

### Changed

- **Extension `sample`** réécrite comme référence complète de l'API 0.16 (bouton + panneau
  `{fullscreen}` + `onClose` + `isInstalled` + `getPermalink`).
- **Catalogue d'extensions** : vignettes en cadre de téléphone (mobile-first), lightbox au clic,
  unification en français.

## [0.16.0] - 2026-06-03

### Added

- **Application installée autonome (PWA) self-suffisante.** En mode installé (pas de barre
  d'adresse), l'extension **`me`** est chargée automatiquement comme hub d'accueil et permet de
  charger une carte sans saisie : **coller une URL** sViewer ou **scanner un QR code** (caméra,
  `BarcodeDetector` natif avec repli `jsQR` auto-hébergé, Apache-2.0). L'URL chargée est validée
  **même origine** (un lien tiers ou QR malveillant est refusé). Résout le transfert d'une carte
  configurée du bureau vers le terrain.
- **`SViewer.isInstalled()`** — détection fiable (*fail-closed*) du mode application installée
  autonome (PWA/WebAPK, niveau supérieur ; faux en onglet/embed/iframe). Pour conditionner une
  UI réservée à l'app installée.
- **`SViewer.getPermalink()`** — permalien canonique de la carte courante (identique au panneau
  Partager) ; source unique de vérité réutilisée par les extensions.
- **`SViewer.panel.open(id, title, html, { fullscreen })`** — option d'affichage plein écran sur
  petit écran, extension-agnostique (marqueur générique `sv-panel-fullscreen`). Adoptée par les
  panneaux `me` et `field` (formulaires/listes sans interaction carte).

### Changed

- **Boutons Légende / Interroger désactivés sans données** : la légende exige une donnée WMS ;
  l'interrogation exige une donnée WMS ou des entités vectorielles chargées. Plus de boutons
  morts sur une carte nue (icône grisée, `aria-disabled`, réactivés au chargement de données).
- **Extension `me`** (→ 0.2.0) : panneau plein écran sur mobile, mise en page à plat (séparateurs
  `<hr>` au lieu de boîtes), ligne de carte cliquable pour ouvrir (avatar + nom), libellé
  « Enregistrer sous » distinct du titre de la carte. Le nom d'enregistrement n'écrase plus le
  `?title=` de la carte (le titre de la carte est préservé). Thème sombre corrigé (texte/surfaces).

### Fixed

- **`SViewer.panel.open` perdait le 4ᵉ argument** (proxy embed.js tronqué à 3 paramètres) — les
  options (dont `fullscreen`) n'atteignaient jamais le cœur.
- **`setTitle`** : libellé du bouton synchronisé même titre vidé ; événement `sv:titleChange`
  émet la valeur normalisée.
- **Mode sombre** : ligne d'échelle + attribution OpenLayers en verre sombre (étaient claires).
- **Bouton de carte désactivé** : icône grisée lisible en thème clair (l'opacité globale +
  override Bootstrap le rendaient invisible).
- **Bordures des boutons de carte** : contour bi-ton (anneau clair externe + sombre interne) pour
  une visibilité sur tout fond de carte (clair/sombre/chargé).
- **Icône PWA** : régénérée depuis `icon.svg` (globe + repère) — les PNG étaient des carrés
  sombres pleins, invisibles en thème sombre.

## [0.15.2] - 2026-06-02

### Added (ext field → 0.4.0)

- **Précision cible configurable** (`Précision cible (m)`, défaut 25) avec **contrôle avant enregistrement** : si le fix courant dépasse la cible, le bouton **+** passe en ambre et une confirmation est demandée avant d'enregistrer le sommet. Un point forcé est signalé « faible » et **teinté en rouge** sur la carte. Ferme le principal écart de crédibilité face aux outils terrain de référence (QField, Field Maps), qui empêchent l'enregistrement accidentel d'un point peu précis. Sert aussi de seuil de rejet dans la fenêtre d'échantillonnage GPS.
- **Anneau de progression** sur le bouton **+** pendant la mesure (~3 s) — repère visuel « rester immobile » lisible en extérieur.

### Changed (ext field)

- **Confirmation d'enregistrement local explicite** : « Zone enregistrée. » s'affiche d'abord (la zone est en sécurité sur l'appareil), puis l'état de transmission.
- **Badge d'erreur tactile** : une zone en erreur affiche `erreur ⓘ` ; un appui révèle le motif (le survol n'existe pas au doigt).
- **Garde-fou anti-perte** : l'abandon de capture (✕ ou bouton outil) demande confirmation si des sommets ont déjà été relevés.
- **Stabilité de la barre de capture** : largeur de lecture fixe et alerte signal-faible réduite à un glyphe `⚠` — le texte changeant ne décale plus les boutons. Décompte texte de la mesure retiré (redondant avec l'anneau).

### Removed (ext field)

- **Mode « suivi »** envisagé puis retiré : redondant avec le bouton « Recentrer », luttait contre le pan manuel, encombrait la barre. L'usage terrain est arrêt-puis-mesure, pas trace continue.

## [0.15.1] - 2026-06-02

### Fixed

- **Carte verrouillée sur mobile quand un panneau se ferme** : `SViewer.panel.close()` (`togglePanel(null)`) ré-ajoutait la classe `sv-panel-open` après `resetPanel()`, réactivant l'overlay plein écran (`pointer-events:auto`, ≤ 600px) qui bloquait le pan tactile. Le pan était impossible pendant la capture GPS de l'extension `field` (zoom et boutons restaient cliquables, d'où le diagnostic). Garde `if (!panelName) return` après `resetPanel()`. Corrige toutes les extensions qui ferment le panneau sur mobile.

### Changed (ext field)

- **Colonne géométrie** proposée en liste déroulante (colonnes de la table chargées via `GET /columns`), avec pré-sélection devinée par nom — plus de saisie manuelle.
- **Bouton « Recentrer »** (croix) sur la barre de capture : recentre la carte sur la position GPS sans changer le zoom.
- Libellés orientés utilisateur : « Recharger le formulaire » (au lieu de « schéma »).
- Boutons **Synchroniser** / **Configuration** repassés en icône seule (largeur mobile), libellé en `title`/`aria-label`.
- Bouton **Synchroniser** désactivé quand rien n'est en attente ; bouton **Vider la liste** (purge avec confirmation) pour repartir sur un lot vierge.
- Contrastes renforcés pour l'usage terrain (badges ≈ 6,5:1, texte atténué ≈ 7:1).

## [0.15.0] - 2026-06-02

### Added

- **Extension `field` (Terrain)** (`ext/field/`, `?ext=field`) : collecte de données sur le terrain au GPS, hors-ligne d'abord, vers un document Grist. Trois modes de saisie — **Points** (MultiPoint), **Ligne**, **Polygone** — démarrés en un bouton ; un sommet par appui, avec **moyenne GPS pondérée** (échantillonnage ~3 s, rejet des fixes > 25 m, pondération en 1/précision²) pour fiabiliser chaque point. Barre flottante de capture (carte toujours visible), couche GPS dédiée (position + cercle de précision), auto-zoom au premier fix, aperçu de la géométrie en direct.
- **Field — formulaire d'attributs typé** depuis le schéma Grist : nombre, date, date-heure, case à cocher, liste de choix, choix multiple — avec conversion au bon format à l'écriture (Date → epoch secondes, etc.). Colonnes calculées et géométrie exclues automatiquement.
- **Field — photos** : colonne *Pièces jointes* auto-détectée, capture appareil photo, **redimensionnement client** (1600 px, JPEG, EXIF supprimé) avant stockage, upload via l'API Attachments Grist avant l'écriture de la ligne.
- **Field — hors-ligne** : file IndexedDB en **cache systématique** (écriture locale avant tout appel réseau), conservation bornée des zones transmises, vidage automatique au retour du réseau et bouton de synchronisation. Tableau des zones (date, état + identifiant Grist, attributs, zoom, suppression, purge).
- **Field — configuration** par collage d'une URL Grist (remplit serveur + document) et choix de la table dans une liste (`GET /tables`). Jeton optionnel scopé document ; en-tête `X-Requested-With` sur les écritures. i18n complet 4 langues, WCAG 2.1 AA (contrastes renforcés pour l'usage terrain). Géométrie stockée en GeoJSON EPSG:4326, relisible par l'adaptateur `grist`.

## [0.14.1] - 2026-05-24

### Added

- **Extension `me` (Moi)** (`ext/me/`, `?ext=me`) : espace personnel local au navigateur. Première facette « Mes cartes » — enregistrement de cartes sViewer (titre + URL complète), filtre par titre, restauration en un clic ou nouvel onglet, copie d'URL, suppression, export/import JSON. Identifiant déterministe = hash djb2 de l'URL normalisée → déduplication automatique. Stockage `localStorage.sv_me_maps_v1` (max 16 entrées, éviction par date). Visuel par pastille colorée déterministe (pas de capture d'écran). Icônes SVG inlinées (auto-contenu, indépendant du subset de police sViewer). i18n complet 4 langues.
- **`SViewer.loadExtension(name)`** : chargement dynamique d'extension après le boot. Vérifie `manifest.json.sviewer.minVersion` contre `SViewer.version` avant injection. Idempotent, déduplication des appels concurrents, codes d'erreur (`invalid-name`, `manifest-fetch`, `manifest-parse`, `version-mismatch`, `script-load`). Documenté dans `ext/EXT_API.md` (section « Dynamic extension loading »).
- **`SViewer.hasExtension(name)`** et **`SViewer.loadedExtensions()`** : introspection du registre d'extensions chargées.

### Fixed

- **`SViewer.panel.open()` perdait l'ownership** : `_panelOwner` était assigné avant `togglePanel()`, mais `togglePanel→resetPanel` nullifiait l'owner juste après. Les appels `panel.update()` ultérieurs étaient ignorés silencieusement (`SViewer.panel.update: ignored — current owner is "null"`). Affectait toutes les extensions utilisant `panel.update` à l'activation. Fix : assignation de `_panelOwner` après `togglePanel()`.

### Security

- **`ext/me` — validation stricte des URLs** : seul HTTPS est accepté à l'ouverture/copie d'une carte enregistrée (exception : HTTP même origine, pour le dev local). Bloque `javascript:`, `data:`, et les URLs HTTP tierces injectées via import JSON malveillant. Appliqué à `loadStore()`, `open-here`/`open-new`/`copy`, et à l'import JSON.
- **TECHNICAL.md** : nouvelle section « HTTPS obligatoire en production » avec exemple nginx (redirection 80→443, HSTS) ; nouvelle section « Durcissement de la CSP `connect-src` » pour restreindre les exfiltrations possibles depuis les extensions.

## [0.14.0] - 2026-05-22

### Added

- **Plugin Apache Superset** (`ext/superset/`) : plugin graphique natif pour Apache Superset 4.x — pas de fork, pas de redémarrage serveur. Dataset avec colonne géométrie (GeoJSON ou lat/lon) → FeatureCollection → postMessage → iframe sViewer embarquée dans le tableau de bord. Filtres natifs Superset propagés côté serveur via `buildQueryContext`. URL de partage sViewer acceptée en entrée — tous les paramètres (`x/y/z`, `lb`, `layers`, `s=1`, `q=1`, `theme`, `ext`, etc.) transmis intégralement à l'iframe ; `ext=superset` ajouté automatiquement. Symbologie graduée : couleur par rampe (sqrt/linéaire/log/quantile/Jenks/rang), taille proportionnelle (mêmes modes). Protocole `_sv_color` / `_sv_radius` / `_label` entre plugin et sViewer.
- **`_sv_color` sur polygones et lignes** : la couleur issue de la rampe ou de la couleur fixe Superset s'applique à tous les types de géométrie (points, lignes, polygones) via `_buildVectorLayer` dans `sviewer.js`.
- **`_sv_radius` sur points** : rayon en pixels injecté par le plugin, interprété par `_buildVectorLayer`.
- **Fisher-Jenks O(n²·k)** : calcul des coupures naturelles avec sommes cumulées (préfixe), algorithme O(n²·k) au lieu de O(n³).
- **nginx : `Referrer-Policy` sur `ext/superset/dist/`** : en-tête ajouté au bloc CORS du bundle plugin.

### Changed

- **`ext/superset` : passthrough intégral des paramètres URL** : remplacement de l'extraction manuelle de 5 paramètres par un passthrough complet — l'URL de partage est transmise telle quelle ; le plugin n'injecte que `ext=superset` et `title=`.
- **Contrôles Superset simplifiés** : suppression des champs `wms_url`, `wms_layer`, `basemap`, `theme` du panneau de configuration — tous encodés dans l'URL de partage sViewer.
- **Catalogue d'extensions mis à jour** : ajout de `superset` dans `extensions.json` et `ext/index.html`.

## [0.13.0] - 2026-05-20

### Added

- **Extension Print / PDF** (`ext/print/`, `?ext=print`) : impression haute résolution de la carte courante, re-rendu OpenLayers à la résolution cible. Format A4 paysage et portrait, 150 dpi. QR code permalink optionnel (qr-creator, MIT, auto-hébergé). Attribution OSM. Barre d'échelle.
- **Blueprint — URL validation et WMS autocomplete** : validation en temps réel du service WMS (CORS, disponibilité), autocomplétion du nom de donnée depuis GetCapabilities, probe geOrchestra pour instance locale, validation `md=` via CSW, probe GeoJSON HEAD, indicateur visuel de succès, bannière de plateforme.
- **`SViewer.refreshWMS()`** : force le rechargement des tuiles WMS sur toutes les sources queryables (`config.layersQueryable`). Documenté dans `ext/EXT_API.md`.
- **`s=1` et `q=1` sur GeoJSON vectoriel** : recherche en mémoire sur les propriétés des entités (`s=1`, capped à `maxWfsSearchFeatures`) ; hit-test au pixel central + entité la plus proche comme fallback, ouverture du panneau de requête (`q=1`).
- **Feedback d'erreur WMS et GeoJSON** : bannière `#sv-wms-err-*` (debounce sur `tileloaderror`) et `#sv-geojson-err` pour les erreurs de chargement.
- **Catalogue d'extensions classifié** (`ext/index.html`) : badges par type (extension / page / démo), filtre, recherche, navigation par ancre.

### Fixed

- **CSP `nginx-server.conf`** : `manifest-src 'self'` ajouté au bloc `ext/` ; `Referrer-Policy` sur `ext/superset/dist/`.
- **`nginx-default.conf`** : mise à jour du hash CSP et correction de `img-src blob:`.

## [0.11.1] - 2026-05-19

Version de maintenance, sécurité et accessibilité.

### Fixed

- **Titre URL `+` non décodé** : le parseur de paramètres URL dans `index.html` n'appliquait pas `replace(/\+/g, ' ')` avant `decodeURIComponent`. Les titres partagés via `URLSearchParams` (espaces encodés en `+`) s'affichaient avec des `+` littéraux dans le panneau de partage.
- **Titre avec retour à la ligne** : `setTitle()` élimine désormais les espaces superflus (`trim()`) — supprime le `%0A` en fin de `?title=` présent dans certaines URL construites manuellement.
- **CSP `img-src` manquant `blob:`** : les tuiles WMS d'OpenLayers utilisent des URL `blob:` bloquées par la CSP. Ajout de `blob:` à `img-src` dans les trois snippets nginx (`nginx-server.conf`, `nginx-server-proxy.conf`, `nginx-default.conf`).
- **Hash CSP mis à jour** : le hash `sha256` du script inline de `index.html` est mis à jour après le correctif du parseur URL.
- **i18n** : suppression des clés mortes `btn.overlay` et `panel.link_modal.title` (aucune référence `data-i18n` ni `tr()` dans le code).

### Sécurité / Accessibilité

- **WCAG 2.1 AA** : `aria-pressed` sur les boutons de profil/coût de l'extension isochrone ; `aria-label` sur le champ de valeur ; SVG du profil altimétrique annoté (`role="img"`, `<title>`, `<desc>`) ; contraste `.sv-gps-accuracy` amélioré (`#aaa` → `#999`) ; lien footer embed avec indication "(nouvel onglet)".
- **XSS / path traversal** : durcissement des vecteurs d'injection dans les panneaux d'extension, les origines de messages et les noms de profil de configuration.
- **CVE `brace-expansion`** : mise à jour `package-lock.json`.
- **Suite de tests embed** (`tests/suites/12-embed-mode.js`) : 10 tests de régression couvrant le chargement via `embed.js`, DOM, panneau latéral, recherche, partage, i18n et scoping CSS.
- **Extension Panoramax** : `manifest.json` créé, catalogue mis à jour (6 extensions).
- **TECHNICAL.md** : section `adapters` renommée en `extensions`.

### Mise à jour depuis 0.11.0

Aucune modification de configuration requise. Mettre à jour les snippets nginx (`deploy/nginx/`) avec le nouveau hash CSP et `blob:` dans `img-src`. Remplacer les fichiers JS/HTML du déploiement.

## [0.11.0] - 2026-05-18

### Added

- **Extension API v2** : cycle de vie complet pour les extensions tierces — `SViewer.onMapReady`, `SViewer.panel.open/update/close`, `SViewer.onFeaturesLoaded`, `SViewer.onFeaturesError`, `SViewer.onFeatureClick`, `SViewer.onFeatureSelect`, `SViewer.addClickHandler/removeClickHandler`. Un handler retournant `true` consomme le clic et supprime le GFI/sélection vecteur natif.
- **Extension : `altitude`** (`?ext=altitude`) : profil en long altimétrique via l'API IGN Géoplateforme. Tracé d'un itinéraire sur la carte (points + ligne de prévisualisation en caoutchouc), calcul du profil, graphique SVG avec dénivelés cumulés, stats ↑/↓/min–max, résultat affiché comme donnée vectorielle.
- **Extension : `isochrone`** (`?ext=isochrone`) : isochrones via l'API IGN Géoplateforme Navigation. Sélection du point de départ sur la carte, choix piéton/voiture, mode temps (minutes) ou distance (km), résultat affiché comme polygone.
- **Extension : `panoramax`** (`?ext=panoramax`) : visionneuse Panoramax (street-level imagery). Clic sur la carte → ouverture de l'image la plus proche dans le panneau latéral.
- **Catalogue d'extensions** (`ext/index.html`) : généré via `npm run build:catalog` à partir des `manifest.json` de chaque extension.
- **`?ext=`** : supporte plusieurs extensions séparées par des virgules (`?ext=altitude,panoramax`).
- **OL global documenté** : `ol` est accessible globalement depuis les extensions — coordonnées, géométries, styles, events. Voir `ext/EXT_API.md`.

### Fixed

- **Fermeture du panneau sur second clic carte** : un handler d'extension consommant le clic (`return true`) empêche désormais correctement le déclenchement du GFI et de la sélection vecteur natifs (`_lastClickSuppressed`).
- **`panel.open()` idempotent** : appeler `panel.open()` sur un panneau déjà ouvert ne le referme plus (`_alreadyOpen`).
- **OL build** : `ol.geom.LineString`, `ol.Observable`, `ol.unByKey` manquants dans le bundle custom — erreurs silencieuses dans les handlers d'extension. Ajoutés à `build/ol-custom-entry.js`.
- **Lien d'accessibilité** : cible du skip-link corrigée (`#sviewer`, `tabindex="-1"`) — élément présent dans le HTML statique, détectable par Lighthouse.

### Mise à jour depuis 0.10.0

Aucune modification de configuration requise. Remplacer les fichiers du déploiement par ceux de cette version. Les nouvelles extensions (`altitude`, `isochrone`, `panoramax`) sont opt-in via `customConfig.extensions` ou `?ext=` — aucun impact sur les instances existantes.

## [0.10.0] - 2026-05-09

### Changed

- **jQuery supprimé** : `embed.js`, `sviewer.js` et `i18n.js` n'ont plus aucune dépendance jQuery. Bootstrap 5 est utilisé en mode natif. Le répertoire `static/lib/jquery/` est supprimé.
- **Lien d'accessibilité « Aller à la carte »** : déplacé avant le spinner — premier élément focusable dans le DOM (Lighthouse skip-link). La cible `#sv-ol-map` reçoit `tabindex="-1"` pour être focusable programmatiquement.

## [0.9.1] - 2026-05-07

### Added

- **Grist widget : sélecteur de fond de carte** : choisissez le fond de carte (aerial, plan…) depuis l'onglet Avancé du panneau de configuration. Le choix est persisté par widget et restauré à chaque rechargement. Visible uniquement si plusieurs fonds sont configurés.
- **Grist widget : opacité WMS** : curseur d'opacité (0–100 %) pour la donnée WMS ou catalogue chargée dans le widget. Valeur persistée et incluse dans le lien de partage.
- **`md=` : syntaxe `id@https://csw-endpoint`** : charge une fiche depuis n'importe quel catalogue CSW, pas seulement celui configuré par défaut. Compatible widget Grist et sViewer standalone.

### Changed

- **Points** : rayon 6 → 7 px — parité visuelle widget Grist / sViewer standalone.
- **Étiquettes** : police en gras dans le widget Grist et sViewer standalone.
- **Étiquettes** : masquées en dessous du zoom 13 pour éviter la surcharge à petite échelle.
- **Sélection** : highlight via fonction de style au niveau de la couche (non plus `feature.setStyle`) — compatibilité OL declutter préservée.
- **`geOrchestraBaseUrl` par défaut** : `https://georchestra.org` → `https://demo.georchestra.org`.

## [0.9.0] - 2026-05-07

### Added

- **Grist widget : édition de géométrie** : dessin et correction de points, lignes et surfaces directement sur la carte — les modifications sont écrites dans Grist via `selectedTable.update`. Accès complet requis. Modes GeoJSON, WKT, lat/lon et texte coordonnées supportés ; lignes et surfaces indisponibles en mode point-only (lat/lon, texte).
- **Grist widget : zoom automatique sur sélection** : option persistante (activée par défaut) — centrage et zoom sur l'entité à chaque sélection d'une ligne dans le tableau. Débrayable dans le panneau de configuration.
- **Grist widget : exclusion mutuelle md= / layers=** : saisir un identifiant dans l'un des champs désactive et vide l'autre.
- **Grist widget : refonte panneau de configuration** : 3 onglets (Données, Avancé, Aide), séparateurs hr, 2 lignes de style (Données / Ligne sélectionnée), palette couleur-sûre Wong (`#0077bb` / `#ee7733`), opacité remplissage 0,5 par défaut, suppression des contrôles x/y/z/lb redondants, export/import JSON déplacé dans l'onglet Avancé.
- **Grist widget : accessibilité WCAG 2.1 AA** : `role=tablist/tab/tabpanel`, `aria-selected`, `aria-controls`, `aria-hidden` sur les panneaux inactifs, `aria-label` sur les saisies couleur et numériques, gestion du focus à l'ouverture/fermeture du panneau.

### Changed

- **Grist widget : documentation** : README connecteur réécrit pour un public non-SIG — installation, édition de géométrie pas à pas, référence des 5 champs avancés (objectif, syntaxe, exemple).

## [0.8.3] - 2026-05-06

### Added

- **Paramètre `md=` multi-métadonnées** : plusieurs identifiants CSW séparés par des virgules chargent autant de données WMS en parallèle (`?md=id1,id2,id3`). Chaque fiche produit un panneau légende indépendant. Titre automatique conservé pour `md=` unique ; avec plusieurs identifiants, utiliser `&title=` explicitement.
- **Grist widget : support WKT** : les colonnes de type WKT (`POINT`, `LINESTRING`, `POLYGON`, etc.) sont auto-détectées sans configuration manuelle. `ol/format/WKT` ajouté au build OpenLayers personnalisé.
- **Suite de tests navigateur** : runner visuel à `/sviewer/tests/` — 27 tests (paramètres URL, fusion config, i18n, WMS live), exécution via iframe + postMessage, `?autorun=1` pour CI.

### Fixed

- **Panneau `md=`** : utilise désormais le template `layer-panel` (même structure que `layers=`) — titre, légende, résumé, liens fiche catalogue, tableau ISO.
- **Grist widget : zoom extrême à la configuration** : `onRecord` ne déclenchait pas de zoom sur l'étendue d'un point avant que les données soient construites — corrigé.

## [0.8.1] - 2026-05-05

### Added

- **`hardConfig` complet** : sViewer démarre sans aucun `customConfig.js` — fond IGN Géoportail (photo aérienne + noms de lieux) + OpenStreetMap, 3 presets de fond, geocodeur IGN Géoplateforme avec adaptateur intégré, toutes les clés avec valeurs par défaut sensées.
- **Docker : image non-root** : base `nginxinc/nginx-unprivileged:1.26-alpine` — processus nginx tourne en utilisateur non-privilégié, port 8080. Même taille (~42 MB) que l'image alpine précédente.
- **Docker : HEALTHCHECK** : `wget` sur `/sviewer/` toutes les 30 s — état du conteneur visible via `docker inspect` et orchestrateurs (Compose, Swarm, K8s).
- **`customConfig.DIST.js` réécrit** : miroir commenté de `hardConfig` — toutes les clés documentées avec leur valeur par défaut, alternative Nominatim incluse. Déployeur décommente uniquement ce qu'il veut surcharger.
- **Footer version → lien GitHub** : le numéro de version dans le panneau Partage est cliquable (`https://github.com/geobretagne/sviewer/`).

### Changed

- **CSP simplifiée** : hash `sha256-` retiré des locations nginx `static/`, `static/lib/`, `local/` — hash inutile sur des fichiers sans `<script>` inline. Hash conservé uniquement sur `index.html`, `sw.js`, `manifest.json`.
- **Cache `static/lib/`** : `max-age=31536000, immutable` → `max-age=3600, must-revalidate` dans les 3 configs nginx. `immutable` était incorrect pour des chemins sans versioning dans l'URL.
- **`geOrchestraBaseUrl`** : valeur par défaut `'https://georchestra.org'` dans `hardConfig`.
- **`searchPlaceholder`** : valeur par défaut `'adresse, lieu-dit, commune...'` dans `hardConfig`.

- **Répertoire `etc/` renommé en `local/`** : séparation explicite entre assets applicatifs (`static/`) et sandbox déployeur (`local/`).

  **Motivations :**
  - `etc/` évoquait une convention Unix système, pas un répertoire déployeur.
  - `local/` signale clairement "ce répertoire vous appartient" — déployeur y pose `customConfig.js`, profils nommés (`customConfig_xxx.js`), données locales, assets personnalisés.
  - `i18n.js` déplacé dans `static/js/` — c'est une donnée applicative, pas une config déployeur. Elle est toujours baked dans l'image Docker, jamais montée en volume.
  - Docker : `local/` monté en volume suffit pour toute la personnalisation. Pas de montage = sViewer démarre avec les défauts intégrés.

- **Image Docker allégée** : `customConfig.js` absent de l'image — 404 tolérée, l'application démarre avec les défauts intégrés (`hardConfig`).
- **`SViewerEmbedded` flag** : `embed.js` pose `window.SViewerEmbedded = true` avant le chargement de `sviewer.js`, qui saute alors le second fetch de `customConfig.js`.
- **Étendue initiale par défaut** : France métropolitaine (EPSG:3857).
- **`manifest.json` `start_url`** : corrigé en `"."` pour éviter l'avertissement PWA scope.

### Migration

- Renommer `etc/` en `local/` dans votre déploiement.
- Mettre à jour les montages Docker/volumes : `./etc/customConfig.js` → `./local/customConfig.js`.
- Si vous servez `i18n.js` depuis `etc/`, supprimer — il est maintenant dans `static/js/i18n.js`.

## [0.8.0] - 2026-05-05

### Changed

- **Refactoring arborescence** : tous les assets servis au navigateur (JS minifiés, CSS minifiés, bibliothèques, polices, images, templates) sont regroupés sous `static/`.

  **Motivations :**
  - Configuration nginx réduite à deux règles (`static/lib/` immutable, `static/` court cache) — fini les blocs par répertoire.
  - Image Docker plus petite : sources, outils de build et config infra exclus d'un seul bloc.
  - Surface d'attaque réduite : un seul sous-chemin à exposer, tout le reste bloqué par défaut.
  - Installation simplifiée : un déployeur sait exactement ce qui est servi et ce qui ne l'est pas.

- Fichiers de configuration infra (nginx, Docker) déplacés dans `deploy/` — hors de la racine web, jamais servis.
- L'URL d'intégration embed change : `js/embed.js` → `static/js/embed.min.js`.
- `deploy/nginx/nginx-server-proxy.conf` : `proxy_pass` utilise le placeholder `BACKEND_URL` (sed-able) — plus d'URL codée en dur.

### Migration depuis 0.7.x

```bash
# Mettre à jour l'URL embed dans les pages hôtes
# Avant : <script src=".../sviewer/js/embed.js"></script>
# Après : <script src=".../sviewer/static/js/embed.min.js"></script>

# Proxy nginx : remplacer BACKEND_URL par l'URL réelle
sed -i 's|BACKEND_URL|http://your-backend:8080|g' deploy/nginx/nginx-server-proxy.conf
```

## [0.7.2] - 2026-05-04

### Added
- Info panel: GeoJSON/adapter source data card — shows data source name, feature count, and clickable source URL for traceability
- Info panel: `layer-panel` template extended with optional `{{#featureCount}}` / `{{#sourceUrl}}` blocks — WMS panels unaffected
- Adapter API: `label(url)` function — Grist returns `"Grist — {tableName}"`, CSV returns filename; sViewer calls it when present, falls back to filename/hostname
- i18n: `msg.feature_count` + `msg.source_url` in fr/en/es/de

### Changed
- Info panel title: `word-break: break-word` — long filenames wrap instead of overflow

## [0.7.1] - 2026-05-04

### Added
- Grist widget: full dark mode support — CSS variables + `grist.onThemeChange`; all controls (buttons, inputs, selects) consistent across light / dark / accessibility themes
- Grist widget: inline opacity/width labels in style rows ("opacité" / "épais."), i18n fr/en/es/de — no more trial-and-error on number inputs
- Query panel: zebra striping on feature properties table (odd/even rows), dark-theme aware
- Query panel: `title` attribute on property keys — hover reveals full truncated column name
- Active adapter names shown in sViewer version footer (share panel) — visible hint when adapter is missing

### Changed
- Grist widget: "Enregistrer" button renamed "Appliquer / Apply" — clarifies two-step save flow (widget Apply + Grist bar Save)
- Grist widget: geometry mode labels include concrete format examples (e.g. `"48.85,2.35" (lat,lon)`, `WKT "POINT(2.35 48.85)"`)
- Grist widget: help panel Partage section rewritten — accurate field descriptions, title mention removed
- Query panel: property key column wraps at 40% width with `word-break: break-word` — no more truncated keys

### Fixed
- Grist widget: "Deselect" button removed — redundant; deselect via click on empty area or panel close
- Grist widget: share link used `getgrist.com` instead of configured `grist_api_base` — fixed
- Grist widget: features not displayed on share link — root cause: `grist` adapter missing from `customConfig.adapters`
- Query panel: feature properties invisible in dark mode — Bootstrap table color overrides now applied under `[data-theme="dark"]`
- Opacity slider hidden when no WMS layer is loaded (`layersQueryable` empty) — was always visible regardless of context

## [0.7.0] - 2026-05-04

### Added
- **Embed SDK** — event bus (`window._SViewerInternals.bus`) shared between `embed.js` and `sviewer.js`, frozen via `Object.defineProperty` (tamper-proof). Enables embedded widgets to drive the map and react to events without accessing OpenLayers internals.
- `SViewer.loadFeatureObjects(features, options)` — load an `ol.Feature[]` array already in EPSG:3857 as the active vector layer. Zero reprojection, zero serialisation — high-performance path for widgets. Options: `styleOverride`, `fitExtent`.
- `SViewer.loadFeatures(geojson)` — load a parsed GeoJSON FeatureCollection as the active vector layer.
- `SViewer.selectFeature(id)` — select a feature by OL id, zoom to it, open properties panel.
- `SViewer.clearSelection()` — clear current selection and close properties panel.
- `SViewer.onMapReady(fn)` — callback fired once map is initialised (`{ map, view }`).
- `SViewer.onFeatureClick(fn)` — callback fired on every vector feature click (`{ feature, coordinate, properties }`).
- `SViewer.onFeatureSelect(fn)` — callback fired on selection change (`{ feature, properties }`, `null` on deselect).
- `SViewer.onFeaturesLoaded(fn)` — callback fired after every vector layer load (`{ features, count }`).
- `_buildVectorLayer` / `_bindVectorClick` — shared internal layer build and click handler, registered once per instance (no duplicate handlers on layer rebuild).

### Changed
- Grist widget: delegates layer management and click handling entirely to sViewer SDK — drops own `vectorLayer`, `mapClickWired`, `mapClickPending` state. `applySelectionStyle` iterates `featureByRowId` directly.
- Grist widget: map click now opens the sViewer properties panel (consistent with standalone mode), in addition to visual highlight.

### Fixed
- Lighthouse Performance score improved from ~96 to 99 — leaner widget init path (removed blocking guard variables).

## [0.6.3] - 2026-05-04

### Fixed
- Grist widget: removed `grist.setSelectedRows()` from map click handler — when widget is "Selected by" its own table, Grist raises `LinkConfig invalid cycle` which permanently breaks grid→map sync until page reload. Map click now applies visual highlight on map only; grid→map direction (click grid row → map pans to feature) is unaffected.

## [0.6.2] - 2026-05-04

### Added
- `SViewer.onTitleChange` — public callback fired when user edits the map title via the share panel (not on programmatic/init calls). Allows embedders to persist title changes without coupling to sViewer internals. Documented in `TECHNICAL.md`.

### Fixed
- Permalink URL missing `&title=` parameter — title set via share panel now included in standalone permalink
- Grist widget: title edited in sViewer share panel now persists across reloads via widget options (`SViewer.onTitleChange` + `saveOptions()`)

### Changed
- Grist widget: title field removed from settings panel (Share tab) — title managed exclusively via sViewer share panel, consistent with standalone mode. Existing saved titles migrate transparently on first load.

## [0.6.1] - 2026-05-04

### Added
- `connectors/index.html` — index page listing all connectors with capabilities, URL hints, and links to check pages

### Fixed
- All `check.html` pages: yellow prerequisite warning banner at top (customConfig adapters[] required for e2e)
- `grist/check.html`: replace DOC_ID placeholder with real public dataset (Cales de mise à l'eau des Côtes d'Armor, grist.dataregion.fr)
- `grist/check.html`, `sample/check.html`: remove hardcoded x/y/z viewport — auto-fit to features
- `csv/adapter.js`: document UTF-8-only constraint in header

## [0.6.0] - 2026-05-04

### Added
- **Connecteur CSV** (`connectors/csv/`) — charge des fichiers CSV distants (extension `.csv` ou hint `_format=csv`) et les convertit en FeatureCollection GeoJSON. Détection automatique des colonnes géométrie (`geometry`, `geom`…), latitude/longitude (`latitude`/`lat`, `longitude`/`lon`/`lng`). Support : séparateur virgule ou point-virgule, BOM UTF-8, champs entre guillemets, colonnes personnalisées via hints `_collat`/`_collon`/`_labelcol`. Nécessite CORS et UTF-8 côté serveur.
- **Connecteur sample** (`connectors/sample/`) — connecteur de référence commenté pour guider la création de nouveaux connecteurs. Entrée : tableau JSON plat `[{latitude, longitude, …}]`.
- **Pages de diagnostic `check.html`** pour les connecteurs CSV, sample et Grist — vérifient l'enregistrement de l'adaptateur, `match()`, `convert()` et proposent un lien de test bout-en-bout. Données de test Bretagne intégrées (pas de dépendance réseau pour les checks unitaires).
- **Logs de debug permanents dans `loadGeoJSON`** — avec `?debug=true` : adaptateur détecté, nombre de features après conversion et après filtre de reprojection OL.
- **Vérification de bundle dans `check.html`** (étape 0) — détecte un `sviewer.min.js` périmé avant d'exécuter les checks.
- Système de hints URL généralisé : `_format`, `_geommode`, `_geomcol`, `_collat`, `_collon`, `_labelcol` — documenté dans `connectors/MISSION.md`.
- Message d'erreur i18n `msg.adapter_not_loaded` (4 langues) si `_format=X` est présent mais l'adaptateur n'est pas chargé dans `customConfig`.

### Changed
- `loadGeoJSON` : dispatch `wantsText` — les adaptateurs déclarant `wantsText: true` reçoivent le texte brut (`dataType:'text'`) au lieu d'un objet JSON parsé.
- `tr()` supporte les substitutions positionnelles `{0}`, `{1}`… pour les messages i18n paramétrés.
- nginx : `js/` et `css/` servis avec `Cache-Control: no-cache, must-revalidate` — évite les bundles périmés en cache navigateur.
- nginx : `templates/` ajouté à la liste blanche des répertoires servis.

## [0.5.0] - 2026-05-03

### Added
- **Connecteur Grist v2** — widget Grist étendu : panneau de configuration tabulé (Données / Carte / Partage / Aide), export/import JSON de la configuration, persistance complète des options par instance via l'API widget Grist
- Support des modes géométrie : GeoJSON, Lat/Lon (2 colonnes), Lat\,Lon (texte), Lon\,Lat (texte), WKT
- `md=` (identifiant CSW) configurable dans le panneau de paramètres du widget, avec rechargement si modifié
- Étiquette texte (`_label`) affichée sur les entités GeoJSON dans sViewer standalone — la propriété est définie par `jsonLayerAdapter` via le paramètre hint `_labelcol`

### Changed
- Style GeoJSON par défaut : orange `#ff6600`, opacité `0.35`, trait `2.5 px` — colorblind-friendly, visible sur orthophoto et fond de carte
- `customConfig.geojsonStyle` est désormais lu comme source de vérité pour les valeurs par défaut du style dans le widget Grist (plus de valeurs codées en dur)
- `jsonLayerAdapter` reçoit `sourceUrl` comme 2e argument — permet à l'adaptateur de lire les hints géométriques encodés dans l'URL par le widget Grist

### Fixed
- Lien de partage sViewer depuis le widget Grist : le mode géométrie et la colonne sélectionnés sont désormais encodés comme paramètres hint dans l'URL de l'API Grist (`_geommode`, `_geomcol`, `_collat`, `_collon`, `_labelcol`) — l'auto-détection ne surcharge plus le choix manuel
- Clic successif sur des entités GeoJSON : le panneau de résultats s'ouvre correctement à chaque clic au lieu de se fermer (comportement identique aux données WMS)

## [0.4.0] - 2026-05-03

### Added
- **Connecteur Grist** (`connectors/grist/`) — widget embarqué dans un document Grist : affiche les géométries d'une table sur une carte sViewer, synchronisation bidirectionnelle table↔carte en temps réel ; la carte est également partageable et intégrable hors de Grist (lien, QR code, `<iframe>`, API JS)
- Support des colonnes géométrie GeoJSON (Point, LineString, Polygon) avec sélecteur de colonne et étiquette configurable dans la barre d'outils du widget
- `ol.style.Text` ajouté au bundle OpenLayers — étiquettes texte sur les entités vectorielles

### Changed
- Répertoire `integrations/` renommé en `connectors/` — nomenclature plus courte et extensible
- Déplacement du bouton "Désélectionner" à droite du compteur d'entités dans la barre d'outils du widget
- Bordures du tableau de propriétés allégées (`border-color: #ddd`, `border-width: 1px`)

### Fixed
- Toast "aucune entité" affiché à tort lors du clic sur une entité vectorielle en présence de données WMS — `forEachFeatureAtPixel` intercepte le clic avant `queryMap()`
- Changement de colonne géométrie sans effet — l'empreinte de reconstruction inclut désormais `colGeom` + `colLabel` (pas seulement les données)
- `ol.style.Text is not a constructor` — `Text` absent du bundle OL, bundle reconstruit

### Security
- `safeHttpUrl()` retourne uniquement `origin` (suppression du chemin/query) — prévient l'injection de chemin SSRF sur `grist_api_base`
- `encodeURIComponent` sur les identifiants doc et table Grist — prévient la traversée de chemin dans l'URL API
- `safeColor()` — valide les couleurs via `ol.color.asArray` avant injection dans les styles OL
- Remplacement de `innerHTML = ''` par `options.length = 0` pour vider les `<select>` — élimine le risque d'inspection de contenu HTML

### Accessibility
- Attributs `for`/`id` sur tous les labels du widget (WCAG 4.1.2)
- `role="status" aria-live="polite"` sur la zone de statut (WCAG 4.1.3)
- Contraste du texte de statut corrigé `#888` → `#666` (ratio ≥ 4.5:1, WCAG 1.4.3)
- Attribut `lang` dynamique sur `<html>` selon la langue détectée
- `aria-label` sur le bouton Désélectionner via `data-i18n-aria`
- Traductions espagnol (`es`) et allemand (`de`) ajoutées au widget

### Deployment
- `etc/nginx-server.conf` mis à jour pour le chemin `connectors/` ; blocs CSP dédiés pour le widget Grist (`unsafe-inline`, `unsafe-eval`, domaine `docs.getgrist.com`)
- `scripts/` exclu du Docker image (outil de build uniquement)
- `CLAUDE.md` exclu du dépôt git (`.gitignore`)
- Avertissement ajouté dans README et TECHNICAL.md : le snippet nginx est obligatoire pour protéger les fichiers de build

## [0.3.0] - 2026-05-02

### Added
- iFrame tab in embed modal (alongside existing JS tab) — CMS/blog editors can copy a one-liner `<iframe>` without JavaScript
- Auto-open legend panel on load when a queryable layer is present and viewport width > 600 px — saves one click, surfaces layer info immediately
- `@media print` — controls hidden; if a panel is open it renders beside the map (map 65%, panel 35%); closed panel hidden; map fills full width when no panel open
- `backgroundPresets` config key — single cycling button replaces the independent background + overlay buttons; each preset sets background and overlay atomically (`{lb, lo}` indices); `layersBackground`-only configs remain fully backward compatible
- `allowedDomains` config key — optional hostname allowlist for external OGC services (WMS, CSW, WFS); absent or empty array = all domains allowed (backward compatible)

### Changed
- `ORTHOIMAGERY.ORTHOPHOTOS` background layer switched from TMS/XYZ to WMTS (better render quality); IIFE pattern avoids global vars
- Fullscreen button hidden on mobile (OS provides native fullscreen) and when `fullscreenEnabled` API absent
- GPS/geolocation button hidden on non-touch devices (`pointer: coarse` media query) — desktop browsers expose the geolocation API but have no hardware GPS
- `customConfig.DIST.js` updated to demonstrate `backgroundPresets` (3 presets: photo+labels, photo, map) and `layersOverlay` pool; `layersBackground` marked as legacy

### Fixed
- XSS in GetFeatureInfo panel — raw WMS HTML response now parsed via `DOMParser` with script execution disabled
- XML injection in WFS filter — user search input now escaped via `xmlEscape()` before interpolation into OGC filter
- XSS in QR code error path — replaced `innerHTML` with DOM node construction (`createElement` + `textContent`)
- Skip link "Aller à la carte" rendered visibly over the map — CSS selector mismatch (`sv-skip-to-content` vs `skip-to-content`) corrected

### Performance
- `embed.js` now minified (`embed.min.js`) — loaded by `index.html` in production (−24% parse time on critical path)
- proj4 and OpenLayers loaded in parallel via `Promise.all` — saves ~100 ms waterfall on first load
- Deleted `lib/bootstrap-icons/fonts/bootstrap-icons.woff2` (130 KB, unreferenced — subset at `build/` is used)

### Removed
- Overlay layer button (`#ovBt`) — replaced by `backgroundPresets` cycling button; `?lo=` URL parameter removed
- Shake to share — false positives during transport, no discoverability, intrusive iOS permission prompt; permalink button in share panel covers the same use case

## [0.2.0] - 2026-05-01

### Added
- Overlay layer button — cycles through `layersOverlay[]` config array (`?lo=` URL param)
- Fullscreen button in map controls (between zoom- and overlay) — webkit prefix for Safari/iOS
- Snapshot button in share panel — exports map as PNG via `canvas.toBlob()`
- Shake to share — `DeviceMotionEvent` copies permalink + haptic feedback; iOS 13+ permission handling
- Auto dark mode — follows OS `prefers-color-scheme: dark` when no `?theme=` param set
- Unified loading bar — 3 px indeterminate bar at top of map covers tiles, GFI, geocode, WFS, CSW

### Changed
- Map controls split into two semantic `role="group"` groups: navigation (home/zoom/fullscreen) and layers (overlay/background/GPS)
- `customConfig.DIST.js`: WMTS boilerplate replaced with `ol.source.XYZ` — no global vars required
- Background layers now use geopf TMS (`HR.ORTHOIMAGERY.ORTHOPHOTOS`) and MapProxy TMS (`osm:grey`)
- Overlay changed from PLANIGNV2 to `GEOGRAPHICALNAMES.NAMES` (RGBA transparent labels, zoom 6–18)
- Ocean/background color set to `#a8d5e8` via `.ol-viewport` CSS
- All tile sources have `crossOrigin: 'anonymous'` for snapshot compatibility

### Fixed
- `scope is not defined` in `sviewer.js` fullscreen — replaced with `document.querySelector('.sv-scope')`
- Fullscreen icon wrong unicode (U+F3DF / U+F3DE) — woff2 subset rebuilt with correct codepoints
- Canvas taint on snapshot — `crossOrigin: 'anonymous'` on WMS `TileWMS` source

## [0.1.1] - 2026-04-30

### Added
- `CHANGELOG.md`
- Permalink button label translated separately from tooltip (`btn.permalink_label`, 4 languages)
- Version + commit hash visible in share panel and browser console; `SViewer.version`, `SViewer.commit` public API

### Changed
- Dockerfile: `nginx:1.17` → `nginx:1.26-alpine`
- `.dockerignore` expanded to exclude dev files from image
- Release checklist added to `TECHNICAL.md`

### Fixed
- sViewer casing (`Sviewer` → `sViewer`) in README
- fr `msg.top_layer`: avoid french jargon "couche" → "donnée"

### Removed
- Unused i18n keys `btn.qrcode` and `panel.share_modal.title` (vestigial)
- Dead files: `.gitmodules` (obsolete ol3 submodule ref), `minify.sh` (superseded by npm scripts)

## [0.1.0] - 2026-04-30

### Added
- Version number (`0.1.0`) and commit hash visible in share panel and browser console on init
- `npm run stamp` — injects version + git hash into `embed.js` at release time
- `npm run minify` / `npm run build` pipeline (terser + postcss + esbuild for OL bundle)
- `?lang=` URL parameter to force display language (en/fr/es/de)
- `?md=` parameter — load WMS layer from CSW/ISO 19139 metadata record (GeoNetwork)
- `?s=1` — WFS feature search across all text fields of displayed layer
- `?theme=dark` / `?theme=light` URL parameter + interactive toggle in config panel
- `?debug=true` — console logging; `?debug=1` — load non-minified JS/CSS (independent flags)
- `?c=` — load alternate custom configuration file (`etc/customConfig_<name>.js`)
- External WMS support: `layers=name@https://wms.example.com/...`
- CQL filter support: `layers=name*style*cql_filter`
- Progressive Web App (PWA): installable on mobile, offline support via service worker
- Bootstrap Icons subset — reduced from 130 kB to 1.7 kB (woff2)
- Content Security Policy headers (nginx)
- `maxGeocodeResults` and `maxWfsSearchFeatures` config options
- WCAG 2.1 AA accessibility: `lang` attribute, `aria-pressed`, `aria-checked`, live regions, skip link
- Release procedure documented in `TECHNICAL.md`

### Changed
- Migrated from OpenLayers 2 to OpenLayers 10 (custom bundle via esbuild)
- Replaced CDN dependencies with fully self-hosted assets (no external requests)
- Refactored shared helpers to reduce duplication across modules

### Fixed
- Service worker scope `/` causing PWA registration failure
- Skip link hidden until focused (accessibility)
- Crosshair cursor on map, corrected Bootstrap icon classes

### Removed
- All external CDN dependencies
