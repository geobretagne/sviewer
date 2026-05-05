/* sViewer Test Runner
 * Two test types: 'visual' (iframe + postMessage) and 'unit' (same-window embed.js + onReady).
 * Test authors only write SV_TESTS.push({...}) — never touch this file.
 */

(function() {
    'use strict';

    var TIMEOUT_MS = 10000;
    var BASE_URL = (function() {
        // tests/ is one level below sViewer root
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
        getBaseUrl: function() { return BASE_URL; }
    };

    // ------ Core -------------------------------------------------------------

    function assert(condition, message) {
        if (!condition) throw new Error(message || 'Assertion failed');
    }

    function run(test) {
        var start = Date.now();
        return new Promise(function(resolve) {
            var p = test.type === 'unit' ? runUnit(test) : runVisual(test);
            p.then(function(detail) {
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

            var timer = setTimeout(function() {
                window.removeEventListener('message', onMessage);
                reject(new Error('Timeout — no sv:ready after ' + TIMEOUT_MS + 'ms'));
            }, TIMEOUT_MS);

            function onMessage(event) {
                if (!event.data || event.data.type !== 'sv:ready') return;
                clearTimeout(timer);
                window.removeEventListener('message', onMessage);
                try {
                    if (typeof test.assert === 'function') test.assert(event.data.hardConfig);
                    resolve('map loaded');
                } catch(e) {
                    reject(e);
                }
            }

            window.addEventListener('message', onMessage);
            iframe.src = url;
        });
    }

    // ------ Unit (same-window embed.js + onReady) ----------------------------

    var _embedLoaded = false;
    var _embedLoading = false;
    var _embedQueue = [];

    function ensureEmbed() {
        return new Promise(function(resolve, reject) {
            if (_embedLoaded) { resolve(); return; }
            _embedQueue.push({ resolve: resolve, reject: reject });
            if (_embedLoading) return;
            _embedLoading = true;
            var s = document.createElement('script');
            s.src = BASE_URL + 'static/js/embed.js';
            s.onload = function() {
                _embedLoaded = true;
                _embedQueue.forEach(function(cb) { cb.resolve(); });
                _embedQueue = [];
            };
            s.onerror = function() {
                _embedQueue.forEach(function(cb) { cb.reject(new Error('Failed to load embed.js')); });
                _embedQueue = [];
            };
            document.head.appendChild(s);
        });
    }

    function runUnit(test) {
        return ensureEmbed().then(function() {
            return new Promise(function(resolve, reject) {
                // Set customConfig inline before init
                window.customConfig = test.config || {};

                var timer = setTimeout(function() {
                    reject(new Error('Timeout — onReady not called after ' + TIMEOUT_MS + 'ms'));
                }, TIMEOUT_MS);

                var container = document.getElementById('sv-unit-container');
                if (!container) { reject(new Error('No div#sv-unit-container in page')); return; }

                // Clear previous embed instance
                container.innerHTML = '';

                window.SViewerApp.init({
                    target: '#sv-unit-container',
                    debug: false
                });

                window.SViewerApp.onReady(function() {
                    clearTimeout(timer);
                    try {
                        if (typeof test.assert === 'function') test.assert(window.hardConfig);
                        resolve('init ok');
                    } catch(e) {
                        reject(e);
                    }
                });
            });
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
