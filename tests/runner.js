/* sViewer Test Runner
 * All tests are visual: iframe loads sViewer, sv:ready postMessage carries hardConfig.
 * Test authors only write SV_TESTS.push({...}) — never touch this file.
 */

(function() {
    'use strict';

    var TIMEOUT_MS = 10000;
    var BASE_URL = (function() {
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            var src = scripts[i].src || '';
            var m = src.match(/^(.*\/)tests\/runner\.js$/);
            if (m) return m[1];
        }
        return '../';
    })();

    // ------ Public API -------------------------------------------------------

    window.SV_TESTS = [];

    window.SVRunner = {
        run: run,
        runAll: runAll,
        renderRunning: renderRunning,
        renderResult: renderResult,
        getBaseUrl: function() { return BASE_URL; },
        queryDOM: queryDOM
    };

    // ------ DOM query helpers ------------------------------------------------

    var _domQuerySeq = 0;
    var _domQueryPending = {};

    window.addEventListener('message', function(e) {
        if (!e.data || e.data.type !== 'sv:domResult') { return; }
        var cb = _domQueryPending[e.data.id];
        if (cb) { delete _domQueryPending[e.data.id]; cb(e.data); }
    });

    // Query a DOM property/attribute inside the sViewer iframe.
    // selector: CSS selector, prop: 'textContent'|'innerHTML'|'value'|'checked'|'hidden'|attr name.
    // Returns a Promise resolving to {found, value}.
    function queryDOM(selector, prop) {
        return new Promise(function(resolve, reject) {
            var iframe = document.getElementById('sv-test-frame');
            if (!iframe || !iframe.contentWindow) { reject(new Error('No iframe')); return; }
            var id = ++_domQuerySeq;
            var timer = setTimeout(function() {
                delete _domQueryPending[id];
                reject(new Error('sv:domQuery timeout for "' + selector + '"'));
            }, 3000);
            _domQueryPending[id] = function(data) {
                clearTimeout(timer);
                resolve(data);
            };
            iframe.contentWindow.postMessage({ type: 'sv:domQuery', id: id, selector: selector, prop: prop || 'textContent' }, '*');
        });
    }

    // ------ Core -------------------------------------------------------------

    function run(test) {
        var start = Date.now();
        return new Promise(function(resolve) {
            runVisual(test).then(function(detail) {
                resolve({ test: test, pass: true, detail: detail || '', ms: Date.now() - start });
            }).catch(function(err) {
                resolve({ test: test, pass: false, detail: err.message || String(err), ms: Date.now() - start });
            });
        });
    }

    function runAll(filter) {
        var tests = window.SV_TESTS.filter(function(t) {
            return !filter || t.group === filter;
        });
        return tests.reduce(function(chain, test) {
            return chain.then(function(results) {
                renderRunning(test);
                return run(test).then(function(result) {
                    results.push(result);
                    renderResult(result);
                    return results;
                });
            });
        }, Promise.resolve([]));
    }

    // ------ Visual (iframe + postMessage) ------------------------------------

    function runVisual(test) {
        return new Promise(function(resolve, reject) {
            var iframe = document.getElementById('sv-test-frame');
            if (!iframe) { reject(new Error('No iframe#sv-test-frame in page')); return; }

            var params = test.params || {};
            var qs = Object.keys(params).map(function(k) {
                return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
            }).join('&');
            var url = BASE_URL + 'index.html' + (qs ? '?' + qs : '');

            var ms = test.timeout || TIMEOUT_MS;
            var timer = setTimeout(function() {
                window.removeEventListener('message', onMessage);
                reject(new Error('Timeout — no sv:ready after ' + ms + 'ms'));
            }, ms);

            function onMessage(event) {
                if (!event.data || event.data.type !== 'sv:ready') return;
                clearTimeout(timer);
                window.removeEventListener('message', onMessage);
                try {
                    var result = test.assert ? test.assert(event.data.hardConfig, event, queryDOM) : undefined;
                    // assert may return a Promise (for fetch-based checks or queryDOM calls)
                    if (result && typeof result.then === 'function') {
                        result.then(function() { resolve('ok'); }).catch(reject);
                    } else {
                        resolve('map loaded');
                    }
                } catch(e) {
                    reject(e);
                }
            }

            window.addEventListener('message', onMessage);
            iframe.src = url;
        });
    }

    // ------ Render -----------------------------------------------------------

    function renderRunning(test) {
        var row = document.getElementById('row-' + test.id);
        if (!row) return;
        var status = row.querySelector('.sv-test-status');
        if (status) { status.textContent = '⏳'; status.className = 'sv-test-status running'; }
    }

    function renderResult(result) {
        var row = document.getElementById('row-' + result.test.id);
        if (!row) return;
        var status = row.querySelector('.sv-test-status');
        var detail = row.querySelector('.sv-test-detail');
        if (status) {
            status.textContent = result.pass ? '✓' : '✗';
            status.className = 'sv-test-status ' + (result.pass ? 'pass' : 'fail');
        }
        if (detail) {
            detail.textContent = result.pass
                ? (result.ms + 'ms')
                : (result.detail + ' (' + result.ms + 'ms)');
            detail.className = 'sv-test-detail ' + (result.pass ? 'pass' : 'fail');
        }
    }

})();
