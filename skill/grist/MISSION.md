# Grist skill — directives Claude

## Périmètre

Ce répertoire contient le widget Grist sViewer :

| Fichier | Rôle |
|---------|------|
| `index.html` | Structure DOM + styles inline du widget (toolbar, map, panneau settings) |
| `widget.js` | Toute la logique (i18n, état, style OL, init Grist, events) |
| `adapter.js` | Conversion Grist records API → GeoJSON FeatureCollection (chargé par embed.js via `customConfig.adapters`) |
| `README.md` | Documentation utilisateur (fr) |

Ne pas toucher les fichiers sViewer core (`../../js/`, `../../etc/`, `../../css/`) sauf bug avéré
impactant le widget — ouvrir une issue dans le contexte sViewer général.

---

## Architecture

### Séquence de démarrage

```
grist-plugin-api.js (externe, CDN Grist)
  → embed.js (charge OL, jQuery, Bootstrap, customConfig, adapter.js, sviewer.js)
    → widget.js (dépend de `grist` + `SViewer`)
      → Promise.all([getOptions, getDocName, getTableId]) → initMap()
```

Contrainte clé : `grist.onRecords` doit être enregistré **synchroniquement** après `grist.ready()`.
Un enregistrement dans une Promise rate le premier batch de données.

### État global (widget.js)

Variables module-level — pas d'objet state, par contrainte ES5 + lisibilité.

| Variable | Type | Rôle |
|----------|------|------|
| `colGeom` | string\|null | Colonne géométrie active |
| `colLabel` | string\|null | Colonne étiquette active |
| `colLat/colLon` | string\|null | Colonnes lat/lon (mode latlon) |
| `colGeomMode` | string | `auto\|geojson\|latlon\|latlon_str\|lonlat_str\|wkt` |
| `svConfig` | object | Clés de configuration persistées dans Grist widget options |
| `vectorLayer` | ol.layer.Vector\|null | Couche OL portant les entités |
| `featureByRowId` | object | rowId Grist → ol.Feature (pour sélection bidirectionnelle) |
| `selectedRowId` | number\|null | Ligne sélectionnée courante |
| `lastRecordsFingerprint` | string\|null | Évite rebuild si données inchangées |
| `viewFitted` | bool | Fit de vue déjà effectué (une seule fois par session) |
| `mapReady/recordsReady` | bool | Guards pour `maybeSetupMapClick()` |

### Flux de données

```
Grist onRecords → allRecords → rebuildLayer() → vectorLayer → carte OL
Grist onRecord  → record sélectionné → pan/zoom + applySelectionStyle()
Clic carte → forEachFeatureAtPixel → grist.setSelectedRows([rowId])
```

Le debounce (300 ms) sur `onRecords` évite les rebuilds en cascade lors de modifications
rapides dans la grille.

### Persistance (svConfig)

Toutes les clés de `svConfig` sont persistées via `grist.widgetApi.setOptions()`.
Chaque widget (chaque vue Grist) a sa propre instance — pas de config globale.

Clés actuelles : `fill_color`, `fill_opacity`, `stroke_color`, `stroke_opacity`,
`stroke_width`, `sel_*`, `title`, `layers`, `md`, `lb`, `x`, `y`, `z`,
`sviewer_base`, `grist_api_base`, `georchestra_base`, `fit_on_load`, `geom_mode`,
`_colGeom`, `_colLat`, `_colLon`, `_colLabel`.

---

## Règles de code

### ES5 strict
Pas de `const/let`, pas d'arrow functions, pas de template literals, pas de destructuring.
Compatibilité : tout ce qui tourne dans le navigateur cible de Grist cloud (2020+).

### Pas de dépendances supplémentaires
`grist`, `ol`, `jQuery`, `SViewer` — c'est tout.
Pas d'import, pas de require, pas de module bundler.

### Sécurité

- **Toutes les URLs** provenant de l'utilisateur (champs `type=url`, import JSON) passent par `safeHttpUrl()` qui retourne uniquement `origin`. Jamais de chemin ou query injectés depuis `grist_api_base`.
- **Couleurs** : `safeColor()` valide via `ol.color.asArray` avant injection dans les styles OL.
- **Sélects** : vider avec `options.length = 0`, jamais `innerHTML = ''`.
- **Import JSON** : `typeof data !== 'object' || Array.isArray(data)` — rejet si pas un objet plat.
- **encodeURIComponent** sur docId, tableId, colonne, mode dans `buildGristGeojsonUrl()`.

### i18n
Le widget a son propre `I18N` (fr/en/es/de) — indépendant de `etc/i18n.js`.
Toute nouvelle chaîne UI doit être ajoutée aux 4 langues dans `I18N`.
DOM traduit via `data-i18n`, `data-i18n-title`, `data-i18n-aria`, `data-i18n-placeholder`.

### Accessibilité
- Labels liés aux inputs via `for`/`id`.
- `role="status" aria-live="polite"` sur `#sv-status`.
- `aria-label` sur les boutons icônes via `data-i18n-aria`.
- Contraste texte statut : `#666` minimum (ratio ≥ 4.5:1).

---

## adapter.js — règles spécifiques

`adapter.js` est chargé par `embed.js` via `customConfig.adapters: ['grist']`.
Il tourne dans le contexte sViewer standalone — **pas dans le widget**.

- Registre : `window.SViewerAdapters['grist'] = { match, convert }`.
- `match(url)` : regex sur `/api/docs/[^/]+/tables/[^/]+/records` — ne match que les URLs Grist.
- `convert(response, sourceUrl)` : lit les hints `_geommode/_geomcol/_collat/_collon/_labelcol`
  dans `sourceUrl` pour bypasser l'auto-détection.
- Doit rester **synchrone** — pas de fetch, pas de Promise.
- Doit rester **sans effet de bord** — ne modifie aucun état global.
- La logique géométrie doit rester alignée avec `rebuildLayer()` dans `widget.js`
  (même modes, même candidats, même ordre de priorité).

---

## Invariants à ne jamais casser

1. `grist.onRecords` enregistré **avant** toute Promise.
2. `rebuildLayer()` court-circuite si `fingerprint` identique — ne pas supprimer ce guard.
3. `maybeSetupMapClick()` attend `mapReady && recordsReady` — évite `setSelectedRows` sans données.
4. `buildGristGeojsonUrl()` encode **toujours** docId, tableId, colonnes — pas de concaténation nue.
5. `safeHttpUrl()` appelé sur toute URL externe avant usage — jamais de contournement.
6. `adapter.js` et `rebuildLayer()` partagent la même logique de modes — toute modification
   d'un mode doit être répercutée dans les deux fichiers.

---

## Points d'extension connus

- **Pagination API Grist** : l'API retourne max ~2000 lignes. Support pagination non implémenté.
  Si ajouté : modifier `buildGristGeojsonUrl()` + `adapter.js` (chargement par pages côté sViewer)
  et `rebuildLayer()` (streaming côté widget).
- **WFS/CSW dans le partage** : `layers` et `md` sont transmis dans l'URL de partage mais
  sViewer standalone doit les charger indépendamment de l'adaptateur Grist.
- **Clustering** : non implémenté. Si ajouté, modifier `rebuildLayer()` uniquement
  (couche vectorielle → `ol.source.Cluster`).

---

## Débogage

- `?debug=true` sur l'URL sViewer standalone active les logs console.
- Dans Grist : ouvrir DevTools sur l'iframe widget.
- Vérifier `svConfig` et variables colonnes : `console.log(svConfig, colGeom, colGeomMode)` dans `initMap`.
- Lien de partage cassé → vérifier `gristDocId`, `gristTableId`, `safeHttpUrl(svConfig.grist_api_base)`.
- Entités non affichées → vérifier que `adapters: ['grist']` est dans `customConfig.js` côté sViewer
  et que l'URL `?geojson=` matche `/api/docs/…/tables/…/records`.
