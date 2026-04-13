#!/bin/bash
# Simple minification script for sviewer

set -e

echo "Minifying CSS and JavaScript..."

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
