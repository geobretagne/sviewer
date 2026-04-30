sViewer - Visualiseur de cartes simple
=====================================

sViewer est un visualiseur de cartes web simple et léger. Il vous permet d'afficher et d'explorer des données cartographiques WMS sur tous les appareils : téléphone, tablette et ordinateur. SViewer est prévu pour s'intégrer à l'écosystème geOrchestra.


Qu'offre sViewer ?
-------------------

* **Visualisation cartographique** simple et intuitive
* **Contrôles tactiles** compatibles avec tous les appareils mobiles
* **Recherche de lieux** basée sur la géoplateforme française
* **Requêtes cartographiques** sur les services Web Map Service (WMS)
* **Partage de cartes** avec permaliens, codes QR
* **Thème clair et sombre** : bascule via l'interface ou le paramètre `theme`
* **Langues multiples** : français, anglais, espagnol, allemand
* **Progressive Web App (PWA)** : installable sur mobile comme une application native, fonctionne hors ligne
* **Facilement intégrable** dans vos propres pages web
* **Entièrement autonome** : aucune dépendance externe (CDN)


Démarrage rapide
-----------------

### 1. Télécharger le code sur votre serveur

Téléchargez l'ensemble du dossier `sviewer` sur votre serveur web (Apache, nginx, etc.).

### 2. Configuration initiale

Copiez le fichier de configuration d'exemple et adaptez-le à vos besoins :

```bash
cp etc/customConfig.DIST.js etc/customConfig.js
```

Éditez `etc/customConfig.js` pour personnaliser :
- L'adresse de votre serveur geOrchestra (ou votre GeoServer)
- Les fonds de carte
- Le thème
- Les emprises. Sviewer utilise uniquement la projection EPSG:3857.




Deux façons d'utiliser sViewer
===============================

Vous avez deux options pour intégrer sViewer dans votre écosystème.


### Option 1 : Mode Web — Accès direct

Appelez simplement `index.html` avec des paramètres dans l'adresse web (KVP : Key-Value Pairs).

**Exemple basique :**

```
https://geobretagne.fr/sviewer/?x=-366959&y=2951352&z=5&title=Ma%20carte
```

Cela ouvre sViewer centré sur les coordonnées indiquées et avec un titre personnalisé.

### Option 2 : Mode WebComponent — Intégration dans vos pages

Incluez sViewer dans n'importe quelle page web existante en ajoutant et en configurant ce code.

**Exemple :**

```html
<div id="ma-carte" style="width: 100%; height: 600px;"></div>

<script src="https://geobretagne.fr/sviewer/js/embed.js"></script>
<script>
  SViewer.init('#ma-carte', {
    x: -366959,
    y: 2951352,
    z: 5,
    title: 'Ma carte intégrée'
  });
</script>
```

Mode Web : paramètres KVP
==========================

Vous pouvez configurer la carte en ajoutant des paramètres à l'URL.


#### Paramètres de positionnement

**`x`, `y`, `z`** — Positionner la carte

Centre la carte sur les coordonnées `x, y` (en unités EPSG:3857, système Web Mercator) et définit le niveau de zoom `z`.

```
https://geobretagne.fr/sviewer/?x=-366959&y=2951352&z=5
```

**`title`** — Titre personnalisé

Affiche un titre en haut de la carte. Utilisez un texte court adapté à l'affichage mobile.

```
https://geobretagne.fr/sviewer/?x=-366959&y=2951352&z=5&title=Centre%20de%20Rennes
```

**`lb`** — Choisir le fond de carte

Affiche le fond de carte `#lb` (le fond de carte 0 est par défaut). Consultez `etc/customConfig.js` pour voir les fonds disponibles.

```
https://geobretagne.fr/sviewer/?lb=1
```


#### Paramètres de données cartographiques

**`layers`** — Afficher des données geOrchestra ou GeoServer

Liste séparée par des virgules. Les données doivent être publiées sur votre serveur geOrchestra ou GeoServer spécifié dans `customConfig.js`.

```
https://geobretagne.fr/sviewer/?layers=dreal_b:ae_casparcas
```

**Avec un style personnalisé :**

Ajoutez `*nomstyle` au nom de la donnée :

```
https://geobretagne.fr/sviewer/?layers=dreal_b:ae_casparcas*default
```

**Avec un serveur WMS externe :**

Spécifiez un serveur WMS personnalisé en ajoutant `@url-du-wms` au paramètre layer. Cela permet d'afficher des données publiées sur n'importe quel serveur WMS 1.3.0.

```
https://geobretagne.fr/sviewer/?layers=layername@https://wms.example.com/geoserver/wms
```

Format complet : `namespace:layername[*style][*cql_filter]@wms-endpoint-url`

Exemples :
```
https://geobretagne.fr/sviewer/?layers=workspace:data@https://external-wms.example.com/service
https://geobretagne.fr/sviewer/?layers=ns:layer*custom_style@https://wms.example.com/geoserver/wms
```

**`md`** — Afficher une couche via son identifiant de métadonnée GeoNetwork

Charge automatiquement la couche OGC:WMS décrite dans la fiche ISO 19139 correspondante. L'endpoint CSW utilisé est `${geOrchestraBaseUrl}/geonetwork/srv/eng/csw`.

```
https://geobretagne.fr/sviewer/?md=fb5861f1-1b20-417f-abb6-9fc316c0307d
```

sViewer interroge le CSW, extrait l'URL WMS et le nom de la donnée depuis `gmd:distributionInfo`, puis charge la donnée et remplit le panneau de documentation avec les métadonnées (titre, résumé, producteur, licence, date). Ce paramètre est incompatible avec `layers=` : si les deux sont présents, `layers=` est prioritaire.

> Le paramètre `md` est **persistant** : il est mémorisé dans le permalink et le code d'intégration.

#### Paramètres de recherche et requête

**`q`** — Interroger la carte au démarrage

Au chargement, affiche les informations au centre de la carte.

```
https://geobretagne.fr/sviewer/?layers=geor:sdi&q=1
```

**`s`** — Recherche d'objets dans les données WFS

Active la fonction de recherche sur les données. Lorsque les données WMS ont un service WFS associé, comme cela est le cas dans geOrchestra, cette fonction permet d'interroger simultanément le service de géolocalisation et le service de données. La recherche sur les données porte sur tous ses champs texte.

```
https://geobretagne.fr/sviewer/?layers=dreal_b:ae_casparcas&s=1
```

- Chaque résultat affiche les champs de l'objet (clé : valeur)
- Cliquer sur un résultat recentre la carte et affiche la fiche d'information
- La limite de résultats WFS est configurable via `maxWfsSearchFeatures` dans `customConfig.js` (défaut : 8)
- Le service WFS doit supporter CORS

**`debug`** — Mode debug

Affiche les logs de debug dans la console du navigateur (F12). Avec `debug=1`, charge les fichiers JS/CSS non-minifiés.

```
https://geobretagne.fr/sviewer/?layers=xyz&debug=true
https://geobretagne.fr/sviewer/?layers=xyz&debug=1
```

**`c`** — Utiliser une configuration personnalisée

Charge une configuration alternative (voir section **Configurations personnalisées**).

```
https://geobretagne.fr/sviewer/?c=ma_config
```


**`theme`** — Choisir le thème d'affichage

Bascule entre le thème clair (défaut) et le thème sombre.

```
https://geobretagne.fr/sviewer/?theme=dark
```

Le choix du thème peut aussi se faire interactivement via le panneau **Configuration** (bouton en haut à droite). Le thème sombre est mémorisé dans le permalink si sélectionné.

Valeurs acceptées : `light` (défaut), `dark`.


**Note :** Les paramètres `x`, `y`, `z`, `layers`, `md`, `q`, `s`, `theme`, `c` et `lb` sont **persistants** dans le permalien et QR code. Le paramètre `title` est inclus dans le code d'intégration WebComponent uniquement.


Configurations personnalisées
=============================

Vous pouvez créer plusieurs configurations de sViewer pour différents besoins (par ville, par thème, etc.).

**Étapes :**

1. Copiez le fichier de configuration :
   ```bash
   cp etc/customConfig.js etc/customConfig_ma_config.js
   ```

2. Éditez `etc/customConfig_ma_config.js` selon vos besoins.

3. Accédez à sViewer avec votre configuration :
   ```
   https://geobretagne.fr/sviewer/?c=ma_config
   ```

**Restrictions de nom :** Le nom de configuration doit contenir uniquement des lettres, chiffres, tirets et underscores (ex : `ma_config`, `svi-bretagne-2024`).


Mode WebComponent : paramètres JavaScript
===========================================

Quand vous utilisez le mode WebComponent (intégration dans une page), les options de configuration sont passées en JavaScript au lieu de l'URL. **Les noms de paramètres sont exactement les mêmes** qu'en mode simple.

**Exemple :**

```html
<div id="ma-carte"></div>
<script src="https://geobretagne.fr/sviewer/js/embed.js"></script>
<script>
  SViewer.init('#ma-carte', {
    x: -366959,                       // coordonnées EPSG:3857
    y: 2951352,
    z: 5,                             // niveau de zoom
    title: 'Ma carte intégrée',       // titre
    layers: 'geor:sdi',               // donnée à afficher
    lb: 1,                            // fond de carte
    theme: 'dark'                     // thème : 'light' (défaut) ou 'dark'
  });
</script>
```

**Exemple avec un serveur WMS externe :**

```html
<div id="ma-carte"></div>
<script src="https://geobretagne.fr/sviewer/js/embed.js"></script>
<script>
  SViewer.init('#ma-carte', {
    x: -366959,
    y: 2951352,
    z: 5,
    title: 'Carte avec WMS externe',
    layers: 'workspace:data@https://wms.example.com/geoserver/wms',
    theme: 'light'
  });
</script>
```

Tous les paramètres du mode simple peuvent être passés en JavaScript. Le bouton **HTML** du panneau de partage génère automatiquement ce fragment pour la vue courante.

Notes techniques
================

* **Technologie** : OpenLayers 10, jQuery 4.x, Bootstrap 5
* **Projection** : EPSG:3857 (Web Mercator)
* **Langue** : Français par défaut, mais supporte aussi l'anglais, l'espagnol et l'allemand
* **Thèmes** : clair (défaut) et sombre, activables via `?theme=dark` ou l'option `{ theme: 'dark' }` en mode WebComponent
* **Progressive Web App** : sViewer peut être installé comme application sur mobile (Android, iOS) et inclut un Service Worker pour le support hors ligne
* **Serveur** : Aucun composant côté serveur requis. Inconvénient : CORS obligatoire sur les services.



