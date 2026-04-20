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

## Règles de sécurité

### Input Validation — Paramètres KVP
- **Tous les paramètres URL** (x, y, z, title, layers, q, etc.) doivent être validés avant utilisation
- **Échapper** tout contenu utilisateur avant insertion dans le DOM (prévenir XSS)
- **Rejeter** les URLs malformées, les valeurs non-numériques sur x/y/z, les fichiers non-autorisés
- Les labels, titres, messages affichés doivent être HTML-échappés

### Sécurité XML — WMS
- **Désactiver les entités externes** lors du parsing XML (prévenir XXE — XML External Entity attacks)
- Rejeter les archives malveillantes ou les fichiers corrompus

### Stockage client — Pas de données sensibles
- **Interdire** localStorage/sessionStorage pour credentials, tokens API, clés secrètes
- Les paramètres URL = données publiques uniquement
- Pas de données identifiantes ou sensibles dans le DOM visible

### HTTPS obligatoire — Partout
- **Toutes les ressources** (HTML, CSS, JS, images, fonts, JSON) doivent être servies en HTTPS
- Refuser le **contenu mixte** (page HTTPS + ressource HTTP)
- Les services OGC distants doivent être HTTPS (voir "Règles OGC")

---

## Règles de documentation

### README.md — Guide pratique pour utilisateurs
- **Public** : Administrateurs non-spécialistes (installation, configuration basique)
- **Contenu** : Démarrage rapide, deux modes d'utilisation (simple + embed), exemples concrets
- **Langage** : Français, vouvoiement, pas de jargon technique

### TECHNICAL.md — Guide de référence pour développeurs
- **Public** : Développeurs, intégrateurs, spécialistes
- **Contenu** : Tous les paramètres KVP, toutes les options JavaScript, API complète, cas avancés
- **Langage** : Français, peut inclure termes techniques OGC/WMS

### Style général
- Tous les titres et descriptions en **français**
- Exemples avec URLs réelles (`https://geobretagne.fr/sviewer/`)
- Code en `monospace` pour clarifier syntaxe
- Le mot "couche" ne doit pas être employé à la place de "donnée"

---

## Règles d'internationalisation

### Fichier i18n.js
- Contient **toutes les chaînes traduites** (labels, titres, messages)
- Format : `i18n = { 'clé': { 'fr': '...', 'en': '...', 'es': '...', 'de': '...' } }`
- Doit être chargé **avant sviewer.js** (géré par embed.js)

### Langues supportées
| Langue | Code | Status |
|--------|------|--------|
| Français | `fr` | Complet, langue par défaut |
| Anglais | `en` | Complet |
| Espagnol | `es` | Complet |
| Allemand | `de` | Complet |
| Russe | `ru` | Complet (optionnel) |

### Traduction automatique au DOM
- Tout élément HTML avec `class="i18n"` est traduit automatiquement
- L'attribut `title` est traduit s'il porte la classe `i18n`
- Le texte interne de l'élément est remplacé par la traduction
- Langage sélectionné via `customConfig.lang` ou navigation du navigateur

### Ajouter une nouvelle traduction

**Étape 1** : Ajouter la clé dans `etc/i18n.js`
```javascript
$.extend(hardConfig, {
    i18n: {
        fr: { 'ma clé': 'Texte en français' },
        en: { 'ma clé': 'Text in English' },
        es: { 'ma clé': 'Texto en español' },
        de: { 'ma clé': 'Text auf Deutsch' }
    }
});
```

**Étape 2** : Sur l'élément HTML, ajouter `class="i18n"` et `title="ma clé"`
```html
<button class="i18n btn" title="ma clé">Placeholder (remplacé à runtime)</button>
```

**Étape 3** : Pour les messages JavaScript, utiliser hardConfig.i18n directement
```javascript
var msg = hardConfig.i18n[lang]['ma clé'];
```

### Couverture de traduction
- **100% des éléments visibles** doivent avoir une traduction (fr, en, es, de minimum)
- Inclus : boutons, labels, messages d'erreur, tooltips, placeholders
- Pas de texte en dur en anglais ou français uniquement

### Termes techniques non-traduits
Les acronymes et codes standards restent **non-traduits** :
- `WMS`, `OGC`, `CORS`
- `EPSG:3857`, `Web Mercator`
- `geOrchestra` (nom propre)

### Ajouter une nouvelle langue
- **Pas de nouvelles langues sans approbation** (limite : 5 langues)
- Raison : maintenance et garantie de couverture complète requise
- Nouvelle langue = ajouter toutes les clés existantes dans i18n.js

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
- `lb` : fond de carte (background layer)
- `layers` : données à afficher
- `q` : requête au démarrage
- `s` : activation de la recherche
- `qr` : affichage du code QR au démarrage
- `c` : configuration personnalisée
