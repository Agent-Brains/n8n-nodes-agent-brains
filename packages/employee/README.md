# n8n-nodes-agent-brains-employee

Retrieve employee (AI agent) configuration from the AgentBrains platform by ID.

## Install

In n8n, open **Settings → Community Nodes → Install** and paste:

    n8n-nodes-agent-brains-employee

Or from the CLI:

    npm install n8n-nodes-agent-brains-employee

## Credentials

Requires an AgentBrains API key. Generate one in the AgentBrains Control Panel, then paste it into the **AgentBrains Integration API** credential in n8n.

Step-by-step: <https://docs.agent-brains.com/integrations/access-api-key>

## Operations

- **Get Config** — fetch a single employee configuration by ID. The **Employee** dropdown is populated from your AgentBrains workspace at runtime, so you can pick from the list or supply an ID via expression.

## Learn more

Full integration guide: <https://docs.agent-brains.com/integrations/n8n>

## License

MIT
