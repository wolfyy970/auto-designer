import { Hono } from 'hono';
import { z } from 'zod';
import type { ReferenceImage } from '../../src/types/spec.ts';
import { callLLM } from '../services/compiler.ts';
import { resolvePrompt } from '../lib/prompts/defaults.ts';

const designSystem = new Hono();

const ExtractRequestSchema = z.object({
  images: z.array(z.object({
    dataUrl: z.string(),
    mimeType: z.string().optional(),
    name: z.string().optional(),
  }).passthrough()),
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  promptOverrides: z.object({
    designSystemExtract: z.string().optional(),
  }).optional(),
});

designSystem.post('/extract', async (c) => {
  const raw = await c.req.json();
  const parsed = ExtractRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
  }
  const body = parsed.data;

  const systemPrompt = resolvePrompt('designSystemExtract', body.promptOverrides);

  try {
    const response = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Extract the design system from the provided screenshots.' },
      ],
      body.modelId,
      body.providerId,
      { images: body.images as ReferenceImage[] }
    );
    return c.json({ result: response });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

export default designSystem;
