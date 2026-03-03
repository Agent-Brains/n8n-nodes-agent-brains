declare const process: { env: Record<string, string | undefined> };
const TARGET_ENV = (process.env.TARGET_ENV as 'sandbox' | 'staging') || 'sandbox';

const DOMAINS: Record<string, string> = {
    sandbox: 'dwm-sndbx-ai.com',
    staging: 'agent-brains.com',
};

export const DOMAIN = DOMAINS[TARGET_ENV] || DOMAINS.sandbox;

// Synthetic QA
export const ADMIN_PANEL_EXTERNAL_BASE = `https://admin-panel.${DOMAIN}`;

// Polling defaults
export const SYNTHETIC_QA_MAX_WAIT_SECONDS = 900; // 15 minutes
export const SYNTHETIC_QA_POLL_INTERVAL_SECONDS = 5; // 5 seconds

// External endpoints
export const EXTERNAL_SYNTH_USERS_URL = `${ADMIN_PANEL_EXTERNAL_BASE}/api/external/synthetic-users`;
export const EXTERNAL_GENERATE_OBJECTIVES_URL = `${ADMIN_PANEL_EXTERNAL_BASE}/api/external/generate-objectives`;
export const EXTERNAL_TEST_RUNS_START_URL = `${ADMIN_PANEL_EXTERNAL_BASE}/api/external/test-runs-start`;
export const EXTERNAL_TEST_RUNS_LIST_URL = `${ADMIN_PANEL_EXTERNAL_BASE}/api/external/test-runs-list`;