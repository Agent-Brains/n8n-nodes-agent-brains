#!/usr/bin/env bash
# release-all.sh — Full release: staging (main) via release-it + sandbox (-dev) follow-up.
# Usage: npm run release:all
#
# This script:
#   1. Runs `n8n-node release` which handles lint, build, version bump, git tag,
#      npm publish (staging, via patch-env.js hook), and GitHub release.
#   2. Then publishes a second `-dev` version targeting sandbox.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# ── 1. Staging release via release-it ─────────────────────────
# n8n-node release runs: lint → build → patch-env(staging) → version bump → npm publish → git tag → push
echo "🚀 Starting staging release via release-it..."
npm run release

# ── 2. Sandbox (-dev) follow-up publish ───────────────────────
BASE_VERSION=$(node -p "require('./package.json').version")
DEV_VERSION="${BASE_VERSION}-dev"
echo ""
echo "🔨 Building sandbox version ($DEV_VERSION)..."

# Bump to -dev version (no git changes)
npm version "$DEV_VERSION" --no-git-tag-version --allow-same-version

# Rebuild and patch for sandbox
npm run build
node scripts/patch-env.js sandbox

echo "🚀 Publishing $DEV_VERSION (sandbox)..."
RELEASE_MODE=true npm publish --tag dev

# Restore the original version
npm version "$BASE_VERSION" --no-git-tag-version --allow-same-version
echo ""
echo "✅ Done! Published $BASE_VERSION (staging) and $DEV_VERSION (sandbox)"
