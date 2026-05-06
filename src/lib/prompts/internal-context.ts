/**
 * Internal context: a deterministic, lossless assembly of the user's spec
 * sections into one structured string for the Incubator hypothesis-generation
 * prompt. **No LLM call.** Verbatim per-section content wrapped in XML tags
 * so the model sees one coherent context document instead of four scattered
 * variables, while the user's text passes through unchanged.
 *
 * Internal-only: never shown to the user. The previously-shipped LLM
 * synthesis ("Design specification") was retired because it paraphrased
 * the user's intent and corrupted specifics — see plan in
 * `~/.claude/plans/i-want-you-to-curried-eich.md`.
 */
import type { DesignSpec } from '../../types/spec';

type SourceSectionId =
  | 'design-brief'
  | 'research-context'
  | 'objectives-metrics'
  | 'design-constraints';

const SOURCE_SECTION_IDS: readonly SourceSectionId[] = [
  'design-brief',
  'research-context',
  'objectives-metrics',
  'design-constraints',
] as const;

/** XML tag name per source spec section. */
const SECTION_TAG: Record<SourceSectionId, string> = {
  'design-brief': 'design_brief',
  'research-context': 'research_context',
  'objectives-metrics': 'objectives_metrics',
  'design-constraints': 'design_constraints',
};

function appendBlock(lines: string[], tag: string, body: string | undefined): void {
  const trimmed = body?.trim();
  if (!trimmed) return;
  lines.push(`<${tag}>\n${trimmed}\n</${tag}>`);
}

/**
 * Build the internal context document from a spec — deterministic, lossless,
 * no LLM. Empty sections are skipped so the model doesn't see ceremonial
 * empty tags.
 */
export function buildInternalContext(spec: DesignSpec): string {
  const lines: string[] = [];
  if (spec.title?.trim()) {
    lines.push(`<canvas_title>${spec.title.trim()}</canvas_title>`);
  }
  for (const sectionId of SOURCE_SECTION_IDS) {
    appendBlock(lines, SECTION_TAG[sectionId], spec.sections[sectionId]?.content);
  }
  return lines.join('\n\n');
}
