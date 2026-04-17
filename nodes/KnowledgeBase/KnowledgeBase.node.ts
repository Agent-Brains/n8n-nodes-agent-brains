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
import { getDomain } from '../constants';

/* eslint-disable @typescript-eslint/no-explicit-any */

enum Resource {
	Entity = 'entity',
	Category = 'category',
	CategoryAlias = 'categoryAlias',
	Attachment = 'attachment',
	RelationshipType = 'relationshipType',
	CompanyData = 'companyData',
}

enum Operation {
	Get = 'get',
	GetAll = 'getAll',
	GetAllDocuments = 'getAllDocuments',
	GetRelationships = 'getRelationships',
	GetAttachments = 'getAttachments',
	GetByCategoryAlias = 'getByCategoryAlias',
	GetByAlias = 'getByAlias',
}

export class KnowledgeBase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AgentBrains Knowledge Base',
		name: 'knowledgeBase',
		icon: 'file:../../icons/agentBrainsIntegration.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the AgentBrains Knowledge Base (Entities, Categories)',
		defaults: {
			name: 'AgentBrains Knowledge Base',
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

						name: 'Images',
						value: Resource.Attachment,
						description: 'Files and media attached to entities',
					},
					{
						name: 'Relationship Types',
						value: Resource.RelationshipType,
						description: 'Types of relationships that can exist between entities',
					},
					{
						name: 'Company Data',
						value: Resource.CompanyData,
						description: 'Retrieve company-level data and configuration as a single object',
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
					{
						name: 'Get All Documents',
						value: Operation.GetAllDocuments,
						description: 'Retrieve all documents from the knowledge base',
						action: 'Get all documents',
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
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: [Resource.RelationshipType],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: Operation.GetAll,
						description: 'List many relationship types',
						action: 'List many relationship types',
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
				displayName: 'Category Names or IDs',
				name: 'categoryId',
				type: 'multiOptions',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getCategories',
				},
				displayOptions: {
					show: {
						resource: [Resource.Entity],
						operation: [Operation.GetAll],
					},
				},
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
			// Operations for entity: getRelationships
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: [Resource.Entity],
						operation: [Operation.GetRelationships],
					},
				},
				options: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'string',
						default: '',
						description: 'Filters relationships by a specific type (e.g., "is-accessory-for")',
					},
				],
			},
			// Operations for entity: getAll
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [Resource.Entity, Resource.Category, Resource.Attachment, Resource.RelationshipType],
						operation: [
							Operation.GetAll,
							Operation.GetAllDocuments,
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
						resource: [Resource.Entity, Resource.Category, Resource.CategoryAlias, Resource.Attachment, Resource.RelationshipType],
						operation: [
							Operation.GetAll,
							Operation.GetAllDocuments,
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
						operation: [Operation.GetAll],
					},
				},
				description: 'Performs a case-insensitive text search across the name, description, and details fields',
			},
			{
				displayName: 'Recursive',
				name: 'recursive',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: [Resource.Entity],
						operation: [Operation.GetAll],
					},
				},
				description: 'Whether to fetch all entities from the category subtree',
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
			// Operations for entity: getAllDocuments
			{
				displayName: 'Merge Documents',
				name: 'mergeDocuments',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: [Resource.Entity],
						operation: [Operation.GetAllDocuments],
					},
				},
				description: 'Whether to merge all document contents into a single combined output',
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
			// Operations for attachment: getAll
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: [Resource.Attachment],
						operation: [Operation.GetAll],
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
				],
			},

		],
		usableAsTool: true,
	};

	methods = {
		loadOptions: {
			async getCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('agentBrainsIntegrationApi');
				const apiBase = `https://api.${getDomain(credentials)}/knowledge-base`;
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
				const credentials = await this.getCredentials('agentBrainsIntegrationApi');
				const apiBase = `https://api.${getDomain(credentials)}/knowledge-base`;
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
		const credentials = await this.getCredentials('agentBrainsIntegrationApi');
		const apiBase = `https://api.${getDomain(credentials)}/knowledge-base`;
		const rootApiBase = `https://api.${getDomain(credentials)}`;
		const resource = this.getNodeParameter('resource', 0) as Resource;

		for (let i = 0; i < items.length; i++) {
			try {
				// Company Data is a fixed single-object fetch — no operation selector needed.
				if (resource === Resource.CompanyData) {
					const companyData = await handleCompanyData(this, rootApiBase);
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray([companyData as IDataObject]),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}

				const operation = this.getNodeParameter('operation', 0) as Operation;
				let responseData: IDataObject | IDataObject[] = [];

				if (resource === Resource.Entity) {
					responseData = await handleEntity(this, operation, i, apiBase);
				} else if (resource === Resource.Category) {
					responseData = await handleCategory(this, operation, i, apiBase);
				} else if (resource === Resource.CategoryAlias) {
					responseData = await handleCategoryAlias(this, operation, apiBase);
				} else if (resource === Resource.Attachment) {
					responseData = await handleAttachment(this, operation, i, apiBase);
				} else if (resource === Resource.RelationshipType) {
					responseData = await handleRelationshipType(this, operation, apiBase);
				}

				let itemsData = processResponse(responseData, operation, this, i);

				// Merge documents if the toggle is enabled
				if (resource === Resource.Entity && operation === Operation.GetAllDocuments) {
					const mergeDocuments = this.getNodeParameter('mergeDocuments', i, false) as boolean;
					if (mergeDocuments) {
						// Unwrap the { items: [...] } wrapper added by processResponse
						const docs = Array.isArray(itemsData[0]?.items) ? (itemsData[0].items as IDataObject[]) : itemsData;
						const mergedContent = docs
							.map((doc: IDataObject) => {
								const parts: string[] = [];
								if (doc.name) parts.push(`## ${doc.name}`);
								if (doc.description) parts.push(String(doc.description));
								if (doc.details) parts.push(String(doc.details));
								return parts.join('\n\n');
							})
							.filter((text: string) => text.length > 0)
							.join('\n\n---\n\n');
						itemsData = [{ mergedContent, documentCount: docs.length }];
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(itemsData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

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
			const categoryIds = ctx.getNodeParameter('categoryId', i, []) as string[];
			const search = ctx.getNodeParameter('search', i, '') as string;
			const recursive = ctx.getNodeParameter('recursive', i, false) as boolean;
			const additionalFields = ctx.getNodeParameter('additionalFields', i) as IDataObject;
			const qs: IDataObject = { ...additionalFields };
			if (categoryIds.length > 0) qs.categoryId = categoryIds.join(',');
			if (search) qs.search = search;
			if (recursive) qs.recursive = true;
			return await makeRequest(ctx, 'GET', `${apiBase}/entities`, qs);
		},
		[Operation.Get]: async () => {
			const id = ctx.getNodeParameter('id', i) as string;
			return await makeRequest(ctx, 'GET', `${apiBase}/entities/${id}`);
		},
		[Operation.GetRelationships]: async () => {
			const id = ctx.getNodeParameter('id', i) as string;
			const additionalFields = ctx.getNodeParameter('additionalFields', i, {}) as IDataObject;
			const qs: IDataObject = { ...additionalFields };
			return await makeRequest(ctx, 'GET', `${apiBase}/entities/${id}/relationships`, qs);
		},
		[Operation.GetAttachments]: async () => {
			const id = ctx.getNodeParameter('id', i) as string;
			return await makeRequest(ctx, 'GET', `${apiBase}/entities/${id}/attachments`);
		},
		[Operation.GetByCategoryAlias]: async () => {
			const categoryAlias = ctx.getNodeParameter('categoryAlias', i) as string;
			const additionalFields = ctx.getNodeParameter('additionalFields', i) as IDataObject;
			const qs: IDataObject = { ...additionalFields };
			return await makeRequest(ctx, 'GET', `${apiBase}/entities/${categoryAlias}`, qs);
		},
		[Operation.GetAllDocuments]: async () => {
			return await makeRequest(ctx, 'GET', `${apiBase}/entities`);
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

async function handleRelationshipType(
	ctx: IExecuteFunctions,
	operation: Operation,
	apiBase: string,
): Promise<IDataObject | IDataObject[]> {
	if (operation === Operation.GetAll) {
		return await makeRequest(ctx, 'GET', `${apiBase}/relationship-types`);
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

async function handleCompanyData(
	ctx: IExecuteFunctions,
	rootApiBase: string,
): Promise<IDataObject> {
	const response = await makeRequest(ctx, 'GET', `${rootApiBase}/company/info`);
	// Always return a single object
	if (Array.isArray(response)) {
		return response[0] ?? {};
	}
	return response as IDataObject;
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
			Operation.GetAllDocuments,
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
		// Special request: wrap list responses in an object
		return [{ items: itemsData }];
	}
	return itemsData as IDataObject[];
}
