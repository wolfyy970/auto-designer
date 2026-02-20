import type { CompiledPrompt, ChatMessage } from '../../types/compiler';
import type {
  GenerationProvider,
  GenerationResult,
  ProviderModel,
  ProviderOptions,
  ChatResponse,
} from '../../types/provider';
import { OPENROUTER_PROXY } from '../../lib/constants';
import { buildChatRequestFromMessages, fetchChatCompletion, fetchModelList, parseChatResponse } from '../../lib/provider-helpers';

export class OpenRouterGenerationProvider implements GenerationProvider {
  id = 'openrouter';
  name = 'OpenRouter';
  description = 'Generates HTML code via OpenRouter (Claude, GPT-4o, Gemini, etc.)';
  supportsImages = false;
  supportsParallel = true;

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

  async generateChat(
    messages: ChatMessage[],
    options: ProviderOptions
  ): Promise<ChatResponse> {
    const model = options.model || 'anthropic/claude-sonnet-4.5';
    
    // For vision support in agentic loop, we assume the user/developer 
    // passes multimodal ContentPart[] where appropriate in messages
    const requestBody = buildChatRequestFromMessages(model, messages);

    const data = await fetchChatCompletion(
      `${OPENROUTER_PROXY}/api/v1/chat/completions`,
      requestBody,
      {
        401: 'Invalid OpenRouter API key.',
        429: 'Rate limit exceeded. Wait a moment and try again.',
      },
      'OpenRouter',
    );
    return parseChatResponse(data, this.id);
  }

  isAvailable(): boolean {
    return true;
  }
}
