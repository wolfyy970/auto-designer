import type { DesignSpec } from '../../types/spec';
import { interpolate, envNewlines } from '../utils';

const DEFAULT = `Analyze the following design specification and produce a dimension map with variant strategies.

# Design Specification: {{SPEC_TITLE}}

## Design Brief — the primary directive
{{DESIGN_BRIEF}}

## Existing Design — what exists today and what prompted a redesign
{{EXISTING_DESIGN}}

## Research & Context — who the user is, what they need, behavioral insights
Use this to ground every variant rationale in real user needs, not assumptions.
{{RESEARCH_CONTEXT}}

## Objectives & Metrics — success criteria the variants will be judged against
Ensure every variant strategy can be evaluated against these measures.
{{OBJECTIVES_METRICS}}

## Design Constraints — non-negotiable boundaries AND the exploration space
The constraints define the walls. The exploration ranges within them define where variants may diverge. Extract your dimensions from the exploration ranges here.
{{DESIGN_CONSTRAINTS}}

{{IMAGE_BLOCK}}

---

Produce the dimension map as JSON. Remember: every variant must satisfy all non-negotiable constraints while exploring within the defined ranges.`;

const envVal = import.meta.env.VITE_PROMPT_COMPILER_USER;
const TEMPLATE: string = envVal ? envNewlines(envVal) : DEFAULT;

function sectionContent(spec: DesignSpec, id: string): string {
  const section = spec.sections[id as keyof typeof spec.sections];
  if (!section) return '(Not provided)';
  return section.content.trim() || '(Not provided)';
}

function imageBlock(spec: DesignSpec): string {
  const images = Object.values(spec.sections)
    .flatMap((s) => s.images)
    .filter((img) => img.description.trim());
  if (images.length === 0) return '';
  return (
    '## Reference Images\n' +
    images.map((img) => `- [${img.filename}]: ${img.description}`).join('\n')
  );
}

export interface CritiqueInput {
  title: string;
  strengths: string;
  improvements: string;
  direction: string;
  variantCode?: string;
}

export function buildCompilerUserPrompt(
  spec: DesignSpec,
  referenceDesigns?: { name: string; code: string }[],
  critiques?: CritiqueInput[]
): string {
  let prompt = interpolate(TEMPLATE, {
    SPEC_TITLE: spec.title,
    DESIGN_BRIEF: sectionContent(spec, 'design-brief'),
    EXISTING_DESIGN: sectionContent(spec, 'existing-design'),
    RESEARCH_CONTEXT: sectionContent(spec, 'research-context'),
    OBJECTIVES_METRICS: sectionContent(spec, 'objectives-metrics'),
    DESIGN_CONSTRAINTS: sectionContent(spec, 'design-constraints'),
    IMAGE_BLOCK: imageBlock(spec),
  });

  if (referenceDesigns && referenceDesigns.length > 0) {
    prompt += '\n\n## Reference Designs (from previous iterations)\n';
    prompt +=
      'The following designs were generated in a previous iteration. Analyze their strengths and weaknesses, then propose new variant strategies that improve upon them.\n\n';
    for (const ref of referenceDesigns) {
      prompt += `### ${ref.name}\n\`\`\`\n${ref.code}\n\`\`\`\n\n`;
    }
  }

  if (critiques && critiques.length > 0) {
    prompt += '\n\n## Design Critique (from previous iteration)\n';
    prompt +=
      'The designer reviewed previous iterations and provided directed feedback. New variants MUST address these points.\n\n';
    for (const c of critiques) {
      prompt += `### ${c.title || 'Critique'}\n`;
      if (c.strengths.trim()) prompt += `**Strengths (preserve these):** ${c.strengths}\n`;
      if (c.improvements.trim()) prompt += `**Needs improvement:** ${c.improvements}\n`;
      if (c.direction.trim()) prompt += `**Direction for next iteration:** ${c.direction}\n`;
      if (c.variantCode) {
        prompt += `\nReference code being critiqued:\n\`\`\`\n${c.variantCode}\n\`\`\`\n`;
      }
      prompt += '\n';
    }
  }

  return prompt;
}
