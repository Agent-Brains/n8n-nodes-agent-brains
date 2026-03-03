#!/usr/bin/env node
/**
 * patch-env.js — Replaces dist/nodes/constants.js with hardcoded values for the target environment.
 * Usage: node scripts/patch-env.js <sandbox|staging>
 *
 * This runs AFTER `tsc` build and overwrites the compiled constants
 * so the published package contains zero runtime env lookups.
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
exports.EXTERNAL_TEST_RUNS_LIST_URL = exports.EXTERNAL_TEST_RUNS_START_URL = exports.EXTERNAL_GENERATE_OBJECTIVES_URL = exports.EXTERNAL_SYNTH_USERS_URL = exports.SYNTHETIC_QA_POLL_INTERVAL_SECONDS = exports.SYNTHETIC_QA_MAX_WAIT_SECONDS = exports.ADMIN_PANEL_EXTERNAL_BASE = exports.DOMAIN = void 0;
exports.DOMAIN = '${domain}';
exports.ADMIN_PANEL_EXTERNAL_BASE = '${adminPanelBase}';
exports.SYNTHETIC_QA_MAX_WAIT_SECONDS = 900;
exports.SYNTHETIC_QA_POLL_INTERVAL_SECONDS = 5;
exports.EXTERNAL_SYNTH_USERS_URL = '${adminPanelBase}/api/external/synthetic-users';
exports.EXTERNAL_GENERATE_OBJECTIVES_URL = '${adminPanelBase}/api/external/generate-objectives';
exports.EXTERNAL_TEST_RUNS_START_URL = '${adminPanelBase}/api/external/test-runs-start';
exports.EXTERNAL_TEST_RUNS_LIST_URL = '${adminPanelBase}/api/external/test-runs-list';
`;

const outFile = path.join(__dirname, '..', 'dist', 'nodes', 'constants.js');
fs.writeFileSync(outFile, output, 'utf8');

console.log(`✅ Patched constants.js → env=${env}, domain=${domain}`);
