import {
    type IExecuteFunctions,
    type INodeExecutionData,
    type INodeType,
    type INodeTypeDescription,
    type ILoadOptionsFunctions,
    type INodePropertyOptions,
} from 'n8n-workflow';


declare const console: {
    log(...args: unknown[]): void;
    error(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    info(...args: unknown[]): void;
    debug(...args: unknown[]): void;
};

const BASE_DOMAINS: Record<string, string> = {
    sandbox: 'dwm-sndbx-ai.com',
    staging: 'agent-brains.com',
};

function getApiBase(environment: string): string {
    const domain = BASE_DOMAINS[environment] || BASE_DOMAINS.sandbox;
    return `https://sds.${domain}/integration`;
}

const GLOBAL_INDEX_OPTION: INodePropertyOptions = { name: 'Global (All Documents)', value: 'general_helper_documents' };

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
                // eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-options
                default: 'general_helper_documents',
                required: true,
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
            },
            {
                displayName: 'Query',
                name: 'query',
                type: 'string',
                default: '={{ $json.chatInput }}',
                required: true,
                placeholder: 'Search query',
                description: 'The text to search for. When used as a tool, this is automatically filled by the AI model.',
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
                const nodeOptions = this.getNodeParameter('options', {}) as { environment?: string };
                const apiBase = getApiBase(nodeOptions.environment || 'sandbox');
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
                } catch (error) {
                    console.error('Error loading indexes:', error);
                    return [GLOBAL_INDEX_OPTION];
                }
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const options0 = this.getNodeParameter('options', 0) as { environment?: string };
        const apiBase = getApiBase(options0.environment || 'sandbox');
        const operation = this.getNodeParameter('operation', 0) as string;

        for (let i = 0; i < items.length; i++) {
            try {
                const query = this.getNodeParameter('query', i) as string;
                const options = this.getNodeParameter('options', i) as {
                    topK?: number;
                    metadata?: string | object;
                    environment?: string;
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
                    } catch {
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
                        url: `${apiBase}/retrieve`,
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

