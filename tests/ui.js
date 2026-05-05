(function() {
    'use strict';

    var activeTestId = null;
    var activeGroup = null;

    // ------ Build panel -------------------------------------------------------

    function buildPanel() {
        var panel = document.getElementById('sv-panel');
        panel.innerHTML = '';
        var groups = {};
        window.SV_TESTS.forEach(function(t) {
            if (!groups[t.group]) groups[t.group] = [];
            groups[t.group].push(t);
        });
        Object.keys(groups).forEach(function(g) {
            var header = document.createElement('div');
            header.className = 'sv-group-header';
            header.textContent = g;
            panel.appendChild(header);
            groups[g].forEach(function(t) {
                var row = document.createElement('div');
                row.className = 'sv-test-row';
                row.id = 'row-' + t.id;
                row.innerHTML =
                    '<span class="sv-test-status">·</span>' +
                    '<div style="flex:1">' +
                        '<div class="sv-test-label">' + escHtml(t.label) + '</div>' +
                        '<div class="sv-test-detail"></div>' +
                    '</div>' +
                    '<span class="sv-test-type">' + (t.type === 'unit' ? 'unit' : 'vis') + '</span>';
                row.addEventListener('click', function() { selectTest(t); });
                panel.appendChild(row);
            });
        });
    }

    // ------ Select + run single test ------------------------------------------

    function selectTest(test) {
        if (activeTestId) {
            var prev = document.getElementById('row-' + activeTestId);
            if (prev) prev.classList.remove('active');
        }
        activeTestId = test.id;
        var row = document.getElementById('row-' + test.id);
        if (row) row.classList.add('active');

        showPane(test.type);
        SVRunner.run(test);
    }

    function showPane(type) {
        var frame = document.getElementById('sv-test-frame');
        var unit = document.getElementById('sv-unit-pane');
        var empty = document.getElementById('sv-empty');
        frame.style.display = (type !== 'unit') ? 'block' : 'none';
        unit.style.display = (type === 'unit') ? 'flex' : 'none';
        unit.style.flexDirection = 'column';
        empty.style.display = 'none';
    }

    // ------ Run all / run group -----------------------------------------------

    document.getElementById('btn-run-all').addEventListener('click', function() {
        runGroup(null);
    });

    document.getElementById('btn-run-group').addEventListener('click', function() {
        if (activeTestId) {
            var test = window.SV_TESTS.filter(function(t) { return t.id === activeTestId; })[0];
            if (test) runGroup(test.group);
        }
    });

    function runGroup(group) {
        activeGroup = group;
        var label = document.getElementById('sv-summary');
        label.textContent = 'running…';
        SVRunner.runAll(group).then(function(results) {
            var pass = results.filter(function(r) { return r.pass; }).length;
            label.textContent = pass + '/' + results.length + ' passed';
            label.style.color = (pass === results.length) ? '#4caf50' : '#f44336';
        });
    }

    // ------ Helpers -----------------------------------------------------------

    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    buildPanel();

    if (/[?&]autorun=1/.test(window.location.search)) {
        runGroup(null);
    }

})();
