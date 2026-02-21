import { Hono } from 'hono';
import { getProvider, getAvailableProviders } from '../services/providers/registry.ts';

const models = new Hono();

models.get('/:provider', async (c) => {
  const providerId = c.req.param('provider');
  const provider = getProvider(providerId);
  if (!provider) {
    return c.json({ error: `Unknown provider: ${providerId}` }, 404);
  }

  const modelList = await provider.listModels();
  return c.json(modelList);
});

models.get('/', async (c) => {
  const providers = getAvailableProviders();
  return c.json(providers.map((p) => ({ id: p.id, name: p.name, description: p.description })));
});

export default models;
