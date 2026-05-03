/**
 * One-place definition of the "inline a per-task guidance body into the
 * agent's user prompt" convention. Routes that used to instruct the agent
 * to call `use_skill('<key>')` now call this and get the body wrapped in
 * a session-typed XML element so the model can locate it deterministically.
 */
import type { PromptKey } from '../../src/lib/prompts/defaults.ts';
import { getPromptBody } from './prompt-resolution.ts';

/**
 * Resolve the prompt body for `key` and wrap it in `<tag>…</tag>`.
 * Tag names are model-prompt copy and stay local to each calling route.
 */
export async function inlineGuidance(key: PromptKey, tag: string): Promise<string> {
  const body = await getPromptBody(key);
  return `<${tag}>\n${body}\n</${tag}>`;
}
