/**
 * Readonly use-case contexts built from the workspace graph.
 * Alternate UIs can construct these DTOs without a node–edge editor.
 *
 * Pure logic lives in `hypothesis-generation-pure.ts` (server-importable).
 */
import { DEFAULT_INCUBATOR_PROVIDER } from '../lib/constants';
import type { HypothesisStrategy } from '../types/incubator';
import type { EvaluationContextPayload } from '../types/evaluation';
import type { ProvenanceContext } from '../types/provenance-context';
import type { DesignSpec } from '../types/spec';
import { useWorkspaceDomainStore } from '../stores/workspace-domain-store';
import { useThinkingDefaultsStore } from '../stores/thinking-defaults-store';
import { EFFORT_TO_LEVEL } from '../lib/thinking-defaults';
import {
  buildHypothesisGenerationContextFromInputs,
  evaluationPayloadFromHypothesisContext as evaluationPayloadPure,
  provenanceFromHypothesisContext as provenancePure,
  type HypothesisGenerationContext,
  type ModelCredential,
  type WorkspaceGraphSnapshot,
} from './hypothesis-generation-pure';

export type { HypothesisGenerationContext };

export function buildHypothesisGenerationContext(input: {
  hypothesisNodeId: string;
  hypothesisStrategy: HypothesisStrategy;
  snapshot: WorkspaceGraphSnapshot;
  spec: DesignSpec;
}): HypothesisGenerationContext | null {
  const s = useWorkspaceDomainStore.getState();
  const domainHyp = s.hypotheses[input.hypothesisNodeId];
  const settings = useThinkingDefaultsStore.getState().getEffective('design');
  const settingsCredential: ModelCredential | undefined =
    settings.providerId && settings.modelId
      ? {
          providerId: settings.providerId,
          modelId: settings.modelId,
          thinkingLevel: EFFORT_TO_LEVEL[settings.effort],
        }
      : undefined;
  return buildHypothesisGenerationContextFromInputs({
    hypothesisNodeId: input.hypothesisNodeId,
    hypothesisStrategy: input.hypothesisStrategy,
    spec: input.spec,
    snapshot: input.snapshot,
    domainHypothesis: domainHyp ?? null,
    modelProfiles: s.modelProfiles,
    designSystems: s.designSystems,
    defaultIncubatorProvider: DEFAULT_INCUBATOR_PROVIDER,
    settingsCredential,
  });
}

export function provenanceFromHypothesisContext(
  ctx: HypothesisGenerationContext,
): ProvenanceContext {
  return provenancePure(ctx);
}

export function evaluationPayloadFromHypothesisContext(
  ctx: HypothesisGenerationContext,
): EvaluationContextPayload {
  return evaluationPayloadPure(ctx);
}
