import type { CompiledPrompt } from '../../types/compiler';
import type {
  GenerationProvider,
  GenerationResult,
  OutputFormat,
  ProviderOptions,
} from '../../types/provider';
import { DEFAULT_GENERATION_MODEL } from '../../lib/constants';
import { generateId, now, envNewlines } from '../../lib/utils';

const DEFAULT_GEN_SYSTEM_HTML =
  'You are a design generation system. Return ONLY a complete, self-contained HTML document. Include all CSS inline. No external dependencies.';

const DEFAULT_GEN_SYSTEM_REACT =
  'You are a design generation system. Return ONLY a single self-contained React component as JSX. Include all styles inline or via a <style> tag. The component should be named App and export as default. No imports needed — React is available globally.';

const envHtml = import.meta.env.VITE_PROMPT_GEN_SYSTEM_HTML;
const envReact = import.meta.env.VITE_PROMPT_GEN_SYSTEM_REACT;

const GEN_SYSTEM_HTML: string = envHtml ? envNewlines(envHtml) : DEFAULT_GEN_SYSTEM_HTML;
const GEN_SYSTEM_REACT: string = envReact ? envNewlines(envReact) : DEFAULT_GEN_SYSTEM_REACT;

function extractCode(text: string): string {
  console.log('[extractCode] Processing response (first 200 chars):', text.substring(0, 200));

  // Try to extract from markdown code fences
  const htmlMatch = text.match(/```(?:html|htm)\s*\n([\s\S]*?)\n```/);
  if (htmlMatch) {
    console.log('[extractCode] Found HTML fence');
    return htmlMatch[1].trim();
  }

  const reactMatch = text.match(/```(?:jsx|tsx|react)\s*\n([\s\S]*?)\n```/);
  if (reactMatch) {
    console.log('[extractCode] Found React fence');
    return reactMatch[1].trim();
  }

  const genericMatch = text.match(/```\s*\n([\s\S]*?)\n```/);
  if (genericMatch) {
    console.log('[extractCode] Found generic fence');
    return genericMatch[1].trim();
  }

  // Check if response is already raw HTML/code (no fence)
  const trimmed = text.trim();
  if (trimmed.match(/^<!doctype|^<html/i)) {
    console.log('[extractCode] Detected raw HTML');
    return trimmed;
  }

  // Check if it starts with common React patterns
  if (trimmed.match(/^(export\s+default|function\s+App|const\s+App)/)) {
    console.log('[extractCode] Detected raw React code');
    return trimmed;
  }

  // Fallback: might include explanatory text - warn about this
  console.warn('[extractCode] No code fence found, returning entire response. This may include non-code text.');
  return text;
}

export class OpenRouterGenerationProvider implements GenerationProvider {
  id = 'openrouter';
  name = 'OpenRouter';
  description = 'Generates HTML/React code via OpenRouter (Claude, GPT-4o, Gemini, etc.)';
  supportsImages = false;
  supportedFormats: OutputFormat[] = ['html', 'react'];

  async generate(
    prompt: CompiledPrompt,
    options: ProviderOptions
  ): Promise<GenerationResult> {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OpenRouter API key is not configured. Set VITE_OPENROUTER_API_KEY in .env.local'
      );
    }

    const model = options.model ?? DEFAULT_GENERATION_MODEL;
    const startTime = Date.now();

    const systemPrompt =
      options.format === 'react' ? GEN_SYSTEM_REACT : GEN_SYSTEM_HTML;

    // Allow user to control max_tokens via env, or omit for no limit
    const maxTokensEnv = import.meta.env.VITE_MAX_OUTPUT_TOKENS;
    const maxTokens = maxTokensEnv ? parseInt(maxTokensEnv, 10) : undefined;

    const requestBody: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.prompt },
      ],
      temperature: 0.7,
    };

    // Only add max_tokens if configured, otherwise let model use its natural limit
    if (maxTokens) {
      requestBody.max_tokens = maxTokens;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
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

    // Warn if response was truncated
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
    return !!import.meta.env.VITE_OPENROUTER_API_KEY;
  }
}
