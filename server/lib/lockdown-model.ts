import { FEATURE_LOCKDOWN } from '../../src/lib/feature-flags.ts';
import { getLockdownModelForTask, pinForLockdown } from '../../src/lib/lockdown-model.ts';
import type { ThinkingTask } from '../../src/lib/thinking-defaults.ts';
import type { HypothesisGenerationContext } from '../../src/workspace/hypothesis-generation-pure.ts';

export function isLockdownEnabled(): boolean {
  return FEATURE_LOCKDOWN;
}

/** Defensive server-side pin for a single (providerId, modelId) pair. */
export function clampProviderModel(
  providerId: string,
  modelId: string,
  task: ThinkingTask,
): { providerId: string; modelId: string } {
  return pinForLockdown({ providerId, modelId }, isLockdownEnabled(), task);
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
  return {
    ...ctx,
    modelCredentials: pinForLockdown(ctx.modelCredentials, isLockdownEnabled(), 'design'),
  };
}
