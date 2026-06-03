# Captures d'écran du catalogue

Le catalogue (`ext/index.html`, généré par `npm run build:catalog`) affiche une
image en tête de chaque carte si un fichier capture existe.

## Convention

- **Nom de fichier :** `screenshot.png` dans le dossier de l'extension
  (ex. `ext/altitude/screenshot.png`).
- **Déclaration :** le manifeste contient déjà `"screenshot": "screenshot.png"`.
  Tant que le fichier est absent, la carte reste en mode texte (dégradation
  silencieuse) ; dès qu'il est présent, l'image apparaît.

## Dimensions cibles

sViewer est mobile-first : les captures sont affichées **dans un cadre de
téléphone** (dessiné en CSS). Il faut donc des captures **portrait**.

- **Ratio :** 9:19.5 (portrait téléphone).
- **Taille source recommandée :** **390 × 844 px** (viewport iPhone) ou
  **1080 × 2340 px** pour la netteté Retina.
- **Comment capturer :** mode responsive des DevTools (ou un vrai téléphone),
  viewport ~390 px de large, puis capture de la **zone carte uniquement**.
- **Rendu :** `object-fit: cover` — l'image remplit l'écran du téléphone et est
  rognée si le ratio diffère. Garder l'essentiel au centre.
- **Poids :** viser < 150 Ko. PNG pour l'UI nette, ou WebP si supporté.

## Cadrage

- Montrer l'**état le plus parlant** de l'extension : panneau ouvert, donnée
  affichée, résultat visible — pas une carte vide.
- Capturer en mode clair (cohérence visuelle du catalogue).
- **Pas de chrome navigateur** (barre d'adresse, onglets) : le cadre téléphone
  est ajouté par le catalogue, la capture ne contient que l'interface sViewer.

## Régénération

Après ajout des fichiers :

```sh
npm run build:catalog
```

Aucune modification du générateur n'est nécessaire : il détecte le fichier sur
disque.
