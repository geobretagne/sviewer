/* Suite 14 — SViewer.loadExtension() public API
 *
 * Exercises the dynamic extension loading API added in 0.14.1:
 *   SViewer.loadExtension(name) → Promise<string>
 *   SViewer.hasExtension(name)  → boolean
 *   SViewer.loadedExtensions()  → string[]
 *
 * Tests use SVRunner.apiCall(method, args) to invoke the API inside the iframe
 * (whitelisted in sviewer.js: hasExtension, loadedExtensions, loadExtension).
 *
 * assert(hardConfig, event, queryDOM, clickDOM)  — apiCall available on SVRunner
 */

// --- Registry: hasExtension() returns false for unloaded ------------------

SV_TESTS.push({
    id: 'loadext-has-false-for-unloaded',
    label: 'hasExtension("me") returns false before load',
    group: 'LoadExtension',
    type: 'visual',
    assert: function() {
        return SVRunner.apiCall('hasExtension', ['me']).then(function(v) {
            if (v !== false) { throw new Error('expected false, got ' + JSON.stringify(v)); }
        });
    }
});

// --- Registry: loadedExtensions() returns empty array (no boot exts) ------

SV_TESTS.push({
    id: 'loadext-loaded-array-empty',
    label: 'loadedExtensions() returns [] when no ?ext= or customConfig.extensions',
    group: 'LoadExtension',
    type: 'visual',
    assert: function() {
        return SVRunner.apiCall('loadedExtensions', []).then(function(v) {
            if (!Array.isArray(v)) { throw new Error('expected array, got ' + typeof v); }
            if (v.length !== 0) { throw new Error('expected empty, got ' + JSON.stringify(v)); }
        });
    }
});

// --- Registry: ?ext=me populates registry at boot -------------------------

SV_TESTS.push({
    id: 'loadext-boot-populates-registry',
    label: '?ext=me at boot → hasExtension("me") true + loadedExtensions includes "me"',
    group: 'LoadExtension',
    type: 'visual',
    params: { ext: 'me' },
    timeout: 8000,
    assert: function() {
        // Boot load is async (fetch i18n); poll briefly for ready state
        var attempts = 0;
        function poll() {
            return SVRunner.apiCall('hasExtension', ['me']).then(function(v) {
                if (v === true) {
                    return SVRunner.apiCall('loadedExtensions', []).then(function(list) {
                        if (list.indexOf('me') === -1) {
                            throw new Error('loadedExtensions missing "me": ' + JSON.stringify(list));
                        }
                    });
                }
                if (++attempts > 20) { throw new Error('hasExtension("me") never became true'); }
                return new Promise(function(r) { setTimeout(r, 100); }).then(poll);
            });
        }
        return poll();
    }
});

// --- loadExtension: success path ------------------------------------------

SV_TESTS.push({
    id: 'loadext-success',
    label: 'loadExtension("me") resolves with name + populates registry',
    group: 'LoadExtension',
    type: 'visual',
    timeout: 8000,
    assert: function() {
        return SVRunner.apiCall('loadExtension', ['me']).then(function(name) {
            if (name !== 'me') { throw new Error('expected "me", got ' + JSON.stringify(name)); }
            return SVRunner.apiCall('hasExtension', ['me']);
        }).then(function(has) {
            if (has !== true) { throw new Error('hasExtension false after successful load'); }
        });
    }
});

// --- loadExtension: idempotent --------------------------------------------

SV_TESTS.push({
    id: 'loadext-idempotent',
    label: 'loadExtension("me") twice → both resolve, no double-load',
    group: 'LoadExtension',
    type: 'visual',
    timeout: 8000,
    assert: function() {
        return SVRunner.apiCall('loadExtension', ['me']).then(function() {
            return SVRunner.apiCall('loadExtension', ['me']);
        }).then(function(name) {
            if (name !== 'me') { throw new Error('second call did not resolve with name'); }
            return SVRunner.apiCall('loadedExtensions', []);
        }).then(function(list) {
            var count = list.filter(function(n) { return n === 'me'; }).length;
            if (count !== 1) { throw new Error('expected exactly one "me" in registry, got ' + count); }
        });
    }
});

// --- loadExtension: invalid name rejects with code 'invalid-name' ---------

SV_TESTS.push({
    id: 'loadext-invalid-name',
    label: 'loadExtension("../etc/passwd") rejects with code "invalid-name"',
    group: 'LoadExtension',
    type: 'visual',
    assert: function() {
        return SVRunner.apiCall('loadExtension', ['../etc/passwd']).then(function() {
            throw new Error('expected rejection, got resolve');
        }, function(err) {
            if (err.code !== 'invalid-name') {
                throw new Error('expected code "invalid-name", got ' + err.code + ' / ' + err.message);
            }
        });
    }
});

// --- loadExtension: empty string rejects with code 'invalid-name' ---------

SV_TESTS.push({
    id: 'loadext-empty-name',
    label: 'loadExtension("") rejects with code "invalid-name"',
    group: 'LoadExtension',
    type: 'visual',
    assert: function() {
        return SVRunner.apiCall('loadExtension', ['']).then(function() {
            throw new Error('expected rejection, got resolve');
        }, function(err) {
            if (err.code !== 'invalid-name') {
                throw new Error('expected code "invalid-name", got ' + err.code);
            }
        });
    }
});

// --- loadExtension: non-string rejects with code 'invalid-name' -----------

SV_TESTS.push({
    id: 'loadext-non-string',
    label: 'loadExtension(null) rejects with code "invalid-name"',
    group: 'LoadExtension',
    type: 'visual',
    assert: function() {
        return SVRunner.apiCall('loadExtension', [null]).then(function() {
            throw new Error('expected rejection, got resolve');
        }, function(err) {
            if (err.code !== 'invalid-name') {
                throw new Error('expected code "invalid-name", got ' + err.code);
            }
        });
    }
});

// --- loadExtension: nonexistent rejects with code 'manifest-fetch' --------

SV_TESTS.push({
    id: 'loadext-manifest-404',
    label: 'loadExtension("nonexistent-xyz") rejects with code "manifest-fetch"',
    group: 'LoadExtension',
    type: 'visual',
    timeout: 8000,
    assert: function() {
        return SVRunner.apiCall('loadExtension', ['nonexistent-xyz']).then(function() {
            throw new Error('expected rejection, got resolve');
        }, function(err) {
            if (err.code !== 'manifest-fetch') {
                throw new Error('expected code "manifest-fetch", got ' + err.code + ' / ' + err.message);
            }
        });
    }
});

// --- loadExtension: print loaded at runtime adds toolbar button -----------

SV_TESTS.push({
    id: 'loadext-print-injects-toolbar',
    label: 'loadExtension("print") at runtime injects toolbar button',
    group: 'LoadExtension',
    type: 'visual',
    timeout: 8000,
    assert: function(hardConfig, event, queryDOM) {
        return SVRunner.apiCall('loadExtension', ['print']).then(function() {
            // Print extension fetches i18n then registers onMapReady — wait briefly
            var attempts = 0;
            function poll() {
                return queryDOM('.bi-printer', 'tagName').then(function(r) {
                    if (r.found) { return; }
                    if (++attempts > 20) { throw new Error('Print toolbar button never appeared'); }
                    return new Promise(function(res) { setTimeout(res, 100); }).then(poll);
                });
            }
            return poll();
        });
    }
});
