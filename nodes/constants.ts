export const BASE_DOMAINS: Record<string, string> = {
    sandbox: 'dwm-sndbx-ai.com',
    staging: 'agent-brains.com',
};

export function getEnvironmentDomain(environment: string): string {
    return BASE_DOMAINS[environment] || BASE_DOMAINS.sandbox;
}
