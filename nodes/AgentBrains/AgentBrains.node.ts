import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { AgentBrainsEmployee } from '../../lib/resources/AgentBrainsEmployee';
import { AgentBrainsRag } from '../../lib/resources/AgentBrainsRag';
import { KnowledgeBase } from '../../lib/resources/KnowledgeBase';
import { SyntheticQa } from '../../lib/resources/SyntheticQa';

const RESOURCE_EMPLOYEE = 'employee';
const RESOURCE_RAG = 'rag';
const RESOURCE_SYNTHETIC_QA = 'syntheticQa';

const knowledgeBaseNode = new KnowledgeBase();
const employeeNode = new AgentBrainsEmployee();
const ragNode = new AgentBrainsRag();
const syntheticQaNode = new SyntheticQa();

function withResource(properties: INodeProperties[], resource: string): INodeProperties[] {
	return properties.map((property) => ({
		...property,
		displayOptions: {
			...property.displayOptions,
			show: {
				...property.displayOptions?.show,
				resource: [resource],
			},
		},
	}));
}

function getProperties(): INodeProperties[] {
	const knowledgeBaseProperties = knowledgeBaseNode.description.properties ?? [];
	const [resourceProperty, ...restKnowledgeBaseProperties] = knowledgeBaseProperties;
	const resourceOptions = (resourceProperty.options ?? []) as INodePropertyOptions[];

	const mergedResourceProperty: INodeProperties = {
		...resourceProperty,
		options: [
			...resourceOptions,
			{
				name: 'Employee',
				value: RESOURCE_EMPLOYEE,
				description: 'Retrieve AgentBrains employee configuration',
			},
			{
				name: 'RAG',
				value: RESOURCE_RAG,
				description: 'Retrieve text or images from AgentBrains RAG',
			},
			{
				name: 'Synthetic QA',
				value: RESOURCE_SYNTHETIC_QA,
				description: 'Run AgentBrains synthetic QA evaluations',
			},
		],
	};

	return [
		mergedResourceProperty,
		...restKnowledgeBaseProperties,
		...withResource(employeeNode.description.properties ?? [], RESOURCE_EMPLOYEE),
		...withResource(ragNode.description.properties ?? [], RESOURCE_RAG),
		...withResource(syntheticQaNode.description.properties ?? [], RESOURCE_SYNTHETIC_QA),
	];
}

export class AgentBrains implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AgentBrains',
		name: 'agentBrains',
		icon: 'file:../../icons/agentBrainsIntegration.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ($parameter["operation"] ? ": " + $parameter["operation"] : "")}}',
		description: 'Interact with AgentBrains Knowledge Base, Employee, RAG, and Synthetic QA functionality',
		defaults: {
			name: 'AgentBrains',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'agentBrainsIntegrationApi',
				required: true,
			},
		],
		properties: getProperties(),
	};

	methods = {
		loadOptions: {
			...knowledgeBaseNode.methods.loadOptions,
			...employeeNode.methods.loadOptions,
			...ragNode.methods.loadOptions,
			...syntheticQaNode.methods.loadOptions,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;

		if (resource === RESOURCE_EMPLOYEE) {
			return await employeeNode.execute.call(this);
		}

		if (resource === RESOURCE_RAG) {
			return await ragNode.execute.call(this);
		}

		if (resource === RESOURCE_SYNTHETIC_QA) {
			return await syntheticQaNode.execute.call(this);
		}

		return await knowledgeBaseNode.execute.call(this);
	}
}
