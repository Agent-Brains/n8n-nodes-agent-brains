import {
	NodeOperationError,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

interface ICredentials {
	accessToken?: string; // External access key (Bearer token)
}

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

// ----- Config -----
const MAX_WAIT_SECONDS = 900; // 15 minutes
const POLL_INTERVAL_SECONDS = 5; // 5 seconds

// ----- External API endpoints -----
const EXTERNAL_BASE = 'https://admin-panel.dwm-sndbx-ai.com';

const EXTERNAL_SYNTH_USERS_URL = `${EXTERNAL_BASE}/api/external/synthetic-users`;
const EXTERNAL_GENERATE_OBJECTIVES_URL = `${EXTERNAL_BASE}/api/external/generate-objectives`;
const EXTERNAL_TEST_RUNS_START_URL = `${EXTERNAL_BASE}/api/external/test-runs-start`;
const EXTERNAL_TEST_RUNS_LIST_URL = `${EXTERNAL_BASE}/api/external/test-runs-list`;

// ---- Helpers ----
function maskKey(key: string) {
	const k = (key ?? '').trim();
	if (!k) return '';
	return `${k.slice(0, 6)}…${k.slice(-4)}`;
}

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

	// title = first non-empty line
	let idx = 0;
	while (idx < lines.length && !lines[idx].trim()) idx++;
	const title = idx < lines.length ? lines[idx].trim() : null;

	const headingRegex = /^[^\w]*\s*\d+\)\s+.+$/; // e.g. "🧾 1) Snapshot"
	const bulletRegex = /^[•\-\*]\s+/;

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
		apiKey: string;
		body?: unknown;
	},
): Promise<T> {
	const apiKey = (opts.apiKey ?? '').trim();

	try {
		return (await ctx.helpers.httpRequest({
			method: opts.method,
			url: opts.url,
			body: opts.body,
			json: true,
			headers: {
				Authorization: `Bearer ${apiKey}`,
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		})) as T;
	} catch (err: any) {
		const status = err?.statusCode ?? err?.response?.status ?? 'unknown';
		const respBody = err?.response?.body ?? err?.body ?? err?.message ?? err;

		throw new NodeOperationError(
			(ctx as any).getNode(),
			`External request failed (HTTP ${status})
URL: ${opts.url}
Auth: Bearer ${maskKey(apiKey)}
Response: ${typeof respBody === 'string' ? respBody : JSON.stringify(respBody)}`,
		);
	}
}

export class SyntheticQa implements INodeType {
	methods = {
		loadOptions: {
			async getSyntheticUsers(this: ILoadOptionsFunctions) {
				const credentials = (await this.getCredentials(
					'agentBrainsIntegrationApi',
				)) as ICredentials;

				const apiKey = (credentials?.accessToken ?? '').trim();
				if (!apiKey) {
					throw new NodeOperationError(
						this.getNode(),
						'No access key found. Add it to AgentBrains credentials (accessToken).',
					);
				}

				const users = await externalRequest<IExternalSyntheticUser[]>(this, {
					method: 'GET',
					url: EXTERNAL_SYNTH_USERS_URL,
					apiKey,
				});

				return (users ?? []).map((u) => ({
					name: `${u.name ?? u.id}${u.employee?.role ? ` (${u.employee.role})` : ''}`,
					value: u.id, // id is used as BOTH syntheticUserId and profileId
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
				displayName: 'Select Synthetic QA',
				name: 'syntheticUserId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSyntheticUsers',
				},
				default: '',
				description:
					'Select a Synthetic QA for this test run. To set up a new QA please visit the Agent Brains platform.',
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
				description: 'How many conversations to run for this synthetic test.',
			},
			{
				displayName: 'Conversation Quality Tests',
				name: 'scoring',
				type: 'multiOptions',
				default: ['Human-free Issue Handling', 'Customers Mood Change'],
				description: 'Which behaviors should be evaluated and scored.',
				options: [
					{ name: 'Information Completeness', value: 'Information Completeness' },
					{ name: 'On Task', value: 'On Task' },
					{ name: 'Objection Handling', value: 'Objection Handling' },
					{ name: 'Problem Solving', value: 'Problem Solving' },
					{ name: 'Making a Sale', value: 'Making a Sale' },
					{ name: 'Customers Mood Change', value: 'Customers Mood Change' },
					{ name: 'Human-free Issue Handling', value: 'Human-free Issue Handling' },
				],
			},
			{
				displayName: 'Show Advanced Settings',
				name: 'showAdvanced',
				type: 'boolean',
				default: false,
				description: 'Show optional advanced settings (not required).',
			},
			{
				displayName: 'Conversation Goals',
				name: 'manualGoals',
				type: 'string',
				default: '',
				placeholder: 'e.g. Ask about delivery time to California',
				description: 'If provided, these goals will be used across all conversations.',
				displayOptions: { show: { showAdvanced: [true] } },
			},
			{
				displayName: 'Promotion Details',
				name: 'negotiation',
				type: 'string',
				default: '',
				placeholder: 'e.g. Try coupon XMAS10',
				description:
					'If provided, the synthetic user will try to negotiate / apply promotions during the conversations.',
				displayOptions: { show: { showAdvanced: [true] } },
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

		const apiKey = (credentials?.accessToken ?? '').trim();
		if (!apiKey) {
			throw new NodeOperationError(
				this.getNode(),
				'No access key found. Add it to AgentBrains credentials (accessToken).',
			);
		}

		// Fetch synthetic users once per execution (for customerParams fill)
		const allUsers = await externalRequest<IExternalSyntheticUser[]>(this, {
			method: 'GET',
			url: EXTERNAL_SYNTH_USERS_URL,
			apiKey,
		});

		this.logger.info('[AB] Loaded synthetic users', {
			count: Array.isArray(allUsers) ? allUsers.length : 0,
		});

		for (let i = 0; i < items.length; i++) {
			const syntheticUserId = this.getNodeParameter(
				'syntheticUserId',
				i,
			) as string;
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

			this.logger.info('[AB] Starting evaluation run', {
				itemIndex: i,
				syntheticUserId,
				runs,
				scoring,
				showAdvanced,
				manualGoalsCount: manualGoals.length,
				hasNegotiation: negotiation.length > 0,
			});

			const selectedUser = (allUsers ?? []).find((u) => u.id === syntheticUserId);
			if (!selectedUser) {
				throw new NodeOperationError(
					this.getNode(),
					`Synthetic user not found for id: ${syntheticUserId}`,
				);
			}

			// profileId === syntheticUserId === id from /synthetic-users
			const profileId = syntheticUserId;

			// Fill customerParams from /synthetic-users response
			const personaDetail =
				selectedUser.configureSynteticUser?.personaDetail ?? '';
			const industries = selectedUser.industries ?? [];
			const personalities = selectedUser.personalities ?? [];
			const employeeRole = selectedUser.employee?.role ?? '';

			const customerParams = {
				role: employeeRole || 'customer',
				persona_detail: personaDetail,
				industries: industries.join(','),
				personalities: personalities.join(','),
			};

			// -------- Objectives logic --------
			let customerObjective: string[] = [];
			let secondaryObjectives: string[] = [];

			if (manualGoals.length > 0) {
				customerObjective = manualGoals;
				secondaryObjectives = [];

				this.logger.info('[AB] Using manual goals (advanced settings)', {
					customerObjectiveCount: customerObjective.length,
					sample: customerObjective.slice(0, 3),
				});
			} else {
				const genBody = { syntheticUserId };

				this.logger.info('[AB] Calling generate objectives endpoint', {
					url: EXTERNAL_GENERATE_OBJECTIVES_URL,
					body: genBody,
				});

				const genResp = await externalRequest<IGenerateObjectivesResponse>(this, {
					method: 'POST',
					url: EXTERNAL_GENERATE_OBJECTIVES_URL,
					apiKey,
					body: genBody,
				});

				this.logger.info('[AB] Generate objectives response (raw)', {
					preview: JSON.stringify(genResp).slice(0, 2000),
				});

				const normalized = normalizeObjectivesPayload(genResp);
				customerObjective = normalized.main;
				secondaryObjectives = normalized.secondary;

				this.logger.info('[AB] Normalized objectives', {
					mainCount: customerObjective.length,
					secondaryCount: secondaryObjectives.length,
					mainSample: customerObjective.slice(0, 3),
					secondarySample: secondaryObjectives.slice(0, 3),
				});
			}

			// 1) Start a new test run
			const startBody = {
				profileId,
				runs,
				scoring,
				runs_config: {
					customerObjective,
					secondaryObjectives,
					negotiation,
				},
				customerParams,
			};

			this.logger.info('[AB] Starting test run (payload)', {
				url: EXTERNAL_TEST_RUNS_START_URL,
				profileId,
				runs,
				scoring,
				customerParams,
				runs_config: {
					customerObjectiveCount: customerObjective.length,
					customerObjectiveSample: customerObjective.slice(0, 3),
					secondaryObjectivesCount: secondaryObjectives.length,
					secondaryObjectivesSample: secondaryObjectives.slice(0, 3),
					hasNegotiation: negotiation.length > 0,
				},
			});

			const startResp = await externalRequest<any>(this, {
				method: 'POST',
				url: EXTERNAL_TEST_RUNS_START_URL,
				apiKey,
				body: startBody,
			});

			this.logger.info('[AB] Start test run response', {
				preview: JSON.stringify(startResp).slice(0, 1500),
			});

			const startedId: string | null =
				startResp?.testId ??
				startResp?.id ??
				startResp?.data?.testId ??
				startResp?.data?.id ??
				null;

			this.logger.info('[AB] Polling for completion', {
				startedId,
				maxWaitSeconds: MAX_WAIT_SECONDS,
				pollIntervalSeconds: POLL_INTERVAL_SECONDS,
			});

			// 2) Poll test runs list until status=completed
			const maxWaitMs = MAX_WAIT_SECONDS * 1000;
			const pollIntervalMs = POLL_INTERVAL_SECONDS * 1000;

			const startTime = Date.now();
			let completedDoc: ITestRunDoc | null = null;

			while (Date.now() - startTime < maxWaitMs) {
				const listResp = await externalRequest<ITestRunsListResponse>(this, {
					method: 'GET',
					url: EXTERNAL_TEST_RUNS_LIST_URL,
					apiKey,
				});

				const docs = Array.isArray(listResp?.docs) ? listResp.docs : [];
				let candidate: ITestRunDoc | undefined;

				if (startedId) {
					candidate = docs.find(
						(d) => d.testId === startedId || d.id === startedId,
					);
				} else {
					candidate = docs[0];
				}

				const status = candidate?.status;

				this.logger.info('[AB] Poll tick', {
					startedId,
					docsCount: docs.length,
					candidateId: candidate?.id,
					candidateTestId: candidate?.testId,
					status,
				});

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

			const reportText = (completedDoc as any)?.report?.text ?? null;
			const reportParsed = parseReportText(reportText);

			this.logger.info('[AB] Completed (or timed out)', {
				startedId,
				completed: Boolean(completedDoc),
				status: completedDoc?.status,
				scoringTestsCount: completedDoc?.scoringTests?.length ?? 0,
				hasReport: Boolean(reportText),
			});

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