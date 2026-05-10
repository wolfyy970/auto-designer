/**
 * Variant flow — `ideation-first`.
 *
 * Inserts an explicit ideation stage before the canonical pipeline. The
 * ideation stage produces 8-12 categorically different product directions
 * for the brief — not commitments yet, just exploration of the solution
 * space. Those directions are appended to the brief content as a tagged
 * block, so every downstream stage (research, objectives, constraints,
 * incubator, build, evaluator) sees them as part of the brief context.
 *
 * The canonical chain is then: brainstorm (this stage) → spec prep →
 * commit to bets (incubator) → build → evaluate. Separates "what kinds
 * of products could answer this" from "which 5 do we commit to," which
 * the classical design-thinking chain treats as separate phases.
 *
 * The hypothesis being tested: when commitment happens within an
 * explicit pre-pool of categorically different shapes, the incubator's
 * 5 commitments span more shapes than when commitment happens directly
 * from the spec. Tests whether the recurring-archetype clustering on
 * high-gravity briefs (e.g., grief) responds to flow shape rather than
 * prompt mass.
 */
import { randomUUID } from 'node:crypto';
import { runTaskAgentPiSession } from '../../../server/services/task-agent-session.ts';
import { runFlow as runCanonical, type CanonicalFlowInput, type CanonicalFlowResult } from './canonical.ts';
import { createStageContext, extractResultFile, runStageWithTranscript, STAGE_TIMEOUT_MS } from '../flow.ts';

const IDEATION_GUIDANCE = `<ideation_guidance>
You are listing categorically different product directions that could answer this design brief — the brainstorm phase before commitment. Produce 8-12 distinct directions. Each direction must name a different kind of product — products described with different sentences about what they ARE, not different adjectives on a shared product. Stretch toward the edges; cover obvious centers and unexpected territories.

For each direction: a short name (3-5 words) and one sentence describing what kind of product it is. Use markdown headers and short prose. No features, no measurements, no competitors — exploration, not commitment.
</ideation_guidance>`;

export interface IdeationFirstInput extends Omit<CanonicalFlowInput, 'designBrief'> {
  designBrief: string;
}

export async function runFlow(input: IdeationFirstInput): Promise<CanonicalFlowResult> {
  // Stage 0: produce the ideation block, then append to brief for downstream stages.
  const { ideationText, ordinalUsed } = await produceIdeation(input);

  const augmentedBrief = `${input.designBrief.trim()}

<product_shape_candidates>
${ideationText.trim()}
</product_shape_candidates>`;

  // Delegate to canonical with the augmented brief. The ideation block becomes
  // part of the brief content — propagates through every downstream stage.
  return runCanonical({
    ...input,
    designBrief: augmentedBrief,
    initialOrdinal: ordinalUsed,
    flowNameOverride: 'ideation-first',
  });
}

async function produceIdeation(
  input: IdeationFirstInput,
): Promise<{ ideationText: string; ordinalUsed: number }> {
  const ctx = createStageContext({
    runDir: input.runDir,
    providerId: input.providerId,
    modelId: input.modelId,
    cost: input.cost,
    signal: input.signal,
    dryRun: input.dryRun,
  });

  // Pi session-style task wrapper: write directions to result.md so the agent
  // commits its output to a file rather than relying on streaming text. This
  // pattern works reliably with minimax/m2.5 where direct generateChat does not.
  const userPrompt = `<task>
List 8-12 categorically different product directions that could answer the design brief below.

Write the result as markdown to \`result.md\` in the workspace root.
Use a header per direction with name + one-sentence shape description, like:

## <Direction name>
<one sentence about what kind of product this is>

No features, no measurements, no competitors — exploration only.
</task>

${IDEATION_GUIDANCE}

<brief>
${input.designBrief.trim()}
</brief>`;

  const { result } = await runStageWithTranscript<string>(
    ctx,
    {
      slug: 'ideation',
      title: 'Stage 0 — ideation (categorically different product directions)',
      sessionType: 'inputs-gen',
      userPrompt,
      systemPromptDescription: '(assembled by runTaskAgentPiSession)',
      timeoutMs: STAGE_TIMEOUT_MS.inputsGen,
      timeoutLabel: 'ideation',
      dryRunPlaceholder:
        '## Direction 1: (dry-run placeholder)\n_No ideation text in dry-run mode._',
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
          initialProgressMessage: 'Brainstorming product directions…',
        },
        async () => {},
      );
      if (!sessionResult) throw new Error('Ideation session returned no result.');
      const text = extractResultFile(sessionResult.files, 'result.md', 'ideation');
      if (!text) throw new Error('Ideation session did not write result.md.');
      return text;
    },
  );

  return { ideationText: result, ordinalUsed: ctx.ordinal.value };
}
