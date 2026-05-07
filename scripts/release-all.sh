#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

BASE_VERSION=$(node -p "require('./package.json').version")
PROVENANCE_FLAG="${PROVENANCE_FLAG:-}"

echo "Building package..."
npm run build

echo "Patching env → staging..."
node scripts/patch-env.js staging

echo "Publishing n8n-nodes-agent-brains $BASE_VERSION..."
npm publish --access public ${PROVENANCE_FLAG}

echo "Done. Published $BASE_VERSION."
