import { FEATURE_LOCKDOWN } from '../../src/lib/feature-flags.ts';
import {
  getLockdownModelForTask,
} from '../../src/lib/lockdown-model.ts';
import type { ThinkingTask } from '../../src/lib/thinking-defaults.ts';
import type { HypothesisGenerationContext } from '../../src/workspace/hypothesis-generation-pure.ts';

export function isLockdownEnabled(): boolean {
  return FEATURE_LOCKDOWN;
}

/**
 * Defensive server-side pin. Returns the per-task lockdown model when
 * lockdown is on; otherwise returns the caller's values unchanged.
 */
export function clampProviderModel(
  providerId: string,
  modelId: string,
  task: ThinkingTask,
): { providerId: string; modelId: string } {
  if (!isLockdownEnabled()) return { providerId, modelId };
  return getLockdownModelForTask(task);
}

/** When lockdown, evaluator overrides clamp to the evaluator task's pin. */
export function clampEvaluatorOptional(
  evaluatorProviderId: string | undefined,
  evaluatorModelId: string | undefined,
): { evaluatorProviderId?: string; evaluatorModelId?: string } {
  if (!isLockdownEnabled()) {
    return { evaluatorProviderId, evaluatorModelId };
  }
  const pin = getLockdownModelForTask('evaluator');
  return {
    evaluatorProviderId: pin.providerId,
    evaluatorModelId: pin.modelId,
  };
}

/** Hypothesis design lockdown clamp — applied at the route boundary. */
export function applyLockdownToHypothesisContext(
  ctx: HypothesisGenerationContext,
): HypothesisGenerationContext {
  if (!isLockdownEnabled()) return ctx;
  const pin = getLockdownModelForTask('design');
  return {
    ...ctx,
    modelCredentials: ctx.modelCredentials.map((c) => ({
      ...c,
      providerId: pin.providerId,
      modelId: pin.modelId,
    })),
  };
}
