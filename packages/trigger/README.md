# n8n-nodes-agent-brains-trigger

Receive webhooks from the AgentBrains platform and start an n8n workflow for each event.

## Install

In n8n, open **Settings → Community Nodes → Install** and paste:

    n8n-nodes-agent-brains-trigger

Or from the CLI:

    npm install n8n-nodes-agent-brains-trigger

## Credentials

Requires an AgentBrains API key. Generate one in the AgentBrains Control Panel, then paste it into the **AgentBrains Integration API** credential in n8n.

Step-by-step: <https://docs.agent-brains.com/integrations/access-api-key>

## Configuration

- The node auto-registers with AgentBrains when the workflow is activated and unregisters when it is deactivated. No manual webhook URL setup is needed.
- **Respond mode** — choose between handing the response to a downstream `Respond to Webhook` node, or returning the last executed node's output directly.
- **Additional headers** — extra headers to attach to the webhook response.

## Learn more

Full integration guide: <https://docs.agent-brains.com/integrations/n8n>

## License

MIT
