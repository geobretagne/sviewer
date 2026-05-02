# sViewer — widget Grist

Widget cartographique interactif pour [Grist](https://www.getgrist.com), propulsé par sViewer.

## Installation

1. Dans votre document Grist, ouvrez une page et ajoutez un **widget personnalisé**.
2. Saisissez l'URL du widget : `https://votre-serveur/sviewer/integrations/grist/`
3. Accordez l'accès **Complet** lorsque demandé.

Le widget détecte automatiquement la colonne géométrie. Noms de colonnes reconnus :

- `geometry`, `geom`, `geo`, `shape`, `wkb_geometry`
- En cas d'échec, il scanne la première ligne à la recherche d'une valeur GeoJSON valide.

Si la détection échoue, cliquez sur **Colonnes** dans la barre d'outils du widget pour choisir manuellement.

## Table de configuration (`_sviewer_customConfig`)

Créez une table nommée `_sviewer_customConfig` avec deux colonnes : `key` et `value`.

> **Note :** Grist transforme les noms de tables en identifiants Python (`_sviewer_customConfig` → `Sviewer_customConfig` en interne).

Les clés correspondent aux paramètres d'URL de sViewer (même nom, même sémantique).

| key | description | exemple |
|-----|-------------|---------|
| `x` | Centre X en EPSG:3857 | `-334250` |
| `y` | Centre Y en EPSG:3857 | `6125000` |
| `z` | Niveau de zoom initial | `10` |
| `layers` | Couche(s) WMS au format `namespace:nom` (doit figurer dans `customConfig.js`) | `dreal_b:ae_casparcas` |
| `lb` | Index du fond de carte initial (selon `layersBackground` dans `customConfig.js`) | `1` |
| `title` | Titre affiché dans la barre sViewer | `Mon projet` |
| `feature_color` | Couleur des entités (valeur CSS) | `#e74c3c` |
| `feature_highlight_color` | Couleur de l'entité sélectionnée (valeur CSS) | `#ffcc00` |
| `sviewer_base_url` | URL de base sViewer pour les liens de partage | `https://votre-serveur/sviewer/index.html` |
| `grist_api_base` | Hôte Grist pour les instances auto-hébergées | `https://grist.votre-serveur.org` |

En l'absence de cette table, les valeurs par défaut s'appliquent.

> Nécessite le niveau d'accès **Complet** — le widget le demande pour accéder à la table de configuration.

## Fonctionnalités

- **Carte → Grist** : cliquez sur une entité de la carte pour sélectionner la ligne correspondante dans Grist
- **Grist → carte** : sélectionnez une ligne dans Grist pour centrer et zoomer la carte sur l'entité
- **Sélection bidirectionnelle** : configurez dans l'interface Grist « Sélectionner par » entre le widget carte et le tableau (voir ci-dessous)
- **Effacer** : bouton *✕ Effacer* pour libérer le filtre de sélection
- **Partager** : génère un lien permanent (`?geojson=<url_api_grist>`) — sViewer charge et affiche les données Grist en direct via `jsonLayerAdapter`
- **Couches WMS** : activez des couches de fond au démarrage via `_sviewer_customConfig`

## Sélection bidirectionnelle — configuration Grist

Pour activer les deux sens simultanément :

1. Sélectionnez le **widget carte**, ouvrez le panneau latéral → onglet **Données** → **Sélectionner par** : choisissez le tableau de données.
2. Sélectionnez le **tableau de données**, ouvrez le panneau latéral → onglet **Données** → **Sélectionner par** : choisissez le widget carte.

Résultat :
- Clic sur une ligne du tableau → la carte zoome et met en surbrillance l'entité.
- Clic sur une entité de la carte → le tableau filtre sur la ligne correspondante.

## Lien de partage — fonctionnement

Le bouton **Partager** construit une URL sViewer autonome avec `?geojson=` pointant vers l'API publique de Grist.
sViewer récupère cette URL et normalise le format JSON Grist via `jsonLayerAdapter` dans `customConfig.js`.

Prérequis :
- Le document Grist doit être accessible publiquement (ou le lecteur doit y avoir accès)
- `jsonLayerAdapter` doit être configuré dans `etc/customConfig.js` de sViewer
- Pour Grist auto-hébergé : renseignez `grist_api_base` dans `_sviewer_customConfig`

## Prérequis

- Grist (cloud ou auto-hébergé)
- sViewer ≥ 0.4.0 (avec support de `?geojson=`)
- Les couches WMS doivent supporter CORS et HTTPS
