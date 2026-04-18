# Guide de Référence sViewer

Guide technique complet pour développeurs et intégrateurs. Pour une introduction non-spécialisée, consultez [README.md](README.md).

---

## Sommaire

1. [Mode Simple : Paramètres KVP](#mode-simple--paramètres-kvp)
2. [Mode WebComponent : API JavaScript](#mode-webcomponent--api-javascript)
3. [Configuration Avancée](#configuration-avancée)
4. [Services OGC et Couches](#services-ogc-et-couches)
5. [Projections et Repères](#projections-et-repères)
6. [Requêtes Cartographiques](#requêtes-cartographiques)
7. [Intégration geOrchestra](#intégration-georchestra)
8. [Internationalization (i18n)](#internationalization-i18n)
9. [Architecture et API Interne](#architecture-et-api-interne)
10. [Dépannage](#dépannage)

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

**Configuration :** Les couches disponibles sont définies dans `etc/customConfig.js` → `layersBackground[]`. L'index par défaut est 0.

---

### Paramètres de couches cartographiques

#### `layers`

Ajoute une ou plusieurs couches WMS à la carte. Format : liste séparée par des virgules.

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
- Les couches doivent être publiées sur un serveur OGC (geOrchestra, GeoServer, etc.)
- Si `geOrchestraBaseUrl` est configuré, sViewer construit automatiquement les URLs WMS
- Les styles doivent exister sur le serveur pour être appliqués
- Les filtres CQL utilisent la syntaxe OGC standard

#### `wmc` (Web Map Context)

Charge un contexte cartographique complet (couches + propriétés).

**Par identifiant geOrchestra :**
```
?wmc=9be95a6894a3dc6135c8cd760d83f6ef
```

**Par URL complète :**
```
?wmc=https://geobretagne.fr/context/default/05.xml
```

**Format WMC :** Fichier XML OGC WMC 1.1.1 ou 1.3.0.
**CORS :** Le serveur WMC doit supporter CORS.

#### `kml`

Ajoute des entités géographiques depuis un fichier KML.

```
?kml=https://exemple.com/mes-points.kml
```

**Format :** KML 2.2 standard.
**Contenu:** Points, lignes, polygones, MultiGeometry.
**Popup :** Les attributs `<description>` s'affichent au clic sur une entité.
**CORS :** L'URL doit supporter CORS.

---

### Paramètres de requête et recherche

#### `q` (query)

Active une requête GetFeatureInfo au démarrage sur les couches visibles.

```
?layers=geor:commune&q=1
```

**Comportement :**
- Exécute une requête au centre de la vue initiale
- Affiche les résultats dans le panneau Résultats
- Nécessite au moins une couche queryable (attribut `queryable="1"` en WMS)

#### `s` (search)

Active la barre de recherche de lieux au démarrage.

```
?s=1
```

**Service utilisé :** IGN Géoplateforme (ou service configuré dans `customConfig.openLSGeocodeUrl`).
**CORS :** Le service de géocodage doit supporter CORS.

---

### Paramètres d'affichage et partage

#### `qr` (QR code)

Ouvre automatiquement la modale affichant le code QR du permalink au démarrage.

```
?qr=1
```

**Cas d'usage:** Utilisateur sur mobile veut partager instantanément la vue.

**Note:** Le QR code est disponible à tout moment via le bouton « QR code » du panneau de partage.

#### `c` (configuration)

Charge une configuration alternative au lieu de `customConfig.js`.

```
?c=ma_config
```

**Mécanisme :**
- Charge dynamiquement `etc/customConfig_ma_config.js`
- Écrase les paramètres par défaut avec les valeurs de cette configuration
- Restrictions de nom : `[a-zA-Z0-9_-]+` uniquement

**Exemple de fichier :**
```javascript
// etc/customConfig_bretagne.js
$.extend(customConfig, {
    title: 'Carte Bretagne',
    initialExtent: [-600000, 6090000, -100000, 6100000],
    layersBackground: [ /* ... */ ]
});
```

---

### Paramètres persistants

Les paramètres suivants sont **mémorisés** dans le permalien et le code QR :
- `x`, `y`, `z`
- `title`
- `layers`
- `wmc`
- `kml`
- `q`
- `c`

Les paramètres `lb`, `s`, `qr` ne sont **pas** persistants.

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

Tableau de toutes les options (équivalent aux paramètres KVP en mode simple) :

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `center` | `[x, y]` | `[-366959, 2951352]` | Coordonnées initiales (EPSG:3857) |
| `zoom` | `number` | `5` | Niveau de zoom (0-18) |
| `title` | `string` | `'Map'` | Titre de la carte |
| `lb` | `number` | `0` | Index de la couche de fond |
| `layers` | `string` | `''` | Couches à afficher (séparées par virgules) |
| `wmc` | `string` | `''` | Identifiant ou URL d'un Web Map Context |
| `kml` | `string` | `''` | URL d'un fichier KML |
| `q` | `boolean` | `false` | Activer requête GetFeatureInfo au démarrage |
| `s` | `boolean` | `false` | Afficher la barre de recherche |
| `qr` | `boolean` | `false` | Ouvrir la modale code QR au démarrage |
| `lang` | `string` | `'fr'` | Langue (fr, en, es, de, ru) |
| `geOrchestraBaseUrl` | `string` | `'https://geobretagne.fr/'` | URL de base geOrchestra |
| `maxFeatures` | `number` | `10` | Nombre max de résultats GetFeatureInfo |
| `openLSGeocodeUrl` | `string` | IGN Géoplateforme | URL du service de géocodage |
| `layersBackground` | `array` | OpenStreetMap | Couches de fond (ol.layer.Tile) |

### Exemples complets

**Exemple minimal :**
```javascript
SViewer.init('#ma-carte', {
    center: [-366959, 2951352],
    zoom: 5
});
```

**Exemple avec couches :**
```javascript
SViewer.init('#ma-carte', {
    center: [0, 2000000],
    zoom: 6,
    title: 'Ressources nationales',
    layers: 'geor:commune,geor:departement',
    wmc: '9be95a6894a3dc6135c8cd760d83f6ef'
});
```

**Exemple avec configuration personnalisée :**
```javascript
var mapElement = document.getElementById('mon-widget');
mapElement.style.width = '800px';
mapElement.style.height = '600px';

SViewer.init('#mon-widget', {
    center: [265000, 6250000],
    zoom: 8,
    lang: 'en',
    geOrchestraBaseUrl: 'https://mon-serveur.org/',
    layersBackground: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ]
});
```

---

## Configuration Avancée

### Fichier customConfig.js

La configuration centralisée d'une instance sViewer se fait dans `etc/customConfig.js`.

**Structure :**
```javascript
customConfig = {
    title: 'GeoBretagne sViewer',
    lang: 'fr',
    geOrchestraBaseUrl: 'https://geobretagne.fr',
    initialExtent: [-600000, 6090000, -100000, 6100000],
    maxExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
    restrictedExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
    maxFeatures: 10,
    nodata: '<!--nodatadetect-->\n<!--nodatadetect-->',
    openLSGeocodeUrl: "https://data.geopf.fr/geocodage/search",
    layersBackground: [ /* ... */ ],
    socialMedia: { /* ... */ }
};
```

### Étendues (Extents)

Trois étendues contrôlent le comportement de la carte :

- **`initialExtent`** : Zone affichée au démarrage
- **`maxExtent`** : Limite du panoramique (pan limits)
- **`restrictedExtent`** : Limite du zoom (zoom limits)

Format : `[minX, minY, maxX, maxY]` en EPSG:3857.

**Exemple : Brûler la région française**
```javascript
initialExtent: [-600000, 6090000, -100000, 6100000],
maxExtent: [-20037508, -20037508, 20037508, 20037508],
restrictedExtent: [-20037508, -20037508, 20037508, 20037508]
```

### Couches de fond

Configuration des couches de base disponibles dans le sélecteur :

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
- Chaque couche doit avoir un attribut `title`
- Toutes les couches doivent être en EPSG:3857
- Les couches OSM/WMTS sont recommandées (performance, fiabilité)

### Partage social

Configuration des liens de partage social (mode simple uniquement) :

```javascript
socialMedia: {
    'Twitter': 'https://twitter.com/intent/tweet?text=',
    'LinkedIn': 'https://www.linkedin.com/sharing/share-offsite/?url=',
    'Facebook': 'https://www.facebook.com/sharer/sharer.php?u='
}
```

Le permalink est ajouté automatiquement à chaque URL de partage.

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

## Services OGC et Couches

### Web Map Service (WMS)

sViewer supporte **WMS 1.3.0** uniquement.

#### GetCapabilities

sViewer lit automatiquement les capacités WMS pour :
- Obtenir les couches disponibles
- Lire les métadonnées (titre, résumé)
- Déterminer si une couche est queryable

#### GetFeatureInfo

Requête pour interroger une couche à une position donnée.

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

#### Propriétés requises pour les couches

Chaque couche WMS doit :
- Supporter **EPSG:3857** (Web Mercator)
- Avoir un attribut `queryable="1"` si on souhaite l'interroger
- Supporter **HTTPS** (pas d'URLs non chiffrées)
- Supporter **CORS** (pas de proxy nécessaire)

### Web Map Context (WMC)

Format OGC pour sauvegarder une configuration de carte (couches + vue).

**Versions supportées :** WMC 1.1.1 et 1.3.0.

**Exemple de WMC minimal :**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ViewContext version="1.3.0">
  <General>
    <Window width="800" height="600"/>
    <BoundingBox minx="-180" miny="-85" maxx="180" maxy="85" srs="EPSG:3857"/>
  </General>
  <LayerList>
    <Layer queryable="1" visible="1">
      <Name>geor:commune</Name>
      <Server service="OGC:WMS" version="1.3.0">
        <OnlineResource href="https://geobretagne.fr/geoserver/wms"/>
      </Server>
    </Layer>
  </LayerList>
</ViewContext>
```

### KML (Keyhole Markup Language)

Format texte pour des entités géographiques (points, lignes, polygones).

**Exemple KML :**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Mairie de Rennes</name>
      <description>8, Boulevard de la Paix</description>
      <Point>
        <coordinates>-1.68,48.11,0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>
```

**Notes :**
- Les coordonnées sont en EPSG:4326 (longitude, latitude)
- sViewer projette automatiquement en EPSG:3857
- Les descriptions s'affichent au clic sur une entité

---

## Projections et Repères

### Projections supportées

**EPSG:3857 (Web Mercator) est l'unique projection supportée.**

Toutes les couches WMS, KML et contextes doivent être dans cette projection ou seront reprojetées automatiquement.

### EPSG:3857 (Web Mercator)

- **Nom complet :** Web Mercator Auxiliary Sphere
- **Unité :** mètre
- **Étendue mondiale :** `[-20037508.34, -20037508.34, 20037508.34, 20037508.34]`
- **Distorsion :** Pôles non représentés (latitude max ≈ ±85.06°)

### EPSG:4326 (WGS84)

Utilisé en entrée (URL KML, résultats de géocodage).

**Conversion approximative :**
```
Web Mercator X = longitude * 20037508.34 / 180
Web Mercator Y = latitude  * 20037508.34 / 180  (simplifié)
```

La conversion exacte utilise proj4.js (inclus).

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

Saisie libre d'adresse/lieu → requête OpenLS Geocoding.

**Résultats :**
- Liste avec score de pertinence
- Clic sur un résultat = panoramique + zoom vers le lieu
- Marqueur temporaire

**Limitations :**
- Service externe (IGN Géoplateforme)
- Couverture variable selon région
- CORS obligatoire

---

## Intégration geOrchestra

Si `geOrchestraBaseUrl` est configuré, sViewer active des fonctionnalités avancées :

### Édition avec Mapfishapp

Bouton **« Éditer avec geOrchestra »** → exporte la carte vers l'éditeur avancé Mapfishapp.

**Lien généré :**
```
https://geobretagne.fr/mapfishapp/
  ?wmc=IDENTIFIANT_WMC&layers=...
```

### Lecture de contextes (WMC)

sViewer peut charger des contextes sauvegardés depuis geOrchestra :

```
?wmc=9be95a6894a3dc6135c8cd760d83f6ef
```

geOrchestra expose les contextes à :
```
https://geobretagne.fr/geonetwork/api/records/{uuid}/attachments
```

### Légendes et métadonnées

Pour chaque couche publiée depuis geOrchestra :
- Légende graphique (si disponible)
- Titre et résumé
- Lien vers métadonnées GeoNetwork

---

## Internationalization (i18n)

### Langues supportées

| Langue | Code | Status |
|--------|------|--------|
| Français | `fr` | Défaut, complet |
| Anglais | `en` | Complet |
| Espagnol | `es` | Complet |
| Allemand | `de` | Complet |
| Russe | `ru` | Optionnel |

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
1. Paramètre `lang` (KVP ou option JS)
2. `customConfig.lang`
3. Détection navigateur (Accept-Language)
4. Défaut : français

---

## Architecture et API Interne

### Fichiers clés

| Fichier | Responsabilité |
|---------|---|
| `js/embed.js` | Chargement des dépendances + création du DOM + API SViewer.init() |
| `js/sviewer.js` | Logique métier : carte, couches, requêtes, état |
| `css/sviewer.css` | Styles sViewer + overrides Bootstrap/OpenLayers |
| `etc/customConfig.js` | Configuration (obligatoire) |
| `etc/i18n.js` | Traductions UI |
| `index.html` | Point d'entrée mode simple |

### Dépendances

- **jQuery 1.12.4** : manipulation DOM, requêtes AJAX
- **Bootstrap 5** : composants UI, responsive
- **OpenLayers 10** : rendu de carte, interactions OGC
- **proj4.js** : projections cartographiques
- **qrcode.js** : génération codes QR (chargement lazy)

Toutes les dépendances sont **self-hosted** (pas de CDN).

### Flux de chargement (Mode WebComponent)

```
embed.js
  ├── Détecte baseUrl
  ├── Charge parallèlement :
  │   ├── jQuery 1.12.4
  │   ├── proj4.js
  │   ├── OpenLayers (CSS + JS)
  │   ├── Bootstrap (CSS + JS)
  │   └── sViewer CSS
  ├── Crée le DOM (.sv-scope container)
  ├── Charge i18n.js (avant sviewer.js!)
  └── Charge sviewer.js
      └── Initialise la carte, appelle init()
```

### Objet config (global)

Fusionné à partir de :
1. `hardConfig` (défauts sViewer)
2. `customConfig` (configuration locale)
3. Paramètres KVP ou options JS
4. Paramètres geOrchestra

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
    layersVisible: [],            // Couches visibles
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
2. **CDN bloqué** → Utiliser auto-hébergement ou proxy
3. **CORS erreur** → Services OGC doivent supporter CORS
4. **Syntaxe JSON invalide** → Vérifier `customConfig.js`

### Les couches WMS ne s'affichent pas

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

// Mode WebComponent
SViewer.init('#map', { layers: 'geor:commune', q: false });
```

### Recherche de lieux ne fonctionne pas

**Causes :**
1. **Service géocodage inaccessible**
2. **CORS** → Service doit supporter CORS
3. **Configuration URL** → `openLSGeocodeUrl` invalide

**Workaround :** Utiliser un proxy CORS externe ou serveur proxy local.

### Code QR vide

**Cause :** qrcode.js ne charge pas (réseau lent).

**Solution :** Augmenter le délai avant d'afficher le code QR.

### Traductions manquantes

**Symptôme :** Texte en anglais au lieu de traduction.

**Cause :** Clé manquante dans `hardConfig.i18n[lang]`.

**Solution :** Ajouter la traduction manquante dans `etc/i18n.js`.

---

## Ressources supplémentaires

- **OpenLayers 10** : https://openlayers.org/
- **OGC WMS 1.3.0** : https://www.ogc.org/standards/wms
- **OGC WMC 1.3.0** : https://www.ogc.org/standards/wmc
- **geOrchestra** : https://www.georchestra.org/
- **GeoServer** : https://geoserver.org/
- **KML 2.2** : https://www.ogc.org/standards/kml
