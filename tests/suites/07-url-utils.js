/* Suite 07 — URL utilities ($.param → URLSearchParams migration guards)
 * Tests permalink URL construction via DOM query of the rendered href.
 * Guards $.param replacement in setPermalink().
 */

// Permalink href must be a valid URL with expected params after init
SV_TESTS.push({
    id: 'url-permalink-href-valid',
    label: 'URL — #sv-permalink-url href is a valid absolute URL',
    group: 'URL',
    type: 'visual',
    params: { x: -499574, y: 6231640, z: 12 },
    assert: function(hardConfig, event, queryDOM) {
        return queryDOM('#sv-permalink-url', 'href').then(function(r) {
            if (!r.found) throw new Error('#sv-permalink-url not found');
            if (!r.value) throw new Error('href is empty');
            try {
                var u = new URL(r.value);
                if (!u.protocol.match(/^https?:$/)) throw new Error('bad protocol: ' + u.protocol);
            } catch(e) {
                throw new Error('href is not a valid URL: ' + r.value);
            }
        });
    }
});

// Permalink href must contain x, y, z params matching input
SV_TESTS.push({
    id: 'url-permalink-xyz-params',
    label: 'URL — permalink href contains x, y, z params',
    group: 'URL',
    type: 'visual',
    params: { x: -499574, y: 6231640, z: 12 },
    assert: function(hardConfig, event, queryDOM) {
        return queryDOM('#sv-permalink-url', 'href').then(function(r) {
            if (!r.found) throw new Error('#sv-permalink-url not found');
            if (!r.value) throw new Error('href is empty');
            var u;
            try { u = new URL(r.value); } catch(e) { throw new Error('href not a URL: ' + r.value); }
            var sp = u.searchParams;
            if (!sp.has('x')) throw new Error('href missing ?x=');
            if (!sp.has('y')) throw new Error('href missing ?y=');
            if (!sp.has('z')) throw new Error('href missing ?z=');
        });
    }
});

// Title param must appear in permalink href when set
SV_TESTS.push({
    id: 'url-permalink-title-param',
    label: 'URL — permalink href contains ?title= when set',
    group: 'URL',
    type: 'visual',
    params: { title: 'TestTitleXYZ' },
    assert: function(hardConfig, event, queryDOM) {
        return queryDOM('#sv-permalink-url', 'href').then(function(r) {
            if (!r.found) throw new Error('#sv-permalink-url not found');
            if (!r.value) throw new Error('href is empty');
            if (r.value.indexOf('TestTitleXYZ') === -1) {
                throw new Error('title not found in permalink href: ' + r.value);
            }
        });
    }
});

// lb param must appear in permalink href when set
SV_TESTS.push({
    id: 'url-permalink-lb-param',
    label: 'URL — permalink href contains ?lb= when set',
    group: 'URL',
    type: 'visual',
    params: { lb: 1 },
    assert: function(hardConfig, event, queryDOM) {
        return queryDOM('#sv-permalink-url', 'href').then(function(r) {
            if (!r.found) throw new Error('#sv-permalink-url not found');
            if (!r.value) throw new Error('href is empty');
            var u;
            try { u = new URL(r.value); } catch(e) { throw new Error('href not a URL: ' + r.value); }
            if (!u.searchParams.has('lb')) throw new Error('href missing ?lb=');
        });
    }
});
