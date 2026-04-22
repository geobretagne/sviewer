sViewer - Visualiseur de cartes simple
=====================================

sViewer est un visualiseur de cartes web simple et léger. Il vous permet d'afficher et d'explorer des données cartographiques WMS sur tous les appareils : téléphone, tablette et ordinateur. SViewer est prévu pour s'intégrer à l'écosystème geOrchestra.


Qu'offre sViewer ?
-------------------

* **Visualisation cartographique** simple et intuitive
* **Contrôles tactiles** compatibles avec tous les appareils mobiles
* **Recherche de lieux** basée sur la géoplateforme française
* **Requêtes cartographiques** sur les services Web Map Service (WMS)
* **Partage de cartes** avec permaliens, codes QR et intégration à geOrchestra
* **Thème clair et sombre** : bascule via l'interface ou le paramètre `theme`
* **Langues multiples** : français, anglais, espagnol, allemand
* **Facilement intégrable** dans vos propres pages web
* **Entièrement autonome** : aucune dépendance externe (CDN)


Démarrage rapide
-----------------

### 1. Configuration initiale

Copiez le fichier de configuration d'exemple et adaptez-le à vos besoins :

```bash
cp etc/customConfig.DIST.js etc/customConfig.js
```

Éditez `etc/customConfig.js` pour personnaliser :
- L'adresse de votre serveur geOrchestra (ou votre GeoServer)
- Les fonds de carte fond par défaut
- Les couleurs et l'apparence générale

### 2. Télécharger le code sur votre serveur

Téléchargez l'ensemble du dossier `sviewer` sur votre serveur web (Apache, nginx, etc.).


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

**Avantages :**
- Très simple à utiliser
- Partage facile par lien web
- Code QR accessible via le panneau de partage
- Les paramètres sont mémorisés dans le permalink


### Option 2 : Mode WebComponent — Intégration dans vos pages

Incluez sViewer dans n'importe quelle page web existante en ajoutant trois lignes de code.

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

**Avantages :**
- Intégration discrète dans votre site
- Configuration entièrement en JavaScript
- Pas de popup nouvelle fenêtre
- Personnalisation fine et programmable


Mode Web : paramètres KVP
==========================

Vous pouvez configurer la carte en ajoutant des paramètres à l'URL. Voici les principaux :


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

Liste séparée par des virgules. Les données doivent être publiées sur votre serveur geOrchestra ou GeoServer.

```
https://geobretagne.fr/sviewer/?layers=geor:sdi
```

**Avec un style personnalisé :**

Ajoutez `*nomstyle` au nom de la donnée :

```
https://geobretagne.fr/sviewer/?layers=geor:sdi*mon_style
```

#### Paramètres de recherche et requête

**`q`** — Interroger la carte au démarrage

Affiche les informations d'une donnée WMS à une position donnée. Utile pour mettre en évidence une entité spécifique.

```
https://geobretagne.fr/sviewer/?layers=geor:sdi&q=1
```

**`s`** — Activer la recherche par texte

Active la recherche dans les attributs texte de la première donnée affichée.

```
https://geobretagne.fr/sviewer/?layers=geor:sdi&s=1
```


#### Paramètres d'affichage et partage

**`qr`** — Ouvrir la fenêtre code QR au démarrage

Ouvre automatiquement la modale contenant le code QR du permalink. Pratique pour un utilisateur sur mobile qui souhaite scanner rapidement.

```
https://geobretagne.fr/sviewer/?x=-366959&y=2951352&z=5&qr=1
```

**`debug`** — Activer les logs de debug

Affiche les logs de debug dans la console du navigateur (F12). Utile pour diagnostiquer les problèmes.

```
https://geobretagne.fr/sviewer/?layers=xyz&debug=true
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


**Note :** Les paramètres `x`, `y`, `z`, `title`, `layers`, `q`, `theme` et `c` sont **persistants** : ils sont mémorisés quand vous partagez la carte via le bouton « Configuration » ou le code QR.


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

**Exemple complet :**

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

Tous les paramètres du mode simple peuvent être passés en JavaScript. Le bouton **HTML** du panneau de partage génère automatiquement ce fragment pour la vue courante.


Intégration avec geOrchestra
=============================

Si vous utilisez une **infrastructure geOrchestra**, sViewer s'intègre nativement :

* Affichage automatique du titre, résumé, légende et attribution des données WMS
* Bouton « Éditer avec Mapfishapp » : envoie la carte vers l'éditeur avancé
* Fonction « Envoyer vers sViewer » depuis le visualiseur avancé


Notes techniques
================

* **Technologie** : OpenLayers 10, jQuery 4.x, Bootstrap 5
* **Projection** : EPSG:3857 (Web Mercator)
* **Langue** : Français par défaut, mais supporte aussi l'anglais, l'espagnol et l'allemand
* **Thèmes** : clair (défaut) et sombre, activables via `?theme=dark` ou l'option `{ theme: 'dark' }` en mode WebComponent
* **Serveur** : Aucun composant côté serveur requis (excepté un proxy Ajax optionnel pour les requêtes CORS)
* **Compatibilité** : Tous les navigateurs modernes (desktop, tablet, mobile)


Support et ressources
=====================

* **Codes sources** : Les fichiers principaux sont `js/sviewer.js` (logique métier), `js/embed.js` (intégration), `css/sviewer.css` (style) et `index.html` (page web)
* **Gestion de configuration** : Éditez `etc/customConfig.js`
* **Problème de chargement ?** Vérifiez que votre serveur web (Apache, nginx) sert correctement les fichiers CSS et JS
* **Pour contribuer** : Consultez les fichiers de configuration et personnalisez selon vos besoins


Licence
=======

Ce projet est sous licence geOrchestra. Consultez le fichier LICENSE pour plus de détails.

© geOrchestra — https://www.georchestra.org/
