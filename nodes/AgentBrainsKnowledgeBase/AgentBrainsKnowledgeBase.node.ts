import {
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestMethods,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

/* eslint-disable @typescript-eslint/no-explicit-any */

enum Resource {
	Entity = 'entity',
	Category = 'category',
	CategoryAlias = 'categoryAlias',
	Attachment = 'attachment',
}

enum Operation {
	Get = 'get',
	GetAll = 'getAll',
	GetRelationships = 'getRelationships',
	GetAttachments = 'getAttachments',
	GetByCategoryAlias = 'getByCategoryAlias',
	GetByAlias = 'getByAlias',
}

declare const process: {
	env: {
		[key: string]: string | undefined;
	};
};

declare const console: {
	log(message?: any, ...optionalParams: any[]): void;
	error(message?: any, ...optionalParams: any[]): void;
};

export class AgentBrainsKnowledgeBase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Agent Brains Knowledge Base',
		name: 'agentBrainsKnowledgeBase',
		icon: 'file:../../icons/agentBrainsIntegration.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Agent Brains Knowledge Base',
		defaults: {
			name: 'Agent Brains Knowledge Base',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'agentBrainsIntegrationApi',
				required: true,
			},
		],
		properties: [
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						// eslint-disable-next-line
						name: 'Documents',
						value: Resource.Entity,
						description: 'Individual items like documents, products, or services stored in the knowledge base',
					},
					{
						name: 'Category',
						value: Resource.Category,
						description: 'Logical groups used to segregate and organize related entities',
					},
					{
						name: 'Category Type',
						value: Resource.CategoryAlias,
						description: 'Classifications used to segregate categories into specific types or hierarchies',
					},
					{
						 
						name: 'Images',
						value: Resource.Attachment,
						description: 'Files and media attached to entities',
					},
				],
				default: Resource.Entity,
			},
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: [Resource.Entity],
					},
				},
				options: [
					{
						name: 'Get',
						value: Operation.Get,
						description: 'Get an entity by ID',
						action: 'Get an entity',
					},
					{
						name: 'Get Many',
						value: Operation.GetAll,
						description: 'Retrieve many entities',
						action: 'Get many entities',
					},
					{
						name: 'Get Related Entities',
						value: Operation.GetRelationships,
						description: 'Retrieve a list of entities that are linked to the specified entity',
						action: 'Get related entities',
					},
					{
						name: 'Get by Category Type',
						value: Operation.GetByCategoryAlias,
						description: 'List entities by category type',
						action: 'List entities by category type',
					},
				],
				default: Operation.GetAll,
			},
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: [Resource.Category],
					},
				},
				options: [
					{
						name: 'Get',
						value: Operation.Get,
						description: 'Get a category by ID',
						action: 'Get a category',
					},
					{
						name: 'Get Many',
						value: Operation.GetAll,
						description: 'List many categories',
						action: 'List many categories',
					},
					{
						name: 'Get by Type',
						value: Operation.GetByAlias,
						description: 'List categories by type key',
						action: 'List categories by type key',
					},
				],
				default: Operation.GetAll,
			},
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: [Resource.CategoryAlias],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: Operation.GetAll,
						description: 'List many category types',
						action: 'List many category types',
					},
				],
				default: Operation.GetAll,
			},
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: [Resource.Attachment],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: Operation.GetAll,
						description: 'List many images',
						action: 'List many images',
					},
					{
						name: 'Get',
						value: Operation.Get,
						description: 'Get an image by ID',
						action: 'Get an image',
					},
				],
				default: Operation.GetAll,
			},
			// Common parameters
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [Resource.Entity, Resource.Category, Resource.Attachment],
						operation: [Operation.Get, Operation.GetRelationships, Operation.GetAttachments],
					},
				},
				description: 'The ID of the resource',
			},
			{
				displayName: 'Category Name or ID',
				name: 'categoryId',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getCategories',
				},
				displayOptions: {
					show: {
						resource: [Resource.Entity],
						operation: [Operation.GetAll],
					},
				},
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Category Type Name or ID',
				name: 'categoryAlias',
				type: 'options',
				default: '',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getCategoryAliases',
				},
				displayOptions: {
					show: {
						resource: [Resource.Entity, Resource.Category],
						operation: [Operation.GetByCategoryAlias, Operation.GetByAlias],
					},
				},
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			// Operations for entity: getAll
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [Resource.Entity, Resource.Category, Resource.CategoryAlias, Resource.Attachment],
						operation: [
							Operation.GetAll,
							Operation.GetByCategoryAlias,
							Operation.GetByAlias,
							Operation.GetRelationships,
							Operation.GetAttachments,
						],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: [Resource.Entity, Resource.Category, Resource.CategoryAlias, Resource.Attachment],
						operation: [
							Operation.GetAll,
							Operation.GetByCategoryAlias,
							Operation.GetByAlias,
							Operation.GetRelationships,
							Operation.GetAttachments,
						],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: [Resource.Entity],
						operation: [Operation.GetAll, Operation.GetByCategoryAlias],
					},
				},
				description: 'Performs a case-insensitive text search across the name, description, and details fields',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: [Resource.Entity],
						operation: [Operation.GetAll, Operation.GetByCategoryAlias],
					},
				},
				options: [
					{
						displayName: 'Fields',
						name: 'fields',
						type: 'string',
						default: '',
						description: 'Selects which fields to include in the response (comma-separated)',
					},
					{
						displayName: 'SKU',
						name: 'sku',
						type: 'string',
						default: '',
						description: 'Retrieves an entity by its exact Stock Keeping Unit (SKU)',
					},
					{
						displayName: 'Source',
						name: 'source',
						type: 'string',
						default: '',
						description: 'Filters entities by their original source identifier',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description: 'Filters entities by one or more tags (comma-separated)',
					},
				],
			},
			// Operations for category: getAll
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: [Resource.Category],
						operation: [Operation.GetAll],
					},
				},
				options: [
					{
						displayName: 'Category Type',
						name: 'categoryAlias',
						type: 'string',
						default: '',
						description: 'Filters categories by a specific category type ID',
					},
					{
						displayName: 'Extended',
						name: 'extended',
						type: 'boolean',
						default: false,
						description: 'Whether to populate policy, parent and children fields',
					},
					{
						displayName: 'Fields',
						name: 'fields',
						type: 'string',
						default: '',
						description: 'Selects which fields to include in the response (comma-separated)',
					},
					{
						displayName: 'Parent',
						name: 'parent',
						type: 'string',
						default: '',
						description: 'Filters categories by a parent ID. Use "null" to get top-level categories.',
					},
					{
						displayName: 'Policy',
						name: 'policy',
						type: 'string',
						default: '',
						description: 'Filters categories by a specific policy ID',
					},
					{
						displayName: 'Search',
						name: 'search',
						type: 'string',
						default: '',
						description: 'Performs a case-insensitive text search',
					},
				],
			},
		],
		usableAsTool: true,
	};

	methods = {
		loadOptions: {
			async getCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const apiBase = `${process.env.AGENT_BRAINS_API_BASE || 'https://sds.agent-brains.com'}/integration`;
				const responseData = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'agentBrainsIntegrationApi',
					{
						method: 'GET',
						url: `${apiBase}/categories`,
						json: true,
						qs: { scope: 'knowledge-base', extended: 'true' },
					},
				);

				let items: IDataObject[] = [];
				if (Array.isArray(responseData)) {
					items = responseData as IDataObject[];
				} else if (responseData && typeof responseData === 'object') {
					const itemObj = responseData as IDataObject;
					if (Array.isArray(itemObj.data)) {
						items = itemObj.data as IDataObject[];
					} else if (Array.isArray(itemObj.value)) {
						items = itemObj.value as IDataObject[];
					}
				}

				const categoryMap = new Map<string, IDataObject>();
				items.forEach((item) => categoryMap.set(item._id as string, item));

				const getFullName = (item: IDataObject, visited: Set<string> = new Set()): string => {
					if (visited.has(item._id as string)) {
						return (item.name as string) || (item._id as string);
					}
					visited.add(item._id as string);

					if (item.parent) {
						let parentId: string | undefined;
						if (typeof item.parent === 'string') {
							parentId = item.parent;
						} else if (typeof item.parent === 'object' && item.parent && '_id' in item.parent) {
							parentId = (item.parent as IDataObject)._id as string;
						}

						if (parentId) {
							const parent = categoryMap.get(parentId);
							if (parent) {
								return `${getFullName(parent, visited)} > ${item.name}`;
							}
						}
					}
					return (item.name as string) || (item._id as string);
				};

				const options = items.map((item) => {
					return {
						name: getFullName(item),
						value: item._id as string,
					};
				});

				options.sort((a, b) => a.name.localeCompare(b.name));

				return options;
			},
			async getCategoryAliases(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const apiBase = `${process.env.AGENT_BRAINS_API_BASE || 'https://sds.agent-brains.com'}/integration`;
				const responseData = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'agentBrainsIntegrationApi',
					{
						method: 'GET',
						url: `${apiBase}/category-aliases`,
						json: true,
						qs: { scope: 'knowledge-base' },
					},
				);

				let items: IDataObject[] = [];
				if (Array.isArray(responseData)) {
					items = responseData as IDataObject[];
				} else if (responseData && typeof responseData === 'object') {
					const itemObj = responseData as IDataObject;
					if (Array.isArray(itemObj.data)) {
						items = itemObj.data as IDataObject[];
					} else if (Array.isArray(itemObj.value)) {
						items = itemObj.value as IDataObject[];
					}
				}

				return items.map((item) => {
					return ({
						name: (item.name as string) || (item.aliasKey as string),
						value: (item.aliasKey as string),
					});
				});
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as Resource;
		const operation = this.getNodeParameter('operation', 0) as Operation;

		const API_BASE = `${process.env.AGENT_BRAINS_API_BASE || 'https://sds.agent-brains.com'}/integration`;

		for (let i = 0; i < items.length; i++) {
			try {
				console.log(`[AgentBrains Debug] Processing item ${i}`);
				let responseData: IDataObject | IDataObject[] = [];

				if (resource === Resource.Entity) {
					responseData = await handleEntity(this, operation, i, API_BASE);
				} else if (resource === Resource.Category) {
					responseData = await handleCategory(this, operation, i, API_BASE);
				} else if (resource === Resource.CategoryAlias) {
					responseData = await handleCategoryAlias(this, operation, API_BASE);
				} else if (resource === Resource.Attachment) {
					responseData = await handleAttachment(this, operation, i, API_BASE);
				}

				const itemsData = processResponse(responseData, operation, this, i);

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(itemsData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);

			} catch (error) {
				console.error(`[AgentBrains Debug] Error processing item ${i}`, error);
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		console.log('[AgentBrains Debug] Execute finished', {
			returnDataCount: returnData.length,
		});

		return [returnData];
	}
}

async function makeRequest(
	ctx: IExecuteFunctions,
	method: IHttpRequestMethods,
	url: string,
	qs?: IDataObject,
): Promise<IDataObject | IDataObject[]> {
	const query = { ...qs, scope: 'knowledge-base' };
	const response = await ctx.helpers.httpRequestWithAuthentication.call(
		ctx,
		'agentBrainsIntegrationApi',
		{
			method,
			url,
			qs: query,
			json: true,
		},
	);
	return response;
}

async function handleEntity(
	ctx: IExecuteFunctions,
	operation: Operation,
	i: number,
	apiBase: string,
): Promise<IDataObject | IDataObject[]> {
	const operations: { [key: string]: () => Promise<IDataObject | IDataObject[]> } = {
		[Operation.GetAll]: async () => {
			const categoryId = ctx.getNodeParameter('categoryId', i, '') as string;
			const search = ctx.getNodeParameter('search', i, '') as string;
			const additionalFields = ctx.getNodeParameter('additionalFields', i) as IDataObject;
			const qs: IDataObject = { ...additionalFields };
			if (categoryId) qs.categoryId = categoryId;
			if (search) qs.search = search;
			return await makeRequest(ctx, 'GET', `${apiBase}/entities`, qs);
		},
		[Operation.Get]: async () => {
			const id = ctx.getNodeParameter('id', i) as string;
			return await makeRequest(ctx, 'GET', `${apiBase}/entities/${id}`);
		},
		[Operation.GetRelationships]: async () => {
			const id = ctx.getNodeParameter('id', i) as string;
			return await makeRequest(ctx, 'GET', `${apiBase}/entities/${id}/relationships`);
		},
		[Operation.GetAttachments]: async () => {
			const id = ctx.getNodeParameter('id', i) as string;
			return await makeRequest(ctx, 'GET', `${apiBase}/entities/${id}/attachments`);
		},
		[Operation.GetByCategoryAlias]: async () => {
			const categoryAlias = ctx.getNodeParameter('categoryAlias', i) as string;
			const additionalFields = ctx.getNodeParameter('additionalFields', i) as IDataObject;
			const search = ctx.getNodeParameter('search', i) as string;
			const qs: IDataObject = { ...additionalFields };
			if (search) qs.search = search;
			return await makeRequest(ctx, 'GET', `${apiBase}/entities/${categoryAlias}`, qs);
		},
	};

	if (operation in operations) {
		return await operations[operation]();
	}

	return [];
}

async function handleCategory(
	ctx: IExecuteFunctions,
	operation: Operation,
	i: number,
	apiBase: string,
): Promise<IDataObject | IDataObject[]> {
	const operations: { [key: string]: () => Promise<IDataObject | IDataObject[]> } = {
		[Operation.GetAll]: async () => {
			const additionalFields = ctx.getNodeParameter('additionalFields', i) as IDataObject;
			const qs: IDataObject = { ...additionalFields };
			return await makeRequest(ctx, 'GET', `${apiBase}/categories`, qs);
		},
		[Operation.Get]: async () => {
			const id = ctx.getNodeParameter('id', i) as string;
			return await makeRequest(ctx, 'GET', `${apiBase}/categories/${id}`);
		},
		[Operation.GetByAlias]: async () => {
			const categoryAlias = ctx.getNodeParameter('categoryAlias', i) as string;
			return await makeRequest(ctx, 'GET', `${apiBase}/categories/${categoryAlias}`);
		},
	};

	if (operation in operations) {
		return await operations[operation]();
	}

	return [];
}

async function handleCategoryAlias(
	ctx: IExecuteFunctions,
	operation: Operation,
	apiBase: string,
): Promise<IDataObject | IDataObject[]> {
	if (operation === Operation.GetAll) {
		return await makeRequest(ctx, 'GET', `${apiBase}/category-aliases`);
	}
	return [];
}

async function handleAttachment(
	ctx: IExecuteFunctions,
	operation: Operation,
	i: number,
	apiBase: string,
): Promise<IDataObject | IDataObject[]> {
	const operations: { [key: string]: () => Promise<IDataObject | IDataObject[]> } = {
		[Operation.GetAll]: async () => {
			const additionalFields = ctx.getNodeParameter('additionalFields', i, {}) as IDataObject;
			const qs: IDataObject = { ...additionalFields };
			return await makeRequest(ctx, 'GET', `${apiBase}/attachments`, qs);
		},
		[Operation.Get]: async () => {
			const id = ctx.getNodeParameter('id', i) as string;
			return await makeRequest(ctx, 'GET', `${apiBase}/attachments/${id}`);
		},
	};

	if (operation in operations) {
		return await operations[operation]();
	}

	return [];
}

function processResponse(
	responseData: IDataObject | IDataObject[],
	operation: Operation,
	ctx: IExecuteFunctions,
	i: number,
): IDataObject[] {
	let itemsData = responseData;
	if (!Array.isArray(itemsData)) {
		if (itemsData && typeof itemsData === 'object') {
			const itemObj = itemsData as IDataObject;
			if ('data' in itemObj && Array.isArray(itemObj.data)) {
				itemsData = itemObj.data as IDataObject[];
			} else if ('value' in itemObj && Array.isArray(itemObj.value)) {
				itemsData = itemObj.value as IDataObject[];
			}
		}
	}

	if (!Array.isArray(itemsData)) {
		itemsData = [itemsData as IDataObject];
	}

	// Handle Limit for getAll operations
	// Operations that return list: getAll, getRelationships, getAttachments, getByCategoryAlias, getByAlias
	if (
		[
			Operation.GetAll,
			Operation.GetRelationships,
			Operation.GetAttachments,
			Operation.GetByCategoryAlias,
			Operation.GetByAlias,
		].includes(operation)
	) {
		const returnAll = ctx.getNodeParameter('returnAll', i);
		if (!returnAll) {
			const limit = ctx.getNodeParameter('limit', i) as number;
			itemsData = (itemsData as IDataObject[]).slice(0, limit);
		}
	}
	return itemsData as IDataObject[];
}
