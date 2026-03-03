#!/usr/bin/env bash
# release-all.sh — Build and publish both staging (main) and sandbox (-dev) versions.
# Usage: ./scripts/release-all.sh   (or: npm run release:all)
#
# Expects npm to be already authenticated (CI sets up .npmrc).
# Expects the version in package.json to be the base version (e.g. 1.7.0).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

CONSTANTS_JS="dist/nodes/constants.js"
BASE_VERSION=$(node -p "require('./package.json').version")
echo "📦 Base version: $BASE_VERSION"

# ── 1. Build & patch for STAGING ──────────────────────────────
echo ""
echo "🔨 Building for STAGING (version $BASE_VERSION)..."
npm run build

# Patch the compiled constants to hardcode staging as default
sed -i.bak "s/|| 'sandbox'/|| 'staging'/" "$CONSTANTS_JS"
rm -f "${CONSTANTS_JS}.bak"

echo "🚀 Publishing $BASE_VERSION (staging)..."
npm publish

# ── 2. Build & publish for SANDBOX (-dev) ─────────────────────
DEV_VERSION="${BASE_VERSION}-dev"
echo ""
echo "🔨 Building for SANDBOX (version $DEV_VERSION)..."

# Bump version to -dev (no git tag)
npm version "$DEV_VERSION" --no-git-tag-version --allow-same-version

# Rebuild (default is sandbox, no patching needed)
npm run build

echo "🚀 Publishing $DEV_VERSION (sandbox)..."
npm publish --tag dev

# ── 3. Restore original version ──────────────────────────────
npm version "$BASE_VERSION" --no-git-tag-version --allow-same-version
echo ""
echo "✅ Done! Published $BASE_VERSION (staging) and $DEV_VERSION (sandbox)"
