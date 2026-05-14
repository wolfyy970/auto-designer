import { memo, useCallback, useMemo, useState } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
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
import { CanvasNodeSelect } from './CanvasNodeSelect';
import { DsHelpTooltip } from '../../shared/DsHelpTooltip';

const COUNT_OPTIONS = [1, 2, 3, 5];
/**
 * Default of 5 (not 3) — the 384-cell matrix showed c5 produces ~12
 * distinct themes across 3 reps vs c3's ~7, with essentially the same
 * themeClusterRatio (0.79 vs 0.82). 5 is also the ceiling: anti-rep
 * experiment showed marginal cards past ~5 are mostly paraphrases.
 * COUNT_OPTIONS holds at 5; don't extend past it.
 */
const DEFAULT_COUNT = 5;

type IncubatorNodeFlowType = Node<IncubatorNodeData, 'incubator'>;

function IncubatorNode({ id, data, selected }: NodeProps<IncubatorNodeFlowType>) {
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
  const brainstormBeforeIncubator = Boolean(data.brainstormBeforeIncubator);
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
    (value: string) => {
      updateNodeData(id, { hypothesisCount: Number(value) });
    },
    [id, updateNodeData],
  );
  const handleBrainstormToggle = useCallback(
    (checked: boolean) => {
      updateNodeData(id, { brainstormBeforeIncubator: checked });
    },
    [id, updateNodeData],
  );
  const countOptions = COUNT_OPTIONS.map((n) => ({ value: String(n), label: String(n) }));

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
    brainstormBeforeIncubator,
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

  /**
   * After a successful run, the primary button shifts from "Generate" to
   * "Generate more" so the user understands that re-clicking adds NEW
   * hypotheses (the existing ones are passed back as anti-repetition
   * context via `existingStrategies`). Backed by the 60-cell anti-rep
   * experiment which showed this path produces more distinct concepts
   * than a single bigger ask.
   */
  const hasExistingHypotheses = totalHypotheses > 0;
  const showRegenerateMode = hasExistingHypotheses && !isCompiling;
  const primaryLabel = isCompiling
    ? 'Incubating…'
    : showRegenerateMode
      ? 'Generate more'
      : 'Generate';
  const primaryAriaLabel = isCompiling
    ? 'Incubating…'
    : showRegenerateMode
      ? 'Generate more hypotheses, avoiding the existing ones'
      : 'Generate hypotheses';

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
              <CanvasNodeSelect
                value={String(hypothesisCount)}
                options={countOptions}
                onChange={handleCountChange}
                disabled={isCompiling}
                ariaLabel="New hypotheses"
              />
            </div>

            {/*
              Optional brainstorm prelude (the experimental "ideation" flow
              promoted into production). Lifts the HypothesisAutoImproveSettings
              container pattern verbatim. Default off — the matrix shows
              brainstorming helps on open briefs but actively hurts on
              high-constraint ones (icu-handoff), so the user owns the call.
            */}
            <div className="rounded-md border border-border-subtle bg-surface/40 px-2 py-1.5">
              <div className="flex items-center gap-1">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    checked={brainstormBeforeIncubator}
                    onChange={(e) => handleBrainstormToggle(e.target.checked)}
                    disabled={isCompiling}
                    className="accent-accent shrink-0"
                  />
                  <span className="text-nano font-medium text-fg-secondary">
                    Brainstorm directions first
                  </span>
                </label>
                <DsHelpTooltip
                  aria-label="What Brainstorm directions first does"
                  content={
                    <>
                      <span className="font-medium text-fg-secondary">Off (default):</span> the
                      incubator generates hypotheses directly from your inputs.{' '}
                      <span className="font-medium text-fg-secondary">On:</span> an extra step
                      first brainstorms 10–15 product directions, then curates 5 for maximum
                      spread. Wider variety, ~50% slower. Best for open-ended briefs.
                    </>
                  }
                />
              </div>
            </div>

            {hint && (
              <div className="flex justify-center">
                <Badge shape="pill" tone="warning">{hint}</Badge>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                onClick={handleIncubate}
                disabled={isCompiling || !isReady}
                aria-busy={isCompiling}
                aria-label={primaryAriaLabel}
                title={isCompiling ? 'Incubating…' : undefined}
              >
                {isCompiling ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" aria-hidden />
                    Incubating…
                  </>
                ) : (
                  <>
                    {primaryLabel}
                    <ArrowRight size={12} aria-hidden />
                  </>
                )}
              </Button>
              {showRegenerateMode && (
                <DsHelpTooltip
                  aria-label="What Generate more does"
                  content={
                    <>
                      Each click adds new hypothesis cards. The agent receives the existing cards
                      as &ldquo;do-not-repeat&rdquo; context, so new clicks explore directions you
                      haven&rsquo;t seen yet.
                    </>
                  }
                />
              )}
            </div>

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
          <div className="space-y-0.5">
            <p className="text-nano text-fg-secondary">
              {totalHypotheses} {totalHypotheses === 1 ? 'hypothesis' : 'hypotheses'} total
            </p>
            <p className="text-nano text-fg-muted">
              Click <span className="font-medium text-fg-secondary">Generate more</span> to see
              other directions — won&rsquo;t repeat existing.
            </p>
          </div>
        )}
      </div>
    </NodeShell>
  );
}

export default memo(IncubatorNode);
