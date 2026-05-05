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

## Two Test Types

Every test declares `type: 'visual'` or `type: 'unit'`. Runner handles execution mechanics.

### `visual` — iframe + postMessage

For tests where seeing the map matters (params, rendering, didactic demos).

```
runner sets iframe.src with URL params
→ sViewer loads, map renders visibly
→ sViewer emits postMessage({type:'sv:ready', hardConfig:{...}})
→ runner receives, runs assertions, shows pass/fail
→ map stays visible in right panel
```

sViewer change required: one line at end of `init()`:
```javascript
if (window.parent !== window) {
    window.parent.postMessage({ type: 'sv:ready', hardConfig: window.hardConfig }, '*');
}
```

### `unit` — same-window + embed.js + onReady

For tests of JS API, config merge logic, i18n — no map needed, instant.

```
runner sets window.customConfig
→ calls SViewer.init()
→ waits for SViewer.onReady()
→ asserts on window.hardConfig or SViewer API
→ pass/fail shown inline
```

sViewer change required: `SViewer.onReady(fn)` hook (~5 lines in `sviewer.js`).

## Architecture

```
tests/
  index.html              — runner UI + suite manifest (two tabs: Visual / Unit)
  runner.js               — runVisual(), runUnit(), assert(), renderResults()
  suites/
    01-params.js          — visual: URL KVP params (?x= ?y= ?z= ?c= ?layers= ?lang= ?lb=)
    02-config-merge.js    — unit: hardConfig/customConfig merge order
    03-i18n.js            — unit: key coverage, all 4 languages
    04-wms-services.js    — visual: live WMS GetCapabilities (geobretagne.fr + others)
```

No fixtures directory needed — unit tests set `window.customConfig` inline.

## Test Object Shape

```javascript
SV_TESTS.push({
    id: 'unique-id',
    label: 'Human readable description',
    group: 'Params',         // 'Params' | 'Config' | 'i18n' | 'Live'
    type: 'visual',          // 'visual' | 'unit'

    // visual only: URL params to load sViewer with
    params: { x: 350000, y: 6200000, z: 10, c: 'test' },

    // unit only: config to set before init
    config: { title: 'Test Title', lang: 'en' },

    // both: assertions on received/available state
    assert: function(hardConfig) {
        if (hardConfig.title !== 'Test Title') throw new Error('got: ' + hardConfig.title);
    }
});
```

## Adding a Test (no JS expertise needed)

**Add a WMS endpoint test** — copy an object in `suites/04-wms-services.js`, change `id`, `label`, and the URL in `params`. Nothing else.

**Add a param test** — copy an object in `suites/01-params.js`, change `params` and the assertion condition.

## What is Tested

### URL KVP params (visual)
- `?x=` `?y=` `?z=` — map centered at correct coords
- `?c=name` — named profile loaded, hardConfig reflects it
- `?c=../etc/passwd` — path traversal blocked, default config used
- `?lang=en/fr/es/de` — correct language applied
- `?lb=N` — background layer index applied
- `?layers=URL|NAME` — layer loaded

### Config merge (unit)
- `customConfig` key overrides `hardConfig` default
- Missing `customConfig` key → `hardConfig` default present
- `hardConfig` complete (no undefined required keys)

### i18n (unit)
- All keys defined in all 4 languages (fr, en, es, de)
- No key returns `undefined`

### Live WMS services (visual)
- `GetCapabilities` returns HTTP 200 + valid XML
- Response includes `WMS_Capabilities` root element
- Latency recorded

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│ sViewer Test Suite              [Run all] [Visual|Unit]│
├──────────────┬──────────────────────────────────────┤
│ ✓ Param ?x=  │                                      │
│ ✓ Param ?c=  │     [ iframe — live map here ]       │
│ ✗ Lang ?en   │       (visual tests only)            │
│ … 12 tests   │                                      │
└──────────────┴──────────────────────────────────────┘
```

Click test in left panel → iframe reloads (visual) or inline result (unit).

## sViewer Changes Required (minimal)

| Change | File | Size | Risk |
|---|---|---|---|
| `postMessage` on init | `sviewer.js` | 3 lines | none |
| `SViewer.onReady(fn)` | `sviewer.js` | ~5 lines | none |

Both additions useful outside tests (parent-iframe integration, embed caller timing).

## CI Integration (future)

```bash
# Playwright one-shot, no install in repo
npx playwright test --config tests/playwright.config.js
```

Runs only non-`Live` groups. Live tests are manual only.
