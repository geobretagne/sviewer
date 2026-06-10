# Tide extension — build plan

> **Historical build record.** For what actually shipped, see `SPEC.md`; for the
> current tide model see `MODEL.md`. Changes vs this plan:
> - **Tide source (M6)** = first Open-Meteo Marine (free, keyless, CORS-direct,
>   calibrated to RAM) instead of a paid SHOM-SPM proxy. Then **tide 1.1 replaced
>   Open-Meteo with a local FES2022 harmonic model** — computed in-browser, **any
>   date** (no forecast horizon), **offline**, with a **per-port quality indicator**
>   (height + time) measured against SHOM. The proxy was never needed; the weather
>   model's horizon + timing error drove the second switch. See `MODEL.md`.
> - **Bathymetry** = `shom:bathy_5m` (sea floor) — **NOT** terrestrial Litto3D.
>   Litto3D only covers land above lowest tide (open sea = nodata) and overlapped
>   the intertidal band; one bathymetry layer = no overlap, no land taint.
> - **Added after 1.0**: Carte tab (offline PMTiles basemap + overlay toggles),
>   `tide_open=` auto-activate, sailboat toolbar icon.
>
> The milestone structure, datum physics, and "fixture first, swap behind a
> stable JSON contract" strategy all held.

Show predicted water extent on map for a chosen date/time, near one port.
Datum-correct (RAM `zh_ref`), tide curve as the control (uPlot), sea painted
server-side by GeoServer SLD.

See `INVESTIGATION.md` for the why. Summary of the settled physics:

```
S          = zh_ref (RAM, port, IGN69)        // datum separation, ≈ const over AOI
water_IGN69 = tide_ZH(t) + S
submerged   ⟺  seafloor_IGN69 < water_IGN69    // painted by GeoServer SLD break
```
Measured: ΔS = 1 cm over 5 km ≪ Litto3D 10 cm precision → flat-S honest at 4 nm.

ext id = **`tide`**. Params namespaced `tide_*`. uPlot reused from sensors.

---

## Principles for the increments

- Each milestone **runs and is testable on its own**, ideally visible on screen.
- Hard/paid/unknown pieces faked first (fixtures), swapped for real later.
- The paid SHOM call is isolated behind a proxy contract → everything upstream
  testable with a static JSON before the key exists.
- No `couche`. WCAG on every UI step. No key in URL/browser.

---

## M0 — Skeleton (toolbar button + zoom gate)

**Goal:** button appears; enabled only when zoomed past scale limit; click opens
empty bottom dock.

- `ext/tide/manifest.json` (copy sensors shape; id `tide`, param stubs).
- `extension.js`: `onMapReady`, inject toolbar button (inline SVG icon — water/wave).
- Zoom gate: on `moveend`, enable/disable button by `view.getZoom()` vs
  `tide_minzoom` (default ~13). Disabled → tooltip "zoomez sur un port".
- Click → `SViewer.panel.open({ dock })` empty, title "Marée".
- i18n keys (fr/en/es/de): button title, panel title, zoom hint.

**Test:** load `?ext=tide`, zoom out → button greyed; zoom in → enabled; click →
empty dock opens/closes. No data yet.

**Increment value:** proves lifecycle, gate, dock, i18n. Zero external deps.

---

## M1 — Nearest port from RAM (open WFS, real)

**Goal:** on tool open, find nearest RAM port to map center, show its name + `S`.

- Fetch RAM WFS GeoJSON once (bbox around map center, EPSG:3857):
  `…/INSPIRE/wfs?…typeNames=RAM_BDD_WLD_WGS84G_WFS:ram_3857&outputFormat=application/json&bbox=…`
- Pick min-distance feature with non-null `zh_ref`. Keep `site`, `zh_ref` (=S),
  `phma`, `pmve`, `nm`, coords.
- Cache in localStorage keyed by rounded bbox (offline-friendly, like field schema).
- Render in dock: "Port : Saint-Quay-Portrieux — ZH à −5.908 m / IGN69".
- Guard: no port in range → friendlyError "aucun port à proximité".
- Validate every numeric (untrusted input).

**Test:** zoom to Saint-Quay area → dock shows correct port + −5.908. Move map →
nearest port updates. Airplane mode after first load → cached port still shows.

**Increment value:** the hard datum half DONE and visible, with zero paid deps.

---

## M2 — Tide curve from a FIXTURE (uPlot dock, no key)

**Goal:** draw the tide curve + PM/BM marks + coef, from a static JSON fixture.
No SHOM yet.

- `ext/tide/fixtures/tide-sqp-2026-06-06.json` — one day, 10-min step, hand-made
  or shape-realistic: `[{t, h_ZH}], highs:[{t,h,coef}], lows:[{t,h}]`.
- Load uplot.min.js/.css (copy from sensors).
- Render curve h_ZH(t) in dock. Annotate PM/BM. Show coef label.
- Dual y-read helper ready (ZH and IGN69 = h_ZH + S), not wired to cursor yet.
- Date shown in title; nav buttons present but inert (single fixture).

**Test:** open tool over SQP → see a real-looking tide curve, two PM two BM
marked, coef shown. Pure client, no network for the curve.

**Increment value:** the whole visual centerpiece working, demoable, **before
buying the SHOM key**. De-risks UI entirely.

---

## M3 — Cursor on curve → dual readout (no map yet)

**Goal:** draggable vertical cursor on uPlot; default = now; reads (t, h_ZH) and
computes water_IGN69.

- uPlot cursor → snap to nearest 10-min sample.
- Readout under graph:
  `14:30 — 9.2 m / ZH — 3.3 m / IGN69` (live, aria-live polite).
- Default cursor position = current time (clamp into fixture's day).
- Keyboard: left/right arrows move cursor one step (WCAG — not mouse-only).

**Test:** drag cursor / arrow keys → readout updates, both datums, snaps to 10 min,
opens at "now". Still no map overlay.

**Increment value:** the control surface complete + accessible. `water_IGN69`
scalar now produced live — the exact input the map step needs.

---

## M4 — Sea overlay via SLD, FLAT manual level (no curve coupling)

**Goal:** prove the GeoServer SLD-threshold trick with a hardcoded level, before
wiring it to the cursor.

- Build a WMS overlay layer on the Litto3D GeoServer, dynamic SLD with one
  colormap break at a literal `water_IGN69` (e.g. 3.0 m). Semi-transparent blue
  above break, transparent below.
  - Inject via `SLD_BODY` or `ENV` param (decide per GeoServer config; M4 spike).
- Add/remove this OL layer on tool enable/disable (manual layer cleanup — no
  onDisable hook).
- Temporary debug slider 0–6 m → re-issue GetMap. (Throwaway, replaced in M5.)

**Test:** move debug slider → blue sea grows/shrinks on the real Litto3D.
Confirms SLD break works, opacity right, layer cleanup right.

**Increment value:** the only genuinely new/unknown tech (server-side SLD
threshold) proven in isolation. **Unknowns #5 from investigation resolved here.**

---

## M5 — Couple cursor → map (fixture end-to-end)

**Goal:** scrub the tide cursor → sea updates on map. Full UX, still fixture
tide.

- Replace debug slider with the M3 cursor's `water_IGN69` output.
- Debounce GetMap (~150 ms) / snap to 10-min so it's cacheable.
- Sea reflects cursor; opening at "now" shows current predicted sea.
- Reuse core `opacity` if it cleanly applies to the overlay; else ext-local.

**Test:** drag cursor along curve → watch tide sea advance/retreat on Litto3D
in sync. Whole feature *feels* done — running on free data + one fixture.

**Increment value:** complete demoable feature, no paid dep yet. This is the
screenshot/video for the geOrchestra talk if needed.

---

## M6 — Real SHOM tide via proxy (the paid piece, last)

**Goal:** swap the fixture for live SHOM predictions through a server proxy.

- **Proxy contract** (server-side, holds key; same infra as other proxied svc):
  ```
  GET /tide?port=<id|name>&date=YYYY-MM-DD&step=10
  → 200 { port, date, step, points:[{t,h_ZH}], highs:[…], lows:[…], source:"SHOM SPM" }
  ```
  Proxy: validates params, calls SHOM SPM/SAPM with key, maps XML→our JSON,
  caches by (port,date) (predictions are deterministic → cache hard/long).
  **Key never leaves server. No key in URL/log.** CORS handled by proxy.
- Client: replace fixture load with `fetch('/tide?…')`, same shape → M2–M5
  untouched.
- Date nav buttons now live (prev/next day → new proxy call, cached).
- Cache last-fetched day in localStorage (offline graceful, like M1).
- Label everywhere: **"marée prédite"** — not real level (surge/pressure ignored).

**Test:** real port + real day → curve matches SHOM annuaire; date nav works;
sea driven by real predictions. Second load of same day = cache hit, offline OK.

**Increment value:** feature complete on real data. All risk already retired by
M0–M5; this milestone is a data-source swap behind a stable JSON contract.

---

## M7 — Polish + deep-link + ship

**Goal:** shareable URL, a11y pass, docs, release.

- URL params (permanent, `tide_*`):
  - `tide_port` — preselect port (skip nearest-search), deep-link.
  - `tide_t` — preselect datetime → cursor + sea on load (shareable "this
    moment underwater"). Honors "URL = persistence".
  - `tide_minzoom` — scale-gate override (default 13).
  - all validated; document in manifest `params` + `examples`.
- a11y: dock focus order, cursor keyboard, contrast on sea tint + curve,
  announce readout, button title. WCAG 2.1 AA pass.
- `ext/tide/SPEC.md`, manifest `seo`/`examples`, screenshot.
- i18n 100% (fr/en/es/de). No `couche` anywhere.
- CHANGELOG; version bump; minify.

**Test:** share a `?ext=tide&tide_port=…&tide_t=…` link → opens at that sea
state. Keyboard-only run-through. Embedded mode sanity (proxy reachable).

**Increment value:** shippable, shareable, documented, accessible.

---

## Dependency / risk order (why this sequence)

| M | New risk retired | Paid dep? | External dep |
|---|---|---|---|
| M0 | lifecycle/gate/dock | no | none |
| M1 | datum (the hard physics) | no | RAM WFS (open) |
| M2 | uPlot curve render | no | none (fixture) |
| M3 | cursor + a11y + scalar | no | none |
| M4 | **SLD threshold (unknown tech)** | no | Litto3D GeoServer |
| M5 | cursor→map coupling | no | Litto3D |
| M6 | SHOM swap behind contract | **yes** | SHOM + proxy |
| M7 | share/a11y/docs | — | — |

Paid SHOM key needed **only at M6**. Everything visible/demoable by M5 on free
data. Hardest unknown (M4 SLD) isolated and faked-around until proven. Datum
(M1) done early since it's the conceptual core.

## Open questions to settle (cheap, before M6)

1. Litto3D GeoServer: dynamic SLD enabled? `SLD_BODY` vs `ENV` styling? pixel =
   IGN69 altitude? (spike in M4)
2. SHOM SPM vs SAPM purchase — per-port (SPM) enough since single-port? quota?
3. Curve window: one calendar day (matches annuaire) — confirm.
4. Proxy host: where does `/tide` live (same nginx as sViewer, or the geOrchestra
   proxy already in play)?
