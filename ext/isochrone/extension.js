/**
 * Isochrone extension — IGN Géoplateforme isochrone/isodistance.
 *
 * Activate:
 *   customConfig = { extensions: ['isochrone'] };
 *   or ?ext=isochrone
 *
 * API: https://data.geopf.fr/navigation/isochrone
 */
(function () {
    'use strict';

    var PANEL = 'isochrone';
    var API   = 'https://data.geopf.fr/navigation/isochrone';

    var pickingPoint = false;
    var currentPoint = null;  // [lon, lat] EPSG:4326
    var btnEl        = null;
    var active       = false;

    // --- Toolbar button ---------------------------------------------------

    SViewer.onMapReady(function (ctx) {
        var map  = ctx.map;
        var view = ctx.view;

        var toolbar = document.getElementById('sv-panel-controls');
        btnEl = document.createElement('button');
        btnEl.type = 'button';
        btnEl.className = 'btn btn-dark sv-map-btn';
        btnEl.title = 'Isochrone / Isodistance';
        btnEl.setAttribute('aria-pressed', 'false');
        btnEl.setAttribute('aria-label', 'Isochrone / Isodistance');
        btnEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M8.5 5.6a.5.5 0 1 0-1 0v2.9h-3a.5.5 0 0 0 0 1H8a.5.5 0 0 0 .5-.5z"/><path d="M6.5 1A.5.5 0 0 1 7 .5h2a.5.5 0 0 1 0 1v.57c1.36.196 2.594.78 3.584 1.64l.012-.013.354-.354-.354-.353a.5.5 0 0 1 .707-.708l1.414 1.415a.5.5 0 1 1-.707.707l-.353-.354-.354.354-.013.012A7 7 0 1 1 7 2.071V1.5a.5.5 0 0 1-.5-.5M8 3a6 6 0 1 0 .001 12A6 6 0 0 0 8 3"/></svg>';
        toolbar.appendChild(btnEl);

        btnEl.addEventListener('click', function () {
            active = !active;
            btnEl.setAttribute('aria-pressed', String(active));
            btnEl.classList.toggle('active', active);
            if (active) {
                openPanel();
            } else {
                SViewer.panel.close();
                stopPicking();
            }
        });

        // Map click for point picking
        SViewer.addClickHandler(function (evt) {
            if (!pickingPoint) { return; }
            var coord = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
            currentPoint = [
                Math.round(coord[0] * 1e6) / 1e6,
                Math.round(coord[1] * 1e6) / 1e6
            ];
            stopPicking();
            updatePointDisplay();
            return true; // consume click
        });
    });

    // --- Panel ------------------------------------------------------------

    function openPanel() {
        SViewer.panel.open(PANEL, 'Isochrone / Isodistance', buildPanelHtml());
        bindPanelEvents();
    }

    function buildPanelHtml() {
        var pointLabel = currentPoint
            ? currentPoint[0].toFixed(5) + ', ' + currentPoint[1].toFixed(5)
            : '— cliquez sur « Choisir » puis sur la carte —';
        return [
            '<div style="padding:0.75rem;display:flex;flex-direction:column;gap:0.75rem">',

            // Point
            '<div>',
            '<label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.25rem">Point de départ</label>',
            '<div style="display:flex;gap:.4rem;align-items:center">',
            '<span id="sv-iso-point-label" style="flex:1;font-size:.8rem;color:#aaa">' + pointLabel + '</span>',
            '<button id="sv-iso-pick" type="button" class="btn btn-sm btn-outline-secondary" style="white-space:nowrap">Choisir sur la carte</button>',
            '</div>',
            '</div>',

            // Profile
            '<div>',
            '<label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.25rem">Profil</label>',
            '<div style="display:flex;gap:.5rem">',
            '<button type="button" class="btn btn-sm btn-outline-secondary sv-iso-profile active" data-value="pedestrian" aria-pressed="true">Piéton</button>',
            '<button type="button" class="btn btn-sm btn-outline-secondary sv-iso-profile" data-value="car" aria-pressed="false">Voiture</button>',
            '</div>',
            '</div>',

            // Cost type
            '<div>',
            '<label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.25rem">Type</label>',
            '<div style="display:flex;gap:.5rem">',
            '<button type="button" class="btn btn-sm btn-outline-secondary sv-iso-costtype active" data-value="time" aria-pressed="true">Temps</button>',
            '<button type="button" class="btn btn-sm btn-outline-secondary sv-iso-costtype" data-value="distance" aria-pressed="false">Distance</button>',
            '</div>',
            '</div>',

            // Cost value
            '<div id="sv-iso-cost-block">',
            '<label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.25rem">Durée (minutes)</label>',
            '<div style="display:flex;gap:.5rem;align-items:center">',
            '<input id="sv-iso-slider" type="range" min="1" max="60" value="10" style="flex:1">',
            '<input id="sv-iso-value" type="number" min="1" max="9999" value="10" aria-label="Valeur" style="width:4rem;text-align:right;background:#222;color:#fff;border:1px solid #444;border-radius:4px;padding:2px 4px">',
            '</div>',
            '</div>',

            // Submit
            '<button id="sv-iso-submit" type="button" class="btn btn-primary btn-sm">Calculer</button>',

            // Status
            '<div id="sv-iso-status" style="font-size:.8rem;color:#aaa;min-height:1.2rem"></div>',

            '</div>'
        ].join('');
    }

    function bindPanelEvents() {
        var pickBtn   = document.getElementById('sv-iso-pick');
        var slider    = document.getElementById('sv-iso-slider');
        var valueInp  = document.getElementById('sv-iso-value');
        var submitBtn = document.getElementById('sv-iso-submit');

        if (!pickBtn) { return; }

        // Pick button
        pickBtn.addEventListener('click', function () {
            startPicking();
        });

        // Profile toggle
        document.querySelectorAll('.sv-iso-profile').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.sv-iso-profile').forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                updateCostLabel();
            });
        });

        // Cost type toggle
        document.querySelectorAll('.sv-iso-costtype').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.sv-iso-costtype').forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                updateCostLabel();
            });
        });

        // Slider ↔ number input sync
        slider.addEventListener('input', function () { valueInp.value = slider.value; });
        valueInp.addEventListener('input', function () {
            var v = parseInt(valueInp.value, 10);
            if (!isNaN(v)) { slider.value = Math.min(v, 60); }
        });

        // Submit
        submitBtn.addEventListener('click', compute);
    }

    function updateCostLabel() {
        var costType = activeCostType();
        var block = document.getElementById('sv-iso-cost-block');
        var slider = document.getElementById('sv-iso-slider');
        if (!block || !slider) { return; }

        if (costType === 'time') {
            block.querySelector('label').textContent = 'Durée (minutes)';
            slider.max = 60;
            if (parseInt(slider.value, 10) > 60) { slider.value = 60; document.getElementById('sv-iso-value').value = 60; }
        } else {
            block.querySelector('label').textContent = 'Distance (km)';
            slider.max = 50;
            if (parseInt(slider.value, 10) > 50) { slider.value = 50; document.getElementById('sv-iso-value').value = 50; }
        }
    }

    function activeProfile()  { var el = document.querySelector('.sv-iso-profile.active');  return el ? el.dataset.value : 'pedestrian'; }
    function activeCostType() { var el = document.querySelector('.sv-iso-costtype.active'); return el ? el.dataset.value : 'time'; }

    // --- Point picking ----------------------------------------------------

    function startPicking() {
        pickingPoint = true;
        setStatus('Cliquez sur la carte pour définir le point de départ…');
        var pickBtn = document.getElementById('sv-iso-pick');
        if (pickBtn) { pickBtn.textContent = 'Annuler'; pickBtn.onclick = function () { stopPicking(); setStatus(''); }; }
        var mapEl = document.getElementById('sv-frame-map');
        if (mapEl) { mapEl.style.cursor = 'crosshair'; }
    }

    function stopPicking() {
        pickingPoint = false;
        var mapEl = document.getElementById('sv-frame-map');
        if (mapEl) { mapEl.style.cursor = ''; }
        var pickBtn = document.getElementById('sv-iso-pick');
        if (pickBtn) { pickBtn.textContent = 'Choisir sur la carte'; pickBtn.onclick = startPicking; }
    }

    function updatePointDisplay() {
        var label = document.getElementById('sv-iso-point-label');
        if (label && currentPoint) {
            label.textContent = currentPoint[0].toFixed(5) + ', ' + currentPoint[1].toFixed(5);
            label.style.color = '#fff';
        }
    }

    // --- Compute ----------------------------------------------------------

    function compute() {
        if (!currentPoint) {
            setStatus('Choisissez d\'abord un point de départ.');
            return;
        }

        var costType  = activeCostType();
        var profile   = activeProfile();
        var rawValue  = parseInt(document.getElementById('sv-iso-value').value, 10) || 10;
        // API expects seconds for time, meters for distance
        var costValue = costType === 'time' ? rawValue * 60 : rawValue * 1000;

        var params = new URLSearchParams({
            resource:       'bdtopo-valhalla',
            point:          currentPoint[0] + ',' + currentPoint[1],
            profile:        profile,
            costType:       costType,
            costValue:      String(costValue),
            direction:      'departure',
            geometryFormat: 'geojson',
            crs:            'EPSG:4326',
            timeUnit:       'second',
            distanceUnit:   'meter'
        });

        setStatus('Calcul en cours…');
        var submitBtn = document.getElementById('sv-iso-submit');
        if (submitBtn) { submitBtn.disabled = true; }

        fetch(API + '?' + params.toString())
            .then(function (r) {
                if (!r.ok) { throw new Error('HTTP ' + r.status); }
                return r.json();
            })
            .then(function (data) {
                if (!data.geometry) { throw new Error('Aucune géométrie dans la réponse'); }

                var labelParts = [];
                if (costType === 'time') {
                    labelParts.push(rawValue + ' min');
                } else {
                    labelParts.push(rawValue + ' km');
                }
                labelParts.push(profile === 'pedestrian' ? 'piéton' : 'voiture');

                SViewer.loadFeatures({
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        geometry: data.geometry,
                        properties: {
                            profile:   profile,
                            costType:  costType,
                            costValue: rawValue,
                            label:     labelParts.join(' · ')
                        }
                    }]
                });

                setStatus('Terminé — ' + labelParts.join(' · '));
            })
            .catch(function (err) {
                setStatus('Erreur : ' + err.message);
            })
            .finally(function () {
                var sb = document.getElementById('sv-iso-submit');
                if (sb) { sb.disabled = false; }
            });
    }

    // --- Helpers ----------------------------------------------------------

    function setStatus(msg) {
        var statusEl = document.getElementById('sv-iso-status');
        if (statusEl) { statusEl.textContent = msg; }
    }

}());
