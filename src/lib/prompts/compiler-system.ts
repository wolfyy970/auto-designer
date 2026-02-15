import { getPrompt } from '../../stores/prompt-store';

export function getCompilerSystemPrompt(): string {
  return getPrompt('compilerSystem');
}
