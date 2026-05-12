/**
 * Drift test for the inline guidance constants in
 * `experiments/src/flows/ideation.ts`.
 *
 * Cycle 26 added a product-shape gate at the curation stage with the
 * guidance text living in two places:
 *
 *   1. The production prompt at
 *      `packages/auto-designer-pi/prompts/gen-curation.md` (read by the
 *      canvas product at runtime via the prompt resolver).
 *   2. The inline `CURATION_GUIDANCE` constant in
 *      `experiments/src/flows/ideation.ts` (used by the experiments
 *      tool's `ideation` flow, which assembles its own user prompt
 *      rather than reading from the resolver).
 *
 * If these drift, the experiments tool validates a different gate than
 * the canvas product runs — meaning a successful cycle-26-style
 * batch can mislead us about production behavior. The cycle-27
 * switch-reason work could not have surfaced that drift; only the
 * curation transcripts would have, after the fact.
 *
 * This test reads both sources and asserts the substantive text
 * inside the `<wild_ideation_guidance>` and `<curation_guidance>`
 * XML blocks is byte-for-byte identical between the production
 * prompt files and the inline constants.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');

const IDEATION_FILE = join(REPO_ROOT, 'experiments', 'src', 'flows', 'ideation.ts');
const BRAINSTORM_PROMPT = join(
  REPO_ROOT,
  'packages',
  'auto-designer-pi',
  'prompts',
  'gen-brainstorm.md',
);
const CURATION_PROMPT = join(
  REPO_ROOT,
  'packages',
  'auto-designer-pi',
  'prompts',
  'gen-curation.md',
);

/**
 * Extract the body of an XML-tagged block from arbitrary text.
 *
 * Used for both the production prompt files (where the block is
 * embedded in markdown) and the inline TypeScript constants (where
 * the block is the body of a template literal). The body is the
 * content between the opening and closing tags, trimmed of leading
 * and trailing whitespace.
 *
 * Returns `null` if the tag isn't found, which fails the test with
 * a clear error rather than a misleading equality assertion.
 */
function extractTagBody(text: string, tagName: string): string | null {
  const open = `<${tagName}>`;
  const close = `</${tagName}>`;
  const start = text.indexOf(open);
  if (start === -1) return null;
  const after = start + open.length;
  const end = text.indexOf(close, after);
  if (end === -1) return null;
  return text.slice(after, end).trim();
}

/**
 * Normalize a string extracted from a TypeScript template literal so
 * its content can be compared against the equivalent markdown text.
 *
 * Inside a template literal, backticks are escaped as `\\\``, which is
 * a TypeScript-syntax artifact, not a semantic difference in the
 * prompt content the model sees at runtime. We unescape so the test
 * compares the prompt-as-seen-by-the-model, not the source-code
 * representation.
 *
 * No other escape sequences are normalized — if a real semantic
 * difference exists, the test should still fail.
 */
function unescapeTsTemplateLiteral(text: string): string {
  return text.replace(/\\`/g, '`');
}

describe('ideation.ts inline guidance constants mirror production prompts', () => {
  it('BRAINSTORM_GUIDANCE matches the <wild_ideation_guidance> block in gen-brainstorm.md', () => {
    const ideationSource = readFileSync(IDEATION_FILE, 'utf8');
    const promptSource = readFileSync(BRAINSTORM_PROMPT, 'utf8');

    const inlineBody = extractTagBody(ideationSource, 'wild_ideation_guidance');
    const promptBody = extractTagBody(promptSource, 'wild_ideation_guidance');

    expect(inlineBody).not.toBeNull();
    expect(promptBody).not.toBeNull();
    expect(unescapeTsTemplateLiteral(inlineBody!)).toBe(promptBody);
  });

  it('CURATION_GUIDANCE matches the <curation_guidance> block in gen-curation.md', () => {
    const ideationSource = readFileSync(IDEATION_FILE, 'utf8');
    const promptSource = readFileSync(CURATION_PROMPT, 'utf8');

    const inlineBody = extractTagBody(ideationSource, 'curation_guidance');
    const promptBody = extractTagBody(promptSource, 'curation_guidance');

    expect(inlineBody).not.toBeNull();
    expect(promptBody).not.toBeNull();
    expect(unescapeTsTemplateLiteral(inlineBody!)).toBe(promptBody);
  });
});
