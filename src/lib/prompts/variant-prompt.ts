import type { DesignSpec } from '../../types/spec';
import type { VariantStrategy } from '../../types/compiler';
import { interpolate, envNewlines } from '../utils';

const DEFAULT = `You are a design generation system. Generate a complete, self-contained HTML page implementing the following design variant.

## VARIANT STRATEGY: {{STRATEGY_NAME}}

### Primary Emphasis
{{PRIMARY_EMPHASIS}}

### Rationale
{{RATIONALE}}

### Coupled Decisions
{{COUPLED_DECISIONS}}

### Dimension Values
{{DIMENSION_VALUES}}

---

## CONTEXT

### Research & Context
{{RESEARCH_CONTEXT}}

{{IMAGE_BLOCK}}

---

## OBJECTIVES & METRICS (How this variant will be judged)
{{OBJECTIVES_METRICS}}

---

## DESIGN CONSTRAINTS (Non-negotiable boundaries + exploration space)
{{DESIGN_CONSTRAINTS}}

---

## OUTPUT REQUIREMENTS
- Return ONLY a complete, self-contained HTML document with inline CSS.
- Include a proper DOCTYPE, html, head, and body.
- Use modern CSS (flexbox, grid, custom properties).
- Make it responsive and accessible (semantic HTML, proper contrast, keyboard-navigable).
- Include realistic, plausible content — not lorem ipsum.
- No external dependencies (no CDN links, no external stylesheets).
- The page should be visually polished and production-quality.`;

const envVal = import.meta.env.VITE_PROMPT_VARIANT;
const TEMPLATE: string = envVal ? envNewlines(envVal) : DEFAULT;

export function buildVariantPrompt(
  spec: DesignSpec,
  strategy: VariantStrategy
): string {
  const getSection = (id: string) =>
    spec.sections[id as keyof typeof spec.sections]?.content.trim() || '(Not provided)';

  const imageDescriptions = Object.values(spec.sections)
    .flatMap((s) => s.images)
    .filter((img) => img.description.trim())
    .map((img) => `- [${img.filename}]: ${img.description}`)
    .join('\n');

  const dimensionValuesList = Object.entries(strategy.dimensionValues)
    .map(([dim, val]) => `- ${dim}: ${val}`)
    .join('\n');

  const imageBlock = imageDescriptions
    ? `### Existing Design Reference\n${getSection('existing-design')}\n\nReference images:\n${imageDescriptions}`
    : '';

  return interpolate(TEMPLATE, {
    STRATEGY_NAME: strategy.name,
    PRIMARY_EMPHASIS: strategy.primaryEmphasis,
    RATIONALE: strategy.rationale,
    COUPLED_DECISIONS: strategy.coupledDecisions,
    DIMENSION_VALUES: dimensionValuesList || '(Use your judgment within the exploration space ranges)',
    RESEARCH_CONTEXT: getSection('research-context'),
    IMAGE_BLOCK: imageBlock,
    OBJECTIVES_METRICS: getSection('objectives-metrics'),
    DESIGN_CONSTRAINTS: getSection('design-constraints'),
  });
}
