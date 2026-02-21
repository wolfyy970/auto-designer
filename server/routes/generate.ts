import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { ReferenceImage } from '../../src/types/spec.ts';
import { runAgenticBuild } from '../services/agent/orchestrator.ts';
import { getProvider } from '../services/providers/registry.ts';
import { resolvePrompt } from '../lib/prompts/defaults.ts';

const generate = new Hono();

interface GenerateRequest {
  prompt: string;
  images?: ReferenceImage[];
  providerId: string;
  modelId: string;
  promptOverrides?: {
    agentSystemBuilder?: string;
    agentSystemPlanner?: string;
    variant?: string;
  };
  maxLoops?: number;
  supportsVision?: boolean;
}

generate.post('/', async (c) => {
  const body = await c.req.json<GenerateRequest>();

  const provider = getProvider(body.providerId);
  if (!provider) {
    return c.json({ error: `Unknown provider: ${body.providerId}` }, 400);
  }

  const builderSystemPrompt = resolvePrompt('agentSystemBuilder', body.promptOverrides);
  const plannerSystemPrompt = resolvePrompt('agentSystemPlanner', body.promptOverrides);

  return streamSSE(c, async (stream) => {
    const abortSignal = c.req.raw.signal;
    let id = 0;

    try {
      const workspace = await runAgenticBuild(
        builderSystemPrompt,
        body.prompt,
        provider,
        {
          model: body.modelId,
          supportsVision: body.supportsVision,
          maxLoops: body.maxLoops ?? 15,
          plannerSystemPrompt,
          onProgress: async (status) => {
            if (abortSignal.aborted) return;
            await stream.writeSSE({ data: JSON.stringify({ status }), event: 'progress', id: String(id++) });
          },
          onActivity: async (entry) => {
            if (abortSignal.aborted) return;
            await stream.writeSSE({ data: JSON.stringify({ entry }), event: 'activity', id: String(id++) });
          },
        }
      );

      const code = workspace.bundleToHtml();
      await stream.writeSSE({ data: JSON.stringify({ code }), event: 'code', id: String(id++) });
      await stream.writeSSE({ data: '{}', event: 'done', id: String(id++) });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await stream.writeSSE({ data: JSON.stringify({ error: message }), event: 'error', id: String(id++) });
    }
  });
});

export default generate;
