import type { CompiledPrompt } from '../types/compiler';
import type { ContentPart, GenerationResult, OutputFormat, ProviderModel } from '../types/provider';
import { extractCode } from './extract-code';
import { generateId, now } from './utils';
import { getPrompt } from '../stores/prompt-store';

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

/**
 * Shared fetch → parse → error-handling for OpenAI-compatible chat completion APIs.
 * Returns the parsed JSON response body.
 *
 * @param url         Full endpoint URL (e.g. `${OPENROUTER_PROXY}/api/v1/chat/completions`)
 * @param body        Request body (pre-JSON.stringify)
 * @param errorMap    Status-code → user-friendly error message overrides
 * @param providerLabel  Label for generic error messages (e.g. "OpenRouter")
 */
export async function fetchChatCompletion(
  url: string,
  body: Record<string, unknown>,
  errorMap: Record<number, string>,
  providerLabel: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const mapped = errorMap[response.status];
    if (mapped) throw new Error(mapped);
    throw new Error(`${providerLabel} API error (${response.status}): ${errorBody}`);
  }

  return response.json();
}

/** Extract the assistant message text from a chat completion response */
export function extractMessageText(data: Record<string, unknown>): string {
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  return (message?.content as string) ?? '';
}

/** Fetch and parse a model list from an OpenAI-compatible /models endpoint. */
export async function fetchModelList(
  url: string,
  mapFn: (models: Record<string, unknown>[]) => ProviderModel[],
): Promise<ProviderModel[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const json = await response.json();
    return mapFn(json.data ?? []);
  } catch {
    return [];
  }
}

/** Select the generation system prompt based on output format. */
export function selectSystemPrompt(format: OutputFormat): string {
  return format === 'react' ? getPrompt('genSystemReact') : getPrompt('genSystemHtml');
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
  const finishReason = firstChoice?.finish_reason as string | undefined;
  const rawText = extractMessageText(data);
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
