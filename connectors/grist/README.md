# sViewer — widget Grist

Widget cartographique interactif pour [Grist](https://www.getgrist.com), propulsé par sViewer.

## Installation

1. Dans votre document Grist, ouvrez une page.
2. Cliquez sur **Ajouter un widget** → **Widget personnalisé**.
3. Dans le champ **URL du widget**, saisissez :
   ```
   https://votre-serveur/sviewer/connectors/grist/
   ```
4. Dans **Accès**, choisissez **Complet** (requis pour lire la table de configuration).
5. Dans **Données**, sélectionnez la table contenant vos géométries.
6. Cliquez sur **Confirmer**.

Le widget démarre et détecte automatiquement la colonne géométrie et la colonne étiquette.

## Barre d'outils du widget

| Contrôle | Rôle |
|----------|------|
| **Géométrie** | Sélecteur de la colonne contenant les géométries GeoJSON. Appliqué immédiatement au changement. |
| **Étiquette** | Sélecteur de la colonne affichée en texte sur chaque entité de la carte. Laisser vide pour masquer les étiquettes. |
| *N entités* | Nombre d'entités chargées (entités ignorées si la géométrie est invalide). |
| **✕ Désélectionner** | Efface la sélection courante. Actif uniquement lorsqu'une entité est sélectionnée. |

## Détection automatique des colonnes

### Géométrie
Noms de colonnes reconnus (insensible à la casse) :
`geometry`, `geom`, `geo`, `shape`, `wkb_geometry`

Si aucun nom ne correspond, le widget scanne la première ligne à la recherche d'une valeur GeoJSON valide (objet `{ type, coordinates }` ou chaîne JSON équivalente).

Si la détection échoue, choisissez manuellement la colonne dans le sélecteur **Géométrie** de la barre d'outils.

### Étiquette
Noms de colonnes reconnus (insensible à la casse) :
`label`, `nom`, `name`, `libelle`, `titre`, `title`

La première colonne trouvée est utilisée. Modifiable à tout moment via le sélecteur **Étiquette**.

## Fonctionnalités

- **Carte → Grist** : cliquez sur une entité de la carte pour sélectionner la ligne correspondante dans Grist
- **Grist → carte** : sélectionnez une ligne dans Grist pour centrer et zoomer la carte sur l'entité
- **Étiquettes** : affichage du texte de chaque entité directement sur la carte ; l'entité sélectionnée est en gras
- **Sélection bidirectionnelle** : configurez « Sélectionner par » dans Grist pour activer les deux sens (voir ci-dessous)
- **Partager** : génère un lien permanent (`?geojson=<url_api_grist>`) — sViewer charge les données Grist en direct via `jsonLayerAdapter`
- **Couches WMS** : fonds de carte configurables via `_sviewer_customConfig`

## Sélection bidirectionnelle — configuration Grist

1. Sélectionnez le **widget carte** → panneau latéral → **Données** → **Sélectionner par** : choisissez le tableau de données.
2. Sélectionnez le **tableau de données** → panneau latéral → **Données** → **Sélectionner par** : choisissez le widget carte.

Résultat :
- Clic sur une ligne du tableau → la carte zoome et met en surbrillance l'entité.
- Clic sur une entité de la carte → le tableau filtre sur la ligne correspondante.

## Table de configuration (`_sviewer_customConfig`)

Optionnelle. Créez une table nommée `_sviewer_customConfig` avec deux colonnes : `key` et `value`.

> **Note :** Grist transforme les noms de tables en identifiants Python — `_sviewer_customConfig` devient `Sviewer_customConfig` en interne. Le widget gère cette conversion automatiquement.

| key | description | exemple |
|-----|-------------|---------|
| `x` | Centre X en EPSG:3857 | `-334250` |
| `y` | Centre Y en EPSG:3857 | `6125000` |
| `z` | Niveau de zoom initial | `10` |
| `layers` | Couche(s) WMS (doit figurer dans `customConfig.js`) | `dreal_b:ae_casparcas` |
| `lb` | Index du fond de carte initial | `1` |
| `title` | Titre affiché dans la barre sViewer | `Mon projet` |
| `feature_color` | Couleur des entités (valeur CSS) | `#e74c3c` |
| `feature_highlight_color` | Couleur de l'entité sélectionnée (valeur CSS) | `#ffcc00` |
| `grist_api_base` | Hôte Grist pour les instances auto-hébergées | `https://grist.votre-serveur.org` |

En l'absence de cette table, les valeurs par défaut s'appliquent.

## Lien de partage — fonctionnement

Le bouton **Partager** de sViewer construit une URL autonome avec `?geojson=` pointant vers l'API publique de Grist.
sViewer récupère cette URL et normalise le format JSON Grist via `jsonLayerAdapter` dans `customConfig.js`.

Prérequis :
- Le document Grist doit être accessible publiquement (ou le lecteur doit y avoir accès)
- `jsonLayerAdapter` doit être configuré dans `etc/customConfig.js` de sViewer
- Pour Grist auto-hébergé : renseignez `grist_api_base` dans `_sviewer_customConfig`

## Prérequis

- Grist (cloud ou auto-hébergé)
- sViewer ≥ 0.4.0 (avec support de `?geojson=`)
- Les couches WMS doivent supporter CORS et HTTPS
