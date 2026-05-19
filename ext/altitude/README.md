# sViewer — extension Altitude

Mesure d'altitude ponctuelle et profil altimétrique via l'[API IGN Géoplateforme](https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/calcul-altimetrique/).

## Activation

```js
// customConfig.js
customConfig = { extensions: ['altitude'] };
```

Ou via l'URL :

```
?ext=altitude
```

## Modes

L'extension propose deux modes accessibles depuis le panneau, via les boutons **Altitude** et **Profil**.

### Mode Altitude

Cliquez sur la carte pour mesurer l'altitude d'un point. Chaque clic place un repère `+` orange sur la carte avec l'altitude affichée à proximité. Les mesures s'accumulent dans le panneau sous forme de tableau numéroté. Le bouton **Effacer** supprime tous les points.

### Mode Profil

Cliquez sur la carte pour ajouter des points à un itinéraire. Le tracé s'affiche en orange au fil des clics avec un fil de liaison dynamique. Le bouton **Calculer** (actif dès 2 points) interroge l'API et affiche :

- Un profil altimétrique interactif (survol → curseur sur le graphe + marqueur sur la carte + altitude en bulle)
- Les statistiques : dénivelé positif, dénivelé négatif, altitude min., altitude max., distance totale

Le bouton **Effacer** efface le tracé et repart d'un nouvel itinéraire vierge.

## Langues

Français, anglais, espagnol, allemand (détection automatique via `customConfig.lang`).

## Source des données

API IGN Géoplateforme — ressource `ign_rge_alti_wld`, échantillonnage 100 points. Couverture : France métropolitaine et DOM-TOM. Requiert HTTPS et CORS (aucune clé API nécessaire).

## Dépendances

- sViewer ≥ 0.11.1
- `ol.style.RegularShape` dans le build OpenLayers (inclus depuis sViewer 0.11.1)
