/* Suite 08 — Panel toggle DOM state (click-driven)
 * Guards jQuery→vanilla migration of togglePanel/closePanel.
 * assert(hardConfig, event, queryDOM, clickDOM)
 *
 * Uses the always-available panels (share, locate) so the toggle MECHANISM is
 * tested without a data dependency. Legend/query are now disabled when no WMS or
 * features are loaded (see suite 15), so they aren't suitable for a bare-map
 * mechanism test.
 */

// Click share button → sidepanel gets .active, button gets aria-pressed=true
SV_TESTS.push({
    id: 'panel-open-share',
    label: 'Panel — click share button opens sidepanel (.active)',
    group: 'Panel',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('[data-sv-panel="share"]').then(function() {
            return Promise.all([
                queryDOM('#sv-sidepanel', 'className'),
                queryDOM('[data-sv-panel="share"]', 'aria-pressed')
            ]);
        }).then(function(results) {
            if (!results[0].value || results[0].value.indexOf('active') === -1) {
                throw new Error('sidepanel missing .active after open: ' + results[0].value);
            }
            if (results[1].value !== 'true') {
                throw new Error('share button aria-pressed not true: ' + results[1].value);
            }
        });
    }
});

// Click share button twice → sidepanel closes (no .active), button aria-pressed=false
SV_TESTS.push({
    id: 'panel-close-on-second-click',
    label: 'Panel — second click on same button closes sidepanel',
    group: 'Panel',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('[data-sv-panel="share"]')
        .then(function() { return clickDOM('[data-sv-panel="share"]'); })
        .then(function() {
            return Promise.all([
                queryDOM('#sv-sidepanel', 'className'),
                queryDOM('[data-sv-panel="share"]', 'aria-pressed')
            ]);
        }).then(function(results) {
            if (results[0].value && results[0].value.indexOf('active') !== -1) {
                throw new Error('sidepanel still .active after second click');
            }
            if (results[1].value === 'true') {
                throw new Error('share button aria-pressed still true after close');
            }
        });
    }
});

// Open share, then click locate → share button loses aria-pressed, locate gains it
SV_TESTS.push({
    id: 'panel-switch-active-button',
    label: 'Panel — switching panels updates aria-pressed on both buttons',
    group: 'Panel',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('[data-sv-panel="share"]')
        .then(function() { return clickDOM('[data-sv-panel="locate"]'); })
        .then(function() {
            return Promise.all([
                queryDOM('[data-sv-panel="share"]', 'aria-pressed'),
                queryDOM('[data-sv-panel="locate"]', 'aria-pressed')
            ]);
        }).then(function(results) {
            if (results[0].value === 'true') {
                throw new Error('share button still aria-pressed=true after switching to locate');
            }
            if (results[1].value !== 'true') {
                throw new Error('locate button aria-pressed not true after switch');
            }
        });
    }
});

// Open panel → #sv-frame-map gets .sv-panel-open
SV_TESTS.push({
    id: 'panel-frame-map-class',
    label: 'Panel — #sv-frame-map gets sv-panel-open when panel opens',
    group: 'Panel',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('[data-sv-panel="share"]').then(function() {
            return queryDOM('#sv-frame-map', 'className');
        }).then(function(r) {
            if (!r.value || r.value.indexOf('sv-panel-open') === -1) {
                throw new Error('#sv-frame-map missing sv-panel-open: ' + r.value);
            }
        });
    }
});

// Close panel via close button → sidepanel loses .active
SV_TESTS.push({
    id: 'panel-close-btn',
    label: 'Panel — close button closes sidepanel',
    group: 'Panel',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('[data-sv-panel="share"]')
        .then(function() { return clickDOM('.sv-sidepanel-close'); })
        .then(function() {
            return queryDOM('#sv-sidepanel', 'className');
        }).then(function(r) {
            if (r.value && r.value.indexOf('active') !== -1) {
                throw new Error('sidepanel still .active after close button click');
            }
        });
    }
});
