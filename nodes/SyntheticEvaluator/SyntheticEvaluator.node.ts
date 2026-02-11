import {
	NodeOperationError,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

interface ICredentials {
	accessToken?: string;
}

interface ISyntheticUser {
	id: string;
	name: string;
	userWebhookUrl?: string;
	agentWebhookUrl?: string;
	initialMessage?: string;
	role?: string;
	persona_detail?: string;
}

interface IOrchestratorConfig {
	orchestratorStartUrl: string;
	orchestratorStatusUrl: string;
}

interface IStartResponse {
	jobId?: string;
}

interface IStatusResponse {
	state?: string;
	status?: string;
	jobId?: string;
	history?: string;
	scores?: unknown; // can be stringified JSON or array/object
	[key: string]: unknown;
}


const BASE_DOMAINS: Record<string, string> = {
	sandbox: 'dwm-sndbx-ai.com',
	staging: 'agent-brains.com',
};

function getApiBase(environment: string): string {
	const domain = BASE_DOMAINS[environment] || BASE_DOMAINS.sandbox;
	return `https://api.${domain}`;
}

const MAX_WAIT_SECONDS = 900; // 15 minutes
const POLL_INTERVAL_SECONDS = 5; // 5 seconds

// TS in n8n node template doesn't know about setTimeout by default
declare function setTimeout(
	handler: (...args: unknown[]) => void,
	timeout?: number,
	...args: unknown[]
): unknown;




function parseHistory(
	history: string | undefined | null,
): Array<{ speaker: string; text: string }> {
	const turns: Array<{ speaker: string; text: string }> = [];
	if (!history || typeof history !== 'string') return turns;

	const regex = /(Assistant|Customer):\s*/g;

	let lastIndex = 0;
	let currentSpeaker: string | null = null;
	let match = regex.exec(history);

	while (match) {
		if (currentSpeaker !== null) {
			const text = history.slice(lastIndex, match.index).trim();
			if (text) turns.push({ speaker: currentSpeaker, text });
		}

		currentSpeaker = match[1];
		lastIndex = regex.lastIndex;
		match = regex.exec(history);
	}

	if (currentSpeaker !== null) {
		const text = history.slice(lastIndex).trim();
		if (text) turns.push({ speaker: currentSpeaker, text });
	}

	return turns;
}

export class SyntheticEvaluator implements INodeType {
	methods = {
		loadOptions: {
			async getSyntheticUsers(this: ILoadOptionsFunctions) {
				const nodeOptions = this.getNodeParameter('options', {}) as { environment?: string };
				const apiBase = getApiBase(nodeOptions.environment || 'sandbox');
				const credentials = (await this.getCredentials(
					'agentBrainsIntegrationApi',
				)) as ICredentials;

				if (!credentials?.accessToken) {
					throw new NodeOperationError(
						this.getNode(),
						'No AgentBrains credentials found.',
					);
				}

				const usersResponse = await this.helpers.httpRequest({
					method: 'GET',
					url: `${apiBase}/synthetic-users`,
					headers: {
						Authorization: `token ${credentials.accessToken}`,
					},
					json: true,
				});

				const users =
					(usersResponse as { users?: ISyntheticUser[] }).users ??
					(usersResponse as ISyntheticUser[]);

				return (users as ISyntheticUser[]).map((user) => ({
					name: user.name,
					value: user.id,
				}));
			},
		},
	};

	description: INodeTypeDescription = {
		displayName: 'AgentBrains Synthetic Evaluator',
		name: 'syntheticEvaluator',
		group: ['transform'],
		version: 1,
		icon: 'file:../../icons/agentBrainsIntegration.svg',
		description:
			'Start a synthetic conversation via the orchestrator using dynamic synthetic users from AgentBrains',
		defaults: {
			name: 'AgentBrains Synthetic Evaluator',
		},
		credentials: [
			{
				name: 'agentBrainsIntegrationApi',
				required: true,
			},
		],
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Select Synthetic User Name or ID',
				name: 'syntheticUserId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSyntheticUsers',
				},
				default: '',
				description:
					'Choose which synthetic user / persona to use. Options are loaded from your AgentBrains account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// NEW: Scores (multi-select)
			{
				displayName: 'Scores',
				name: 'scores',
				type: 'multiOptions',
				default: [
					'information_completeness',
					'objection_handling',
					'making_a_sale',
					'human_free_issue_handling',
				],
				description: 'Which evaluation scores should be calculated for this conversation',
				options: [
					{ name: "Customer's Mood Change", value: 'customers_mood_change' },
					{
						name: 'Human-Free Issue Handling',
						value: 'human_free_issue_handling',
					},
					{ name: 'Information Completeness', value: 'information_completeness' },
					{ name: 'Making a Sale', value: 'making_a_sale' },
					{ name: 'Objection Handling', value: 'objection_handling' },
					{ name: 'On Task', value: 'on_task' },
					{ name: 'Problem Solving', value: 'problem_solving' },
				],
			},

			// Remaining editable fields (constraints + privacy removed)
			{
				displayName: 'Customer Objective',
				name: 'customerObjective',
				type: 'string',
				default: 'Purchase a thermal scope under 1500$',
			},
			{
				displayName: 'Secondary Objectives',
				name: 'secondaryObjectives',
				type: 'string',
				default: `"Ask for deals", "Ask for LRF"`,
			},
			{
				displayName: 'Negotiation',
				name: 'negotiation',
				type: 'string',
				default: `"askPromotion: true", "coupon_to_try: XMAS10", "willing_to_waitlist: false"`,
			},
			{
				displayName: 'Success Criteria',
				name: 'success_criteria',
				type: 'string',
				default:
					'"Recommendation <= $1500", "Clear product link", "Promo explained/applied", "Shipping/returns clarified"',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Environment',
						name: 'environment',
						type: 'options',
						default: 'sandbox',
						description: 'Select the environment to run requests against',
						options: [
							{
								name: 'Sandbox',
								value: 'sandbox',
								description: 'Use the sandbox environment (dwm-sndbx-ai.com)',
							},
							{
								name: 'Staging',
								value: 'staging',
								description: 'Use the staging environment (agent-brains.com)',
							},
						],
					},
				],
			},
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = (await this.getCredentials(
			'agentBrainsIntegrationApi',
		)) as ICredentials;

		if (!credentials?.accessToken) {
			throw new NodeOperationError(
				this.getNode(),
				'No AgentBrains credentials found.',
			);
		}

		const nodeOptions = this.getNodeParameter('options', 0, {}) as { environment?: string };
		const apiBase = getApiBase(nodeOptions.environment || 'sandbox');

		const authHeaders = {
			Authorization: `token ${credentials.accessToken}`,
		};

		// Fetch configuration for orchestrator URLs
		const configResponse = await this.helpers.httpRequest({
			method: 'GET',
			url: `${apiBase}/configuration`,
			json: true,
		});

		const { orchestratorStartUrl, orchestratorStatusUrl } =
			configResponse as IOrchestratorConfig;

		for (let i = 0; i < items.length; i++) {
			const syntheticUserId = this.getNodeParameter(
				'syntheticUserId',
				i,
			) as string;

			// Editable overrides
			const customerObjective = this.getNodeParameter(
				'customerObjective',
				i,
			) as string;
			const secondaryObjectives = this.getNodeParameter(
				'secondaryObjectives',
				i,
			) as string;
			const negotiation = this.getNodeParameter('negotiation', i) as string;
			const success_criteria = this.getNodeParameter(
				'success_criteria',
				i,
			) as string;

			// NEW: selected scores (multiOptions)
			const selectedScores = this.getNodeParameter('scores', i, []) as string[];

			const scores = {
				information_completeness: selectedScores.includes(
					'information_completeness',
				),
				on_task: selectedScores.includes('on_task'),
				objection_handling: selectedScores.includes('objection_handling'),
				problem_solving: selectedScores.includes('problem_solving'),
				making_a_sale: selectedScores.includes('making_a_sale'),
				customers_mood_change: selectedScores.includes('customers_mood_change'),
				human_free_issue_handling: selectedScores.includes(
					'human_free_issue_handling',
				),
			};

			const syntheticUser = (await this.helpers.httpRequest({
				method: 'GET',
				url: `${apiBase}/synthetic-users/${encodeURIComponent(
					syntheticUserId,
				)}`,
				json: true,
				headers: authHeaders,
			})) as ISyntheticUser;

			const userUrl = syntheticUser.userWebhookUrl;
			const agentUrl = syntheticUser.agentWebhookUrl;

			if (!userUrl) {
				throw new NodeOperationError(
					this.getNode(),
					'Synthetic user is missing userWebhookUrl.',
				);
			}
			if (!agentUrl) {
				throw new NodeOperationError(
					this.getNode(),
					'Synthetic user is missing agentWebhookUrl.',
				);
			}

			const initialMessage = syntheticUser.initialMessage ?? 'Hello';

			const role = syntheticUser.role;
			const persona_detail = syntheticUser.persona_detail;

			// Build payload for orchestrator (country/locale/currency/units removed)
			const bodyPayload = {
				webhookUrl: agentUrl,
				initialMessage,
				customerParams: {
					userUrl,
					role,
					persona_detail,

					// Node-level overrides
					customerObjective,
					secondaryObjectives,
					negotiation,
					success_criteria,

					// NEW: scores block
					scores,
				},
			};

			const startPayload = [bodyPayload];

			// Start the synthetic run
			const startResponse = await this.helpers.httpRequest({
				method: 'POST',
				url: orchestratorStartUrl,
				body: startPayload,
				json: true,
				headers: authHeaders,
			});

			// Expect the orchestrator to return a jobId
			const startResponseData = Array.isArray(startResponse)
				? (startResponse as IStartResponse[])[0]
				: (startResponse as IStartResponse);
			const jobId = startResponseData?.jobId || null;

			if (!jobId) {
				returnData.push({
					json: {
						jobId: null,
						state: null,
						turns: [],
						scores: [],
						timedOut: true,
						error: 'Orchestrator did not return a jobId',
					},
				});
				continue;
			}

			// Always poll (Wait For Completion removed)
			const maxWaitMs = MAX_WAIT_SECONDS * 1000;
			const pollIntervalMs = POLL_INTERVAL_SECONDS * 1000;

			const startTime = Date.now();
			let finalStatus: IStatusResponse | null = null;

			while (Date.now() - startTime < maxWaitMs) {
				const statusResponse = await this.helpers.httpRequest({
					method: 'GET',
					url: `${orchestratorStatusUrl}?jobId=${encodeURIComponent(jobId)}`,
					json: true,
					headers: authHeaders,
				});

				const statusObj = (
					Array.isArray(statusResponse)
						? (statusResponse as IStatusResponse[])[0]
						: (statusResponse as IStatusResponse)
				) as IStatusResponse;

				const state = statusObj.state ?? statusObj.status;

				if (state === 'finished' || state === 'failed' || state === 'error') {
					finalStatus = statusObj;
					break;
				}

				// Wait before next poll

				await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
			}

			// Output formatting (same as your updated v3 idea)
			const state = finalStatus?.state ?? finalStatus?.status ?? null;

			const turns = parseHistory(
				typeof finalStatus?.history === 'string' ? finalStatus.history : null,
			);

			let parsedScores: unknown = [];
			if (finalStatus?.scores !== undefined) {
				try {
					if (typeof finalStatus.scores === 'string') {
						parsedScores = JSON.parse(finalStatus.scores);
					} else {
						parsedScores = finalStatus.scores;
					}
				} catch {
					parsedScores = finalStatus.scores;
				}
			}

			returnData.push({
				json: {
					jobId,
					state,
					turns,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					scores: parsedScores as any,
					timedOut: finalStatus == null,
				},
			});
		}

		return [returnData];
	}
}
