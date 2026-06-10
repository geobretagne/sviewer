# Tide model — note technique

**Statut : travail expérimental.** Ce modèle de marée n'est **pas** une source de
prédiction officielle et **ne remplace pas le SHOM** pour la navigation. Son but
est l'**évaluation croisée** de deux jeux de données dans sViewer : la
**bathymétrie (DEM)** et un **modèle de marée harmonique (FES2022)** — chacun
servant à contrôler la cohérence de l'autre.

---

## 1. Principe — la méthode harmonique

La marée est la **somme d'ondes sinusoïdales** (les *constituants* harmoniques),
chacune de **fréquence astronomique connue et fixe** (mouvements relatifs
Terre / Lune / Soleil). En un lieu donné, chaque constituant a une **amplitude**
et un **déphasage** propres. Prédire la marée = **resommer ces sinusoïdes** pour
l'instant voulu.

Comme les fréquences sont astronomiques, la prédiction est valable pour
**n'importe quelle date, passée ou future** (pas d'horizon de prévision, contrai-
rement à un modèle météo). Domaine de validité de FES2022 : **1700–2100**.

---

## 2. Source des données — FES2022

**FES2022** (Finite Element Solution), atlas global de marée océanique produit par
**LEGOS / NOVELTIS / CLS**, financé par le **CNES**, diffusé par **AVISO**.

- **34 constituants**, un fichier NetCDF par constituant (`m2_fes2022.nc`, …).
- Chaque fichier = une **grille globale** au **1/30°** (≈ 3,5 km ; 10800 × 5401
  mailles), contenant par maille :
  - **amplitude** `A` (cm) — hauteur de l'onde de ce constituant ici,
  - **phase** `g` (degrés) — retard de phase de Greenwich (calage temporel).
- Référence verticale des hauteurs : **niveau moyen (MSL)** du modèle.

Constituants utilisés (34) : M2, S2, N2, K2, K1, O1, P1, M4, MS4, MN4, 2N2, EPS2,
J1, L2, LAMBDA2, M3, M6, M8, MF, MKS2, MM, MSF, MSQM, MTM, MU2, N4, NU2, Q1, R2,
S1, S4, SA, SSA, T2.

**Citation obligatoire** (transportée dans le fichier de données) :
> FES2022 © CNES/LEGOS/NOVELTIS/CLS Ocean and Climate Division, distributed by
> AVISO with support from CNES. DOI:10.24400/527896/A01-2024.004

---

## 3. Chaîne de calcul

```
grilles FES2022 ──(extraction)──▶ constituants par port ──(synthèse)──▶ h(t)
  (hors-ligne)                      (fichier ~76 ko, livré)   (navigateur, toute date)
```

### 3a. Extraction (hors-ligne, par port)

Pour chaque port de référence (lon, lat) — la liste et les coordonnées viennent
des **RAM** du SHOM (Licence Ouverte) :

1. **localiser** les 4 mailles entourant le point ;
2. **interpolation complexe** : convertir chaque `(A, g)` en complexe
   `Z = A·e^{i·g}`, pondérer par la distance, moyenner, repasser en `(A, g)`.
   *La phase boucle à 360° ; on ne peut pas moyenner 350° et 10° linéairement
   (≠ 180°). Interpoler partie réelle / imaginaire respecte ce repli.*
   Les mailles « terre » (sans donnée) sont ignorées.
3. répéter pour les 34 constituants → le port porte **34 couples (A, g)**.

Sortie : un fichier `fes-ports-<region>.json` — N ports × 34 couples + le datum
`S` du port (zh_ref, RAM). **Indépendant de la date.**

### 3b. Synthèse (en ligne ou hors-ligne, à tout instant)

Hauteur au-dessus du niveau moyen à l'instant `t` :

```
h(t) = Σ  fᵢ(t) · Aᵢ · cos( Vᵢ(t) + uᵢ(t) − gᵢ )
       i
```

| Terme | Signification | Dépend de |
|---|---|---|
| `Aᵢ` | amplitude (fichier) | **lieu** |
| `gᵢ` | retard de phase de Greenwich (fichier) | **lieu** |
| `Vᵢ(t)` | **argument d'équilibre** — position de la force génératrice du constituant | **temps** (astronomie) |
| `uᵢ(t)` | correction nodale de phase | temps (cycle nodal 18,6 ans) |
| `fᵢ(t)` | facteur nodal d'amplitude | temps (cycle 18,6 ans) |

Les termes astronomiques `V`, `u`, `f` sont **purement éphémérides** : calculés à
partir de la **date seule**, identiques partout sur Terre. C'est la raison pour
laquelle **toute date fonctionne**.

`V` et les corrections nodales dérivent de six **longitudes moyennes
astronomiques** au temps `t` (formules de **Schureman**) :
`s` (Lune), `h` (Soleil), `p` (périgée lunaire), `N` (nœud lunaire ascendant —
pilote `f`,`u` sur 18,6 ans), `p₁` (périgée solaire), `τ` (temps lunaire moyen).
L'argument `V` de chaque constituant est une combinaison entière de ces longitudes
(ses **nombres de Doodson**). `f` et `u` sont fonction de `N`.

Pour la dérivation détaillée : Schureman (1958) et le code de référence **PyFES /
LIBFES** (CNES, licence BSD-3), dont notre synthèse reproduit la formule de Darwin.

---

## 4. Référence verticale (datum) — le lien avec le DEM

FES donne `h(t)` par rapport au **niveau moyen (MSL)** du modèle. La navigation et
le DEM utilisent d'autres zéros :

```
water_ZH(t)    = h(t) + S            S = séparation MSL→ZH issue des RAM (zh_ref)
water_IGN69(t) = water_ZH + zh_ref   pour comparer au fond du DEM (IGN69)
```

Cette étape réutilise le calage RAM déjà présent dans l'extension. Le **DEM**
(altitude du fond en IGN69) et la **hauteur d'eau** prédite sont alors dans le
même référentiel → c'est l'objet de l'évaluation croisée : la cohérence
fond / niveau d'eau peut être contrôlée visuellement (rampe) et au point (sonde).

Pleines / basses mers = extrema de la courbe. Coefficient ≈ déduit du marnage du
jour (indicatif, pas le coefficient officiel SHOM).

---

## 5. Validation — comparaison au SHOM officiel

Le SHOM (prédiction officielle, précision « quelques cm / quelques minutes ») sert
de **vérité terrain**. Méthode : pour chaque port, on synthétise la courbe du jour
et on la compare à la vignette officielle SHOM (alignement des datums par la
moyenne du jour, qui isole l'erreur de forme).

**14 ports bretons, 2026-06-10 (morte-eau), RMS de courbe :**

| Qualité | Ports | RMS | Type de côte |
|---|---|---|---|
| 🟢 **élevée** ≤ 6 cm | Concarneau (4,1), Paimpol (4,1), Port-Tudy (4,3), Douarnenez (5,0), Bénodet (5,0), Roscoff (5,4) | 4–5 cm | côte ouverte, baie, île |
| 🟡 **moyenne** 6–10 cm | Le Guilvinec (6,6), Audierne (7,5), Le Pouliguen (7,9), Saint-Nazaire (8,0), La Trinité (8,2) | 7–8 cm | côte ouverte, estuaire peu profond |
| 🔴 **faible** > 10 cm | Saint-Malo (13,4), Brest (18,5), Port-Navalo (23,2) | 13–23 cm | ria, golfe, fort marnage |

**Concarneau (détail par niveau de marée) :** hauteur ±2 cm (basse mer) à ±5 cm
(pleine mer) ; pleines/basses mers à **±5 min** et **±8 cm**.
**Médiane des 14 ports : 7 cm.**

L'extraction est exacte (M2 extrait 1,4753 m = valeur de grille 147,58 cm).
Toute date confirmée : tests de 2015 à 2099, morte-eau et vive-eau, sans horizon.

---

## 6. Limites connues (à afficher)

- **Pas officiel, pas pour la navigation.** Pour les horaires officiels : SHOM.
- **Résolution de grille (≈ 3,5 km).** Excellente en mer ouverte (~5 cm),
  **dégradée en ria / estuaire / golfe fermé** (Brest, golfe du Morbihan) où
  l'amplification locale n'est pas résolue — **limite intrinsèque du modèle
  global**, partagée par le moteur de référence PyFES.
- **Fort marnage** (Saint-Malo, 5,6 m) : l'erreur relative se traduit par une
  erreur absolue plus grande.
- **Domaine 1700–2100** (au-delà, FES n'est plus validé).
- **Coefficient** indicatif (déduit du marnage), pas le coefficient officiel.
- **Surcote / houle / pression** non incluses (marée astronomique seule).
- **Changement climatique** non pris en compte.

---

## 7. Reproductibilité

Pipeline (hors dépôt sViewer, données FES non redistribuées) :

```
scripts/gen_config.py        # construit fes.yaml depuis data/*_fes2022.nc.xz
scripts/extract.py --bbox …   # ports RAM d'un bbox → constituants (fichier livré)
scripts/predict.py --lat … --lon … --date …   # courbe en un point/date
scripts/validate.py / sweep.py / capture.py    # comparaison au SHOM
```

Re-calcul pour une autre région = relancer `extract.py` avec un autre `--bbox`.
Le moteur de référence est **PyFES** (CNES, BSD-3) ; le moteur navigateur (JS)
reproduit sa formule de Darwin et est validé maille par maille contre lui.

---

## 8. Références

- Lyard, F. et al. *FES2014 global ocean tide atlas: design and performance.*
  Ocean Sci., 17, 615–649, 2021. (+ FES2022, en révision.)
- Schureman, P. *Manual of Harmonic Analysis and Prediction of Tides.* USC&GS
  Special Publication 98, 1958.
- PyFES / aviso-fes (CNES), BSD-3 : https://github.com/CNES/aviso-fes
- SHOM — Références Altimétriques Maritimes (RAM), Licence Ouverte 2.0.
- SHOM — prédictions officielles : https://maree.shom.fr
