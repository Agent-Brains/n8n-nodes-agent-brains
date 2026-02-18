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

app.get('/configuration', (req, res) => {
  res.json({
    orchestratorStartUrl: 'http://localhost:5678/webhook/ed5ec429-5b66-420b-91ce-e1be079b3fe2',
    orchestratorStatusUrl: 'http://localhost:5678/webhook/20fab592-bb37-4ae3-bde5-6b7a458e287e',
  });
});

app.use((req, res, next) => {
  // simple logging middleware for all requests
  console.log(`${req.method} ${req.url}`);
  next();
});

// --- RAG Mocks ---
const INTEGRATION_PREFIX = '/integration';

// Mock Indexes (Text RAG)
app.get(`${INTEGRATION_PREFIX}/indexes`, (req, res) => {
  console.log('GET indexes');
  res.json([
    {
      _id: '65a1234567890abcdef12345',
      name: 'Engineering Docs',
      status: 'active',
      notes: 'Internal documentation',
    },
    {
      _id: '65b9876543210fedcba54321',
      name: 'Customer Support',
      status: 'active',
      notes: 'Support tickets and FAQs',
    },
    {
       _id: '65c111222333444555666777',
       name: 'Marketing Copy',
       status: 'indexing',
       notes: 'Ad copy and branding',
    }
  ]);
});

// Mock Retrieval
app.post(`${INTEGRATION_PREFIX}/retrieve`, (req, res) => {
  const { namespace, query, metadata, topK } = req.body;
  console.log('POST retrieve', { namespace, query, metadata, topK });
  
  const limit = topK || 5;
  
  res.json({
    results: Array.from({ length: limit }).map((_, i) => ({
      content: `Result ${i + 1} for "${query}" in namespace "${namespace}"`,
      score: 0.9 - (i * 0.05),
      metadata: metadata || {}
    })),
  });
});

// --- Legacy Vector Mocks (Optional) ---
const VECTORS_PREFIX = '/integration/vectors';

// Mock Namespaces
app.get(`${VECTORS_PREFIX}/namespaces`, (req, res) => {
  console.log('GET namespaces');
  res.json([
    { name: 'Default', value: 'default' },
    { name: 'Production', value: 'production' },
    { name: 'Staging', value: 'staging' },
  ]);
});

// Mock Upsert
// Expected Body: { namespace, vectors: [{ id, values, metadata }] }
app.post(`${VECTORS_PREFIX}/upsert`, (req, res) => {
  console.log('POST upsert', req.body);
  const count = req.body.vectors ? req.body.vectors.length : 0;
  res.json({ upsertedCount: count });
});

// Mock Query
// Expected Body: { namespace, vector, topK, includeMetadata }
app.post(`${VECTORS_PREFIX}/query`, (req, res) => {
  console.log('POST query', req.body);
  // Return dummy matches
  res.json({
    matches: [
      { id: 'vec1', score: 0.95, metadata: { text: 'Example text 1' } },
      { id: 'vec2', score: 0.88, metadata: { text: 'Example text 2' } },
    ],
    namespace: req.body.namespace,
  });
});

// Mock Delete
// Expected Body: { namespace, ids: [...] }
app.post(`${VECTORS_PREFIX}/delete`, (req, res) => {
  console.log('POST delete', req.body);
  res.json({ deletedCount: req.body.ids ? req.body.ids.length : 0 });
});

app.use((req, res) => {
  res.status(404).json({ status: 'not_found' });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3456;
app.listen(port, () => {
  process.stdout.write(`Mock API (Express) listening on http://localhost:${port}\n`);
});
