# Extension API

An extension is a file `ext/<name>/extension.js` loaded automatically by embed.js after the map is ready, if `customConfig.extensions` declares it.

```javascript
// local/customConfig.js
customConfig = {
    extensions: ['my-extension']
};
```

Extensions can also be activated via URL without customConfig:

```
index.html?ext=my-extension
```

embed.js loads `ext/my-extension/extension.js` after `sv:mapReady`. The extension initialises in `SViewer.onMapReady()`.

---

## Cycle de vie

```javascript
SViewer.onMapReady(({ map, view }) => {
    // point d'entrée — map et view sont disponibles
});
```

---

## Données

```javascript
// Charger un GeoJSON FeatureCollection (objet parsé, pas une URL)
SViewer.loadFeatures(geojson);

// Charger des ol.Feature[] déjà en EPSG:3857 — chemin haute perf, zéro reprojection
SViewer.loadFeatureObjects(features, {
    styleOverride: null,   // ol.style.Style ou fonction style OL — null = geojsonStyle config
    fitExtent: false       // recadrer la vue sur les entités après chargement
});
```

---

## Sélection

```javascript
SViewer.selectFeature(id);   // id = feature.getId() — zoom + ouvre panneau propriétés
SViewer.clearSelection();
```

---

## Événements

```javascript
// Carte prête
SViewer.onMapReady(({ map, view }) => { });

// Clic sur une entité vectorielle
SViewer.onFeatureClick(({ feature, coordinate, properties }) => { });

// Changement de sélection (clic ou selectFeature/clearSelection)
// argument null si désélection
SViewer.onFeatureSelect(({ feature, properties }) => { });

// Après chaque chargement de données vectorielles
SViewer.onFeaturesLoaded(({ features, count }) => { });

// Bus brut — pour les événements non couverts par les helpers
SViewer.on('sv:mapReady', fn);
SViewer.off('sv:mapReady', fn);
```

---

## Accès carte

```javascript
const map  = SViewer.getMap();   // ol.Map  — API OL complète
const view = SViewer.getView();  // ol.View
const app  = SViewer.getApp();   // SViewerApp instance
```

---

## État (lecture seule)

```javascript
window.SViewerConfig   // config fusionnée (hardConfig + customConfig + embedOptions)
window.SViewerState    // état runtime (activePanel, mapZoom, layersVisible, …)
```

---

## UI

```javascript
// Injecter un bouton dans la barre des panneaux (côté droit)
const toolbar = document.getElementById('sv-panel-controls');
const btn = document.createElement('button');
btn.className = 'btn btn-dark sv-map-btn';
toolbar.appendChild(btn);

// Changer le fond de carte (index dans customConfig.layersBackground)
SViewer.switchBackground(idx);

// Forcer la réévaluation du style vectoriel (après modification des propriétés d'entités)
SViewer.refreshVector();

// Mettre à jour l'URL GeoJSON dans le permalink/partage sans recharger les données
SViewer.setGeojsonUrl(url);

// Hook appelé quand l'utilisateur modifie le titre via le panneau de partage
SViewer.onTitleChange = (title) => { /* persister */ };
```

---

## Convertisseur de données JSON (optionnel)

Un convertisseur normalise les réponses d'APIs non-GeoJSON pour `?geojson=`.

```javascript
window.SViewerAdapters = window.SViewerAdapters || {};
window.SViewerAdapters['my-adapter'] = {
    // optionnel — sans match(), appelé pour toutes les URLs
    match(url) { return url.includes('myapi.example.com'); },

    // response : objet JSON parsé (ou texte brut si wantsText: true)
    // sourceUrl : l'URL ?geojson= originale (lire les hints de query string ici)
    // retourner : GeoJSON FeatureCollection en EPSG:4326, ou null
    convert(response, sourceUrl) {
        return {
            type: 'FeatureCollection',
            features: response.items.map(item => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [item.lon, item.lat] },
                properties: item
            }))
        };
    },

    wantsText: false   // true → response est une chaîne brute (CSV, XML…)
};
```

Déclarer l'extension dans `customConfig.extensions` pour l'activer :

```javascript
customConfig = { extensions: ['my-adapter'] };
```

---

## Manifest (`manifest.json`)

Each extension must have `ext/<name>/manifest.json`. Used by `npm run build:catalog` to generate `ext/index.html`.

```jsonc
{
  "id":          "my-ext",           // matches directory name
  "type":        "extension",        // "extension" | "demo"
  "version":     "1.0.0",
  "name":        "My Extension",     // display name
  "description": "One-line summary",
  "author":      "handle",
  "screenshot":  "screenshot.png",   // optional — omit if none (160×120 px recommended)
  "tags":        ["csv", "import"],  // free-form keywords for catalog search

  "entry": "extension.js",            // JS entry point (relative to ext/<name>/)
  // "url": "https://…",            // demo: external URL instead of entry

  "params": [                        // URL params the extension reads — catalog display only
    {
      "name":        "_format",      // param name (no ?)
      "type":        "string",       // string | integer | boolean
      "description": "Force extension activation",
      "enum":        ["my-ext"],     // optional — allowed values shown as pills
      "example":     "_format=my-ext"
    }
  ],

  "sviewer": {
    "minVersion": "0.10.0"           // minimum sViewer version required
  },

  "seo": {                           // optional — for future per-extension detail pages
    "title":           "…",
    "metaDescription": "…"
  },

  "examples": [                      // optional — clickable links in catalog card
    {
      "title":       "Basic usage",
      "url":         "?geojson=https://example.com/data&_format=my-ext",
      "description": "Short context"  // optional
    }
  ]
}
```

After editing, regenerate the catalog:

```bash
npm run build:catalog
```

---

## Exemple complet

Voir `ext/sample/extension.js` et `ext/sample/manifest.json`.
