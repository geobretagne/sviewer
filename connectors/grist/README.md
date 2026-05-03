# sViewer — widget Grist

Widget cartographique interactif pour [Grist](https://www.getgrist.com), propulsé par sViewer.

## Installation

1. Dans votre document Grist, ouvrez une page.
2. Cliquez sur **Ajouter un widget** → **Widget personnalisé**.
3. Dans le champ **URL du widget**, saisissez :
   ```
   https://votre-serveur/sviewer/connectors/grist/
   ```
4. Dans **Accès**, choisissez **Complet** (requis pour lire et écrire les options du widget).
5. Dans **Données**, sélectionnez la table contenant vos géométries.
6. Cliquez sur **Confirmer**.

Le widget démarre et détecte automatiquement la colonne géométrie.

## Barre d'outils

| Contrôle | Rôle |
|----------|------|
| *N entités (M ignorées)* | Nombre d'entités chargées. Les lignes sans géométrie valide sont comptées comme ignorées. |
| **✕ Désélectionner** | Efface la sélection courante. Actif uniquement lorsqu'une ligne est sélectionnée. |

## Panneau de configuration

Cliquez sur **⚙ Modifier le widget** dans Grist (crayon en haut à droite du widget) pour ouvrir le panneau de configuration, organisé en quatre onglets.

### Onglet Données

Configure la géométrie et le style des entités affichées.

**Mode géométrie** — détermine comment la colonne géométrie est interprétée :

| Mode | Description |
|------|-------------|
| Auto | Détection automatique (GeoJSON → WKT → lat/lon colonnes → texte lat,lon) |
| GeoJSON | Colonne contenant un objet GeoJSON (`{"type":"Point","coordinates":[...]}`) ou une chaîne JSON équivalente |
| Lat / Lon (colonnes) | Deux colonnes numériques séparées : latitude et longitude |
| Lat,Lon (texte) | Colonne texte au format `"lat,lon"` (ex. `"48.4,-4.5"`) |
| Lon,Lat (texte) | Colonne texte au format `"lon,lat"` (ex. `"-4.5,48.4"`) |
| WKT | Colonne texte au format WKT (ex. `"POINT(-4.5 48.4)"`) |

**Colonne géométrie** — colonne contenant la géométrie (modes GeoJSON, texte, WKT).  
**Colonne latitude / longitude** — colonnes numériques utilisées en mode Lat/Lon colonnes.  
**Colonne étiquette** — colonne affichée en texte sur chaque entité ; laisser vide pour masquer.

**Style des entités** — couleur, opacité et épaisseur du contour et du remplissage pour les entités normales et sélectionnées. Les valeurs par défaut proviennent de `customConfig.geojsonStyle` (côté sViewer).

### Onglet Carte

| Champ | Rôle |
|-------|------|
| Fond de carte | Sélectionne le fond de carte initial (index dans `backgroundPresets` ou `layersBackground`) |
| Données WMS | Couche(s) WMS à afficher (identifiant Grist : `couche1,couche2`) |
| Métadonnée CSW | Identifiant CSW/ISO 19139 pour charger une couche depuis GeoNetwork (`md=`) |
| Centre X / Y | Centre de la carte en EPSG:3857 |
| Zoom | Niveau de zoom initial (0–22) |
| Ajuster à l'étendue | Recadre automatiquement la carte sur les données à chaque chargement |

### Onglet Partage

| Champ | Rôle |
|-------|------|
| Titre | Titre affiché dans la barre sViewer (`title=`) |
| URL de base sViewer | Racine du déploiement sViewer (pour le lien de partage) |
| URL de base API Grist | Hôte Grist — obligatoire pour les instances auto-hébergées |
| URL de base geOrchestra | Hôte geOrchestra pour les fonctions avancées (catalogue, proxy WMS) |

### Onglet Aide

Résumé des fonctions du panneau, accessible directement dans l'interface.

### Enregistrer / Annuler

**Enregistrer** applique les paramètres, reconstruit la carte et persiste la configuration dans les options widget Grist (par instance). Un avertissement s'affiche tant que vous n'avez pas cliqué sur **Enregistrer** dans la barre Grist pour figer les options.

**Annuler** ferme le panneau sans modifier quoi que ce soit.

> **Note :** Les options sont stockées côté Grist via `widgetApi.setOptions`. Chaque widget (chaque vue) dispose de sa propre configuration indépendante.

### Exporter / Importer

**Exporter** copie la configuration courante dans le presse-papiers au format JSON.  
**Importer** affiche une zone de texte où coller un JSON précédemment exporté, pour dupliquer la configuration d'un autre widget.

## Fonctionnalités

- **Carte → Grist** : cliquez sur une entité de la carte pour sélectionner la ligne dans Grist
- **Grist → carte** : sélectionnez une ligne dans Grist pour centrer et zoomer la carte sur l'entité
- **Étiquettes** : texte de chaque entité affiché sur la carte ; entité sélectionnée en gras
- **Partager** : génère un lien autonome (`?geojson=<url_api_grist>`) incluant les hints géométriques — le mode et la colonne choisis sont préservés dans le lien

## Sélection bidirectionnelle

1. Sélectionnez le **widget carte** → panneau latéral → **Données** → **Sélectionner par** : choisissez le tableau de données.
2. Sélectionnez le **tableau de données** → panneau latéral → **Données** → **Sélectionner par** : choisissez le widget carte.

Résultat :
- Clic sur une ligne du tableau → la carte zoome et met en surbrillance l'entité.
- Clic sur une entité de la carte → le tableau filtre sur la ligne correspondante.

## Détection automatique des colonnes

En mode **Auto**, le widget scanne dans cet ordre :

1. Noms de colonnes reconnus comme GeoJSON : `geometry`, `geom`, `geo`, `shape`, `wkb_geometry`
2. Première ligne à la recherche d'une valeur GeoJSON valide (objet `{ type, coordinates }` ou chaîne JSON)
3. Colonnes WKT (première valeur parseable par `ol.format.WKT`)
4. Paire lat/lon : colonnes nommées `latitude`/`lat` + `longitude`/`lon`/`lng`
5. Colonne texte au format `"lat,lon"` ou `"lon,lat"`

Si la détection échoue, un message invite à choisir manuellement dans le panneau de configuration.

Noms reconnus pour la colonne étiquette (premier match) : `label`, `nom`, `name`, `libelle`, `titre`, `title`

## Lien de partage — fonctionnement

Le bouton **Partager** de sViewer construit une URL autonome :

```
https://sviewer.example.org/?geojson=https://docs.getgrist.com/api/docs/{docId}/tables/{tableId}/records?_geommode=latlon_str&_geomcol=geo_point_2d&_labelcol=nom
```

Les hints `_geommode`, `_geomcol`, `_collat`, `_collon`, `_labelcol` encodent le choix manuel de la colonne géométrie pour que sViewer standalone ne tente pas une auto-détection différente.

Prérequis :
- Le document Grist doit être accessible publiquement (ou le lecteur doit y avoir accès)
- `jsonLayerAdapter` doit être configuré dans `etc/customConfig.js` de sViewer (présent par défaut)
- Pour Grist auto-hébergé : renseignez **URL de base API Grist** dans l'onglet Partage

## Migration depuis v0.4.0

La table `_sviewer_customConfig` n'est plus utilisée. La configuration est désormais stockée dans les options widget Grist (panneau de configuration tabulé). Les anciennes clés `feature_color` et `feature_highlight_color` sont migrées automatiquement au premier chargement.

## Prérequis

- Grist (cloud ou auto-hébergé)
- sViewer ≥ 0.5.0
- Les couches WMS doivent supporter CORS et HTTPS
