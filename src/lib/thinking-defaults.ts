/**
 * Thinking (extended reasoning) configuration — shared by client + server.
 *
 * This module is the single source of truth for:
 *  - the `ThinkingLevel` enum Pi's SDK accepts,
 *  - the Zod schemas used by route validators,
 *  - the `resolveThinkingConfig(task, modelId, override?)` capability-gated resolver
 *    that every LLM call site uses to compose a final `ThinkingConfig`.
 *
 * The **numeric knobs** (per-task defaults, level → budget ladder, budget bounds)
 * live in `config/thinking-defaults.json` so non-engineers can tune them. See
 * `config/README.md` (the `thinking-defaults.json` section) for what each knob
 * does. The JSON is validated via Zod at module load — a malformed file fails
 * fast with a readable error rather than silently defaulting.
 *
 * No call site should read the defaults table directly. Always go through
 * `resolveThinkingConfig` so the capability gate and clamps apply consistently.
 */
import { z } from 'zod';
import rawConfig from '../../config/thinking-defaults.json';
import { supportsReasoningModel } from './model-capabilities';

/** Pi SDK's native enum for reasoning strength. Mirrors `server/services/pi-model.ts`. */
export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export const THINKING_LEVELS = [
  'off',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
] as const satisfies readonly ThinkingLevel[];

/**
 * Which task the LLM call is serving — drives defaults.
 * `design` covers the hypothesis-design build (initial + revision rounds).
 * `incubate` covers the incubator's hypothesis-strategy generation.
 * `inputs` covers all three input-section auto-fills (research, objectives,
 * constraints) — per-section granularity is achieved via the model + effort
 * the user picks, not via separate task slots.
 */
export type ThinkingTask =
  | 'design'
  | 'incubate'
  | 'internal-context'
  | 'inputs'
  | 'design-system'
  | 'evaluator';

export const THINKING_TASKS = [
  'design',
  'incubate',
  'internal-context',
  'inputs',
  'design-system',
  'evaluator',
] as const satisfies readonly ThinkingTask[];

/** Full config sent to the LLM provider. */
export type ThinkingConfig = {
  level: ThinkingLevel;
  /** Max tokens of reasoning the provider is allowed to emit. `0` when `level === 'off'`. */
  budgetTokens: number;
};

/** Partial override a client / user may supply; fields missing fall back to the task default. */
export type ThinkingOverride = Partial<ThinkingConfig>;

/**
 * User-facing effort knob — names *intent*, not mechanism. Replaces the raw
 * `ThinkingLevel` enum at the UI surface. Token budget is no longer a user
 * override; it comes from `budgetByLevel` in `config/thinking-defaults.json`.
 */
export type Effort = 'off' | 'quick' | 'balanced' | 'thorough' | 'maximum';

export const EFFORTS = ['off', 'quick', 'balanced', 'thorough', 'maximum'] as const satisfies readonly Effort[];

/** Plain-English description shown under each Settings row + in the help disclosure. */
export const EFFORT_DESCRIPTIONS: Record<Effort, string> = {
  off: 'Skip extended thinking entirely. Fastest; no internal reasoning before output.',
  quick: 'A small amount of thinking. Use for short, well-defined tasks.',
  balanced: 'Moderate thinking with good output quality. Default for most tasks.',
  thorough: 'Substantially more thinking. Use for complex creative or analytical work.',
  maximum: 'All-out thinking budget. Slowest; reserved for the hardest tasks.',
};

/** Effort → underlying provider effort. Budget continues to come from the level → budget table. */
export const EFFORT_TO_LEVEL: Record<Effort, ThinkingLevel> = {
  off: 'off',
  quick: 'low',
  balanced: 'medium',
  thorough: 'high',
  maximum: 'xhigh',
};

/** Reverse map for migrating legacy `level` overrides into `effort`. `minimal` collapses into `quick`. */
export const LEVEL_TO_EFFORT: Record<ThinkingLevel, Effort> = {
  off: 'off',
  minimal: 'quick',
  low: 'quick',
  medium: 'balanced',
  high: 'thorough',
  xhigh: 'maximum',
};

/** Always-off config. Returned when the model doesn't support reasoning. */
export const THINKING_OFF: ThinkingConfig = { level: 'off', budgetTokens: 0 };

// ── Zod schemas (shared by API route validators) ────────────────────────────

export const ThinkingLevelSchema = z.enum(THINKING_LEVELS);

export const ThinkingTaskSchema = z.enum(THINKING_TASKS);

export const ThinkingConfigSchema = z.object({
  level: ThinkingLevelSchema,
  budgetTokens: z.number().int().min(0),
});

/** Partial override accepted from clients; missing fields fall back to task defaults. */
export const ThinkingOverrideSchema = z
  .object({
    level: ThinkingLevelSchema.optional(),
    budgetTokens: z.number().int().min(0).optional(),
  })
  .strict();

// ── JSON file schema + parse ────────────────────────────────────────────────

/**
 * Build the `perTaskDefaults` schema so every task slot is required — using a
 * `z.object({...})` shape rather than `z.record(...)` makes missing keys fail.
 */
const perTaskDefaultsShape = Object.fromEntries(
  THINKING_TASKS.map((task) => [task, ThinkingConfigSchema] as const),
) as Record<ThinkingTask, typeof ThinkingConfigSchema>;

const budgetByLevelShape = Object.fromEntries(
  THINKING_LEVELS.map((level) => [level, z.number().int().min(0)] as const),
) as Record<ThinkingLevel, z.ZodNumber>;

export const ThinkingDefaultsFileSchema = z
  .object({
    perTaskDefaults: z.object(perTaskDefaultsShape).strict(),
    budgetByLevel: z.object(budgetByLevelShape).strict(),
    budgetBounds: z
      .object({
        minTokens: z.number().int().min(1),
        maxTokens: z.number().int().min(1024),
      })
      .strict()
      .refine((b) => b.maxTokens >= b.minTokens, {
        message: 'budgetBounds.maxTokens must be >= budgetBounds.minTokens',
      }),
  })
  .strict();

const CONFIG = ThinkingDefaultsFileSchema.parse(rawConfig);

/** Budget input clamps. `MIN` matches the Anthropic extended-thinking API floor. */
export const THINKING_BUDGET_MIN_TOKENS = CONFIG.budgetBounds.minTokens;
export const THINKING_BUDGET_MAX_TOKENS = CONFIG.budgetBounds.maxTokens;

/**
 * Baseline budget per level — the ladder the UI shows as a placeholder when
 * a user picks a level but leaves the budget field blank. `off` is always 0.
 */
export const THINKING_BUDGET_BY_LEVEL: Record<ThinkingLevel, number> = CONFIG.budgetByLevel;

/**
 * Per-task defaults. Heuristic:
 *  - creative / long tasks (design, incubate, internal-context) → deeper reasoning
 *  - structured extraction (inputs, design-system, evaluator) → just enough to
 *    reduce format mistakes without wasting tokens.
 * Tune values in `config/thinking-defaults.json`; call sites never hardcode.
 */
export const THINKING_CONFIG_DEFAULTS: Record<ThinkingTask, ThinkingConfig> =
  CONFIG.perTaskDefaults;

function clampBudget(n: number): number {
  if (Number.isNaN(n)) return THINKING_BUDGET_MIN_TOKENS;
  if (n >= THINKING_BUDGET_MAX_TOKENS) return THINKING_BUDGET_MAX_TOKENS;
  if (n <= THINKING_BUDGET_MIN_TOKENS) return THINKING_BUDGET_MIN_TOKENS;
  return Math.round(n);
}

/**
 * Single read-point for capability + defaults + override. Call this from every
 * LLM dispatch site; never hand-build a `ThinkingConfig`.
 *
 * Accepts both:
 *   - the new `effort` shape from the UI (preferred), and
 *   - the legacy `{ level?, budgetTokens? }` shape from older request bodies
 *     and tests during the rollout.
 */
export function resolveThinkingConfig(
  task: ThinkingTask,
  modelId: string | undefined | null,
  override?: ThinkingOverride & { effort?: Effort },
): ThinkingConfig {
  if (!modelId || !supportsReasoningModel(modelId)) return THINKING_OFF;

  const defaults = THINKING_CONFIG_DEFAULTS[task];
  const level: ThinkingLevel =
    override?.effort != null
      ? EFFORT_TO_LEVEL[override.effort]
      : (override?.level ?? defaults.level);

  if (level === 'off') return THINKING_OFF;

  // Budget no longer comes from the user. Effort overrides snap to the
  // baseline budget for the mapped level. Legacy `budgetTokens` overrides
  // still win when supplied, so request-body callers don't break.
  const rawBudget =
    override?.effort != null
      ? THINKING_BUDGET_BY_LEVEL[level]
      : (override?.budgetTokens ?? defaults.budgetTokens);
  return { level, budgetTokens: clampBudget(rawBudget) };
}
