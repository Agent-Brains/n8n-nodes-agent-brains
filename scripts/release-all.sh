#!/usr/bin/env bash
# release-all.sh — Build and publish every workspace package to npm.
# Two phases: staging (main version) then sandbox (`-dev` suffix).
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

# Read base version from any one package (they're kept in sync).
BASE_VERSION=$(node -p "require('./packages/trigger/package.json').version")
DEV_VERSION="${BASE_VERSION}-dev"

PROVENANCE_FLAG="${PROVENANCE_FLAG:-}"   # CI sets this to "--provenance"

# ── 1. Staging publish (main version) ──────────────────────────
echo "🚀 Building all packages..."
npm run build

echo "🛠  Patching env → staging..."
node scripts/patch-env.js staging

echo "📦 Publishing staging $BASE_VERSION across all workspaces..."
npm publish --workspaces --access public ${PROVENANCE_FLAG}

# ── 2. Sandbox-dev publish (-dev suffix) ───────────────────────
echo ""
echo "🔨 Bumping all packages to $DEV_VERSION..."
npm version "$DEV_VERSION" --workspaces --no-git-tag-version --allow-same-version

echo "🚀 Rebuilding for sandbox..."
npm run build
node scripts/patch-env.js sandbox

echo "📦 Publishing sandbox $DEV_VERSION across all workspaces..."
npm publish --workspaces --access public --tag dev ${PROVENANCE_FLAG}

# Restore main version so the working tree isn't dirty.
npm version "$BASE_VERSION" --workspaces --no-git-tag-version --allow-same-version

echo ""
echo "✅ Done. Published $BASE_VERSION (staging) and $DEV_VERSION (sandbox-dev) for all 5 packages."
