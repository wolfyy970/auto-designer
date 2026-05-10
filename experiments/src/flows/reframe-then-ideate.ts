/**
 * Variant flow — `reframe-then-ideate` (composition test for cycle 21+).
 *
 * Adds the cycle-19 `reframe-upstream` stage in front of the cycle-11
 * `ideation` flow (brainstorm + curation), then delegates to the canonical
 * pipeline. The hypothesis we're testing: cycle 19 found `reframe-upstream`
 * underpowered as a standalone flow — its recovered HMW question often
 * restates the prescription rather than recovering an underlying
 * opportunity. The brainstorm + spread-curation is what actually breaks
 * prescription-grip. This composition asks whether **the brainstorm sees
 * the recovered question** as part of the brief context, producing wider
 * spread than either flow alone.
 *
 * Stages:
 *   0a — reframe (recover HMW question, prepend to brief as `<opportunity_reframe>`)
 *   0b — brainstorm (15 wild directions; sees the reframed brief)
 *   0c — curation (5 picks for max spread)
 *   1+ — canonical (inputs-gen → incubator → optional build)
 */
import { randomUUID } from 'node:crypto';
import { runTaskAgentPiSession } from '../../../server/services/task-agent-session.ts';
import { runFlow as runCanonical, type CanonicalFlowInput, type CanonicalFlowResult } from './canonical.ts';
import { createStageContext, extractResultFile, runStageWithTranscript, STAGE_TIMEOUT_MS } from '../flow.ts';

const REFRAME_GUIDANCE = `<reframe_guidance>
You are a senior UX strategist. Inspect the brief and surface the underlying opportunity-shaped question it implies — a "How might we" framing, not a closed prescription.

If the brief reads like a problem statement, restate the opportunity it implies in one sentence.

If the brief reads like a prescribed solution ("redesign X to be faster", "add a Y feature"), recover the question underneath the solution: what would success look like that doesn't presuppose this particular fix?

Output ONLY the recovered question and a one-sentence rationale. No preamble, no markdown headers, no meta commentary.

Format:
Question: <one sentence opportunity-shaped question>
Why: <one sentence anchoring this question to what the brief actually states>
</reframe_guidance>`;

// XML tag preserved from cycle 11 onward — same prompt body as `ideation.ts`.
const BRAINSTORM_GUIDANCE = `<wild_ideation_guidance>
This is the divergent brainstorm phase. List 10-15 categorically different product directions that could answer the design brief.

Push toward the edges. Include directions that initially seem strange, improbable, or hard to build — those are valuable in this phase. Cover obvious centers AND extreme territories. Do not pre-filter for plausibility; that's a different phase. The wilder the better — five conventional directions are worth less than three conventional plus three wild ones.

For each direction: a short name (3-5 words) and one sentence describing what kind of product it is. No features, no measurements, no commitments — just the direction.
</wild_ideation_guidance>`;

const CURATION_GUIDANCE = `<curation_guidance>
You are picking exactly 5 of the directions listed in the input to commit to as the final exploration set. Your job is NOT to pick the most plausible 5. Your job is to pick the 5 that, taken together, occupy the WIDEST span across the solution space — the 5 that include the wildest viable bets, not just the safest ones. A spread of five conventional directions is a worse outcome than a spread that includes one or two strange but distinctive bets.

For each picked direction: copy its name and one-sentence shape description into the output. Maintain the same markdown structure (## header per direction, then one sentence). At the end, add a one-paragraph "Spread rationale" explaining the spread you chose and what was deliberately included or excluded to achieve it.
</curation_guidance>`;

export interface ReframeThenIdeateInput extends Omit<CanonicalFlowInput, 'designBrief'> {
  designBrief: string;
}

export async function runFlow(input: ReframeThenIdeateInput): Promise<CanonicalFlowResult> {
  // Stage 0a: reframe — recover opportunity question.
  const { reframeText, ordinalAfterReframe } = await runReframe(input);

  // Brief gets the opportunity_reframe block prepended so the brainstorm sees
  // it as part of brief context (and so do all downstream stages).
  const reframedBrief = `<opportunity_reframe>
${reframeText.trim()}
</opportunity_reframe>

${input.designBrief.trim()}`;

  // Stage 0b: brainstorm — wild divergent against the reframed brief.
  const { brainstormText, ordinalAfterBrainstorm } = await runBrainstorm(
    { ...input, designBrief: reframedBrief },
    ordinalAfterReframe,
  );

  // Stage 0c: curation — pick 5 with max spread from the brainstorm pool.
  const { curatedText, ordinalAfterCuration } = await runCuration(
    input,
    brainstormText,
    ordinalAfterBrainstorm,
  );

  // Stitch both reframe and curated picks into the brief content.
  const augmentedBrief = `<opportunity_reframe>
${reframeText.trim()}
</opportunity_reframe>

${input.designBrief.trim()}

<product_shape_candidates>
${curatedText.trim()}
</product_shape_candidates>`;

  return runCanonical({
    ...input,
    designBrief: augmentedBrief,
    initialOrdinal: ordinalAfterCuration,
    flowNameOverride: 'reframe-then-ideate',
  });
}

async function runReframe(
  input: ReframeThenIdeateInput,
): Promise<{ reframeText: string; ordinalAfterReframe: number }> {
  const ctx = createStageContext({
    runDir: input.runDir,
    providerId: input.providerId,
    modelId: input.modelId,
    cost: input.cost,
    signal: input.signal,
    dryRun: input.dryRun,
  });

  const userPrompt = `<task>
Recover the opportunity-shaped question from the design brief below.

Write the result as plain text to \`result.txt\` in the workspace root.
The output should be exactly two lines, no preamble or markdown:
- Line 1: \`Question: <one sentence opportunity-shaped question>\`
- Line 2: \`Why: <one sentence anchoring this question to what the brief actually states>\`
</task>

${REFRAME_GUIDANCE}

<brief>
${input.designBrief.trim()}
</brief>`;

  const { result } = await runStageWithTranscript<string>(
    ctx,
    {
      slug: 'reframe',
      title: 'Stage 0a — opportunity reframe',
      sessionType: 'inputs-gen',
      userPrompt,
      systemPromptDescription: '(assembled by runTaskAgentPiSession)',
      timeoutMs: STAGE_TIMEOUT_MS.inputsGen,
      timeoutLabel: 'reframe-then-ideate.reframe',
      dryRunPlaceholder:
        'Question: (dry-run placeholder)\nWhy: (dry-run placeholder)',
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
          initialProgressMessage: 'Recovering opportunity question…',
        },
        async () => {},
      );
      if (!sessionResult) throw new Error('Reframe session returned no result.');
      const text = extractResultFile(sessionResult.files, 'result.txt', 'reframe-then-ideate.reframe');
      if (!text) throw new Error('Reframe session did not write result.txt.');
      return text;
    },
  );

  return { reframeText: result, ordinalAfterReframe: ctx.ordinal.value };
}

async function runBrainstorm(
  input: ReframeThenIdeateInput,
  prevOrdinal: number,
): Promise<{ brainstormText: string; ordinalAfterBrainstorm: number }> {
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
This is the divergent brainstorm phase before commitment. List 10-15 categorically different product directions that could answer the design brief below.

Write the result as markdown to \`result.md\` in the workspace root.
Use a header per direction (## <name>) followed by one sentence describing what kind of product it is.

The wilder the better — include directions that initially seem strange, improbable, or hard to build. Selection comes later, not now. Note the recovered opportunity question at the top of the brief — let it stretch your thinking, not constrain it.
</task>

${BRAINSTORM_GUIDANCE}

<brief>
${input.designBrief.trim()}
</brief>`;

  const { result } = await runStageWithTranscript<string>(
    ctx,
    {
      slug: 'brainstorm',
      title: 'Stage 0b — brainstorm (after reframe; divergent, no censorship)',
      sessionType: 'inputs-gen',
      userPrompt,
      systemPromptDescription: '(assembled by runTaskAgentPiSession)',
      timeoutMs: STAGE_TIMEOUT_MS.inputsGen,
      timeoutLabel: 'reframe-then-ideate.brainstorm',
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
          initialProgressMessage: 'Brainstorming wild directions (against reframe)…',
        },
        async () => {},
      );
      if (!sessionResult) throw new Error('Brainstorm session returned no result.');
      const text = extractResultFile(sessionResult.files, 'result.md', 'reframe-then-ideate.brainstorm');
      if (!text) throw new Error('Brainstorm session did not write result.md.');
      return text;
    },
  );

  return { brainstormText: result, ordinalAfterBrainstorm: ctx.ordinal.value };
}

async function runCuration(
  input: ReframeThenIdeateInput,
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
      title: 'Stage 0c — curation (convergent, max spread not max plausibility)',
      sessionType: 'inputs-gen',
      userPrompt,
      systemPromptDescription: '(assembled by runTaskAgentPiSession)',
      timeoutMs: STAGE_TIMEOUT_MS.inputsGen,
      timeoutLabel: 'reframe-then-ideate.curation',
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
      const text = extractResultFile(sessionResult.files, 'result.md', 'reframe-then-ideate.curation');
      if (!text) throw new Error('Curation session did not write result.md.');
      return text;
    },
  );

  return { curatedText: result, ordinalAfterCuration: ctx.ordinal.value };
}
