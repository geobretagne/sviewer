/* Suite 02 — hardConfig / customConfig merge (unit tests)
 * Tests run in same window via embed.js. window.customConfig set inline before init.
 * No network needed — pure config logic.
 *
 * NOTE: unit tests share the same window. embed.js is loaded once.
 * window.customConfig is set per-test before SViewer.onReady fires.
 */

SV_TESTS.push({
    id: 'merge-default-title',
    label: 'No customConfig — hardConfig default title is "sViewer"',
    group: 'Config',
    type: 'unit',
    config: {},
    assert: function(hardConfig) {
        if (hardConfig.title !== 'sViewer') {
            throw new Error('expected "sViewer", got "' + hardConfig.title + '"');
        }
    }
});

SV_TESTS.push({
    id: 'merge-custom-title',
    label: 'customConfig.title overrides hardConfig default',
    group: 'Config',
    type: 'unit',
    config: { title: 'My Custom Title' },
    assert: function(hardConfig) {
        if (hardConfig.title !== 'My Custom Title') {
            throw new Error('expected "My Custom Title", got "' + hardConfig.title + '"');
        }
    }
});

SV_TESTS.push({
    id: 'merge-extent',
    label: 'customConfig.initialExtent overrides hardConfig default',
    group: 'Config',
    type: 'unit',
    config: { initialExtent: [-582000, 5977000, -104000, 6268000] },
    assert: function(hardConfig) {
        if (!hardConfig.initialExtent) throw new Error('initialExtent missing');
        if (hardConfig.initialExtent[0] !== -582000) {
            throw new Error('expected -582000, got ' + hardConfig.initialExtent[0]);
        }
    }
});

SV_TESTS.push({
    id: 'merge-missing-key',
    label: 'Missing customConfig key — hardConfig default present',
    group: 'Config',
    type: 'unit',
    config: { title: 'Only Title' },
    assert: function(hardConfig) {
        if (!hardConfig.openLSGeocodeUrl) {
            throw new Error('openLSGeocodeUrl missing — hardConfig default not applied');
        }
        if (!hardConfig.geocodeAdapter || typeof hardConfig.geocodeAdapter !== 'function') {
            throw new Error('geocodeAdapter missing or not a function');
        }
    }
});

SV_TESTS.push({
    id: 'merge-projcode',
    label: 'hardConfig.projcode defaults to EPSG:3857',
    group: 'Config',
    type: 'unit',
    config: {},
    assert: function(hardConfig) {
        if (hardConfig.projcode !== 'EPSG:3857') {
            throw new Error('expected EPSG:3857, got ' + hardConfig.projcode);
        }
    }
});

SV_TESTS.push({
    id: 'merge-maxfeatures',
    label: 'hardConfig.maxFeatures defaults to 3',
    group: 'Config',
    type: 'unit',
    config: {},
    assert: function(hardConfig) {
        if (typeof hardConfig.maxFeatures !== 'number') {
            throw new Error('maxFeatures not a number: ' + typeof hardConfig.maxFeatures);
        }
    }
});

SV_TESTS.push({
    id: 'merge-background-presets',
    label: 'hardConfig.backgroundPresets is an array with entries',
    group: 'Config',
    type: 'unit',
    config: {},
    assert: function(hardConfig) {
        if (!Array.isArray(hardConfig.backgroundPresets) || hardConfig.backgroundPresets.length === 0) {
            throw new Error('backgroundPresets missing or empty');
        }
        var p = hardConfig.backgroundPresets[0];
        if (typeof p.lb === 'undefined' || typeof p.title === 'undefined') {
            throw new Error('backgroundPreset entry missing lb or title');
        }
    }
});

SV_TESTS.push({
    id: 'merge-layers-background',
    label: 'hardConfig.layersBackground is an array with OL layer objects',
    group: 'Config',
    type: 'unit',
    config: {},
    assert: function(hardConfig) {
        if (!Array.isArray(hardConfig.layersBackground) || hardConfig.layersBackground.length === 0) {
            throw new Error('layersBackground missing or empty');
        }
    }
});
