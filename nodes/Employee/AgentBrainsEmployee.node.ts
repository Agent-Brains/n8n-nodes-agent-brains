import {
	type IDataObject,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { getDomain } from '../constants';

export class AgentBrainsEmployee implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AgentBrains Employee',
		name: 'agentBrainsEmployee',
		icon: 'file:../../icons/agentBrainsIntegration.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Retrieve employee configuration from AgentBrains',
		defaults: {
			name: 'AgentBrains Employee',
		},
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
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
						name: 'Get Config',
						value: 'get',
						description: 'Get an employee configuration by ID',
						action: 'Get an employee configuration',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Employee Name or ID',
				name: 'employeeId',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getEmployees',
				},
				default: '',
				required: true,
			},
		],
	};

	methods = {
		loadOptions: {
			async getEmployees(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('agentBrainsIntegrationApi');
				const apiBase = `https://sds.${getDomain(credentials)}/integration`;
				
				const responseData = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'agentBrainsIntegrationApi',
					{
						method: 'GET',
						url: `${apiBase}/helpers/employees`,
						json: true,
						qs: { scope: 'knowledge-base' }
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

				const options = items.map((item) => {
					return {
						name: (item.name as string) || (item.id as string),
						value: item.id as string,
					};
				});

				options.sort((a, b) => a.name.localeCompare(b.name));

				return options;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('agentBrainsIntegrationApi');
		const apiBase = `https://sds.${getDomain(credentials)}/integration`;

		for (let i = 0; i < items.length; i++) {
			try {
				const employeeId = this.getNodeParameter('employeeId', i) as string;

				const responseData = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'agentBrainsIntegrationApi',
					{
						method: 'GET',
						url: `${apiBase}/helpers/employees/${employeeId}`,
						json: true,
						qs: { scope: 'knowledge-base' }
					},
				);

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray([responseData as IDataObject]),
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
