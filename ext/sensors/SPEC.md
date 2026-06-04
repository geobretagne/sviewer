# Capteurs (SensorThings) — spec

Affiche un service OGC SensorThings (STA) dans sViewer : les stations sur la
carte, et au clic, leurs mesures sous forme de graphique temporel. Équivalent du
comportement mviewer, en restant minimaliste.

Service de référence : `https://frost.geosas.fr/station_meteo_hydro_agro/v1.1/`

## Portée v1 (scope B — un graphique à la fois)

1. **Config** — `?ext=sensors&sta=<URL service>` OU collage de l'URL dans le panneau.
2. **Stations** — `GET {sta}/Locations` → géométrie ajoutée en couche vectorielle
   propre (indépendante de `?geojson=`), avec `@iot.id`+`name`. **Deux formes de
   `location` acceptées** (la non-standard est majoritaire) :
   - standard : `{ geometry: { type:'Point', coordinates:[...] } }` (Feature) ;
   - non-standard : `{ type:'Point', coordinates:[...] }` (géométrie en ligne).
   `pointGeom()` déballe l'une ou l'autre.
3. **Clic station** → `GET {sta}/Locations(id)/Things?$select=...&$expand=Datastreams($select=name,description,id,unitOfMeasurement)`
   → panneau : nom station + **liste des mesures** (nom + unité + **dernière
   valeur**, ex. « Température — 14.2 °C »).
4. **Graphique** — au clic station, charge d'office la **1re mesure** (défaut
   mviewer) ; taper une autre mesure échange le graphique.
   `GET {sta}/Datastreams(id)/Observations?$top=2000&$select=result,phenomenonTime&$orderby=phenomenonTime desc`
   → graphique **uPlot** (MIT, ~50 Ko, vendored `ext/sensors/uplot.min.{js,css}`,
   **lazy au premier graphique**) : ligne + axes temps/valeur + unité, **survol
   (date+valeur)** et **zoom par glissement sur un intervalle de temps**
   (double-clic = réinitialiser). uPlot gère les milliers de points → pas de
   décimation, le zoom révèle le détail.

## Vocabulaire (zéro jargon)

- panneau = **« Capteurs »** ; Datastream = **« mesure »** ; jamais
  « datastream / chronique / flux ».

## Plafonds (mission « petits jeux, rapide »)

- Observations : par défaut une page (`$top=1000`, plafond 2000, plus récentes).
  Trois niveaux de contrôle de la profondeur :
  - **bouton « Charger plus »** sous le graphique (s'affiche s'il reste des pages)
    — pagination **depuis l'UI**, pas seulement l'URL. Relève le plafond pour
    **la session courante** (s'applique aux mesures/stations suivantes tant que la
    page est ouverte — l'utilisateur examine la même période partout) de +4000.
    **Non persisté** : un rechargement repart du défaut/URL (rapide), donc un
    plafond profond ne peut jamais devenir un piège permanent.
  - **`?sta_pagination`** (admin/partage) : plafond initial — nombre, ou
    `1`/`true`/`all` = maximal.
  - **HARD_MAX 200000** : garde-fou absolu.
  uPlot encaisse les milliers de points (canvas).
- Pas de « dernière valeur » par mesure : un relevé sans horodatage n'est pas
  interprétable, et un fetch par capteur ralentit l'ouverture. Les chips
  affichent nom + unité ; les valeurs (horodatées) sont dans le graphique.
  fetch parallèle ; si une station a beaucoup de mesures, lazy au besoin).
- `/Locations` : 1re page ; suivre `@iot.nextLink` jusqu'à un plafond
  (ex. 500 stations) puis stop avec message. Ce service = 3 stations.

## Sécurité

- `sta` = **entrée non fiable** : valider scheme http(s) uniquement (rejeter
  javascript:, data:…), URL bien formée. C'est une **cible de lecture** (fetch),
  pas d'écriture — risque moindre que field, mais valider quand même.
- CORS : le service STA doit l'autoriser (règle OGC). frost.geosas.fr : **vérifié
  OK** (fetch navigateur réussi).
- Toute sortie HTML échappée (`esc()`), noms/descriptions = texte.

## États limites

- station sans mesure → « aucune mesure ».
- mesure sans observation → « aucune donnée ».
- URL invalide / injoignable / non-STA → message clair.

## Réutilisation (rien de neuf fondamentalement)

- clic feature → détail panneau → `ext/panoramax`, `ext/annotation`.
- config par collage d'URL → `ext/field`.
- chargement paresseux d'une lib → `ext/me` (jsQR), `ext/print` (qr-creator).
- graphique = **uPlot** (MIT, GPLv3-compatible, vendored, pas de CDN). Highcharts
  **rejeté** (propriétaire, non-GPL, payant secteur public — viole les règles).

## Hors périmètre v1 (→ éventuel scope C)

Multi-séries superposées, sélecteur de plage temporelle, rafraîchissement live,
comparaison. Dérive vers mviewer/Grafana — exclu du minimalisme.

## Découpage

1. Locations → carte + config (`?sta=` + collage).
2. Clic → liste mesures + dernière valeur.
3. Graphique SVG d'une mesure + survol.
