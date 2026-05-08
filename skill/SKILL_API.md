# Skill API

Un skill est un fichier `skill/<name>/skill.js` chargé automatiquement par embed.js après que la carte est prête, si `customConfig.skills` le déclare.

```javascript
// local/customConfig.js
customConfig = {
    skills: ['my-skill']
};
```

embed.js charge `skill/my-skill/skill.js` après `sv:mapReady`. Le skill s'initialise dans `SViewer.onMapReady()`.

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
// Injecter un bouton dans la barre de contrôles skill
const toolbar = document.getElementById('sv-skill-toolbar');
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

## Adaptateur JSON (optionnel)

Un adaptateur normalise les réponses d'APIs non-GeoJSON pour `?geojson=`.

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

Déclarer l'adaptateur dans `customConfig.adapters` pour l'activer :

```javascript
customConfig = { adapters: ['my-adapter'] };
```

---

## Exemple complet

Voir `skill/sample/skill.js`.
