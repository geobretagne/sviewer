/* Suite 02 — hardConfig / customConfig merge (visual tests)
 * Each test loads sViewer in the iframe. ?c=test loads local/customConfig_test.js
 * with known fixed values. Assert on the hardConfig received via sv:ready postMessage.
 *
 * Fixed values in customConfig_test.js:
 *   title: 'sViewer Test Profile'
 *   initialExtent: [-582000, 5977000, -104000, 6268000]
 *   maxFeatures: 7
 */

SV_TESTS.push({
    id: 'merge-default-title',
    label: 'No ?c= — hardConfig has a non-empty title',
    group: 'Config',
    type: 'visual',
    params: {},
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received');
        if (typeof hardConfig.title !== 'string' || !hardConfig.title) {
            throw new Error('hardConfig.title missing or empty, got: ' + hardConfig.title);
        }
    }
});

SV_TESTS.push({
    id: 'merge-custom-title',
    label: '?c=test — customConfig.title overrides default',
    group: 'Config',
    type: 'visual',
    params: { c: 'test' },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received');
        if (hardConfig.title !== 'sViewer Test Profile') {
            throw new Error('expected "sViewer Test Profile", got "' + hardConfig.title + '"');
        }
    }
});

SV_TESTS.push({
    id: 'merge-extent',
    label: '?c=test — customConfig.initialExtent overrides default',
    group: 'Config',
    type: 'visual',
    params: { c: 'test' },
    assert: function(hardConfig) {
        if (!hardConfig || !hardConfig.initialExtent) throw new Error('initialExtent missing');
        if (hardConfig.initialExtent[0] !== -582000) {
            throw new Error('expected -582000, got ' + hardConfig.initialExtent[0]);
        }
    }
});

SV_TESTS.push({
    id: 'merge-maxfeatures',
    label: '?c=test — customConfig.maxFeatures overrides default (7)',
    group: 'Config',
    type: 'visual',
    params: { c: 'test' },
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received');
        if (hardConfig.maxFeatures !== 7) {
            throw new Error('expected 7, got ' + hardConfig.maxFeatures);
        }
    }
});

SV_TESTS.push({
    id: 'merge-projcode',
    label: 'hardConfig.projcode defaults to EPSG:3857',
    group: 'Config',
    type: 'visual',
    params: {},
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received');
        if (hardConfig.projcode !== 'EPSG:3857') {
            throw new Error('expected EPSG:3857, got ' + hardConfig.projcode);
        }
    }
});

SV_TESTS.push({
    id: 'merge-missing-key',
    label: 'Missing customConfig key — hardConfig default present (openLSGeocodeUrl)',
    group: 'Config',
    type: 'visual',
    params: {},
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received');
        if (!hardConfig.openLSGeocodeUrl) {
            throw new Error('openLSGeocodeUrl missing — hardConfig default not applied');
        }
    }
});

SV_TESTS.push({
    id: 'merge-background-presets',
    label: 'hardConfig.backgroundPresets is an array with entries',
    group: 'Config',
    type: 'visual',
    params: {},
    assert: function(hardConfig) {
        if (!hardConfig) throw new Error('hardConfig not received');
        if (!Array.isArray(hardConfig.backgroundPresets) || hardConfig.backgroundPresets.length === 0) {
            throw new Error('backgroundPresets missing or empty');
        }
        var p = hardConfig.backgroundPresets[0];
        if (typeof p.lb === 'undefined' || typeof p.title === 'undefined') {
            throw new Error('backgroundPreset entry missing lb or title');
        }
    }
});
