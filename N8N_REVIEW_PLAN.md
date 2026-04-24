# n8n Verification Review — Plan & Progress

Tracking the fixes required before n8n will verify the `n8n-nodes-agent-brains` submission (reviewed at v1.11.0).

## Status summary

| # | Sev | Issue | Status |
|---|-----|-------|--------|
| 1 | HIGH | Sync GitHub with npm + push tags | TODO |
| 2 | HIGH | `delete` lifecycle doesn't unregister webhook | ⚠️ Needs correct endpoint; current impl is a no-op |
| 3 | HIGH | Multiple non-trigger nodes in one package | ✅ Split into 5 packages (strategy b) |
| 4 | MED  | `subtitle` references undefined `jobName` | ✅ Subtitle removed |
| 5 | MED  | Invalid codex category `"AI"` (4 files) | ✅ Removed from all 4 `.node.json` files |
| 6 | MED  | Invalid codex category `"Trigger"` | ✅ Removed |
| 7 | MED  | Raw-string `inputs`/`outputs` | ✅ All 5 nodes use `NodeConnectionTypes.Main` |
| 8 | LOW  | `scoring` multiOptions default casing | ✅ Fixed |
| 9 | LOW  | Empty `homepage` | ✅ Set per split package |
| 10 | LOW | npm provenance in GitHub Actions | ✅ Added to both publishes |

## Strategy chosen: (b) "submodules"

Each node is its own workspace package, published as:
- `n8n-nodes-agent-brains-trigger`
- `n8n-nodes-agent-brains-employee`
- `n8n-nodes-agent-brains-knowledge-base`
- `n8n-nodes-agent-brains-rag`
- `n8n-nodes-agent-brains-synthetic-qa`

Root `package.json` is `n8n-nodes-agent-brains-monorepo`, `private: true`, `workspaces: ["packages/*"]`.

**User migration:** the previously published `n8n-nodes-agent-brains` (bundled, v1.11.0) will be deprecated with a pointer to the 5 split packages.

## Shared code layout

All content that is byte-identical across the 5 published packages now has a single source of truth in `packages/shared/`:

```
packages/shared/
├── credentials/AgentBrainsIntegrationApi.credentials.ts
├── icons/agentBrainsIntegration.svg
└── nodes/constants.ts
```

**How it's wired:**
- `scripts/sync-shared.js` copies these into each `packages/<pkg>/` at the matching paths.
- Root `package.json` runs sync as `postinstall` (so fresh clones are wired after `npm install`) and exposes it as `npm run sync`.
- Each package's `package.json` runs sync as `prebuild`, so `npm run build` in any package first refreshes its synced files.
- Synced targets are listed in `.gitignore` — the only tracked copy is in `packages/shared/`.
- `tsconfig.base.json` at repo root holds the shared compiler options; each `packages/*/tsconfig.json` extends it and only specifies `outDir` + `include`.

**Duplicates removed (per package):**
- `credentials/AgentBrainsIntegrationApi.credentials.ts` (5× → 1×)
- `icons/agentBrainsIntegration.svg` (5× → 1×)
- `nodes/constants.ts` (5× → 1×)
- `tsconfig.json` (5× identical bodies → 5× thin files extending shared base)

## What the cleanup pass did (cumulative)

**Source tree:**
- Deleted legacy `nodes/` at repo root.
- Deleted stray `packages/trigger/nodes/IntegrationTrigger.node.{ts,json}` duplicates.
- Deleted root `credentials/`, `icons/`, `tsconfig.json` (orphans after the split).

**Content fixes in split packages:**
- `.node.json` categories: removed `"AI"` (4 files) and `"Trigger"` (trigger file).
- `.node.ts`: all 5 nodes use `NodeConnectionTypes.Main` instead of raw-string `'main'`.
- Trigger: removed broken `subtitle` referencing undefined `jobName`.

**Shared infra (new):**
- `packages/shared/` with canonical credentials, icon, constants.
- `scripts/sync-shared.js` for sync.
- `tsconfig.base.json` for shared compiler options.
- `.gitignore` excludes synced targets.
- Root `postinstall` + per-package `prebuild` wired.

## Still open

### #1 — Sync GitHub
- Force-push `master` from GitLab → GitHub (0.1.0 → current).
- Push all 24 tags to GitHub.
- Route tagged publishes through the GitHub Actions `publish-npm` job.
- **Needs your go-ahead** before force-pushing GitHub master.

### #2 — Unregister endpoint
- `packages/trigger/nodes/IntegrationTrigger/IntegrationTrigger.node.ts:62-83` currently calls `DELETE https://api.${domain}/webhooks/${webhookData.webhookId}`, but `create()` never stores a `webhookId`, so the whole body is skipped → effective no-op.
- Need confirmation of the real endpoint (`DELETE /api/n8n/register/:workflowId`? `.../unregister/:workflowId`?). Once confirmed, rewrite to mirror `create()` (same host, use `workflowId`, real HTTP call).

### Monorepo build/release tooling
- Per-package `build` is `tsc`. That compiles `.ts` but does **not** copy SVG icons or `.node.json` files into `dist/`. The old root `n8n-node build` did that; the split packages need an equivalent step (copy icons + node.json into `dist/` post-tsc, or swap `tsc` for `n8n-node build` per package if the CLI supports it).
- Release workflow needs to publish each workspace on tag with `--provenance --access public` and consistent versioning (changesets or synchronized `release-it`).

### Remaining root orphan
- `dist/` — pre-split build output from the old single-package. Not referenced by anything now (root is `private`). Delete now, or keep as rollback safety?

## Suggested next steps

1. Confirm the unregister endpoint → fix #2.
2. Build/release tooling rework for the monorepo shape (add icon + node.json copy step; per-package publish on tag).
3. Smoke-test each package builds and installs cleanly into n8n locally.
4. GitHub sync + tag push (#1, #10).
5. Deprecate the old bundled `n8n-nodes-agent-brains` on npm with a migration note.

## Progress log

- 2026-04-23 — Initial investigation complete. Plan drafted.
- 2026-04-23 — User progress: monorepo scaffolded, scoring casing fixed, homepage fixed per package, provenance added, inline codex blocks added, delete hook wired (but wrong endpoint).
- 2026-04-23 — Cleanup pass: deleted legacy root `nodes/`, fixed categories, replaced raw-string `inputs`/`outputs`, removed broken subtitle.
- 2026-04-23 — Shared-code consolidation: canonical credentials/icon/constants/tsconfig-base moved to `packages/shared/` and `tsconfig.base.json`. `scripts/sync-shared.js` + `postinstall` + `prebuild` wiring. Synced targets gitignored. Root orphans (`credentials/`, `icons/`, `tsconfig.json`) deleted. Remaining: #1 (GitHub sync), #2 (endpoint), monorepo build tooling, `dist/` orphan decision.
