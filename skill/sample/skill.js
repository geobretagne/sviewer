/**
 * Sample skill — reference implementation for skill authors.
 *
 * Demonstrates: toolbar button, loadFeatureObjects, onFeatureClick,
 * onFeatureSelect, onFeaturesLoaded, selectFeature, refreshVector.
 *
 * Activate in customConfig.js:
 *   customConfig = { skills: ['sample'] };
 *
 * Full API reference: skill/SKILL_API.md
 */

SViewer.onMapReady(({ map, view }) => {

    // --- Toolbar button ---------------------------------------------------
    const toolbar = document.getElementById('sv-skill-toolbar');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-dark sv-map-btn';
    btn.title = 'Sample skill — load demo features';
    btn.innerHTML = '<i class="bi bi-stars" aria-hidden="true"></i>';
    btn.addEventListener('click', loadDemoFeatures);
    toolbar.appendChild(btn);

    // --- Event listeners --------------------------------------------------
    SViewer.onFeaturesLoaded(({ count }) => {
        console.log('[sample skill] features loaded:', count);
    });

    SViewer.onFeatureClick(({ feature, properties }) => {
        console.log('[sample skill] feature clicked:', feature.getId(), properties);
    });

    SViewer.onFeatureSelect((e) => {
        if (!e) { return; } // deselect
        console.log('[sample skill] feature selected:', e.properties);
    });

    // --- Demo data --------------------------------------------------------
    function loadDemoFeatures() {
        // Three points in EPSG:4326 — sViewer reprojects to EPSG:3857
        const geojson = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    id: 'sample-1',
                    geometry: { type: 'Point', coordinates: [-4.486, 48.390] },
                    properties: { name: 'Brest', population: 139388 }
                },
                {
                    type: 'Feature',
                    id: 'sample-2',
                    geometry: { type: 'Point', coordinates: [-1.678, 48.117] },
                    properties: { name: 'Rennes', population: 222561 }
                },
                {
                    type: 'Feature',
                    id: 'sample-3',
                    geometry: { type: 'Point', coordinates: [-2.760, 47.658] },
                    properties: { name: 'Vannes', population: 54954 }
                }
            ]
        };

        SViewer.loadFeatures(geojson);

        // Select first feature after short delay (map needs to build the layer)
        setTimeout(() => SViewer.selectFeature('sample-1'), 300);
    }
});
