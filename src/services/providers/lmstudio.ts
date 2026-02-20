import type { CompiledPrompt, ChatMessage } from '../../types/compiler';
import type {
  GenerationProvider,
  GenerationResult,
  ProviderModel,
  ProviderOptions,
  ChatResponse,
} from '../../types/provider';
import { LMSTUDIO_PROXY } from '../../lib/constants';
import { buildChatRequestFromMessages, fetchChatCompletion, fetchModelList, parseChatResponse } from '../../lib/provider-helpers';

const DEFAULT_MODEL = 'qwen/qwen3-coder-next';

export class LMStudioProvider implements GenerationProvider {
  id = 'lmstudio';
  name = 'LM Studio (Local)';
  description = 'Local inference via LM Studio API';
  supportsImages = false;
  supportsParallel = false;

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

  async generateChat(
    messages: ChatMessage[],
    options: ProviderOptions
  ): Promise<ChatResponse> {
    const model = options.model || DEFAULT_MODEL;

    const requestBody = buildChatRequestFromMessages(model, messages, { stream: false });

    const data = await fetchChatCompletion(
      `${LMSTUDIO_PROXY}/v1/chat/completions`,
      requestBody,
      { 404: 'LM Studio not available. Make sure LM Studio is running and the server is enabled.' },
      'LM Studio',
    );
    return parseChatResponse(data, this.id);
  }

  isAvailable(): boolean {
    return true;
  }
}
