# Guide de Référence sViewer

Guide technique complet pour développeurs et intégrateurs..

---

## Sommaire

1. [Mode Simple : Paramètres KVP](#mode-simple--paramètres-kvp)
2. [Mode WebComponent : API JavaScript](#mode-webcomponent--api-javascript)
3. [Configuration Avancée](#configuration-avancée)
4. [Services OGC et Données](#services-ogc-et-données)
5. [Projections et Repères](#projections-et-repères)
6. [Requêtes Cartographiques](#requêtes-cartographiques)
7. [Intégration geOrchestra](#intégration-georchestra)
8. [Progressive Web App (PWA)](#progressive-web-app-pwa)
9. [Internationalization (i18n)](#internationalization-i18n)
10. [Architecture et API Interne](#architecture-et-api-interne)
11. [Dépannage](#dépannage)

---

## Mode Simple : Paramètres KVP

### Syntaxe générale

```
https://geobretagne.fr/sviewer/?param1=valeur1&param2=valeur2
```

Les paramètres sont traités comme des chaînes de caractères. Les URL doivent être encodées (ex: espace = `%20`).

### Paramètres de positionnement

#### `x`, `y`, `z`

Positionne la carte et définit le niveau de zoom.

- **`x`, `y`** : Coordonnées en EPSG:3857 (Web Mercator), format numérique
- **`z`** : Niveau de zoom (0-18), entier

```
?x=-366959&y=2951352&z=5
```

**Notes:**
- `x` = longitude projetée, `y` = latitude projetée en Web Mercator
- Utilisez des outils de conversion pour EPSG:4326 → EPSG:3857
- Exemple: lon=–3.36, lat=48.11 → x=-366959, y=2951352

#### `title`

Affiche un titre personnalisé au-dessus de la carte.

```
?title=Carte%20d'exemple
```

**Restrictions :** Texte court (~30 chars) recommandé pour affichage mobile.

#### `lb` (layer background)

Sélectionne la couche de fond (background layer) par index.

```
?lb=0      # Première couche
?lb=1      # Deuxième couche
```

**Configuration :** Les données disponibles sont définies dans `etc/customConfig.js` → `layersBackground[]`. L'index par défaut est 0.

---

### Paramètres de données cartographiques

#### `layers`

Ajoute une ou plusieurs données WMS à la carte. Format : liste séparée par des virgules.

**Syntaxe basique :**
```
?layers=namespace:layername
```

**Avec style personnalisé :**
```
?layers=namespace:layername*stylename
```

**Avec filtre CQL :**
```
?layers=namespace:layername*stylename*CQL_FILTER
```

**Exemples :**
```
?layers=geor:commune_bretagne
?layers=geor:commune*orange
?layers=geor:commune*orange*population>50000
```

**Cas d'usage:**
- Les données doivent être publiées sur un serveur OGC (geOrchestra, GeoServer, etc.)
- Si `geOrchestraBaseUrl` est configuré, sViewer construit automatiquement les URLs WMS
- Les styles doivent exister sur le serveur pour être appliqués
- Les filtres CQL utilisent la syntaxe OGC standard

#### `md` (metadata)

Charge automatiquement une couche WMS depuis un identifiant de fiche de métadonnées CSW (ISO 19139).

```
?md=<identifiant-csw>
```

**Comportement :**
- Interroge le CSW (`geOrchestraBaseUrl/geonetwork/srv/eng/csw`) pour résoudre l'URL WMS et le nom de couche
- Affiche titre, résumé et légende depuis la fiche
- Ignoré si `layers=` est aussi présent (`layers=` est prioritaire)
- Inclus dans le permalien si `layers=` est absent

→ Voir [Services OGC — CSW](#catalogue-service-for-the-web-csw--paramètre-md) pour le détail.

---

### Paramètres de requête et recherche

#### `q` (query)

Active une requête GetFeatureInfo au démarrage sur les données visibles.

```
?layers=geor:commune&q=1
```

**Comportement :**
- Exécute une requête au centre de la vue initiale
- Affiche les résultats dans le panneau Résultats
- Nécessite au moins une couche queryable (attribut `queryable="1"` en WMS)

#### `s` (search)

Active la barre de recherche au démarrage.

```
?s=1
```

**Services interrogés :**
- IGN Géoplateforme (ou `customConfig.openLSGeocodeUrl`)
- WFS de chaque couche queryable (si disponible et CORS OK)

**CORS :** Géoplateforme et services WFS doivent supporter CORS.

---

### Paramètres d'affichage et partage

#### `debug` (debug mode)

| Valeur | Effet |
|--------|-------|
| `debug=true` | Logs dans la console (diagnostic WMS, CORS, AJAX) |
| `debug=1` | Charge `sviewer.js` et `sviewer.css` non-minifiés |

Non-persistant (absent du permalien).

#### `c` (configuration)

Charge une configuration alternative au lieu de `customConfig.js`.

```
?c=ma_config
```

**Mécanisme :**
- Charge dynamiquement `etc/customConfig_ma_config.js`
- Écrase les paramètres par défaut avec les valeurs de cette configuration
- Restrictions de nom : `[a-zA-Z0-9_-]+` uniquement

---

### Paramètres persistants

Les paramètres suivants sont **mémorisés** dans le permalien et le code QR :
- `x`, `y`, `z`
- `title`
- `layers`
- `md` (si `layers=` absent)
- `q`
- `c`
- `lb`

Le paramètre `debug` n'est **pas** persistant.

---

## Mode WebComponent : API JavaScript

### Initialisation

```html
<div id="ma-carte"></div>

<script src="https://geobretagne.fr/sviewer/js/embed.js"></script>
<script>
  SViewer.init('#ma-carte', options);
</script>
```

### Options d'initialisation

Les options passées à `SViewer.init()` utilisent **exactement les mêmes noms** que les paramètres KVP du mode simple. `customConfig.js` est chargé en premier, puis les options embed s'appliquent par-dessus.

| Option | Type | Équivalent KVP | Description |
|--------|------|----------------|-------------|
| `x` | `number` | `?x=` | Longitude initiale (EPSG:3857) |
| `y` | `number` | `?y=` | Latitude initiale (EPSG:3857) |
| `z` | `number` | `?z=` | Niveau de zoom (0-18) |
| `title` | `string` | `?title=` | Titre de la carte |
| `lb` | `number` | `?lb=` | Index de la couche de fond |
| `layers` | `string` | `?layers=` | Données à afficher (séparées par virgules) |
| `c` | `string` | `?c=` | Nom du profil de configuration alternatif |

Le bouton **HTML** du panneau de partage génère automatiquement un fragment `SViewer.init()` pour la vue courante.

### Exemples complets

**Exemple minimal :**
```javascript
SViewer.init('#ma-carte', {
    x: -366959,
    y: 2951352,
    z: 5
});
```

**Exemple avec données :**
```javascript
SViewer.init('#ma-carte', {
    x: 0,
    y: 2000000,
    z: 6,
    title: 'Ressources nationales',
    layers: 'geor:commune,geor:departement'
});
```

**Exemple complet :**
```javascript
SViewer.init('#ma-carte', {
    x: -390192,
    y: 6122108,
    z: 10,
    lb: 1,
    layers: 'dreal_b:ae_casparcas',
    title: 'Evaluation Environnementale'
});
```

---

## Configuration Avancée

### Fichier customConfig.js

La configuration centralisée d'une instance sViewer se fait dans `etc/customConfig.js`. Vous devez être familier avec `OpenLayers` pour la modifier.

**Structure :**
```javascript
customConfig = {
    title: 'GeoBretagne sViewer',
    lang: 'fr',
    geOrchestraBaseUrl: 'https://geobretagne.fr',
    initialExtent: [-600000, 6090000, -100000, 6100000],
    maxExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
    restrictedExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
    center: [-350000, 6150000],   // vue initiale : centre (EPSG:3857), priorité sur initialExtent
    zoom: 10,                     // vue initiale : niveau de zoom, priorité sur initialExtent
    maxFeatures: 10,
    maxGeocodeResults: 5,
    maxWfsSearchFeatures: 8,
    nodata: '<!--nodatadetect-->\n<!--nodatadetect-->',
    openLSGeocodeUrl: "https://data.geopf.fr/geocodage/search",
    layersBackground: [ /* ... */ ]
};
```

### Étendues (Extents)

Trois étendues contrôlent le comportement de la carte :

- **`initialExtent`** : Zone affichée au démarrage
- **`maxExtent`** : Limite du panoramique (pan limits)
- **`restrictedExtent`** : Limite du zoom (zoom limits)

Format : `[minX, minY, maxX, maxY]` en EPSG:3857.

**Exemple :**
```javascript
initialExtent: [-600000, 6090000, -100000, 6100000],
maxExtent: [-20037508, -20037508, 20037508, 20037508],
restrictedExtent: [-20037508, -20037508, 20037508, 20037508]
```

### Fonds de carte

Configuration des fonds ce carte disponibles dans le sélecteur :

```javascript
layersBackground: [
    new ol.layer.Tile({
        source: new ol.source.WMTS({
            attributions: ['© IGN'],
            url: 'https://data.geopf.fr/wmts',
            layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
            matrixSet: 'PM',
            format: 'image/jpeg',
            projection: ol.proj.get('EPSG:3857'),
            tileGrid: new ol.tilegrid.WMTS({ /* ... */ })
        }),
        title: 'Photos aériennes'
    }),
    new ol.layer.Tile({
        source: new ol.source.OSM(),
        title: 'OpenStreetMap'
    })
]
```

**Notes :**
- Chaque donnée doit avoir un attribut `title`
- Toutes les données doivent être en EPSG:3857

### Service de géocodage

Configuration du service d'adresses (recherche de lieux) :

```javascript
openLSGeocodeUrl: "https://data.geopf.fr/geocodage/search"
```

Le service doit :
- Supporter l'API OpenLS (standard OGC)
- Accepter les requêtes GET/POST JSON
- Supporter CORS

---

## Services OGC et Données

### Web Map Service (WMS)

sViewer supporte **WMS 1.3.0** uniquement.

#### GetCapabilities

sViewer lit automatiquement les capacités WMS pour :
- Obtenir les données disponibles
- Lire les métadonnées (titre, résumé)
- Déterminer si une couche est queryable

#### GetFeatureInfo

Requête pour interroger une données à une position donnée.

**URL générée :**
```
https://serveur/geoserver/namespace/layername/wms
  ?REQUEST=GetFeatureInfo
  &SERVICE=WMS
  &VERSION=1.3.0
  &LAYERS=namespace:layername
  &QUERY_LAYERS=namespace:layername
  &STYLES=style_name
  &INFO_FORMAT=text/html
  &FEATURE_COUNT=10
  &CRS=EPSG:3857
  &BBOX=...
  &WIDTH=400&HEIGHT=300
  &I=200&J=150
```

**Configuration :**
- `maxFeatures` : nombre de résultats (défaut 10)
- `FORMAT` : toujours `image/png` avec `TRANSPARENT=true`

#### Propriétés requises pour les données

Chaque couche WMS doit :
- Supporter **EPSG:3857** (Web Mercator)
- Avoir un attribut `queryable="1"` si on souhaite l'interroger
- Supporter **HTTPS** (pas d'URLs non chiffrées)
- Supporter **CORS** (pas de proxy nécessaire)

### Catalogue Service for the Web (CSW) — paramètre `md=`

Quand `md=<identifiant>` est passé dans l'URL (sans `layers=`), sViewer interroge le CSW pour charger automatiquement une couche WMS depuis une fiche de métadonnées ISO 19139.

#### Flux d'exécution

```
URL ?md=<id>
     │
     ▼
fetchCSWRecord()
  GET ${geOrchestraBaseUrl}/geonetwork/srv/eng/csw
      ?SERVICE=CSW&VERSION=2.0.2&REQUEST=GetRecordById
      &Id=<id>&ElementSetName=full
      &OutputSchema=http://www.isotc211.org/2005/gmd
     │
     ▼ ISO 19139 XML
parseCSWForWMS()
  XPath: //gmd:distributionInfo//gmd:CI_OnlineResource
  → trouve protocole OGC:WMS
  → extrait URL WMS (sans query string) + nom de couche
     │
     ▼
LayerQueryable({ skipMetadataPanel: true })
  LAYERS = namespace:layername  (nom complet, pas virtuel)
  url    = wmsUrl depuis CSW
  → map.addLayer()
     │
     ▼
Panneau Documentation
  titre + résumé (XPath gmd:identificationInfo)
  image légende (GetLegendGraphic)
  tableau : date, producteur, contact, licence
```

#### Priorité

`layers=` est toujours prioritaire sur `md=`. Si les deux sont présents, `md=` est ignoré (log console).

#### Persistance

`md=` est inclus dans le permalink et le code d'intégration généré, à condition que `layers=` soit absent.

#### Prérequis

- GeoNetwork doit exposer un endpoint CSW à `${geOrchestraBaseUrl}/geonetwork/srv/eng/csw`
- La fiche doit contenir un `CI_OnlineResource` avec `protocol = OGC:WMS`
- Le serveur WMS doit supporter CORS

---

## Projections et Repères

### Projections supportées

**EPSG:3857 (Web Mercator) est l'unique projection supportée.**

Toutes les données WMS doivent être dans cette projection ou seront reprojetées automatiquement par le serveur OGC.

---

## Requêtes Cartographiques

### GetFeatureInfo (Interroger la carte)

Cliquer sur la carte déclenche une requête WMS GetFeatureInfo si une couche queryable est visibile.

**Résultats :**
- Affichage en panneau latéral
- Tableau HTML ou texte selon le serveur
- Maximum `maxFeatures` résultats

**Erreurs courantes :**
- *« Aucun résultat »* : pas de couche queryable à cette position
- *« Interrogation a échoué »* : erreur CORS, URL non accessible, ou serveur refuse la requête

### Recherche de lieux

Saisie libre d'adresse/lieu → requête vers le service géoplateforme.

**Résultats :**
- Liste avec score de pertinence
- Clic sur un résultat = panoramique + zoom vers le lieu
- Marqueur temporaire

**Limitations :**
- Couverture variable selon région

### Recherche WFS (paramètre `s=1`)

Activé par `?s=1`. Interroge les couches WFS associées aux couches WMS queryables, en parallèle de la géoplateforme.

#### Découverte automatique WFS

Au démarrage (`doConfiguration`), pour chaque couche queryable :

```
WMS DescribeLayer  →  découvre l'URL WFS + typeName
WFS DescribeFeatureType  →  découvre les champs et leurs types
```

Résultat stocké dans `layer.wfs` :
- `url` : endpoint WFS
- `typeName` : nom du type de feature
- `fields` : tous les champs scalaires (string, int, date, etc.) — pour l'affichage
- `searchFields` : champs `xsd:string` uniquement — pour le filtre `PropertyIsLike`
- `geomField` : nom du champ géométrie (exclu de l'affichage)

Si DescribeLayer ou DescribeFeatureType échoue, `layer.wfs.url` reste `null` et la couche est silencieusement ignorée.

#### Flux de recherche

```
keyup (debounce 350ms)
  → abortSearchXhrs()          annule les XHR WFS en cours
  → openLsRequest()            géoplateforme IGN (parallèle)
  → searchAllWFSLayers()       pour chaque couche avec wfs.url valide :
      WFS GetFeature
        FILTER: OR(PropertyIsLike) sur searchFields
        BBOX: étendue courante de la carte
        maxFeatures: config.maxWfsSearchFeatures (défaut 8)
        propertyName: tous les fields
      → featuresToList()        rendu Mustache + ajout dans #searchResults
```

#### Clic sur un résultat WFS

`onSearchItemClick` avec `data.queryGFI = true` :
1. Recentre la carte sur les coordonnées du feature
2. Appelle `queryMap(coordinates)` → déclenche WMS GetFeatureInfo comme un clic sur la carte

---

### Légendes et métadonnées

Pour chaque couche publiée depuis geOrchestra :
- Légende graphique (si disponible)
- Titre et résumé
- Lien vers métadonnées

---

## Progressive Web App (PWA)

### Installation

sViewer est configuré comme Progressive Web App. Sur navigateurs compatibles (Chrome Android, Edge, Firefox Android, etc.), un bouton "Installer" ou "Ajouter à l'écran d'accueil" apparaît.

**Fichiers PWA :**
- `manifest.json` : Métadonnées (nom, icônes, thème, etc.)
- `sw.js` : Service Worker pour offline + caching
- `img/icon-192.png` + `img/icon-512.png` : Icônes application

### Service Worker

Service Worker (`sw.js`) **enregistré uniquement en mode simple** (index.html).

**Comportement :**
- Cache ressources sViewer au premier chargement
- Support offline limité (ressources en cache)
- Mise en cache automatique des resources
- Scope limité à `/sviewer/`

**Mode WebComponent :** embed.js n'enregistre pas le SW pour ne pas affecter la page hôte.

### Manifest

Configuration dans `manifest.json` :
- `name` : Nom complet (installation)
- `short_name` : Nom court ≤12 chars (écran d'accueil)
- `start_url` : URL de démarrage
- `scope` : Portée du SW
- `display` : Mode `standalone` (app native)
- `icons` : PNG 192x192 et 512x512
- `theme_color` + `background_color` : Couleurs barre d'adresse/splash

---

## Internationalization (i18n)

### Langues supportées

| Langue | Code | Status |
|--------|------|--------|
| Français | `fr` | Défaut, complet |
| Anglais | `en` | Complet |
| Espagnol | `es` | Complet |
| Allemand | `de` | Complet |


### Fichier i18n.js

Toutes les chaînes traduites sont centralisées dans `etc/i18n.js` :

```javascript
$.extend(hardConfig, {
    i18n: {
        fr: {
            'Query': 'Interroger',
            'Legend': 'Légende',
            'Close': 'Fermer'
        },
        en: {
            'Query': 'Query',
            'Legend': 'Legend',
            'Close': 'Close'
        },
        es: { /* ... */ },
        de: { /* ... */ }
    }
});
```

### Ajout de nouvelles traductions

**Étape 1 :** Ajouter la clé dans `etc/i18n.js`
```javascript
$.extend(hardConfig, {
    i18n: {
        fr: { 'ma clé': 'Texte français' },
        en: { 'ma clé': 'English text' },
        es: { 'ma clé': 'Texto español' },
        de: { 'ma clé': 'Deutscher Text' }
    }
});
```

**Étape 2 :** Ajouter `class="i18n" title="ma clé"` au HTML
```html
<button class="i18n" title="ma clé">Placeholder</button>
```

**Étape 3 :** Pour du texte JavaScript
```javascript
var msg = hardConfig.i18n[window.config.lang]['ma clé'];
alert(msg);
```

### Sélection de langue

Par ordre de priorité :
1. Paramètre URL `?lang=fr` (code ISO 639-1 à 2 lettres)
2. `customConfig.lang`
3. Détection navigateur (Accept-Language)
4. Défaut : `en`

---

## Architecture et API Interne

### Fichiers clés

| Fichier | Responsabilité |
|---------|---|
| `js/embed.js` | Chargement des dépendances + création du DOM + API SViewer.init() |
| `js/sviewer.js` | Logique métier : carte, données, requêtes, état |
| `css/sviewer.css` | Styles sViewer + overrides Bootstrap/OpenLayers |
| `etc/customConfig.js` | Configuration (obligatoire) |
| `etc/i18n.js` | Traductions UI |
| `index.html` | Point d'entrée mode simple |

### Dépendances

- **jQuery 4.x** : manipulation DOM, requêtes AJAX
- **Bootstrap 5** : composants UI, responsive
- **OpenLayers 10** : rendu de carte, interactions OGC
- **proj4.js** : projections cartographiques
- **qrcode.js** : génération codes QR (chargement lazy)

Toutes les dépendances sont **self-hosted** (pas de CDN).

### Flux de chargement (Mode WebComponent)

```
embed.js
  ├── Détecte baseUrl depuis l'URL du script (window.SViewerBaseUrl)
  ├── Stocke les options dans window._svEmbedOptions
  ├── Crée le DOM (.sv-scope container)
  ├── Charge en parallèle : jQuery → proj4 → OpenLayers → customConfig.js
  │   et en parallèle : Bootstrap JS + CSS sViewer (révèle le container)
  ├── Charge i18n.js
  └── Charge sviewer.js
        ├── Merge _svEmbedOptions dans qs (priorité sur la page hôte)
        ├── Charge customConfig.js via SViewerBaseUrl (chemin absolu)
        └── doConfiguration() → doMap() → doGUI()
```

### Objet config (global)

Fusionné à partir de, dans cet ordre de priorité :
1. `hardConfig` (défauts sViewer)
2. `customConfig` (configuration locale, `etc/customConfig.js`)
3. Options embed `_svEmbedOptions` (passées à `SViewer.init()`, écrasent `customConfig`)

```javascript
config = {
    title, lang, geOrchestraBaseUrl,
    initialExtent, maxExtent, restrictedExtent,
    maxFeatures, nodata,
    openLSGeocodeUrl,
    layersBackground, layersQueryable, i18n,
    // ... etc
}
```

### Objet state (global)

État mutable de l'application :

```javascript
state = {
    activePanel: 'query',         // Panneau affiché
    gfiok: true,                  // GetFeatureInfo actif
    mapCenter: [x, y],            // Centre actuel
    mapZoom: 12,
    layersVisible: [],            // Données visibles
    // ... etc
}
```

### API SViewerApp

**Méthodes publiques :**

```javascript
// Initialisation
SViewerApp.init(options)

// Accesseurs
SViewerApp.getMap()        // Objet OpenLayers map
SViewerApp.getView()       // Objet OpenLayers view
SViewerApp.getConfig()     // Objet config
SViewerApp.getState()      // Objet state
```

**Exemple :**
```javascript
var app = window.SViewerApp;
var map = app.getMap();
var center = map.getView().getCenter();
console.log('Centre :', center);
```

### Minification

Les fichiers minifiés sont générés via npm :

```bash
npm run minify        # sviewer.js → sviewer.min.js, sviewer.css → sviewer.min.css
npm run build         # build OL custom bundle + minify
```

`embed.js` charge les fichiers minifiés par défaut. Avec `?debug=1`, charge les sources non-minifiées.

| Source | Minifié | Outil |
|--------|---------|-------|
| `js/sviewer.js` | `js/sviewer.min.js` | terser |
| `css/sviewer.css` | `css/sviewer.min.css` | postcss + cssnano |

La configuration cssnano est dans `postcss.config.js` (preset `default`).

### Scoping CSS

Pour éviter les collisions avec le CSS hôte, toutes les classes sViewer utilisent le préfixe `.sv-` et sont englobées dans `.sv-scope` :

```html
<div class="sv-scope" id="sv-container">
    <div class="sv-header">
        <button class="sv-btn">...</button>
    </div>
</div>
```

CSS produit :
```css
.sv-scope .sv-header { ... }
.sv-scope .sv-btn { ... }
```

---

## Dépannage

### La carte ne charge pas

**Symptômes :** Page vierge, pas de message d'erreur.

**Diagnostic :**
- Ouvrir la console du navigateur (F12)
- Chercher des erreurs JavaScript (red icons)
- Vérifier l'onglet Réseau (Network) : tous les fichiers se chargent-ils ?

**Causes courantes :**
1. **customConfig.js manquant** → Copier `customConfig.DIST.js` en `customConfig.js`
3. **CORS erreur** → Services OGC doivent supporter CORS
4. **Syntaxe JSON invalide** → Vérifier `customConfig.js`

### Les données WMS ne s'affichent pas

**Diagnostic :**
- Vérifier que `layers=namespace:layername` est correct
- Vérifier que la couche existe sur le serveur WMS
- Ouvrir l'URL WMS directement dans le navigateur

**Causes courantes :**
1. **Erreur CORS** → Le serveur WMS doit envoyer `Access-Control-Allow-Origin: *`
2. **URL WMS incorrecte** → Vérifier `geOrchestraBaseUrl`
3. **Projection** → La couche doit être en EPSG:3857 ou reprojetable

### Requête GetFeatureInfo échoue

**Message :** « L'interrogation a échoué »

**Causes :**
1. **Couche non queryable** → Vérifier `queryable="1"` en GetCapabilities WMS
2. **CORS** → Erreur `No 'Access-Control-Allow-Origin' header`
3. **Erreur serveur** → Code HTTP 500 du serveur WMS

**Solution :**
```
// Mode simple : ajouter &q=0 pour désactiver
?layers=geor:commune&q=0

// Mode WebComponent : omettre q pour ne pas déclencher GetFeatureInfo
SViewer.init('#map', { layers: 'geor:commune' });
``

### Traductions manquantes

**Symptôme :** Texte en anglais au lieu de traduction.

**Cause :** Clé manquante dans `hardConfig.i18n[lang]`.

**Solution :** Ajouter la traduction manquante dans `etc/i18n.js`.

---

## Ressources supplémentaires

- **OpenLayers 10** : https://openlayers.org/
- **OGC WMS 1.3.0** : https://www.ogc.org/standards/wms
- **geOrchestra** : https://www.georchestra.org/
- **GeoServer** : https://geoserver.org/
