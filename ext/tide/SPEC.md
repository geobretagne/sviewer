# Marée (tide) — spec

Affiche l'**étendue de la mer prévue** sur une zone côtière, pour une date et une
heure choisies. La bathymétrie SHOM (fond marin) est peinte selon le niveau de la
mer et le **tirant d'eau** du bateau : un **dégradé de bleu** pour l'eau sûre,
gradué par tranche d'1 m d'eau **sous la quille** (bleu clair = 0–1 m, bleu marine
= 2 m et plus), **rouge** (immergé mais moins que le tirant d'eau — risque
d'échouage), **orange** (découvert). Le niveau de la mer est donné par une
**courbe de marée interactive** que l'utilisateur fait défiler.

**Outil de visualisation de marée prédite — NON destiné à la navigation.** Le mot
« inondation » est volontairement évité : on visualise la marée astronomique
(niveau de mer prédit), pas une prévision de submersion (surcote, houle, fleuve
ignorés).

Voir `INVESTIGATION.md` pour la faisabilité et la physique, `PLAN.md` pour les
incréments de construction.

## Principe (la physique)

Deux référentiels verticaux différents :

| Donnée | Quantité | Zéro |
|---|---|---|
| Bathymétrie SHOM (WMS) | altitude du fond | **IGN69** (nivellement terrestre légal) |
| Marée (Open-Meteo) | hauteur de surface | **MSL** (niveau moyen modèle) |

On ramène tout en IGN69 via les **RAM** (Références Altimétriques Maritimes, SHOM,
Licence Ouverte) :

```
S            = zh_ref            (RAM port : cote du zéro hydrographique en IGN69)
NM_IGN69     = zh_ref + NM_ZH    (niveau moyen du port en IGN69)
offset       = NM_IGN69 − moyenne(courbe Open-Meteo du jour)   // calage
water_IGN69(t) = om_msl(t) + offset
submergé     ⟺ fond_IGN69 < water_IGN69                        // peint par SLD GeoServer
```

Mesuré : ΔS = 1 cm / 5 km ≪ précision Litto3D 10 cm → **S plat** honnête à
l'échelle d'une zone de 4 milles nautiques autour d'un port unique.

**Règle de traçabilité scientifique** : chaque donnée utilisée (origine, date,
valeur) est affichée à l'utilisateur. Aucun nombre caché.

## Sources de données

- **RAM** (port + datum) — WFS ouvert SHOM, sans clé.
  `RAM_BDD_WLD_WGS84G_WFS:ram_3857`, GeoJSON, EPSG:3857 (= la vue → pas de
  reprojection). Propriété `zh_ref` = S ; `phma`/`pmve`/`nm` = niveaux
  caractéristiques.
- **Courbe de marée** — **Open-Meteo Marine** (`marine-api.open-meteo.com`).
  **Gratuit, sans clé, CORS ouvert → appelé DIRECTEMENT depuis le navigateur, sans
  proxy.** `sea_level_height_msl`, pas de 15 min. Le modèle donne la bonne forme /
  le bon timing ; son décalage absolu MSL→IGN69 est incertain → **calé sur les
  RAM** (la moyenne du jour est ancrée sur NM_IGN69). Vérifié : water_IGN69
  −0,62…1,75 m vs SHOM −0,73…1,65 m (~5-10 cm).
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
- **Vagues** — **Open-Meteo Marine** (même hôte/endpoint que la marée, **sans clé,
  CORS ouvert**). Hauteur significative, direction, période + houle, 5 jours
  horaires, aux coordonnées du port. **Modèle global → grossier près des côtes
  abritées** (honnête : « vague au large »). Même chargement paresseux + cache que
  le vent.

SHOM SPM (prédictions officielles) écarté : clé liée à un Referer + endpoint
`hlt` en 403 sur l'offre gratuite. WorldTides écarté : pas de cache multi-
utilisateur (licence). Open-Meteo : non commercial, attribution CC-BY-4.0.

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

- **Fetch fenêtré** : un appel Open-Meteo couvre 14 jours (poids 1.0), découpé par
  jour, mis en cache (`site|date`). Se déplacer dans la fenêtre = **zéro appel**.
  Jours hors horizon mis en cache `null` (jamais re-demandés).
- **Horizon de prévision auto-borné** : l'`end_date` est plafonné à aujourd'hui +
  14 j (l'horizon Open-Meteo marine ≈ +16 j ; au-delà l'API rejette tout l'appel).
  Si l'horizon réel est plus court un jour donné, la requête **s'auto-corrige** :
  on lit la date max énoncée dans l'erreur et on relance une fois, plafonné dessus.
  Un jour au-delà de l'horizon affiche « Pas de prévision » sans appel.
- **Debounce** : navigation de date 250 ms, requête mer WMS 160 ms.
- Limites Open-Meteo (600/min, 10000/jour, **par IP visiteur** — non partagées) :
  intenables en usage normal.
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
- **Marée** : séries par jour (`tide.site|date`, calibrage déjà appliqué → rendu
  sans réseau) ; port + datum par cellule de carte (`port.cell`) ; courbe de Brest
  (`brest.date`).
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
