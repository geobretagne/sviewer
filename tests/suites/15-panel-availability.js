/* Suite 15 — Legend/Query panel availability (disabled when no data)
 * assert(hardConfig, event, queryDOM, clickDOM, apiCall)
 *
 * Legend needs a WMS layer; Query needs a WMS layer OR loaded vector features.
 * On a bare map both toggle buttons are disabled so they aren't dead controls.
 */

// Bare map → legend button disabled
SV_TESTS.push({
    id: 'avail-legend-disabled-bare',
    label: 'Availability — legend button disabled on bare map (no WMS)',
    group: 'Availability',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM) {
        return queryDOM('[data-sv-panel="legend"]', 'disabled').then(function(r) {
            if (!r.found) { throw new Error('legend button not found'); }
            // 'disabled' DOM property is boolean true when disabled
            if (r.value !== true) {
                throw new Error('legend button not disabled on bare map: ' + r.value);
            }
        });
    }
});

// Bare map → query button disabled
SV_TESTS.push({
    id: 'avail-query-disabled-bare',
    label: 'Availability — query button disabled on bare map (no WMS, no features)',
    group: 'Availability',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM) {
        return queryDOM('[data-sv-panel="query"]', 'disabled').then(function(r) {
            if (!r.found) { throw new Error('query button not found'); }
            if (r.value !== true) {
                throw new Error('query button not disabled on bare map: ' + r.value);
            }
        });
    }
});

// Bare map → aria-disabled reflects state (a11y)
SV_TESTS.push({
    id: 'avail-aria-disabled-bare',
    label: 'Availability — legend/query aria-disabled=true on bare map',
    group: 'Availability',
    type: 'visual',
    params: {},
    assert: function(hc, ev, queryDOM) {
        return Promise.all([
            queryDOM('[data-sv-panel="legend"]', 'aria-disabled'),
            queryDOM('[data-sv-panel="query"]', 'aria-disabled')
        ]).then(function(r) {
            if (r[0].value !== 'true') { throw new Error('legend aria-disabled not true: ' + r[0].value); }
            if (r[1].value !== 'true') { throw new Error('query aria-disabled not true: ' + r[1].value); }
        });
    }
});

// WMS map → legend + query enabled (live IGN layer, same source as suite 04)
SV_TESTS.push({
    id: 'avail-enabled-with-wms',
    label: 'Availability — legend + query enabled when a WMS layer is loaded',
    group: 'Availability',
    type: 'visual',
    params: {
        layers: 'ORTHOIMAGERY.ORTHOPHOTOS@https://data.geopf.fr/wms-r/wms',
        z: 7, x: -200000, y: 6100000
    },
    assert: function(hc, ev, queryDOM) {
        return Promise.all([
            queryDOM('[data-sv-panel="legend"]', 'disabled'),
            queryDOM('[data-sv-panel="query"]', 'disabled')
        ]).then(function(r) {
            if (r[0].value === true) { throw new Error('legend still disabled with WMS loaded'); }
            if (r[1].value === true) { throw new Error('query still disabled with WMS loaded'); }
        });
    }
});
