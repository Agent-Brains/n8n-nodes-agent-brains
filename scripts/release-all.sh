#!/usr/bin/env bash
# release-all.sh — Full release: staging (main) via release-it + sandbox (-dev) follow-up.
# Usage: npm run release:all
#
# This script:
#   1. Runs `n8n-node release` which handles lint, build, version bump, git tag,
#      npm publish (staging, via sed-patch), and GitHub release.
#   2. Then publishes a second `-dev` version targeting sandbox.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

CONSTANTS_JS="dist/nodes/constants.js"

# ── 1. Staging release via release-it ─────────────────────────
# n8n-node release runs: lint → build → version bump → changelog → npm publish → git tag → push
# We hook into the process by patching constants.js after build but before publish.
# The `prepublishOnly` script is satisfied by RELEASE_MODE=true set by n8n-node release.
echo "🚀 Starting staging release via release-it..."
npm run release

# After release-it finishes, the version is already bumped and published.
# Patch is needed in the after:bump hook, so we add a .release-it.json config.

# ── 2. Sandbox (-dev) follow-up publish ───────────────────────
BASE_VERSION=$(node -p "require('./package.json').version")
DEV_VERSION="${BASE_VERSION}-dev"
echo ""
echo "🔨 Building sandbox version ($DEV_VERSION)..."

# Bump to -dev version (no git changes)
npm version "$DEV_VERSION" --no-git-tag-version --allow-same-version

# Rebuild with sandbox default (no patching needed)
npm run build

echo "🚀 Publishing $DEV_VERSION (sandbox)..."
RELEASE_MODE=true npm publish --tag dev

# Restore the original version
npm version "$BASE_VERSION" --no-git-tag-version --allow-same-version
echo ""
echo "✅ Done! Published $BASE_VERSION (staging) and $DEV_VERSION (sandbox)"
