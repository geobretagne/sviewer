/* Suite 08 — Panel toggle DOM state (click-driven)
 * Guards jQuery→vanilla migration of togglePanel/closePanel.
 * assert(hardConfig, event, queryDOM, clickDOM)
 */

// Click legend button → sidepanel gets .active, button gets aria-pressed=true
SV_TESTS.push({
    id: 'panel-open-legend',
    label: 'Panel — click legend button opens sidepanel (.active)',
    group: 'Panel',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('[data-sv-panel="legend"]').then(function() {
            return Promise.all([
                queryDOM('#sv-sidepanel', 'className'),
                queryDOM('[data-sv-panel="legend"]', 'aria-pressed')
            ]);
        }).then(function(results) {
            if (!results[0].value || results[0].value.indexOf('active') === -1) {
                throw new Error('sidepanel missing .active after open: ' + results[0].value);
            }
            if (results[1].value !== 'true') {
                throw new Error('legend button aria-pressed not true: ' + results[1].value);
            }
        });
    }
});

// Click legend button twice → sidepanel closes (no .active), button aria-pressed=false
SV_TESTS.push({
    id: 'panel-close-on-second-click',
    label: 'Panel — second click on same button closes sidepanel',
    group: 'Panel',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('[data-sv-panel="legend"]')
        .then(function() { return clickDOM('[data-sv-panel="legend"]'); })
        .then(function() {
            return Promise.all([
                queryDOM('#sv-sidepanel', 'className'),
                queryDOM('[data-sv-panel="legend"]', 'aria-pressed')
            ]);
        }).then(function(results) {
            if (results[0].value && results[0].value.indexOf('active') !== -1) {
                throw new Error('sidepanel still .active after second click');
            }
            if (results[1].value === 'true') {
                throw new Error('legend button aria-pressed still true after close');
            }
        });
    }
});

// Open legend, then click query → legend button loses aria-pressed, query button gains it
SV_TESTS.push({
    id: 'panel-switch-active-button',
    label: 'Panel — switching panels updates aria-pressed on both buttons',
    group: 'Panel',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM, clickDOM) {
        return clickDOM('[data-sv-panel="legend"]')
        .then(function() { return clickDOM('[data-sv-panel="query"]'); })
        .then(function() {
            return Promise.all([
                queryDOM('[data-sv-panel="legend"]', 'aria-pressed'),
                queryDOM('[data-sv-panel="query"]', 'aria-pressed')
            ]);
        }).then(function(results) {
            if (results[0].value === 'true') {
                throw new Error('legend button still aria-pressed=true after switching to query');
            }
            if (results[1].value !== 'true') {
                throw new Error('query button aria-pressed not true after switch');
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
        return clickDOM('[data-sv-panel="legend"]').then(function() {
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
        return clickDOM('[data-sv-panel="legend"]')
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
