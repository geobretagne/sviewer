/**
 * Sample extension — complete reference implementation for extension authors.
 *
 * Demonstrates the current (0.16) extension surface:
 *   - toolbar toggle button with correct aria + sv-alt-toggle pattern
 *   - side panel: panel.open({ fullscreen }), panel.update, panel.onClose cleanup
 *   - data: loadFeatures, selectFeature
 *   - events: onFeaturesLoaded, onFeatureClick, onFeatureSelect
 *   - environment: isInstalled(), getPermalink(), extensionBase()
 *
 * Activate in customConfig.js:
 *   customConfig = { extensions: ['sample'] };
 * Or via URL: index.html?ext=sample
 *
 * Full API reference: ext/EXT_API.md
 */

(function () {
    'use strict';

    var PANEL = 'sample';

    // extensionBase() reads document.currentScript — only valid during synchronous
    // module execution. Capture it now, never inside a callback. (See EXT_API.md.)
    var BASE = SViewer.extensionBase();

    SViewer.onMapReady(function (ctx) {
        var map = ctx.map;   // ol.Map — full OpenLayers API available
        var active = false;

        // --- Toolbar button -----------------------------------------------
        // sv-alt-toggle: the button keeps its active state even when another
        // panel opens, so it pairs with panel.onClose() for correct feedback.
        var toolbar = document.getElementById('sv-panel-controls');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-dark sv-map-btn sv-alt-toggle';
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'Sample extension');
        // Inline bi-stars SVG (not the font) — extension icons are inline SVG by
        // convention; only core uses the bi webfont. Real Bootstrap-Icons path data.
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.73 1.73 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.73 1.73 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732L9.1 2.137a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z"/></svg>';
        toolbar.appendChild(btn);

        btn.addEventListener('click', function () {
            if (active) { SViewer.panel.close(); return; }   // toggle off
            openPanel();
        });

        // --- Panel lifecycle ----------------------------------------------
        function openPanel() {
            active = true;
            btn.setAttribute('aria-pressed', 'true');
            btn.classList.add('active');

            // fullscreen: true → on phones (≤600px) the panel fills the screen
            // instead of floating. Right for a content/list/settings panel that
            // does not need the map visible. Omit it for map-coupled panels.
            SViewer.panel.open(PANEL, 'Sample extension', panelHtml(), { fullscreen: true });

            // Wire the in-panel buttons (panel HTML is innerHTML, so query after open).
            var root = document.getElementById('sv-panel-ext-' + PANEL) || document;
            var loadBtn = root.querySelector('.sample-load');
            if (loadBtn) { loadBtn.addEventListener('click', loadDemoFeatures); }

            var copyBtn = root.querySelector('.sample-permalink');
            if (copyBtn) {
                copyBtn.addEventListener('click', function () {
                    // getPermalink() returns the exact URL the share panel builds.
                    // Always use it — never assemble a permalink by hand.
                    navigator.clipboard.writeText(SViewer.getPermalink());
                    copyBtn.textContent = 'Copié ✓';
                });
            }
        }

        // onClose fires when the user dismisses the panel (× button, another
        // panel opening, or panel.close()). Reset toolbar state and clean up here.
        SViewer.panel.onClose(PANEL, function () {
            active = false;
            btn.setAttribute('aria-pressed', 'false');
            btn.classList.remove('active');
        });

        function panelHtml() {
            // isInstalled() is true only in an installed standalone PWA — used here
            // just to show how to branch installed-only UI.
            var mode = SViewer.isInstalled() ? 'application installée' : 'navigateur';
            return [
                '<p>Exemple de référence. Voir <code>ext/sample/extension.js</code>.</p>',
                '<p>Mode : <strong>' + mode + '</strong></p>',
                '<button type="button" class="btn btn-primary btn-sm sample-load">',
                '  Charger 3 points de démo</button>',
                '<button type="button" class="btn btn-outline-secondary btn-sm sample-permalink">',
                '  Copier le permalien</button>'
            ].join('');
        }

        // --- Event listeners ----------------------------------------------
        SViewer.onFeaturesLoaded(function (e) {
            // Progressive update — only the panel owner can update it.
            SViewer.panel.update(PANEL, panelHtml() +
                '<p class="text-success">' + e.count + ' entités chargées.</p>');
        });

        SViewer.onFeatureClick(function (e) {
            console.log('[sample] feature clicked:', e.feature.getId(), e.properties);
        });

        SViewer.onFeatureSelect(function (e) {
            if (!e.feature) { return; }   // deselect — argument is never null itself
            console.log('[sample] feature selected:', e.properties);
        });

        // --- Demo data ----------------------------------------------------
        function loadDemoFeatures() {
            // GeoJSON in EPSG:4326 — sViewer reprojects to EPSG:3857.
            var geojson = {
                type: 'FeatureCollection',
                features: [
                    point('sample-1', 'Brest',  -4.486, 48.390, 139388),
                    point('sample-2', 'Rennes', -1.678, 48.117, 222561),
                    point('sample-3', 'Vannes', -2.760, 47.658,  54954)
                ]
            };
            SViewer.loadFeatures(geojson);
            // Layer is built asynchronously — select after a short delay.
            setTimeout(function () { SViewer.selectFeature('sample-1'); }, 300);
        }

        function point(id, name, lon, lat, population) {
            return {
                type: 'Feature',
                id: id,   // top-level id — selectFeature matches this first
                geometry: { type: 'Point', coordinates: [lon, lat] },
                properties: { name: name, population: population }
            };
        }

        // BASE is available for asset loading, e.g. BASE + 'data.json'.
        void BASE;
    });
}());
