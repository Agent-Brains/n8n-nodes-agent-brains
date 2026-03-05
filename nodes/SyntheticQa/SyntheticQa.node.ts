import {
	NodeOperationError,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	EXTERNAL_SYNTH_USERS_URL,
	EXTERNAL_GENERATE_OBJECTIVES_URL,
	EXTERNAL_TEST_RUNS_START_URL,
	EXTERNAL_TEST_RUNS_LIST_URL,
	SYNTHETIC_QA_MAX_WAIT_SECONDS,
	SYNTHETIC_QA_POLL_INTERVAL_SECONDS,
} from '../constants';

interface IExternalSyntheticUser {
	id: string;
	name?: string;
	industries?: string[];
	personalities?: string[];
	employee?: { id?: string; role?: string };
	isActive?: boolean;
	configureSynteticUser?: { personaDetail?: string };
}

interface IGenerateObjectivesResponseItem {
	main?: string[];
	secondary?: string[];
}

type IGenerateObjectivesResponse =
	| IGenerateObjectivesResponseItem[]
	| IGenerateObjectivesResponseItem;

interface ITestRunDoc {
	id?: string;
	testId?: string;
	status?: string;
	scoringTests?: Array<{ name: string; score: number; id?: string }>;
	report?: { text?: string };
}

interface ITestRunsListResponse {
	docs?: ITestRunDoc[];
}

// TS in n8n node template doesn't know about setTimeout by default
declare function setTimeout(
	handler: (...args: unknown[]) => void,
	timeout?: number,
	...args: unknown[]
): unknown;

// ---- Helpers ----
function parseManualGoals(raw: string): string[] {
	const v = (raw ?? '').trim();
	if (!v) return [];
	const parts = v
		.split(/\r?\n|;/g)
		.map((s) => s.trim())
		.filter(Boolean);
	return parts.length ? parts : [v];
}

function normalizeObjectivesPayload(
	genResp: IGenerateObjectivesResponse,
): { main: string[]; secondary: string[] } {
	const item = Array.isArray(genResp) ? genResp[0] : genResp;
	const main = Array.isArray(item?.main) ? item.main : [];
	const secondary = Array.isArray(item?.secondary) ? item.secondary : [];
	return { main, secondary };
}

function parseReportText(reportText: unknown): {
	title: string | null;
	sections: Array<{ heading: string; bullets: string[]; body?: string[] }>;
} {
	if (typeof reportText !== 'string' || !reportText.trim()) {
		return { title: null, sections: [] };
	}

	const lines = reportText
		.replace(/\r\n/g, '\n')
		.split('\n')
		.map((l) => l.trimEnd());

	let idx = 0;
	while (idx < lines.length && !lines[idx].trim()) idx++;
	const title = idx < lines.length ? lines[idx].trim() : null;

	const headingRegex = /^[^\w]*\s*\d+\)\s+.+$/; // e.g. "🧾 1) Snapshot"
	const bulletRegex = /^[•\-*]\s+/;

	const isUnderline = (line: string) => /^=+$/.test(line) || /^-+$/.test(line);

	const sections: Array<{ heading: string; bullets: string[]; body?: string[] }> =
		[];

	let current:
		| { heading: string; bullets: string[]; body: string[] }
		| null = null;

	for (let i = idx + 1; i < lines.length; i++) {
		const line = (lines[i] ?? '').trim();
		if (!line) continue;
		if (isUnderline(line)) continue;

		if (headingRegex.test(line)) {
			if (current) {
				sections.push({
					heading: current.heading,
					bullets: current.bullets,
					body: current.body.length ? current.body : undefined,
				});
			}
			current = { heading: line, bullets: [], body: [] };
			continue;
		}

		if (bulletRegex.test(line)) {
			const cleaned = line.replace(bulletRegex, '').trim();
			if (!current) current = { heading: 'Report', bullets: [], body: [] };
			if (cleaned) current.bullets.push(cleaned);
			continue;
		}

		if (!current) current = { heading: 'Report', bullets: [], body: [] };
		current.body.push(line);
	}

	if (current) {
		sections.push({
			heading: current.heading,
			bullets: current.bullets,
			body: current.body.length ? current.body : undefined,
		});
	}

	return { title, sections };
}

async function externalRequest<T>(
	ctx: IExecuteFunctions | ILoadOptionsFunctions,
	opts: {
		method: 'GET' | 'POST';
		url: string;
		body?: unknown;
	},
): Promise<T> {
	try {
		return (await ctx.helpers.httpRequestWithAuthentication.call(
			ctx,
			'agentBrainsIntegrationApi',
			{
				method: opts.method,
				url: opts.url,
				body: opts.body,
				json: true,
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
			},
		)) as T;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (err: any) {
		const status = err?.statusCode ?? err?.response?.status ?? 'unknown';
		const respBody = err?.response?.body ?? err?.body ?? err?.message ?? err;

		throw new NodeOperationError(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(ctx as any).getNode(),
			`External request failed (HTTP ${status})
URL: ${opts.url}
Response: ${typeof respBody === 'string' ? respBody : JSON.stringify(respBody)}`,
		);
	}
}

export class SyntheticQa implements INodeType {
	methods = {
		loadOptions: {
			async getSyntheticUsers(this: ILoadOptionsFunctions) {
				const users = await externalRequest<IExternalSyntheticUser[]>(this, {
					method: 'GET',
					url: EXTERNAL_SYNTH_USERS_URL,
				});

				return (users ?? []).map((u) => ({
					name: `${u.name ?? u.id}${u.employee?.role ? ` (${u.employee.role})` : ''}`,
					value: u.id,
				}));
			},
		},
	};

	description: INodeTypeDescription = {
		displayName: 'AgentBrains Synthetic QA',
		name: 'syntheticQa',
		group: ['transform'],
		version: 1,
		icon: 'file:../../icons/agentBrainsIntegration.svg',
		description:
			'Runs a synthetic QA evaluation test on your agent and returns scoring results.',
		defaults: {
			name: 'AgentBrains Synthetic QA',
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
				displayName: 'Select Synthetic QA Name or ID',
				name: 'syntheticUserId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSyntheticUsers',
				},
				default: '',
				description: 'Select a Synthetic QA for this test run. To set up a new QA please visit the Agent Brains platform. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Choose Amount of Test Conversations',
				name: 'runs',
				type: 'number',
				default: 10,
				typeOptions: {
					minValue: 1,
					numberPrecision: 0,
				},
				description: 'How many conversations to run for this synthetic test',
			},
			{
				displayName: 'Conversation Quality Tests',
				name: 'scoring',
				type: 'multiOptions',
				default: ['Human-free Issue Handling', 'Customers Mood Change'],
				description: 'Which behaviors should be evaluated and scored',
				options: [
					{ name: 'Customers Mood Change', value: 'Customers Mood Change' },
					{ name: 'Human-Free Issue Handling', value: 'Human-free Issue Handling' },
					{ name: 'Information Completeness', value: 'Information Completeness' },
					{ name: 'Making a Sale', value: 'Making a Sale' },
					{ name: 'Objection Handling', value: 'Objection Handling' },
					{ name: 'On Task', value: 'On Task' },
					{ name: 'Problem Solving', value: 'Problem Solving' },
				],
			},
			{
				displayName: 'Show Advanced Settings',
				name: 'showAdvanced',
				type: 'boolean',
				default: false,
				description: 'Whether to show optional advanced settings (not required)',
			},
			{
				displayName: 'Conversation Goals',
				name: 'manualGoals',
				type: 'string',
				default: '',
				placeholder: 'e.g. Ask about delivery time to California',
				description: 'If provided, these goals will be used across all conversations',
				displayOptions: { show: { showAdvanced: [true] } },
			},
			{
				displayName: 'Promotion Details',
				name: 'negotiation',
				type: 'string',
				default: '',
				placeholder: 'e.g. Try coupon XMAS10',
				description: 'If provided, the synthetic user will try to negotiate / apply promotions during the conversations',
				displayOptions: { show: { showAdvanced: [true] } },
			},
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Fetch synthetic users once per execution (for customerParams fill)
		const allUsers = await externalRequest<IExternalSyntheticUser[]>(this, {
			method: 'GET',
			url: EXTERNAL_SYNTH_USERS_URL,
		});

		this.logger.info('[AB] Loaded synthetic users', {
			count: Array.isArray(allUsers) ? allUsers.length : 0,
		});

		for (let i = 0; i < items.length; i++) {
			const syntheticUserId = this.getNodeParameter('syntheticUserId', i) as string;
			const runs = this.getNodeParameter('runs', i) as number;
			const scoring = this.getNodeParameter('scoring', i, []) as string[];

			const showAdvanced = this.getNodeParameter('showAdvanced', i) as boolean;

			const manualGoalsRaw = showAdvanced
				? ((this.getNodeParameter('manualGoals', i) as string) ?? '')
				: '';
			const manualGoals = parseManualGoals(manualGoalsRaw);

			const negotiationRaw = showAdvanced
				? ((this.getNodeParameter('negotiation', i) as string) ?? '')
				: '';
			const negotiation = (negotiationRaw ?? '').trim();

			const selectedUser = (allUsers ?? []).find((u) => u.id === syntheticUserId);
			if (!selectedUser) {
				throw new NodeOperationError(
					this.getNode(),
					`Synthetic user not found for id: ${syntheticUserId}`,
				);
			}

			const profileId = syntheticUserId;

			const personaDetail = selectedUser.configureSynteticUser?.personaDetail ?? '';
			const industries = selectedUser.industries ?? [];
			const personalities = selectedUser.personalities ?? [];
			const employeeRole = selectedUser.employee?.role ?? '';

			const customerParams = {
				role: employeeRole || 'customer',
				persona_detail: personaDetail,
				industries: industries.join(','),
				personalities: personalities.join(','),
			};

			let customerObjective: string[] = [];
			let secondaryObjectives: string[] = [];

			if (manualGoals.length > 0) {
				customerObjective = manualGoals;
				secondaryObjectives = [];
			} else {
				const genResp = await externalRequest<IGenerateObjectivesResponse>(this, {
					method: 'POST',
					url: EXTERNAL_GENERATE_OBJECTIVES_URL,
					body: { syntheticUserId },
				});

				const normalized = normalizeObjectivesPayload(genResp);
				customerObjective = normalized.main;
				secondaryObjectives = normalized.secondary;
			}

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const startResp = await externalRequest<any>(this, {
				method: 'POST',
				url: EXTERNAL_TEST_RUNS_START_URL,
				body: {
					profileId,
					runs,
					scoring,
					runs_config: {
						customerObjective,
						secondaryObjectives,
						negotiation,
					},
					customerParams,
				},
			});

			const startedId: string | null =
				startResp?.testId ??
				startResp?.id ??
				startResp?.data?.testId ??
				startResp?.data?.id ??
				null;

			const maxWaitMs = SYNTHETIC_QA_MAX_WAIT_SECONDS * 1000;
			const pollIntervalMs = SYNTHETIC_QA_POLL_INTERVAL_SECONDS * 1000;

			const startTime = Date.now();
			let completedDoc: ITestRunDoc | null = null;

			while (Date.now() - startTime < maxWaitMs) {
				const listResp = await externalRequest<ITestRunsListResponse>(this, {
					method: 'GET',
					url: EXTERNAL_TEST_RUNS_LIST_URL,
				});

				const docs = Array.isArray(listResp?.docs) ? listResp.docs : [];
				const candidate = startedId
					? docs.find((d) => d.testId === startedId || d.id === startedId)
					: docs[0];

				const status = candidate?.status;

				if (candidate && status === 'completed') {
					completedDoc = candidate;
					break;
				}

				if (candidate && (status === 'failed' || status === 'error')) {
					completedDoc = candidate;
					break;
				}

				await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
			}

			const scoringTestsClean = (completedDoc?.scoringTests ?? []).map((t) => ({
				name: t.name,
				score: t.score,
			}));

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const reportText = (completedDoc as any)?.report?.text ?? null;
			const reportParsed = parseReportText(reportText);

			returnData.push({
				json: {
					scoringTests: scoringTestsClean,
					report: reportParsed,
				},
			});
		}

		return [returnData];
	}
}