# n8n-nodes-agent-brains-knowledge-base

Read entities, categories, attachments, and relationships from the AgentBrains Knowledge Base.

## Install

In n8n, open **Settings → Community Nodes → Install** and paste:

    n8n-nodes-agent-brains-knowledge-base

Or from the CLI:

    npm install n8n-nodes-agent-brains-knowledge-base

## Credentials

Requires an AgentBrains API key. Generate one in the AgentBrains Control Panel, then paste it into the **AgentBrains Integration API** credential in n8n.

Step-by-step: <https://docs.agent-brains.com/integrations/access-api-key>

## Resources & Operations

- **Documents (Entities)** — Get, Get Many, Get Related Entities, Get All Documents, Get by Category Alias.
- **Category** — Get, Get Many.
- **Images (Attachments)** — Get, Get Many.
- **Relationship Types** — Get Many.
- **Company Data** — Get.

Supports search, recursive fetch, pagination, and a merge-documents output mode.

## Learn more

Full integration guide: <https://docs.agent-brains.com/integrations/n8n>

## License

MIT
