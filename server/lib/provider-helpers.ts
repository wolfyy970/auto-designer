import { env } from '../env.ts';
import type { ChatMessage } from '../../src/types/provider.ts';
import type { ProviderModel, ChatResponse, ToolDefinition, ToolCall, ToolChatResponse } from '../../src/types/provider.ts';

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

export function parseToolCallResponse(
  data: Record<string, unknown>,
  providerId: string,
): ToolChatResponse {
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const firstChoice = choices?.[0] as Record<string, unknown> | undefined;
  const message = firstChoice?.message as Record<string, unknown> | undefined;
  const finishReason = firstChoice?.finish_reason as string | undefined;
  const usage = data.usage as Record<string, unknown> | undefined;

  if (finishReason === 'length' && env.isDev) {
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
