import type { DesignSpec } from '../../types/spec';
import { interpolate } from '../utils';
import { getSectionContent, collectImageLines } from './helpers';
import { getPrompt } from '../../stores/prompt-store';

function imageBlock(spec: DesignSpec): string {
  const lines = collectImageLines(spec);
  if (lines.length === 0) return '';
  return '## Reference Images\n' + lines.join('\n');
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
  let prompt = interpolate(getPrompt('compilerUser'), {
    SPEC_TITLE: spec.title,
    DESIGN_BRIEF: getSectionContent(spec, 'design-brief'),
    EXISTING_DESIGN: getSectionContent(spec, 'existing-design'),
    RESEARCH_CONTEXT: getSectionContent(spec, 'research-context'),
    OBJECTIVES_METRICS: getSectionContent(spec, 'objectives-metrics'),
    DESIGN_CONSTRAINTS: getSectionContent(spec, 'design-constraints'),
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
