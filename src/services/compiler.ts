import type { DesignSpec, ReferenceImage } from '../types/spec';
import type { CompiledPrompt, DimensionMap, VariantStrategy } from '../types/compiler';
import type { ContentPart } from '../types/provider';
import { getPrompt } from '../stores/prompt-store';
import { buildCompilerUserPrompt, type CritiqueInput } from '../lib/prompts/compiler-user';
import { buildVariantPrompt } from '../lib/prompts/variant-prompt';
import { generateId, now } from '../lib/utils';
import { OPENROUTER_PROXY, LMSTUDIO_PROXY } from '../lib/constants';
import { fetchChatCompletion, extractMessageText } from '../lib/provider-helpers';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

/** Build multimodal content: text + image parts for the user message */
function buildMultimodalContent(text: string, images: ReferenceImage[]): ContentPart[] {
  return [
    { type: 'text', text },
    ...images.map((img) => ({
      type: 'image_url' as const,
      image_url: { url: img.dataUrl },
    })),
  ];
}

const PROVIDER_CONFIG: Record<string, { url: string; errorMap: Record<number, string>; label: string; extraFields?: Record<string, unknown> }> = {
  openrouter: {
    url: `${OPENROUTER_PROXY}/api/v1/chat/completions`,
    errorMap: { 401: 'Invalid OpenRouter API key.', 429: 'Rate limit exceeded. Wait a moment and try again.' },
    label: 'OpenRouter',
  },
  lmstudio: {
    url: `${LMSTUDIO_PROXY}/v1/chat/completions`,
    errorMap: { 404: 'LM Studio not available. Make sure LM Studio is running and the server is enabled.' },
    label: 'LM Studio',
    extraFields: { stream: false },
  },
};

export async function callLLM(
  messages: ChatMessage[],
  model: string,
  providerId: string,
  options: { temperature?: number; max_tokens?: number; images?: ReferenceImage[] } = {}
): Promise<string> {
  const config = PROVIDER_CONFIG[providerId];
  if (!config) throw new Error(`Unknown provider: ${providerId}`);

  const { images, ...requestOptions } = options;

  // When images are provided, make user messages multimodal
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
  );
  return extractMessageText(data);
}

function extractJSON(text: string): string {
  // Try to find JSON in markdown code fences first
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try to find a JSON object directly
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
        primaryEmphasis: String(v.primaryEmphasis || ''),
        rationale: String(v.rationale || ''),
        howItDiffers: String(v.howItDiffers || ''),
        coupledDecisions: String(v.coupledDecisions || ''),
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

export async function compileSpec(
  spec: DesignSpec,
  model: string,
  providerId: string,
  referenceDesigns?: { name: string; code: string }[],
  critiques?: CritiqueInput[],
  supportsVision?: boolean
): Promise<DimensionMap> {
  const userPrompt = buildCompilerUserPrompt(spec, referenceDesigns, critiques);

  // Collect images from all spec sections when model supports vision
  const images = supportsVision
    ? Object.values(spec.sections).flatMap((s) => s.images).filter((img) => img.dataUrl)
    : undefined;

  const response = await callLLM(
    [
      { role: 'system', content: getPrompt('compilerSystem') },
      { role: 'user', content: userPrompt },
    ],
    model,
    providerId,
    { temperature: 0.7, max_tokens: 4096, images }
  );

  const jsonStr = extractJSON(response);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      `Compiler returned invalid JSON. This can happen with some models. Try re-compiling or switching models.\n\nRaw response:\n${response.slice(0, 500)}`
    );
  }

  return validateDimensionMap(parsed, spec.id, model);
}

export function compileVariantPrompts(
  spec: DesignSpec,
  dimensionMap: DimensionMap,
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
    prompt: buildVariantPrompt(spec, strategy, designSystemOverride),
    images: allImages,
    compiledAt: now(),
  }));
}
