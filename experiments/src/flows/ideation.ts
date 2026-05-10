/**
 * Default flow — `ideation` (introduced cycle 11 as `wild-ideation`,
 * renamed to `ideation` cycle 17 once it became the documented default).
 *
 * The classical UX divergent → convergent design pattern as two distinct
 * stages before the canonical pipeline:
 *
 *   Stage 0a (divergent): brainstorm — produce 10-15 categorically
 *     different product directions, including extreme/strange/improbable.
 *     Explicit anti-censorship: the wilder the better. Selection comes
 *     later. The job here is to stretch imagination, not filter it.
 *
 *   Stage 0b (convergent): curation — pick 5 directions from the 10-15 that
 *     span the WIDEST range across the solution space. Explicit instruction:
 *     this is NOT picking the most plausible 5, it's picking the 5 that
 *     together occupy the most distinct points across product kinds.
 *
 *   Stage 1+ (canonical): inputs-gen → incubator → build. The curated 5
 *     directions are stitched into the brief content as a tagged
 *     `<product_shape_candidates>` block (same pattern as `ideation-first`).
 *     Because the pool is already exactly 5 spread-spanning directions, the
 *     incubator's pick-N-from-larger-pool conservatism (observed in cycles 9
 *     and 10) cannot drop the wildest bets — they're all the bets.
 *
 * Splits brainstorm from selection and explicitly instructs each stage,
 * which validated on both high-gravity and low-gravity briefs (cycles 11,
 * 12, 15) as producing wider, wilder hypothesis corpora than the
 * implicit-selection-by-the-incubator pattern of `ideation-first`.
 */
import { randomUUID } from 'node:crypto';
import { runTaskAgentPiSession } from '../../../server/services/task-agent-session.ts';
import { runFlow as runCanonical, type CanonicalFlowInput, type CanonicalFlowResult } from './canonical.ts';
import { createStageContext, extractResultFile, runStageWithTranscript, STAGE_TIMEOUT_MS } from '../flow.ts';

// XML tag and semantic prose preserved verbatim from the cycle-11 prompt
// that validated this flow's behavior (the rename in cycle 17 did not alter
// the prompt text the model sees, only host-side identifiers).
const BRAINSTORM_GUIDANCE = `<wild_ideation_guidance>
This is the divergent brainstorm phase. List 10-15 categorically different product directions that could answer the design brief.

Push toward the edges. Include directions that initially seem strange, improbable, or hard to build — those are valuable in this phase. Cover obvious centers AND extreme territories. Do not pre-filter for plausibility; that's a different phase. The wilder the better — five conventional directions are worth less than three conventional plus three wild ones.

For each direction: a short name (3-5 words) and one sentence describing what kind of product it is. No features, no measurements, no commitments — just the direction.
</wild_ideation_guidance>`;

const CURATION_GUIDANCE = `<curation_guidance>
You are picking exactly 5 of the directions listed in the input to commit to as the final exploration set. Your job is NOT to pick the most plausible 5. Your job is to pick the 5 that, taken together, occupy the WIDEST span across the solution space — the 5 that include the wildest viable bets, not just the safest ones. A spread of five conventional directions is a worse outcome than a spread that includes one or two strange but distinctive bets.

For each picked direction: copy its name and one-sentence shape description into the output. Maintain the same markdown structure (## header per direction, then one sentence). At the end, add a one-paragraph "Spread rationale" explaining the spread you chose and what was deliberately included or excluded to achieve it.
</curation_guidance>`;

export interface IdeationInput extends Omit<CanonicalFlowInput, 'designBrief'> {
  designBrief: string;
}

export async function runFlow(input: IdeationInput): Promise<CanonicalFlowResult> {
  // Stage 0a: divergent brainstorm
  const { brainstormText, ordinalAfterIdeation } = await runBrainstorm(input);

  // Stage 0b: convergent curation — picks 5 from the brainstorm pool with maximum spread
  const { curatedText, ordinalAfterCuration } = await runCuration(input, brainstormText, ordinalAfterIdeation);

  // The curated 5 directions get stitched into the brief content as
  // <product_shape_candidates>. Same pattern ideation-first uses, but the
  // pool is already exactly 5 spread-spanning directions — no
  // pick-N-from-larger-pool step downstream where the incubator could drop
  // the wildest bets.
  const augmentedBrief = `${input.designBrief.trim()}

<product_shape_candidates>
${curatedText.trim()}
</product_shape_candidates>`;

  return runCanonical({
    ...input,
    designBrief: augmentedBrief,
    initialOrdinal: ordinalAfterCuration,
    flowNameOverride: 'ideation',
  });
}

async function runBrainstorm(
  input: IdeationInput,
): Promise<{ brainstormText: string; ordinalAfterIdeation: number }> {
  const ctx = createStageContext({
    runDir: input.runDir,
    providerId: input.providerId,
    modelId: input.modelId,
    cost: input.cost,
    signal: input.signal,
    dryRun: input.dryRun,
  });

  const userPrompt = `<task>
This is the divergent brainstorm phase before commitment. List 10-15 categorically different product directions that could answer the design brief below.

Write the result as markdown to \`result.md\` in the workspace root.
Use a header per direction (## <name>) followed by one sentence describing what kind of product it is.

The wilder the better — include directions that initially seem strange, improbable, or hard to build. Selection comes later, not now.
</task>

${BRAINSTORM_GUIDANCE}

<brief>
${input.designBrief.trim()}
</brief>`;

  const { result } = await runStageWithTranscript<string>(
    ctx,
    {
      slug: 'brainstorm',
      title: 'Stage 0a — brainstorm (divergent, no censorship)',
      sessionType: 'inputs-gen',
      userPrompt,
      systemPromptDescription: '(assembled by runTaskAgentPiSession)',
      timeoutMs: STAGE_TIMEOUT_MS.inputsGen,
      timeoutLabel: 'brainstorm',
      dryRunPlaceholder: '## Direction 1: (dry-run)\n_placeholder_',
      formatResponse: (text) => text,
    },
    async (signal) => {
      const { sessionResult } = await runTaskAgentPiSession(
        {
          userPrompt,
          providerId: input.providerId,
          modelId: input.modelId,
          sessionType: 'inputs-gen',
          signal,
          correlationId: randomUUID(),
          initialProgressMessage: 'Brainstorming wild directions…',
        },
        async () => {},
      );
      if (!sessionResult) throw new Error('Wild brainstorm session returned no result.');
      const text = extractResultFile(sessionResult.files, 'result.md', 'brainstorm');
      if (!text) throw new Error('Wild brainstorm session did not write result.md.');
      return text;
    },
  );

  return { brainstormText: result, ordinalAfterIdeation: ctx.ordinal.value };
}

async function runCuration(
  input: IdeationInput,
  brainstormText: string,
  prevOrdinal: number,
): Promise<{ curatedText: string; ordinalAfterCuration: number }> {
  const ctx = createStageContext({
    runDir: input.runDir,
    providerId: input.providerId,
    modelId: input.modelId,
    cost: input.cost,
    signal: input.signal,
    dryRun: input.dryRun,
  });
  ctx.ordinal.value = prevOrdinal;

  const userPrompt = `<task>
The brainstorm phase produced 10-15 categorically different product directions. Now you are converging — picking exactly 5 of them that together occupy the WIDEST span across the solution space.

Write the result as markdown to \`result.md\` in the workspace root. Output:
1. The 5 picked directions, each with its original name as a ## header followed by its one-sentence shape description (copy from the input).
2. After the 5 directions, add a "## Spread rationale" section with one paragraph explaining the spread you chose — what was deliberately included or excluded to achieve maximum coverage of distinct product kinds.

Pick for spread, not plausibility. A safer set of 5 conventional directions is the wrong outcome.
</task>

${CURATION_GUIDANCE}

<brainstorm_directions>
${brainstormText.trim()}
</brainstorm_directions>`;

  const { result } = await runStageWithTranscript<string>(
    ctx,
    {
      slug: 'curation',
      title: 'Stage 0b — curation (convergent, max spread not max plausibility)',
      sessionType: 'inputs-gen',
      userPrompt,
      systemPromptDescription: '(assembled by runTaskAgentPiSession)',
      timeoutMs: STAGE_TIMEOUT_MS.inputsGen,
      timeoutLabel: 'curation',
      dryRunPlaceholder: '## Direction 1: (dry-run)\n_placeholder_',
      formatResponse: (text) => text,
    },
    async (signal) => {
      const { sessionResult } = await runTaskAgentPiSession(
        {
          userPrompt,
          providerId: input.providerId,
          modelId: input.modelId,
          sessionType: 'inputs-gen',
          signal,
          correlationId: randomUUID(),
          initialProgressMessage: 'Curating for maximum spread…',
        },
        async () => {},
      );
      if (!sessionResult) throw new Error('Curation session returned no result.');
      const text = extractResultFile(sessionResult.files, 'result.md', 'curation');
      if (!text) throw new Error('Curation session did not write result.md.');
      return text;
    },
  );

  return { curatedText: result, ordinalAfterCuration: ctx.ordinal.value };
}
