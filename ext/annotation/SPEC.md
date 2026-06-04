# Annotation — spec (draft)

Extension de dessin léger pour sViewer. Permet à un non-spécialiste de tracer
quelques points / lignes / polygones à la souris (ou au doigt), de les annoter,
puis de les **partager** — sans logiciel SIG, sans compte, sans serveur au départ.

Comble le seul manque de sViewer face à uMap pour ce public : « je veux juste
faire une carte » alors qu'on n'a aucune donnée de départ.

> Tension avec MISSION (« pas de dessin ») : choix assumé et **opt-in** via
> extension, le cœur reste un visualiseur. L'annotation n'est jamais chargée par
> défaut.

---

## Principes de conception (ce que les autres outils ratent)

Cinq irritants des outils existants (uMap, mviewer…) deviennent ici cinq règles.
Elles priment sur toute décision d'implémentation.

### 1. Zéro jargon

Le public ne connaît pas « entité », « géométrie », « couche », « sommet »,
« WKT », « CRS ». Vocabulaire courant uniquement :

| Interdit (jargon) | UI annotation |
|-------------------|---------------|
| Point / géométrie ponctuelle | **un repère** |
| Polygone | **une zone** |
| Ligne / polyligne | **un trait** |
| Entité / feature | **une annotation** |
| Couche | (jamais nommé — il n'y en a qu'une, invisible pour l'utilisateur) |
| Attribut / propriété | **libellé**, **note** |

Boutons orientés action, pas objet : « **Ajouter un repère** », pas « Dessiner
un point ». (Respecte aussi [[feedback_no_couche]].)

### 2. Sélection sans chasse au pixel

Les autres outils exigent de cliquer pile sur le sommet ; on rate, ça désélectionne.

- **Cibles généreuses** : `hitTolerance: 8` (déjà utilisé dans field).
- **Survol visible** : surbrillance au passage, le curseur indique le cliquable.
- **Liste latérale** des annotations dans le panneau : taper une ligne →
  sélectionne + centre la carte dessus. La sélection ne dépend **jamais** d'un
  clic précis sur la carte.

### 3. Pas de dilemme clic simple / double

Cause classique de confusion : simple=ajoute un sommet, double=termine, mais
double=zoom ailleurs. Conflits, utilisateur perdu.

- **Un tap = une action**, toujours. Le simple clic ajoute un sommet.
- **Bouton « Terminer » explicite** pour clore un trait / une zone — **pas** de
  double-clic. Le double-clic garde son sens carto (zoom), jamais détourné.
- **Mode visiblement armé** : bouton allumé + bandeau « Tracez votre zone, puis
  *Terminer* ». L'utilisateur sait toujours ce qu'un tap va faire.
- **Annuler** le dernier sommet (bouton ↶) et **Échap** pour sortir du mode.

### 4. Attributs cadrés, jamais en vrac

Les autres outils offrent un fouillis clé/valeur libre : fautes de frappe, aucun
contrôle, chaque annotation a une forme différente.

- **Mini-formulaire typé**, pas de « ajouter une propriété » libre.
- Phase 1 : champs fixes — **libellé** (texte court), **couleur** (palette
  restreinte), **note** (texte long, optionnel).
- Phase 2 (Grist) : formulaire **piloté par le schéma** de la table (types,
  obligatoires) — réutilise le formulaire typé d'`ext/field`.
- Validation à la saisie (longueur, requis), messages clairs, jamais de plantage
  silencieux.

### 5. Partage en un geste

Les autres outils : exporter un fichier → l'héberger → envoyer le lien → le
destinataire importe. Trop d'étapes.

- **Un bouton « Partager » = un lien prêt** dans le presse-papier.
- Le dessin **voyage dans l'URL** (`?draw=`). Aucun hébergement, aucune étape
  d'import : ouvrir le lien affiche le dessin tel quel.
- Repli fichier **GeoJSON** pour qui veut un fichier (autonomie totale), mais ce
  n'est pas le chemin par défaut.

---

## Principe : persistance par paliers

Du plus autonome au plus partagé. L'utilisateur monte d'un palier seulement
s'il en a besoin.

| Palier | Stockage | Backend | Partage | Limite |
|--------|----------|---------|---------|--------|
| **1. URL** | dans le lien | aucun | n'importe qui via le lien | petit (URL ~quelques Ko) |
| **2. localStorage** | ce navigateur | aucun | non (un seul appareil) | ce navigateur seulement |
| **3. Grist** (option) | table Grist | Grist | multi-appareil, ré-éditable | nécessite un Grist |

Paliers 1+2 = phase 1 (sans backend, ADN sViewer). Palier 3 = phase 2, réutilise
la chaîne d'`ext/field` (géométrie → Grist).

---

## Phase 1 — sketch & share (sans backend)

### Dessin (interaction, applique les principes 1–3)

- Trois actions, libellées en clair : **Ajouter un repère**, **Tracer un trait**,
  **Tracer une zone** (`ol.interaction.Draw`, déjà dans le build — pas de
  modification du build).
- **Mode armé visible** : au clic sur une action, le bouton s'allume et un
  bandeau s'affiche (« Tracez votre zone, puis *Terminer* »). L'utilisateur sait
  toujours ce qu'un tap fera.
- **Un tap = un sommet.** Pas de double-clic pour terminer.
  - **Terminer** (bouton) clôt un trait / une zone.
  - **↶ Annuler** retire le dernier sommet.
  - **Échap** sort du mode sans rien créer.
  - Un repère se pose en un seul tap (terminé d'office).
- À la fin d'un tracé : ouverture directe du **mini-formulaire** (libellé,
  couleur, note) — voir Panneau.
- Pas d'édition de sommet en phase 1 (`Modify`/`Snap` absents du build) :
  modifier = supprimer + retracer. (Phase 1.5 : ajouter `Modify`/`Snap` au build
  si l'édition de sommet devient nécessaire, cf. [[feedback_ol_build_scope]] —
  peser toujours-chargé vs bundle ext.)
- Une seule couche de dessin, indépendante de `?geojson=` — **jamais nommée
  « couche » dans l'UI** (principe 1).

### Panneau (UI, applique les principes 2 + 4)

- **Liste des annotations** : une ligne par annotation (pastille couleur +
  libellé). Taper une ligne → la **sélectionne** et **centre** la carte dessus.
  La sélection ne dépend jamais d'un clic précis sur la carte (principe 2).
  Chaque ligne : bouton **supprimer** (avec confirmation).
- **Sélection carte** : `hitTolerance: 8`, surbrillance au survol, la sélection
  ouvre le formulaire de l'annotation.
- **Mini-formulaire typé** (principe 4), champs fixes en phase 1 :
  - **libellé** — texte court (max ~60 car., validé) ;
  - **couleur** — palette restreinte (~6 teintes accessibles, contraste AA) ;
  - **note** — texte long optionnel.
  Aucun champ clé/valeur libre. Échappement systématique à l'affichage (les
  libellés sont du texte, jamais du HTML).

### Stockage / partage (applique le principe 5)

- Géométries → **GeoJSON FeatureCollection (EPSG:4326)**.
- **Sauvegarde locale automatique** (localStorage, clé `sv_annotation_v1`) :
  l'utilisateur ne pense pas à « enregistrer ». Restaurée au chargement si
  l'URL ne contient pas de `?draw=`.
- **Un bouton « Partager »** = lien prêt dans le presse-papier, en un geste :
  - URL construite via `SViewer.getPermalink()` + `?draw=<payload>` (réutilise le
    permalien canonique, ne pas réassembler à la main).
  - `<payload>` = GeoJSON compressé puis base64-url.
  - Ouvrir le lien **affiche le dessin tel quel** — aucun hébergement, aucune
    étape d'import.
  - Garde-fou longueur : si le dessin dépasse ~6 Ko encodé (limite navigateur
    ~8 Ko fiable), message clair : « Dessin trop volumineux pour un lien —
    exportez un fichier ou enregistrez dans Grist (phase 2) ».
- Repli **export fichier GeoJSON** (télécharger) pour qui veut un fichier ;
  ce n'est pas le chemin par défaut.

### Sécurité / robustesse

- `?draw=` est une **entrée non fiable** : valider strictement (taille max,
  JSON.parse en try/catch, vérifier le schéma GeoJSON, refuser sinon). Ne jamais
  injecter de propriété en innerHTML sans échappement (libellés = texte).
- Aucune URL externe, aucun fetch en phase 1.

### API sViewer utilisées

- `SViewer.onMapReady` — point d'entrée.
- `SViewer.getMap()` — pour ajouter la couche + l'interaction `Draw`.
- `SViewer.panel.open(id, title, html, { fullscreen })` — panneau modes + libellé
  + partage (plein écran mobile).
- `SViewer.panel.onClose` — désactiver le dessin, reset bouton.
- `SViewer.getPermalink()` — base du lien de partage.
- bouton barre d'outils `sv-map-btn sv-alt-toggle` (le dessin survit à
  l'ouverture d'autres panneaux).

---

## Phase 2 — persistance Grist (option)

Active seulement si l'utilisateur configure un Grist (collage d'URL + choix de
table, **exactement le pattern d'`ext/field`**).

- Réutilise d'`ext/field` : configuration (apiBase/docId/tableId/token/geomCol),
  écriture d'une ligne `{ geometry: GeoJSON-string EPSG:4326, …attributs }`,
  jeton optionnel scopé document, `X-Requested-With`.
- Différence avec `field` : la géométrie vient du **dessin souris**, pas du GPS.
  Donc field et annotation partagent la couche persistance, diffèrent sur la
  source de géométrie.
- Réouverture : lire les lignes Grist → afficher comme entités éditables
  (supprimer/retracer en phase 2 ; vrai `Modify` si le build l'ajoute).
- **Pas de jeton dans l'URL / les logs** (règle sécurité, cf. field).

> Mutualisation possible : extraire la couche « géométrie → Grist » de `field`
> dans un module partagé que `field` et `annotation` importent. À décider quand
> la phase 2 démarre (éviter la copie).

---

## Hors périmètre (volontairement)

- Analyse spatiale, jointures, calculs — c'est QGIS, pas sViewer.
- Gestion de multiples couches dessinées — une seule couche annotation.
- Édition collaborative temps réel — Grist gère sa propre concurrence, pas de
  sur-couche temps réel côté sViewer.
- WFS-T / geOrchestra comme backend — nécessite des spécialistes que ce public
  n'a pas (cf. [[project_sviewer_positioning]]).

---

## Découpage de livraison

1. **Phase 1a** — dessin Point/Ligne/Polygone + couleur + libellé + localStorage.
2. **Phase 1b** — `?draw=` encode/decode + bouton partage + export GeoJSON.
3. **Phase 2** — config Grist (réutilise field) + écriture + relecture.
4. **Phase 1.5** (si besoin) — `Modify`/`Snap` au build pour édition de sommet.

Chaque phase = livrable autonome et utile seul.
