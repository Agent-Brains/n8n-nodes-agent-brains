export const BASE_DOMAINS: Record<string, string> = {
    sandbox: 'dwm-sndbx-ai.com',
    staging: 'agent-brains.com',
};

export function getEnvironmentDomain(environment: string): string {
    return BASE_DOMAINS[environment] || BASE_DOMAINS.sandbox;
}
// Synthetic QA 
export const ADMIN_PANEL_EXTERNAL_BASE = 'https://admin-panel.dwm-sndbx-ai.com';

// Polling defaults
export const SYNTHETIC_QA_MAX_WAIT_SECONDS = 900; // 15 minutes
export const SYNTHETIC_QA_POLL_INTERVAL_SECONDS = 5; // 5 seconds

// External endpoints
export const EXTERNAL_SYNTH_USERS_URL = `${ADMIN_PANEL_EXTERNAL_BASE}/api/external/synthetic-users`;
export const EXTERNAL_GENERATE_OBJECTIVES_URL = `${ADMIN_PANEL_EXTERNAL_BASE}/api/external/generate-objectives`;
export const EXTERNAL_TEST_RUNS_START_URL = `${ADMIN_PANEL_EXTERNAL_BASE}/api/external/test-runs-start`;
export const EXTERNAL_TEST_RUNS_LIST_URL = `${ADMIN_PANEL_EXTERNAL_BASE}/api/external/test-runs-list`;