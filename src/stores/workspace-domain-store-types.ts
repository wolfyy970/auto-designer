import type {
  DomainDesignSystemContent,
  DomainHypothesis,
  DomainIncubatorWiring,
  DomainPreviewSlot,
} from '../types/workspace-domain';
import type { CanvasNodeType } from '../types/workspace-graph';

export interface WorkspaceDomainStore {
  incubatorWirings: Record<string, DomainIncubatorWiring>;
  hypotheses: Record<string, DomainHypothesis>;
  designSystems: Record<string, DomainDesignSystemContent>;
  previewSlots: Record<string, DomainPreviewSlot>;

  ensureIncubatorWiring: (incubatorId: string) => void;
  attachIncubatorInput: (
    incubatorId: string,
    sourceId: string,
    sourceType: CanvasNodeType,
  ) => void;
  detachIncubatorInput: (
    incubatorId: string,
    sourceId: string,
    sourceType: CanvasNodeType,
  ) => void;
  attachDesignSystemToHypothesis: (dsNodeId: string, hypothesisId: string) => void;
  detachDesignSystemFromHypothesis: (dsNodeId: string, hypothesisId: string) => void;
  linkHypothesisToIncubator: (
    hypothesisId: string,
    incubatorId: string,
    strategyId: string,
  ) => void;
  setHypothesisGenerationSettings: (
    hypothesisId: string,
    partial: Pick<
      DomainHypothesis,
      'revisionEnabled' | 'maxRevisionRounds' | 'minOverallScore'
    >,
  ) => void;
  setHypothesisPlaceholder: (hypothesisId: string, placeholder: boolean) => void;
  removeHypothesis: (hypothesisId: string) => void;
  removeIncubator: (incubatorId: string) => void;

  upsertDesignSystem: (nodeId: string, partial: Partial<DomainDesignSystemContent>) => void;
  removeDesignSystem: (nodeId: string) => void;

  setPreviewSlot: (
    hypothesisId: string,
    strategyId: string,
    partial: Partial<DomainPreviewSlot>,
  ) => void;
  removePreviewSlot: (hypothesisId: string, strategyId: string) => void;

  reset: () => void;
}
