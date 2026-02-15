import type { OutputFormat } from './provider';
import type { ReferenceImage } from './spec';

// ── Per-node data interfaces ────────────────────────────────────────
// These provide type safety within node components, eliminating `as` casts.
// React Flow v12 requires node data to extend Record<string, unknown>,
// so each interface includes an index signature for compatibility.

/** Base constraint required by React Flow */
type NodeData<T> = Record<string, unknown> & T;

/** Section nodes (designBrief, existingDesign, etc.) store data in spec-store */
export type SectionNodeData = NodeData<{
  // intentionally empty — section content lives in the spec store
}>;

export type CompilerNodeData = NodeData<{
  providerId?: string;
  modelId?: string;
}>;

export type HypothesisNodeData = NodeData<{
  refId: string;
  providerId?: string;
  modelId?: string;
  format?: OutputFormat;
  lastRunProviderId?: string;
  lastRunModelId?: string;
  lastRunFormat?: string;
}>;

export type VariantNodeData = NodeData<{
  refId?: string;
  variantStrategyId?: string;
  pinnedRunId?: string;
}>;

export type DesignSystemNodeData = NodeData<{
  title?: string;
  content?: string;
  images?: ReferenceImage[];
  providerId?: string;
  modelId?: string;
}>;

export type CritiqueNodeData = NodeData<{
  title?: string;
  strengths?: string;
  improvements?: string;
  direction?: string;
}>;
