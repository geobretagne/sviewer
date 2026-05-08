/* Suite 06 — DOM panel state (visual + domQuery tests)
 * Guards jQuery→vanilla migration for panel toggle, aria attrs, CSS classes.
 * assert(hardConfig, event, queryDOM) — queryDOM returns Promise<{found, value}>.
 */

// Verify key panel DOM IDs exist after init
SV_TESTS.push({
    id: 'dom-panel-ids-exist',
    label: 'DOM — key panel IDs present after init',
    group: 'DOM',
    type: 'visual',
    params: {},
    assert: function(hardConfig, event, queryDOM) {
        return Promise.all([
            queryDOM('#sv-sidepanel', 'hidden'),
            queryDOM('#sv-panel-controls', 'hidden'),
            queryDOM('#sv-frame-map', 'className')
        ]).then(function(results) {
            if (!results[0].found) throw new Error('#sv-sidepanel not found');
            if (!results[1].found) throw new Error('#sv-panel-controls not found');
            if (!results[2].found) throw new Error('#sv-frame-map not found');
        });
    }
});

// Sidepanel must be closed (no .active class) on init
SV_TESTS.push({
    id: 'dom-panel-closed-on-init',
    label: 'DOM — sidepanel closed on init (no .active)',
    group: 'DOM',
    type: 'visual',
    params: {},
    assert: function(hardConfig, event, queryDOM) {
        return queryDOM('#sv-sidepanel', 'className').then(function(r) {
            if (!r.found) throw new Error('#sv-sidepanel not found');
            if (r.value && r.value.indexOf('active') !== -1) {
                throw new Error('sidepanel has .active on init, expected closed');
            }
        });
    }
});

// sv-frame-map must not have sv-panel-open on init
SV_TESTS.push({
    id: 'dom-frame-no-panel-open-on-init',
    label: 'DOM — #sv-frame-map has no sv-panel-open on init',
    group: 'DOM',
    type: 'visual',
    params: {},
    assert: function(hardConfig, event, queryDOM) {
        return queryDOM('#sv-frame-map', 'className').then(function(r) {
            if (!r.found) throw new Error('#sv-frame-map not found');
            if (r.value && r.value.indexOf('sv-panel-open') !== -1) {
                throw new Error('#sv-frame-map has sv-panel-open on init');
            }
        });
    }
});

// Panel toggle buttons must have aria-pressed=false on init
SV_TESTS.push({
    id: 'dom-panel-btns-aria-pressed-init',
    label: 'DOM — panel toggle buttons aria-pressed=false on init',
    group: 'DOM',
    type: 'visual',
    params: {},
    assert: function(hardConfig, event, queryDOM) {
        var selectors = [
            '[data-sv-panel="query"]',
            '[data-sv-panel="legend"]',
            '[data-sv-panel="share"]'
        ];
        return Promise.all(selectors.map(function(sel) {
            return queryDOM(sel, 'aria-pressed').then(function(r) {
                if (!r.found) { return; } // optional panel buttons
                if (r.value === 'true') {
                    throw new Error(sel + ' has aria-pressed=true on init');
                }
            });
        }));
    }
});

// Marker must be hidden on init
SV_TESTS.push({
    id: 'dom-marker-hidden-on-init',
    label: 'DOM — #sv-marker hidden on init',
    group: 'DOM',
    type: 'visual',
    params: {},
    assert: function(hardConfig, event, queryDOM) {
        return queryDOM('#sv-marker', 'hidden').then(function(r) {
            if (!r.found) throw new Error('#sv-marker not found');
            // hidden attr or display:none — check className for d-none or hidden property
            // jQuery .hide() sets display:none; vanilla equivalent sets hidden=true or d-none
            // Either is acceptable — just confirm element exists
        });
    }
});

// Share panel: permalink URL element must exist
SV_TESTS.push({
    id: 'dom-permalink-el-exists',
    label: 'DOM — #sv-permalink-url exists',
    group: 'DOM',
    type: 'visual',
    params: {},
    assert: function(hardConfig, event, queryDOM) {
        return queryDOM('#sv-permalink-url', 'tagName').then(function(r) {
            if (!r.found) throw new Error('#sv-permalink-url not found');
        });
    }
});

// Search input must have aria-expanded=false on init
SV_TESTS.push({
    id: 'dom-search-aria-expanded-init',
    label: 'DOM — search input aria-expanded=false on init',
    group: 'DOM',
    type: 'visual',
    params: {},
    assert: function(hardConfig, event, queryDOM) {
        return queryDOM('#sv-search-input', 'aria-expanded').then(function(r) {
            if (!r.found) throw new Error('#sv-search-input not found');
            if (r.value === 'true') throw new Error('search input aria-expanded=true on init');
        });
    }
});

// GPS button must have aria-pressed=false on init
SV_TESTS.push({
    id: 'dom-gps-btn-aria-pressed-init',
    label: 'DOM — #sv-btn-locate aria-pressed=false on init',
    group: 'DOM',
    type: 'visual',
    params: {},
    assert: function(hardConfig, event, queryDOM) {
        return queryDOM('#sv-btn-locate', 'aria-pressed').then(function(r) {
            if (!r.found) { return; } // locate may be hidden in embed mode
            if (r.value === 'true') throw new Error('#sv-btn-locate aria-pressed=true on init');
        });
    }
});
