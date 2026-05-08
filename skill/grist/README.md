# sViewer — widget Grist

Widget cartographique interactif pour [Grist](https://www.getgrist.com), propulsé par sViewer.

Affichez vos données Grist sur une carte, sélectionnez une ligne sur le tableau pour zoomer, dessinez ou corrigez le point, la ligne ou le polygone associé, partagez la carte si les données sont publiques.

## Mise en oeuvre

1. Dans votre document Grist, choisissez une page.
2. Cliquez sur **Ajouter un widget** → **Widget personnalisé**.
3. Dans le champ **URL du widget**, saisissez :
   ```
   https://votre-serveur/sviewer/skill/grist/
   ```
4. Dans **Accès**, choisissez **Lire la table** (lecture seule) ou **Complet** (requis pour l'édition de géométrie).
5. Dans **Données**, sélectionnez la table contenant vos données.
6. Cliquez sur **Confirmer**.

Le widget démarre et tente de détecter la colonne associée à la géométrie selon son nom : en deux colonnes latitude et longitude ; en une seule colonne ; ou en formats geojson et WKT. La colonne peut être vide au départ.

## Ce que fait le widget

- **Tableau → carte** : cliquez sur une ligne du tableau pour centrer et zoomer la carte sur la ligne correspondante (débrayable).
- **Édition de géométrie** : dessinez ou corrigez des points, lignes et surfaces directement sur la carte — les modifications sont enregistrées dans Grist.
- **Partage** : le bouton **Partager** de sViewer génère un lien autonome vers la carte, utilisable hors de Grist (QR code, `<iframe>`, API JavaScript). Fonctionne uniquement pour les tables en accès public.
- **Étiquettes** : affiche le contenu d'une colonne texte sur chaque entité.

## Lien tableau → carte (« Sélectionner par »)

Pour que la sélection d'une ligne dans le tableau centre automatiquement la carte :

1. Sélectionnez le **widget carte** → panneau latéral → **Données** → **Sélectionner par** : choisissez le tableau de données.

> **Limitation Grist :** la sélection dans les deux sens simultanément n'est pas possible (cycle de liens). La carte réagit au tableau, mais pas l'inverse. En recherche d'une solution pour permettre les deux.

## Édition de géométrie

> Requiert **Accès complet** dans les paramètres du widget Grist.

La barre d'outils affiche trois boutons de saisie dès qu'une ligne est sélectionnée dans le tableau : **Point**, **Ligne**, **Surface**.

**Pour dessiner ou corriger une géométrie :**

1. Sélectionnez la ligne à modifier dans le tableau Grist.
2. Cliquez sur **Point**, **Ligne** ou **Surface** dans la barre d'outils.
3. Cliquez sur la carte pour placer le point, ou ajoutez des sommets un par un pour une ligne ou une surface. Double-cliquez (ou cliquez **Enregistrer**) pour terminer le tracé.
4. Vérifiez le résultat affiché sur la carte, puis cliquez **✓ Enregistrer** pour écrire dans Grist.
5. Cliquez **✗ Annuler** pour abandonner et restaurer la géométrie précédente.

**Formats supportés pour l'écriture :**

| Mode géométrie | Ce qui est écrit dans Grist |
|---|---|
| GeoJSON | Objet JSON `{"type":"Point","coordinates":[…]}` |
| WKT | Chaîne `POINT(lon lat)`, `LINESTRING(…)`, `POLYGON(…)` |
| Lat / Lon (2 colonnes) | Deux valeurs numériques dans les colonnes latitude et longitude |
| Texte lat,lon ou lon,lat | Chaîne `"48.4,-4.5"` dans la colonne géométrie |

> En mode lat/lon ou texte coordonnées, seul le type **Point** est disponible — les lignes et surfaces ne peuvent pas être stockées dans ces formats.

## Panneau de configuration

Cliquez sur **...** au-dessus pour ouvrir le panneau de configuration.

### Onglet Données

| Champ | Rôle |
|---|---|
| Mode géométrie | Comment la colonne géométrie est interprétée (Auto, GeoJSON, WKT, Lat/Lon…) |
| Colonne géométrie | Colonne contenant la géométrie (GeoJSON, WKT, texte coordonnées) |
| Colonne latitude / longitude | Deux colonnes numériques en mode Lat/Lon |
| Colonne étiquette | Texte affiché sur chaque entité ; laisser vide pour masquer |
| Données / Ligne sélectionnée | Couleur, épaisseur et opacité des entités normales et sélectionnées |
| Zoom automatique sur sélection | Zoom et centrage sur l'entité à chaque sélection d'une ligne (désactivable) |

### Onglet Avancé

#### Fond de carte

Sélectionne le fond de carte affiché derrière les données. La liste reprend les fonds configurés dans `customConfig.js` (titre de chaque preset). Le choix est persisté par widget et restauré à chaque rechargement.

> Visible uniquement si plusieurs fonds de carte sont configurés.

#### Opacité WMS

Règle l'opacité de la donnée WMS ou catalogue chargée dans le widget (curseur de 0 à 100 %). La valeur est persistée et incluse dans le lien de partage.

#### Donnée via catalogue

Charge une donnée WMS à partir de son identifiant dans un catalogue de métadonnées GeoNetwork (CSW). sViewer récupère automatiquement l'URL WMS, le titre, le résumé et la licence qui sont affichés dans le panneau "info" de la carte.

**Syntaxe :** identifiant UUID seul, ou `uuid@https://csw-endpoint` pour un catalogue différent de celui configuré par défaut.

**Exemples :**
```
fb5861f1-1b20-417f-abb6-9fc316c0307d
```
```
fb5861f1-1b20-417f-abb6-9fc316c0307d@https://my-geonetwork.example.org/geonetwork/srv/eng/csw
```

> La syntaxe `id@https://csw-endpoint` permet d'utiliser n'importe quel catalogue CSW, pas seulement celui configuré par défaut.

> Exclusif avec **Donnée via WMS** : renseigner l'un vide l'autre.

#### Donnée via WMS

Affiche une ou plusieurs données via OGC:WMS directement, sans passer par le catalogue. La syntaxe complète permet d'ajouter une donnée provenant d'un service quelconque. La syntaxe abrégée permet d'ajouter une donnée provenant du serveur configuré pour le widget : l'adresse du service est alors fabriquée automatiquement.

Pour une compatibilité complète avec sViewer le service WMS doit proposer le profil WMS:SLD et donc les opérations `getCapabilities`, `getMap`, `getLegendGraphic`, `DescribeLayer`, `getFeatureInfo`, doit être `https://`  et doit proposer un CORS valide.

**Syntaxe :** 

* `layername@wmsendpointurl` — service quelconque
* `ns:mylayer` — service configuré pour le widget (URL déduite automatiquement)

**Exemple — BD Parcellaire IGN (Géoplateforme) :**
```
CP.CadastralParcel@https://data.geopf.fr/wms-r
```

> Exclusif avec **Donnée via catalogue** : renseigner l'un vide l'autre.

#### URL de base sViewer

Racine du déploiement sViewer utilisée pour construire le lien de partage autonome (bouton **Partager**). Par défaut, déduite automatiquement du serveur qui propose le widget.

À renseigner uniquement si sViewer est servi depuis une URL différente de celle du widget.

**Syntaxe :** URL complète, avec slash final.

**Exemple :**
```
https://my-sviewer.example.org/sviewer/
```

#### URL de base API Grist

Hôte de l'API Grist utilisé pour construire l'accès aux données (accès aux données de la table). Par défaut, déduit automatiquement du serveur qui propose Grist.

**Syntaxe :** origine seule (schéma + hôte + port), sans chemin.

**Exemple :**
```
https://grist.mon-organisme.fr
```

#### URL de base geOrchestra

Hôte de l'instance geOrchestra utilisé pour accéder au catalogue CSW et au proxy WMS.
Permet de bénéficier de raccourcis pour WMS et métadonnées.

**Syntaxe :** origine seule (schéma + hôte + port), sans chemin.

**Exemple :**
```
https://demo.georchestra.org
```

#### Configuration JSON

Exporte la configuration courante dans le presse-papiers, ou importe un JSON précédemment exporté. Permet de dupliquer la configuration d'un widget vers un autre.

### Appliquer / Annuler

**Appliquer** reconstruit la carte avec les nouveaux paramètres. Pour les conserver au rechargement, cliquez ensuite sur **Enregistrer** dans la barre Grist.

**Annuler** ferme le panneau sans modifier quoi que ce soit.

> Les paramètres sont stockés par widget via `widgetApi.setOptions` — chaque vue dispose de sa propre configuration indépendante.

## Détection automatique des colonnes

En mode **Auto**, le widget scanne dans cet ordre :

1. Noms reconnus comme GeoJSON : `geometry`, `geom`, `geo`, `shape`, `wkb_geometry`
2. Première ligne : valeur GeoJSON valide (`{ type, coordinates }`)
3. Première ligne : valeur WKT parseable
4. Paire lat/lon : colonnes nommées `latitude`/`lat` + `longitude`/`lon`/`lng`
5. Colonne texte `"lat,lon"` ou `"lon,lat"`

Si la détection échoue, un message invite à choisir manuellement dans le panneau de configuration.

Noms reconnus pour la colonne étiquette (premier match) : `label`, `nom`, `name`, `libelle`, `titre`, `title`.

## Lien de partage

Le bouton **Partager** de sViewer génère une URL autonome incluant l'accès à l'API Grist et les paramètres de géométrie :

```
https://sviewer.example.org/?geojson=https://docs.getgrist.com/api/docs/{docId}/tables/{tableId}/records?_geommode=…
```

Prérequis : le document Grist doit être accessible publiquement (ou le lecteur doit y avoir accès).

## Prérequis

- Grist (cloud ou auto-hébergé)
- sViewer ≥ 0.8.0
- Accès **Complet** pour l'édition de géométrie
- Les données WMS doivent supporter CORS et HTTPS

## Migration depuis v0.4.0

La table `_sviewer_customConfig` n'est plus utilisée. La configuration est désormais stockée dans les options widget Grist. Les anciennes clés `feature_color` et `feature_highlight_color` sont migrées automatiquement au premier chargement.
