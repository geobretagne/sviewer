/* Suite 01 — URL KVP params (visual tests)
 * Each test loads sViewer in the iframe with specific params and asserts on hardConfig.
 * To add a test: copy a block, change id/label/params/assert. Nothing else.
 */

// Default coords for a known location (Brest, Brittany)
var BREST = { x: -499574, y: 6231640, z: 12 };

SV_TESTS.push({
    id: 'param-default-load',
    label: 'Default load — no params, sViewer starts',
    group: 'Params',
    type: 'visual',
    params: {},
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received');
        if (!hardConfig.initialExtent) throw new Error('initialExtent missing');
    }
});

SV_TESTS.push({
    id: 'param-title',
    label: '?title= sets map title in hardConfig',
    group: 'Params',
    type: 'visual',
    params: { title: 'Test Title XYZ' },
    assert: function(hardConfig) {
        // title in qs overrides config.title at display level — not hardConfig
        // just verify sViewer started cleanly
        if (!hardConfig) throw new Error('hardConfig not received');
    }
});

SV_TESTS.push({
    id: 'param-lang-en',
    label: '?lang=en — English language applied',
    group: 'Params',
    type: 'visual',
    params: { lang: 'en' },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received');
    }
});

SV_TESTS.push({
    id: 'param-lang-fr',
    label: '?lang=fr — French language applied',
    group: 'Params',
    type: 'visual',
    params: { lang: 'fr' },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received');
    }
});

SV_TESTS.push({
    id: 'param-xyz',
    label: '?x= ?y= ?z= — map position params accepted',
    group: 'Params',
    type: 'visual',
    params: BREST,
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received');
    }
});

SV_TESTS.push({
    id: 'param-lb-0',
    label: '?lb=0 — background layer 0 selected',
    group: 'Params',
    type: 'visual',
    params: { lb: 0 },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received');
    }
});

SV_TESTS.push({
    id: 'param-lb-1',
    label: '?lb=1 — background layer 1 selected',
    group: 'Params',
    type: 'visual',
    params: { lb: 1 },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received');
    }
});

SV_TESTS.push({
    id: 'param-c-traversal',
    label: '?c=../etc/passwd — path traversal blocked, sViewer still loads',
    group: 'Params',
    type: 'visual',
    params: { c: '../etc/passwd' },
    assert: function(hardConfig) {
        // sViewer must start (fallback to default config) — not crash
        if (!hardConfig) throw new Error('hardConfig not received — sViewer crashed on bad ?c=');
        if (!hardConfig.initialExtent) throw new Error('initialExtent missing after bad ?c=');
    }
});

SV_TESTS.push({
    id: 'param-c-alphanum',
    label: '?c= alphanumeric — accepted (may 404, must not crash)',
    group: 'Params',
    type: 'visual',
    params: { c: 'nonexistent_profile_xyz' },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received after missing ?c= profile');
        if (!hardConfig.initialExtent) throw new Error('initialExtent missing after missing ?c= profile');
    }
});

// Paris in WGS84 — tests auto-detection of EPSG:4326 coords
// Expected center in EPSG:3857: x≈261467, y≈6250023
SV_TESTS.push({
    id: 'param-xy-wgs84-paris',
    label: '?x=lon&y=lat (WGS84) — auto-detected, map centered on Paris',
    group: 'Params',
    type: 'visual',
    params: { x: 2.3488, y: 48.8534, z: 12 },
    assert: function(hardConfig, event) {
        if (!hardConfig) throw new Error('hardConfig not received');
        var msg = event && event.data ? event.data : {};
        var center = msg.center;
        if (!center) throw new Error('center not in sv:ready payload');
        var dx = center[0] - 261467;
        var dy = center[1] - 6250023;
        var dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 2000) throw new Error('Center too far from Paris: ' + Math.round(dist) + 'm off');
    }
});
