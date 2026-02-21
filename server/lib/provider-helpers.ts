export {
  fetchChatCompletion,
  extractMessageText,
  fetchModelList,
  parseChatResponse,
} from '../../src/lib/provider-fetch.ts';

import { env } from '../env.ts';
import type { ChatMessage } from '../../src/types/provider.ts';

/** Server-side variant: reads max tokens from the server env object. */
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
