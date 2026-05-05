/* Suite 03 — i18n key coverage (unit tests)
 * Verifies all keys exist in all 4 languages and return non-empty strings.
 * No network needed.
 */

var I18N_REQUIRED_KEYS = [
    'btn.background', 'btn.copied', 'btn.copy', 'btn.embed', 'btn.embed_label',
    'btn.fullscreen', 'btn.initial_view', 'btn.overlay', 'btn.panel_legend',
    'btn.panel_locate', 'btn.panel_map', 'btn.panel_query', 'btn.permalink',
    'btn.permalink_label', 'btn.skip_to_map', 'btn.snapshot', 'btn.snapshot_label',
    'btn.where_am_i', 'btn.zoom_in', 'btn.zoom_out',
    'inp.search_placeholder',
    'lbl.dark_theme', 'lbl.edit_title', 'lbl.geocode_results', 'lbl.layer_opacity',
    'lbl.query_the_map', 'lbl.search_place',
    'msg.adapter_not_loaded', 'msg.csw_error', 'msg.csw_no_wms',
    'msg.estimating_position', 'msg.feature_count', 'msg.full_record',
    'msg.geolocation_failed', 'msg.gps_tracking_off', 'msg.gps_tracking_on',
    'msg.legend_of', 'msg.meta_contact', 'msg.meta_date', 'msg.meta_licence',
    'msg.meta_producer', 'msg.new_tab', 'msg.no_item_found', 'msg.position_error',
    'msg.position_unavailable', 'msg.query_failed', 'msg.search_hint',
    'msg.source', 'msg.source_url', 'msg.top_layer',
    'panel.config.title', 'panel.embed_modal.hint_iframe', 'panel.embed_modal.hint_js',
    'panel.embed_modal.tab_iframe', 'panel.embed_modal.tab_js', 'panel.embed_modal.title',
    'panel.legend.title', 'panel.link_modal.title', 'panel.locate.title', 'panel.query.title'
];

var I18N_LANGS = ['en', 'fr', 'es', 'de'];

function makeI18nTest(lang) {
    return {
        id: 'i18n-coverage-' + lang,
        label: 'i18n [' + lang + '] — all keys defined, non-empty',
        group: 'i18n',
        type: 'unit',
        config: { lang: lang },
        assert: function(hardConfig) {
            if (!hardConfig.i18n) throw new Error('hardConfig.i18n missing');
            var dict = hardConfig.i18n[lang];
            if (!dict) throw new Error('language "' + lang + '" missing from i18n');
            var missing = [];
            var empty = [];
            I18N_REQUIRED_KEYS.forEach(function(key) {
                if (!(key in dict)) { missing.push(key); }
                else if (!dict[key] || typeof dict[key] !== 'string') { empty.push(key); }
            });
            if (missing.length) throw new Error('missing keys: ' + missing.join(', '));
            if (empty.length) throw new Error('empty/non-string keys: ' + empty.join(', '));
        }
    };
}

I18N_LANGS.forEach(function(lang) {
    SV_TESTS.push(makeI18nTest(lang));
});

SV_TESTS.push({
    id: 'i18n-no-extra-langs',
    label: 'i18n — exactly 4 languages defined (fr, en, es, de)',
    group: 'i18n',
    type: 'unit',
    config: {},
    assert: function(hardConfig) {
        if (!hardConfig.i18n) throw new Error('hardConfig.i18n missing');
        var langs = Object.keys(hardConfig.i18n).sort().join(',');
        var expected = ['de', 'en', 'es', 'fr'].join(',');
        if (langs !== expected) {
            throw new Error('expected ' + expected + ', got ' + langs);
        }
    }
});

SV_TESTS.push({
    id: 'i18n-key-parity',
    label: 'i18n — all languages have identical key sets',
    group: 'i18n',
    type: 'unit',
    config: {},
    assert: function(hardConfig) {
        if (!hardConfig.i18n) throw new Error('hardConfig.i18n missing');
        var refKeys = Object.keys(hardConfig.i18n['en'] || {}).sort().join(',');
        var mismatched = [];
        I18N_LANGS.forEach(function(lang) {
            if (lang === 'en') return;
            var keys = Object.keys(hardConfig.i18n[lang] || {}).sort().join(',');
            if (keys !== refKeys) mismatched.push(lang);
        });
        if (mismatched.length) {
            throw new Error('key sets differ from [en] in: ' + mismatched.join(', '));
        }
    }
});
