/**
 * Shared fetch utilities for OpenAI-compatible providers.
 * No environment-specific imports — safe for both client and server.
 */
import type { ProviderModel, ChatResponse } from '../types/provider';

/** Extract the assistant message text from a chat completion response */
export function extractMessageText(data: Record<string, unknown>): string {
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  return (message?.content as string) ?? '';
}

/**
 * Fetch → parse → error-handling for OpenAI-compatible chat completion APIs.
 *
 * @param url           Full endpoint URL
 * @param body          Request body
 * @param errorMap      Status-code → user-friendly error message overrides
 * @param providerLabel Label for generic error messages (e.g. "OpenRouter")
 * @param extraHeaders  Additional headers (e.g. Authorization for server-side calls)
 */
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

/** Fetch and parse a model list from an OpenAI-compatible /models endpoint. */
export async function fetchModelList(
  url: string,
  mapFn: (models: Record<string, unknown>[]) => ProviderModel[],
  extraHeaders?: Record<string, string>,
): Promise<ProviderModel[]> {
  try {
    const response = await fetch(url, extraHeaders ? { headers: extraHeaders } : undefined);
    if (!response.ok) return [];
    const json = await response.json() as Record<string, unknown>;
    return mapFn((json.data ?? []) as Record<string, unknown>[]);
  } catch {
    return [];
  }
}

/** Parse chat completion response into a ChatResponse */
export function parseChatResponse(
  data: Record<string, unknown>,
  _providerId: string,
): ChatResponse {
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const firstChoice = choices?.[0] as Record<string, unknown> | undefined;
  const finishReason = firstChoice?.finish_reason as string | undefined;
  const rawText = extractMessageText(data);

  const usage = data.usage as Record<string, unknown> | undefined;

  return {
    raw: rawText,
    metadata: {
      tokensUsed: usage?.completion_tokens as number | undefined,
      truncated: finishReason === 'length',
    },
  };
}
