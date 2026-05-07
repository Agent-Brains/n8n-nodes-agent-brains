import {
    NodeConnectionTypes,
    type IExecuteFunctions,
    type INodeExecutionData,
    type INodeType,
    type INodeTypeDescription,
    type ILoadOptionsFunctions,
    type INodePropertyOptions,
} from 'n8n-workflow';
import { getDomain } from '../../nodes/constants';

const GLOBAL_INDEX_OPTION: INodePropertyOptions = { name: 'Core Text Index (All Documents)', value: 'general_helper_documents' };

interface IIndex {
    _id: string;
    name: string;
}

export class AgentBrainsRag implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'AgentBrains RAG',
        name: 'agentBrainsRag',
        icon: 'file:../../icons/agentBrainsIntegration.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Retrieve information from AgentBrains RAG',
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
            name: 'AgentBrains RAG',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'agentBrainsIntegrationApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Retrieve Text',
                        value: 'text',
                        description: 'Retrieve text from an index',
                        action: 'Retrieve text',
                    },
                    {
                        name: 'Retrieve Image',
                        value: 'image',
                        description: 'Retrieve images from Core Image Index',
                        action: 'Retrieve image',
                    },
                ],
                default: 'text',
            },
            {
                displayName: 'Index Name or ID',
                name: 'index',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getIndexes',
                },
                displayOptions: {
                    show: {
                        operation: ['text'],
                    },
                },
                 
                default: 'general_helper_documents',
                required: true,
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
            },
            {
                displayName: 'Query',
                name: 'query',
                type: 'string',
                default: '',
                required: true,
                placeholder: 'e.g. What are the return policy terms?',
                description: 'The text to search for. When used as a tool, this is automatically filled by the AI model.',
            },
            {
                displayName: 'Extended Response',
                name: 'extendedResponse',
                type: 'boolean',
                default: true,
                displayOptions: {
                    show: {
                        operation: ['image'],
                    },
                },
                description: 'Whether to return the full API response. When disabled, only image URLs are returned.',
            },
            {
                displayName: 'Tool Description',
                name: 'toolDescription',
                type: 'string',
                default: '',
                placeholder: 'e.g. Use this tool to find product information',
                description: 'Description of what this tool does, for the AI Agent to understand when to use it',
            },
            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [

                    {
                        displayName: 'Top K',
                        name: 'topK',
                        type: 'number',
                        default: 10,
                        typeOptions: {
                            minValue: 1,
                        },
                        description: 'Number of results to return',
                    },
                    {
                        displayName: 'Metadata',
                        name: 'metadata',
                        type: 'json',
                        default: '{}',
                        description: 'Metadata filter to apply',
                    },
                ],
            },
        ],
    };

    methods = {
        loadOptions: {
            async getIndexes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                const credentials = await this.getCredentials('agentBrainsIntegrationApi');
                const apiBase = `https://api.${getDomain(credentials)}/knowledge-base`;
                try {
                    const response = await this.helpers.httpRequestWithAuthentication.call(
                        this,
                        'agentBrainsIntegrationApi',
                        {
                            method: 'GET',
                            url: `${apiBase}/indexes`,
                            json: true,
                            qs: { scope: 'knowledge-base' },
                        },
                    );

                    const indexes = (response as IIndex[]).map((index) => ({
                        name: index.name,
                        value: index._id,
                    }));

                    return [GLOBAL_INDEX_OPTION, ...indexes];
                } catch {
                    return [GLOBAL_INDEX_OPTION];
                }
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const credentials = await this.getCredentials('agentBrainsIntegrationApi');
        const apiBase = `https://api.${getDomain(credentials)}/knowledge-base`;
        const operation = this.getNodeParameter('operation', 0) as string;

        for (let i = 0; i < items.length; i++) {
            try {
                const query = this.getNodeParameter('query', i) as string;
                const options = this.getNodeParameter('options', i) as {
                    topK?: number;
                    metadata?: string | object;
                };

                let namespace: string;
                if (operation === 'text') {
                    namespace = this.getNodeParameter('index', i) as string;
                } else {
                    namespace = 'images';
                }

                let metadata = options.metadata;
                if (typeof metadata === 'string') {
                    try {
                        metadata = JSON.parse(metadata);
                    } catch {
                        // proceed with raw string or empty object if invalid
                    }
                }

                const body = {
                    index: namespace,
                    query,
                    metadata: metadata || {},
                    topK: options.topK || 5,
                };

                const response = await this.helpers.httpRequestWithAuthentication.call(
                    this,
                    'agentBrainsIntegrationApi',
                    {
                        method: 'POST',
                        url: `${apiBase}/retrieve`,
                        body,
                        json: true,
                        qs: { scope: 'knowledge-base' },
                    },
                );

                let result = response;

                // For image operation with extendedResponse disabled, extract only image URLs
                if (operation === 'image') {
                    const extendedResponse = this.getNodeParameter('extendedResponse', i, true) as boolean;
                    if (!extendedResponse) {
                        const items = Array.isArray(response) ? response : (response as { results?: unknown[] }).results || [];
                        result = (items as Array<{ metadata?: { url?: string };[key: string]: unknown }>)
                            .map((item) => item.metadata?.url || '')
                            .filter(Boolean);
                    }
                }

                returnData.push({
                    json: result,
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error.message || 'Unknown error',
                            details: error,
                        },
                    });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}

