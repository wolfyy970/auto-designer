import type { SpecSectionId, SpecSectionMeta } from '../types/spec';

export const SPEC_SECTIONS: SpecSectionMeta[] = [
  {
    id: 'existing-design',
    title: 'Existing Design',
    description:
      'What exists today. Screenshots, what works, what fails, what prompted this redesign.',
    required: false,
  },
  {
    id: 'research-context',
    title: 'Research & Context',
    description:
      'Who is the user, what do they need, and what do we know? Decision context, user intent, behavioral insights, supporting research, why current solutions fail.',
    required: true,
  },
  {
    id: 'objectives-metrics',
    title: 'Objectives & Metrics',
    description:
      'What success looks like for the business and user. Goals, primary KPIs, secondary metrics, evaluation criteria, time horizon.',
    required: true,
  },
  {
    id: 'design-constraints',
    title: 'Design Constraints',
    description:
      'Boundaries and exploration space. Non-negotiable requirements (brand, accessibility, legal, ethical) plus what may vary across variants (layout, messaging, interaction patterns, visual treatment).',
    required: true,
  },
];

export type ModelTier = 'quality' | 'balanced' | 'speed';

export interface ModelOption {
  id: string;
  tier: ModelTier;
  label: string;
  description: string;
}

// OpenRouter model IDs from .env
const OPENROUTER_MODEL_QUALITY = import.meta.env.VITE_OPENROUTER_MODEL_QUALITY || 'anthropic/claude-opus-4.6';
const OPENROUTER_MODEL_BALANCED = import.meta.env.VITE_OPENROUTER_MODEL_BALANCED || 'anthropic/claude-sonnet-4.5';
const OPENROUTER_MODEL_SPEED = import.meta.env.VITE_OPENROUTER_MODEL_SPEED || 'anthropic/claude-haiku-4.5';

// LM Studio model IDs from .env
const LMSTUDIO_MODEL_QUALITY = import.meta.env.VITE_LMSTUDIO_MODEL_QUALITY || 'qwen/qwen3-coder-next';
const LMSTUDIO_MODEL_BALANCED = import.meta.env.VITE_LMSTUDIO_MODEL_BALANCED || 'qwen/qwen3-coder-next';
const LMSTUDIO_MODEL_SPEED = import.meta.env.VITE_LMSTUDIO_MODEL_SPEED || 'qwen/qwen3-coder-next';

function modelName(id: string): string {
  const parts = id.split('/');
  return parts.length > 1 ? parts[1] : id;
}

export const OPENROUTER_MODEL_TIERS: ModelOption[] = [
  { id: OPENROUTER_MODEL_QUALITY, tier: 'quality', label: 'Quality', description: `Best output — ${modelName(OPENROUTER_MODEL_QUALITY)}` },
  { id: OPENROUTER_MODEL_BALANCED, tier: 'balanced', label: 'Balanced', description: `Default — ${modelName(OPENROUTER_MODEL_BALANCED)}` },
  { id: OPENROUTER_MODEL_SPEED, tier: 'speed', label: 'Speed', description: `Fastest — ${modelName(OPENROUTER_MODEL_SPEED)}` },
];

export const LMSTUDIO_MODEL_TIERS: ModelOption[] = [
  { id: LMSTUDIO_MODEL_QUALITY, tier: 'quality', label: 'Quality', description: `Best output — ${modelName(LMSTUDIO_MODEL_QUALITY)}` },
  { id: LMSTUDIO_MODEL_BALANCED, tier: 'balanced', label: 'Balanced', description: `Default — ${modelName(LMSTUDIO_MODEL_BALANCED)}` },
  { id: LMSTUDIO_MODEL_SPEED, tier: 'speed', label: 'Speed', description: `Fastest — ${modelName(LMSTUDIO_MODEL_SPEED)}` },
];

// Legacy fallback - defaults to OpenRouter
export const MODEL_TIERS = OPENROUTER_MODEL_TIERS;

// Helper to get model tiers for a specific provider
export function getModelTiersForProvider(providerId: string): ModelOption[] {
  switch (providerId) {
    case 'lmstudio':
      return LMSTUDIO_MODEL_TIERS;
    case 'openrouter':
      return OPENROUTER_MODEL_TIERS;
    default:
      return OPENROUTER_MODEL_TIERS;
  }
}

function resolveDefaultTier(envKey: string, fallback: ModelTier, tiers: ModelOption[]): string {
  const tier = (import.meta.env[envKey] || fallback) as ModelTier;
  const match = tiers.find((m) => m.tier === tier);
  return match?.id ?? tiers.find((m) => m.tier === 'balanced')!.id;
}

// Resolve default provider and model for compiler
export const DEFAULT_COMPILER_PROVIDER = import.meta.env.VITE_DEFAULT_COMPILER_PROVIDER || 'openrouter';
const compilerTiers = getModelTiersForProvider(DEFAULT_COMPILER_PROVIDER);
export const DEFAULT_COMPILER_MODEL = resolveDefaultTier('VITE_DEFAULT_COMPILER_TIER', 'quality', compilerTiers);

// Resolve default provider and model for generation
export const DEFAULT_GENERATION_PROVIDER = import.meta.env.VITE_DEFAULT_GENERATION_PROVIDER || 'lmstudio';
const generationTiers = getModelTiersForProvider(DEFAULT_GENERATION_PROVIDER);
export const DEFAULT_GENERATION_MODEL = resolveDefaultTier('VITE_DEFAULT_GENERATION_TIER', 'balanced', generationTiers);

export function createEmptySection(id: SpecSectionId) {
  return {
    id,
    content: '',
    images: [],
    lastModified: new Date().toISOString(),
  };
}

export function createEmptySections() {
  return Object.fromEntries(
    SPEC_SECTIONS.map((s) => [s.id, createEmptySection(s.id)])
  ) as Record<SpecSectionId, ReturnType<typeof createEmptySection>>;
}
