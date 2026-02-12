import type { CompiledPrompt } from '../../types/compiler';
import type {
  ContentPart,
  GenerationProvider,
  GenerationResult,
  OutputFormat,
  ProviderModel,
  ProviderOptions,
} from '../../types/provider';
import { GEN_SYSTEM_HTML, GEN_SYSTEM_REACT } from '../../lib/constants';
import { generateId, now } from '../../lib/utils';
import { extractCode } from '../../lib/extract-code';

// Vite proxy forwards /openrouter-api/* → https://openrouter.ai/* with API key injected
const PROXY_BASE = '/openrouter-api';

export class OpenRouterGenerationProvider implements GenerationProvider {
  id = 'openrouter';
  name = 'OpenRouter';
  description = 'Generates HTML/React code via OpenRouter (Claude, GPT-4o, Gemini, etc.)';
  supportsImages = false;
  supportedFormats: OutputFormat[] = ['html', 'react'];

  async listModels(): Promise<ProviderModel[]> {
    try {
      const response = await fetch(`${PROXY_BASE}/api/v1/models`);
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
      options.format === 'react' ? GEN_SYSTEM_REACT : GEN_SYSTEM_HTML;

    const maxTokensEnv = import.meta.env.VITE_MAX_OUTPUT_TOKENS;
    const maxTokens = maxTokensEnv ? parseInt(maxTokensEnv, 10) : undefined;

    const userContent: string | ContentPart[] =
      options.supportsVision && prompt.images.length > 0
        ? [
            { type: 'text' as const, text: prompt.prompt },
            ...prompt.images.map((img) => ({
              type: 'image_url' as const,
              image_url: { url: img.dataUrl },
            })),
          ]
        : prompt.prompt;

    const requestBody: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
    };

    if (maxTokens) {
      requestBody.max_tokens = maxTokens;
    }

    const response = await fetch(`${PROXY_BASE}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const durationMs = Date.now() - startTime;
    const rawText = data.choices?.[0]?.message?.content ?? '';
    const finishReason = data.choices?.[0]?.finish_reason;
    const code = extractCode(rawText);

    if (finishReason === 'length') {
      console.warn('[OpenRouter] Response truncated due to max_tokens limit. Code may be incomplete.');
    }

    return {
      id: generateId(),
      variantStrategyId: prompt.variantStrategyId,
      providerId: this.id,
      status: 'complete',
      code,
      metadata: {
        model: data.model ?? model,
        tokensUsed: data.usage?.completion_tokens,
        durationMs,
        completedAt: now(),
        truncated: finishReason === 'length',
      },
    };
  }

  isAvailable(): boolean {
    // Proxy handles the key server-side; always available in dev
    return true;
  }
}
