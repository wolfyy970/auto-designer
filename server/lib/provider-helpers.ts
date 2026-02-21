import { env } from '../env.ts';
import type { ChatMessage } from '../../src/types/provider.ts';
import type { ProviderModel, ChatResponse } from '../../src/types/provider.ts';

export function buildChatRequestFromMessages(
  model: string,
  messages: ChatMessage[],
  extraFields?: Record<string, unknown>
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.7,
    ...extraFields,
  };

  if (env.MAX_OUTPUT_TOKENS) {
    body.max_tokens = env.MAX_OUTPUT_TOKENS;
  }

  return body;
}

export async function fetchChatCompletion(
  url: string,
  body: Record<string, unknown>,
  errorMap: Record<number, string>,
  providerLabel: string,
  extraHeaders?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const mapped = errorMap[response.status];
    if (mapped) throw new Error(mapped);
    throw new Error(`${providerLabel} API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export function extractMessageText(data: Record<string, unknown>): string {
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  return (message?.content as string) ?? '';
}

export async function fetchModelList(
  url: string,
  mapFn: (models: Record<string, unknown>[]) => ProviderModel[],
  extraHeaders?: Record<string, string>,
): Promise<ProviderModel[]> {
  try {
    const response = await fetch(url, { headers: extraHeaders });
    if (!response.ok) return [];
    const json = await response.json() as Record<string, unknown>;
    return mapFn((json.data ?? []) as Record<string, unknown>[]);
  } catch {
    return [];
  }
}

export function parseChatResponse(
  data: Record<string, unknown>,
  providerId: string,
): ChatResponse {
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const firstChoice = choices?.[0] as Record<string, unknown> | undefined;
  const finishReason = firstChoice?.finish_reason as string | undefined;
  const rawText = extractMessageText(data);

  if (finishReason === 'length' && env.isDev) {
    console.warn(`[${providerId}] Response truncated due to max_tokens limit.`);
  }

  const usage = data.usage as Record<string, unknown> | undefined;

  return {
    raw: rawText,
    metadata: {
      tokensUsed: usage?.completion_tokens as number | undefined,
      truncated: finishReason === 'length',
    },
  };
}
