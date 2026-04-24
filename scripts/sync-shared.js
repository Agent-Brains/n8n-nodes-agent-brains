#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHARED = path.join(ROOT, 'packages', 'shared');
const PACKAGES = ['trigger', 'employee', 'knowledge-base', 'rag', 'synthetic-qa'];

const FILES = [
	'credentials/AgentBrainsIntegrationApi.credentials.ts',
	'icons/agentBrainsIntegration.svg',
	'nodes/constants.ts',
];

for (const pkg of PACKAGES) {
	for (const rel of FILES) {
		const from = path.join(SHARED, rel);
		const to = path.join(ROOT, 'packages', pkg, rel);
		fs.mkdirSync(path.dirname(to), { recursive: true });
		fs.copyFileSync(from, to);
	}
}

console.log(`synced ${FILES.length} shared files to ${PACKAGES.length} packages`);
