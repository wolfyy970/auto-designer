import type { ChatMessage } from '../types/provider';
import type { ProviderModel, ChatResponse, ToolDefinition, ToolCall, ToolChatResponse } from '../types/provider';

/** Build OpenAI-compatible chat request body from an array of messages */
export function buildChatRequestFromMessages(
  model: string,
  messages: ChatMessage[],
  extraFields?: Record<string, unknown>
): Record<string, unknown> {
  const maxTokensEnv = import.meta.env.VITE_MAX_OUTPUT_TOKENS;
  const maxTokens = maxTokensEnv ? parseInt(maxTokensEnv, 10) : undefined;

  const body: Record<string, unknown> = {
    model,
    messages,
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

/** Parse chat completion response into a ChatResponse for agentic loops */
export function parseChatResponse(
  data: Record<string, unknown>,
  providerId: string,
): ChatResponse {
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const firstChoice = choices?.[0] as Record<string, unknown> | undefined;
  const finishReason = firstChoice?.finish_reason as string | undefined;
  const rawText = extractMessageText(data);

  if (finishReason === 'length' && import.meta.env.DEV) {
    console.warn(`[${providerId}] Response truncated due to max_tokens limit. Agentic tools may be incomplete.`);
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

// ── Native tool calling helpers ───────────────────────────────────────

/**
 * Build an OpenAI-compatible request body that includes a tools schema.
 * Extends buildChatRequestFromMessages with the tools and tool_choice fields.
 */
export function buildToolsRequestBody(
  model: string,
  messages: ChatMessage[],
  tools: ToolDefinition[],
  extraFields?: Record<string, unknown>
): Record<string, unknown> {
  const base = buildChatRequestFromMessages(model, messages, extraFields);
  return {
    ...base,
    tools: tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    })),
    tool_choice: 'auto',
  };
}

/**
 * Parse a chat completion response that may contain tool_calls.
 * Returns a ToolChatResponse with structured tool calls and any prose text.
 */
export function parseToolCallResponse(
  data: Record<string, unknown>,
  providerId: string,
): ToolChatResponse {
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const firstChoice = choices?.[0] as Record<string, unknown> | undefined;
  const message = firstChoice?.message as Record<string, unknown> | undefined;
  const finishReason = firstChoice?.finish_reason as string | undefined;
  const usage = data.usage as Record<string, unknown> | undefined;

  if (finishReason === 'length' && import.meta.env.DEV) {
    console.warn(`[${providerId}] Tool response truncated due to max_tokens limit.`);
  }

  const rawToolCalls = message?.tool_calls as Array<Record<string, unknown>> | undefined;
  const toolCalls: ToolCall[] = (rawToolCalls ?? []).map((tc) => {
    const fn = tc.function as Record<string, unknown> | undefined;
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse((fn?.arguments as string) ?? '{}');
    } catch {
      args = {};
    }
    return {
      name: (fn?.name as string) ?? '',
      args,
    };
  });

  return {
    toolCalls,
    text: (message?.content as string | undefined) ?? undefined,
    metadata: {
      tokensUsed: usage?.completion_tokens as number | undefined,
      truncated: finishReason === 'length',
    },
  };
}
