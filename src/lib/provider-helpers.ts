import type { ChatMessage } from '../types/provider';

export {
  extractMessageText,
  fetchChatCompletion,
  fetchModelList,
  parseChatResponse,
} from './provider-fetch';

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
