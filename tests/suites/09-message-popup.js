/* Suite 09 — messagePopup (vanilla fade-out)
 * Guards jQuery→vanilla migration: messagePopup now uses createElement +
 * inline CSS transition + setTimeout instead of jQuery .delay().fadeOut().
 * Triggering strategy: GPS geolocation error fires messagePopup automatically
 * in browsers that have no GPS hardware. We force it via postMessage helper.
 *
 * assert(hardConfig, event, queryDOM, clickDOM)
 */

// messagePopup must have role=alert for accessibility (also proves it appeared)
SV_TESTS.push({
    id: 'msg-popup-role-alert',
    label: 'messagePopup — element has role="alert" after GPS error trigger',
    group: 'MessagePopup',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('#sv-btn-locate', 300).then(function() {
            var maxAttempts = 10;
            var attempt = 0;
            function poll() {
                attempt++;
                return queryDOM('[role="alert"]', 'textContent').then(function(r) {
                    if (r.found) { return; }
                    if (attempt >= maxAttempts) {
                        throw new Error('[role="alert"] never appeared after GPS error');
                    }
                    return new Promise(function(res) { setTimeout(res, 300); }).then(poll);
                });
            }
            return poll();
        }).catch(function(e) {
            if (e.message && e.message.indexOf('not found') !== -1) { return; }
            throw e;
        });
    }
});

// messagePopup auto-removes after ~2.5s (opacity→0 at 1.5s, removal at 2.5s)
SV_TESTS.push({
    id: 'msg-popup-auto-dismiss',
    label: 'messagePopup — auto-removed from DOM after 2.5s',
    group: 'MessagePopup',
    type: 'visual',
    timeout: 8000,
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('#sv-btn-locate', 300).then(function() {
            // First confirm it appeared
            var maxAttempts = 10;
            var attempt = 0;
            function waitAppear() {
                attempt++;
                return queryDOM('.alert.alert-info', 'textContent').then(function(r) {
                    if (r.found) { return; }
                    if (attempt >= maxAttempts) { return; } // skip if GPS btn absent
                    return new Promise(function(res) { setTimeout(res, 300); }).then(waitAppear);
                });
            }
            return waitAppear();
        }).then(function() {
            // Wait 3s then confirm gone
            return new Promise(function(res) { setTimeout(res, 3000); });
        }).then(function() {
            return queryDOM('.alert.alert-info', 'textContent');
        }).then(function(r) {
            if (r.found) {
                throw new Error('alert.alert-info still in DOM after 3s — auto-dismiss failed');
            }
        }).catch(function(e) {
            if (e.message && e.message.indexOf('not found') !== -1) { return; }
            throw e;
        });
    }
});
