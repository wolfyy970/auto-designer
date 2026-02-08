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

// Model IDs from .env — swap in any OpenRouter model you want
const MODEL_QUALITY = import.meta.env.VITE_MODEL_QUALITY || 'anthropic/claude-opus-4.6';
const MODEL_BALANCED = import.meta.env.VITE_MODEL_BALANCED || 'anthropic/claude-sonnet-4.5';
const MODEL_SPEED = import.meta.env.VITE_MODEL_SPEED || 'anthropic/claude-haiku-4.5';

function modelName(id: string): string {
  const parts = id.split('/');
  return parts.length > 1 ? parts[1] : id;
}

export const MODEL_TIERS: ModelOption[] = [
  { id: MODEL_QUALITY, tier: 'quality', label: 'Quality', description: `Best output — ${modelName(MODEL_QUALITY)}` },
  { id: MODEL_BALANCED, tier: 'balanced', label: 'Balanced', description: `Default — ${modelName(MODEL_BALANCED)}` },
  { id: MODEL_SPEED, tier: 'speed', label: 'Speed', description: `Fastest — ${modelName(MODEL_SPEED)}` },
];

function resolveDefaultTier(envKey: string, fallback: ModelTier): string {
  const tier = (import.meta.env[envKey] || fallback) as ModelTier;
  const match = MODEL_TIERS.find((m) => m.tier === tier);
  return match?.id ?? MODEL_BALANCED;
}

export const DEFAULT_COMPILER_MODEL = resolveDefaultTier('VITE_DEFAULT_COMPILER_TIER', 'balanced');
export const DEFAULT_GENERATION_MODEL = resolveDefaultTier('VITE_DEFAULT_GENERATION_TIER', 'balanced');

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
