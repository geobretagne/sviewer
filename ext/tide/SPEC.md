# Marée (tide) — spec

> **TRAVAIL EXPÉRIMENTAL — NON destiné à la navigation.** Cet outil ne remplace
> **pas** les prédictions officielles du SHOM. Son but est l'**évaluation croisée**
> de deux jeux de données : la **bathymétrie (DEM)** et un **modèle de marée
> harmonique (FES2022)** — voir `MODEL.md` pour la note technique complète.

Affiche l'**étendue de la mer prévue** sur une zone côtière, pour une date et une
heure choisies. La bathymétrie SHOM (fond marin) est peinte selon le niveau de la
mer et le **tirant d'eau** du bateau : un **dégradé de bleu** pour l'eau sûre,
gradué par tranche d'1 m d'eau **sous la quille** (bleu clair = 0–1 m, bleu marine
= 2 m et plus), **rouge** (immergé mais moins que le tirant d'eau — risque
d'échouage), **orange** (découvert). Le niveau de la mer est donné par une
**courbe de marée interactive** que l'utilisateur fait défiler.

Le mot « inondation » est volontairement évité : on visualise la marée
astronomique (niveau de mer prédit), pas une prévision de submersion (surcote,
houle, fleuve ignorés).

Voir `MODEL.md` pour le modèle de marée (méthode, validation, limites),
`INVESTIGATION.md` pour la faisabilité, `PLAN.md` pour les incréments.

## Principe (la physique)

**La marée est calculée localement** (dans le navigateur) par **synthèse
harmonique** des constituants du modèle global **FES2022** (CNES/AVISO) :
`h(t) = Σ fᵢ·Aᵢ·cos(Vᵢ + uᵢ − gᵢ)`. Les constituants par port sont **livrés**
(fichier ~80 ko) → la prédiction fonctionne pour **n'importe quelle date** (sans
horizon) et **hors-ligne**. Détail dans `MODEL.md`.

Deux référentiels verticaux différents :

| Donnée | Quantité | Zéro |
|---|---|---|
| Bathymétrie SHOM (WMS) | altitude du fond | **IGN69** (nivellement terrestre légal) |
| Marée (FES2022) | hauteur de surface | **MSL** (niveau moyen modèle) |

On ramène tout en IGN69 via les **RAM** (Références Altimétriques Maritimes, SHOM,
Licence Ouverte ; le datum `S` par port est **figé dans le fichier livré** à la
construction) :

```
S            = zh_ref            (RAM port : cote du zéro hydrographique en IGN69)
NM_IGN69     = zh_ref + NM_ZH    (niveau moyen du port en IGN69)
offset       = NM_IGN69 − moyenne(courbe FES du jour)          // calage
water_IGN69(t) = fes_msl(t) + offset
submergé     ⟺ fond_IGN69 < water_IGN69                        // peint par SLD GeoServer
```

**Qualité par port, mesurée face au SHOM** : un indicateur 🟢/🟡/🔴 affiche la
fiabilité en **hauteur** (cm) ET en **heure** (min) — fiable en mer ouverte
(~5 cm / ±5 min), dégradé en estuaire/ria (résolution de grille). Médiane des
14 ports bretons testés : **7 cm**. Détail + table dans `MODEL.md`.

**Règle de traçabilité scientifique** : chaque donnée utilisée (origine, date,
valeur) est affichée à l'utilisateur. Aucun nombre caché.

## Sources de données

- **Courbe de marée** — **FES2022** (CNES/LEGOS/NOVELTIS/CLS, diffusé par AVISO),
  modèle harmonique global. **Calcul LOCAL** dans le navigateur (aucun appel
  réseau) à partir des **constituants par port livrés** (`tides/fes-ports-*.json`,
  34 constituants amplitude+phase, ~80 ko, extraits à la construction du dépôt FES
  par `scripts/extract.py`). **Toute date** (sans horizon), **hors-ligne**. Calé
  sur les RAM (datum `S` figé dans le fichier). Indicateur de qualité par port
  (hauteur cm + heure min) face au SHOM. Voir `MODEL.md`. Le moteur de synthèse
  (`tide-engine.js`) reproduit la formule de Darwin de **PyFES/LIBFES** (CNES,
  BSD-3), validé maille par maille (JS vs PyFES ~1,4 cm ; JS vs SHOM ~3,8 cm à
  Concarneau). Citation FES obligatoire affichée en Données.
- **RAM** (datum + niveaux caractéristiques) — Références Altimétriques Maritimes
  SHOM (Licence Ouverte). `zh_ref` = S ; `phma`/`pmve`/`nm`. Échantillonnés à
  chaque port **à la construction** et **figés dans le fichier livré** — plus
  aucun appel WFS au runtime. Crédit affiché en Données.
- **Bathymétrie** — WMS GeoServer GéoBretagne `shom:bathy_5m`. Pixel = altitude du
  fond en IGN69 (`GRAY_INDEX`), nodata −99999. Recoloré à la volée par SLD inline.
- **Courants de marée** — WMTS SHOM `COURANTS2D_WMTS_*_3857` (atlas Courants 2D),
  **sans clé, CORS ouvert, PNG transparent**. Superposition automatique selon
  l'instant (voir ci-dessous). Couvre Manche/Atlantique, référencé Brest, niveaux
  de tuiles 0–13 (champ régional grossier ; au-delà OL sur-zoome la tuile z13).
- **Amers et balisage** — WMTS/XYZ **OpenSeaMap** (`tiles.openseamap.org/seamark`),
  **sans clé, CORS ouvert (`access-control-allow-origin: *`), PNG transparent**,
  licence ODbL. Marques de navigation seules (bouées, balises, feux, ports).
  Statique (sans dépendance temporelle) → superposition permanente tant que l'outil
  est ouvert. Tuiles publiées jusqu'à z18 (au-delà OL sur-zoome).
- **Vent** — Open-Meteo `forecast` (`api.open-meteo.com`), **sans clé, CORS
  ouvert**, modèle `best_match` (Météo-France **AROME 1,3 km** près des côtes,
  modèle global au-delà). Vitesse + rafales (km/h) + direction, 5 jours horaires,
  aux coordonnées du port. Chargé **paresseusement** à la première ouverture de
  l'onglet, rechargé au changement de port.
- **Vagues** — **Open-Meteo Marine** (`marine-api.open-meteo.com`, **sans clé,
  CORS ouvert**). Hauteur significative, direction, période + houle, 5 jours
  horaires, aux coordonnées du port. **Modèle global → grossier près des côtes
  abritées** (honnête : « vague au large »). Chargement paresseux + cache comme
  le vent.

**Sources de marée écartées.** SHOM SPM/SAPM (prédictions officielles) : payant,
clé liée à un Referer ; **vignette SHOM** : sans CORS (navigateur bloqué) ET la
réutilisation des résultats de calcul de marée est interdite par les CGU SHOM
(produit « Marées à la carte » dédié). Open-Meteo Marine (modèle météo) : horizon
~2 semaines + ~30–45 min d'écart au SHOM → **remplacé par FES2022** (harmonique,
toute date, plus précis). **FES2022** retenu : usage « toute fin » pour les
hauteurs, code de prédiction open-source (BSD-3), précision côtière. Citation
obligatoire ; cf. `MODEL.md` pour la licence et la validation.

## Interface (4 onglets)

Dock bas pleine largeur, quatre onglets (tablist WCAG, flèches ←/→) :

- **Marée** — contrôles vivants + graphe :
  - **ligne compacte** en haut : **bouton port** (icône rafraîchir + nom = le
    contrôle de re-sélection ET l'état) · **navigation de date** ‹ date ›
    « Maintenant » · **tirant d'eau** en **menu déroulant** (0–3 m, pas 10 cm —
    plus précis qu'un curseur au doigt). Le port est choisi à l'ouverture, ne suit
    PAS les déplacements ; le bouton re-sélectionne le plus proche ; un
    avertissement apparaît si l'on s'éloigne de > 10 km. L'eau sûre est peinte en
    **dégradé de bleu** (3 paliers, +1 m d'eau sous la quille par palier :
    clair → marine). Le tirant d'eau ouvre une bande rouge (immergé mais < tirant
    d'eau) entre le bleu et l'orange (découvert) → signale les zones d'échouage.
  - **courbe** uPlot : surface hauteur(t), repères PM/BM, **ligne bleue = maintenant**,
    **ligne orange = instant sélectionné**, plus un repère **marnage** (PM la plus
    haute − BM la plus basse, réel) avec un **coefficient ~ approché** (95 × marnage
    / marnage vive-eau moyen ≈ 2·(PMVE − NM), borné 20–120 ; repère vive/morte-eau,
    pas le coef officiel SHOM — méthode énoncée dans Données). Axe x sur **deux
    lignes : HH:MM puis JJ/MM** (heure prioritaire), gras et contrasté (lisible au
    soleil).
  - **lecture** sous le graphe : lecteur clavier (rôle slider) ; les valeurs
    chiffrées sont sur le **badge carte** (instant en ZH et IGN69 calculé — rien de
    caché, voir Données).
- **Vent** — graphe uPlot : vent (bleu) + rafales (rouge) en **nœuds** (l'unité du
  marin ; données récupérées en km/h, converties à l'affichage), lignes **Beaufort**
  de référence, flèches de direction (vers où souffle le vent) ; horizon 5 jours.
- **Vagues** — graphe uPlot : hauteur significative (bleu) + houle (bleu marine)
  en m, flèches de direction (vers où vont les vagues) ; horizon 5 jours.
- **Données** — port + nom, **séparation de datum + formule**, niveaux
  caractéristiques (PHMA/PMVE/NM), bathymétrie, **courants**, **amers**, **vent**,
  **vagues**, **toute la provenance** (source + date sous chaque bloc).

### Superpositions carte

- **Mer** (WMS bathymétrie, SLD) — dégradé bleu (3 paliers de profondeur sous la
  quille) / rouge / orange (cf. tirant
  d'eau), suit le curseur (débounce 160 ms), zIndex 850.
- **Amers** (XYZ OpenSeaMap) — superposition **permanente** des marques de
  navigation, zIndex 860 (au-dessus de la mer et des courants → toujours lisibles).
  Statique : ajoutée à l'ouverture, retirée à la fermeture.
- **Courants** (WMTS SHOM) — **superposition automatique, sans bouton ni sélecteur**
  (les flèches n'encombrent pas la carte). La superposition est déduite de l'instant :
  - **vive-eau / morte-eau** d'après le marnage du jour à **Brest** (≥ 4,5 m →
    vive-eau, sinon morte-eau) ;
  - **décalage** = arrondi(instant − pleine mer de Brest la plus proche), borné
    ±6 h → `PM` / `APn` (après) / `AVn` (avant).
  - La courbe de Brest provient d'un appel Open-Meteo supplémentaire par fenêtre
    (mis en cache par jour). zIndex 855, opacité 0,85 ; échouée silencieusement
    (bonus, ne bloque jamais la marée).

### Repères carte (flottants, suivent le thème clair/sombre)

- **Échelle nautique** — une `ol.control.ScaleLine` propre à l'outil, en **milles
  nautiques** au large, **bascule en mètres sous ~500 m** (travail au plus près).
  Placée en **haut-centre** (libre : barres d'outils dans les coins, dock en bas),
  au-dessus du badge. L'échelle métrique du cœur reste, mais elle est métrique et
  cachée par le dock — celle-ci la remplace pour la navigation.
- **Badge** (haut-centre) — date/heure · hauteur d'eau · **vent (nœuds)** ·
  **vagues (m)** de l'instant sélectionné, avec glyphes d'identification + flèches
  de direction. Visible même dock masqué.
- **Sonde** (spinner de chargement WMS) — disque flottant haut-centre.

### Interaction graphe → carte

- **Deux repères temps partagés** par les **trois** graphes (marée, vent, vagues) :
  ligne **bleue = maintenant**, ligne **orange = instant sélectionné**. Cliquer
  l'un **des trois** graphes engage l'instant partout (carte, repères, badge, URL) ;
  le survol ne déplace rien. Changer de jour reste cohérent : marée et mer suivent.
- **Clavier** sur la lecture (rôle slider) : flèches ±1 pas, Page ±1 h, Début/Fin.
- Par défaut, curseur = **maintenant** (ou `tide_t`), carte peinte aussitôt.

### Sonde de profondeur (clic carte)

Cliquer la **carte** (outil actif, instant sélectionné) lance un **GetFeatureInfo**
sur la **même** donnée bathymétrique que le rendu (`seaSrc`) pour lire l'altitude
du fond (IGN69) sous le pointeur, puis calcule la colonne d'eau comme le SLD :
`profondeur = niveau_mer − fond` ; `sous la quille = profondeur − tirant d'eau`.
Un marqueur + une popup affichent chaque nombre avec un **signe ± explicite** et
des couleurs calées sur la rampe carte (bleu = eau, vert = marge sûre, rouge =
échouage, orange = découvert). La popup se **recalcule** au défilement du curseur
ou du tirant d'eau (le fond est fixe → aucun nouvel appel). Hors couverture →
une **caution amber** (« un vide de données n'est PAS une eau sûre ») — jamais lue
comme une eau sûre. **En ligne uniquement** (la bathymétrie n'est pas mise en cache
hors-ligne).

## Performance / quotas

- **Marée = calcul local, zéro réseau, zéro horizon.** La courbe est synthétisée
  dans le navigateur à partir des constituants livrés (~ms par jour). Changer de
  jour = re-synthèse instantanée. Pas de cache, pas de quota, **toute date** passée
  ou future (domaine FES 1700–2100). Le fichier de constituants (~80 ko) est chargé
  une fois à l'ouverture (paresseux) puis mis en cache par le navigateur/SW →
  hors-ligne complet.
- **Debounce** : navigation de date 250 ms, requête mer WMS 160 ms.
- WMS mer en **`ol.source.TileWMS`, tuiles 512×512** : sur grand écran haute
  résolution, une seule image plein-cadre force le serveur à calculer + seuiller un
  raster énorme (lent, gourmand). Les tuiles 512² découpent ce calcul en petits
  rendus parallèles, mis en cache par tuile (pan/zoom réutilise, seul un changement
  de SLD — curseur/tirant d'eau — relance un jeu de tuiles). 512 plutôt que 256 par
  défaut = deux fois moins de requêtes à surface égale. Contrepartie vs l'ancien
  `ImageWMS` : une tuile en échec laisse un trou transparent (et non un raté plein
  cadre) — acceptable, la bathymétrie est déjà un ruban côtier. Courants en WMTS.
- **Gate de zoom** (`tide_minzoom`, défaut 13) : ne bloque que l'**ouverture** de
  l'outil quand on est trop dézoomé. Un panneau déjà ouvert reste ouvert au
  dézoom (port, date, tirant d'eau, graphe conservés) — re-zoomer ne recharge rien.

### Hors-ligne (localStorage)

Persisté sous le préfixe `sv_tide_v1.*`, entrées emballées `{_ts, v}`, éviction
LRU au dépassement de quota :
- **Marée** : **aucun cache nécessaire** — synthèse locale depuis les constituants
  livrés, hors-ligne par construction (toute date). Seule la courbe de Brest pour
  les courants (`brest.date`) reste un appel Open-Meteo mis en cache par jour.
- **Vent** / **Vagues** : prévision par port (`wind.site` / `wave.site`),
  **horodatée** ; affichée d'emblée si fraîche (< 3 h) ou hors-ligne, avec un
  bandeau d'âge « peut être obsolète ». Échec réseau → repli sur le cache.
- **Hors-ligne = revisite** d'un port déjà ouvert en ligne ; un premier accès
  hors-ligne n'a aucune donnée.
- **Toujours en ligne** : bathymétrie (WMS mer), courants (WMTS), amers (XYZ) et
  la **sonde de profondeur** (GetFeatureInfo) — non mis en cache hors-ligne.

## Paramètres d'URL (permanents, jamais renommés)

L'URL est la persistance : `syncUrl()` reflète l'état (port, instant, tirant
d'eau) dans la barre d'adresse via `replaceState`, en préservant les autres
paramètres et en ajoutant `ext=tide`. Un lien partagé rouvre à l'identique.

| Param | Effet |
|---|---|
| `tide_port` | présélectionne un port RAM par son nom |
| `tide_t` | instant ISO local `AAAA-MM-JJTHH:MM` → jour + position du curseur |
| `tide_draft` | tirant d'eau 0–3 m |
| `tide_minzoom` | seuil de zoom d'activation (défaut 13) |
| `tide_open` | `1`/`true`/`yes` → auto-ouvre l'outil au chargement (dock + superpositions), sans clic. Ouvre quel que soit le zoom (l'avertissement « éloigné » couvre un départ trop large). Absent → ouverture par bouton (défaut). Réglable aussi via `customConfig`. |

## Limites connues / non-buts

- **Pas un outil de navigation** ni de submersion. Marée astronomique prédite,
  modèle calé — surcote/houle/pression non garanties.
- **Port unique** : valide à l'échelle d'une zone côtière (S plat). Au-delà,
  ré-sélectionner le port le plus proche.
- **Bathymétrie = ruban côtier** : `bathy_5m` peut avoir des trous au large
  (transparents). La bathymétrie a remplacé l'usage de Litto3D terrestre (qui ne
  couvre que la terre au-dessus de la plus basse mer, laissant la mer vide).
- **Horizon de prévision** ~2 semaines (Open-Meteo) : au-delà, « Pas de prévision ».
- Pas de coefficient de marée (l'offre gratuite du modèle ne le fournit pas).
- **Courants** : l'atlas SHOM ne distingue que **deux régimes** (coef 45 / 95,
  morte/vive-eau) et des pas **horaires** ±6 h ; notre choix vive/morte par
  marnage est donc approximatif au voisinage du seuil. Référencé **Brest** →
  Manche/Atlantique uniquement (la Méditerranée utilise d'autres ports de
  référence, hors périmètre). Niveaux de tuiles 0–13 (champ grossier).

## Dépendances

- **uPlot** (MIT, vendored `uplot.min.{js,css}`, lazy au premier graphe).
- **OpenLayers 10** (cœur sViewer) pour les superpositions WMS (mer), WMTS (courants) et XYZ (amers OpenSeaMap). Marée + vagues + courants : Open-Meteo Marine ; vent : Open-Meteo forecast.
- Aucune autre : pas de CDN, pas de clé d'API, pas de backend.
