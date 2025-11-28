
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
	customerCountry?: string;
	locale?: string;
	currency?: string;
	units?: string;
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
	[key: string]: unknown;
}

// eslint-disable-next-line
const API_BASE =
	process.env.AGENT_BRAINS_API_BASE || 'https://api.agent-brains.com';

const MAX_WAIT_SECONDS = 900; // 15 minutes
const POLL_INTERVAL_SECONDS = 5;   // 5 seconds

// TS in n8n node template doesn't know about setTimeout by default
declare function setTimeout(
	handler: (...args: unknown[]) => void,
	timeout?: number,
	...args: unknown[]
): unknown;

declare const process: {
	env: {
		[key: string]: string | undefined;
	};
};

export class AgentBrainsSyntheticEvaluator implements INodeType {
	methods = {
		loadOptions: {
			async getSyntheticUsers(this: ILoadOptionsFunctions) {
				const credentials = (await this.getCredentials(
					'agentBrainsIntegrationApi',
				)) as ICredentials;

				if (!credentials?.accessToken) {
					throw new NodeOperationError(this.getNode(), 'No AgentBrains credentials found.');
				}

				const usersResponse = await this.helpers.httpRequest({
					method: 'GET',
					url: `${API_BASE}/synthetic-users`,
					headers: {
						Authorization: `token ${credentials.accessToken}`,
					},
					json: true,
				});

				// We need to later adjust for our API shape. Assuming:
				// { users: [{ id: string, name: string }, ...] } or just an array
				const users = (usersResponse as { users?: ISyntheticUser[] }).users ?? (usersResponse as ISyntheticUser[]);

				return (users as ISyntheticUser[]).map((user) => ({
					name: user.name, // label in dropdown
					value: user.id, // value = synthetic user ID
				}));
			},
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Agent Brains Synthetic Evaluator',
		name: 'agentBrainsSyntheticEvaluator',
		group: ['transform'],
		version: 1,
		icon: 'file:../../icons/agentBrainsIntegration.svg',
		description:
			'Start a synthetic conversation via the orchestrator using dynamic synthetic users from AgentBrains',
		defaults: {
			name: 'Agent Brains Synthetic Evaluator',
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
				description: 'Choose which synthetic user / persona to use. Options are loaded from your AgentBrains account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			{
				displayName: 'Wait For Completion',
				name: 'waitForCompletion',
				type: 'boolean',
				default: true,
				description: 'Whether to poll the orchestrator for status until the run finishes or the internal max wait time is reached',
			},

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
				displayName: 'Constraints',
				name: 'constraints',
				type: 'string',
				default: `"budget_max: 1500", "magnification: up to 15x", "rifle_platform: AR15"`,
			},
			{
				displayName: 'Negotiation',
				name: 'negotiation',
				type: 'string',
				default: `"askPromotion: true", "coupon_to_try: XMAS10", "willing_to_waitlist: false"`,
			},
			{
				displayName: 'Privacy',
				name: 'privacy',
				type: 'string',
				default: `"share_email: true", "share_phone: false", "share_address: true"`,
			},
			{
				displayName: 'Success Criteria',
				name: 'success_criteria',
				type: 'string',
				default:
					'"Recommendation <= $1500", "Clear product link", "Promo explained/applied", "Shipping/returns clarified"',
			},
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = (await this.getCredentials(
			'agentBrainsIntegrationApi',
		)) as { accessToken?: string };

		if (!credentials?.accessToken) {
			throw new NodeOperationError(this.getNode(), 'No AgentBrains credentials found.');
		}

		const authHeaders = {
			Authorization: `token ${credentials.accessToken}`,
		};

		// Fetch configuration for orchestrator URLs
		const configResponse = await this.helpers.httpRequest({
			method: 'GET',
			url: `${API_BASE}/configuration`,
			json: true,
		});

		const { orchestratorStartUrl, orchestratorStatusUrl } = configResponse as IOrchestratorConfig;

		for (let i = 0; i < items.length; i++) {
			const syntheticUserId = this.getNodeParameter(
				'syntheticUserId',
				i,
			) as string;

			const waitForCompletion = this.getNodeParameter(
				'waitForCompletion',
				i,
			) as boolean;

			const customerObjective = this.getNodeParameter(
				'customerObjective',
				i,
			) as string;
			const secondaryObjectives = this.getNodeParameter(
				'secondaryObjectives',
				i,
			) as string;
			const constraints = this.getNodeParameter(
				'constraints',
				i,
			) as string;
			const negotiation = this.getNodeParameter(
				'negotiation',
				i,
			) as string;
			const privacy = this.getNodeParameter('privacy', i) as string;
			const success_criteria = this.getNodeParameter(
				'success_criteria',
				i,
			) as string;

			const syntheticUser = (await this.helpers.httpRequest({
				method: 'GET',
				url: `${API_BASE}/synthetic-users/${encodeURIComponent(
					syntheticUserId,
				)}`,
				json: true,
				headers: authHeaders,
			})) as ISyntheticUser;

			// Adjust field names to match API
			// Example assumptions:
			//   userWebhookUrl    = synthetic user webhook
			//   agentWebhookUrl   = agent workflow webhook in customer's n8n
			const userUrl = syntheticUser.userWebhookUrl;
			const agentUrl = syntheticUser.agentWebhookUrl;

			const initialMessage = syntheticUser.initialMessage ?? 'Hello';

			const role = syntheticUser.role;
			const persona_detail = syntheticUser.persona_detail;
			const customerCountry = syntheticUser.customerCountry;
			const locale = syntheticUser.locale;
			const currency = syntheticUser.currency;
			const units = syntheticUser.units;

			// Build payload for orchestrator
			const bodyPayload = {
				webhookUrl: agentUrl,
				initialMessage,
				customerParams: {
					userUrl,
					role,
					persona_detail,
					customerCountry,
					locale,
					currency,
					units,

					customerObjective,
					secondaryObjectives,
					constraints,
					negotiation,
					privacy,
					success_criteria,
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

			if (!waitForCompletion || !jobId) {
				// Fire-and-forget mode or missing jobId
				returnData.push({
					json: {
						mode: 'start-only',
						jobId,
						startRequest: startPayload,
						startResponse,
					},
				});
				continue;
			}
            
			const maxWaitMs = MAX_WAIT_SECONDS * 1000;
			const pollIntervalMs = POLL_INTERVAL_SECONDS * 1000;

			const startTime = Date.now();
			let finalStatus: IStatusResponse | null = null;

			while (Date.now() - startTime < maxWaitMs) {
				const statusResponse = await this.helpers.httpRequest({
					method: 'GET',
					url: `${orchestratorStatusUrl}?jobId=${encodeURIComponent(
						jobId,
					)}`,
					json: true,
					headers: authHeaders,
				});

				// Handle both object and array responses from status flow
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
				 
				await new Promise((resolve) =>
					setTimeout(resolve, pollIntervalMs),
				);
			}

			returnData.push({
				json: {
					mode: 'start-and-poll',
					jobId,
					startRequest: startPayload,
					startResponse,
					finalStatus,
					timedOut: finalStatus == null,
				},
			});
		}

		return [returnData];
	}
}
