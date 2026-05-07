#!/usr/bin/env node
/**
 * patch-env.js — Replaces dist/nodes/constants.js in every workspace package
 * with hardcoded values for the target environment.
 *
 * Usage: node scripts/patch-env.js <sandbox|staging>
 *
 * Runs AFTER `npm run build` (which compiles each packages/* via tsc) and
 * overwrites the compiled constants so the published tarballs contain zero
 * runtime env lookups.
 */

const fs = require('fs');
const path = require('path');

const env = process.argv[2] || 'sandbox';

const DOMAINS = {
	sandbox: 'dwm-sndbx-ai.com',
	staging: 'agent-brains.com',
};

const domain = DOMAINS[env];
if (!domain) {
	console.error(`Unknown environment: "${env}". Use "sandbox" or "staging".`);
	process.exit(1);
}

const adminPanelBase = `https://admin-panel.${domain}`;

const output = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDomain = exports.DOMAINS = exports.EXTERNAL_TEST_RUNS_LIST_URL = exports.EXTERNAL_TEST_RUNS_START_URL = exports.EXTERNAL_GENERATE_OBJECTIVES_URL = exports.EXTERNAL_SYNTH_USERS_URL = exports.SYNTHETIC_QA_POLL_INTERVAL_SECONDS = exports.SYNTHETIC_QA_MAX_WAIT_SECONDS = exports.ADMIN_PANEL_EXTERNAL_BASE = exports.DOMAIN = void 0;
exports.DOMAIN = '${domain}';
exports.DOMAINS = { sandbox: 'dwm-sndbx-ai.com', staging: 'agent-brains.com' };
exports.ADMIN_PANEL_EXTERNAL_BASE = '${adminPanelBase}';
exports.SYNTHETIC_QA_MAX_WAIT_SECONDS = 900;
exports.SYNTHETIC_QA_POLL_INTERVAL_SECONDS = 5;
exports.EXTERNAL_SYNTH_USERS_URL = '${adminPanelBase}/api/external/synthetic-users';
exports.EXTERNAL_GENERATE_OBJECTIVES_URL = '${adminPanelBase}/api/external/generate-objectives';
exports.EXTERNAL_TEST_RUNS_START_URL = '${adminPanelBase}/api/external/test-runs-start';
exports.EXTERNAL_TEST_RUNS_LIST_URL = '${adminPanelBase}/api/external/test-runs-list';
exports.getDomain = function(credentials) {
    var override = (credentials.domain || '').trim();
    return override || exports.DOMAIN;
};
`;

const PACKAGES = ['platform', 'trigger'];

for (const pkg of PACKAGES) {
	const outFile = path.join(__dirname, '..', 'packages', pkg, 'dist', 'nodes', 'constants.js');
	if (!fs.existsSync(path.dirname(outFile))) {
		console.error(`patch-env: dist/nodes missing for ${pkg} — did you run \`npm run build\` first?`);
		process.exit(1);
	}
	fs.writeFileSync(outFile, output, 'utf8');
}

console.log(`✅ Patched constants.js in ${PACKAGES.length} packages → env=${env}, domain=${domain}`);
