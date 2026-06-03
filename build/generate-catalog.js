#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const EXT_DIR     = path.resolve(__dirname, '../ext');
const CATALOG_OUT = path.join(EXT_DIR, 'index.html');

// --- Collect manifests -------------------------------------------------------

const manifests = fs.readdirSync(EXT_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
        const mpath = path.join(EXT_DIR, d.name, 'manifest.json');
        if (!fs.existsSync(mpath)) { return null; }
        try {
            const m = JSON.parse(fs.readFileSync(mpath, 'utf8'));
            m._dir = d.name;
            return m;
        } catch(e) {
            console.warn('Invalid manifest:', mpath, e.message);
            return null;
        }
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

// --- Helpers -----------------------------------------------------------------

function esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function screenshotExists(m) {
    return m.screenshot && fs.existsSync(path.join(EXT_DIR, m._dir, m.screenshot));
}

// --- Card HTML ---------------------------------------------------------------

function renderCard(m) {
    const hasScreenshot = screenshotExists(m);

    const tags = (m.tags || []).map(t =>
        `<span class="sv-tag">${esc(t)}</span>`
    ).join('');

    const params = (m.params || []).length > 0 ? `
            <details class="sv-params">
                <summary>Paramètres URL <span class="sv-param-count">${m.params.length}</span></summary>
                <table>
                    <thead><tr><th>Paramètre</th><th>Exemple</th><th>Description</th></tr></thead>
                    <tbody>
                        ${m.params.map(p => `<tr>
                            <td><code>${esc(p.name)}</code></td>
                            <td><code>${esc(p.example || '')}</code></td>
                            <td>${esc(p.description)}${p.enum ? ` <span class="sv-enum">${p.enum.map(esc).join(' · ')}</span>` : ''}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </details>` : '';

    const examples = (m.examples || []).length > 0 ? `
            <ul class="sv-examples">
                ${m.examples.map(ex => `<li>
                    <a href="${ex.url.startsWith('?') ? '../' + ex.url : esc(ex.url)}">${esc(ex.title)}</a>${ex.description ? ` <span class="sv-ex-desc">— ${esc(ex.description)}</span>` : ''}
                </li>`).join('')}
            </ul>` : '';

    const imgSrc = hasScreenshot ? `${esc(m._dir)}/${esc(m.screenshot)}` : '';
    const img = hasScreenshot
        ? `<button type="button" class="sv-card-thumb" data-full="${imgSrc}" aria-label="Agrandir la capture de ${esc(m.name)}">
            <span class="sv-phone">
                <span class="sv-phone-notch"></span>
                <img src="${imgSrc}" alt="Capture de ${esc(m.name)}" loading="lazy">
            </span>
        </button>`
        : '';

    const typeClass = { extension: 'sv-badge-extension', page: 'sv-badge-page', demo: 'sv-badge-demo' }[m.type] || 'sv-badge-extension';

    return `
    <article id="ext-${esc(m._dir)}" class="sv-card" data-search="${esc((m.name + ' ' + m.description + ' ' + (m.tags || []).join(' ')).toLowerCase())}" data-type="${esc(m.type || 'extension')}" role="listitem">
        ${img}
        <div class="sv-card-body">
            <div class="sv-card-head">
                <h2><a href="${esc(m._dir)}/">${esc(m.name)}</a></h2>
                <span class="sv-badge ${typeClass}">${esc(m.type)}</span>
            </div>
            <p class="sv-desc">${esc(m.description)}</p>
            ${tags ? `<div class="sv-tags" aria-label="Tags">${tags}</div>` : ''}
            ${params}
            ${examples}
            <footer class="sv-card-footer">
                <span>v${esc(m.version)}</span>
                ${m.sviewer && m.sviewer.minVersion ? `<span>sViewer ≥ ${esc(m.sviewer.minVersion)}</span>` : ''}
                ${m.author ? `<span>${esc(m.author)}</span>` : ''}
            </footer>
        </div>
    </article>`;
}

function renderNav(items) {
    const links = items.map(m =>
        `        <li><a class="sv-nav-link" href="#ext-${esc(m._dir)}" data-id="${esc(m._dir)}">${esc(m.name)}</a></li>`
    ).join('\n');
    return `<nav class="sv-nav" aria-label="Extensions">
    <ul>
${links}
    </ul>
</nav>`;
}

// --- Full page ---------------------------------------------------------------

function buildCatalog(items) {
    const cards = items.map(renderCard).join('\n');
    const nav   = renderNav(items);

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>sViewer — Extensions</title>
    <meta name="description" content="Catalogue des extensions sViewer : adaptateurs de données, widgets et démos.">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: system-ui, sans-serif;
            font-size: 14px;
            background: #f0f2f5;
            color: #222;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* Header */
        .sv-header {
            background: #1a3a5c;
            color: #fff;
            padding: .9rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 1.5rem;
            flex-wrap: wrap;
            flex-shrink: 0;
        }
        .sv-header h1 {
            font-size: 1.05rem;
            font-weight: 600;
            white-space: nowrap;
            letter-spacing: .01em;
        }
        .sv-header h1 a { color: inherit; text-decoration: none; }
        .sv-search-wrap { flex: 1; min-width: 180px; max-width: 420px; }
        #sv-search {
            width: 100%;
            padding: .4rem .75rem;
            font-size: .9rem;
            border: 1px solid rgba(255,255,255,.3);
            border-radius: 4px;
            background: rgba(255,255,255,.12);
            color: #fff;
        }
        #sv-search::placeholder { color: rgba(255,255,255,.55); }
        #sv-search:focus { outline: 2px solid rgba(255,255,255,.6); outline-offset: 1px; background: rgba(255,255,255,.18); }

        /* Layout */
        .sv-layout {
            display: flex;
            flex: 1;
            min-height: 0;
            max-width: 1100px;
            width: 100%;
            margin: 0 auto;
            padding: 1.25rem 1rem;
            gap: 1.5rem;
            align-items: flex-start;
        }

        /* Left nav */
        .sv-nav {
            width: 160px;
            flex-shrink: 0;
            position: sticky;
            top: 1.25rem;
        }
        .sv-nav ul { list-style: none; }
        .sv-nav li { margin-bottom: .1rem; }
        .sv-nav-link {
            display: block;
            padding: .3rem .6rem;
            border-radius: 4px;
            color: #1a3a5c;
            text-decoration: none;
            font-size: .85rem;
            transition: background .1s;
        }
        .sv-nav-link:hover { background: #e4eaf2; }
        .sv-nav-link:focus { outline: 2px solid #1a3a5c; outline-offset: 1px; }
        .sv-nav-link.sv-nav-active { background: #1a3a5c; color: #fff; font-weight: 600; }
        .sv-nav-link[hidden] { display: none; }

        /* Right content */
        .sv-content { flex: 1; min-width: 0; }
        #sv-count { font-size: .8rem; color: #666; margin-bottom: .75rem; min-height: 1.2em; }

        /* Cards */
        .sv-card {
            display: flex;
            align-items: stretch;
            background: #fff;
            border: 1px solid #dde2e8;
            border-radius: 8px;
            margin-bottom: 1rem;
            overflow: hidden;
            scroll-margin-top: 1.25rem;
        }
        .sv-card[hidden] { display: none; }

        /* Left thumbnail — rendered as a phone (sViewer is mobile-first) */
        .sv-card-thumb {
            flex-shrink: 0;
            align-self: stretch;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            border: none;
            border-right: 1px solid #dde2e8;
            background: #eef1f5;
            cursor: zoom-in;
        }
        /* Phone bezel drawn in pure CSS, screenshot fills the screen */
        .sv-phone {
            position: relative;
            display: block;
            width: 104px;
            aspect-ratio: 9 / 19.5;
            background: #14161a;
            border-radius: 16px;
            padding: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.06);
        }
        .sv-phone-notch {
            position: absolute;
            top: 9px;
            left: 50%;
            transform: translateX(-50%);
            width: 34px;
            height: 4px;
            background: #2c2f36;
            border-radius: 3px;
            z-index: 2;
        }
        .sv-phone img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            border-radius: 10px;
        }
        .sv-card-thumb:focus { outline: 2px solid #1a3a5c; outline-offset: -2px; }
        .sv-card-thumb:hover .sv-phone { box-shadow: 0 4px 14px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.08); }
        .sv-card-body { flex: 1; min-width: 0; padding: 1rem; }
        .sv-card-head {
            display: flex;
            align-items: baseline;
            gap: .6rem;
            margin-bottom: .4rem;
        }
        .sv-card-head h2 { font-size: 1rem; font-weight: 700; }
        .sv-card-head h2 a { color: #1a3a5c; text-decoration: none; }
        .sv-card-head h2 a:hover { text-decoration: underline; }
        .sv-card-head h2 a:focus { outline: 2px solid #1a3a5c; outline-offset: 2px; border-radius: 2px; }

        .sv-badge {
            font-size: .65rem;
            text-transform: uppercase;
            letter-spacing: .05em;
            padding: 2px 7px;
            border-radius: 10px;
            white-space: nowrap;
        }
        .sv-badge-extension { background: #e8f0fa; color: #1a3a5c; }
        .sv-badge-page      { background: #ede8fa; color: #3a1a5c; }
        .sv-badge-demo      { background: #f0f0f0; color: #555; }

        /* Type filter */
        .sv-filters { display: flex; gap: .4rem; margin-bottom: .75rem; flex-wrap: wrap; }
        .sv-filter-btn {
            font-size: .78rem;
            padding: 3px 12px;
            border-radius: 12px;
            border: 1px solid #dde2e8;
            background: #fff;
            color: #555;
            cursor: pointer;
            transition: background .1s, color .1s;
        }
        .sv-filter-btn:hover { background: #e4eaf2; }
        .sv-filter-btn.active { background: #1a3a5c; color: #fff; border-color: #1a3a5c; }
        .sv-filter-btn:focus { outline: 2px solid #1a3a5c; outline-offset: 1px; }

        .sv-desc { color: #444; line-height: 1.55; margin-bottom: .6rem; }

        .sv-tags { display: flex; flex-wrap: wrap; gap: .3rem; margin-bottom: .65rem; }
        .sv-tag {
            font-size: .72rem;
            background: #f0f2f5;
            color: #555;
            padding: 2px 8px;
            border-radius: 10px;
            border: 1px solid #dde2e8;
        }

        /* Params */
        .sv-params { margin-bottom: .65rem; }
        .sv-params summary {
            cursor: pointer;
            font-size: .8rem;
            color: #555;
            padding: .25rem 0;
            list-style: none;
            display: flex;
            align-items: center;
            gap: .4rem;
            user-select: none;
        }
        .sv-params summary::before {
            content: '▶';
            font-size: .6rem;
            transition: transform .15s;
            color: #888;
        }
        .sv-params[open] summary::before { transform: rotate(90deg); }
        .sv-params summary:focus { outline: 2px solid #1a3a5c; border-radius: 2px; }
        .sv-param-count {
            font-size: .7rem;
            background: #eee;
            color: #666;
            padding: 1px 6px;
            border-radius: 8px;
        }
        .sv-params table {
            width: 100%;
            border-collapse: collapse;
            font-size: .8rem;
            margin-top: .4rem;
        }
        .sv-params th {
            text-align: left;
            color: #999;
            font-weight: 500;
            padding: 3px 8px 3px 0;
            border-bottom: 1px solid #eee;
        }
        .sv-params td { padding: 4px 8px 4px 0; vertical-align: top; }
        .sv-params td:first-child, .sv-params td:nth-child(2) { font-family: monospace; white-space: nowrap; }
        .sv-enum { font-size: .75rem; color: #888; margin-left: .3rem; }

        /* Examples */
        .sv-examples { list-style: none; font-size: .8rem; margin-bottom: .65rem; }
        .sv-examples li { margin-bottom: .25rem; }
        .sv-examples a { color: #1a3a5c; }
        .sv-examples a:focus { outline: 2px solid #1a3a5c; outline-offset: 2px; border-radius: 2px; }
        .sv-ex-desc { color: #888; }

        /* Card footer */
        .sv-card-footer {
            display: flex;
            gap: 1rem;
            font-size: .72rem;
            color: #aaa;
            margin-top: .65rem;
            padding-top: .5rem;
            border-top: 1px solid #f0f0f0;
        }

        /* No results */
        #sv-noresults { display: none; color: #888; font-size: .9rem; padding: 2rem 0; text-align: center; }

        /* Lightbox */
        #sv-lightbox {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 1000;
            background: rgba(10,18,30,.88);
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }
        #sv-lightbox.open { display: flex; }
        /* Large phone in the lightbox — height-driven so it fits the viewport */
        .sv-phone-lg {
            width: auto;
            height: min(85vh, 720px);
            padding: 10px;
            border-radius: 28px;
            box-shadow: 0 8px 40px rgba(0,0,0,.5);
        }
        .sv-phone-lg .sv-phone-notch { top: 14px; width: 52px; height: 6px; }
        .sv-phone-lg img { border-radius: 20px; }
        #sv-lightbox-close {
            position: absolute;
            top: 1rem;
            right: 1.25rem;
            width: 40px;
            height: 40px;
            font-size: 1.6rem;
            line-height: 1;
            color: #fff;
            background: rgba(255,255,255,.12);
            border: 1px solid rgba(255,255,255,.3);
            border-radius: 50%;
            cursor: pointer;
        }
        #sv-lightbox-close:hover { background: rgba(255,255,255,.22); }
        #sv-lightbox-close:focus { outline: 2px solid #fff; outline-offset: 2px; }

        @media (max-width: 600px) {
            .sv-header { padding: .75rem 1rem; gap: 1rem; }
            .sv-search-wrap { max-width: 100%; }
            .sv-layout { flex-direction: column; gap: 1rem; padding: 1rem; }
            .sv-nav { width: 100%; position: static; }
            .sv-nav ul { display: flex; flex-wrap: wrap; gap: .3rem; }
            .sv-nav-link { font-size: .8rem; padding: .2rem .5rem; border: 1px solid #dde2e8; }

            /* Phone thumb stays beside text, just smaller */
            .sv-card-thumb { padding: .6rem; }
            .sv-phone { width: 78px; }
        }
    </style>
</head>
<body>

<header class="sv-header">
    <h1><a href="../">sViewer</a> — Extensions</h1>
    <div class="sv-search-wrap">
        <label for="sv-search" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">Rechercher une extension</label>
        <input type="search" id="sv-search" placeholder="Rechercher…" aria-controls="sv-list" autocomplete="off">
    </div>
</header>

<div class="sv-layout">
    ${nav}
    <div class="sv-content">
        <div class="sv-filters" role="group" aria-label="Filtrer par type">
            <button class="sv-filter-btn active" data-type="">Tout</button>
            <button class="sv-filter-btn" data-type="extension">Extension</button>
            <button class="sv-filter-btn" data-type="page">Page</button>
            <button class="sv-filter-btn" data-type="demo">Démo</button>
        </div>
        <div id="sv-count" aria-live="polite" aria-atomic="true"></div>
        <div id="sv-list" role="list">
${cards}
        </div>
        <p id="sv-noresults" role="status">Aucune extension trouvée.</p>
    </div>
</div>

<div id="sv-lightbox" role="dialog" aria-modal="true" aria-label="Capture agrandie">
    <button type="button" id="sv-lightbox-close" aria-label="Fermer">&times;</button>
    <span class="sv-phone sv-phone-lg">
        <span class="sv-phone-notch"></span>
        <img id="sv-lightbox-img" src="" alt="">
    </span>
</div>

<script>
(function() {
    var input      = document.getElementById('sv-search');
    var count      = document.getElementById('sv-count');
    var noRes      = document.getElementById('sv-noresults');
    var cards      = Array.from(document.querySelectorAll('.sv-card'));
    var navLinks   = Array.from(document.querySelectorAll('.sv-nav-link'));
    var filterBtns = Array.from(document.querySelectorAll('.sv-filter-btn'));
    var total      = cards.length;
    var activeType = '';

    function update() {
        var q = input.value.trim().toLowerCase();
        var visible = 0;
        cards.forEach(function(c) {
            var matchQ    = !q || c.dataset.search.indexOf(q) !== -1;
            var matchType = !activeType || c.dataset.type === activeType;
            var match = matchQ && matchType;
            c.hidden = !match;
            if (match) { visible++; }
            var link = document.querySelector('.sv-nav-link[data-id="' + c.id.replace('ext-', '') + '"]');
            if (link) { link.hidden = !match; }
        });
        noRes.style.display = visible === 0 ? '' : 'none';
        count.textContent = (q || activeType) ? (visible + ' / ' + total) : '';
    }

    filterBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            activeType = btn.dataset.type;
            filterBtns.forEach(function(b) { b.classList.toggle('active', b === btn); });
            update();
        });
    });

    var ticking = false;
    function onScroll() {
        if (ticking) { return; }
        ticking = true;
        requestAnimationFrame(function() {
            ticking = false;
            var best = null;
            cards.forEach(function(c) {
                if (c.hidden) { return; }
                var top = c.getBoundingClientRect().top;
                if (top <= 80 && (best === null || top > best.top)) {
                    best = { id: c.id, top: top };
                }
            });
            var activeId = best ? best.id.replace('ext-', '') : (cards.find(function(c) { return !c.hidden; }) || {id:''}).id.replace('ext-', '');
            navLinks.forEach(function(l) {
                l.classList.toggle('sv-nav-active', l.dataset.id === activeId);
            });
        });
    }

    input.addEventListener('input', update);
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    onScroll();

    // --- Lightbox: click a thumbnail to enlarge its screenshot ---
    var box      = document.getElementById('sv-lightbox');
    var boxImg   = document.getElementById('sv-lightbox-img');
    var boxClose = document.getElementById('sv-lightbox-close');
    var lastFocus = null;

    function openBox(src, alt) {
        boxImg.src = src;
        boxImg.alt = alt || '';
        box.classList.add('open');
        lastFocus = document.activeElement;
        boxClose.focus();
    }
    function closeBox() {
        box.classList.remove('open');
        boxImg.src = '';
        if (lastFocus) { lastFocus.focus(); }
    }

    document.querySelectorAll('.sv-card-thumb').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var img = btn.querySelector('img');
            openBox(btn.dataset.full, img ? img.alt : '');
        });
    });
    boxClose.addEventListener('click', closeBox);
    box.addEventListener('click', function(e) { if (e.target === box) { closeBox(); } });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && box.classList.contains('open')) { closeBox(); }
    });
}());
</script>

</body>
</html>`;
}

// --- Write -------------------------------------------------------------------

const html = buildCatalog(manifests);
fs.writeFileSync(CATALOG_OUT, html, 'utf8');
console.log('Catalog written:', CATALOG_OUT, '(' + manifests.length + ' extensions)');

const EXT_JSON_OUT = path.join(EXT_DIR, 'extensions.json');
const extOnly = manifests
    .filter(m => (m.type || 'extension') === 'extension')
    .map(m => ({ id: m._dir, name: m.name, description: m.description }));
fs.writeFileSync(EXT_JSON_OUT, JSON.stringify(extOnly, null, 2), 'utf8');
console.log('Extensions JSON written:', EXT_JSON_OUT, '(' + extOnly.length + ' entries)');
