import type { CompiledPrompt } from '../../types/compiler';
import type {
  GenerationProvider,
  GenerationResult,
  OutputFormat,
  ProviderModel,
  ProviderOptions,
} from '../../types/provider';
import { OPENROUTER_PROXY } from '../../lib/constants';
import { buildUserContent, buildChatRequest, fetchChatCompletion, fetchModelList, selectSystemPrompt, parseGenerationResult } from '../../lib/provider-helpers';

export class OpenRouterGenerationProvider implements GenerationProvider {
  id = 'openrouter';
  name = 'OpenRouter';
  description = 'Generates HTML/React code via OpenRouter (Claude, GPT-4o, Gemini, etc.)';
  supportsImages = false;
  supportsParallel = true;
  supportedFormats: OutputFormat[] = ['html', 'react'];

  async listModels(): Promise<ProviderModel[]> {
    return fetchModelList(`${OPENROUTER_PROXY}/api/v1/models`, (models) =>
      models.map((m) => ({
        id: m.id as string,
        name: (m.name as string) ?? (m.id as string),
        contextLength: m.context_length as number | undefined,
        supportsVision: typeof m.modality === 'string' && (m.modality as string).includes('image'),
      })),
    );
  }

  async generate(
    prompt: CompiledPrompt,
    options: ProviderOptions
  ): Promise<GenerationResult> {
    const model = options.model || 'anthropic/claude-sonnet-4.5';
    const startTime = Date.now();

    const systemPrompt = selectSystemPrompt(options.format);

    const userContent = buildUserContent(prompt, options.supportsVision ?? false);
    const requestBody = buildChatRequest(model, systemPrompt, userContent);

    const data = await fetchChatCompletion(
      `${OPENROUTER_PROXY}/api/v1/chat/completions`,
      requestBody,
      {
        401: 'Invalid OpenRouter API key.',
        429: 'Rate limit exceeded. Wait a moment and try again.',
      },
      'OpenRouter',
    );
    return parseGenerationResult(data, prompt, this.id, model, startTime);
  }

  isAvailable(): boolean {
    return true;
  }
}
