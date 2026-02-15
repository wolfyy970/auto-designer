import type { CompiledPrompt } from '../../types/compiler';
import type {
  GenerationProvider,
  GenerationResult,
  OutputFormat,
  ProviderModel,
  ProviderOptions,
} from '../../types/provider';
import { OPENROUTER_PROXY } from '../../lib/constants';
import { getPrompt } from '../../stores/prompt-store';
import { buildUserContent, buildChatRequest, parseGenerationResult } from '../../lib/provider-helpers';

export class OpenRouterGenerationProvider implements GenerationProvider {
  id = 'openrouter';
  name = 'OpenRouter';
  description = 'Generates HTML/React code via OpenRouter (Claude, GPT-4o, Gemini, etc.)';
  supportsImages = false;
  supportsParallel = true;
  supportedFormats: OutputFormat[] = ['html', 'react'];

  async listModels(): Promise<ProviderModel[]> {
    try {
      const response = await fetch(`${OPENROUTER_PROXY}/api/v1/models`);
      if (!response.ok) return [];

      const json = await response.json();
      return (json.data ?? []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        name: (m.name as string) ?? (m.id as string),
        contextLength: m.context_length as number | undefined,
        supportsVision: typeof m.modality === 'string' && (m.modality as string).includes('image'),
      }));
    } catch {
      return [];
    }
  }

  async generate(
    prompt: CompiledPrompt,
    options: ProviderOptions
  ): Promise<GenerationResult> {
    const model = options.model || 'anthropic/claude-sonnet-4.5';
    const startTime = Date.now();

    const systemPrompt =
      options.format === 'react' ? getPrompt('genSystemReact') : getPrompt('genSystemHtml');

    const userContent = buildUserContent(prompt, options.supportsVision ?? false);
    const requestBody = buildChatRequest(model, systemPrompt, userContent);

    const response = await fetch(`${OPENROUTER_PROXY}/api/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      if (response.status === 401) {
        throw new Error('Invalid OpenRouter API key.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Wait a moment and try again.');
      }
      throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    return parseGenerationResult(data, prompt, this.id, model, startTime);
  }

  isAvailable(): boolean {
    return true;
  }
}
