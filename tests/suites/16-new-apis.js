/* Suite 16 — Public APIs added for installed-app self-sufficiency
 * assert(hardConfig, event, queryDOM, clickDOM, apiCall)
 *
 * apiCall(method, args) invokes a whitelisted SViewer method inside the iframe.
 */

// isInstalled() is false in the test iframe (not a standalone PWA; self !== top)
SV_TESTS.push({
    id: 'api-isinstalled-false-in-iframe',
    label: 'API — SViewer.isInstalled() is false inside the test iframe',
    group: 'API',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM, apiCall) {
        return apiCall('isInstalled', []).then(function(v) {
            if (v !== false) {
                throw new Error('isInstalled() should be false in an iframe, got: ' + v);
            }
        });
    }
});

// getPermalink() returns an index.html URL carrying x/y/z
SV_TESTS.push({
    id: 'api-getpermalink-shape',
    label: 'API — SViewer.getPermalink() returns a permalink with x/y/z',
    group: 'API',
    type: 'visual',
    params: { z: 8, x: -200000, y: 6100000 },
    assert: function(hc, ev, queryDOM, clickDOM, apiCall) {
        return apiCall('getPermalink', []).then(function(url) {
            if (typeof url !== 'string' || url.indexOf('index.html?') === -1) {
                throw new Error('getPermalink did not return an index.html URL: ' + url);
            }
            ['x=', 'y=', 'z='].forEach(function(p) {
                if (url.indexOf(p) === -1) {
                    throw new Error('getPermalink missing "' + p + '": ' + url);
                }
            });
        });
    }
});

// getPermalink() carries the map title when one is set (?title=)
SV_TESTS.push({
    id: 'api-getpermalink-title',
    label: 'API — getPermalink() includes ?title= when a title is set',
    group: 'API',
    type: 'visual',
    params: { title: 'TestTitle123' },
    assert: function(hc, ev, queryDOM, clickDOM, apiCall) {
        return apiCall('getPermalink', []).then(function(url) {
            if (url.indexOf('title=TestTitle123') === -1) {
                throw new Error('getPermalink missing the set title: ' + url);
            }
        });
    }
});

// panel.open({fullscreen:true}) adds the generic sv-panel-fullscreen marker.
// Loads the 'me' extension (a fullscreen opt-in panel) and opens it.
SV_TESTS.push({
    id: 'api-panel-fullscreen-marker',
    label: 'API — fullscreen panel adds sv-panel-fullscreen class',
    group: 'API',
    type: 'visual',
    params: { ext: 'me' },
    assert: function(hc, ev, queryDOM, clickDOM, apiCall) {
        // Wait for the me extension to register its toolbar button, then open it.
        return apiCall('loadedExtensions', []).then(function() {
            return clickDOM('.sv-alt-toggle');   // me's toolbar button
        }).then(function() {
            return queryDOM('#sv-sidepanel', 'className');
        }).then(function(r) {
            if (!r.value || r.value.indexOf('sv-panel-fullscreen') === -1) {
                throw new Error('sidepanel missing sv-panel-fullscreen after opening me: ' + r.value);
            }
        });
    }
});
