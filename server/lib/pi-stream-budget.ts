/**
 * Pi `Context` token heuristics for `streamFn` max_tokens (agent turns only).
 *
 * Lives host-side because it depends on host config (`MAX_OUTPUT_TOKENS`) and
 * the host's token-estimate helper. Replaces the previous `pi-sdk/stream-budget.ts`.
 */
import type { Context, UserMessage, ToolResultMessage } from '@auto-designer/pi';
import { completionBudgetFromPromptTokens } from './completion-budget.ts';
import { env } from '../env.ts';
import {
  isImagePart,
  isTextPart,
  isThinkingPart,
  isToolCallPart,
} from './pi-bridge-narrowing.ts';
import { estimateTextTokens } from '../../src/lib/token-estimate.ts';

/** Per-image prompt-token allowance — coarse but stable for budget shrinkage. */
const IMAGE_TOKEN_ESTIMATE = 2_500;
/** Multiplier applied to the prompt-token estimate; pads for tokenizer drift. */
const CONTEXT_TOKEN_FUDGE = 1.04;
/** Floor for any non-empty user/tool-result message body. */
const MIN_USER_MESSAGE_TOKENS = 6;

function estimateUserOrToolContent(
  content: UserMessage['content'] | ToolResultMessage['content'],
): number {
  if (typeof content === 'string') return estimateTextTokens(content);
  let n = 0;
  for (const part of content) {
    if (isTextPart(part)) n += estimateTextTokens(part.text);
    else if (isImagePart(part)) n += IMAGE_TOKEN_ESTIMATE;
  }
  return Math.max(n, MIN_USER_MESSAGE_TOKENS);
}

function estimatePiContextTokens(context: Context): number {
  let n = estimateTextTokens(context.systemPrompt ?? '');
  for (const m of context.messages) {
    if (m.role === 'user' || m.role === 'toolResult') {
      n += estimateUserOrToolContent(m.content);
    } else if (m.role === 'assistant') {
      for (const c of m.content) {
        if (isTextPart(c)) n += estimateTextTokens(c.text);
        else if (isThinkingPart(c)) n += estimateTextTokens(c.thinking);
        else if (isToolCallPart(c)) {
          n += estimateTextTokens(JSON.stringify(c.arguments ?? {}));
          n += estimateTextTokens(c.name);
        }
      }
    }
  }
  if (context.tools?.length) {
    for (const t of context.tools) {
      n += estimateTextTokens(`${t.name}\n${t.description}\n${JSON.stringify(t.parameters ?? {})}`);
    }
  }
  return Math.ceil(n * CONTEXT_TOKEN_FUDGE);
}

/**
 * Per-turn Pi stream budget: shrinks as the agent context grows.
 * Respects `model.maxTokens` session ceiling and optional `MAX_OUTPUT_TOKENS`.
 */
export function piStreamCompletionMaxTokens(
  model: { contextWindow: number; maxTokens: number },
  context: Context,
  explicitFromOptions?: number,
): number {
  if (explicitFromOptions != null) return explicitFromOptions;
  const est = estimatePiContextTokens(context);
  const product = env.MAX_OUTPUT_TOKENS;
  const dynamic = completionBudgetFromPromptTokens(
    model.contextWindow,
    est,
    'agent_turn',
    product ?? undefined,
  );
  const ceil = Math.min(model.maxTokens, product ?? model.maxTokens);
  if (dynamic == null) return ceil;
  return Math.min(dynamic, ceil);
}
