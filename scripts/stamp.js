/* Patches version + commit hash into embed.js and sw.js. */
const { execSync } = require('child_process');
const fs = require('fs');
const pkg = require('../package.json');
const commit = execSync('git rev-parse --short HEAD').toString().trim();

function patch(file, replacements) {
    let s = fs.readFileSync(file, 'utf8');
    replacements.forEach(([re, val]) => { s = s.replace(re, val); });
    fs.writeFileSync(file, s);
}

patch('js/embed.js', [
    [/var SVIEWER_VERSION='[^']*'/, "var SVIEWER_VERSION='" + pkg.version + "'"],
    [/var SVIEWER_COMMIT='[^']*'/, "var SVIEWER_COMMIT='" + commit + "'"]
]);

patch('sw.js', [
    [/const SVIEWER_COMMIT = '[^']*';/, "const SVIEWER_COMMIT = '" + commit + "';"]
]);

console.log('stamped: version=' + pkg.version + ' commit=' + commit);
