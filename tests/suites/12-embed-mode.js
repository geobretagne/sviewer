/* Suite 12 — Embed mode regression
 * Loads sViewer via embed.js in embed-host.html instead of index.html.
 * Guards the separate DOM-creation path in embed.js against regressions.
 */

var _embedBase = SVRunner.getBaseUrl() + 'tests/embed-host.html';

function embedUrl(params) {
    var pairs = Object.keys(params || {}).map(function(k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    });
    return _embedBase + (pairs.length ? '?' + pairs.join('&') : '');
}

// Override SVRunner.run once — routes embed tests (those with _embedSrc) to
// embed-host.html instead of index.html. Non-embed tests pass through unchanged.
(function() {
    var _origRun = SVRunner.run;
    SVRunner.run = function(test) {
        if (!test._embedSrc) { return _origRun(test); }

        var start = Date.now();
        return new Promise(function(resolve) {
            var iframe = document.getElementById('sv-test-frame');
            if (!iframe) {
                resolve({ test: test, pass: false, detail: 'No iframe', ms: 0 });
                return;
            }

            var ms = test.timeout || 12000;
            var timer = setTimeout(function() {
                window.removeEventListener('message', onMsg);
                resolve({ test: test, pass: false, detail: 'Timeout — no sv:ready after ' + ms + 'ms', ms: Date.now() - start });
            }, ms);

            function onMsg(e) {
                if (!e.data || e.data.type !== 'sv:ready') { return; }
                clearTimeout(timer);
                window.removeEventListener('message', onMsg);
                try {
                    var result = test.assert(e.data.hardConfig, e, SVRunner.queryDOM, SVRunner.clickDOM);
                    if (result && typeof result.then === 'function') {
                        result
                            .then(function()    { resolve({ test: test, pass: true,  detail: 'ok',           ms: Date.now() - start }); })
                            .catch(function(err){ resolve({ test: test, pass: false, detail: err.message || String(err), ms: Date.now() - start }); });
                    } else {
                        resolve({ test: test, pass: true, detail: 'embed loaded', ms: Date.now() - start });
                    }
                } catch(err) {
                    resolve({ test: test, pass: false, detail: err.message || String(err), ms: Date.now() - start });
                }
            }

            window.addEventListener('message', onMsg);
            iframe.src = test._embedSrc;
        });
    };
}());

function embedTest(id, label, params, assertFn) {
    SV_TESTS.push({
        id:       id,
        label:    label,
        group:    'Embed',
        type:     'visual',
        _embedSrc: embedUrl(params || {}),
        assert:   assertFn || function() {}
    });
}

// --- Tests -------------------------------------------------------------------

// 1. embed.js initialises — sv:ready received with a valid hardConfig
embedTest(
    'embed-init',
    'Embed — SViewer.init() resolves, sv:ready received with hardConfig',
    {},
    function(hc) {
        if (!hc || typeof hc !== 'object') { throw new Error('sv:ready hardConfig missing or not an object'); }
    }
);

// 2. Toolbar DOM exists (embed.js creates it)
embedTest(
    'embed-toolbar-exists',
    'Embed — toolbar #sv-panel-controls created by embed.js',
    {},
    function(hc, ev, queryDOM) {
        return queryDOM('#sv-panel-controls', 'hidden').then(function(r) {
            if (!r.found) { throw new Error('#sv-panel-controls not created by embed.js'); }
        });
    }
);

// 3. Map container exists
embedTest(
    'embed-map-container',
    'Embed — #sv-frame-map created by embed.js',
    {},
    function(hc, ev, queryDOM) {
        return queryDOM('#sv-frame-map', 'className').then(function(r) {
            if (!r.found) { throw new Error('#sv-frame-map not found in embed DOM'); }
        });
    }
);

// 4. Sidepanel exists and is closed on init
embedTest(
    'embed-sidepanel-closed',
    'Embed — sidepanel created and closed on init',
    {},
    function(hc, ev, queryDOM) {
        return queryDOM('#sv-sidepanel', 'className').then(function(r) {
            if (!r.found) { throw new Error('#sv-sidepanel not found in embed DOM'); }
            if (r.value && r.value.indexOf('active') !== -1) {
                throw new Error('sidepanel has .active on embed init');
            }
        });
    }
);

// 5. hardConfig title present (config merged correctly)
embedTest(
    'embed-hardconfig-title',
    'Embed — hardConfig.title present in sv:ready payload',
    {},
    function(hc) {
        if (!hc || typeof hc.title !== 'string' || !hc.title) {
            throw new Error('hardConfig.title missing or empty: ' + JSON.stringify(hc && hc.title));
        }
    }
);

// 6. Panel opens via click (DOM interaction works through embed DOM)
// Uses the always-available share panel — legend is disabled with no WMS loaded.
embedTest(
    'embed-panel-open',
    'Embed — share panel opens on button click',
    {},
    function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('[data-sv-panel="share"]').then(function() {
            return queryDOM('#sv-sidepanel', 'className');
        }).then(function(r) {
            if (!r.found) { throw new Error('#sv-sidepanel not found'); }
            if (!r.value || r.value.indexOf('active') === -1) {
                throw new Error('sidepanel missing .active after share click in embed mode');
            }
        });
    }
);

// 7. Share URL / permalink element exists
embedTest(
    'embed-permalink-exists',
    'Embed — #sv-permalink-url exists in embed DOM',
    {},
    function(hc, ev, queryDOM) {
        return queryDOM('#sv-permalink-url', 'tagName').then(function(r) {
            if (!r.found) { throw new Error('#sv-permalink-url not found in embed DOM'); }
        });
    }
);

// 8. Search input present and aria-expanded=false
embedTest(
    'embed-search-input',
    'Embed — #sv-search-input exists and has aria-expanded=false',
    {},
    function(hc, ev, queryDOM) {
        return queryDOM('#sv-search-input', 'aria-expanded').then(function(r) {
            if (!r.found) { throw new Error('#sv-search-input not found in embed DOM'); }
            if (r.value === 'true') { throw new Error('search input aria-expanded=true on embed init'); }
        });
    }
);

// 9. lang param forwarded — check document.documentElement.lang (set from config.lang)
embedTest(
    'embed-lang-param',
    'Embed — ?lang=en applied (html[lang]=en)',
    { lang: 'en' },
    function(hc, ev, queryDOM) {
        return queryDOM('html', 'lang').then(function(r) {
            if (r.value !== 'en') { throw new Error('lang not applied: html[lang]=' + r.value); }
        });
    }
);

// 10. sv-scope class applied (CSS scoping for embed mode)
embedTest(
    'embed-sv-scope',
    'Embed — .sv-scope container class applied',
    {},
    function(hc, ev, queryDOM) {
        return queryDOM('.sv-scope', 'className').then(function(r) {
            if (!r.found) { throw new Error('.sv-scope container not found — CSS scoping broken'); }
        });
    }
);
