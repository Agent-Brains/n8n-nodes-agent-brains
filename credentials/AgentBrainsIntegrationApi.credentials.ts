import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

import { DOMAIN } from '../nodes/constants';

export class AgentBrainsIntegrationApi implements ICredentialType {
	name = 'agentBrainsIntegrationApi';

	displayName = 'AgentBrains Integration API';

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
				Authorization: '={{"Bearer " + $credentials.accessToken }}',
				'x-access-key': '={{$credentials?.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: `https://akm.${DOMAIN}`,
			url: '/keys/verify',
			method: 'POST',
			body: {
				'key': '={{$credentials?.accessToken}}',
				'scope': 'knowledge-base'
			},
		},
	};
}
