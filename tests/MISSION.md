# sViewer Test Suite — Mission

## Goal

Browser-based test runner doubling as live demo. No build tooling, no framework, no install.

## Design Principles

- Tests run in the browser at `/sviewer/tests/`
- Each test = one JS object pushed to `SV_TESTS[]` in a suite file
- `runner.js` handles execution, timing, pass/fail rendering — never modified by test authors
- `index.html` loads `runner.js` + all suite files from a manifest
- `?autorun=1` runs all suites headlessly — CI-friendly
- Live WMS tests use real endpoints — marked `group: 'Live'`, skipped in CI

## Test Type

All tests are **visual**: sViewer loads in an iframe, the map renders, `sv:ready` postMessage
carries `hardConfig` back to the runner for assertions.

```
runner sets iframe.src with URL params
→ sViewer loads, map renders visibly
→ sViewer emits postMessage({type:'sv:ready', hardConfig:{...}})
→ runner receives, runs assert(hardConfig), shows pass/fail + timing
→ map stays visible in right panel
```

Config-merge and i18n tests use `?c=test` to load `local/customConfig_test.js` (fixed known
values) or `?lang=XX` — no same-window reinit needed.

## Architecture

```
tests/
  index.html              — runner UI (left panel + iframe)
  runner.js               — runVisual(), renderResult(), renderRunning()
  ui.js                   — panel DOM, click handlers, run-all/run-group, ?autorun=1
  MISSION.md              — this file
  suites/
    01-params.js          — visual: URL KVP params (?x= ?y= ?z= ?c= ?lang= ?lb= ?layers=)
    02-config-merge.js    — visual: hardConfig/customConfig merge via ?c=test
    03-i18n.js            — visual: key coverage, all 4 languages
    04-wms-services.js    — visual: live WMS endpoints (geobretagne.fr, IGN GPF)

local/
  customConfig_test.js    — fixed test profile (title, initialExtent, maxFeatures)
```

## Test Object Shape

```javascript
SV_TESTS.push({
    id: 'unique-id',
    label: 'Human readable description',
    group: 'Params',         // 'Params' | 'Config' | 'i18n' | 'Live'
    type: 'visual',

    // URL params to load sViewer with
    params: { x: 350000, y: 6200000, z: 10, c: 'test' },

    // assertions on hardConfig received via sv:ready postMessage
    // may return a Promise (for fetch-based checks)
    assert: function(hardConfig) {
        if (hardConfig.title !== 'sViewer Test Profile') throw new Error('got: ' + hardConfig.title);
    }
});
```

## Adding a Test (no JS expertise needed)

**Add a WMS endpoint test** — copy an object in `suites/04-wms-services.js`, change `id`,
`label`, and the `makeWmsTest(...)` arguments. Nothing else.

**Add a param test** — copy an object in `suites/01-params.js`, change `params` and the
assertion condition.

**Add a config test** — copy an object in `suites/02-config-merge.js`. Use `params: { c: 'test' }`
to load the test profile, or `params: {}` to test defaults.

## What is Tested

### URL KVP params (visual, suite 01)
- `?x=` `?y=` `?z=` — map centered at correct coords
- `?c=name` — named profile loaded, hardConfig reflects it
- `?c=../etc/passwd` — path traversal blocked, default config used
- `?lang=en/fr/es/de` — correct language applied
- `?lb=N` — background layer index applied

### Config merge (visual, suite 02)
- Default title, projcode, backgroundPresets present with no customConfig
- `?c=test` overrides title, initialExtent, maxFeatures
- Missing customConfig key → hardConfig default present

### i18n (visual, suite 03)
- All required keys defined in all 4 languages (fr, en, es, de)
- Exactly 4 languages, identical key sets across all

### Live WMS services (visual, suite 04)
- Layer renders in iframe via `layerName@wmsUrl` format
- `GetCapabilities` returns HTTP 200 + valid XML
- Endpoints: GeoBretagne CI, IGN Géoportail

## sViewer Changes

| Change | File | Purpose |
|---|---|---|
| `postMessage` on init | `sviewer.js` | Sends serializable `hardConfig` to parent frame |
| `SViewer.onReady(fn)` | `sviewer.js` | Hook for embed callers |
| `layername@url` no-namespace fix | `sviewer.js` | Alien WMS without geOrchestra namespace |

## CI Integration (future)

```bash
npx playwright test --config tests/playwright.config.js
```

Runs only non-`Live` groups (`?autorun=1` skips Live by convention — implement filter in CI config).
