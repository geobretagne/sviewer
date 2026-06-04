sViewer — Visualiseur de cartes web
=====================================

sViewer affiche des cartes interactives dans un navigateur, sur téléphone, tablette ou ordinateur. Aucune installation, aucun compte requis.

---

**À qui s'adresse sViewer ?**

sViewer est fait pour les gens qui veulent une carte sans passer par un logiciel SIG, sans formation cartographique, sans compte à créer.

Le cas simple : une ou deux données parmi toutes celles déjà publiées par les géomaticiens, affichées sur une carte partagée avec des collègues ou affichée sur son site web.

sViewer n'est **pas** un logiciel SIG : pas de dessin, pas d'analyse spatiale, pas de gestion de "couches". Si vous cherchez un outil pour publier beaucoup de données, regardez [mviewer](https://mviewer.github.io/fr/), [mapstore](https://docs.georchestra.geo-solutions.it/fr/latest/mapstore/index.html) ou encore [georchestra](https://georchestra.org). Ceci dit, sViewer complètera parfaitement ces environnements ! Pour de l'analyse complexe, regardez [QGIS](https://qgis.org/). Les données géographiques bénéficient d'un large écosystème et tout est disponible en logiciel libre : faites confiance à leurs communautés.

Ceci dit, sViewer sait faire d'autres choses grâce aux API publiques : croiser des isochrones avec des points d'intérêt ; calculer des profils altimétriques ; éditer des géométries dans Grist ; représenter les données dans Superset ; accéder aux photos Panoramax ; tracer et partager des annotations ; afficher des capteurs SensorThings et leurs séries temporelles. Le système d'extension offre de nombreuses possibilités 
en conservant un visualiseur hyper rapide.

---

![sViewer — carte avec panneau d'information ouvert](examples/screenshot-desktop.png)


Que permet sViewer ?
---------------------

* **Composer une vue en un clic** — [Blueprint](ext/blueprint/) : outil visuel avec validation du service WMS, autocomplétion du nom de donnée et aperçu en direct
* **Partager une vue exacte** — zoom, position et données préservés dans l'URL
* **Générer un QR code** — imprimez-le sur un panneau, une affiche, un document
* **Exporter en image** — PNG depuis le panneau de partage
* **Interroger les données** — cliquez sur la carte pour afficher la fiche d'une zone ou d'un objet
* **Traçabilité des données** — producteur, licence, date de mise à jour affichés automatiquement depuis les métadonnées
* **Superposer des données JSON ou GeoJSON** — chargez un fichier GeoJSON ou API JSON distant avec `?geojson=URL` ; ajoutez `&s=1` pour rendre les entités recherchables, `&q=1` pour interroger automatiquement l'entité au centre au démarrage
* **Rechercher une adresse** — barre de recherche intégrée, géolocalisation ; service de géocodage configurable (France ou mondial)
* **Thème clair et sombre** — manuel ou automatique selon le système
* **Tous les appareils** — téléphone, tablette, ordinateur, même URL
* **Intégrer dans n'importe quelle page** — une ligne `<iframe>` suffit
* **API JavaScript** — intégrez et contrôlez la carte
* **Logiciel libre, gratuit, auto-hébergeable** — licence GPL, aucun compte, aucune inscription, aucune dépendance externe
* **Extensions** qui étendent les possibilités : par exemple l'édition de géométries dans [Grist](https://www.getgrist.com), la représentation cartographique dans [Superset](https://superset.apache.org/), la visualisation de données CSV, l'affichage des photos [Panoramax](https://panoramax.fr/), l'annotation (tracer et partager des repères, traits et zones), ou l'affichage de capteurs [OGC SensorThings](https://www.ogc.org/standard/sensorthings/) avec graphiques temporels interactifs.


![sViewer sur mobile — panneau de partage ouvert](examples/screenshot-mobile.png)


Mettre vos données sur une carte
----------------------------------

sViewer affiche des données publiées via un **service WMS** (Web Map Service) — compatible avec tout serveur cartographique standard ([GeoServer](https://geoserver.org), MapServer, QGIS Server…). Les utilisateurs de [geOrchestra](https://georchestra.org) bénéficient d'une intégration native : métadonnées, catalogue, fiche [GeoNetwork](https://geonetwork-opensource.org). Trois cas de figure :

### Vous utilisez [geOrchestra](https://georchestra.org) ou [GeoServer](https://geoserver.org)

Vos données sont déjà publiées. Copiez l'URL de partage depuis le panneau de partage de votre catalogue, ou construisez l'URL manuellement :

```
https://my-sviewer.example.org/sviewer/?layers=mon_espace:ma_donnee
```

Remplacez `mon_espace:ma_donnee` par le nom de votre donnée WMS.

### Vous avez une fiche de métadonnées [GeoNetwork](https://geonetwork-opensource.org)

Utilisez l'identifiant de la fiche directement :

```
https://my-sviewer.example.org/sviewer/?md=fb5861f1-1b20-417f-abb6-9fc316c0307d
```

sViewer récupère automatiquement l'URL WMS et les métadonnées (titre, résumé, licence, producteur). Pour un catalogue différent de celui configuré par défaut, utilisez la syntaxe `identifiant@https://csw-endpoint`.

### Vous avez un tableur ([Grist](https://www.getgrist.com), CSV…) ou un shapefile

sViewer affiche des données via WMS — pas les fichiers directement. Deux alternatives :

- **Grist** — si vos données sont dans un document Grist avec une colonne géométrie, utilisez le [widget Grist intégré](ext/grist/) : carte interactive synchronisée avec le tableau, édition de géométries depuis la carte, lien de partage autonome. → [Documentation complète du widget Grist](ext/grist/README.md)
- **Apache Superset** — si vos données sont dans un dataset Superset avec une colonne géométrie, utilisez le [plugin Superset intégré](ext/superset/) : carte sViewer embarquée dans le tableau de bord, filtres natifs Superset propagés, symbologie graduée en taille et couleur. → [Documentation complète du plugin Superset](ext/superset/README.md)
- **Autres formats** — parlez à votre service SIG ou utilisez un outil comme [uMap](https://umap.openstreetmap.fr/) qui accepte les imports directs.


Composer une URL sViewer — Blueprint
--------------------------------------

**Blueprint** est une extension pour composer et partager une carte sViewer en moins d'une minute, sans connaître les paramètres d'URL.

Accès : `https://votre-serveur/sviewer/ext/blueprint/`

- Saisissez l'URL du service WMS ou l'identifiant de métadonnée → validation en temps réel (service disponible, donnée trouvée, CORS)
- Autocomplétion du nom de la donnée depuis les capacités WMS
- Configurez titre, fond de carte, zoom, thème, extension
- L'aperçu se met à jour automatiquement
- Copiez l'URL ou capturez la position depuis la carte


Partager une carte
-------------------

Le panneau de partage (bouton en haut à droite) propose :

- **Lien** — URL de la vue courante, copiable en un clic
- **QR code** — scannable depuis un téléphone ou une affiche imprimée
- **Image PNG** — export de la carte visible à l'écran
- **HTML** — code `<iframe>` ou fragment JavaScript pour intégrer dans une page

Le lien mémorise automatiquement le zoom, la position, les données affichées et le thème.


Intégrer dans une page web
---------------------------

### Option 1 — iFrame (sans code)

Copiez le code depuis le panneau de partage → onglet **HTML** :

```html
<iframe src="https://my-sviewer.example.org/sviewer/?layers=mon_espace:ma_donnee&x=-390192&y=6122108&z=10"
        width="100%" height="500" frameborder="0" allowfullscreen></iframe>
```

Fonctionne dans tout CMS (WordPress, Drupal, Joomla, Typo3…) sans aucune compétence JavaScript.

![sViewer intégré dans une page CMS](examples/screenshot-embed.png)

### Option 2 — JavaScript (pour les développeurs)

```html
<div id="ma-carte" style="height:500px"></div>
<script src="https://my-sviewer.example.org/sviewer/static/js/embed.min.js"></script>
<script>
  SViewer.init('#ma-carte', {
    x: -390192, y: 6122108, z: 10,
    layers: 'mon_espace:ma_donnee',
    title: 'Évaluation environnementale'
  });
</script>
```

→ [Documentation technique complète](TECHNICAL.md)


Démarrage rapide (administrateur)
-----------------------------------

```bash
# 1. Déposez le dossier sviewer/ sur votre serveur web (Apache, nginx…)
# 2. Appliquez le snippet nginx fourni — OBLIGATOIRE (voir ci-dessous)
# 3. Copiez et éditez la configuration
cp local/customConfig.DIST.js local/customConfig.js
# 4. Ouvrez dans un navigateur
https://votre-serveur/sviewer/
```

> **Important — configuration nginx obligatoire.** Le dossier contient des outils de build et des fichiers de configuration non destinés au public. Sans le snippet `deploy/nginx/nginx-server.conf`, ces fichiers sont accessibles à tout visiteur. Ne jamais servir le dossier à nu.

Paramètres configurables : fonds de carte, emprise initiale, URL [geOrchestra](https://georchestra.org), langue, géocodage.

→ [Référence complète des paramètres URL et de configuration](TECHNICAL.md)


Notes techniques
-----------------

* **Technologie** : OpenLayers 10, Bootstrap 5
* **Projection** : EPSG:3857 (Web Mercator) — les paramètres `x`/`y` acceptent aussi la longitude/latitude (EPSG:4326), détection automatique
* **Langues** : français, anglais, espagnol, allemand
* **Aucune dépendance externe** : toutes les librairies sont auto-hébergées (pas de CDN)
* **Géocodage** : [IGN Géoplateforme](https://geoplateforme.ign.fr) par défaut (France), remplaçable par [Nominatim](https://nominatim.openstreetmap.org) (OpenStreetMap, mondial) ou tout service compatible
* **Licence** : GPL-3.0-or-later


Remerciements
==============

* L'équipe [GéoBretagne](https://geobretagne.fr)
* Les contributeurs, utilisateurs et membres de la communauté [geOrchestra](https://georchestra.org)
* Les communautés du [logiciel libre](https://fr.wikipedia.org/wiki/Logiciel_libre) et de la [donnée ouverte](https://fr.wikipedia.org/wiki/Donn%C3%A9es_ouvertes)
* Les projets copains : [geOrchestra](https://github.com/georchestra/georchestra), [mviewer](https://github.com/mviewer/mviewer), [geonetwork-ui](https://github.com/geonetwork/geonetwork-ui)
* Les librairies libres : [OpenLayers](https://github.com/openlayers/openlayers), [Bootstrap](https://github.com/twbs/bootstrap), [Mustache](https://github.com/janl/mustache.js)
* [IGN Géoplateforme](https://geoplateforme.ign.fr) et [Nominatim / OpenStreetMap](https://nominatim.openstreetmap.org) — services de géocodage
