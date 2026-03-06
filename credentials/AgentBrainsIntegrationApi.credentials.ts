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
		{
			displayName: 'Custom Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: `e.g. dwm-sndbx-ai.com  (leave blank to use ${DOMAIN})`,
			description: `Override the target environment domain. Leave empty to use the default (${DOMAIN}).`,
			required: false,
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
			baseURL: `={{"https://akm." + ($credentials.domain?.trim() || "${DOMAIN}")}}`,
			url: '/keys/verify',
			method: 'POST',
			body: {
				'key': '={{$credentials?.accessToken}}',
				'scope': 'knowledge-base'
			},
		},
	};
}

