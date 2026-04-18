# Règles sViewer

## Mission

sViewer est un **visualiseur cartographique minimaliste** conçu pour :
- Afficher rapidement un nombre réduit de jeux de données
- Fournir les outils essentiels : navigation, légende, requête ponctuelle, recherche de lieux, partage, embedding
- Rester simple, rapide et accessible sur tous les appareils

---

## Modes d'utilisation

| Mode | Description | Cas d'usage |
|------|-------------|------------|
| **Mode simple** | Accès direct via `index.html?param1=val1&param2=val2` | Liens partageables, public |
| **Mode embed** | Intégration dans une page web via `embed.js` | Portails, sites tiers |

---

## Règles de qualité

### Performance
- Le chargement doit être le plus rapide possible
- Pas de dépendances externes (CDN interdits)

### Ergonomie et accessibilité
- Utilisabilité de bon niveau sur écran (desktop) et smartphone
- **Accessibilité obligatoire** (WCAG 2.1 AA) — toute dérogation doit être approuvée par écrit

### Code source
- **Reste toujours en clair** pour permettre compréhension et debug (jamais de minification du code principal)
- Commentaires en **anglais**
- **Pas de cookies** (sauf si imposé par une librairie externe)
- Librairies externes : compatibles **GPLv3** uniquement

---

## Règles d'architecture

- Les dépendances sont **chargées dynamiquement et séquentiellement**, jamais bundlées ensemble
- Chaque ressource (CSS, JS, font) reste **indépendante et remplaçable**
- Pas de module bundler (webpack, vite, etc.) — les scripts restent lisibles et testables directement

---

## Règles OGC (Web Map Services)

### Standards et sécurité
- **WMS obligatoire** : OGC:WMS 1.3.0
- **Sécurité obligatoire** : Toutes les URLs doivent être en HTTPS (non-chiffrées refusées)

### CORS (Cross-Origin Resource Sharing)
- **Préalable obligatoire** : Les services OGC doivent supporter CORS
- Les requêtes sans CORS depuis le navigateur échoueront

### Priorités de compatibilité

| Priorité | Cibles | Effort attendu |
|----------|--------|---|
| **1 (critique)** | geOrchestra, GeoServer, Mapstore, Mviewer | Compatibilité garantie, tests en priorité |
| **2 (souhaité)** | Autres serveurs OGC standard-compliant | Support best-effort, pas de blocage |

---

## Règles de compatibilité

### Versions et dépendances
- Code en **ES5** (pas d'ES6+ modern syntax) — supporté nativement sans transpilation
- jQuery 1.12.4 est **verrouillé** — ne pas upgrader sans raison critique
- **Bootstrap 5** pour composants UI et grille responsive
- **OpenLayers 10** pour la cartographie (local, self-hosted)

### Projection
- **Projection unique** : EPSG:3857 (Web Mercator)
- Toute autre projection est refusée ou reprojetée en EPSG:3857

---

## Règles CSS et DOM

- Préfixe `sv-` pour toutes les classes sViewer (éviter collisions dans pages hôtes)
- CSS scoping via `.sv-scope` (protection des pages intégrées)
- **Pas de CSS-in-JS** — une feuille CSS unique (`sviewer.css`)
- **Flexbox** obligatoire pour layout (évite les problèmes floats/grid non supportés vieux navigateurs)

---

## Règles de configuration

- Configuration centralisée dans `etc/customConfig.js` uniquement
- Pas de configuration en dur dans le code sViewer (sauf paramètres par défaut)
- Pas de fichiers `.env` ou secrets — tout en clair

---

## Règles de responsabilité

- **embed.js** : responsable du chargement des dépendances et création du DOM
- **sviewer.js** : logique métier uniquement (pas de gestion du DOM de chargement)
- **sviewer.css** : styles sViewer + overrides Bootstrap/OL (pas de reset global)

---

## Paramètres supportés (mode simple)

Les paramètres suivants fonctionnent dans l'URL en mode simple :

- `x`, `y`, `z` : position et zoom
- `title` : titre personnalisé
- `lb` : couche de fond (background layer)
- `layers` : couches à afficher
- `wmc` : fichier Web Map Context
- `kml` : fichier KML
- `q` : requête au démarrage
- `s` : activation de la recherche
- `qr` : affichage du code QR au démarrage
- `c` : configuration personnalisée
