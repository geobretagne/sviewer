# Marée (tide) — spec

Affiche l'**étendue de la mer prévue** sur une zone côtière, pour une date et une
heure choisies. La bathymétrie SHOM (fond marin) est peinte **bleu (immergé) /
orange (découvert)** de part et d'autre du niveau de la mer ; ce niveau est donné
par une **courbe de marée interactive** que l'utilisateur fait défiler.

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

SHOM SPM (prédictions officielles) écarté : clé liée à un Referer + endpoint
`hlt` en 403 sur l'offre gratuite. WorldTides écarté : pas de cache multi-
utilisateur (licence). Open-Meteo : non commercial, attribution CC-BY-4.0.

## Interface (2 onglets)

Dock bas pleine largeur, deux onglets (tablist WCAG, flèches ←/→) :

- **Marée** — contrôles vivants + graphe :
  - **ligne compacte** en haut : bouton **re-sélection du port** (icône seule) ·
    nom du port · **navigation de date** ‹ date › « Aujourd'hui » · **curseur
    tirant d'eau** (0–3 m). Le port est choisi à l'ouverture, ne suit PAS les
    déplacements ; le bouton re-sélectionne le plus proche ; un avertissement
    apparaît si l'on s'éloigne de > 10 km. Le tirant d'eau abaisse la limite
    bleu/orange → signale les zones d'échouage.
  - **courbe** uPlot : surface hauteur(t), repères PM/BM, **ligne rouge = maintenant**,
    **ligne orange = instant sélectionné**.
  - **lecture** sous le graphe : instant sélectionné dans les **deux** référentiels
    (ZH et IGN69 calculé) — rien de caché.
  - **spinner** pendant le chargement de la carte WMS.
- **Données** — port + nom, **séparation de datum + formule**, niveaux
  caractéristiques (PHMA/PMVE/NM), bathymétrie, **courants**, **toute la
  provenance** (source + date sous chaque bloc).

### Couches carte

- **Mer** (WMS bathymétrie, SLD) — bleu/orange, suit le curseur (débounce 160 ms),
  zIndex 850.
- **Courants** (WMTS SHOM) — **superposition automatique, sans bouton ni sélecteur**
  (les flèches n'encombrent pas la carte). La couche est déduite de l'instant :
  - **vive-eau / morte-eau** d'après le marnage du jour à **Brest** (≥ 4,5 m →
    vive-eau, sinon morte-eau) ;
  - **décalage** = arrondi(instant − pleine mer de Brest la plus proche), borné
    ±6 h → `PM` / `APn` (après) / `AVn` (avant).
  - La courbe de Brest provient d'un appel Open-Meteo supplémentaire par fenêtre
    (mis en cache par jour). zIndex 855, opacité 0,85 ; échouée silencieusement
    (bonus, ne bloque jamais la marée).

### Interaction graphe → carte

- **Clic** sur le graphe = engage l'instant (la ligne orange + la carte s'y fixent ;
  le survol ne déplace rien).
- **Clavier** sur la lecture (rôle slider) : flèches ±1 pas, Page ±1 h, Début/Fin.
- Par défaut, curseur = **maintenant** (ou `tide_t`), carte peinte aussitôt.

## Performance / quotas

- **Fetch fenêtré** : un appel Open-Meteo couvre 14 jours (poids 1.0), découpé par
  jour, mis en cache (`site|date`). Se déplacer dans la fenêtre = **zéro appel**.
  Jours hors horizon mis en cache `null` (jamais re-demandés).
- **Debounce** : navigation de date 250 ms, requête mer WMS 160 ms.
- Limites Open-Meteo (600/min, 10000/jour, **par IP visiteur** — non partagées) :
  intenables en usage normal.
- WMS mer en **`ol.source.ImageWMS`** (une image par vue, pas de tuiles → pas de
  trou si une tuile manque). Courants en WMTS (tuiles, mais transparentes).
- **Gate de zoom** (`tide_minzoom`, défaut 13) : ne bloque que l'**ouverture** de
  l'outil quand on est trop dézoomé. Un panneau déjà ouvert reste ouvert au
  dézoom (port, date, tirant d'eau, graphe conservés) — re-zoomer ne recharge rien.

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
- **OpenLayers 10** (cœur sViewer) pour les couches WMS (mer) et WMTS (courants).
- Aucune autre : pas de CDN, pas de clé d'API, pas de backend.
