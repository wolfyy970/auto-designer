import { Hono } from 'hono';
import type { ReferenceImage } from '../../src/types/spec.ts';
import { callLLM } from '../services/compiler.ts';
import { resolvePrompt } from '../lib/prompts/defaults.ts';

const designSystem = new Hono();

interface ExtractRequest {
  images: ReferenceImage[];
  providerId: string;
  modelId: string;
  promptOverrides?: {
    designSystemExtract?: string;
  };
}

designSystem.post('/extract', async (c) => {
  const body = await c.req.json<ExtractRequest>();

  const systemPrompt = resolvePrompt('designSystemExtract', body.promptOverrides);

  const response = await callLLM(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Extract the design system from the provided screenshots.' },
    ],
    body.modelId,
    body.providerId,
    { images: body.images }
  );

  return c.json({ result: response });
});

export default designSystem;
