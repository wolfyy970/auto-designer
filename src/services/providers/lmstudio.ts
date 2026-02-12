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

// In dev, Vite proxy forwards /lmstudio-api/* → VITE_LMSTUDIO_URL/*
const PROXY_BASE = '/lmstudio-api';
const DEFAULT_MODEL = 'qwen/qwen3-coder-next';

export class LMStudioProvider implements GenerationProvider {
  id = 'lmstudio';
  name = 'LM Studio (Local)';
  description = 'Local inference via LM Studio API';
  supportsImages = false;
  supportedFormats: OutputFormat[] = ['html', 'react'];

  async listModels(): Promise<ProviderModel[]> {
    const url = `${PROXY_BASE}/v1/models`;
    console.log('[LMStudio] Fetching models from:', url);

    const visionPrefixes = (import.meta.env.VITE_LMSTUDIO_VISION_MODELS || '')
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);

    try {
      const response = await fetch(url);
      console.log('[LMStudio] Response status:', response.status);
      if (!response.ok) {
        console.warn('[LMStudio] Non-OK response:', response.status, response.statusText);
        return [];
      }

      const json = await response.json();
      console.log('[LMStudio] Raw response:', json);
      const models = (json.data ?? []).map((m: Record<string, unknown>) => {
        const id = m.id as string;
        return {
          id,
          name: id,
          supportsVision: visionPrefixes.length > 0 &&
            visionPrefixes.some((prefix: string) => id.toLowerCase().includes(prefix)),
        };
      });
      console.log('[LMStudio] Found models:', models);
      return models;
    } catch (err) {
      console.error('[LMStudio] Failed to fetch models:', err);
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
      options.format === 'react' ? GEN_SYSTEM_REACT : GEN_SYSTEM_HTML;

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

    const requestBody = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      stream: false,
    };

    const response = await fetch(`${PROXY_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const durationMs = Date.now() - startTime;

    const rawText = data.choices?.[0]?.message?.content ?? '';
    const code = extractCode(rawText);

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
      },
    };
  }

  isAvailable(): boolean {
    return true;
  }
}
