import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { getProvider } from '../services/providers/registry.ts';
import { resolvePrompt } from '../lib/prompts/defaults.ts';
import { extractCode } from '../lib/extract-code.ts';
import { logLlmCall } from '../log-store.ts';
import { normalizeError } from '../lib/error-utils.ts';
import type { ChatMessage } from '../../src/types/provider.ts';

const generate = new Hono();

const GenerateRequestSchema = z.object({
  prompt: z.string().min(1),
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  promptOverrides: z.object({
    genSystemHtml: z.string().optional(),
    variant: z.string().optional(),
  }).optional(),
  supportsVision: z.boolean().optional(),
});

generate.post('/', async (c) => {
  const raw = await c.req.json();
  const parsed = GenerateRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
  }
  const body = parsed.data;

  const provider = getProvider(body.providerId);
  if (!provider) {
    return c.json({ error: `Unknown provider: ${body.providerId}` }, 400);
  }

  const systemPrompt = resolvePrompt('genSystemHtml', body.promptOverrides);

  return streamSSE(c, async (stream) => {
    const abortSignal = c.req.raw.signal;
    let id = 0;

    try {
      await stream.writeSSE({ data: JSON.stringify({ status: 'Generating design...' }), event: 'progress', id: String(id++) });

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: body.prompt },
      ];

      const t0 = performance.now();
      const response = await provider.generateChat(messages, {
        model: body.modelId,
        supportsVision: body.supportsVision,
      });
      const durationMs = Math.round(performance.now() - t0);

      if (abortSignal.aborted) return;

      logLlmCall({
        source: 'builder',
        model: body.modelId,
        provider: body.providerId,
        systemPrompt,
        userPrompt: body.prompt,
        response: response.raw,
        durationMs,
      });

      const code = extractCode(response.raw);

      await stream.writeSSE({ data: JSON.stringify({ code }), event: 'code', id: String(id++) });
      await stream.writeSSE({ data: '{}', event: 'done', id: String(id++) });
    } catch (err) {
      await stream.writeSSE({ data: JSON.stringify({ error: normalizeError(err) }), event: 'error', id: String(id++) });
    }
  });
});

export default generate;
