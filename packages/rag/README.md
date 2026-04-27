# n8n-nodes-agent-brains-rag

Run semantic retrieval against an AgentBrains RAG index. Also usable as an AI tool node, so an n8n agent can call it directly.

## Install

In n8n, open **Settings → Community Nodes → Install** and paste:

    n8n-nodes-agent-brains-rag

Or from the CLI:

    npm install n8n-nodes-agent-brains-rag

## Credentials

Requires an AgentBrains API key. Generate one in the AgentBrains Control Panel, then paste it into the **AgentBrains Integration API** credential in n8n.

Step-by-step: <https://docs.agent-brains.com/integrations/access-api-key>

## Operations

- **Retrieve Text** — semantic search over a chosen index. Configure query, Top K results, optional metadata filtering, and an extended-response toggle to include source metadata.
- **Retrieve Image** — pull a related image from the Core Image Index.

The index dropdown is populated from your AgentBrains workspace at runtime.

## Learn more

Full integration guide: <https://docs.agent-brains.com/integrations/n8n>

## License

MIT
