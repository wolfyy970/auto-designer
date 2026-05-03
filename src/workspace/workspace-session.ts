/**
 * Readonly use-case contexts built from the workspace graph.
 * Alternate UIs can construct these DTOs without a node–edge editor.
 *
 * Pure logic lives in `hypothesis-generation-pure.ts` (server-importable).
 */
import type { HypothesisStrategy } from '../types/incubator';
import type { EvaluationContextPayload } from '../types/evaluation';
import type { ProvenanceContext } from '../types/provenance-context';
import type { DesignSpec } from '../types/spec';
import { useWorkspaceDomainStore } from '../stores/workspace-domain-store';
import { useTaskConfigStore } from '../stores/task-config-store';
import type { ThinkingTask } from '../lib/thinking-defaults';
import {
  buildHypothesisGenerationContextFromInputs,
  evaluationPayloadFromHypothesisContext as evaluationPayloadPure,
  provenanceFromHypothesisContext as provenancePure,
  type HypothesisGenerationContext,
  type ModelCredential,
  type WorkspaceGraphSnapshot,
} from './hypothesis-generation-pure';

export type { HypothesisGenerationContext };

/** This module's task identity — `buildHypothesisGenerationContext` is design-side. */
const TASK = 'design' as const satisfies ThinkingTask;

export function buildHypothesisGenerationContext(input: {
  hypothesisNodeId: string;
  hypothesisStrategy: HypothesisStrategy;
  snapshot: WorkspaceGraphSnapshot;
  spec: DesignSpec;
}): HypothesisGenerationContext | null {
  const s = useWorkspaceDomainStore.getState();
  const domainHyp = s.hypotheses[input.hypothesisNodeId];
  const settings = useTaskConfigStore.getState().getEffective(TASK);
  if (!settings.providerId || !settings.modelId) return null;
  const settingsCredential: ModelCredential = {
    providerId: settings.providerId,
    modelId: settings.modelId,
    thinkingLevel: settings.level,
  };
  return buildHypothesisGenerationContextFromInputs({
    hypothesisNodeId: input.hypothesisNodeId,
    hypothesisStrategy: input.hypothesisStrategy,
    spec: input.spec,
    snapshot: input.snapshot,
    domainHypothesis: domainHyp ?? null,
    designSystems: s.designSystems,
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
