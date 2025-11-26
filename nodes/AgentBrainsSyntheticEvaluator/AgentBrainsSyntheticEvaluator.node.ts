
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

const API_BASE = 'https://api.agent-brains.com';

const ORCHESTRATOR_START_URL =
	'http://localhost:5678/webhook/ed5ec429-5b66-420b-91ce-e1be079b3fe2';

const ORCHESTRATOR_STATUS_URL =
	'http://localhost:5678/webhook/20fab592-bb37-4ae3-bde5-6b7a458e287e';

const MAX_WAIT_SECONDS = 900;      // 15 minutes
const POLL_INTERVAL_SECONDS = 5;   // 5 seconds

// TS in n8n node template doesn't know about setTimeout by default
declare function setTimeout(
	handler: (...args: any[]) => void,
	timeout?: number,
	...args: any[]
): any;

export class AgentBrainsSyntheticEvaluator implements INodeType {
	methods = {
		loadOptions: {
			async getSyntheticUsers(this: ILoadOptionsFunctions) {
				const credentials = (await this.getCredentials(
					'agentBrainsIntegrationApi',
				)) as { accessToken?: string };

				if (!credentials?.accessToken) {
					throw new Error('No AgentBrains credentials found.');
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
				const users = (usersResponse as any).users ?? usersResponse;

				return (users as Array<{ id: string; name: string }>).map((user) => ({
					name: user.name, // label in dropdown
					value: user.id,  // value = synthetic user ID
				}));
			},
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Agent Brains Synthetic Evaluator',
		name: 'agentBrainsSyntheticEvaluator',
		group: ['transform'],
		version: 1,
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
				displayName: 'Select Synthetic User',
				name: 'syntheticUserId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSyntheticUsers',
				},
				default: '',
				description:
					'Choose which synthetic user / persona to use. Options are loaded from your AgentBrains account.',
			},

			{
				displayName: 'Wait For Completion',
				name: 'waitForCompletion',
				type: 'boolean',
				default: true,
				description:
					'If enabled, this node will poll the orchestrator for status until the run finishes or the internal max wait time is reached.',
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
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = (await this.getCredentials(
			'agentBrainsIntegrationApi',
		)) as { accessToken?: string };

		if (!credentials?.accessToken) {
			throw new Error('No AgentBrains credentials found.');
		}

		const authHeaders = {
			Authorization: `token ${credentials.accessToken}`,
		};

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

			const syntheticUser = await this.helpers.request({
				method: 'GET',
				uri: `${API_BASE}/synthetic-users/${encodeURIComponent(
					syntheticUserId,
				)}`,
				json: true,
				headers: authHeaders,
			});

			// Adjust field names to match API
			// Example assumptions:
			//   userWebhookUrl    = synthetic user webhook
			//   agentWebhookUrl   = agent workflow webhook in customer's n8n
			const userUrl = (syntheticUser as any).userWebhookUrl as string;
			const agentUrl = (syntheticUser as any).agentWebhookUrl as string;

			const initialMessage =
				((syntheticUser as any).initialMessage as string) ?? 'Hello';

			const role = (syntheticUser as any).role as string;
			const persona_detail = (syntheticUser as any).persona_detail as string;
			const customerCountry = (syntheticUser as any).customerCountry as string;
			const locale = (syntheticUser as any).locale as string;
			const currency = (syntheticUser as any).currency as string;
			const units = (syntheticUser as any).units as string;

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
			const startResponse = await this.helpers.request({
				method: 'POST',
				uri: ORCHESTRATOR_START_URL,
				body: startPayload,
				json: true,
				headers: authHeaders,
			});

			// Expect the orchestrator to return a jobId
			const jobId =
				(startResponse as any).jobId ??
				((Array.isArray(startResponse) && (startResponse as any)[0]?.jobId) ||
					null);

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
			let finalStatus: any = null;

			while (Date.now() - startTime < maxWaitMs) {
				const statusResponse = await this.helpers.request({
					method: 'GET',
					uri: `${ORCHESTRATOR_STATUS_URL}?jobId=${encodeURIComponent(
						jobId,
					)}`,
					json: true,
					headers: authHeaders,
				});

				// Handle both object and array responses from status flow
				const statusObj = Array.isArray(statusResponse)
					? (statusResponse as any)[0]
					: statusResponse;

				const state =
					(statusObj as any).state ?? (statusObj as any).status;

				if (state === 'finished' || state === 'failed' || state === 'error') {
					finalStatus = statusObj;
					break;
				}

				// Wait before next poll
				// eslint-disable-next-line no-await-in-loop
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
