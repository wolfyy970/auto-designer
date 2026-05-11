/**
 * Composable stage functions that mirror the production pipeline.
 *
 * Each stage takes a `StageContext`, calls the same prompt-assembly + Pi
 * runtime helpers the routes use, writes a transcript, and returns its
 * result. Flows in `flows/` compose these in different orders.
 *
 * Dry-run path: every stage writes its composed prompts to a transcript
 * without sending to a provider. Useful for verifying flow shape and prompt
 * assembly before spending tokens.
 */
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { DesignSpec } from '../../src/types/spec.ts';
import type {
  HypothesisStrategy,
  Dimension,
  IncubationPlan,
} from '../../src/types/incubator.ts';
import type { EvaluationContextPayload, EvaluatorWorkerReport } from '../../src/types/evaluation.ts';

import { buildIncubatorUserPrompt } from '../../src/lib/prompts/incubator-user.ts';
import {
  buildInputsGenerateUserMessage,
  promptKeyForInputsGenerate,
  type InputsGenerateTargetSpecId,
} from '../../src/lib/prompts/inputs-generate.ts';
import { buildHypothesisPrompt } from '../../src/lib/prompts/hypothesis-prompt.ts';
import { generateId, now } from '../../src/lib/utils.ts';
import { normalizeIncubationPlanExplorationAxes } from '../../src/lib/exploration-axis-normalizer.ts';

import { getPromptBody } from '../../server/lib/prompt-resolution.ts';
import { inlineGuidance } from '../../server/lib/inline-guidance.ts';
import { extractLlmJsonObjectSegment } from '../../server/lib/extract-llm-json.ts';
import { parseJsonLenient } from '../../server/lib/parse-json-lenient.ts';
import { runTaskAgentPiSession } from '../../server/services/task-agent-session.ts';
import { StreamIdleError } from '../../server/services/pi-agent-runtime.ts';
import { runEvaluationWorkers } from '../../server/services/evaluator-worker-dispatch.ts';

import type { RunDir } from './runDir.ts';
import { writeText } from './runDir.ts';
import { writeTranscript, type TranscriptUsage, type WrittenTranscript } from './transcripts.ts';
import { CostTracker, CostCapExceededError } from './cost.ts';

export interface StageContext {
  readonly runDir: RunDir;
  /** Mutable counter — bumped by each stage call so transcripts ordinal-sort. */
  ordinal: { value: number };
  readonly providerId: string;
  readonly modelId: string;
  readonly cost: CostTracker;
  readonly signal?: AbortSignal;
  readonly dryRun: boolean;
}

export type { CostCapExceededError };

/**
 * Per-stage wall-clock budgets. These are the **outer safety net** — the
 * stream-idle watchdog in the Pi runtime (45s) is the primary signal for a
 * dead connection. The stage timeout is for cases the watchdog can't see:
 * the streamFn promise never resolved at all (no events to bump activity),
 * or the model is in a tool-loop producing legitimate stream activity but
 * never terminating.
 *
 * Sized for the legitimate maximum a healthy stage takes, plus a small
 * margin. NOT sized to wait out hangs — if a stage is approaching its
 * budget, something is structurally wrong, not slow. Cycle 15 wall times
 * (the cleanest reference run): inputs-gen ~30s, incubator ~60s, build
 * ~150-180s. Budgets here are roughly 2x the observed clean max.
 */
export const STAGE_TIMEOUT_MS = {
  /**
   * Single-LLM-call inputs-gen / curation / brainstorm. Bumped 90s → 2min
   * cycle 21 after the matrix test surfaced cycle-19's "MiniMax under load
   * streams slowly for ~60-90s per stage" reality. The stream-idle watchdog
   * (45s) still catches actual fetch hangs; this budget covers slow-but-
   * streaming work without becoming a sleep budget.
   */
  inputsGen: 2 * 60_000,
  /** Incubator JSON synthesis (~60-90s typical, hard cap 3 min). */
  incubator: 3 * 60_000,
  /** Per-hypothesis design build (~2-3 min typical, hard cap 6 min for the heaviest legitimate build). */
  designBuild: 6 * 60_000,
  /** Evaluator workers run in parallel (~60-90s typical, hard cap 3 min). */
  evaluation: 3 * 60_000,
} as const;

/**
 * Stage exceeded its wall-clock budget. Distinct from `StreamIdleError`
 * (intra-stream stall caught by the runtime's stream-idle watchdog) — this
 * is the outer safety net for cases the watchdog cannot see (e.g., the
 * streamFn promise never resolves, or the model is in a working tool-loop
 * that produces stream activity but never terminates).
 */
export class StageTimeoutError extends Error {
  override readonly name = 'StageTimeoutError';
  readonly label: string;
  readonly timeoutMs: number;
  constructor(label: string, timeoutMs: number) {
    super(
      `${label} exceeded ${(timeoutMs / 1000).toFixed(0)}s budget — stage aborted. ` +
        `If a stream-idle abort fired first, look for StreamIdleError instead. ` +
        `Persistent StageTimeoutError on a clean network suggests a tool-loop or ` +
        `long-running build; consider raising the budget for this stage type.`,
    );
    this.label = label;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Run `fn` with a per-stage timeout. Forwards the parent signal (if any) and
 * adds a timer-based abort. If `fn` throws because the timer fired, rewrites
 * the error to a typed `StageTimeoutError`. The runtime's stream-idle
 * watchdog is the primary signal for fetch-layer stalls; this is the outer
 * safety net.
 */
export async function withStageTimeout<T>(
  label: string,
  timeoutMs: number,
  parentSignal: AbortSignal | undefined,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort(parentSignal?.reason);
  if (parentSignal?.aborted) {
    controller.abort(parentSignal.reason);
  } else {
    parentSignal?.addEventListener('abort', onParentAbort);
  }
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const result = await fn(controller.signal);
    if (timedOut) {
      throw new StageTimeoutError(label, timeoutMs);
    }
    return result;
  } catch (err) {
    if (timedOut) {
      throw new StageTimeoutError(label, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onParentAbort);
  }
}

// ── Stage scaffolding ──────────────────────────────────────────────────────

/**
 * Declarative stage metadata. Pairs with `runStageWithTranscript` so the
 * common pattern (ordinal bump + dry-run early-return + cost gate +
 * timeout-wrapped LLM call + transcript write + error capture) lives in one
 * place. Each stage's unique work — building the userPrompt, calling
 * runTaskAgentPiSession with stage-specific args, parsing the result — is
 * the body of the `fn` callback.
 *
 * Cross-cutting concerns added here propagate to every stage (and every
 * variant-flow stage that uses this helper) for free: timeouts shipped
 * cycle 15, retries / observability / new diagnostics ship the same way.
 */
import type { SessionType } from '../../server/lib/session-types.ts';

export interface StageDef<T> {
  /** Slug for the transcript filename (e.g. `inputs-research-context`). */
  slug: string;
  /** Human title on the transcript (e.g. `Stage 1 — inputs-gen / research-context`). */
  title: string;
  /**
   * Pi session type for the LLM call, or a transcript-only label for stages
   * that don't go through Pi (`direct-llm`, etc). Recorded on the transcript
   * verbatim; the helper does not interpret it.
   */
  sessionType: SessionType | (string & {});
  /** The user prompt body, also recorded on the transcript verbatim. */
  userPrompt: string;
  /** Free-text describing how the system prompt is assembled (for the transcript). */
  systemPromptDescription: string;
  /** Wall-clock budget for the stage, used by `withStageTimeout`. */
  timeoutMs: number;
  /** Label that goes into `StageTimeoutError` if the timer fires. */
  timeoutLabel: string;
  /**
   * Returned (and recorded as a no-LLM-call transcript) when ctx.dryRun is
   * true. The fn callback is not invoked at all in dry-run mode.
   */
  dryRunPlaceholder: T;
  /**
   * Optional: extracts the text to record in the transcript's `response`
   * field. Defaults to empty string. Stages that have a natural string form
   * (e.g. result.txt content) pass `(text) => text`; stages that emit
   * structured results (e.g. files map) pass a custom summarizer.
   */
  formatResponse?: (result: T) => string;
  /** Optional: extracts cost-recordable usage from the result. */
  formatUsage?: (result: T) => TranscriptUsage | undefined;
}

/** Maximum total attempts per stage (initial + retry). */
const MAX_STAGE_ATTEMPTS = 2;
/** Backoff between attempts on a retryable error. */
const STAGE_RETRY_BACKOFF_MS = 1500;

/**
 * Decide whether an error is worth retrying. Cycle 19's tax-prep died on a
 * single design-constraints transient hiccup ("Task agent session returned
 * no result.") — exactly the case retry catches. We do NOT retry timeouts
 * (the budget already covers expected slowness; a retry would just hit the
 * same wall) or cost-cap exceedance (budget gate, retry won't help).
 *
 * `StreamIdleError` IS retryable: it means "the stream went silent for 45s,"
 * which is a flaky-fetch signal that often recovers on a fresh request.
 * Every other Error is treated as transient until proven otherwise.
 *
 * Exported for testability — used internally by `runStageWithTranscript`.
 */
export function isStageRetryable(err: unknown): boolean {
  if (err instanceof StageTimeoutError) return false;
  if (err instanceof CostCapExceededError) return false;
  if (err instanceof StreamIdleError) return true;
  return err instanceof Error;
}

/**
 * Sleep that resolves early on parent-signal abort, so a long retry backoff
 * doesn't outlive a cancelled run. Exported for testability.
 */
export function interruptibleSleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    let cleared = false;
    const onAbort = () => {
      if (cleared) return;
      cleared = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve();
    };
    const timer = setTimeout(() => {
      if (cleared) return;
      cleared = true;
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort);
  });
}

/**
 * Run a stage end-to-end with all the cross-cutting concerns handled. Bumps
 * the ordinal, gates on dry-run, gates on cost cap, wraps the LLM-flavored
 * `fn` in `withStageTimeout`, retries once on transient errors, captures
 * errors into the transcript, and rethrows with a stage-labelled message
 * after the transcript is durably written.
 *
 * The `fn` body is the only stage-specific code: build the LLM call,
 * extract the typed result, do any per-stage side effects (e.g. persist
 * artifact files to disk). Anything `fn` throws is caught, recorded, and
 * (if non-retryable or retry exhausted) rethrown as
 * `${timeoutLabel} failed: ${reason}` after the transcript exists on disk.
 *
 * **Retry semantics**: see `isStageRetryable`. Up to `MAX_STAGE_ATTEMPTS`
 * total. Each attempt asserts cost capacity and records usage independently
 * so the daily ledger stays accurate when retries fire. Backoff between
 * attempts is interruptible by the parent signal — a cancelled run doesn't
 * outlive its retry sleep.
 */
export async function runStageWithTranscript<T>(
  ctx: StageContext,
  def: StageDef<T>,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<{ result: T; transcript: WrittenTranscript }> {
  const ordinal = ++ctx.ordinal.value;
  const baseTranscript = {
    ordinal,
    slug: def.slug,
    title: def.title,
    providerId: ctx.providerId,
    modelId: ctx.modelId,
    sessionType: def.sessionType,
    systemPrompt: def.systemPromptDescription,
    userPrompt: def.userPrompt,
  };

  if (ctx.dryRun) {
    const transcript = writeTranscript(ctx.runDir, {
      ...baseTranscript,
      notes: 'dry-run: not sent to provider',
    });
    return { result: def.dryRunPlaceholder, transcript };
  }

  const estimate = CostTracker.estimateTokens(def.userPrompt);
  const t0 = Date.now();
  let result: T | undefined;
  let lastError: unknown;
  let lastErrorMessage: string | undefined;
  const attemptErrors: string[] = [];

  for (let attempt = 1; attempt <= MAX_STAGE_ATTEMPTS; attempt++) {
    // Per-attempt cost gate so the ledger reflects retries accurately.
    // assertCapacity throws CostCapExceededError, which isStageRetryable
    // explicitly does not retry — propagate up immediately.
    ctx.cost.assertCapacity(estimate);

    try {
      result = await withStageTimeout(def.timeoutLabel, def.timeoutMs, ctx.signal, fn);
      const usage = def.formatUsage ? def.formatUsage(result) : undefined;
      ctx.cost.recordUsage(usage, estimate);
      lastError = undefined;
      lastErrorMessage = undefined;
      break;
    } catch (err) {
      // Cost was burned this attempt regardless of success — record an
      // estimated charge so the daily ledger doesn't under-count failed
      // attempts that still produced provider-side load.
      ctx.cost.recordUsage(undefined, estimate);
      lastError = err;
      lastErrorMessage = err instanceof Error ? err.message : String(err);
      attemptErrors.push(`attempt ${attempt}: ${lastErrorMessage}`);

      const retryable = isStageRetryable(err);
      const hasMoreAttempts = attempt < MAX_STAGE_ATTEMPTS;
      if (!retryable || !hasMoreAttempts) break;

      if (process.env.NODE_ENV !== 'production') {
         
        console.debug(
          `[flow] ${def.timeoutLabel} attempt ${attempt} failed (${lastErrorMessage}); retrying after ${STAGE_RETRY_BACKOFF_MS}ms`,
        );
      }
      await interruptibleSleep(STAGE_RETRY_BACKOFF_MS, ctx.signal);
      if (ctx.signal?.aborted) break;
    }
  }

  const durationMs = Date.now() - t0;
  const usage = result !== undefined && def.formatUsage ? def.formatUsage(result) : undefined;

  const responseField = result !== undefined && def.formatResponse ? def.formatResponse(result) : '';
  const transcriptNotes = attemptErrors.length > 1
    ? `Attempted ${attemptErrors.length}× before ${result !== undefined ? 'success' : 'final failure'}: ${attemptErrors.join(' | ')}`
    : undefined;
  const transcript = writeTranscript(ctx.runDir, {
    ...baseTranscript,
    response: responseField,
    durationMs,
    usage,
    error: lastErrorMessage,
    notes: transcriptNotes,
  });

  if (result === undefined) {
    // Preserve the typed failure (StageTimeoutError / StreamIdleError /
    // CostCapExceededError) when those were the final cause; the caller can
    // distinguish them. Generic transient failures collapse to the
    // stage-labelled error string.
    if (
      lastError instanceof StageTimeoutError ||
      lastError instanceof StreamIdleError ||
      lastError instanceof CostCapExceededError
    ) {
      throw lastError;
    }
    throw new Error(`${def.timeoutLabel} failed: ${lastErrorMessage ?? 'unknown error'}`);
  }
  return { result, transcript };
}

// ── Stage 1: inputs gen ────────────────────────────────────────────────────

export interface RunInputsGenInput {
  target: InputsGenerateTargetSpecId;
  designBrief: string;
  researchContext?: string;
  objectivesMetrics?: string;
  designConstraints?: string;
}

export interface RunInputsGenResult {
  text: string;
  transcript: WrittenTranscript;
}

export async function runInputsGen(
  ctx: StageContext,
  input: RunInputsGenInput,
): Promise<RunInputsGenResult> {
  const promptKey = promptKeyForInputsGenerate(input.target);
  const guidance = await inlineGuidance(promptKey, 'input_generator_guidance');
  const contextMessage = buildInputsGenerateUserMessage({
    targetInput: input.target,
    designBrief: input.designBrief,
    researchContext: input.researchContext,
    objectivesMetrics: input.objectivesMetrics,
    designConstraints: input.designConstraints,
  });
  const userPrompt = `<task>
Generate the **${labelFor(input.target)}** section content for a design specification.

Write the result as plain text to \`result.txt\` in the workspace root.
The output should be ready to paste into a textarea — no JSON wrapping, no markdown code fences, no meta commentary.
</task>

${guidance}

${contextMessage}`;

  const { result, transcript } = await runStageWithTranscript<string>(
    ctx,
    {
      slug: `inputs-${input.target}`,
      title: `Stage 1 — inputs-gen / ${input.target}`,
      sessionType: 'inputs-gen',
      userPrompt,
      systemPromptDescription: '(assembled by runTaskAgentPiSession at execution time)',
      timeoutMs: STAGE_TIMEOUT_MS.inputsGen,
      timeoutLabel: `inputs-gen[${input.target}]`,
      dryRunPlaceholder: '',
      formatResponse: (text) => text,
    },
    async (signal) => {
      const { sessionResult } = await runTaskAgentPiSession(
        {
          userPrompt,
          providerId: ctx.providerId,
          modelId: ctx.modelId,
          sessionType: 'inputs-gen',
          signal,
          correlationId: randomUUID(),
          initialProgressMessage: `Generating ${input.target}…`,
        },
        async () => {},
      );
      if (!sessionResult) throw new Error('Task agent session returned no result.');
      const text = extractResultFile(sessionResult.files, 'result.txt', `inputs-gen[${input.target}]`);
      if (!text) throw new Error('Task agent did not write result.txt.');
      return text;
    },
  );

  return { text: result, transcript };
}

function labelFor(target: InputsGenerateTargetSpecId): string {
  switch (target) {
    case 'research-context':
      return 'Research & Context';
    case 'objectives-metrics':
      return 'Objectives & Metrics';
    case 'design-constraints':
      return 'Design Constraints';
  }
}

// ── Stage 2: incubator ─────────────────────────────────────────────────────

export interface RunIncubatorInput {
  spec: DesignSpec;
  count?: number;
  /**
   * Strategies that should be excluded from the incubator's output via the
   * production `existingStrategies` mechanism. When set, the assembled
   * user-prompt includes the "Existing Hypotheses (already explored)" block
   * with the anti-repetition instruction "Do NOT reproduce them. Generate
   * new strategies that explore genuinely different regions of the solution
   * space." Used to test whether splitting a single c10 call into c5 + c5
   * with anti-repetition feedback produces more distinct concepts than the
   * single c10 call. See `experiments/scripts/anti-repetition-experiment.ts`.
   */
  existingStrategies?: HypothesisStrategy[];
}

export interface RunIncubatorResult {
  plan: IncubationPlan;
  transcript: WrittenTranscript;
}

export async function runIncubator(
  ctx: StageContext,
  input: RunIncubatorInput,
): Promise<RunIncubatorResult> {
  const userPromptTemplate = await getPromptBody('incubator-user-inputs');
  const guidance = await inlineGuidance('hypotheses-generator-system', 'hypotheses_generator_guidance');
  const promptOptions =
    input.count != null || input.existingStrategies?.length
      ? {
          ...(input.count != null ? { count: input.count } : {}),
          ...(input.existingStrategies?.length
            ? { existingStrategies: input.existingStrategies }
            : {}),
        }
      : undefined;
  const assembledSpec = buildIncubatorUserPrompt(
    input.spec,
    userPromptTemplate,
    undefined,
    promptOptions,
  );
  const userPrompt = `<task>
Analyze the design specification below and produce global exploration axes with hypothesis strategies.

Write the complete JSON result to \`result.json\` in the workspace root. The JSON must contain:
- "dimensions": array of { name, range, isConstant }
- "hypotheses": array of { name, hypothesis, rationale, measurements, dimensionValues }
</task>

${guidance}

${assembledSpec}`;

  // The incubator returns a parsed IncubationPlan, but we also want to
  // record the raw JSON on the transcript so a reader can see exactly what
  // the model emitted before normalization.
  const { result, transcript } = await runStageWithTranscript<{ plan: IncubationPlan; rawJson: string }>(
    ctx,
    {
      slug: 'incubator',
      title: 'Stage 2 — incubator',
      sessionType: 'incubation',
      userPrompt,
      systemPromptDescription: '(assembled by runTaskAgentPiSession)',
      timeoutMs: STAGE_TIMEOUT_MS.incubator,
      timeoutLabel: 'incubator',
      dryRunPlaceholder: { plan: emptyPlanFor(input.spec), rawJson: '' },
      formatResponse: ({ rawJson }) => rawJson,
    },
    async (signal) => {
      const { sessionResult } = await runTaskAgentPiSession(
        {
          userPrompt,
          providerId: ctx.providerId,
          modelId: ctx.modelId,
          sessionType: 'incubation',
          signal,
          correlationId: randomUUID(),
          initialProgressMessage: 'Incubating spec to hypotheses…',
        },
        async () => {},
      );
      if (!sessionResult) throw new Error('Incubator returned no result.');
      const rawJson = extractResultFile(sessionResult.files, 'result.json', 'incubator');
      if (!rawJson) throw new Error('Incubator did not write result.json.');
      const segment = extractLlmJsonObjectSegment(rawJson);
      const raw = parseJsonLenient(segment);
      const plan = parseIncubatorJson(raw, input.spec, ctx.modelId);
      return { plan, rawJson };
    },
  );

  return { plan: result.plan, transcript };
}

function emptyPlanFor(spec: DesignSpec): IncubationPlan {
  return {
    id: generateId(),
    specId: spec.id,
    dimensions: [],
    hypotheses: [],
    generatedAt: now(),
    incubatorModel: 'dry-run',
  };
}

/** Lightweight parse — mirrors the route's normalization, minus the SSE-bound checks. */
function parseIncubatorJson(raw: unknown, spec: DesignSpec, modelId: string): IncubationPlan {
  const obj = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}) as {
    dimensions?: unknown;
    hypotheses?: unknown;
    variants?: unknown;
  };
  const dims = Array.isArray(obj.dimensions) ? obj.dimensions : [];
  const hyps = Array.isArray(obj.hypotheses)
    ? obj.hypotheses
    : Array.isArray(obj.variants)
      ? obj.variants
      : [];

  const dimensions: Dimension[] = dims.map((d) => {
    const o = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
    const range = Array.isArray(o.range) ? o.range.map(String).join(', ') : String(o.range ?? '');
    return {
      name: String(o.name ?? ''),
      range,
      isConstant: Boolean(o.isConstant ?? false),
    };
  });

  const hypotheses: HypothesisStrategy[] = hyps.map((h) => {
    const o = (h && typeof h === 'object' ? h : {}) as Record<string, unknown>;
    const measurements = Array.isArray(o.measurements)
      ? o.measurements.map(String).join('; ')
      : String(o.measurements ?? '');
    const dimVals = (o.dimensionValues && typeof o.dimensionValues === 'object'
      ? (o.dimensionValues as Record<string, unknown>)
      : {}) as Record<string, unknown>;
    return {
      id: generateId(),
      name: String(o.name ?? 'Unnamed Hypothesis'),
      hypothesis: String(o.hypothesis ?? o.primaryEmphasis ?? ''),
      rationale: String(o.rationale ?? ''),
      measurements,
      dimensionValues: Object.fromEntries(
        Object.entries(dimVals).map(([k, v]) => [k, String(v)]),
      ),
    };
  });

  return normalizeIncubationPlanExplorationAxes({
    id: generateId(),
    specId: spec.id,
    dimensions,
    hypotheses,
    generatedAt: now(),
    incubatorModel: modelId,
  });
}

// ── Stage 3: design build ──────────────────────────────────────────────────

export interface RunDesignBuildInput {
  spec: DesignSpec;
  hypothesis: HypothesisStrategy;
  dimensions: readonly Dimension[];
  /** Optional override for the design system block; falls back to spec section. */
  designSystem?: string;
}

export interface RunDesignBuildResult {
  files: Record<string, string>;
  transcript: WrittenTranscript;
  /** The compiled hypothesis user prompt — passed forward to the evaluator. */
  compiledPrompt: string;
}

export async function runDesignBuild(
  ctx: StageContext,
  input: RunDesignBuildInput,
): Promise<RunDesignBuildResult> {
  const hypId = input.hypothesis.id;
  const [hypothesisTemplate, designAgentInstructions] = await Promise.all([
    getPromptBody('designer-hypothesis-inputs'),
    getPromptBody('designer-agent-instructions'),
  ]);
  const compiledPrompt = buildHypothesisPrompt(
    input.spec,
    input.hypothesis,
    hypothesisTemplate,
    input.dimensions,
    input.designSystem,
    designAgentInstructions.trim(),
  );

  const { result, transcript } = await runStageWithTranscript<Record<string, string>>(
    ctx,
    {
      slug: `build-${shortHypSlug(input.hypothesis.name, hypId)}`,
      title: `Stage 3 — design build / ${input.hypothesis.name}`,
      sessionType: 'design',
      userPrompt: compiledPrompt,
      systemPromptDescription:
        '(assembled by runTaskAgentPiSession; design-tagged skills attach automatically)',
      timeoutMs: STAGE_TIMEOUT_MS.designBuild,
      timeoutLabel: `design-build[${input.hypothesis.name}]`,
      dryRunPlaceholder: {},
      formatResponse: summarizeFiles,
    },
    async (signal) => {
      const { sessionResult } = await runTaskAgentPiSession(
        {
          userPrompt: compiledPrompt,
          providerId: ctx.providerId,
          modelId: ctx.modelId,
          sessionType: 'design',
          signal,
          correlationId: randomUUID(),
          initialProgressMessage: `Building design for ${input.hypothesis.name}…`,
        },
        async () => {},
      );
      if (!sessionResult) throw new Error('Design build session returned no result.');
      const files = sessionResult.files;
      if (Object.keys(files).length === 0) {
        throw new Error('Design build session produced no files.');
      }
      // Persist artifacts to disk so the human can open them in a browser.
      for (const [path, content] of Object.entries(files)) {
        writeText(join(ctx.runDir.artifacts, hypId, path), content);
      }
      return files;
    },
  );

  return { files: result, transcript, compiledPrompt };
}

function shortHypSlug(name: string, id: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  return slug ? `${slug}-${id.slice(0, 6)}` : id.slice(0, 8);
}

function summarizeFiles(files: Record<string, string>): string {
  const paths = Object.keys(files);
  if (paths.length === 0) return '(no files)';
  const lines = paths
    .sort()
    .map((p) => `- ${p} (${files[p]?.length ?? 0} chars)`)
    .join('\n');
  return `${paths.length} file(s):\n${lines}`;
}

// ── Stage 3.5: honesty check ───────────────────────────────────────────────

/**
 * Verdict from a `runHonestyCheck` call. The structure is parsed from the
 * model's JSON output; the helper validates the shape lazily and falls back
 * to `{ verdict: 'unknown', findings: [] }` if the model emitted unparseable
 * JSON.
 *
 * Verdict semantics (set by the model, gated by the prompt):
 * - `clean`     — no problematic stubs in bet-critical paths
 * - `minor`     — stubs exist but only in scaffold paths, OR appropriate scaffold demo data
 * - `hollow`    — at least one bet-critical path is faked/hand-waved; bet is unfalsifiable
 * - `unknown`   — fallback when the response wasn't parseable as the expected shape
 */
export interface HonestyFinding {
  file: string;
  line?: number;
  comment: string;
  isBetCritical: boolean;
  severity: 'ok' | 'minor' | 'hollow';
  explanation: string;
}

export interface HonestyVerdict {
  verdict: 'clean' | 'minor' | 'hollow' | 'unknown';
  findings: HonestyFinding[];
}

export interface RunHonestyCheckInput {
  hypothesis: HypothesisStrategy;
  files: Record<string, string>;
}

export interface RunHonestyCheckResult {
  verdict: HonestyVerdict;
  transcript: WrittenTranscript;
}

/** Per-file budget for honesty-check input. Cycle-19 builds had ~5KB JS files; 8KB headroom keeps 99% intact while bounding worst-case context. */
const HONESTY_CHECK_FILE_TRUNCATE_CHARS = 8_000;
/** Total cap on file content embedded in the prompt; protects against a runaway build with many oversized files. */
const HONESTY_CHECK_TOTAL_CHARS_CAP = 60_000;
/**
 * Honesty check is a single LLM call but heavier than other inputs-gen stages:
 * the model has to read the hypothesis, scan every JS/HTML file, distinguish
 * bet-critical from scaffold paths, and emit structured JSON with per-finding
 * explanations. Cycle-20 smoke run on `password-reset` showed 3 of 5 checks
 * hitting a 90s budget; 3 min (matching `evaluation`) gives proper headroom
 * without becoming a sleep budget.
 */
const HONESTY_CHECK_TIMEOUT_MS = 3 * 60_000;

/**
 * Run a post-build honesty-check on a hypothesis's artifact. A separate Pi
 * session reads the hypothesis prose + the build's JS/HTML files and emits a
 * structured verdict on whether bet-critical paths contain hand-waved
 * comments / hardcoded stand-ins / fake-progress UI.
 *
 * Cycle-19 evidence: the cycle-14 prompt rule prohibiting `// in a real app...`
 * comments held cleanly across grief corpora (0 hits in 20 builds) but
 * weakened across diverse-domain corpora (13 hits in 20 builds, all in
 * permission-gated functionality the prompt didn't name explicitly). A
 * pattern-agnostic post-build inspection catches what the prompt rule
 * misses, regardless of which API category the model invented stubs for.
 *
 * **Failure mode**: this stage is a critique tool, not a build gate. If
 * honesty-check itself fails (LLM error, parse error, timeout), the
 * hypothesis still completes — the verdict just reports `unknown` and the
 * transcript records the error. The build is never invalidated by an
 * honesty-check failure.
 */
export async function runHonestyCheck(
  ctx: StageContext,
  input: RunHonestyCheckInput,
): Promise<RunHonestyCheckResult> {
  const { hypothesis, files } = input;

  // Filter to JS + HTML; CSS doesn't fake behavior. Sort for deterministic
  // prompt order; cap each file to avoid runaway context, cap total to keep
  // even bad cases bounded.
  const auditableEntries = Object.entries(files)
    .filter(([path]) => /\.(js|mjs|html?|jsx?)$/i.test(path))
    .sort(([a], [b]) => a.localeCompare(b));

  let totalEmbedded = 0;
  const filesBlock = auditableEntries
    .map(([path, content]) => {
      const remaining = Math.max(0, HONESTY_CHECK_TOTAL_CHARS_CAP - totalEmbedded);
      if (remaining <= 0) return `<file path="${path}" omitted="total cap reached" />`;
      const headroom = Math.min(HONESTY_CHECK_FILE_TRUNCATE_CHARS, remaining);
      const truncated =
        content.length > headroom
          ? `${content.slice(0, headroom)}\n... [TRUNCATED ${content.length - headroom} more chars]`
          : content;
      totalEmbedded += truncated.length;
      return `<file path="${path}">\n${truncated}\n</file>`;
    })
    .join('\n\n');

  const userPrompt = `<task>
You are auditing a build artifact for honesty in its bet-critical paths.

The hypothesis below names features and explicitly tags some as bet-critical (the ones that prove or disprove the hypothesis). The artifact JS/HTML files implement those features. Your job: identify bet-critical paths that are faked, stubbed, or admitted-and-shipped.

The cycle-14 build prompt banned the comment form of stubbing (\`// in a real app this would...\`, \`// would do X\`, \`// simulate ...\`). After that ban, stubbing migrated to disguised forms — surface them all. Inspect for:

- **Comment-form stubs in JS:** \`// in a real app this would...\`, \`// would do X\`, \`// simulate ...\`, \`// for demo purposes ...\` next to a bet-critical handler that's a no-op or hardcoded.
- **\`Simulate: X happens\` / \`Demo: Y\` UI labels.** Buttons, links, or text whose visible label admits the bet-critical step is faked. Example: \`<button>Simulate: contact accepts request</button>\` standing in for the bet-critical acceptance flow.
- **\`alert('In a full implementation, this would...')\`** (or toast, banner, placeholder paragraph, \`console.log\`) — the comment ban applies to user-visible copy too. The pattern is "the artifact narrates the missing functionality at the point a reviewer expects working functionality."
- **\`setInterval\` driving fake "progress"** as a substitute for a real state change — a queue position counting down on a timer, a loading bar that fills regardless of input, an artificial wait that simulates work. If the bet implies real input drives the change, the timer-driven version fakes it.
- **\`setTimeout\` simulating an external signal** in a bet-critical path — connection establishment, verification result, network response, etc. If the bet says "video call connects in 60 seconds" and the implementation is \`setTimeout(showConnected, 2000)\`, the bet is unfalsifiable from the artifact.
- **Hardcoded values rendered as if dynamic.** A "Last memory: Grandma's pie" card baked into HTML when the bet claims persistence; a "You have 3 streaks" counter that's hardcoded \`3\` rather than read from state; a "queue position 3" that started life as a constant. If the bet says the value is derived from user activity, it must come from state the user actually wrote.
- **Fake validation that accepts anything.** \`if (password.length >= 4) authenticate()\` when the bet is testing matching against historical credentials; \`if (input.length > 0) success()\` when the bet is about a specific verification step.

For each pattern, judge: does the stub sit in a bet-critical path the hypothesis explicitly named, or in a scaffold path the hypothesis declared out-of-scope? Same disguised-stub pattern in a scaffold is fine — that's appropriate scope discipline; the visible "Simulate" UI is acceptable when the hypothesis says "scaffold this feature." A stub in a path the hypothesis named as bet-critical is "hollow" regardless of how the stub is disguised.

Write the result as JSON to \`result.json\` in the workspace root. Schema:

{
  "verdict": "clean" | "minor" | "hollow",
  "findings": [
    {
      "file": "<path>",
      "line": <number, optional>,
      "comment": "<the offending text or short description>",
      "isBetCritical": true | false,
      "severity": "ok" | "minor" | "hollow",
      "explanation": "<one sentence why this is or isn't a problem>"
    }
  ]
}

Verdict semantics:
- "clean" = no problematic stubs in bet-critical paths
- "minor" = stubs exist but only in scaffold/non-bet-critical paths, OR appropriate scaffold demo data simulation (e.g., generating sample chart data)
- "hollow" = at least one bet-critical path is faked or hand-waved; the bet is unfalsifiable from the artifact

Be strict but precise. The hypothesis prose explicitly identifies which features are bet-critical (often phrased as "Build (1) and (3) to working depth; scaffold (2), (4), (5)"). Honor that distinction — a stub in a scaffold-tagged feature is "minor", a stub in a bet-critical-tagged feature is "hollow".

If you see no problematic stubs, output {"verdict": "clean", "findings": []}.
</task>

<hypothesis>
Name: ${hypothesis.name}

${hypothesis.hypothesis}

Rationale: ${hypothesis.rationale}
</hypothesis>

<files>
${filesBlock}
</files>`;

  const dryRunPlaceholder: HonestyVerdict = { verdict: 'unknown', findings: [] };

  const slug = `honesty-${shortHypSlug(hypothesis.name, hypothesis.id)}`;

  const { result, transcript } = await runStageWithTranscript<{
    verdict: HonestyVerdict;
    rawJson: string;
  }>(
    ctx,
    {
      slug,
      title: `Stage 3.5 — honesty check / ${hypothesis.name}`,
      sessionType: 'inputs-gen',
      userPrompt,
      systemPromptDescription: '(assembled by runTaskAgentPiSession)',
      timeoutMs: HONESTY_CHECK_TIMEOUT_MS,
      timeoutLabel: `honesty-check[${hypothesis.name}]`,
      dryRunPlaceholder: { verdict: dryRunPlaceholder, rawJson: '' },
      formatResponse: ({ rawJson }) => rawJson,
    },
    async (signal) => {
      const { sessionResult } = await runTaskAgentPiSession(
        {
          userPrompt,
          providerId: ctx.providerId,
          modelId: ctx.modelId,
          sessionType: 'inputs-gen',
          signal,
          correlationId: randomUUID(),
          initialProgressMessage: `Auditing ${hypothesis.name} for honesty…`,
        },
        async () => {},
      );
      if (!sessionResult) throw new Error('Honesty-check session returned no result.');
      const rawJson = extractResultFile(sessionResult.files, 'result.json', `honesty-check[${hypothesis.name}]`);
      if (!rawJson) throw new Error('Honesty-check session did not write result.json.');
      const verdict = parseHonestyVerdict(rawJson);
      return { verdict, rawJson };
    },
  );

  return { verdict: result.verdict, transcript };
}

/**
 * Tolerant parse of the model's honesty-check JSON output. The schema is
 * deliberately loose because the consumer (summary.md per-hypothesis row,
 * critique-time inspection) treats this as a hint, not a contract.
 *
 * Exported for testability — used internally by `runHonestyCheck`.
 */
export function parseHonestyVerdict(rawJson: string): HonestyVerdict {
  try {
    const segment = extractLlmJsonObjectSegment(rawJson);
    const raw = parseJsonLenient(segment) as Record<string, unknown> | null;
    if (!raw || typeof raw !== 'object') return { verdict: 'unknown', findings: [] };
    const verdict = String(raw.verdict ?? '').trim().toLowerCase();
    const verdictNorm: HonestyVerdict['verdict'] =
      verdict === 'clean' || verdict === 'minor' || verdict === 'hollow' ? verdict : 'unknown';
    const findingsRaw = Array.isArray(raw.findings) ? raw.findings : [];
    const findings: HonestyFinding[] = findingsRaw.map((f) => {
      const o = (f && typeof f === 'object' ? (f as Record<string, unknown>) : {}) as Record<
        string,
        unknown
      >;
      const sev = String(o.severity ?? '').trim().toLowerCase();
      const severityNorm: HonestyFinding['severity'] =
        sev === 'ok' || sev === 'minor' || sev === 'hollow' ? sev : 'minor';
      return {
        file: String(o.file ?? ''),
        line: typeof o.line === 'number' ? o.line : undefined,
        comment: String(o.comment ?? ''),
        isBetCritical: Boolean(o.isBetCritical),
        severity: severityNorm,
        explanation: String(o.explanation ?? ''),
      };
    });
    return { verdict: verdictNorm, findings };
  } catch {
    return { verdict: 'unknown', findings: [] };
  }
}

// ── Stage 4: evaluation ────────────────────────────────────────────────────

export interface RunEvaluationInput {
  files: Record<string, string>;
  compiledPrompt: string;
  context: EvaluationContextPayload;
  evaluatorProviderId?: string;
  evaluatorModelId?: string;
}

export type EvaluationReports = Awaited<ReturnType<typeof runEvaluationWorkers>>;

export interface RunEvaluationResult {
  reports: EvaluationReports;
  transcripts: WrittenTranscript[];
}

export async function runEvaluation(
  ctx: StageContext,
  input: RunEvaluationInput,
): Promise<RunEvaluationResult> {
  const baseOrdinal = ++ctx.ordinal.value;

  const resolvedEvalProviderId = input.evaluatorProviderId ?? ctx.providerId;
  const resolvedEvalModelId = input.evaluatorModelId ?? ctx.modelId;

  if (ctx.dryRun) {
    const transcripts = (['design', 'strategy', 'implementation', 'browser'] as const).map((rubric, i) =>
      writeTranscript(ctx.runDir, {
        ordinal: baseOrdinal + i / 10,
        slug: `eval-${rubric}`,
        title: `Stage 4 — evaluator / ${rubric}`,
        providerId: resolvedEvalProviderId,
        modelId: resolvedEvalModelId,
        sessionType: 'evaluation',
        systemPrompt: '(eval-* prompt body fetched at execution time)',
        userPrompt: '(constructed by runEvaluationWorkers from files + compiledPrompt + context)',
        notes: 'dry-run: not sent to provider',
      }),
    );
    return {
      reports: {
        design: degradedFor('design'),
        strategy: degradedFor('strategy'),
        implementation: degradedFor('implementation'),
        browser: degradedFor('browser'),
      },
      transcripts,
    };
  }

  const estimate = CostTracker.estimateTokens(input.compiledPrompt) * 3; // 3 LLM evaluators
  ctx.cost.assertCapacity(estimate);

  const t0 = Date.now();
  const reports = await withStageTimeout(
    'evaluation',
    STAGE_TIMEOUT_MS.evaluation,
    ctx.signal,
    (signal) =>
      runEvaluationWorkers({
        files: input.files,
        compiledPrompt: input.compiledPrompt,
        context: input.context,
        providerId: ctx.providerId,
        modelId: ctx.modelId,
        evaluatorProviderId: input.evaluatorProviderId,
        evaluatorModelId: input.evaluatorModelId,
        parallel: true,
        correlationId: randomUUID(),
        signal,
      }),
  );
  const durationMs = Date.now() - t0;
  ctx.cost.recordUsage(undefined, estimate);

  const transcripts: WrittenTranscript[] = [];
  let i = 0;
  for (const [rubric, report] of Object.entries(reports)) {
    transcripts.push(
      writeTranscript(ctx.runDir, {
        ordinal: baseOrdinal + i / 10,
        slug: `eval-${rubric}`,
        title: `Stage 4 — evaluator / ${rubric}`,
        providerId: resolvedEvalProviderId,
        modelId: resolvedEvalModelId,
        sessionType: 'evaluation',
        systemPrompt: '(eval-* prompt body fetched at execution time)',
        userPrompt: '(constructed by runEvaluationWorkers from files + compiledPrompt + context)',
        response: JSON.stringify(report, null, 2),
        durationMs,
      }),
    );
    i++;
  }

  return { reports, transcripts };
}

function degradedFor(rubric: string): EvaluatorWorkerReport {
  return {
    rubric: rubric as EvaluatorWorkerReport['rubric'],
    scores: {},
    findings: [],
    hardFails: [],
  };
}

// ── Public helpers ─────────────────────────────────────────────────────────

export interface CreateStageContextInput {
  runDir: RunDir;
  providerId: string;
  modelId: string;
  cost: CostTracker;
  signal?: AbortSignal;
  dryRun: boolean;
}

export function createStageContext(input: CreateStageContextInput): StageContext {
  return {
    runDir: input.runDir,
    ordinal: { value: 0 },
    providerId: input.providerId,
    modelId: input.modelId,
    cost: input.cost,
    signal: input.signal,
    dryRun: input.dryRun,
  };
}

export function evalContextFor(input: {
  spec: DesignSpec;
  hypothesis: HypothesisStrategy;
  designSystemSnapshot?: string;
  outputFormat?: string;
}): EvaluationContextPayload {
  const sec = input.spec.sections;
  return {
    strategyName: input.hypothesis.name,
    hypothesis: input.hypothesis.hypothesis,
    rationale: input.hypothesis.rationale,
    measurements: input.hypothesis.measurements,
    dimensionValues: input.hypothesis.dimensionValues,
    objectivesMetrics: sec['objectives-metrics']?.content,
    designConstraints: sec['design-constraints']?.content,
    designSystemSnapshot: input.designSystemSnapshot,
    outputFormat: input.outputFormat,
  };
}

// ── Result extraction ──────────────────────────────────────────────────────

/**
 * Extract the result file from a Pi session's file map.
 *
 * The model is instructed to write to a specific filename (`result.txt`,
 * `result.md`, `result.json`, depending on stage). When that file is present,
 * use it directly. When it isn't (the model wrote to a different filename),
 * fall back to the first non-empty file in the map and emit a debug log so
 * the drift is visible — silently extracting the wrong file would mask
 * prompt fidelity issues.
 *
 * Throws if no non-empty content is available anywhere; callers should treat
 * that as the stage-failed signal it is.
 */
export function extractResultFile(
  files: Record<string, string>,
  expectedFilename: string,
  stageLabel: string,
): string {
  const expected = files[expectedFilename]?.trim();
  if (expected) return expected;

  // Fallback: pick any non-empty file. Surface the drift so future investigations
  // can correlate "stage produced a result, but at a different filename" with the
  // prompt content that produced it.
  for (const [name, content] of Object.entries(files)) {
    if (content && content.trim()) {
      if (process.env.NODE_ENV !== 'production') {
         
        console.debug(
          `[flow] ${stageLabel}: model wrote to "${name}" instead of expected "${expectedFilename}" — falling back to actual file. Prompt drift?`,
        );
      }
      return content.trim();
    }
  }
  return '';
}

/** Stage 0 (no-op pass-through) — useful for variants that want to record an ordinal-stamped note. */
export function writeStageNote(
  ctx: StageContext,
  slug: string,
  title: string,
  note: string,
): WrittenTranscript {
  const ordinal = ++ctx.ordinal.value;
  return writeTranscript(ctx.runDir, {
    ordinal,
    slug,
    title,
    providerId: 'n/a',
    modelId: 'n/a',
    systemPrompt: '(stage note)',
    userPrompt: note,
    notes: 'flow-internal note (not an LLM call)',
  });
}

/**
 * Records a "this section came from the user, not an LLM" transcript so any
 * reader of the run can see at a glance which spec sections were generated
 * and which were supplied. Lets the experiments tool stay honest about the
 * source of every input that flows downstream.
 */
export function writeSectionSourceTranscript(
  ctx: StageContext,
  args: { section: InputsGenerateTargetSpecId; sourcePath?: string; content: string },
): WrittenTranscript {
  const ordinal = ++ctx.ordinal.value;
  const slug = `${args.section}-source`;
  const sourceLine = args.sourcePath
    ? `Section provided by user from file: ${args.sourcePath}`
    : 'Section provided by user (inline content; no source path recorded)';
  return writeTranscript(ctx.runDir, {
    ordinal,
    slug,
    title: `Stage 1 — ${args.section} (user-supplied)`,
    providerId: 'n/a',
    modelId: 'n/a',
    sessionType: 'user-supplied',
    systemPrompt: sourceLine,
    userPrompt: '(no LLM call)',
    response: args.content,
    notes: `${args.content.length} chars; section bypassed LLM and was inserted directly into spec`,
  });
}
