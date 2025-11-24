const express = require('express');
const app = express();
const registered = new Set();

app.use(express.json());

app.post('/register', (req, res) => {
  const { workflowId, workflowName, webhookUrl } = req.body || {};
  console.log('POST /register', { workflowId, workflowName, webhookUrl });
  if (workflowId) registered.add(String(workflowId));
  res.json({ status: 'ok', workflowId, workflowName, webhookUrl });
});

app.delete('/unregister/:workflowId', (req, res) => {
  const { workflowId } = req.params || {};
  console.log('DELETE /unregister/:workflowId', { workflowId });
  if (workflowId) registered.delete(String(workflowId));
  res.json({ status: 'ok', workflowId });
});

app.get('/registered/:workflowId', (req, res) => {
  const { workflowId } = req.params || {};
  const isRegistered = workflowId ? registered.has(String(workflowId)) : false;
  res.json({ registered: isRegistered });
});

app.use((req, res) => {
  res.status(404).json({ status: 'not_found' });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3456;
app.listen(port, () => {
  process.stdout.write(`Mock API (Express) listening on http://localhost:${port}\n`);
});
