import {
	NodeConnectionTypes,
	NodeOperationError,
	type IHttpRequestOptions,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	SYNTHETIC_QA_MAX_WAIT_SECONDS,
	SYNTHETIC_QA_POLL_INTERVAL_SECONDS,
	getDomain,
} from '../../nodes/constants';

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
				body: opts.body as IHttpRequestOptions['body'],
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
			`Could not reach the AgentBrains API (HTTP ${status})`,
			{
				description: `Check your API credentials and that the AgentBrains service is reachable. URL attempted: ${opts.url}. Response: ${typeof respBody === 'string' ? respBody : JSON.stringify(respBody)}`,
			}
		);
	}
}

async function sleep(
	ctx: IExecuteFunctions | ILoadOptionsFunctions,
	ms: number,
): Promise<void> {
	const maybeSleep = (
		ctx.helpers as typeof ctx.helpers & {
			sleep?: (milliseconds: number) => Promise<void>;
		}
	).sleep;

	if (typeof maybeSleep === 'function') {
		await maybeSleep.call(ctx.helpers, ms);
		return;
	}

	throw new NodeOperationError(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(ctx as any).getNode(),
		'Internal sleep helper is not available in this n8n version. Please upgrade n8n.',
	);
}

export class SyntheticQa implements INodeType {
	methods = {
		loadOptions: {
			async getSyntheticUsers(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials('agentBrainsIntegrationApi');
				const adminBase = `https://admin-panel.${getDomain(credentials)}`;
				const users = await externalRequest<IExternalSyntheticUser[]>(this, {
					method: 'GET',
					url: `${adminBase}/api/external/synthetic-users`,
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
		subtitle: '={{$parameter["syntheticUserId"]}}',
		description:
			'Runs a synthetic QA evaluation test on your agent and returns scoring results.',
		codex: {
			categories: ['Development'],
			subcategories: {
				Development: ['APIs'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://agent-brains.com/docs',
					},
				],
			},
		},
		defaults: {
			name: 'AgentBrains Synthetic QA',
		},
		credentials: [
			{
				name: 'agentBrainsIntegrationApi',
				required: true,
			},
		],
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Synthetic QA Name or ID',
				name: 'syntheticUserId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSyntheticUsers',
				},
				default: '',
				description:
					'Select a Synthetic QA for this test run. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Number of Test Conversations',
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
				default: ['Human-Free Issue Handling', 'Customers Mood Change'],
				description: 'Which behaviors should be evaluated and scored',
				options: [
					{ name: 'Customers Mood Change', value: 'Customers Mood Change' },
					{ name: 'Human-Free Issue Handling', value: 'Human-Free Issue Handling' },
					{ name: 'Information Completeness', value: 'Information Completeness' },
					{ name: 'Making a Sale', value: 'Making a Sale' },
					{ name: 'Objection Handling', value: 'Objection Handling' },
					{ name: 'On Task', value: 'On Task' },
					{ name: 'Problem Solving', value: 'Problem Solving' },
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Conversation Goals',
						name: 'manualGoals',
						type: 'string',
						default: '',
						placeholder: 'e.g. Ask about delivery time to California',
						description: 'Goals to use across all conversations. If empty, goals are auto-generated.',
					},
					{
						displayName: 'Promotion Details',
						name: 'negotiation',
						type: 'string',
						default: '',
						placeholder: 'e.g. Try coupon XMAS10',
						description: 'Promotion or negotiation text the synthetic user will apply during conversations',
					},
				],
			},
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('agentBrainsIntegrationApi');
		const adminBase = `https://admin-panel.${getDomain(credentials)}`;
		const SYNTH_USERS_URL = `${adminBase}/api/external/synthetic-users`;
		const GENERATE_OBJECTIVES_URL = `${adminBase}/api/external/generate-objectives`;
		const TEST_RUNS_START_URL = `${adminBase}/api/external/test-runs-start`;
		const TEST_RUNS_LIST_URL = `${adminBase}/api/external/test-runs-list`;

		// Fetch synthetic users once per execution (for customerParams fill)
		const allUsers = await externalRequest<IExternalSyntheticUser[]>(this, {
			method: 'GET',
			url: SYNTH_USERS_URL,
		});

		this.logger.info('[AB] Loaded synthetic users', {
			count: Array.isArray(allUsers) ? allUsers.length : 0,
		});

		for (let i = 0; i < items.length; i++) {
			const syntheticUserId = this.getNodeParameter('syntheticUserId', i) as string;
			const runs = this.getNodeParameter('runs', i) as number;
			const scoring = this.getNodeParameter('scoring', i, []) as string[];

			const options = this.getNodeParameter('options', i, {}) as {
				manualGoals?: string;
				negotiation?: string;
			};

			const manualGoalsRaw = options.manualGoals ?? '';
			const manualGoals = parseManualGoals(manualGoalsRaw);

			const negotiationRaw = options.negotiation ?? '';
			const negotiation = negotiationRaw.trim();

			const selectedUser = (allUsers ?? []).find((u) => u.id === syntheticUserId);
			if (!selectedUser) {
				throw new NodeOperationError(
					this.getNode(),
					`No synthetic QA found with the selected ID. Select a different QA from the list.`,
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
					url: GENERATE_OBJECTIVES_URL,
					body: { syntheticUserId },
				});

				const normalized = normalizeObjectivesPayload(genResp);
				customerObjective = normalized.main;
				secondaryObjectives = normalized.secondary;
			}

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const startResp = await externalRequest<any>(this, {
				method: 'POST',
				url: TEST_RUNS_START_URL,
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
					url: TEST_RUNS_LIST_URL,
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

				await sleep(this, pollIntervalMs);
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
