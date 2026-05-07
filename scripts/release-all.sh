#!/usr/bin/env bash
# release-all.sh — Build and publish every workspace package to npm.
#
# Usage:
#   npm run release:all
#
# Locally this publishes without provenance. The same command runs in CI
# (.github/workflows/ci.yml) on tag push, where `id-token: write` is set
# and `--provenance` is added by the workflow.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# Read base version from any one publishable package (they're kept in sync).
BASE_VERSION=$(node -p "require('./packages/platform/package.json').version")
PUBLISH_PACKAGES=("packages/platform" "packages/trigger")

PROVENANCE_FLAG="${PROVENANCE_FLAG:-}"   # CI sets this to "--provenance"

# ── 1. Staging publish (main version) ──────────────────────────
echo "🚀 Building all packages..."
npm run build

echo "🛠  Patching env → staging..."
node scripts/patch-env.js staging

echo "📦 Publishing staging $BASE_VERSION across publishable packages..."
for pkg in "${PUBLISH_PACKAGES[@]}"; do
  if [ -d "$pkg" ] && [ -f "$pkg/package.json" ]; then
    echo "Publishing $pkg..."
    (cd "$pkg" && npm publish --access public ${PROVENANCE_FLAG})
  fi
done

echo ""
echo "✅ Done. Published $BASE_VERSION for ${#PUBLISH_PACKAGES[@]} packages."
