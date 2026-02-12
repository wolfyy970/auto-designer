import type { SpecSectionId, SpecSectionMeta } from '../types/spec';
import { envNewlines } from './utils';

export const SPEC_SECTIONS: SpecSectionMeta[] = [
  {
    id: 'design-brief',
    title: 'Design Brief',
    description:
      'What do you want to design? The primary directive — describe the design challenge, target experience, and desired outcome.',
    required: true,
  },
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

// Default providers
export const DEFAULT_COMPILER_PROVIDER = import.meta.env.VITE_DEFAULT_COMPILER_PROVIDER || 'openrouter';
export const DEFAULT_GENERATION_PROVIDER = import.meta.env.VITE_DEFAULT_GENERATION_PROVIDER || 'lmstudio';

// Generation system prompts (shared by all providers)
const DEFAULT_GEN_SYSTEM_HTML =
  'You are a design generation system. Return ONLY a complete, self-contained HTML document. Include all CSS inline. No external dependencies.';

const DEFAULT_GEN_SYSTEM_REACT =
  'You are a design generation system. Return ONLY a single self-contained React component as JSX. Include all styles inline or via a <style> tag. The component should be named App and export as default. No imports needed — React is available globally.';

const envHtml = import.meta.env.VITE_PROMPT_GEN_SYSTEM_HTML;
const envReact = import.meta.env.VITE_PROMPT_GEN_SYSTEM_REACT;

export const GEN_SYSTEM_HTML: string = envHtml ? envNewlines(envHtml) : DEFAULT_GEN_SYSTEM_HTML;
export const GEN_SYSTEM_REACT: string = envReact ? envNewlines(envReact) : DEFAULT_GEN_SYSTEM_REACT;

function createEmptySection(id: SpecSectionId) {
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
