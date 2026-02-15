import type { CompiledPrompt } from '../../types/compiler';
import type {
  GenerationProvider,
  GenerationResult,
  OutputFormat,
  ProviderModel,
  ProviderOptions,
} from '../../types/provider';
import { LMSTUDIO_PROXY } from '../../lib/constants';
import { getPrompt } from '../../stores/prompt-store';
import { buildUserContent, buildChatRequest, parseGenerationResult } from '../../lib/provider-helpers';

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

    try {
      const response = await fetch(`${LMSTUDIO_PROXY}/v1/models`);
      if (!response.ok) return [];

      const json = await response.json();
      return (json.data ?? []).map((m: Record<string, unknown>) => {
        const id = m.id as string;
        return {
          id,
          name: id,
          supportsVision: visionPrefixes.length > 0 &&
            visionPrefixes.some((prefix: string) => id.toLowerCase().includes(prefix)),
        };
      });
    } catch {
      return [];
    }
  }

  async generate(
    prompt: CompiledPrompt,
    options: ProviderOptions
  ): Promise<GenerationResult> {
    const model = options.model || DEFAULT_MODEL;
    const startTime = Date.now();

    const systemPrompt =
      options.format === 'react' ? getPrompt('genSystemReact') : getPrompt('genSystemHtml');

    const userContent = buildUserContent(prompt, options.supportsVision ?? false);
    const requestBody = buildChatRequest(model, systemPrompt, userContent, { stream: false });

    const response = await fetch(`${LMSTUDIO_PROXY}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      if (response.status === 404) {
        throw new Error('LM Studio not available. Make sure LM Studio is running and the server is enabled.');
      }
      throw new Error(`LM Studio API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    return parseGenerationResult(data, prompt, this.id, model, startTime);
  }

  isAvailable(): boolean {
    return true;
  }
}
