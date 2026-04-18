# SViewer Embed Guide

Intégrez SViewer dans n'importe quelle page web **sans iframe** et sans pollution CSS/JavaScript.

## Installation

### Méthode simple - CDN

```html
<!DOCTYPE html>
<html>
<head>
    <title>Ma page avec carte</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        #map-container {
            flex: 1;
            min-height: 0;
        }
    </style>
</head>
<body>
    <h1>Ma page</h1>
    
    <!-- Conteneur pour la carte -->
    <div id="map-container"></div>

    <!-- Charge et initialise SViewer -->
    <script src="https://example.com/sviewer/js/embed.js"></script>
    <script>
        SViewer.init('#map-container', {
            geOrchestraBaseUrl: 'https://geobretagne.fr/'
        }).then(function(app) {
            console.log('SViewer chargé et prêt', app);
        }).catch(function(error) {
            console.error('Erreur lors du chargement de SViewer', error);
        });
    </script>
</body>
</html>
```

## API

### `SViewer.init(selector, options)`

Initialise SViewer dans un conteneur.

**Paramètres:**
- `selector` (string): Sélecteur CSS du conteneur (ex: `'#map-container'`, `'.map'`)
- `options` (object): Options de configuration
  - `geOrchestraBaseUrl`: URL de base pour les requêtes geOrchestra (ex: `'https://geobretagne.fr/'`)

**Retour:** Promise qui résout avec l'instance SViewerApp

**Exemple:**
```javascript
SViewer.init('#map', {
    geOrchestraBaseUrl: 'https://mon-serveur.fr/'
}).then(function(app) {
    // Accès à la carte
    var map = app.getMap();
    var view = app.getView();
}).catch(function(error) {
    console.error('Erreur:', error);
});
```

### `SViewer.getApp()`

Retourne l'instance SViewerApp après initialisation.

```javascript
var app = SViewer.getApp();
```

### `SViewer.getMap()`

Retourne la carte OpenLayers.

```javascript
var map = SViewer.getMap();
```

### `SViewer.getView()`

Retourne la vue OpenLayers.

```javascript
var view = SViewer.getView();
```

## Isolation

SViewer est complètement isolé pour éviter les conflits:

✓ **CSS scopé** - Tous les styles Bootstrap et SViewer sont préfixés avec `.sv-scope`
✓ **JavaScript encapsulé** - L'instance est exposée uniquement via `window.SViewerApp` 
✓ **Pas de pollution globale** - Aucune variable globale autre que `SViewerApp` n'est créée

## Styles hôte

Le conteneur doit avoir une hauteur définie (flex est recommandé):

```css
#map-container {
    flex: 1;
    min-height: 0;
}

/* Ou avec hauteur fixe */
#map-container {
    height: 600px;
}
```

## Chargement des ressources

`embed.js` charge automatiquement:
- ✓ jQuery
- ✓ Proj4
- ✓ OpenLayers (CSS + JS)
- ✓ Bootstrap (CSS scopé)
- ✓ Bootstrap Icons
- ✓ SViewer CSS et JS
- ✓ Internationalization

**Aucune configuration supplémentaire n'est requise.**

## Configuration personnalisée

Vous pouvez passer une variable globale `customConfig` avant de charger `embed.js`:

```html
<script>
    window.customConfig = {
        title: 'Ma carte personnalisée'
    };
</script>
<script src="https://example.com/sviewer/js/embed.js"></script>
```

## Exemple complet

Voir `test-embed.html` pour un exemple fonctionnel complet.

```bash
cd /var/www/html/sviewer
python3 -m http.server 8080
# Ouvrir http://localhost:8080/test-embed.html
```

## Troubleshooting

### "Container not found"
Vérifiez que le conteneur existe dans le DOM avant d'appeler `SViewer.init()`.

### Styles qui ne s'appliquent pas
Assurez-vous que le conteneur a une hauteur définie.

### Scripts bloquants
`embed.js` charge les ressources en arrière-plan (`defer`). Si vous avez besoin d'accéder à la carte immédiatement, attendez la Promise.

## Migration de l'iframe

**Avant (iframe):**
```html
<iframe src="https://example.com/sviewer/index.html"></iframe>
```

**Après (sans iframe):**
```html
<div id="map"></div>
<script src="https://example.com/sviewer/js/embed.js"></script>
<script>
    SViewer.init('#map');
</script>
```

**Avantages:**
- Responsive design fluide
- Accès à l'API OpenLayers
- Pas de problèmes CORS
- Intégration seamless
