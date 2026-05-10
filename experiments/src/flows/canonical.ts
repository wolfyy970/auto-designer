/**
 * Canonical flow — high-fidelity reproduction of the production pipeline.
 *
 * Stage 1 (inputs-gen, only for missing sections) → Stage 2 (incubator) →
 * Stage 3 (per-hypothesis design build) → Stage 4 (per-hypothesis evaluation).
 *
 * Errors in Stage 3/4 for one hypothesis do not abort the run — they're
 * recorded and the next hypothesis proceeds. That mirrors the user-facing
 * canvas behavior where one bad lane doesn't kill the others.
 */
import { join } from 'node:path';
import type { DesignSpec } from '../../../src/types/spec.ts';
import type { HypothesisStrategy } from '../../../src/types/incubator.ts';
import type { EvaluatorWorkerReport, EvaluatorRubricId } from '../../../src/types/evaluation.ts';
import type { InputsGenerateTargetSpecId } from '../../../src/lib/prompts/inputs-generate.ts';
import { generateId, now } from '../../../src/lib/utils.ts';
import { getProvider } from '../../../server/services/providers/registry.ts';
import {
  createStageContext,
  evalContextFor,
  runDesignBuild,
  runEvaluation,
  runHonestyCheck,
  runIncubator,
  runInputsGen,
  writeSectionSourceTranscript,
  type EvaluationReports,
  type StageContext,
} from '../flow.ts';
import type { RunDir } from '../runDir.ts';
import { writeJson, writeText } from '../runDir.ts';
import type { CostTracker } from '../cost.ts';
import { writeSummary, type PerHypothesisSummary, type SectionOutput } from '../summary.ts';
import { writePreview } from '../preview.ts';

export interface CanonicalFlowInput {
  runDir: RunDir;
  briefId: string;
  designBrief: string;
  providerId: string;
  modelId: string;
  evaluatorProviderId?: string;
  evaluatorModelId?: string;
  hypothesisCount?: number;
  /** Optional pre-existing spec sections; missing sections will be auto-generated. */
  researchContext?: string;
  objectivesMetrics?: string;
  designConstraints?: string;
  designSystem?: string;
  /** Source paths for user-supplied sections (informational; surfaced in transcripts). */
  researchContextSource?: string;
  objectivesMetricsSource?: string;
  designConstraintsSource?: string;
  designSystemSource?: string;
  /**
   * Sections to forcibly regenerate even when user-supplied. The supplied
   * content (when present) flows into the prompt as `<current_input_draft>`,
   * a starting point the model is asked to revise.
   */
  regenInputs?: ReadonlySet<InputsGenerateTargetSpecId>;
  cost: CostTracker;
  signal?: AbortSignal;
  dryRun: boolean;
  /** When true, run evaluator for each successful build. */
  evaluate?: boolean;
  /**
   * When false, skip stage 3 design build entirely (and dependent stages:
   * evaluation, honesty-check). Used by matrix experiments that study
   * upstream stages (brainstorm / curation / inputs-gen / incubator) at
   * scale — builds are the slow phase, so excluding them lets us collect
   * 5-10× more data per hour at the same provider load. Defaults to true.
   */
  build?: boolean;
  /**
   * When this flow is called from a wrapping variant that already wrote
   * earlier transcripts, start the ordinal counter here so filenames keep
   * sorting chronologically across both. Defaults to 0.
   */
  initialOrdinal?: number;
  /**
   * When called from a wrapping variant, the variant's name so config/summary
   * record it correctly instead of the inner `canonical`. Defaults to canonical.
   */
  flowNameOverride?: string;
}

export interface CanonicalFlowResult {
  spec: DesignSpec;
  hypotheses: PerHypothesisSummary[];
  fatalError?: string;
}

const DEFAULT_flowName = 'canonical';

export async function runFlow(input: CanonicalFlowInput): Promise<CanonicalFlowResult> {
  const flowName = input.flowNameOverride ?? DEFAULT_flowName;
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const ctx: StageContext = createStageContext({
    runDir: input.runDir,
    providerId: input.providerId,
    modelId: input.modelId,
    cost: input.cost,
    signal: input.signal,
    dryRun: input.dryRun,
  });
  if (input.initialOrdinal != null) ctx.ordinal.value = input.initialOrdinal;

  const notes: string[] = [];
  let fatalError: string | undefined;
  const perHypothesis: PerHypothesisSummary[] = [];
  let researchContext = input.researchContext?.trim() ?? '';
  let objectivesMetrics = input.objectivesMetrics?.trim() ?? '';
  let designConstraints = input.designConstraints?.trim() ?? '';
  const regen = input.regenInputs ?? new Set<InputsGenerateTargetSpecId>();
  const sectionSources: Record<InputsGenerateTargetSpecId, SectionOutput['source']> = {
    'research-context': 'generated',
    'objectives-metrics': 'generated',
    'design-constraints': 'generated',
  };

  // ── Stage 1: source or generate each spec section ──────────────────
  try {
    // research-context
    {
      const userSupplied = researchContext.length > 0;
      const needsGen = !userSupplied || regen.has('research-context');
      if (needsGen) {
        const out = await runInputsGen(ctx, {
          target: 'research-context',
          designBrief: input.designBrief,
          // User content flows into the prompt as <current_input_draft> when
          // target === 'research-context'. The production prompt builder
          // omits the sibling block in that case.
          researchContext: userSupplied ? researchContext : undefined,
        });
        researchContext = out.text || researchContext;
        sectionSources['research-context'] = userSupplied ? 'regenerated' : 'generated';
        notes.push(
          userSupplied
            ? 'Regenerated research-context (user draft passed in as <current_input_draft>).'
            : 'Generated research-context (was empty in input).',
        );
      } else {
        writeSectionSourceTranscript(ctx, {
          section: 'research-context',
          sourcePath: input.researchContextSource,
          content: researchContext,
        });
        sectionSources['research-context'] = 'user-supplied';
        notes.push(
          `User-supplied research-context${input.researchContextSource ? ` from ${input.researchContextSource}` : ''}.`,
        );
      }
    }
    // objectives-metrics
    {
      const userSupplied = objectivesMetrics.length > 0;
      const needsGen = !userSupplied || regen.has('objectives-metrics');
      if (needsGen) {
        const out = await runInputsGen(ctx, {
          target: 'objectives-metrics',
          designBrief: input.designBrief,
          researchContext,
          objectivesMetrics: userSupplied ? objectivesMetrics : undefined,
        });
        objectivesMetrics = out.text || objectivesMetrics;
        sectionSources['objectives-metrics'] = userSupplied ? 'regenerated' : 'generated';
        notes.push(
          userSupplied
            ? 'Regenerated objectives-metrics (user draft passed in as <current_input_draft>).'
            : 'Generated objectives-metrics (was empty in input).',
        );
      } else {
        writeSectionSourceTranscript(ctx, {
          section: 'objectives-metrics',
          sourcePath: input.objectivesMetricsSource,
          content: objectivesMetrics,
        });
        sectionSources['objectives-metrics'] = 'user-supplied';
        notes.push(
          `User-supplied objectives-metrics${input.objectivesMetricsSource ? ` from ${input.objectivesMetricsSource}` : ''}.`,
        );
      }
    }
    // design-constraints
    {
      const userSupplied = designConstraints.length > 0;
      const needsGen = !userSupplied || regen.has('design-constraints');
      if (needsGen) {
        const out = await runInputsGen(ctx, {
          target: 'design-constraints',
          designBrief: input.designBrief,
          researchContext,
          objectivesMetrics,
          designConstraints: userSupplied ? designConstraints : undefined,
        });
        designConstraints = out.text || designConstraints;
        sectionSources['design-constraints'] = userSupplied ? 'regenerated' : 'generated';
        notes.push(
          userSupplied
            ? 'Regenerated design-constraints (user draft passed in as <current_input_draft>).'
            : 'Generated design-constraints (was empty in input).',
        );
      } else {
        writeSectionSourceTranscript(ctx, {
          section: 'design-constraints',
          sourcePath: input.designConstraintsSource,
          content: designConstraints,
        });
        sectionSources['design-constraints'] = 'user-supplied';
        notes.push(
          `User-supplied design-constraints${input.designConstraintsSource ? ` from ${input.designConstraintsSource}` : ''}.`,
        );
      }
    }
  } catch (err) {
    fatalError = err instanceof Error ? err.message : String(err);
  }

  const spec = assembleSpec({
    briefId: input.briefId,
    designBrief: input.designBrief,
    researchContext: researchContext ?? '',
    objectivesMetrics: objectivesMetrics ?? '',
    designConstraints: designConstraints ?? '',
    designSystem: input.designSystem,
  });
  writeText(input.runDir.spec, renderSpecBlock(spec));

  // ── Stage 2: incubator ─────────────────────────────────────────────
  let plan = undefined;
  if (!fatalError) {
    try {
      const out = await runIncubator(ctx, { spec, count: input.hypothesisCount });
      plan = out.plan;
      writeJson(input.runDir.hypotheses, plan);
    } catch (err) {
      fatalError = err instanceof Error ? err.message : String(err);
    }
  }

  // ── Stage 3+4: per hypothesis (parallel when provider supports it) ──
  const hypotheses: HypothesisStrategy[] = plan?.hypotheses ?? [];
  const evaluate = input.evaluate ?? true;
  const build = input.build ?? true;

  // OpenRouter is parallel-safe; LM Studio is sequential (returns 500 on
  // concurrent requests). Mirror the canvas's per-provider behavior.
  const provider = getProvider(input.providerId);
  const supportsParallel = provider?.supportsParallel ?? false;

  // Run one hypothesis (build + optional eval), returning its summary. Errors
  // are caught per-hypothesis so one failed lane doesn't kill the others.
  const runOneHypothesis = async (hypothesis: HypothesisStrategy): Promise<PerHypothesisSummary> => {
    const summary: PerHypothesisSummary = {
      hypothesisId: hypothesis.id,
      name: hypothesis.name,
      artifactsDir: join('artifacts', hypothesis.id),
    };
    try {
      const buildOut = await runDesignBuild(ctx, {
        spec,
        hypothesis,
        dimensions: plan?.dimensions ?? [],
        designSystem: input.designSystem,
      });

      // Stage 3.5 — post-build honesty check. Catches hand-waving in
      // bet-critical paths that the cycle-14 prompt rule misses on
      // permission-gated functionality (cycle-19 evidence: 13 hits across 4
      // diverse-domain corpora). Failures here don't invalidate the build —
      // honesty check is a critique tool, not a build gate, so we record
      // the error in summary.honestyError and continue.
      if (!ctx.dryRun && Object.keys(buildOut.files).length > 0) {
        try {
          const honesty = await runHonestyCheck(ctx, {
            hypothesis,
            files: buildOut.files,
          });
          summary.honesty = honesty.verdict;
        } catch (err) {
          summary.honestyError = err instanceof Error ? err.message : String(err);
        }
      }

      if (evaluate && !ctx.dryRun && Object.keys(buildOut.files).length > 0) {
        const evalOut = await runEvaluation(ctx, {
          files: buildOut.files,
          compiledPrompt: buildOut.compiledPrompt,
          context: evalContextFor({ spec, hypothesis, designSystemSnapshot: input.designSystem }),
          evaluatorProviderId: input.evaluatorProviderId,
          evaluatorModelId: input.evaluatorModelId,
        });
        const reports = pluckReports(evalOut.reports);
        summary.reports = reports;
        const evalsRel = `evals/${hypothesis.id}.json`;
        writeJson(join(input.runDir.root, evalsRel), reports);
        summary.evalsPath = evalsRel;
      } else if (ctx.dryRun) {
        // Run dry-run eval to populate transcripts only.
        await runEvaluation(ctx, {
          files: buildOut.files,
          compiledPrompt: buildOut.compiledPrompt,
          context: evalContextFor({ spec, hypothesis, designSystemSnapshot: input.designSystem }),
          evaluatorProviderId: input.evaluatorProviderId,
          evaluatorModelId: input.evaluatorModelId,
        });
      }
    } catch (err) {
      summary.error = err instanceof Error ? err.message : String(err);
    }
    return summary;
  };

  if (!build) {
    // `--no-build` mode: skip stage 3 entirely (and dependent stages 4 +
    // honesty-check). Each hypothesis still appears in summary.md with its
    // incubator-emitted prose, just without an artifact / scores / verdict.
    // Used by matrix experiments studying upstream stages at scale.
    for (const hypothesis of hypotheses) {
      perHypothesis.push({
        hypothesisId: hypothesis.id,
        name: hypothesis.name,
        artifactsDir: join('artifacts', hypothesis.id),
      });
    }
  } else if (supportsParallel) {
    // Mirror canvas behavior: spawn all hypothesis lanes concurrently.
    // `Promise.all` is fine here because runOneHypothesis swallows its own
    // errors into the summary; no lane rejects.
    const results = await Promise.all(hypotheses.map(runOneHypothesis));
    perHypothesis.push(...results);
  } else {
    // Sequential — required for providers that 500 on concurrent requests
    // (LM Studio).
    for (const hypothesis of hypotheses) {
      perHypothesis.push(await runOneHypothesis(hypothesis));
    }
  }

  // ── Finalize: ledger + summary ─────────────────────────────────────
  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - t0;
  const ledger = input.cost.finalizeAndAppendLedger();

  const sectionContents: Record<InputsGenerateTargetSpecId, string> = {
    'research-context': researchContext,
    'objectives-metrics': objectivesMetrics,
    'design-constraints': designConstraints,
  };
  const sectionOutputs: SectionOutput[] = (
    ['research-context', 'objectives-metrics', 'design-constraints'] as InputsGenerateTargetSpecId[]
  )
    .filter((s) => sectionContents[s].length > 0)
    .map((s) => ({ id: s, source: sectionSources[s], content: sectionContents[s] }));

  writeJson(input.runDir.config, {
    flowName: flowName,
    runId: input.runDir.id,
    briefId: input.briefId,
    providerId: input.providerId,
    modelId: input.modelId,
    evaluatorProviderId: input.evaluatorProviderId ?? input.providerId,
    evaluatorModelId: input.evaluatorModelId ?? input.modelId,
    hypothesisCount: input.hypothesisCount,
    evaluate,
    dryRun: input.dryRun,
    startedAt,
    finishedAt,
    durationMs,
    notes,
  });

  writeSummary({
    runDir: input.runDir,
    flowName: flowName,
    briefId: input.briefId,
    briefPreview: input.designBrief,
    providerId: input.providerId,
    modelId: input.modelId,
    evaluatorProviderId: input.evaluatorProviderId,
    evaluatorModelId: input.evaluatorModelId,
    dryRun: input.dryRun,
    startedAt,
    finishedAt,
    durationMs,
    plan,
    hypotheses: perHypothesis,
    cost: ledger,
    fatalError,
    notes,
    sections: sectionOutputs,
  });

  writePreview({
    runDir: input.runDir,
    flowName,
    briefId: input.briefId,
    plan,
    hypotheses: perHypothesis,
    dryRun: input.dryRun,
  });

  return { spec, hypotheses: perHypothesis, fatalError };
}

// ── Helpers shared with other flows via re-export ────────────────────────

export function assembleSpec(input: {
  briefId: string;
  designBrief: string;
  researchContext: string;
  objectivesMetrics: string;
  designConstraints: string;
  designSystem?: string;
}): DesignSpec {
  const ts = now();
  const sec = (id: string, content: string) => ({
    id,
    content,
    images: [],
    lastModified: ts,
  });
  const sections: DesignSpec['sections'] = {
    'design-brief': sec('design-brief', input.designBrief),
    'research-context': sec('research-context', input.researchContext),
    'objectives-metrics': sec('objectives-metrics', input.objectivesMetrics),
    'design-constraints': sec('design-constraints', input.designConstraints),
  };
  if (input.designSystem) {
    sections['design-system'] = sec('design-system', input.designSystem);
  }
  return {
    id: generateId(),
    title: input.briefId,
    sections,
    createdAt: ts,
    lastModified: ts,
    version: 1,
  };
}

export function renderSpecBlock(spec: DesignSpec): string {
  const lines: string[] = [`# Spec: ${spec.title}`, ''];
  for (const sectionId of [
    'design-brief',
    'research-context',
    'objectives-metrics',
    'design-constraints',
    'design-system',
  ] as const) {
    const content = spec.sections[sectionId]?.content?.trim();
    if (!content) continue;
    lines.push(`## ${sectionId}`, '', content, '');
  }
  return lines.join('\n');
}

function pluckReports(
  reports: EvaluationReports,
): Partial<Record<EvaluatorRubricId, EvaluatorWorkerReport>> {
  const out: Partial<Record<EvaluatorRubricId, EvaluatorWorkerReport>> = {};
  for (const [k, v] of Object.entries(reports)) {
    out[k as EvaluatorRubricId] = v as EvaluatorWorkerReport;
  }
  return out;
}
