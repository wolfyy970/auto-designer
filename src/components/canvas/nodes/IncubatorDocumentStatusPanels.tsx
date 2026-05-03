import { Eye, RefreshCw } from 'lucide-react';
import { Button } from '@ds/components/ui/button';
import { StatusPanel } from '@ds/components/ui/status-panel';
import { getDesignSystemNodeData } from '../../../lib/canvas-node-data';
import {
  getDesignSystemEffectiveState,
  getDesignSystemDocumentUiState,
} from '../../../lib/design-md';
import type { WorkspaceNode } from '../../../types/workspace-graph';

interface IncubatorDocumentStatusPanelsProps {
  isCompiling: boolean;
  scopedDesignSystemNodes: WorkspaceNode[];
  canRunDocumentTask: boolean;
  designMdGeneratingNodeId: string | null;
  onViewDesignMdDocument: (nodeId: string) => void;
  onRefreshDesignMdDocument: (nodeId: string) => void;
}

export function IncubatorDocumentStatusPanels({
  isCompiling,
  scopedDesignSystemNodes,
  canRunDocumentTask,
  designMdGeneratingNodeId,
  onViewDesignMdDocument,
  onRefreshDesignMdDocument,
}: IncubatorDocumentStatusPanelsProps) {
  return (
    <div className="space-y-1.5">
      {scopedDesignSystemNodes.length === 0 ? (
        <StatusPanel
          title="DESIGN.md"
          status="optional"
          tone="neutral"
          density="compact"
        />
      ) : scopedDesignSystemNodes.map((node) => {
        const ds = getDesignSystemNodeData(node);
        const doc = ds?.designMdDocument;
        const dsState = getDesignSystemEffectiveState(ds ?? {}, {
          generating: designMdGeneratingNodeId === node.id,
          document: doc,
        });
        const dsUiState = getDesignSystemDocumentUiState(ds ?? {}, {
          generating: designMdGeneratingNodeId === node.id,
          document: doc,
        });
        const dsStatus = dsState.designMdStatus;
        const docHasContent = dsUiState.canView;
        const canRefreshDesignMd =
          canRunDocumentTask &&
          dsUiState.canGenerate;
        return (
          <StatusPanel
            key={node.id}
            title="DESIGN.md"
            status={dsUiState.statusLabel}
            tone={dsUiState.tone}
            animated={dsStatus === 'generating'}
            density="compact"
            actions={docHasContent || canRefreshDesignMd ? (
              <>
                {docHasContent ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="iconSm"
                    aria-label="View DESIGN.md"
                    title="View DESIGN.md"
                    onClick={() => onViewDesignMdDocument(node.id)}
                  >
                    <Eye size={11} aria-hidden />
                  </Button>
                ) : null}
                {canRefreshDesignMd ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="iconSm"
                    disabled={isCompiling || Boolean(designMdGeneratingNodeId)}
                    aria-label={dsUiState.actionLabel ?? 'Regenerate DESIGN.md'}
                    title={dsUiState.actionLabel ?? 'Regenerate DESIGN.md'}
                    onClick={() => onRefreshDesignMdDocument(node.id)}
                  >
                    <RefreshCw size={11} aria-hidden />
                  </Button>
                ) : null}
              </>
            ) : undefined}
          >
            {dsUiState.error && dsStatus !== 'generating' ? (
              <span className="text-error">{dsUiState.error}</span>
            ) : null}
          </StatusPanel>
        );
      })}
    </div>
  );
}
