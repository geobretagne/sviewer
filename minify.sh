#!/bin/bash
# Simple minification script for sviewer

set -e

echo "Minifying CSS and JavaScript..."

# Bootstrap Icons subset — keep only the 15 glyphs used by sviewer
# Requires fonttools: pip install fonttools brotli
echo "Generating Bootstrap Icons subset..."
ICONS_SRC="lib/bootstrap-icons/fonts/bootstrap-icons.woff2"
ICONS_CSS_SRC="lib/bootstrap-icons/bootstrap-icons.min.css"
ICONS_SUBSET_WOFF2="build/bootstrap-icons.subset.woff2"
ICONS_SUBSET_CSS="build/bootstrap-icons.subset.css"

# Codepoints for: check clipboard code crosshair gear geo-fill house info-circle
#                 info-square link map search x-lg zoom-in zoom-out
CODEPOINTS="F26E,F290,F2C8,F769,F3E5,F3E9,F425,F431,F433,F471,F47F,F52A,F659,F62C,F62D"

python3 - "$ICONS_SRC" "$ICONS_SUBSET_WOFF2" "$CODEPOINTS" <<'PYEOF'
import sys
sys.path.insert(0, '/usr/lib/python3/dist-packages')
from fontTools import subset

src, dst, cp_str = sys.argv[1], sys.argv[2], sys.argv[3]
codepoints = [int(c, 16) for c in cp_str.split(',')]

opts = subset.Options()
opts.flavor = 'woff2'
opts.desubroutinize = True

font = subset.load_font(src, opts)
subsetter = subset.Subsetter(options=opts)
subsetter.populate(unicodes=codepoints)
subsetter.subset(font)
subset.save_font(font, dst, opts)
PYEOF

# Generate subset CSS: @font-face pointing to subset woff2 + only the 15 icon rules
python3 - "$ICONS_CSS_SRC" "$ICONS_SUBSET_CSS" <<'PYEOF'
import re, sys

icons = [
    'bi-check', 'bi-clipboard', 'bi-code', 'bi-crosshair', 'bi-gear',
    'bi-geo-fill', 'bi-house', 'bi-info-circle', 'bi-info-square',
    'bi-link', 'bi-map', 'bi-search', 'bi-x-lg', 'bi-zoom-in', 'bi-zoom-out'
]

with open(sys.argv[1]) as f:
    css = f.read()

base = re.findall(r'\.bi[^-][^{]*\{[^}]+\}', css)
icon_rules = []
for icon in icons:
    pattern = r'\.' + re.escape(icon) + r'(?:::[a-z]+)?\{[^}]+\}'
    icon_rules.extend(re.findall(pattern, css))

font_face = '@font-face{font-display:swap;font-family:bootstrap-icons;src:url("../build/bootstrap-icons.subset.woff2") format("woff2")}'
with open(sys.argv[2], 'w') as f:
    f.write(font_face + ''.join(base) + ''.join(icon_rules))
PYEOF

echo "✓ Bootstrap Icons subset: $(wc -c < $ICONS_SUBSET_WOFF2) bytes woff2, $(wc -c < $ICONS_SUBSET_CSS) bytes CSS (was $(wc -c < $ICONS_SRC) bytes woff2)"
echo ""

# Minify CSS - remove whitespace, comments, unnecessary semicolons
cat css/sviewer.css | \
    # Remove comments
    sed 's|/\*[^*]*\*\+\([^/*][^*]*\*\+\)*/||g' | \
    # Remove leading/trailing whitespace on each line
    sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | \
    # Remove empty lines
    sed '/^$/d' | \
    # Compact (remove spaces around selectors)
    tr -s ' ' | \
    sed 's/ *{ */{/g; s/ *} *}/}/g; s/ *: */:/g; s/ *, */,/g;' \
    > css/sviewer.min.css

echo "✓ CSS minified: $(wc -c < css/sviewer.min.css) bytes (from $(wc -c < css/sviewer.css))"

# For JavaScript, we recommend using NodeJS tools:
# npx terser js/sviewer.js -o js/sviewer.min.js -c -m
# Or use an online tool: https://www.minifier.org/

echo ""
echo "JavaScript minification options:"
echo "1. Using terser (requires Node.js):"
echo "   npm install -g terser"
echo "   terser js/sviewer.js -o js/sviewer.min.js -c -m"
echo ""
echo "2. Online tool: https://www.minifier.org/"
echo ""
echo "3. Using docker:"
echo "   docker run --rm -v \$(pwd):/app node:18 sh -c 'cd /app && npx terser js/sviewer.js -o js/sviewer.min.js -c -m'"
echo ""
