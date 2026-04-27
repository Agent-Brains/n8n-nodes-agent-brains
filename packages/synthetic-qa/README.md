# n8n-nodes-agent-brains-synthetic-qa

Run a synthetic-conversation QA suite against your agent and return scoring plus a full report. Usable as an AI tool node.

## Install

In n8n, open **Settings → Community Nodes → Install** and paste:

    n8n-nodes-agent-brains-synthetic-qa

Or from the CLI:

    npm install n8n-nodes-agent-brains-synthetic-qa

## Credentials

Requires an AgentBrains API key. Generate one in the AgentBrains Control Panel, then paste it into the **AgentBrains Integration API** credential in n8n.

Step-by-step: <https://docs.agent-brains.com/integrations/access-api-key>

## Operations

- Pick a **Synthetic User** persona from your AgentBrains workspace.
- Set the **number of test conversations** to run.
- Choose which **scoring tests** to apply: Mood Change, Human-Free Issue Handling, Completeness, Upsell, Objection Handling, On-Task, Problem-Solving.
- Optional: provide manual goals and promotion details to steer the conversations.

The node polls until the test run completes, then outputs parsed per-test scoring alongside the full conversation report.

## Learn more

Full integration guide: <https://docs.agent-brains.com/integrations/n8n>

## License

MIT
