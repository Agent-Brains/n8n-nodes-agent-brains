# packages/shared

Single source of truth for content that has to be byte-identical across every published n8n package in this monorepo.

Tracked here:
- `credentials/AgentBrainsIntegrationApi.credentials.ts` — n8n credential class shared by every node.
- `icons/agentBrainsIntegration.svg` — node icon.
- `nodes/constants.ts` — runtime helpers (domain resolution, polling defaults).

## How the published packages consume these

n8n requires each published package to physically contain its own credentials and icon files under `dist/`. A workspace `dependencies` entry isn't enough — n8n's loader reads files from each package's own tarball. So instead of importing across packages, we **copy** the shared files into each `packages/<pkg>/` at install/build time:

- `scripts/sync-shared.js` performs the copy and prepends an `AUTO-GENERATED` header to each `.ts` file.
- Hooked into `postinstall` (root) and `prebuild` (every package).
- Synced targets are listed in the root `.gitignore` — never committed.
- `packages/shared/` is the only checked-in copy.

## Editing

Edit files **only here** (`packages/shared/`). Do **not** edit the synced copies in any `packages/<pkg>/credentials/`, `packages/<pkg>/icons/`, or `packages/<pkg>/nodes/constants.ts` — they get overwritten on the next sync.

To preview the sync result locally: `npm run sync` (from repo root).

## Adding a new shared file

1. Drop the file under `packages/shared/<rel>`.
2. Add the relative path to `FILES` in `scripts/sync-shared.js`.
3. Add a matching glob to the root `.gitignore` for the synced targets.
