import type { CompiledPrompt } from '../../types/compiler';
import type {
  GenerationProvider,
  GenerationResult,
  OutputFormat,
  ProviderModel,
  ProviderOptions,
} from '../../types/provider';
import { LMSTUDIO_PROXY } from '../../lib/constants';
import { buildUserContent, buildChatRequest, fetchChatCompletion, fetchModelList, selectSystemPrompt, parseGenerationResult } from '../../lib/provider-helpers';

const DEFAULT_MODEL = 'qwen/qwen3-coder-next';

export class LMStudioProvider implements GenerationProvider {
  id = 'lmstudio';
  name = 'LM Studio (Local)';
  description = 'Local inference via LM Studio API';
  supportsImages = false;
  supportsParallel = false;
  supportedFormats: OutputFormat[] = ['html', 'react'];

  async listModels(): Promise<ProviderModel[]> {
    const visionPrefixes = (import.meta.env.VITE_LMSTUDIO_VISION_MODELS || '')
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);

    return fetchModelList(`${LMSTUDIO_PROXY}/v1/models`, (models) =>
      models.map((m) => {
        const id = m.id as string;
        return {
          id,
          name: id,
          supportsVision: visionPrefixes.length > 0 &&
            visionPrefixes.some((prefix: string) => id.toLowerCase().includes(prefix)),
        };
      }),
    );
  }

  async generate(
    prompt: CompiledPrompt,
    options: ProviderOptions
  ): Promise<GenerationResult> {
    const model = options.model || DEFAULT_MODEL;
    const startTime = Date.now();

    const systemPrompt = selectSystemPrompt(options.format);

    const userContent = buildUserContent(prompt, options.supportsVision ?? false);
    const requestBody = buildChatRequest(model, systemPrompt, userContent, { stream: false });

    const data = await fetchChatCompletion(
      `${LMSTUDIO_PROXY}/v1/chat/completions`,
      requestBody,
      { 404: 'LM Studio not available. Make sure LM Studio is running and the server is enabled.' },
      'LM Studio',
    );
    return parseGenerationResult(data, prompt, this.id, model, startTime);
  }

  isAvailable(): boolean {
    return true;
  }
}
