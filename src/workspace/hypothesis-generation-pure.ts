/**
 * Store-free hypothesis generation context (server- and client-safe).
 * No Zustand, no Vite env, no IndexedDB.
 */
import { getDesignSystemNodeData } from '../lib/canvas-node-data';
import type { HypothesisStrategy } from '../types/incubator';
import type { EvaluationContextPayload } from '../types/evaluation';
import type { ProvenanceContext } from '../types/provenance-context';
import type { DesignSpec } from '../types/spec';
import type {
  DomainDesignSystemContent,
  DomainHypothesis,
  ThinkingLevel,
} from '../types/workspace-domain';
import { NODE_TYPES } from '../constants/canvas';
import type { WorkspaceSnapshotWire } from '../lib/workspace-snapshot-schema';
import type { WorkspaceEdge, WorkspaceNode } from '../types/workspace-graph';
import type { WorkspaceGraphSnapshot } from './graph-queries.ts';
import { formatDesignSystemSourceMarkdown } from '../lib/design-md-core';

export type { WorkspaceGraphSnapshot };

/**
 * Single choke point: validated wire snapshot uses unknown[] nodes/edges; runtime graph code
 * still treats them as WorkspaceNode/WorkspaceEdge (same as historical casts on the route).
 */
export function workspaceSnapshotWireToGraph(snapshot: WorkspaceSnapshotWire): WorkspaceGraphSnapshot {
  return {
    nodes: snapshot.nodes as WorkspaceNode[],
    edges: snapshot.edges as WorkspaceEdge[],
  };
}

export interface ModelCredential {
  readonly providerId: string;
  readonly modelId: string;
  readonly thinkingLevel: ThinkingLevel;
}

export interface HypothesisGenerationContext {
  readonly hypothesisNodeId: string;
  readonly hypothesisStrategy: HypothesisStrategy;
  readonly spec: DesignSpec;
  readonly modelCredentials: readonly ModelCredential[];
  readonly designSystemContent: string | undefined;
}

function collectDesignSystemFromDomain(
  hypothesis: DomainHypothesis | undefined,
  designSystems: Record<string, DomainDesignSystemContent>,
): string | undefined {
  if (!hypothesis) return undefined;
  const parts: string[] = [];
  for (const dsId of hypothesis.designSystemNodeIds) {
    const ds = designSystems[dsId];
    if (!ds) continue;
    const c = ds.designMdDocument?.content || formatDesignSystemSourceMarkdown(ds) || '';
    const t = ds.title || 'Design System';
    if (c.trim()) parts.push(`## ${t}\n${c}`);
  }
  return parts.join('\n\n---\n\n') || undefined;
}

function collectDesignSystemFromGraph(
  snapshot: WorkspaceGraphSnapshot,
  targetNodeId: string,
): string | undefined {
  const incomingEdges = snapshot.edges.filter((e) => e.target === targetNodeId);
  const dsNodes = incomingEdges
    .map((e) => snapshot.nodes.find((n) => n.id === e.source && n.type === NODE_TYPES.DESIGN_SYSTEM))
    .filter(Boolean) as WorkspaceNode[];

  if (dsNodes.length === 0) return undefined;

  const parts = dsNodes
    .map((n) => {
      const data = getDesignSystemNodeData(n);
      const t = data?.title || 'Design System';
      const c = data?.designMdDocument?.content || (data ? formatDesignSystemSourceMarkdown(data) : '') || '';
      return c.trim() ? `## ${t}\n${c}` : '';
    })
    .filter(Boolean);

  return parts.join('\n\n---\n\n') || undefined;
}

export function buildHypothesisGenerationContextFromInputs(input: {
  hypothesisNodeId: string;
  hypothesisStrategy: HypothesisStrategy;
  spec: DesignSpec;
  snapshot: WorkspaceGraphSnapshot;
  domainHypothesis?: DomainHypothesis | null;
  designSystems: Record<string, DomainDesignSystemContent>;
  /** Settings-store credential — the canonical source post Phase 7 D. */
  settingsCredential: ModelCredential;
}): HypothesisGenerationContext | null {
  const { hypothesisNodeId, hypothesisStrategy, spec, snapshot, domainHypothesis } = input;

  const modelCredentials: ModelCredential[] = [input.settingsCredential];

  let designSystemContent: string | undefined;
  if (domainHypothesis && domainHypothesis.designSystemNodeIds.length > 0) {
    designSystemContent = collectDesignSystemFromDomain(domainHypothesis, input.designSystems);
  } else {
    designSystemContent = collectDesignSystemFromGraph(snapshot, hypothesisNodeId);
  }

  return {
    hypothesisNodeId,
    hypothesisStrategy,
    spec,
    modelCredentials,
    designSystemContent,
  };
}

export function provenanceFromHypothesisContext(
  ctx: HypothesisGenerationContext,
): ProvenanceContext {
  const s = ctx.hypothesisStrategy;
  return {
    strategies: {
      [s.id]: {
        name: s.name,
        hypothesis: s.hypothesis,
        rationale: s.rationale,
        dimensionValues: s.dimensionValues,
      },
    },
    designSystemSnapshot: ctx.designSystemContent || undefined,
  };
}

export function evaluationPayloadFromHypothesisContext(
  ctx: HypothesisGenerationContext,
): EvaluationContextPayload {
  const s = ctx.hypothesisStrategy;
  const dv = s.dimensionValues;
  const outputFormat =
    dv['format'] ?? dv['output_format'] ?? dv['Output format'] ?? dv['Output Format'];

  return {
    strategyName: s.name,
    hypothesis: s.hypothesis,
    rationale: s.rationale,
    measurements: s.measurements,
    dimensionValues: s.dimensionValues,
    objectivesMetrics: ctx.spec.sections['objectives-metrics']?.content,
    designConstraints: ctx.spec.sections['design-constraints']?.content,
    designSystemSnapshot: ctx.designSystemContent || undefined,
    ...(outputFormat ? { outputFormat: String(outputFormat).trim() } : {}),
  };
}
