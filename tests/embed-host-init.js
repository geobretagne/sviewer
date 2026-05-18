(function() {
    // Parse URL params forwarded by runner (?x=&y=&z=&c=&lang=&lb=)
    var params = {};
    window.location.search.slice(1).split('&').forEach(function(pair) {
        var kv = pair.split('=');
        if (kv.length === 2 && kv[0]) { params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]); }
    });

    var opts = {};
    if (params.x && params.y) { opts.center = [parseFloat(params.x), parseFloat(params.y)]; }
    if (params.z)    { opts.zoom = parseFloat(params.z); }
    if (params.lang) { opts.lang = params.lang; }
    if (params.lb)   { opts.lb   = parseInt(params.lb, 10); }
    if (params.c)    { opts.c    = params.c; }

    SViewer.init('#sviewer-container', opts).catch(function(err) {
        console.error('SViewer.init failed:', err);
    });
    // sv:ready is emitted by sviewer.js directly via window.parent.postMessage —
    // no relay needed here. The runner receives it from the iframe.
}());
