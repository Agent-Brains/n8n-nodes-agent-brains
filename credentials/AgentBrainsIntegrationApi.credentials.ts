import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AgentBrainsIntegrationApi implements ICredentialType {
	name = 'agentBrainsIntegrationApi';

	displayName = 'Agent Brains Integration API';

    icon: Icon = 'file:../icons/agentBrainsIntegration.svg';

	documentationUrl =
		'https://agent-brains.com/system-integration';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=token {{$credentials?.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://agent-brains.com',
			url: '/',
			method: 'GET',
		},
	};
}
