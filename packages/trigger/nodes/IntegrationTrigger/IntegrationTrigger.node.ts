import {
	type IHookFunctions,
	type IWebhookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookResponseData,
	LoggerProxy,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { getDomain } from '../constants';



export class IntegrationTrigger implements INodeType {
    webhookMethods = {
        default: {
            checkExists: async function (this: IHookFunctions): Promise<boolean> {
                const workflow = this.getWorkflow();
                const workflowId = workflow.id as string;
                const webhookUrl = this.getNodeWebhookUrl('default');
                const credentials = await this.getCredentials('agentBrainsIntegrationApi');
                const apiBase = `https://admin-panel.${getDomain(credentials)}/api/n8n`;
                try {
                    const checkUrl = `${apiBase}/registered/${encodeURIComponent(workflowId)}`;
                    const resp = await this.helpers.httpRequestWithAuthentication.call(this, 'agentBrainsIntegrationApi', {
                        method: 'GET',
                        url: checkUrl,
                        json: true,
                        qs: {
                            webhookUrl: webhookUrl?.replace('/webhook-test/', '/webhook/'),
                        },
                    });
                    LoggerProxy.info('Webhook check response:', resp);
                    const { registered } = resp as { registered?: boolean };
                    return Boolean(registered);
                } catch (e) {
                    LoggerProxy.error('Error checking webhook existence:', e);
                    return false;
                }
            },
            create: async function (this: IHookFunctions): Promise<boolean> {
                const workflow = this.getWorkflow();
                const workflowId = workflow.id as string;
                const workflowName = workflow.name as string;
                const webhookUrl = this.getNodeWebhookUrl('default');
                const credentials = await this.getCredentials('agentBrainsIntegrationApi');
                const apiBase = `https://admin-panel.${getDomain(credentials)}/api/n8n`;
                try {
                    await this.helpers.httpRequestWithAuthentication.call(this, 'agentBrainsIntegrationApi', {
                        method: 'POST',
                        url: `${apiBase}/register`,
                        json: true,
                        body: {
                            workflowId,
                            workflowName,
                            webhookUrl: webhookUrl?.replace('/webhook-test/', '/webhook/'),
                        },
                    });
                    LoggerProxy.info('Webhook registration response');
                    return true;
                } catch (e) {
                    const error = e as { httpCode?: number; response?: { status?: number }; statusCode?: number };
                    if (error.httpCode === 409 || error.response?.status === 409 || error.statusCode === 409) {
                        throw new Error('Webhook url is already used, please remove and add the trigger node again');
                    }
                    LoggerProxy.error('Error registering workflow:', e);
                    return false;
                }
            },
            delete: async function (this: IHookFunctions): Promise<boolean> {
                const webhookData = this.getWorkflowStaticData('node');
                if (webhookData.webhookId !== undefined) {
                    const credentials = await this.getCredentials('agentBrainsIntegrationApi');
                    const apiBase = `https://api.${getDomain(credentials)}`;
                    try {
                        await this.helpers.httpRequestWithAuthentication.call(
                            this,
                            'agentBrainsIntegrationApi',
                            {
                                method: 'DELETE',
                                url: `${apiBase}/webhooks/${webhookData.webhookId}`,
                            },
                        );
                    } catch (error) {
                        LoggerProxy.error('Error deleting webhook:', error);
                        return false;
                    }
                    delete webhookData.webhookId;
                }
                return true;
            },
        },
    };
    description: INodeTypeDescription = {
        displayName: 'AgentBrains Integration Trigger',
        name: 'integrationTrigger',
        icon: 'file:../../icons/agentBrainsIntegration.svg',
        group: ['trigger'],
        version: 1,
        credentials: [
            {
                name: 'agentBrainsIntegrationApi',
                required: true,
            },
        ],
        description: 'Integrate your custom n8n workflow with the AgentBrains platform. Use this trigger to receive webhook calls from AgentBrains and start your flows. To create API credentials, sign up and generate an access token at https://agent-brains.com/system-integration and provide it via the AgentBrains credentials in n8n.',
        defaults: {
            name: 'AgentBrains Integration Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        webhooks: [
            {
                name: 'default',
                httpMethod: 'POST',
                responseMode: '={{$parameter["responseMode"]}}',
                path: 'custom-webhook',
            },
        ],
        properties: [
            {
                displayName: 'Respond',
                name: 'responseMode',
                type: 'options',
                options: [
                    {
                        name: "Using 'Respond to Webhook' Node",
                        value: 'responseNode',
                        description: 'Response defined in that node',
                    },
                    {
                        name: 'Last Node',
                        value: 'lastNode',
                        description: 'Respond with data from the last node executed',
                    },
                ],
                default: 'responseNode',
                description: 'When and how to respond to the webhook',
            },
            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [],
            },
            {
                displayName: 'Additional Headers',
                name: 'webhookHeaders',
                type: 'fixedCollection',
                default: {},
                description: 'Additional headers for webhook requests',
                options: [
                    {
                        name: 'headers',
                        displayName: 'Headers',
                        values: [
                            {
                                displayName: 'Name',
                                name: 'name',
                                type: 'string',
                                default: '',
                                description: 'Header name',
                            },
                            {
                                displayName: 'Value',
                                name: 'value',
                                type: 'string',
                                default: '',
                                description: 'Header value',
                            },
                        ],
                    },
                ],
                typeOptions: {
                    multipleValues: true,
                },
            },
        ],
        usableAsTool: undefined,
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
    };

    async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
        const bodyData = this.getBodyData();
        const workflow = this.getWorkflow();

        return {
            workflowData: [this.helpers.returnJsonArray({
                data: {
                    ...bodyData,
                    ...workflow,
                },
            })],
        };
    }
}
