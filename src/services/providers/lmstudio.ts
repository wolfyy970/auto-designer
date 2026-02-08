import type { CompiledPrompt } from '../../types/compiler';
import type {
  GenerationProvider,
  GenerationResult,
  OutputFormat,
  ProviderOptions,
} from '../../types/provider';
import { generateId, now } from '../../lib/utils';

const DEFAULT_LM_STUDIO_URL = 'http://192.168.252.213:1234';
const DEFAULT_MODEL = 'qwen/qwen3-coder-next';

const DEFAULT_GEN_SYSTEM_HTML =
  'You are a design generation system. Return ONLY a complete, self-contained HTML document. Include all CSS inline. No external dependencies.';

const DEFAULT_GEN_SYSTEM_REACT =
  'You are a design generation system. Return ONLY a single self-contained React component as JSX. Include all styles inline or via a <style> tag. The component should be named App and export as default. No imports needed — React is available globally.';

function extractCode(text: string): string {
  console.log('[LM Studio extractCode] Processing response (first 200 chars):', text.substring(0, 200));

  // Try to extract from markdown code fences
  const htmlMatch = text.match(/```(?:html|htm)\s*\n([\s\S]*?)\n```/);
  if (htmlMatch) {
    console.log('[LM Studio extractCode] Found HTML fence');
    return htmlMatch[1].trim();
  }

  const reactMatch = text.match(/```(?:jsx|tsx|react)\s*\n([\s\S]*?)\n```/);
  if (reactMatch) {
    console.log('[LM Studio extractCode] Found React fence');
    return reactMatch[1].trim();
  }

  const genericMatch = text.match(/```\s*\n([\s\S]*?)\n```/);
  if (genericMatch) {
    console.log('[LM Studio extractCode] Found generic fence');
    return genericMatch[1].trim();
  }

  // Check if response is already raw HTML/code (no fence)
  const trimmed = text.trim();
  if (trimmed.match(/^<!doctype|^<html/i)) {
    console.log('[LM Studio extractCode] Detected raw HTML');
    return trimmed;
  }

  // Check if it starts with common React patterns
  if (trimmed.match(/^(export\s+default|function\s+App|const\s+App)/)) {
    console.log('[LM Studio extractCode] Detected raw React code');
    return trimmed;
  }

  // Fallback: might include explanatory text - warn about this
  console.warn('[LM Studio extractCode] No code fence found, returning entire response. This may include non-code text.');
  return text;
}

export class LMStudioProvider implements GenerationProvider {
  id = 'lmstudio';
  name = 'LM Studio (Local)';
  description = 'Local inference via LM Studio API';
  supportsImages = false;
  supportedFormats: OutputFormat[] = ['html', 'react'];

  async generate(
    prompt: CompiledPrompt,
    options: ProviderOptions
  ): Promise<GenerationResult> {
    const baseUrl = import.meta.env.VITE_LMSTUDIO_URL || DEFAULT_LM_STUDIO_URL;
    const model = options.model || DEFAULT_MODEL;
    const startTime = Date.now();

    const systemPrompt =
      options.format === 'react' ? DEFAULT_GEN_SYSTEM_REACT : DEFAULT_GEN_SYSTEM_HTML;

    const requestBody = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.prompt },
      ],
      temperature: 0.7,
      stream: false,
    };

    console.log('[LM Studio] Sending request to:', `${baseUrl}/api/v1/chat`);
    console.log('[LM Studio] Model:', model);

    const response = await fetch(`${baseUrl}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      if (response.status === 404) {
        throw new Error(`LM Studio not available at ${baseUrl}. Make sure LM Studio is running and the server is enabled.`);
      }
      throw new Error(`LM Studio API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const durationMs = Date.now() - startTime;

    // LM Studio v1 API response format
    const rawText = data.choices?.[0]?.message?.content ?? '';
    const code = extractCode(rawText);

    console.log('[LM Studio] Generation complete in', durationMs, 'ms');

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
    // LM Studio doesn't require an API key, just needs to be running
    return true;
  }
}
