import type { ReferenceImage } from './spec';
import type { DesignMdDocument, ThinkingLevel } from './workspace-domain';
import type { DesignSystemMarkdownSource } from './design-system-source';
import type { DesignSystemSourceMode } from './design-system-mode';

// ── Per-node data interfaces ────────────────────────────────────────
// These provide type safety within node components, eliminating `as` casts.
// React Flow v12 requires node data to extend Record<string, unknown>,
// so each interface includes an index signature for compatibility.

/** Base constraint required by React Flow */
type NodeData<T> = Record<string, unknown> & T;

/** Input nodes (designBrief, researchContext, etc.) store data in spec-store */
export type InputNodeData = NodeData<Record<string, never>>;

/** Placeholder cards for optional input nodes not yet on the canvas */
export type InputGhostTargetType =
  | 'researchContext'
  | 'objectivesMetrics'
  | 'designConstraints';

const INPUT_GHOST_TARGET_TYPE_SET = new Set<string>([
  'researchContext',
  'objectivesMetrics',
  'designConstraints',
]);

export function isInputGhostTargetType(v: string): v is InputGhostTargetType {
  return INPUT_GHOST_TARGET_TYPE_SET.has(v);
}

export type InputGhostData = NodeData<{
  targetType: InputGhostTargetType;
}>;

export type IncubatorNodeData = NodeData<{
  hypothesisCount?: number;
  /**
   * When true, the incubate route runs a brainstorm-and-curate prelude
   * before the main incubator call (the experiments tool's "ideation"
   * flow, promoted into production). Default false. Matrix evidence: ~15%
   * more distinct themes across reps at +50% wall time; tends to hurt on
   * high-constraint briefs, so the user owns the choice via the toggle.
   */
  brainstormBeforeIncubator?: boolean;
}>;

export type HypothesisNodeData = NodeData<{
  refId?: string;
  placeholder?: boolean;
  providerId?: string;  // vestigial post-v13, kept for migration safety
  modelId?: string;     // vestigial post-v13
}>;

export type PreviewNodeData = NodeData<{
  refId?: string;
  strategyId?: string;
  pinnedRunId?: string;
}>;

export type DesignSystemNodeData = NodeData<{
  title?: string;
  /** `off` is accepted only for saved canvases from the short-lived pre-Default mode. */
  sourceMode?: DesignSystemSourceMode | 'off';
  content?: string;
  images?: ReferenceImage[];
  markdownSources?: DesignSystemMarkdownSource[];
  designMdDocument?: DesignMdDocument;
  providerId?: string;
  modelId?: string;
}>;

export type ModelNodeData = NodeData<{
  title?: string;
  providerId?: string;
  modelId?: string;
  thinkingLevel?: ThinkingLevel;
}>;
