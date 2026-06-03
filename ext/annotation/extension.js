/**
 * Annotation — lightweight sketch-and-share for sViewer.
 *
 * Phase 1 (no backend): draw markers / lines / zones, give each a label, colour
 * and note, save locally (localStorage), share via a single link (?draw=) or a
 * GeoJSON file. Built around five UX rules (see ext/annotation/SPEC.md):
 *   1. no jargon   2. easy selection (list, fat targets)   3. no click dilemma
 *   (explicit "Finish", no double-click)   4. typed mini-form, no free key/value
 *   5. one-gesture sharing.
 *
 * Activate: customConfig = { extensions: ['annotation'] };  or  ?ext=annotation
 * Full API reference: ext/EXT_API.md
 */
(function () {
    'use strict';

    var PANEL    = 'annotation';
    var LS_KEY   = 'sv_annotation_v1';
    var URL_PARAM = 'draw';
    var MAX_URL_BYTES = 6000;          // warn beyond this encoded size (~8 KB browser limit)
    var MAX_LABEL = 60;

    // Accessible palette (contrast-checked against light + dark map backgrounds).
    var COLORS = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#000000'];

    // --- i18n -----------------------------------------------------------------
    var I18N = {
        fr: {
            'btn.title':      'Annoter la carte',
            'panel.title':    'Annoter',
            'mode.point':     'Ajouter un repère',
            'mode.line':      'Tracer un trait',
            'mode.zone':      'Tracer une zone',
            'arm.point':      'Tapez sur la carte pour poser un repère.',
            'arm.line':       'Tapez pour ajouter des points, puis Terminer.',
            'arm.zone':       'Tapez pour ajouter des points, puis Terminer.',
            'btn.finish':     'Terminer',
            'btn.undo':       'Annuler le dernier point',
            'btn.cancel':     'Annuler',
            'list.empty':     'Aucune annotation. Choisissez une action ci-dessus.',
            'list.count':     'annotation(s)',
            'form.label':     'Libellé',
            'form.label.ph':  'Nom de l’annotation',
            'form.color':     'Couleur',
            'form.note':      'Note',
            'form.note.ph':   'Détail optionnel',
            'form.save':      'Enregistrer',
            'form.delete':    'Supprimer',
            'form.del.confirm': 'Supprimer cette annotation ?',
            'act.share':      'Partager',
            'act.export':     'Exporter (fichier)',
            'act.clear':      'Tout effacer',
            'clear.confirm':  'Effacer toutes les annotations ?',
            'share.copied':   'Lien copié ✓',
            'share.toobig':   'Dessin trop volumineux pour un lien — exportez un fichier.',
            'err.badlabel':   'Libellé trop long (max ' + MAX_LABEL + ' caractères).'
        },
        en: {
            'btn.title':      'Annotate the map',
            'panel.title':    'Annotate',
            'mode.point':     'Add a marker',
            'mode.line':      'Draw a line',
            'mode.zone':      'Draw a zone',
            'arm.point':      'Tap the map to drop a marker.',
            'arm.line':       'Tap to add points, then Finish.',
            'arm.zone':       'Tap to add points, then Finish.',
            'btn.finish':     'Finish',
            'btn.undo':       'Undo last point',
            'btn.cancel':     'Cancel',
            'list.empty':     'No annotations yet. Pick an action above.',
            'list.count':     'annotation(s)',
            'form.label':     'Label',
            'form.label.ph':  'Annotation name',
            'form.color':     'Colour',
            'form.note':      'Note',
            'form.note.ph':   'Optional detail',
            'form.save':      'Save',
            'form.delete':    'Delete',
            'form.del.confirm': 'Delete this annotation?',
            'act.share':      'Share',
            'act.export':     'Export (file)',
            'act.clear':      'Clear all',
            'clear.confirm':  'Clear all annotations?',
            'share.copied':   'Link copied ✓',
            'share.toobig':   'Drawing too large for a link — export a file instead.',
            'err.badlabel':   'Label too long (max ' + MAX_LABEL + ' characters).'
        },
        es: {
            'btn.title':      'Anotar el mapa',
            'panel.title':    'Anotar',
            'mode.point':     'Añadir un punto',
            'mode.line':      'Trazar una línea',
            'mode.zone':      'Trazar una zona',
            'arm.point':      'Toque el mapa para colocar un punto.',
            'arm.line':       'Toque para añadir puntos, luego Terminar.',
            'arm.zone':       'Toque para añadir puntos, luego Terminar.',
            'btn.finish':     'Terminar',
            'btn.undo':       'Deshacer el último punto',
            'btn.cancel':     'Cancelar',
            'list.empty':     'Sin anotaciones. Elija una acción arriba.',
            'list.count':     'anotación(es)',
            'form.label':     'Etiqueta',
            'form.label.ph':  'Nombre de la anotación',
            'form.color':     'Color',
            'form.note':      'Nota',
            'form.note.ph':   'Detalle opcional',
            'form.save':      'Guardar',
            'form.delete':    'Eliminar',
            'form.del.confirm': '¿Eliminar esta anotación?',
            'act.share':      'Compartir',
            'act.export':     'Exportar (archivo)',
            'act.clear':      'Borrar todo',
            'clear.confirm':  '¿Borrar todas las anotaciones?',
            'share.copied':   'Enlace copiado ✓',
            'share.toobig':   'Dibujo demasiado grande para un enlace — exporte un archivo.',
            'err.badlabel':   'Etiqueta demasiado larga (máx. ' + MAX_LABEL + ' caracteres).'
        },
        de: {
            'btn.title':      'Karte annotieren',
            'panel.title':    'Annotieren',
            'mode.point':     'Markierung hinzufügen',
            'mode.line':      'Linie zeichnen',
            'mode.zone':      'Fläche zeichnen',
            'arm.point':      'Tippen Sie auf die Karte, um eine Markierung zu setzen.',
            'arm.line':       'Tippen zum Hinzufügen von Punkten, dann Fertig.',
            'arm.zone':       'Tippen zum Hinzufügen von Punkten, dann Fertig.',
            'btn.finish':     'Fertig',
            'btn.undo':       'Letzten Punkt rückgängig',
            'btn.cancel':     'Abbrechen',
            'list.empty':     'Noch keine Annotationen. Wählen Sie oben eine Aktion.',
            'list.count':     'Annotation(en)',
            'form.label':     'Bezeichnung',
            'form.label.ph':  'Name der Annotation',
            'form.color':     'Farbe',
            'form.note':      'Notiz',
            'form.note.ph':   'Optionales Detail',
            'form.save':      'Speichern',
            'form.delete':    'Löschen',
            'form.del.confirm': 'Diese Annotation löschen?',
            'act.share':      'Teilen',
            'act.export':     'Exportieren (Datei)',
            'act.clear':      'Alle löschen',
            'clear.confirm':  'Alle Annotationen löschen?',
            'share.copied':   'Link kopiert ✓',
            'share.toobig':   'Zeichnung zu groß für einen Link — exportieren Sie eine Datei.',
            'err.badlabel':   'Bezeichnung zu lang (max. ' + MAX_LABEL + ' Zeichen).'
        }
    };
    function lang() {
        var l = (SViewer.state && SViewer.state.lang) || (SViewer.config && SViewer.config.lang) || 'fr';
        return I18N[l] ? l : 'fr';
    }
    function t(key) {
        var L = I18N[lang()];
        return (L && L[key]) || I18N.fr[key] || key;
    }

    // --- HTML escaping --------------------------------------------------------
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    SViewer.onMapReady(function (ctx) {
        var map = ctx.map;

        // --- State ------------------------------------------------------------
        var items   = [];        // [{ id, type, coords(4326), label, color, note }]
        var active  = false;     // panel/draw mode on
        var selId   = null;      // selected annotation id
        var draw    = null;      // active ol.interaction.Draw
        var drawMode = null;     // 'point' | 'line' | 'zone'
        var nextId  = 1;

        // --- Vector layer (its own — never touches ?geojson= data) ------------
        var source = new ol.source.Vector();
        var layer  = new ol.layer.Vector({ source: source, zIndex: 950, style: styleFor });
        map.addLayer(layer);

        function styleFor(feature) {
            var color = feature.get('color') || COLORS[0];
            var selected = feature.get('id') === selId;
            var width = selected ? 4 : 2.5;
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: selected ? 9 : 7,
                    fill:   new ol.style.Fill({ color: color }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
                }),
                stroke: new ol.style.Stroke({ color: color, width: width }),
                fill:   new ol.style.Fill({ color: hexA(color, selected ? 0.25 : 0.15) }),
                text: feature.get('label') ? new ol.style.Text({
                    text: feature.get('label'),
                    offsetY: -14,
                    font: '12px system-ui, sans-serif',
                    fill:   new ol.style.Fill({ color: '#222' }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 3 })
                }) : undefined
            });
        }
        function hexA(hex, a) {
            var n = parseInt(hex.slice(1), 16);
            return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
        }

        // --- Geometry helpers (EPSG:4326 storage, 3857 on map) ----------------
        // Use the GeoJSON format reader (in the OL build) rather than geom
        // constructors: the custom build only exports Point/LineString geoms,
        // not Polygon/MultiPoint. The reader builds any geom type and reprojects.
        var geojsonFmt = new ol.format.GeoJSON();
        function itemGeoJSON(item) {
            if (item.type === 'point') { return { type: 'Point', coordinates: item.coords }; }
            if (item.type === 'line')  { return { type: 'LineString', coordinates: item.coords }; }
            return { type: 'Polygon', coordinates: [item.coords] };
        }
        function geomFor(item) {
            return geojsonFmt.readGeometry(itemGeoJSON(item), {
                dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'
            });
        }
        function rebuildLayer() {
            source.clear();
            items.forEach(function (it) {
                var f = new ol.Feature({ geometry: geomFor(it) });
                f.set('id', it.id); f.set('color', it.color); f.set('label', it.label);
                source.addFeature(f);
            });
        }

        // --- Persistence ------------------------------------------------------
        function save() {
            try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch (e) { /* quota */ }
        }
        function loadLocal() {
            try {
                var a = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
                if (Array.isArray(a)) { items = a.filter(validItem); }
            } catch (e) { items = []; }
            reindex();
        }
        function reindex() {
            nextId = 1;
            items.forEach(function (it) { if (it.id >= nextId) { nextId = it.id + 1; } });
        }
        function validItem(it) {
            return it && typeof it === 'object'
                && ['point', 'line', 'zone'].indexOf(it.type) !== -1
                && Array.isArray(it.coords) && it.coords.length > 0;
        }

        // --- GeoJSON <-> items (share + export) -------------------------------
        function toGeoJSON() {
            return {
                type: 'FeatureCollection',
                features: items.map(function (it) {
                    var g = it.type === 'point'
                        ? { type: 'Point', coordinates: it.coords }
                        : it.type === 'line'
                            ? { type: 'LineString', coordinates: it.coords }
                            : { type: 'Polygon', coordinates: [it.coords] };
                    return { type: 'Feature', geometry: g,
                        properties: { label: it.label || '', color: it.color || COLORS[0], note: it.note || '' } };
                })
            };
        }
        function fromGeoJSON(fc) {
            if (!fc || fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) { return []; }
            var out = [];
            fc.features.forEach(function (f) {
                if (!f || !f.geometry) { return; }
                var g = f.geometry, p = f.properties || {};
                var type, coords;
                if (g.type === 'Point')          { type = 'point'; coords = g.coordinates; }
                else if (g.type === 'LineString') { type = 'line';  coords = g.coordinates; }
                else if (g.type === 'Polygon')    { type = 'zone';  coords = (g.coordinates || [])[0]; }
                else { return; }
                if (!Array.isArray(coords) || !coords.length) { return; }
                out.push({
                    id: out.length + 1, type: type, coords: coords,
                    label: String(p.label || '').slice(0, MAX_LABEL),
                    color: COLORS.indexOf(p.color) !== -1 ? p.color : COLORS[0],
                    note: String(p.note || '')
                });
            });
            return out;
        }

        // --- URL payload (?draw=) — untrusted on read -------------------------
        function encodePayload() {
            var json = JSON.stringify(toGeoJSON());
            return btoa(unescape(encodeURIComponent(json)))
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }
        function decodePayload(str) {
            try {
                var b64 = str.replace(/-/g, '+').replace(/_/g, '/');
                var json = decodeURIComponent(escape(atob(b64)));
                if (json.length > 200000) { return []; }   // hard cap
                return fromGeoJSON(JSON.parse(json));
            } catch (e) { return []; }
        }

        // --- Draw interaction (principle 3: explicit finish, no double-click) -
        function arm(mode) {
            disarm();
            drawMode = mode;
            var olType = mode === 'point' ? 'Point' : mode === 'line' ? 'LineString' : 'Polygon';
            draw = new ol.interaction.Draw({ source: new ol.source.Vector(), type: olType });
            draw.on('drawend', function (e) {
                var g = e.feature.getGeometry();
                var coords;
                if (mode === 'point') { coords = ol.proj.toLonLat(g.getCoordinates()); }
                else if (mode === 'line') { coords = g.getCoordinates().map(toLL); }
                else { coords = (g.getCoordinates()[0] || []).map(toLL); }
                var it = { id: nextId++, type: mode, coords: coords, label: '', color: COLORS[0], note: '' };
                items.push(it);
                save(); rebuildLayer();
                disarm();
                selId = it.id;
                render();                              // opens the form for the new item
            });
            map.addInteraction(draw);
            render();
        }
        function toLL(c) { return ol.proj.toLonLat(c); }
        function disarm() {
            if (draw) { map.removeInteraction(draw); draw = null; }
            drawMode = null;
        }
        function undoVertex() { if (draw) { try { draw.removeLastPoint(); } catch (e) { /* none */ } } }

        document.addEventListener('keydown', function (e) {
            if (!active) { return; }
            if (e.key === 'Escape' && draw) { disarm(); render(); }
        });

        // --- Selection (principle 2) ------------------------------------------
        function selectItem(id, zoom) {
            selId = id;
            rebuildLayer();
            if (zoom) {
                var it = byId(id);
                if (it) {
                    var view = map.getView();
                    if (it.type === 'point') {
                        // Point has a zero-area extent — animate/center instead of fit (avoids over-zoom).
                        view.animate({ center: ol.proj.fromLonLat(it.coords),
                            zoom: Math.max(view.getZoom(), 16), duration: 350 });
                    } else {
                        view.fit(geomFor(it).getExtent(), { maxZoom: 17, duration: 350, padding: [60, 60, 60, 60] });
                    }
                }
            }
            render();
        }
        function byId(id) {
            for (var i = 0; i < items.length; i++) { if (items[i].id === id) { return items[i]; } }
            return null;
        }

        // --- Toolbar button ---------------------------------------------------
        var toolbar = document.getElementById('sv-panel-controls');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-dark sv-map-btn sv-alt-toggle';
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', t('btn.title'));
        btn.title = t('btn.title');
        btn.innerHTML = '<i class="bi bi-pencil" aria-hidden="true"></i>';
        toolbar.appendChild(btn);
        btn.addEventListener('click', function () {
            if (active) { SViewer.panel.close(); } else { open(); }
        });

        function open() {
            active = true;
            btn.setAttribute('aria-pressed', 'true');
            btn.classList.add('active');
            injectStyle();
            SViewer.panel.open(PANEL, t('panel.title'), '<div id="sv-anno-root"></div>', { fullscreen: true });
            render();
        }

        // Scoped to the panel element only — never leaks to the host page (see EXT_API.md).
        var styleInjected = false;
        function injectStyle() {
            if (styleInjected) { return; }
            styleInjected = true;
            var css = [
                '#sv-panel-ext-annotation .sv-anno-modes{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.75rem}',
                '#sv-panel-ext-annotation .sv-anno-modes .btn{flex:1 1 auto}',
                '#sv-panel-ext-annotation .sv-anno-empty{color:#666;font-size:.85rem;padding:.5rem 0}',
                '#sv-panel-ext-annotation .sv-anno-list{list-style:none;margin:0;padding:0}',
                '#sv-panel-ext-annotation .sv-anno-row{display:flex;align-items:center;gap:.5rem;padding:.45rem .25rem;border-bottom:1px solid var(--sv-panel-border,#e0e0e0);cursor:pointer}',
                '#sv-panel-ext-annotation .sv-anno-row:hover{background:rgba(127,127,127,.08)}',
                '#sv-panel-ext-annotation .sv-anno-dot{width:14px;height:14px;border-radius:50%;flex-shrink:0;border:1px solid rgba(0,0,0,.2)}',
                '#sv-panel-ext-annotation .sv-anno-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
                '#sv-panel-ext-annotation .sv-anno-del{margin-left:auto;line-height:1;padding:0 .4rem;background:transparent;border:none;color:#c0392b;font-size:1.1rem}',
                '#sv-panel-ext-annotation .sv-anno-count{font-size:.78rem;color:#666;margin:.4rem 0}',
                '#sv-panel-ext-annotation .sv-anno-actions{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.6rem}',
                '#sv-panel-ext-annotation .sv-anno-arm .sv-anno-hint{font-size:.9rem;margin:.25rem 0 .6rem}',
                '#sv-panel-ext-annotation .sv-anno-arm{display:flex;flex-direction:column;gap:.4rem;align-items:flex-start}',
                '#sv-panel-ext-annotation .sv-anno-lbl{display:block;font-size:.82rem;color:#555;margin:.5rem 0}',
                '#sv-panel-ext-annotation .sv-anno-lbl input,#sv-panel-ext-annotation .sv-anno-lbl textarea{display:block;width:100%;margin-top:.2rem;padding:.35rem .5rem;font-size:.9rem;border:1px solid var(--sv-panel-border,#ccc);border-radius:4px;background:var(--sv-panel-bg,#fff);color:inherit}',
                '#sv-panel-ext-annotation .sv-anno-swatches{display:flex;gap:.35rem;margin-top:.3rem}',
                '#sv-panel-ext-annotation .sv-anno-swatch{width:26px;height:26px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}',
                '#sv-panel-ext-annotation .sv-anno-swatch.sel{border-color:#222;box-shadow:0 0 0 2px #fff inset}',
                '#sv-panel-ext-annotation .sv-anno-msg{font-size:.82rem;color:#2e7d32;margin:.4rem 0;word-break:break-all}',
                '#sv-panel-ext-annotation .sv-anno-back{padding-left:0}'
            ].join('');
            var style = document.createElement('style');
            style.id = 'sv-anno-style';
            style.textContent = css;
            document.head.appendChild(style);
        }
        SViewer.panel.onClose(PANEL, function () {
            active = false; disarm(); selId = null;
            btn.setAttribute('aria-pressed', 'false');
            btn.classList.remove('active');
        });

        // --- Render (single rebuildable body, handlers bound after) -----------
        function render() {
            var root = document.getElementById('sv-anno-root');
            if (!root) { return; }
            root.innerHTML = drawMode ? armBar() : (selId ? formHtml() : listHtml());
            bind(root);
        }

        function armBar() {
            return '<div class="sv-anno-arm">' +
                '<p class="sv-anno-hint">' + esc(t('arm.' + drawMode)) + '</p>' +
                (drawMode !== 'point'
                    ? '<button type="button" class="btn btn-primary btn-sm" data-act="finish">' + esc(t('btn.finish')) + '</button>' +
                      '<button type="button" class="btn btn-outline-secondary btn-sm" data-act="undo">↶ ' + esc(t('btn.undo')) + '</button>'
                    : '') +
                '<button type="button" class="btn btn-link btn-sm" data-act="disarm">' + esc(t('btn.cancel')) + '</button>' +
                '</div>';
        }

        function listHtml() {
            var actions =
                '<div class="sv-anno-modes">' +
                '<button type="button" class="btn btn-outline-primary btn-sm" data-mode="point">' + esc(t('mode.point')) + '</button>' +
                '<button type="button" class="btn btn-outline-primary btn-sm" data-mode="line">' + esc(t('mode.line')) + '</button>' +
                '<button type="button" class="btn btn-outline-primary btn-sm" data-mode="zone">' + esc(t('mode.zone')) + '</button>' +
                '</div>';
            var list;
            if (!items.length) {
                list = '<p class="sv-anno-empty">' + esc(t('list.empty')) + '</p>';
            } else {
                list = '<ul class="sv-anno-list">' + items.map(function (it) {
                    return '<li class="sv-anno-row" data-id="' + it.id + '">' +
                        '<span class="sv-anno-dot" style="background:' + esc(it.color) + '"></span>' +
                        '<span class="sv-anno-name">' + (esc(it.label) || '<em>—</em>') + '</span>' +
                        '<button type="button" class="btn btn-sm sv-anno-del" data-del="' + it.id + '" aria-label="' + esc(t('form.delete')) + '">×</button>' +
                        '</li>';
                }).join('') + '</ul>' +
                '<p class="sv-anno-count">' + items.length + ' ' + esc(t('list.count')) + '</p>';
            }
            var share = items.length
                ? '<div class="sv-anno-actions">' +
                  '<button type="button" class="btn btn-success btn-sm" data-act="share">' + esc(t('act.share')) + '</button>' +
                  '<button type="button" class="btn btn-outline-secondary btn-sm" data-act="export">' + esc(t('act.export')) + '</button>' +
                  '<button type="button" class="btn btn-outline-danger btn-sm" data-act="clear">' + esc(t('act.clear')) + '</button>' +
                  '</div><p class="sv-anno-msg" id="sv-anno-msg" aria-live="polite"></p>'
                : '';
            return actions + list + share;
        }

        function formHtml() {
            var it = byId(selId);
            if (!it) { selId = null; return listHtml(); }
            var swatches = COLORS.map(function (c) {
                return '<button type="button" class="sv-anno-swatch' + (c === it.color ? ' sel' : '') +
                    '" data-color="' + esc(c) + '" style="background:' + esc(c) + '" aria-label="' + esc(c) + '"></button>';
            }).join('');
            return '<button type="button" class="btn btn-link btn-sm sv-anno-back" data-act="back">‹ ' + esc(t('list.count')) + '</button>' +
                '<label class="sv-anno-lbl">' + esc(t('form.label')) +
                '<input type="text" id="sv-anno-label" maxlength="' + MAX_LABEL + '" value="' + esc(it.label) +
                '" placeholder="' + esc(t('form.label.ph')) + '"></label>' +
                '<div class="sv-anno-lbl">' + esc(t('form.color')) +
                '<div class="sv-anno-swatches">' + swatches + '</div></div>' +
                '<label class="sv-anno-lbl">' + esc(t('form.note')) +
                '<textarea id="sv-anno-note" rows="2" placeholder="' + esc(t('form.note.ph')) + '">' + esc(it.note) + '</textarea></label>' +
                '<div class="sv-anno-actions">' +
                '<button type="button" class="btn btn-primary btn-sm" data-act="save">' + esc(t('form.save')) + '</button>' +
                '<button type="button" class="btn btn-outline-danger btn-sm" data-act="delitem">' + esc(t('form.delete')) + '</button>' +
                '</div>';
        }

        // --- Bind handlers ----------------------------------------------------
        function bind(root) {
            root.querySelectorAll('[data-mode]').forEach(function (b) {
                b.addEventListener('click', function () { arm(b.getAttribute('data-mode')); });
            });
            root.querySelectorAll('[data-id]').forEach(function (row) {
                row.addEventListener('click', function (e) {
                    if (e.target.hasAttribute('data-del')) { return; }
                    selectItem(parseInt(row.getAttribute('data-id'), 10), true);
                });
            });
            root.querySelectorAll('[data-del]').forEach(function (b) {
                b.addEventListener('click', function () {
                    if (!confirm(t('form.del.confirm'))) { return; }
                    removeItem(parseInt(b.getAttribute('data-del'), 10));
                });
            });
            root.querySelectorAll('[data-color]').forEach(function (b) {
                b.addEventListener('click', function () {
                    var it = byId(selId); if (!it) { return; }
                    it.color = b.getAttribute('data-color');
                    save(); rebuildLayer(); render();
                });
            });
            var actHandlers = {
                finish:  function () { if (draw) { draw.finishDrawing(); } },
                undo:    undoVertex,
                disarm:  function () { disarm(); render(); },
                back:    function () { selId = null; render(); },
                save:    saveForm,
                delitem: function () { if (confirm(t('form.del.confirm'))) { removeItem(selId); } },
                share:   doShare,
                export:  doExport,
                clear:   doClear
            };
            root.querySelectorAll('[data-act]').forEach(function (b) {
                var fn = actHandlers[b.getAttribute('data-act')];
                if (fn) { b.addEventListener('click', fn); }
            });
        }

        function saveForm() {
            var it = byId(selId); if (!it) { return; }
            var labelEl = document.getElementById('sv-anno-label');
            var noteEl  = document.getElementById('sv-anno-note');
            var label = (labelEl ? labelEl.value : '').trim();
            if (label.length > MAX_LABEL) { alert(t('err.badlabel')); return; }
            it.label = label;
            it.note  = (noteEl ? noteEl.value : '').trim();
            save(); rebuildLayer();
            selId = null; render();
        }
        function removeItem(id) {
            items = items.filter(function (it) { return it.id !== id; });
            if (selId === id) { selId = null; }
            save(); rebuildLayer(); render();
        }
        function doClear() {
            if (!confirm(t('clear.confirm'))) { return; }
            items = []; selId = null; save(); rebuildLayer(); render();
        }

        // --- Share / export (principle 5) -------------------------------------
        function doShare() {
            var payload = encodePayload();
            if (payload.length > MAX_URL_BYTES) { msg(t('share.toobig')); return; }
            // Build on the canonical permalink, then ensure the link self-activates
            // this extension for ANY recipient — a shared drawing must render even if
            // the recipient's customConfig does not enable `annotation`.
            var u = new URL(SViewer.getPermalink());
            var ext = (u.searchParams.get('ext') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
            if (ext.indexOf(PANEL) === -1) { ext.push(PANEL); }
            u.searchParams.set('ext', ext.join(','));
            u.searchParams.set(URL_PARAM, payload);
            var url = u.toString();
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(function () { msg(t('share.copied')); });
            } else {
                msg(url);
            }
        }
        function doExport() {
            var blob = new Blob([JSON.stringify(toGeoJSON(), null, 2)], { type: 'application/geo+json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'annotation.geojson';
            a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        }
        function msg(text) {
            var el = document.getElementById('sv-anno-msg');
            if (el) { el.textContent = text; }
        }

        // --- Boot: load from URL (untrusted) else localStorage ----------------
        var params = new URLSearchParams(window.location.search);
        var fromUrl = params.get(URL_PARAM);
        if (fromUrl) {
            items = decodePayload(fromUrl);
            reindex();
            save();             // adopt shared drawing into local storage
        } else {
            loadLocal();
        }
        rebuildLayer();
    });
}());
