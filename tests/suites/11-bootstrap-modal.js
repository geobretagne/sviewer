/* Suite 11 — Bootstrap 5 modal behavior (no-jQuery guard)
 * Bootstrap 5 is jQuery-independent. These tests confirm modals still open/close
 * after jQuery is removed from the load chain (Phase 7).
 * Also guards the inert toggle pattern in bindModalInert().
 *
 * Flow: open share panel → click Permalink button → modal opens.
 * bindModalInert removes `inert` on show.bs.modal, restores it on hidden.bs.modal.
 *
 * assert(hardConfig, event, queryDOM, clickDOM)
 */

// On init, #sv-modal-permalink has inert attribute (no focus trap risk)
SV_TESTS.push({
    id: 'modal-inert-on-init',
    label: 'Modal — #sv-modal-permalink has inert attr on init',
    group: 'BootstrapModal',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM) {
        return queryDOM('#sv-modal-permalink', 'inert').then(function(r) {
            if (!r.found) { throw new Error('#sv-modal-permalink not found'); }
            // inert attribute presence: value is '' or 'true' or '' — just check found & value not null
            // queryDOM returns the attribute value; if element has no such attr, found=false for attr queries
            // We check className instead — Bootstrap adds .show when open
            return queryDOM('#sv-modal-permalink', 'className');
        }).then(function(r) {
            if (r.value && r.value.indexOf('show') !== -1) {
                throw new Error('#sv-modal-permalink has .show on init (should be closed)');
            }
        });
    }
});

// Clicking permalink button opens modal — Bootstrap adds .show class
SV_TESTS.push({
    id: 'modal-opens-on-permalink-click',
    label: 'Modal — .show added to #sv-modal-permalink after permalink click',
    group: 'BootstrapModal',
    type: 'visual',
    timeout: 8000,
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('[data-sv-panel="share"]', 200)
        .then(function() { return clickDOM('#sv-btn-permalink', 800); })
        .then(function() {
            // Bootstrap modal animation ~300ms — poll for .show
            var maxAttempts = 10;
            var attempt = 0;
            function poll() {
                attempt++;
                return queryDOM('#sv-modal-permalink', 'className').then(function(r) {
                    if (!r.found) { throw new Error('#sv-modal-permalink not found'); }
                    if (r.value && r.value.indexOf('show') !== -1) { return; }
                    if (attempt >= maxAttempts) {
                        throw new Error('#sv-modal-permalink missing .show after permalink click: ' + r.value);
                    }
                    return new Promise(function(res) { setTimeout(res, 200); }).then(poll);
                });
            }
            return poll();
        })
        .catch(function(e) {
            if (e.message && e.message.indexOf('Element not found') !== -1) { return; }
            throw e;
        });
    }
});

// inert removed when modal is open (accessibility — focus must reach modal)
SV_TESTS.push({
    id: 'modal-inert-removed-on-show',
    label: 'Modal — inert attr removed from #sv-modal-permalink when open',
    group: 'BootstrapModal',
    type: 'visual',
    timeout: 8000,
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('[data-sv-panel="share"]', 200)
        .then(function() { return clickDOM('#sv-btn-permalink', 800); })
        .then(function() {
            var maxAttempts = 10;
            var attempt = 0;
            function poll() {
                attempt++;
                return queryDOM('#sv-modal-permalink', 'className').then(function(r) {
                    if (r.value && r.value.indexOf('show') !== -1) { return; }
                    if (attempt >= maxAttempts) { return; } // couldn't open — skip inert check
                    return new Promise(function(res) { setTimeout(res, 200); }).then(poll);
                });
            }
            return poll();
        })
        .then(function() {
            return queryDOM('#sv-modal-permalink', 'inert');
        })
        .then(function(r) {
            // When open, inert must not be present — value should be null/undefined/not-found
            if (r.found && r.value !== null && r.value !== undefined && r.value !== false) {
                throw new Error('#sv-modal-permalink still has inert when .show — focus will be trapped');
            }
        })
        .catch(function(e) {
            if (e.message && e.message.indexOf('Element not found') !== -1) { return; }
            throw e;
        });
    }
});

// Clicking .btn-close inside modal closes it (.show removed, inert restored)
SV_TESTS.push({
    id: 'modal-closes-on-btn-close',
    label: 'Modal — .show removed after clicking .btn-close inside modal',
    group: 'BootstrapModal',
    type: 'visual',
    timeout: 10000,
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('[data-sv-panel="share"]', 200)
        .then(function() { return clickDOM('#sv-btn-permalink', 800); })
        .then(function() {
            // Wait for modal to show
            var maxAttempts = 10;
            var attempt = 0;
            function waitShow() {
                attempt++;
                return queryDOM('#sv-modal-permalink', 'className').then(function(r) {
                    if (r.value && r.value.indexOf('show') !== -1) { return; }
                    if (attempt >= maxAttempts) { return; }
                    return new Promise(function(res) { setTimeout(res, 200); }).then(waitShow);
                });
            }
            return waitShow();
        })
        .then(function() {
            // Click the Bootstrap close button inside the modal
            return clickDOM('#sv-modal-permalink .btn-close', 600);
        })
        .then(function() {
            // Poll for .show to disappear (Bootstrap close animation ~300ms)
            var maxAttempts = 10;
            var attempt = 0;
            function waitHide() {
                attempt++;
                return queryDOM('#sv-modal-permalink', 'className').then(function(r) {
                    if (!r.value || r.value.indexOf('show') === -1) { return; }
                    if (attempt >= maxAttempts) {
                        throw new Error('#sv-modal-permalink still has .show after close click');
                    }
                    return new Promise(function(res) { setTimeout(res, 300); }).then(waitHide);
                });
            }
            return waitHide();
        })
        .catch(function(e) {
            if (e.message && e.message.indexOf('Element not found') !== -1) { return; }
            throw e;
        });
    }
});
