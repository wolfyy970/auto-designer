import type { CompiledPrompt } from '../types/compiler';
import type { ContentPart, GenerationResult } from '../types/provider';
import { extractCode } from './extract-code';
import { generateId, now } from './utils';

/** Build user message content, with optional vision images */
export function buildUserContent(
  prompt: CompiledPrompt,
  supportsVision: boolean
): string | ContentPart[] {
  if (supportsVision && prompt.images.length > 0) {
    return [
      { type: 'text' as const, text: prompt.prompt },
      ...prompt.images.map((img) => ({
        type: 'image_url' as const,
        image_url: { url: img.dataUrl },
      })),
    ];
  }
  return prompt.prompt;
}

/** Build OpenAI-compatible chat request body */
export function buildChatRequest(
  model: string,
  systemPrompt: string,
  userContent: string | ContentPart[],
  extraFields?: Record<string, unknown>
): Record<string, unknown> {
  const maxTokensEnv = import.meta.env.VITE_MAX_OUTPUT_TOKENS;
  const maxTokens = maxTokensEnv ? parseInt(maxTokensEnv, 10) : undefined;

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
    ...extraFields,
  };

  if (maxTokens) {
    body.max_tokens = maxTokens;
  }

  return body;
}

/** Parse chat completion response into a GenerationResult */
export function parseGenerationResult(
  data: Record<string, unknown>,
  prompt: CompiledPrompt,
  providerId: string,
  model: string,
  startTime: number
): GenerationResult {
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const firstChoice = choices?.[0] as Record<string, unknown> | undefined;
  const message = firstChoice?.message as Record<string, unknown> | undefined;
  const rawText = (message?.content as string) ?? '';
  const finishReason = firstChoice?.finish_reason as string | undefined;
  const code = extractCode(rawText);

  if (finishReason === 'length' && import.meta.env.DEV) {
    console.warn(`[${providerId}] Response truncated due to max_tokens limit. Code may be incomplete.`);
  }

  const usage = data.usage as Record<string, unknown> | undefined;

  return {
    id: generateId(),
    variantStrategyId: prompt.variantStrategyId,
    providerId,
    runId: '',
    runNumber: 0,
    status: 'complete',
    code,
    metadata: {
      model: (data.model as string) ?? model,
      tokensUsed: usage?.completion_tokens as number | undefined,
      durationMs: Date.now() - startTime,
      completedAt: now(),
      truncated: finishReason === 'length',
    },
  };
}
