import {
    type IExecuteFunctions,
    type INodeExecutionData,
    type INodeType,
    type INodeTypeDescription,
    type ILoadOptionsFunctions,
    type INodePropertyOptions,
} from 'n8n-workflow';

declare const process: {
    env: {
        [key: string]: string | undefined;
    };
};

declare const console: any;

const API_BASE = `${process.env.AGENT_BRAINS_API_BASE || 'https://sds.dwm-sndbx-ai.com'}/integration`;

interface IIndex {
    _id: string;
    name: string;
}

export class RAG implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Agent Brains RAG',
        name: 'agentBrainsRag',
        icon: 'file:../../icons/agentBrainsIntegration.svg',
        group: ['transform'],
        version: 1,
        description: 'Retrieve information from Agent Brains RAG',
        defaults: {
            name: 'Agent Brains RAG',
        },
        usableAsTool: true,
        inputs: ['main'],
        outputs: ['main'],
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
                        description: 'Retrieve images',
                        action: 'Retrieve image',
                    },
                ],
                default: 'text',
            },
            {
                displayName: 'Tool Description',
                name: 'toolDescription',
                type: 'string',
                default: '',
                placeholder: 'Use this tool to search for...',
                description: 'Description of what this tool does, for the AI Agent to understand when to use it',
            },
            {
                displayName: 'Index',
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
                default: '',
                required: true,
                description: 'The index to search in',
            },
            {
                displayName: 'Query',
                name: 'query',
                type: 'string',
                default: '',
                required: true,
                placeholder: 'Search query',
                description: 'The text to search for',
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
                        default: 5,
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
                try {
                    const response = await this.helpers.httpRequestWithAuthentication.call(
                        this,
                        'agentBrainsIntegrationApi',
                        {
                            method: 'GET',
                            url: `${API_BASE}/indexes`,
                            json: true,
                            qs: { scope: 'knowledge-base' },
                        },
                    );

                    return (response as IIndex[]).map((index) => ({
                        name: index.name,
                        value: index._id,
                    }));
                } catch (error) {
                    console.error('Error loading indexes:', error);
                    return [];
                }
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
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
                    console.log('Namespace:', namespace);
                } else {
                    namespace = 'images';
                }

                let metadata = options.metadata;
                if (typeof metadata === 'string') {
                    try {
                        metadata = JSON.parse(metadata);
                    } catch (e) {
                        // proceed with raw string or empty object if invalid
                    }
                }

                const body = {
                    namespace,
                    query,
                    metadata: metadata || {},
                    topK: options.topK || 5,
                };

                const response = await this.helpers.httpRequestWithAuthentication.call(
                    this,
                    'agentBrainsIntegrationApi',
                    {
                        method: 'POST',
                        url: `${API_BASE}/retrieve`,
                        body,
                        json: true,
                        qs: { scope: 'knowledge-base' },
                    },
                );

                returnData.push({
                    json: response,
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

