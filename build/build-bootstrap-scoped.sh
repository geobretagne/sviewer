#!/bin/bash
# Compile Bootstrap with .sv-scope CSS prefix to prevent style pollution
# when sviewer is embedded in a host page without an iframe

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Building scoped Bootstrap for sviewer..."

# Create a temporary directory for the build
BUILD_TMP=$(mktemp -d)
trap "rm -rf $BUILD_TMP" EXIT

cd "$BUILD_TMP"

# Install sass and bootstrap source locally
echo "Installing Sass and Bootstrap source..."
npm init -y > /dev/null 2>&1
npm install --save-dev sass bootstrap > /dev/null 2>&1

# Create the SCSS entry file that scopes Bootstrap
echo "Creating scoped Bootstrap SCSS..."
mkdir -p src

cat > src/bootstrap-scoped.scss << 'EOF'
// Bootstrap components scoped to .sv-scope
// This prevents CSS pollution when sviewer is embedded in a host page

// Wrap all Bootstrap styles in .sv-scope selector
.sv-scope {
  @import "bootstrap/scss/bootstrap";
}
EOF

# Compile with Sass (compressed output, with node_modules in load path)
echo "Compiling Bootstrap with Sass..."
npx sass --load-path=node_modules --style=compressed src/bootstrap-scoped.scss bootstrap-scoped.min.css

# Copy the compiled file to the sviewer lib directory
echo "Installing compiled CSS..."
cp bootstrap-scoped.min.css "$PROJECT_ROOT/lib/bootstrap/bootstrap-scoped.min.css"

echo "✓ Bootstrap scoped CSS generated: $(wc -c < "$PROJECT_ROOT/lib/bootstrap/bootstrap-scoped.min.css") bytes"
echo ""
echo "Next steps:"
echo "1. Update index.html to use lib/bootstrap/bootstrap-scoped.min.css"
echo "2. Wrap sviewer content in <div class=\"sv-scope\"> ... </div>"
