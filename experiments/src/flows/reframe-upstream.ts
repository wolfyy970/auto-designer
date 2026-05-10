/**
 * Variant flow — `reframe-upstream`.
 *
 * Adds a single LLM call before any spec-prep that asks the model to recover
 * an opportunity-shaped question from the brief (HMW-shaped). The recovered
 * question is prepended to the brief content as a tagged block, so every
 * downstream stage (research, objectives, constraints, incubator, build,
 * evaluator) sees it as part of the brief without needing a schema change.
 *
 * Tests the recommendation from the conversation that produced this tool:
 * push the reframe upstream where the spec sections are anchored, rather
 * than late-stage in the incubator where every prior stage already orbits
 * the un-reframed brief.
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

export interface ReframeUpstreamInput extends Omit<CanonicalFlowInput, 'designBrief'> {
  designBrief: string;
}

export async function runFlow(input: ReframeUpstreamInput): Promise<CanonicalFlowResult> {
  // Stage 0: produce the reframe block, then mutate brief content for downstream stages.
  const { reframeText, ordinalUsed } = await produceReframe(input);

  const reframedBrief = `<opportunity_reframe>
${reframeText.trim()}
</opportunity_reframe>

${input.designBrief.trim()}`;

  // Delegate to the canonical flow with the augmented brief. Pass through the
  // ordinal we consumed so canonical's first transcript is ordinal+1, keeping
  // filenames chronologically sorted across both stages.
  return runCanonical({
    ...input,
    designBrief: reframedBrief,
    initialOrdinal: ordinalUsed,
    flowNameOverride: 'reframe-upstream',
  });
}

async function produceReframe(
  input: ReframeUpstreamInput,
): Promise<{ reframeText: string; ordinalUsed: number }> {
  const ctx = createStageContext({
    runDir: input.runDir,
    providerId: input.providerId,
    modelId: input.modelId,
    cost: input.cost,
    signal: input.signal,
    dryRun: input.dryRun,
  });

  // Reframe goes through `runTaskAgentPiSession` (same as every other stage)
  // rather than the prior direct `provider.generateChat` path. This buys the
  // full cycle-15 reliability stack — stream-idle watchdog (45s), stage
  // timeout, paired diagnostic logs — that the non-streaming direct path
  // doesn't get. Cycle 19 saw direct generateChat consistently exceed 90s on
  // the habit-tracker brief even with no concurrent load; the streaming Pi
  // path doesn't have that problem because the watchdog catches actual
  // stream-stalls in 45s and lets healthy slow-but-streaming calls run.
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
      title: 'Stage 0 — opportunity reframe',
      sessionType: 'inputs-gen',
      userPrompt,
      systemPromptDescription: '(assembled by runTaskAgentPiSession)',
      timeoutMs: STAGE_TIMEOUT_MS.inputsGen,
      timeoutLabel: 'reframe-upstream',
      dryRunPlaceholder:
        'Question: (dry-run placeholder — recovered opportunity question)\nWhy: (dry-run placeholder — anchoring rationale)',
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
      const text = extractResultFile(sessionResult.files, 'result.txt', 'reframe-upstream');
      if (!text) throw new Error('Reframe session did not write result.txt.');
      return text;
    },
  );

  return { reframeText: result, ordinalUsed: ctx.ordinal.value };
}
