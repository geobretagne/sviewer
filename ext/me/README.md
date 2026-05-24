# Moi (me)

Espace personnel sViewer, local au navigateur. Première facette : **Mes cartes** — enregistrement de cartes sViewer, filtre par titre, restauration en un clic, export/import JSON.

## À quoi ça sert

Agent qui ouvre sViewer plusieurs fois par jour pour des dossiers différents (PLU, zones inondables, projets vélo, antennes, etc.) n'a plus à reconstruire l'URL ou à entretenir une liste de favoris navigateur. Chaque carte enregistrée capture l'état complet : zoom, donnée WMS, filtres CQL, thème, opacité, extensions actives, langue, titre.

Tout reste local au navigateur (`localStorage`). Aucun serveur, aucun compte, aucune fuite RGPD.

## Pourquoi « moi » et non « mes cartes »

L'extension est conçue comme un espace personnel évolutif. La première facette livre les cartes enregistrées ; d'autres pourront s'y greffer (annotations, préférences, historique) sans nouvelle extension à activer ni nouvelle icône à apprendre. La barre d'outils affiche une seule icône « personne » → contenu personnel groupé.

## Activation

Par configuration globale :

```js
// local/customConfig.js
window.customConfig = {
    extensions: ['me']
};
```

Par URL :

```
https://exemple.fr/sviewer/?ext=me
```

À l'exécution depuis du code tiers (page hôte ou autre extension) :

```js
SViewer.loadExtension('me');
```

## Utilisation

1. Configurer la carte (donnée, zoom, filtres, etc.) puis cliquer l'icône « Moi » (personne) dans la barre d'outils.
2. Saisir un titre dans le champ — le titre fait partie de l'identifiant de la carte (hash de l'URL complète, titre compris). **Choisir le bon titre dès la première sauvegarde** : il ne sera plus modifiable.
3. Cliquer « Enregistrer cette carte ».
4. La carte apparaît dans la liste, identifiée par une pastille colorée déterministe (couleur dérivée de l'identifiant + initiale du titre).

### Actions par carte

| Icône | Action |
|---|---|
| Flèche cerclée | Ouvrir ici (remplace la carte courante) |
| Encadré ↗ | Ouvrir dans un nouvel onglet |
| Presse-papier | Copier l'URL |
| Corbeille | Supprimer |

### Filtre

Dès qu'une carte est enregistrée, un champ de recherche apparaît sous le bouton « Enregistrer ». Saisie au clavier filtre la liste par titre (sous-chaîne, insensible à la casse). Touche `Entrée` ouvre la première carte filtrée dans l'onglet courant.

### Exporter / importer

Le bouton « Exporter » télécharge `sviewer-mes-cartes-AAAA-MM-JJ.json` contenant un tableau de toutes les cartes enregistrées (triées par date décroissante). À ouvrir avec « Importer » sur un autre appareil ou navigateur — les doublons (même identifiant) sont ignorés, jamais écrasés.

## Identité des cartes

```
id = djb2( normalize(url) )
normalize(url) = origin + pathname + params triés alphabétiquement
```

Deux conséquences :

- Sauvegarder deux fois la même URL = même identifiant = pas de doublon (le second clic affiche « Cette carte existe déjà »).
- Modifier le titre = nouvelle URL (le titre est dans le `?title=` de l'URL) = nouvel identifiant = nouvelle entrée. Pas de renommage en place, mais possibilité de sauvegarder plusieurs variantes d'une même carte (« PLU brouillon », « PLU validé », « PLU final »).

## Modèle de stockage

Convention de clé : `sv_me_<facette>_v1`. Chaque facette possède sa propre clé `localStorage` ; aucun mélange. Migrer = bumper la version dans la clé (`v2`), laisser l'ancienne en place.

Facette **maps** — clé `sv_me_maps_v1`. Structure (dictionnaire indexé par id) :

```json
{
  "a3f8b2c1": {
    "id":    "a3f8b2c1",
    "url":   "https://carto.mairie.fr/sviewer/index.html?ext=me&layers=plu:zonage&lb=0&title=PLU+brouillon&x=357482&y=6122500&z=14",
    "title": "PLU brouillon",
    "date":  1747920000000
  }
}
```

| Champ | Type | Rôle |
|---|---|---|
| `id` | string (8 hex) | hash djb2 de l'URL normalisée, clé primaire |
| `url` | string | permalink sViewer complet (titre, ext, KVPs inclus) |
| `title` | string | libellé humain, fait partie de l'identité (URL hash) |
| `date` | number | timestamp ms, sert à l'éviction |

Format d'export (tableau, trié par date desc) :

```json
[
  { "id": "a3f8b2c1", "url": "...", "title": "PLU brouillon", "date": 1747920000000 }
]
```

## Limites techniques

| Limite | Valeur | Raison |
|---|---|---|
| Nombre de cartes | 16 max | la plus ancienne (par `date`) est supprimée automatiquement à l'ajout. Limite calibrée pour garantir le confort sur l'écran (panneau lisible sans surcharge) et la performance du filtre live |
| Taille par entrée | ~250 octets | sans capture d'écran, tient largement dans le quota typique (~5 Mo) |
| Visuel par carte | pastille déterministe (couleur + initiale) | pas de capture d'écran : OL10 utilise plusieurs canvases superposés, capture peu fiable |
| Portée | un navigateur, un appareil, un origine | utiliser export/import JSON pour transférer |
| Synchronisation | aucune | pas de backend, par choix (RGPD, autonomie de déploiement) |

## Vie privée

- Aucune donnée n'est envoyée à un serveur.
- `localStorage` est confiné au domaine sViewer (politique d'origine du navigateur).
- L'export JSON est manuel, à l'initiative de l'utilisateur.
- Suppression définitive d'une carte par bouton corbeille.
- Effacement total via `localStorage.removeItem('sv_me_maps_v1')` dans la console DevTools, ou via les paramètres de confidentialité du navigateur.

## Facettes futures (namespace réservé)

| Clé | Facette envisagée |
|---|---|
| `sv_me_notes_v1` | annotations (point/polygone + texte) |
| `sv_me_prefs_v1` | préférences UI (thème, langue par défaut) |
| `sv_me_history_v1` | historique des cartes visitées |

Chaque facette indépendante, versionnée séparément.

## Compatibilité

- sViewer ≥ 0.14.0
- Navigateurs : Chrome / Firefox / Safari / Edge à jour
- `localStorage` requis (refus si désactivé — pas de fallback)
- `navigator.clipboard.writeText` requis pour le bouton « Copier l'URL » (message d'erreur sinon)

## Développement

Extension auto-contenue. Aucune dépendance externe. Icônes Bootstrap Icons (MIT) inlinées en SVG dans le code — pas de couplage à la police de caractères sViewer.
