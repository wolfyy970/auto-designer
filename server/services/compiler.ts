import type { DesignSpec, ReferenceImage } from '../../src/types/spec.ts';
import type { CompiledPrompt, DimensionMap, VariantStrategy } from '../../src/types/compiler.ts';
import type { ContentPart, ChatMessage } from '../../src/types/provider.ts';
import { buildCompilerUserPrompt, type CritiqueInput, type CompilerPromptOptions } from '../lib/prompts/compiler-user.ts';
import { buildVariantPrompt } from '../lib/prompts/variant-prompt.ts';
import { generateId, now } from '../lib/utils.ts';
import { env } from '../env.ts';
import { fetchChatCompletion, extractMessageText } from '../lib/provider-helpers.ts';
import { logLlmCall } from '../log-store.ts';

export type { ChatMessage };

function buildMultimodalContent(text: string, images: ReferenceImage[]): ContentPart[] {
  return [
    { type: 'text', text },
    ...images.map((img) => ({
      type: 'image_url' as const,
      image_url: { url: img.dataUrl },
    })),
  ];
}

interface ProviderConfig {
  url: string;
  errorMap: Record<number, string>;
  label: string;
  extraFields?: Record<string, unknown>;
  extraHeaders?: Record<string, string>;
}

function getProviderConfig(providerId: string): ProviderConfig {
  if (providerId === 'openrouter') {
    return {
      url: `${env.OPENROUTER_BASE_URL}/api/v1/chat/completions`,
      errorMap: { 401: 'Invalid OpenRouter API key.', 429: 'Rate limit exceeded. Wait a moment and try again.' },
      label: 'OpenRouter',
      extraHeaders: { 'Authorization': `Bearer ${env.OPENROUTER_API_KEY}` },
    };
  }
  if (providerId === 'lmstudio') {
    return {
      url: `${env.LMSTUDIO_URL}/v1/chat/completions`,
      errorMap: { 404: 'LM Studio not available. Make sure LM Studio is running and the server is enabled.' },
      label: 'LM Studio',
      extraFields: { stream: false },
    };
  }
  throw new Error(`Unknown provider: ${providerId}`);
}

export async function callLLM(
  messages: ChatMessage[],
  model: string,
  providerId: string,
  options: { temperature?: number; max_tokens?: number; images?: ReferenceImage[] } = {}
): Promise<string> {
  const config = getProviderConfig(providerId);
  const { images, ...requestOptions } = options;

  const finalMessages = images && images.length > 0
    ? messages.map((msg) => {
        if (msg.role === 'user' && typeof msg.content === 'string') {
          return { ...msg, content: buildMultimodalContent(msg.content, images) };
        }
        return msg;
      })
    : messages;

  const data = await fetchChatCompletion(
    config.url,
    { model, messages: finalMessages, ...config.extraFields, ...requestOptions },
    config.errorMap,
    config.label,
    config.extraHeaders,
  );
  return extractMessageText(data);
}

function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return text;
}

function validateDimensionMap(
  raw: Record<string, unknown>,
  specId: string,
  model: string
): DimensionMap {
  const dimensions = Array.isArray(raw.dimensions)
    ? raw.dimensions.map((d: Record<string, unknown>) => ({
        name: String(d.name || ''),
        range: String(d.range || ''),
        isConstant: Boolean(d.isConstant),
      }))
    : [];

  const variants = Array.isArray(raw.variants)
    ? raw.variants.map((v: Record<string, unknown>) => ({
        id: generateId(),
        name: String(v.name || 'Unnamed Variant'),
        hypothesis: String(v.hypothesis || v.primaryEmphasis || ''),
        rationale: String(v.rationale || ''),
        measurements: String(v.measurements || ''),
        dimensionValues:
          v.dimensionValues && typeof v.dimensionValues === 'object'
            ? Object.fromEntries(
                Object.entries(v.dimensionValues as Record<string, unknown>).map(
                  ([k, val]) => [k, String(val)]
                )
              )
            : {},
      }))
    : [];

  return {
    id: generateId(),
    specId,
    dimensions,
    variants,
    generatedAt: now(),
    compilerModel: model,
  };
}

export interface CompileOptions {
  systemPrompt: string;
  userPromptTemplate: string;
  referenceDesigns?: { name: string; code: string }[];
  critiques?: CritiqueInput[];
  supportsVision?: boolean;
  promptOptions?: CompilerPromptOptions;
}

export async function compileSpec(
  spec: DesignSpec,
  model: string,
  providerId: string,
  options: CompileOptions,
): Promise<DimensionMap> {
  const userPrompt = buildCompilerUserPrompt(
    spec,
    options.userPromptTemplate,
    options.referenceDesigns,
    options.critiques,
    options.promptOptions,
  );

  const images = options.supportsVision
    ? Object.values(spec.sections).flatMap((s) => s.images).filter((img) => img.dataUrl)
    : undefined;

  const systemPrompt = options.systemPrompt;
  const t0 = performance.now();
  let response: string;
  let logError: string | undefined;
  try {
    response = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      providerId,
      { temperature: 0.7, max_tokens: 4096, images }
    );
  } catch (err) {
    logError = String(err);
    logLlmCall({
      source: 'compiler',
      model,
      provider: providerId,
      systemPrompt,
      userPrompt,
      response: '',
      durationMs: Math.round(performance.now() - t0),
      error: logError,
    });
    throw err;
  }
  const durationMs = Math.round(performance.now() - t0);

  const jsonStr = extractJSON(response);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    logLlmCall({
      source: 'compiler',
      model,
      provider: providerId,
      systemPrompt,
      userPrompt,
      response,
      durationMs,
      error: 'Invalid JSON response',
    });
    throw new Error(
      `Compiler returned invalid JSON. Try re-compiling or switching models.\n\nRaw response:\n${response.slice(0, 500)}`
    );
  }

  logLlmCall({
    source: 'compiler',
    model,
    provider: providerId,
    systemPrompt,
    userPrompt,
    response,
    durationMs,
  });

  return validateDimensionMap(parsed, spec.id, model);
}

export function compileVariantPrompts(
  spec: DesignSpec,
  dimensionMap: DimensionMap,
  variantTemplate: string,
  designSystemOverride?: string,
  extraImages?: ReferenceImage[],
): CompiledPrompt[] {
  const allImages = [
    ...Object.values(spec.sections).flatMap((s) => s.images),
    ...(extraImages ?? []),
  ];

  return dimensionMap.variants.map((strategy: VariantStrategy) => ({
    id: generateId(),
    variantStrategyId: strategy.id,
    specId: spec.id,
    prompt: buildVariantPrompt(spec, strategy, variantTemplate, designSystemOverride),
    images: allImages,
    compiledAt: now(),
  }));
}
