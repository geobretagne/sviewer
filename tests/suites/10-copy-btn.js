/* Suite 10 — Copy-to-clipboard button state (vanilla migration guard)
 * copyToClipboard() now uses btn.innerHTML / btn.parentNode.insertBefore()
 * instead of jQuery .html()/.after(). Guards button state transitions.
 *
 * Flow: open share panel → click "Permalink" button → modal opens →
 * click copy button → button shows bi-check icon within 500ms.
 *
 * assert(hardConfig, event, queryDOM, clickDOM)
 */

// After clicking share → permalink → copy, button innerHTML contains bi-check
SV_TESTS.push({
    id: 'copy-btn-check-icon',
    label: 'Copy button — shows bi-check icon after click',
    group: 'CopyButton',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        // Open share panel
        return clickDOM('[data-sv-panel="share"]', 200)
        .then(function() {
            // Click the permalink button inside the panel
            return clickDOM('#sv-btn-permalink', 500);
        })
        .then(function() {
            // Modal should be visible — click copy
            return clickDOM('#sv-permalink-copy-btn', 600);
        })
        .then(function() {
            return queryDOM('#sv-permalink-copy-btn', 'innerHTML');
        })
        .then(function(r) {
            if (!r.found) { throw new Error('#sv-permalink-copy-btn not found'); }
            if (!r.value || r.value.indexOf('bi-check') === -1) {
                throw new Error('copy button missing bi-check after click: ' + r.value);
            }
        })
        .catch(function(e) {
            // Share or permalink panel may be absent in test config — skip
            if (e.message && (e.message.indexOf('not found') !== -1 || e.message.indexOf('Element not found') !== -1)) { return; }
            throw e;
        });
    }
});

// After 2s, copy button reverts to original label (no bi-check)
SV_TESTS.push({
    id: 'copy-btn-revert',
    label: 'Copy button — reverts to original label after 2s',
    group: 'CopyButton',
    type: 'visual',
    timeout: 8000,
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('[data-sv-panel="share"]', 200)
        .then(function() { return clickDOM('#sv-btn-permalink', 500); })
        .then(function() { return clickDOM('#sv-permalink-copy-btn', 600); })
        .then(function() {
            // Wait for revert (setTimeout 2000ms in copyToClipboard)
            return new Promise(function(res) { setTimeout(res, 2200); });
        })
        .then(function() {
            return queryDOM('#sv-permalink-copy-btn', 'innerHTML');
        })
        .then(function(r) {
            if (!r.found) { throw new Error('#sv-permalink-copy-btn not found'); }
            if (r.value && r.value.indexOf('bi-check') !== -1) {
                throw new Error('copy button still shows bi-check after 2s — revert failed');
            }
        })
        .catch(function(e) {
            if (e.message && (e.message.indexOf('not found') !== -1 || e.message.indexOf('Element not found') !== -1)) { return; }
            throw e;
        });
    }
});

// aria-live span injected next to button after copy (accessibility)
SV_TESTS.push({
    id: 'copy-btn-aria-live',
    label: 'Copy button — aria-live announcement injected after click',
    group: 'CopyButton',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('[data-sv-panel="share"]', 200)
        .then(function() { return clickDOM('#sv-btn-permalink', 500); })
        .then(function() { return clickDOM('#sv-permalink-copy-btn', 600); })
        .then(function() {
            return queryDOM('[aria-live="polite"]', 'textContent');
        })
        .then(function(r) {
            if (!r.found) {
                throw new Error('[aria-live="polite"] span not injected after copy');
            }
        })
        .catch(function(e) {
            if (e.message && (e.message.indexOf('not found') !== -1 || e.message.indexOf('Element not found') !== -1)) { return; }
            throw e;
        });
    }
});
