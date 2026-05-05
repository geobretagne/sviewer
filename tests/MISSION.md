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

## Architecture

```
tests/
  index.html              — runner UI + suite manifest
  runner.js               — core: assert(), runAll(), renderResults()
  suites/
    01-params.js          — URL KVP params (?x= ?y= ?z= ?c= ?layers= ?lang= ?lb= etc.)
    02-config-merge.js    — hardConfig/customConfig merge order
    03-i18n.js            — key coverage, all 4 languages
    04-wms-services.js    — live WMS GetCapabilities (geobretagne.fr + others)
  fixtures/
    customConfig_test.js  — stable named profile for ?c=test
```

## Test Object Shape

```javascript
SV_TESTS.push({
    id: 'unique-id',
    label: 'Human readable description',
    group: 'Params',        // 'Params' | 'Config' | 'i18n' | 'Live'
    run: function() {
        // return a Promise that resolves to a string (ok detail)
        // or rejects with an Error (failure message)
    }
});
```

## Adding a Test (no JS expertise needed)

To add a WMS endpoint test, copy an existing object in `suites/04-wms-services.js`,
change `id`, `label`, and the URL. Nothing else.

## What is Tested

### URL KVP params
- `?x=` `?y=` `?z=` — map center + zoom applied
- `?c=name` — named profile loaded
- `?c=../etc/passwd` — path traversal blocked, default config used
- `?lang=en/fr/es/de` — correct language applied
- `?lb=N` — background layer index applied
- `?layers=URL|NAME` — layer loaded

### Config merge
- `customConfig` key overrides `hardConfig` default
- Missing `customConfig` key → `hardConfig` default present
- `hardConfig` complete (no undefined required keys)

### i18n
- All keys defined in all 4 languages (fr, en, es, de)
- No key returns `undefined`

### Live WMS services
- `GetCapabilities` returns HTTP 200 + valid XML
- Response includes `WMS_Capabilities` root element
- Latency recorded

## CI Integration (future)

```bash
# Playwright one-shot, no install in repo
npx playwright test --config tests/playwright.config.js
```

Runs only non-`Live` groups. Live tests are manual only.
