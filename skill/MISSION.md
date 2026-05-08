# sViewer skills — directives Claude

## Périmètre

Un connecteur permet à sViewer de charger des sources de données non-GeoJSON via `?geojson=`.
Chaque connecteur vit dans `skill/{name}/` et s'auto-enregistre dans le registre global.

| Connecteur | Source | Format d'entrée |
|------------|--------|-----------------|
| `grist`    | Grist records API | JSON `{ records: [{id, fields:{…}}] }` |
| `csv`      | Fichiers CSV, URLs de portails open data | Texte brut |

---

## Structure obligatoire

```
skill/{name}/
  adapter.js    — seul fichier commité
  MISSION.md    — directives Claude (gitignored)
```

Pas d'`index.html`, pas de CSS, pas de dépendances supplémentaires sauf si le connecteur
est aussi un widget (cas Grist uniquement).

---

## Contrat adapter.js

### Enregistrement

```javascript
window.SViewerAdapters = window.SViewerAdapters || {};
window.SViewerAdapters['name'] = {
    match:     function(url) { /* bool */ },
    convert:   function(response, sourceUrl) { /* GeoJSON FeatureCollection | null */ },
    wantsText: false  // true si la source retourne du texte brut (CSV, XML…)
};
```

### `match(url)`
- Pure — aucun effet de bord, aucun fetch
- Retourne `true` uniquement pour les URLs que ce connecteur sait traiter
- Doit être **spécifique** — ne pas matcher trop large (risque de conflit entre adaptateurs)
- Exemples de patterns fiables :
  - Grist : `/\/api\/docs\/[^/]+\/tables\/[^/]+\/records/`
  - CSV : `/\.csv(\?|#|$)/i` ou `/_format=csv/`

### `convert(response, sourceUrl)`
- **Synchrone** — pas de fetch, pas de Promise, pas d'effet de bord global
- `response` : objet JS parsé (JSON) si `wantsText` absent/false, chaîne brute si `wantsText: true`
- `sourceUrl` : URL d'origine — lire les hints `_geommode/_geomcol/_collat/_collon/_labelcol` via `URL.searchParams`
- Retourne un GeoJSON FeatureCollection valide **ou** `null` (jamais d'exception non catchée)
- Filtre les lignes sans géométrie avec `.filter(Boolean)`

### `wantsText`
- Absent ou `false` : sviewer.js fait `$.ajax dataType:'json'`, `response` = objet parsé
- `true` : sviewer.js fait `$.ajax dataType:'text'`, `response` = chaîne brute
- Un seul adaptateur `wantsText:true` peut matcher une URL donnée (premier match gagne)

---

## Système de hints URL

Tous les connecteurs partagent le même système de hints encodés dans `sourceUrl` :

| Paramètre    | Valeurs possibles                              | Rôle |
|--------------|------------------------------------------------|------|
| `_geommode`  | `geojson\|latlon\|latlon_str\|lonlat_str\|wkt` | Mode de lecture géométrie |
| `_geomcol`   | nom de colonne                                 | Colonne géométrie / WKT / texte coordonnées |
| `_collat`    | nom de colonne                                 | Colonne latitude (mode `latlon`) |
| `_collon`    | nom de colonne                                 | Colonne longitude (mode `latlon`) |
| `_labelcol`  | nom de colonne                                 | Colonne étiquette → `properties._label` |
| `_format`    | nom de connecteur (`csv`, …)                   | Force l'activation d'un connecteur (URLs sans extension) |

Lecture des hints — toujours via `URL.searchParams`, jamais par concaténation :
```javascript
var u = new URL(sourceUrl);
var mode = u.searchParams.get('_geommode') || null;
```

---

## Détection automatique de géométrie

Logique partagée entre tous les connecteurs — **dupliquer, ne pas factoriser** (chaque
connecteur doit rester autonome et lisible sans dépendance inter-connecteurs).

```javascript
var GEOM_CANDIDATES = ['geometry', 'geom', 'geo', 'shape', 'wkb_geometry'];
var LAT_CANDIDATES  = ['latitude', 'lat'];
var LON_CANDIDATES  = ['longitude', 'lon', 'lng'];
```

Ordre de priorité (auto-détection) :
1. Colonne nommée dans `GEOM_CANDIDATES` (insensible à la casse)
2. Scan des valeurs : première colonne dont la valeur est un objet GeoJSON valide
3. Paire de colonnes lat/lon nommées dans `LAT_CANDIDATES` + `LON_CANDIDATES`

Détection sur `rows[0]` uniquement — même colonne appliquée à toutes les lignes.

Ordre des coordonnées GeoJSON : **toujours `[lon, lat]`** — ne jamais inverser.

---

## Règles de code

### ES5 strict
```javascript
(function() {
    'use strict';
    // …
}());
```
Pas de `const/let`, pas d'arrow functions, pas de template literals, pas de destructuring.

### Dépendances autorisées
`ol`, `jQuery`, `SViewer` — uniquement si nécessaire.
Pas d'import, pas de require, pas de bundler.

### Sécurité
- Hints lus via `URL.searchParams` uniquement — jamais de concaténation nue
- `encodeURIComponent` sur toute valeur injectée dans une URL construite
- Jamais d'`eval` ou `innerHTML` sur données utilisateur
- WKT : round-trip via `ol.format.WKT` + `ol.format.GeoJSON` — pas de parsing manuel

### Commentaires
- Zéro commentaire expliquant le QUOI — noms de variables suffisent
- Commenter uniquement le POURQUOI non-évident : contrainte cachée, ordre de coordonnées, workaround

---

## Intrusion dans sviewer.js

Règle : **zéro nouvelle fonction dans sviewer.js par connecteur**.

Ce qui existe déjà et suffit :
- Registre `window.SViewerAdapters` — auto-enregistrement côté connecteur
- `wantsText` flag — dispatch text vs JSON déjà implémenté
- `_format` hint warning — erreur i18n si adaptateur non chargé
- `tr('{0}', val)` — substitution positionnelle disponible

Si un nouveau connecteur semble nécessiter une modification de sviewer.js :
1. Vérifier que le contrat `match/convert/wantsText` ne suffit pas
2. Si modification inévitable : impact nul sur performance, accessibilité, sécurité
3. Documenter pourquoi dans le commit

---

## Intrusion dans embed.js

Aucune. Les connecteurs sont chargés via `customConfig.adapters: ['name']` —
embed.js charge `skill/{name}/adapter.js` automatiquement pour tout nom déclaré.

---

## Invariants à ne jamais casser

1. `convert()` est **synchrone** — jamais de fetch, jamais de Promise
2. `convert()` retourne `null` ou un FeatureCollection valide — jamais d'exception non catchée
3. `match()` est **pur** — aucun effet de bord
4. Hints lus via `URL.searchParams` uniquement — pas de regex sur la query string brute
5. Coordonnées GeoJSON toujours `[lon, lat]` — jamais `[lat, lon]`
6. Détection auto sur `rows[0]` uniquement — cohérence inter-lignes garantie
7. `wantsText: true` si et seulement si la source retourne du texte brut

---

## Ajouter un nouveau connecteur — checklist

- [ ] `skill/{name}/adapter.js` créé, IIFE + 'use strict'
- [ ] `match()` testé sur des URLs réelles de la source cible
- [ ] `convert()` retourne `null` pour réponse invalide (pas d'exception)
- [ ] Hints `_geommode/_geomcol/…` supportés si applicable
- [ ] `wantsText` déclaré si source non-JSON
- [ ] `customConfig.DIST.js` — nom ajouté dans le commentaire `adapters`
- [ ] `TECHNICAL.md` — connecteur documenté dans la section adaptateurs
- [ ] Testé avec une URL réelle CORS-compatible via `check.html`
- [ ] `MISSION.md` rédigé dans `skill/{name}/` (gitignored)
- [ ] `npm run minify` exécuté avant commit si `js/sviewer.js` ou `js/embed.js` modifié

---

## Workflow de debug — leçons apprises

**Symptôme "Gulf of Guinea"** (carte centrée sur [0,0]) = coordonnées nulles ou adapter non activé.
Vérifier dans l'ordre :
1. `window.SViewerAdapters` — adapter enregistré ?
2. `window.SViewerAdapters['name'].wantsText` — flag correct ?
3. `grep -c "wantsText" static/js/sviewer.min.js` — bundle à jour ?
4. Ouvrir avec `?debug=true` — logs `loadGeoJSON:` visibles ?

**Bundle stale** — cause la plus fréquente de comportement silencieusement incorrect.
Règle : `npm run minify` obligatoire avant tout commit touchant `js/sviewer.js` ou `js/embed.js`.
Le cache navigateur masque le bug même après rebuild — `js/` sert avec `no-cache` (nginx), mais
vérifier via DevTools Network que la réponse n'est pas `(from cache)`.

**nginx allowlist** — tout nouveau répertoire servi publiquement doit être ajouté explicitement.
`templates/` oublié au lancement de la stratégie allowlist. Vérifier avec `curl -I` côté serveur.
