# Tide extension — investigation

> **Historical feasibility note.** Written before the build. The core insight —
> two vertical datums, RAM gives the separation — held. Two providers changed by
> the time it shipped (see `SPEC.md`): the tide source is **Open-Meteo Marine**
> (free/keyless/CORS, calibrated to RAM), not a SHOM-SPM proxy; the elevation
> source is **`shom:bathy_5m`** (sea floor), not terrestrial Litto3D. The
> "do the threshold server-side in an SLD" strategy is exactly what shipped.

Show map water extent for a date/time, by combining bathymetry (WMS) with tide
predictions. Status: **investigation only — feasibility + unknowns, no code.**

## 1. The goal

User picks a date/time → map shows which terrain is underwater at that instant.
The waterline = contour where the sea-floor altitude == sea level. This is a SEA-extent tool, NOT a flood/inondation forecast.

## 2. The core problem — two different vertical zeros

Both inputs are heights in metres, but measured from **different reference
surfaces**. You cannot subtract them directly.

| Source | Quantity | Zero reference (datum) |
|---|---|---|
| Litto3D (WMS) | terrain altitude | **NGF-IGN69** (legal land levelling, ~mean sea level) |
| SHOM tide | water height | **Zéro Hydrographique (ZH)** = chart datum, near LAT (lowest astronomical tide) |

To compare them, convert one into the other's datum using the **separation**:

```
S(x,y) = altitude(ZH) − altitude(IGN69)      // metres, varies along coast
water_level_IGN69 = tide_ZH + S(x,y)
submerged(x,y) ⟺ seafloor_IGN69(x,y) < water_level_IGN69(x,y)
```

`S` is NOT constant. Brittany: roughly 3–6 m, changing along the coast. Getting
`S` right is the whole feature. Everything else is plumbing.

## 3. Datum separation — three sources (decreasing convenience, increasing rigour)

### a) RAM — Références Altimétriques Maritimes  ← **start here**
- SHOM open data, **Licence Ouverte 2.0** (no key needed).
- Gives cote du ZH in IGN69 **per reference port** (point values).
- Access: **WFS** (GeoJSON/CSV/Shapefile), WMS, or 7z shapefile download.
  - WFS GetCapabilities: `https://services.data.shom.fr/INSPIRE/wfs?service=WFS&request=GetCapabilities&version=2.0.0`
  - Layer: `RAM_BDD_WLD_WGS84G_WFS:ram_3857`, outputs GML3.2 / **GeoJSON** / CSV / KML
- **Limit:** point per port, valid only within **~5 km radius** of the port
  (SHOM's own rule). Between ports = interpolate, with error growing.
- **Good enough for v1** if the area of interest sits near one port.

### b) BathyElli surfaces v2.1 — the rigorous surface
- SHOM open data, **Licence Etalab 2.0**. Surface (grid) of ZH and CD as
  **ellipsoidal heights (GRS80)** over all metropolitan France.
- This is what would give per-pixel `S` instead of per-port.
- **BLOCKER:** served only as **WMTS PNG tiles** (`BATHYELLI_ZH_PYR_PNG_3857_WMTS`),
  EPSG:3857. **No WCS, no numeric grid via web service.** A browser gets coloured
  pixels, not metres. Can't read `S` numerically client-side from the live
  service.
  - Workaround A: download the BathyElli grid file from data.shom.fr portal once,
    self-host as our own data (e.g. small GeoTIFF/JSON for the AOI). Need to
    confirm a downloadable numeric grid (GeoTIFF) exists — metadata record:
    `https://services.data.shom.fr/geonetwork/srv/api/records/BATHYELLI_2_1.xml`
  - Workaround B: skip BathyElli, use RAM point + interpolation (option a).
- Also needs RAF20/RAF09 (IGN geoid grid) to go ellipsoid→IGN69 if we work in
  ellipsoidal heights. Adds a step.

### c) CRV — Changement de Référence Verticale (SHOM service)
- Does exactly the conversion (ZH↔IGN69) as a service.
- **BLOCKER for us: subscription key required (paid).** Same boutique as SAPM.
- Rejected on cost + the no-secret-in-URL rule unless server-proxied.

**Recommendation:** v1 = RAM (a), single AOI near a reference port, treat `S` as
locally constant or linearly interpolated between nearby ports. Document the
±error. v2 = self-hosted BathyElli grid for per-pixel `S` if accuracy demands it.

## 4. SHOM tide prediction API

- Services: **SPM** (per-port) and **SAPM** (any point — includes SPM).
- **Subscription key required (paid), per the boutique.** Not open.
- Heights counted **positive above ZH**. Positions WGS84. ← matches RAM's datum, good.
- Capabilities: high/low water + coef; **water height at fixed step** (5/10/15/30/60 min)
  — this is the call we want; threshold search.
- Range 1700–2100, max 20 yr per call. Formats TXT, XML.
- Docs: `https://services.data.shom.fr/support/en/services/spm`,
  notice PDF `https://services.data.shom.fr/static/specifications/notice_marees_a_la_carte.pdf`

**Constraint clash with sViewer rules:**
- Key must NEVER be in URL or client JS (token-in-URL = exfil class, our rule).
- → SHOM tide call MUST go through a **server-side proxy** (same pattern as the
  geOrchestra/cadastre proxy already discussed). The browser calls our proxy;
  proxy holds the key; proxy calls SHOM. This also fixes CORS (unknown if SHOM
  sends CORS headers — assume not).
- For a given AOI + date/time, the tide value is essentially **one scalar per
  port** (water height at that instant). Tiny payload. Proxy can cache.

## 5. Litto3D via WMS + dynamic SLD

- GeoServer WMS → dynamic SLD via URL param → custom colormap. Confirmed by user.
- **BUT** WMS returns a *coloured image*, not altitude numbers. To compute the
  waterline client-side we'd need terrain *values*, not a picture.
- Options:
  - **A — server renders the sea (recommended).** Push the whole comparison
    into a GeoServer SLD: a colormap/rule on the Litto3D coverage that paints
    "below water_level" one way, "above" another. `water_level_IGN69` is a single
    number we inject into the SLD per request (it's constant-ish over a small
    AOI). Browser just sends a WMS GetMap with our SLD; GeoServer does the
    threshold. **No terrain numbers ever reach the browser.** Cleanest, fastest,
    fits "minimalist viewer, small datasets."
    - The waterline for a flat water level = a single colormap break at
      `water_level_IGN69`. Trivial SLD: ColorMap with two entries either side of
      the threshold.
    - If `S` varies across the AOI, the threshold isn't flat → can't do it with
      one scalar break. Then need either per-tile water level or the BathyElli
      surface baked in. v1 assumes flat `S` over the AOI (valid near one port).
  - **B — client reads values** via WMS GetFeatureInfo or a WCS coverage, then
    contours in JS. Heavy, slow, many requests, fights the "small/fast" mission.
    Rejected for v1.

## 6. Proposed v1 architecture (minimal, fits sViewer rules)

```
[browser ext: tide]
   1. user picks date/time (+ AOI implicit from map view / nearest port)
   2. → OUR proxy /tide?port=BREST&t=2026-06-06T14:30   (no key in browser)
        proxy → SHOM SAPM/SPM (key server-side) → returns tide_ZH scalar
   3. browser: water_level_IGN69 = tide_ZH + S_port   (S_port from RAM, fetched
      once via open WFS, cached; flat over AOI)
   4. browser: WMS GetMap to Litto3D GeoServer with a dynamic SLD whose colormap
      break = water_level_IGN69  → GeoServer paints submerged vs exposed
   5. overlay that WMS layer on the map; a time slider re-runs 2–4
```

Pieces:
- **proxy** (server) — holds SHOM key, 1 endpoint, caches by (port, rounded time).
  Same proxy infra as other paid/CORS services. ~tiny.
- **RAM fetch** (browser) — open WFS GeoJSON, pick nearest port's ZH/IGN69
  separation, cache in localStorage.
- **SLD template** (browser builds, or proxy/GeoServer stores) — one numeric
  break injected per request.
- **ext UI** — date/time picker + play/slider; reuse sensors' bottom-dock /
  slider patterns. WCAG: slider keyboard-operable, value announced.

## 7. Hard unknowns — investigate before building

1. **Does SHOM expose CORS?** If not (likely), proxy is mandatory — already
   assumed. Confirm.
2. **SHOM key cost + licence** for SAPM/SPM. Per-call quota? Affects caching
   strategy. (Boutique purchase — get exact terms.)
3. **Is there a downloadable numeric BathyElli grid (GeoTIFF)?** Decides whether
   v2 per-pixel `S` is possible without the paid CRV. Check the geonetwork record.
4. **How flat is `S` over the target AOI?** Pull 2–3 nearby RAM ports, measure
   spread. If <~0.2 m over the AOI → flat-`S` v1 is honest. If metres → need
   surface from day 1.
5. **Litto3D coverage band/units in GeoServer** — confirm the raster carries
   IGN69 altitude as pixel value (not already chart datum), and that dynamic SLD
   on that coverage is enabled (`ENV`/SLD_BODY). The whole flat-threshold trick
   depends on injecting the break into the coverage colormap.
6. **Time semantics** — SHOM predictions are astronomical; real water differs
   (surge, atmospheric pressure, river). Label output "marée prédite", not
   "niveau réel". Avoids a safety-grade misread (this is not a flood-risk tool).
7. **No "couche" in docs.** Refer to "donnée WMS Litto3D", "donnée bathymétrique".

## 8. Feasibility verdict

**Feasible for v1**, near a single reference port, flat-`S`, with a server proxy
for the SHOM key. The clever move = **do the threshold in GeoServer via SLD** so
no terrain values hit the browser and load stays tiny. Accuracy is bounded by
flat-`S` (good near a port, degrades between ports) and by prediction-vs-reality.

**Not feasible client-only** if you want rigorous per-pixel `S` across a wide
area without either (a) paying for CRV, or (b) self-hosting the BathyElli grid.

**Biggest risk = scope creep into a flood-risk tool.** Keep it "predicted tide
visualisation", explicitly not safety-grade.

## 9. Sources

- API SHOM overview — https://diffusion.shom.fr/services-numeriques/api-shom.html
- SPM/SAPM support — https://services.data.shom.fr/support/en/services/spm
- Marées en tout point — https://diffusion.shom.fr/marees/calcul-avance/maree-en-tout-point.html
- RAM dataset (open) — https://www.data.gouv.fr/datasets/references-altimetriques-maritimes
- RAM WFS — https://services.data.shom.fr/INSPIRE/wfs?service=WFS&request=GetCapabilities&version=2.0.0
- CRV (paid) support — https://services.data.shom.fr/support/en/services/crv
- CRV notice — https://services.data.shom.fr/static/help/fr/Notice_CRV.pdf
- BathyElli v2.1 metadata — https://services.data.shom.fr/geonetwork/srv/api/records/BATHYELLI_2_1.xml
- Référentiels verticaux (SHOM, fév. 2024) — https://refmar.shom.fr/sites/default/files/fiches_data/GT_TSH_Fiche_referentiels_verticaux_Version_fevrier2024.pdf
