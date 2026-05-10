/**
 * Inputs-gen flow — runs only stage 1 (spec section generation).
 *
 * Designed for tight iteration on the `gen-research.md`, `gen-objectives.md`,
 * and `gen-constraints.md` prompts in isolation. Skips incubator, build, and
 * evaluation entirely.
 *
 * Three modes:
 *   - default (no `target`)              : runs all three sections in order,
 *                                           skipping any that the user supplied
 *                                           and didn't ask to regen.
 *   - `target = research-context|...`    : runs only that one section.
 *   - sibling sections                   : when user supplies them via flow
 *                                           input, they propagate as <…>
 *                                           context blocks for the section
 *                                           being generated.
 *
 * Source transparency: any section the user supplies AND we don't regenerate
 * gets a `*-source.md` transcript so an agent reading the run can see at a
 * glance which sections came from where.
 */
import type { InputsGenerateTargetSpecId } from '../../../src/lib/prompts/inputs-generate.ts';
import type { DesignSpec } from '../../../src/types/spec.ts';
import {
  createStageContext,
  runInputsGen,
  writeSectionSourceTranscript,
  type StageContext,
} from '../flow.ts';
import type { RunDir } from '../runDir.ts';
import { writeJson, writeText } from '../runDir.ts';
import type { CostTracker } from '../cost.ts';
import { writeSummary, type SectionOutput } from '../summary.ts';
import { assembleSpec, renderSpecBlock } from './canonical.ts';

const FLOW_NAME = 'inputs-gen';

const ALL_TARGETS: readonly InputsGenerateTargetSpecId[] = [
  'research-context',
  'objectives-metrics',
  'design-constraints',
];

export interface InputsGenFlowInput {
  runDir: RunDir;
  briefId: string;
  designBrief: string;
  providerId: string;
  modelId: string;
  /** Optional pre-existing section content. */
  researchContext?: string;
  objectivesMetrics?: string;
  designConstraints?: string;
  designSystem?: string;
  /** Source paths for user-supplied sections. */
  researchContextSource?: string;
  objectivesMetricsSource?: string;
  designConstraintsSource?: string;
  designSystemSource?: string;
  /** Sections to forcibly regenerate even when user-supplied. */
  regenInputs?: ReadonlySet<InputsGenerateTargetSpecId>;
  /** When set, only this section is generated; siblings still propagate as context. */
  target?: InputsGenerateTargetSpecId;
  /** Ignored — included so the CLI can pass a uniform input shape across flows. */
  evaluatorProviderId?: string;
  /** Ignored — see above. */
  evaluatorModelId?: string;
  /** Ignored — inputs-gen flow does not run incubator. */
  hypothesisCount?: number;
  /** Ignored — inputs-gen flow does not run evaluator. */
  evaluate?: boolean;
  cost: CostTracker;
  signal?: AbortSignal;
  dryRun: boolean;
}

export interface InputsGenFlowResult {
  spec: DesignSpec;
  fatalError?: string;
  generated: InputsGenerateTargetSpecId[];
  skipped: { section: InputsGenerateTargetSpecId; reason: string }[];
}

export async function runFlow(input: InputsGenFlowInput): Promise<InputsGenFlowResult> {
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

  const notes: string[] = [];
  const generated: InputsGenerateTargetSpecId[] = [];
  const skipped: { section: InputsGenerateTargetSpecId; reason: string }[] = [];
  let fatalError: string | undefined;

  let researchContext = input.researchContext?.trim() ?? '';
  let objectivesMetrics = input.objectivesMetrics?.trim() ?? '';
  let designConstraints = input.designConstraints?.trim() ?? '';
  const regen = input.regenInputs ?? new Set<InputsGenerateTargetSpecId>();
  const targets = input.target != null ? [input.target] : ALL_TARGETS;

  const sourceFor = (section: InputsGenerateTargetSpecId): string | undefined => {
    if (section === 'research-context') return input.researchContextSource;
    if (section === 'objectives-metrics') return input.objectivesMetricsSource;
    return input.designConstraintsSource;
  };

  try {
    for (const section of ALL_TARGETS) {
      const isInTargetSet = targets.includes(section);
      const userContent = section === 'research-context'
        ? researchContext
        : section === 'objectives-metrics'
          ? objectivesMetrics
          : designConstraints;

      if (!isInTargetSet) {
        // Section not in this run's target list — skip silently when user
        // supplied content (it stays in the spec); skip with a note when
        // empty (the spec section will be empty in spec.md).
        if (userContent) {
          skipped.push({ section, reason: 'not in --target; user-supplied content kept' });
          notes.push(
            `Skipped ${section} (not in target). User content preserved${sourceFor(section) ? ` (from ${sourceFor(section)})` : ''}.`,
          );
        } else {
          skipped.push({ section, reason: 'not in --target; spec section will be empty' });
          notes.push(`Skipped ${section} (not in target). Spec section will be empty.`);
        }
        continue;
      }

      const userSupplied = userContent.length > 0;
      const needsGen = !userSupplied || regen.has(section);

      if (!needsGen) {
        writeSectionSourceTranscript(ctx, {
          section,
          sourcePath: sourceFor(section),
          content: userContent,
        });
        skipped.push({ section, reason: 'user-supplied; no regen requested' });
        notes.push(
          `User-supplied ${section}${sourceFor(section) ? ` from ${sourceFor(section)}` : ''}.`,
        );
        continue;
      }

      const out = await runInputsGen(ctx, {
        target: section,
        designBrief: input.designBrief,
        researchContext: section === 'research-context'
          ? (userSupplied ? researchContext : undefined)
          : researchContext || undefined,
        objectivesMetrics: section === 'objectives-metrics'
          ? (userSupplied ? objectivesMetrics : undefined)
          : objectivesMetrics || undefined,
        designConstraints: section === 'design-constraints'
          ? (userSupplied ? designConstraints : undefined)
          : designConstraints || undefined,
      });
      const text = out.text || userContent;
      if (section === 'research-context') researchContext = text;
      else if (section === 'objectives-metrics') objectivesMetrics = text;
      else designConstraints = text;
      generated.push(section);
      notes.push(
        userSupplied
          ? `Regenerated ${section} (user draft passed in as <current_input_draft>).`
          : `Generated ${section}.`,
      );
    }
  } catch (err) {
    fatalError = err instanceof Error ? err.message : String(err);
  }

  const spec = assembleSpec({
    briefId: input.briefId,
    designBrief: input.designBrief,
    researchContext,
    objectivesMetrics,
    designConstraints,
    designSystem: input.designSystem,
  });
  writeText(input.runDir.spec, renderSpecBlock(spec));
  // Write empty hypotheses.json so the run dir has all expected files.
  writeJson(input.runDir.hypotheses, {
    note: 'inputs-gen flow does not run the incubator; this file is intentionally empty.',
  });

  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - t0;
  const ledger = input.cost.finalizeAndAppendLedger();

  const sources: Record<InputsGenerateTargetSpecId, string | undefined> = {
    'research-context': input.researchContextSource,
    'objectives-metrics': input.objectivesMetricsSource,
    'design-constraints': input.designConstraintsSource,
  };
  const sectionContents: Record<InputsGenerateTargetSpecId, string> = {
    'research-context': researchContext,
    'objectives-metrics': objectivesMetrics,
    'design-constraints': designConstraints,
  };
  const sectionOutputs: SectionOutput[] = ALL_TARGETS.filter(
    (s) => sectionContents[s].length > 0,
  ).map((s) => {
    const wasGenerated = generated.includes(s);
    const userHadContent = !!sources[s] || !wasGenerated;
    const source: SectionOutput['source'] = wasGenerated
      ? userHadContent && regen.has(s)
        ? 'regenerated'
        : 'generated'
      : 'user-supplied';
    return { id: s, source, content: sectionContents[s] };
  });

  writeJson(input.runDir.config, {
    flowName: FLOW_NAME,
    runId: input.runDir.id,
    briefId: input.briefId,
    providerId: input.providerId,
    modelId: input.modelId,
    target: input.target ?? null,
    regenInputs: Array.from(regen),
    sources: {
      'research-context': input.researchContextSource ?? null,
      'objectives-metrics': input.objectivesMetricsSource ?? null,
      'design-constraints': input.designConstraintsSource ?? null,
      'design-system': input.designSystemSource ?? null,
    },
    dryRun: input.dryRun,
    startedAt,
    finishedAt,
    durationMs,
    notes,
  });

  writeSummary({
    runDir: input.runDir,
    flowName: FLOW_NAME,
    briefId: input.briefId,
    briefPreview: input.designBrief,
    providerId: input.providerId,
    modelId: input.modelId,
    dryRun: input.dryRun,
    startedAt,
    finishedAt,
    durationMs,
    plan: undefined,
    hypotheses: [],
    cost: ledger,
    fatalError,
    notes,
    sections: sectionOutputs,
  });

  return { spec, generated, skipped, fatalError };
}
