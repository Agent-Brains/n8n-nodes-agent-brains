import {
    INodeType,
    INodeTypeDescription,
    IWebhookFunctions,
    IWebhookResponseData,
    IHookFunctions,
    NodeConnectionTypes,
    LoggerProxy,
} from 'n8n-workflow';

const API_BASE = 'https://admin-panel.dwm-sndbx-ai.com/api/n8n';

export class AgentBrainsIntegrationTrigger implements INodeType {
    webhookMethods = {
        default: {
            checkExists: async function (this: IHookFunctions): Promise<boolean> {
                const workflow = this.getWorkflow();
                const workflowId = workflow.id as string;
                try {
                    const checkUrl = `${API_BASE}/registered/${encodeURIComponent(workflowId)}`;
                    const resp = await this.helpers.httpRequestWithAuthentication.call(this, 'agentBrainsIntegrationApi', {
                        method: 'GET',
                        url: checkUrl,
                        json: true,
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
                try {
                    await this.helpers.httpRequestWithAuthentication.call(this, 'agentBrainsIntegrationApi', {
                        method: 'POST',
                        url: `${API_BASE}/register`,
                        json: true,
                        body: {
                            workflowId,
                            workflowName,
                            webhookUrl,
                        },
                    });
                    LoggerProxy.info('Webhook registration response');
                    return true;
                } catch (e) {
                    LoggerProxy.error('Error registering workflow:', e);
                    return false;
                }
            },
            delete: async function (this: IHookFunctions): Promise<boolean> {
                const workflow = this.getWorkflow();
                const workflowId = workflow.id as string;
                try {
                    const resp = await this.helpers.httpRequestWithAuthentication.call(this, 'agentBrainsIntegrationApi', {
                        method: 'DELETE',
                        url: `${API_BASE}/unregister/${encodeURIComponent(workflowId)}`,
                    });
                    LoggerProxy.info('Webhook unregistration response:', resp);
                    return true;
                } catch (e) {
                    LoggerProxy.error('Error unregistering workflow:', e);
                    return false;
                }
            },
        },
    };
    description: INodeTypeDescription = {
        displayName: 'AgentBrains Integration Trigger',
        name: 'agentBrainsIntegrationTrigger',
        icon: 'file:../../icons/agentBrainsIntegration.svg',
        group: ['trigger'],
        version: 1,
        credentials: [
            {
                name: 'agentBrainsIntegrationApi',
                required: true,
            },
        ],
        subtitle: '={{$parameter["jobName"]}}',
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
                responseMode: 'responseNode',
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
		usableAsTool: true,
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
