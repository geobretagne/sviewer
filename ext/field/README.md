# sViewer — extension Terrain

Collecte de données géographiques sur le terrain avec un smartphone, **même sans réseau**.
Cartographiez un point, une ligne ou un polygone au GPS, renseignez des attributs, joignez
des photos, et transmettez le tout vers un document [Grist](https://www.getgrist.com) dès que
la connexion revient.

Pensée pour l'agent de terrain : carte toujours visible, grosses cibles tactiles, aucune perte
de données si le réseau coupe ou si l'application se ferme en cours de route.

## Activation

Dans `local/customConfig.js` :

```javascript
customConfig = { extensions: ['field'] };
```

ou directement par l'URL :

```
index.html?ext=field
```

Un bouton **plume** apparaît dans la barre d'outils de droite. Il ouvre le panneau Terrain.

## Prérequis Grist

L'extension écrit dans **un document Grist auto-hébergé**. À préparer :

1. **Une table** avec au minimum une colonne destinée à la géométrie (type **Texte**) — elle
   recevra la géométrie au format GeoJSON.
2. **CORS** : le serveur Grist doit autoriser l'origine de votre sViewer
   (`GRIST_ALLOWED_ORIGINS`, ou un en-tête CORS via reverse-proxy).
3. **Accès en écriture** :
   - **Document public** en lecture/écriture : aucun jeton nécessaire.
   - **Document privé** : un **jeton d'accès scopé document**.

Colonnes optionnelles, toutes prises en charge selon leur type :

| Type Grist | Saisie dans le formulaire |
|------------|---------------------------|
| Texte | champ texte |
| Numérique / Entier | champ numérique |
| Date | sélecteur de date |
| DateHeure | sélecteur date + heure |
| Booléen | case à cocher |
| Choix | liste déroulante |
| Liste de choix | sélection multiple |
| **Pièces jointes** | **photos** (voir plus bas) |

Les colonnes calculées (formule) et la colonne géométrie sont automatiquement exclues du
formulaire.

## Configuration

Au premier lancement, le panneau ouvre la configuration.

**Le plus simple** — collez une **URL Grist** (l'adresse de votre document dans le navigateur)
dans le champ *Coller une URL Grist* : le serveur et le document se remplissent
automatiquement, et la liste des tables du document se charge. Choisissez la table dans le
menu déroulant.

Vous pouvez aussi renseigner les champs un par un :

| Champ | Exemple |
|-------|---------|
| Coller une URL Grist | `https://grist.exemple.fr/o/docs/vqXTaVMqyhbc/ma-page/p/2` |
| URL API Grist | `https://grist.exemple.fr` |
| Identifiant du document | `vqXTaVMqyhbc` |
| Table | *(menu déroulant — bouton ↻ pour rafraîchir)* |
| Colonne géométrie | `geojson` |
| Jeton d'accès | *(vide si document public)* |

La configuration est mémorisée dans le navigateur (`localStorage`). Le jeton n'est jamais
inscrit dans une URL ni journalisé.

> **Schéma modifié dans Grist ?** Ouvrez la configuration (bouton engrenage) et cliquez
> **Recharger le schéma**. Le formulaire reflète alors les nouvelles colonnes.

## Collecte d'une géométrie

1. Dans le panneau, choisissez le mode : **Points**, **Ligne** ou **Polygone**. Le bouton
   démarre immédiatement la capture : le GPS s'active, la carte se centre sur votre position,
   et une **barre flottante** apparaît en bas (le panneau se ferme pour laisser la carte
   visible).
2. La barre affiche la **précision GPS courante** (en mètres) et le **nombre de points**.
3. Placez-vous sur le point voulu et tapez **+**. L'extension **moyenne plusieurs mesures GPS
   pendant ~3 secondes** pour fiabiliser le point, puis l'ajoute. Restez immobile pendant la
   mesure.
4. Répétez pour chaque point. La géométrie se dessine en direct sur la carte.
   - **↶** retire le dernier point.
   - **✕** abandonne la capture.
5. Une fois le minimum atteint (1 point en mode Points, 2 pour une ligne, 3 pour un polygone),
   tapez **✓** pour fermer la géométrie et passer à la saisie des attributs.

> Le mode **Points** enregistre un ou plusieurs points comme une seule géométrie (MultiPoint).

## Attributs et photos

Le formulaire est généré à partir du schéma de la table. Chaque colonne s'affiche avec le bon
type de saisie. Les valeurs sont converties au format attendu par Grist à l'enregistrement
(une date devient un horodatage, un nombre un nombre, etc.).

**Photos** (si la table possède une colonne **Pièces jointes**) :

- Bouton de sélection de fichier avec accès direct à l'appareil photo.
- Plusieurs photos possibles, chacune avec une vignette et un bouton de suppression.
- Les photos sont **redimensionnées dans le navigateur** (bord max 1600 px, JPEG) avant
  stockage et envoi — léger pour le réseau et le stockage. Les métadonnées EXIF (dont la
  position GPS embarquée) sont retirées.

Tapez **Enregistrer la zone** pour valider.

## Hors-ligne et transmission

- Chaque zone est **écrite localement (IndexedDB) avant toute tentative réseau**. Une coupure,
  un plantage ou la fermeture de l'application ne fait **jamais** perdre une zone.
- En ligne : la zone est transmise immédiatement (photos envoyées en premier, puis la ligne).
- Hors-ligne : la zone reste en file d'attente. Elle part automatiquement au retour du réseau
  (ou via le bouton **Synchroniser**).

> **Fonds de carte hors-ligne :** les tuiles de fond ne sont pas mises en cache. En zone sans
> réseau, le fond peut être vide sous votre géométrie — la capture GPS fonctionne quand même.

## Tableau des zones

Le panneau liste les zones collectées (les plus récentes en premier) :

- **Date** de capture.
- **État** : en attente, transmise (avec l'**identifiant Grist** de la ligne), ou erreur
  (le message au survol).
- **Attributs** (aperçu).
- **Zoom** sur la zone, **suppression** (pour les zones non encore transmises).

Le bouton **Synchroniser** est désactivé quand toutes les zones sont déjà transmises.

**Vider la liste** (icône corbeille) supprime **toutes** les zones locales pour repartir sur
un lot vierge — y compris les zones non transmises. Une confirmation est demandée car l'action
est irréversible.

Les zones transmises sont conservées pour consultation hors-ligne, dans la limite des 50 plus
récentes.

## Sécurité et vie privée

- Aucun cookie. La configuration (jeton compris) reste dans le stockage local du navigateur.
- Le jeton transite uniquement dans l'en-tête `Authorization`, jamais dans une URL.
- Document privé : utilisez un **jeton scopé document** (révocable, rotation possible côté
  Grist) plutôt qu'une clé de compte — la portée d'une éventuelle fuite reste limitée à ce
  document.

## Dépannage

| Symptôme | Vérifier |
|----------|----------|
| Erreur réseau à la transmission | CORS du serveur Grist autorise l'origine sViewer |
| Liste des tables vide après collage d'URL | URL valide (HTTPS), document accessible, bouton ↻ pour réessayer |
| Échec d'écriture sur document privé | jeton renseigné et valide (scopé document) |
| GPS indisponible | l'application doit être servie en **HTTPS** (ou `localhost`) |
| Une colonne n'apparaît pas | elle est calculée (formule), géométrie, ou Pièces jointes |
| Schéma figé après modification Grist | bouton **Recharger le schéma** dans la configuration |
| Photo non transmise | une colonne **Pièces jointes** existe-t-elle dans la table ? |
| Géométrie absente de la carte | la colonne géométrie est bien au format GeoJSON |

## Notes techniques

- Projection : géométrie stockée en **EPSG:4326** (relisible par l'extension `grist`,
  mode `geojson`).
- Stockage local : IndexedDB `sv_field` / `queue`. Configuration : `localStorage`
  `sv_field_cfg_v1`.
- Aucune dépendance externe : OpenLayers, l'API d'extension sViewer, `fetch` et IndexedDB
  natifs.

Détails d'architecture et invariants : `MISSION.md`.
