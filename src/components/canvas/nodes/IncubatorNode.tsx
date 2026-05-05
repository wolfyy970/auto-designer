import { memo, useCallback, useMemo, useState } from 'react';
import { useReactFlow, type NodeProps, type Node } from '@xyflow/react';
import { ArrowRight, Plus, RefreshCw } from 'lucide-react';
import { normalizeError } from '../../../lib/error-utils';
import { Button } from '@ds/components/ui/button';
import { Badge } from '@ds/components/ui/badge';
import { DocumentViewer } from '@ds/components/ui/document-viewer';
import { useSpecStore } from '../../../stores/spec-store';
import {
  useIncubatorStore,
} from '../../../stores/incubator-store';
import { useCanvasStore } from '../../../stores/canvas-store';
import { resolveIncubatorSourceState } from '../../../lib/incubator-input-count';
import type { IncubatorNodeData } from '../../../types/canvas-data';
import type { WorkspaceNode } from '../../../types/workspace-graph';
import { getDesignSystemNodeData } from '../../../lib/canvas-node-data';
import {
  activeDesignMdDocumentForDesignSystem,
  designSystemSourceFromNodeData,
  isDesignMdDocumentStale,
} from '../../../lib/design-md';
import { useWorkspaceDomainStore } from '../../../stores/workspace-domain-store';
import { processingOrFilled } from '../../../lib/node-status';
import { isPlaceholderHypothesis } from '../../../lib/hypothesis-node-utils';
import { NODE_TYPES, RF_INTERACTIVE } from '../../../constants/canvas';
import { useTaskModel } from '../../../hooks/useTaskModel';
import { useElapsedTimer } from '../../../hooks/useElapsedTimer';
import { useIncubatorRun } from '../../../hooks/useIncubatorRun';
import NodeShell from './NodeShell';
import NodeHeader from './NodeHeader';
import TaskStreamMonitor from './TaskStreamMonitor';
import Modal from '../../shared/Modal';
import { IncubatorDocumentStatusPanels } from './IncubatorDocumentStatusPanels';
import {
  createInitialTaskStreamState,
  type TaskStreamState,
} from '../../../hooks/task-stream-state';
import { NodeErrorBlock } from './shared/NodeErrorBlock';
import {
  useIncubatorDocumentPreparation,
} from '../../../hooks/useIncubatorDocumentPreparation';

const COUNT_OPTIONS = [1, 2, 3, 5];
const DEFAULT_COUNT = 3;

type IncubatorNodeFlowType = Node<IncubatorNodeData, 'incubator'>;

function IncubatorNode({ id, data, selected }: NodeProps<IncubatorNodeFlowType>) {
  const { fitView } = useReactFlow();
  const spec = useSpecStore((s) => s.spec);
  const hasDesignBrief = Boolean(spec.sections['design-brief']?.content?.trim());

  const isCompiling = useIncubatorStore((s) => s.isCompiling);
  const error = useIncubatorStore((s) => s.error);
  const setError = useIncubatorStore((s) => s.setError);

  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const edges = useCanvasStore((s) => s.edges);
  const nodes = useCanvasStore((s) => s.nodes);
  const domainWiring = useWorkspaceDomainStore((s) => s.incubatorWirings[id]);

  const { providerId, modelId, supportsVision } = useTaskModel('incubate');

  const hypothesisCount = (data.hypothesisCount as number | undefined) ?? DEFAULT_COUNT;
  const [taskStreamState, setTaskStreamState] = useState<TaskStreamState>(() =>
    createInitialTaskStreamState('idle'),
  );
  const [designMdGeneratingNodeId, setDesignMdGeneratingNodeId] = useState<string | null>(null);
  const [designMdModalNodeId, setDesignMdModalNodeId] = useState<string | null>(null);

  const sourceState = useMemo(
    () => resolveIncubatorSourceState(nodes, edges, id, spec, domainWiring),
    [domainWiring, edges, nodes, id, spec],
  );

  const scopedDesignSystemNodes = useMemo((): WorkspaceNode[] => {
    const nodeById = new Map(nodes.map((n) => [n.id, n] as const));
    return sourceState.activeDesignSystemNodeIds
      .map((nodeId) => nodeById.get(nodeId))
      .filter((n): n is WorkspaceNode => Boolean(n) && n!.type === NODE_TYPES.DESIGN_SYSTEM);
  }, [nodes, sourceState.activeDesignSystemNodeIds]);

  const connectedSourceCount = sourceState.connectedSourceCount;

  /** Hypothesis cards on the canvas wired to this incubator (not stale rows in persisted dimension map). */
  const totalHypotheses = useMemo(() => {
    const outgoingTargets = edges.filter((e) => e.source === id).map((e) => e.target);
    const targetSet = new Set(outgoingTargets);
    return nodes.filter(
      (n) =>
        n.type === 'hypothesis' &&
        targetSet.has(n.id) &&
        !isPlaceholderHypothesis(n.data),
    ).length;
  }, [edges, nodes, id]);

  const handleCountChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData(id, { hypothesisCount: Number(e.target.value) });
    },
    [id, updateNodeData],
  );

  const handleAddBlank = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (isCompiling || !hasDesignBrief || !modelId) return;
      useCanvasStore.getState().addNode(NODE_TYPES.HYPOTHESIS);
    },
    [hasDesignBrief, isCompiling, modelId],
  );

  const {
    refreshDesignMdDocument,
    ensureDesignSystemDocuments,
  } = useIncubatorDocumentPreparation({
    incubatorId: id,
    providerId,
    modelId,
    setTaskStreamState,
    setDesignMdGeneratingNodeId,
  });

  const handleRefreshDesignMdDocument = useCallback((nodeId: string) => {
    void refreshDesignMdDocument(nodeId).catch((err) => {
      setError(normalizeError(err, 'DESIGN.md generation failed'));
    });
  }, [refreshDesignMdDocument, setError]);

  const handleIncubate = useIncubatorRun({
    incubatorId: id,
    nodes,
    edges,
    providerId,
    modelId,
    supportsVision,
    hypothesisCount,
    designMdGeneratingNodeId,
    ensureDesignSystemDocuments,
    fitView,
    setTaskStreamState,
  });

  const elapsed = useElapsedTimer(isCompiling || Boolean(designMdGeneratingNodeId));

  const status = processingOrFilled(isCompiling || Boolean(designMdGeneratingNodeId));

  const isReady = hasDesignBrief && !!modelId;

  /** Lowercase copy to match input-node “needs input” pill convention. */
  const readinessBlockReason = !modelId
    ? 'choose an Incubator model in Settings'
    : !hasDesignBrief
      ? 'add a design brief first'
      : undefined;

  // Layer 2: inline readiness hint
  const hint = !isCompiling && !designMdGeneratingNodeId ? readinessBlockReason ?? null : null;
  const activeDesignMdModalNode = designMdModalNodeId
    ? scopedDesignSystemNodes.find((node) => node.id === designMdModalNodeId)
    : undefined;
  const activeDesignMdModalData = activeDesignMdModalNode
    ? getDesignSystemNodeData(activeDesignMdModalNode)
    : undefined;
  const activeDesignMdModalDocument = activeDesignMdModalData
    ? activeDesignMdDocumentForDesignSystem(activeDesignMdModalData)
    : undefined;
  const canRunDocumentTask = Boolean(providerId && modelId);

  return (
    <NodeShell
      nodeId={id}
      nodeType="incubator"
      selected={!!selected}
      width="w-node"
      status={status}
      handleColor={isReady ? 'green' : 'amber'}
      targetShape="diamond"
      targetPulse={!isReady}
    >
      <NodeHeader
        description="Synthesize inputs into differentiated design hypotheses"
      >
        <h3 className="text-xs font-semibold text-fg">Incubator</h3>
      </NodeHeader>

      {/* Skeleton overlay while incubating or refreshing generated documents */}
      {(isCompiling || designMdGeneratingNodeId) && (
        <TaskStreamMonitor
          state={taskStreamState}
          elapsed={elapsed}
          fallbackLabel={
            designMdGeneratingNodeId ? 'Generating DESIGN.md…' : 'Incubating…'
          }
        />
      )}

      {/* Controls */}
      <div className="space-y-2 px-3 py-2.5">
        {error && !isCompiling && <NodeErrorBlock variant="plain" message={error} />}

        <div className={`${RF_INTERACTIVE} space-y-2`}>
          <IncubatorDocumentStatusPanels
            isCompiling={isCompiling}
            scopedDesignSystemNodes={scopedDesignSystemNodes}
            canRunDocumentTask={canRunDocumentTask}
            designMdGeneratingNodeId={designMdGeneratingNodeId}
            onViewDesignMdDocument={setDesignMdModalNodeId}
            onRefreshDesignMdDocument={handleRefreshDesignMdDocument}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-nano text-fg-muted">
                {connectedSourceCount} source{connectedSourceCount !== 1 ? 's' : ''} connected
              </span>
            </div>
            {/* Hypothesis count selector */}
            <div className="flex items-center justify-between">
              <label className="text-nano text-fg-secondary">New hypotheses</label>
              <select
                value={hypothesisCount}
                onChange={handleCountChange}
                disabled={isCompiling}
                className="rounded border border-border bg-surface px-1.5 py-0.5 text-nano text-fg"
              >
                {COUNT_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {hint && (
              <div className="flex justify-center">
                <Badge shape="pill" tone="warning">{hint}</Badge>
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={handleIncubate}
              disabled={isCompiling || Boolean(designMdGeneratingNodeId) || !isReady}
              aria-busy={isCompiling || Boolean(designMdGeneratingNodeId)}
              aria-label={isCompiling || designMdGeneratingNodeId ? 'Incubating…' : 'Generate hypotheses'}
              title={isCompiling || designMdGeneratingNodeId ? 'Incubating…' : undefined}
            >
              {isCompiling ? (
                <>
                  <RefreshCw size={12} className="animate-spin" aria-hidden />
                  Incubating…
                </>
              ) : (
                <>
                  Generate
                  <ArrowRight size={12} aria-hidden />
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleAddBlank}
              disabled={isCompiling || Boolean(designMdGeneratingNodeId) || !isReady}
              aria-label="Add blank hypothesis card"
              title={isCompiling || designMdGeneratingNodeId ? 'Incubating…' : readinessBlockReason}
            >
              <Plus size={12} strokeWidth={2} aria-hidden />
              Blank hypothesis
            </Button>
          </div>
        </div>

        {totalHypotheses > 0 && !isCompiling && !designMdGeneratingNodeId && (
          <p className="text-nano text-fg-secondary">
            {totalHypotheses} {totalHypotheses === 1 ? 'hypothesis' : 'hypotheses'} total
          </p>
        )}
      </div>

      <Modal
        open={Boolean(designMdModalNodeId)}
        onClose={() => setDesignMdModalNodeId(null)}
        title="DESIGN.md"
        size="lg"
      >
        <DocumentViewer
          content={activeDesignMdModalDocument?.content}
          emptyMessage="No DESIGN.md document has been generated yet."
          metadata={
            activeDesignMdModalData && activeDesignMdModalDocument ? (
              <>
                <div>Generated: {activeDesignMdModalDocument.generatedAt}</div>
                <div>Model: {activeDesignMdModalDocument.providerId} / {activeDesignMdModalDocument.modelId}</div>
                <div>
                  Source: {isDesignMdDocumentStale(
                    designSystemSourceFromNodeData(activeDesignMdModalData),
                    activeDesignMdModalDocument,
                  ) ? 'stale' : 'current'}
                </div>
                {activeDesignMdModalDocument.lint ? (
                  <div>
                    Lint: {activeDesignMdModalDocument.lint.errors} errors, {activeDesignMdModalDocument.lint.warnings} warnings, {activeDesignMdModalDocument.lint.infos} info
                  </div>
                ) : null}
              </>
            ) : null
          }
        />
      </Modal>
    </NodeShell>
  );
}

export default memo(IncubatorNode);
