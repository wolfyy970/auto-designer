import { memo, useCallback, useMemo, useState } from 'react';
import { useReactFlow, type NodeProps, type Node } from '@xyflow/react';
import { ArrowRight, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@ds/components/ui/button';
import { Badge } from '@ds/components/ui/badge';
import { useSpecStore } from '../../../stores/spec-store';
import {
  useIncubatorStore,
} from '../../../stores/incubator-store';
import { useCanvasStore } from '../../../stores/canvas-store';
import { resolveIncubatorSourceState } from '../../../lib/incubator-input-count';
import type { IncubatorNodeData } from '../../../types/canvas-data';
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
import {
  createInitialTaskStreamState,
  type TaskStreamState,
} from '../../../hooks/task-stream-state';
import { NodeErrorBlock } from './shared/NodeErrorBlock';

const COUNT_OPTIONS = [1, 2, 3, 5];
const DEFAULT_COUNT = 3;

type IncubatorNodeFlowType = Node<IncubatorNodeData, 'incubator'>;

function IncubatorNode({ id, data, selected }: NodeProps<IncubatorNodeFlowType>) {
  const { fitView } = useReactFlow();
  const spec = useSpecStore((s) => s.spec);
  const hasDesignBrief = Boolean(spec.sections['design-brief']?.content?.trim());

  const isCompiling = useIncubatorStore((s) => s.isCompiling);
  const error = useIncubatorStore((s) => s.error);

  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const edges = useCanvasStore((s) => s.edges);
  const nodes = useCanvasStore((s) => s.nodes);
  const domainWiring = useWorkspaceDomainStore((s) => s.incubatorWirings[id]);

  const { providerId, modelId, supportsVision } = useTaskModel('incubate');

  const hypothesisCount = (data.hypothesisCount as number | undefined) ?? DEFAULT_COUNT;
  const [taskStreamState, setTaskStreamState] = useState<TaskStreamState>(() =>
    createInitialTaskStreamState('idle'),
  );

  const sourceState = useMemo(
    () => resolveIncubatorSourceState(nodes, edges, id, spec, domainWiring),
    [domainWiring, edges, nodes, id, spec],
  );

  const connectedSourceCount = sourceState.connectedSourceCount;

  /** Hypothesis cards on the canvas wired to this incubator (not stale rows in persisted incubation data). */
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

  const handleIncubate = useIncubatorRun({
    incubatorId: id,
    nodes,
    edges,
    providerId,
    modelId,
    supportsVision,
    hypothesisCount,
    fitView,
    setTaskStreamState,
  });

  const elapsed = useElapsedTimer(isCompiling);

  const status = processingOrFilled(isCompiling);

  const isReady = hasDesignBrief && !!modelId;

  /** Lowercase copy to match input-node “needs input” pill convention. */
  const readinessBlockReason = !modelId
    ? 'choose an Incubator model in Settings'
    : !hasDesignBrief
      ? 'add a design brief first'
      : undefined;

  // Layer 2: inline readiness hint
  const hint = !isCompiling ? readinessBlockReason ?? null : null;

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

      {/* Skeleton overlay while incubating */}
      {isCompiling && (
        <TaskStreamMonitor
          state={taskStreamState}
          elapsed={elapsed}
          fallbackLabel="Incubating…"
        />
      )}

      {/* Controls */}
      <div className="space-y-2 px-3 py-2.5">
        {error && !isCompiling && <NodeErrorBlock variant="plain" message={error} />}

        <div className={`${RF_INTERACTIVE} space-y-2`}>
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
              disabled={isCompiling || !isReady}
              aria-busy={isCompiling}
              aria-label={isCompiling ? 'Incubating…' : 'Generate hypotheses'}
              title={isCompiling ? 'Incubating…' : undefined}
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
              disabled={isCompiling || !isReady}
              aria-label="Add blank hypothesis card"
              title={isCompiling ? 'Incubating…' : readinessBlockReason}
            >
              <Plus size={12} strokeWidth={2} aria-hidden />
              Blank hypothesis
            </Button>
          </div>
        </div>

        {totalHypotheses > 0 && !isCompiling && (
          <p className="text-nano text-fg-secondary">
            {totalHypotheses} {totalHypotheses === 1 ? 'hypothesis' : 'hypotheses'} total
          </p>
        )}
      </div>
    </NodeShell>
  );
}

export default memo(IncubatorNode);
