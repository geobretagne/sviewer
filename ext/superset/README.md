# sViewer — Plugin Apache Superset

Plugin de type graphique natif pour Apache Superset. Affiche des données géographiques issues d'un dataset Superset dans une carte sViewer interactive, embarquée dans le tableau de bord.

Pas de fork Superset. Pas de redémarrage serveur. L'administrateur colle une URL.

---

## Fonctionnement

```
Dataset Superset (lignes avec colonne géométrie)
  → requête serveur (filtres natifs Superset intégrés automatiquement)
    → FeatureCollection GeoJSON
      → postMessage → iframe sViewer
        → carte mise à jour
```

Les filtres du tableau de bord (filtres natifs, filtres temporels) se propagent côté serveur : sViewer ne reçoit que les entités filtrées.

---

## Prérequis

- Apache Superset 4.x avec le feature flag `DYNAMIC_PLUGINS` activé
- Une instance sViewer accessible en HTTPS depuis Superset et depuis le navigateur
- Un dataset Superset avec une colonne géométrie (GeoJSON texte issu de `ST_AsGeoJSON`, ou colonnes latitude/longitude séparées)

---

## Installation (administrateur Superset)

**1. Activer les plugins dynamiques**

Dans `superset_config.py` :

```python
FEATURE_FLAGS = {"DYNAMIC_PLUGINS": True}
```

**2. Enregistrer le plugin**

Paramètres → Plugins → Ajouter → coller l'URL du bundle :

```
https://votre-serveur/sviewer/ext/superset/dist/superset-plugin-chart-sviewer.js
```

Clé : `sviewer_map`

**3. Vérifier**

Dans « Nouveau graphique », le type **Carte sViewer** doit apparaître.

---

## Créer un graphique — tutoriel

### Étape 1 — Préparer l'URL sViewer

Ouvrez sViewer, configurez la vue souhaitée :
- fond de carte
- données WMS éventuelles
- zoom et position de départ
- thème (clair/sombre)
- extensions actives (ex. impression)

Cliquez **Partager → Lien** et copiez l'URL.

### Étape 2 — Créer le graphique

Dans Superset : **Graphiques → + Graphique → Carte sViewer**

Sélectionnez votre dataset.

### Étape 3 — Configurer

**Section Carte**

| Champ | Valeur |
|-------|--------|
| URL sViewer | Collez l'URL de partage copiée à l'étape 1 (ou simplement `https://votre-serveur/sviewer/`) |
| Zoom auto | Coché : recadre la carte à chaque filtre. Non coché : conserve l'étendue initiale de l'URL |

L'URL de partage encode automatiquement : position, zoom, fond de carte, données WMS, thème, extensions actives. Tout est préservé.

**Section Colonnes**

| Champ | Valeur |
|-------|--------|
| Mode géométrie | `GeoJSON` si votre colonne contient du GeoJSON texte ; `Lat/Lon` si deux colonnes séparées |
| Colonne GeoJSON | Nom de la colonne (ex. `geom`) |
| Colonne libellé | Colonne affichée en infobulle sur les entités |

**Section Requête**

| Champ | Valeur |
|-------|--------|
| Filtres | Filtres SQL ad hoc |
| Trier par | Colonne de tri avant application de la limite de lignes |
| Limite de lignes | 2 000 par défaut — ajuster selon la densité des données |

**Section Symbologie**

| Champ | Valeur |
|-------|--------|
| Couleur fixe | Couleur appliquée à toutes les entités |
| Colonne taille | Colonne numérique → symboles proportionnels |
| Mode de normalisation (taille) | Racine carrée (défaut), linéaire, log, quantile, Jenks |
| Colonne rampe de couleurs | Colonne numérique → couleur graduée (remplace la couleur fixe) |
| Mode de normalisation (rampe) | Même modes que la taille |
| Couleur basse / haute | Bornes de la rampe |

### Étape 4 — Enregistrer et intégrer au tableau de bord

Enregistrez le graphique, ajoutez-le au tableau de bord. Les filtres natifs Superset s'appliquent automatiquement.

---

## Passthrough des paramètres sViewer

L'URL de partage est transmise intégralement à la carte. Tous les paramètres sViewer sont préservés :

| Paramètre | Effet |
|-----------|-------|
| `x`, `y`, `z` | Position et zoom initiaux |
| `lb` | Fond de carte |
| `layers` | Données WMS |
| `theme` | Thème clair/sombre |
| `s=1` | Recherche d'entités par attribut activée dans la carte |
| `q=1` | GetFeatureInfo automatique au centre de la carte |
| `lang` | Langue de l'interface carte |
| `opacity` | Opacité de la couche WMS |
| `ext` | Extensions actives — `superset` est ajouté automatiquement |

Exemple : une URL de partage avec `ext=print,s=1` donne une carte avec le bouton d'impression **et** la recherche d'entités, sans aucune configuration supplémentaire dans le plugin.

---

## Flux de filtres

```
Filtre natif Superset appliqué
  → Superset ré-exécute la requête SQL avec les filtres mergés côté serveur
    → plugin reçoit un sous-ensemble de lignes
      → FeatureCollection mise à jour → postMessage → sViewer redessine
```

Le filtre ne passe pas côté client — seules les entités correspondantes arrivent sur la carte.

---

## Limitations connues

| Sujet | État |
|-------|------|
| Cross-filter (clic carte → filtre Superset) | En attente — `CrossFilter` behavior absent de Superset 4.x |
| Géométries WKT | Non supporté — utiliser `ST_AsGeoJSON` ou colonnes lat/lon |
| Polygones : taille proportionnelle | Ignorée — la taille s'applique aux points uniquement, vous pouvez générer des points dans le Virtual Dataset |

---

## Build (développeurs)

```bash
cd ext/superset
npm install
npm run build   # → dist/superset-plugin-chart-sviewer.js
```

Committer `dist/` après chaque build — les administrateurs déploient sans Node.

```bash
npm run typecheck   # vérification TypeScript
npm run lint        # ESLint
```
