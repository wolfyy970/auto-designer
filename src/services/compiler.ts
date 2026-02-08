import type { DesignSpec } from '../types/spec';
import type { CompiledPrompt, DimensionMap, VariantStrategy } from '../types/compiler';
import { callOpenRouter } from './openrouter';
import { COMPILER_SYSTEM_PROMPT } from '../lib/prompts/compiler-system';
import { buildCompilerUserPrompt } from '../lib/prompts/compiler-user';
import { buildVariantPrompt } from '../lib/prompts/variant-prompt';
import { generateId, now } from '../lib/utils';

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
  model: string = 'anthropic/claude-sonnet-4.5'
): Promise<DimensionMap> {
  const userPrompt = buildCompilerUserPrompt(spec);

  const response = await callOpenRouter(
    [
      { role: 'system', content: COMPILER_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    model,
    { temperature: 0.7, max_tokens: 4096 }
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
  dimensionMap: DimensionMap
): CompiledPrompt[] {
  const allImages = Object.values(spec.sections).flatMap((s) => s.images);

  return dimensionMap.variants.map((strategy: VariantStrategy) => ({
    id: generateId(),
    variantStrategyId: strategy.id,
    specId: spec.id,
    prompt: buildVariantPrompt(spec, strategy),
    images: allImages,
    compiledAt: now(),
  }));
}
