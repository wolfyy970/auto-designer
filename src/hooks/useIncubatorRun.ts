import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { incubateStream } from '../api/client';
import { EDGE_STATUS } from '../constants/canvas';
import { scheduleCanvasFitView } from '../lib/canvas-fit-view';
import { normalizeError } from '../lib/error-utils';
import {
  createCanvasOperationController,
  isCurrentCanvasSession,
} from '../lib/canvas-session-guard';
import { buildIncubatorRunInputs } from './incubator-run-inputs';
import { createTaskStreamSession } from './task-stream-session';
import {
  createInitialTaskStreamState,
  type TaskStreamState,
} from './task-stream-state';
import { useCanvasStore } from '../stores/canvas-store';
import { useGenerationStore } from '../stores/generation-store';
import { useIncubatorStore } from '../stores/incubator-store';
import { useSpecStore } from '../stores/spec-store';
import { thinkingOverrideForWire, useTaskConfigStore } from '../stores/task-config-store';
import { useWorkspaceDomainStore } from '../stores/workspace-domain-store';
import type { WorkspaceEdge, WorkspaceNode } from '../types/workspace-graph';

interface UseIncubatorRunParams {
  incubatorId: string;
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
  providerId: string | null | undefined;
  modelId: string | null | undefined;
  supportsVision: boolean | undefined;
  hypothesisCount: number;
  fitView: Parameters<typeof scheduleCanvasFitView>[0];
  setTaskStreamState: Dispatch<SetStateAction<TaskStreamState>>;
}

export function useIncubatorRun({
  incubatorId,
  nodes,
  edges,
  providerId,
  modelId,
  supportsVision,
  hypothesisCount,
  fitView,
  setTaskStreamState,
}: UseIncubatorRunParams): () => Promise<void> {
  const appendStrategiesToNode = useIncubatorStore((s) => s.appendStrategiesToNode);
  const setCompiling = useIncubatorStore((s) => s.setCompiling);
  const setError = useIncubatorStore((s) => s.setError);
  const syncAfterIncubate = useCanvasStore((s) => s.syncAfterIncubate);
  const addPlaceholderHypotheses = useCanvasStore((s) => s.addPlaceholderHypotheses);
  const removePlaceholders = useCanvasStore((s) => s.removePlaceholders);
  const setEdgeStatusBySource = useCanvasStore((s) => s.setEdgeStatusBySource);

  return useCallback(async () => {
    if (
      useIncubatorStore.getState().isCompiling
    ) {
      return;
    }

    const generationState = useGenerationStore.getState();
    const domainState = useWorkspaceDomainStore.getState();
    const incubatorState = useIncubatorStore.getState();

    setCompiling(true);
    setTaskStreamState({ ...createInitialTaskStreamState(), status: 'streaming' });
    setError(null);
    setEdgeStatusBySource(incubatorId, EDGE_STATUS.PROCESSING);

    const placeholderIds = addPlaceholderHypotheses(incubatorId, hypothesisCount);
    const operation = createCanvasOperationController();
    const isCurrentOperation = () => isCurrentCanvasSession(operation.generation);

    let session: ReturnType<typeof createTaskStreamSession> | undefined;
    try {
      const runInputs = await buildIncubatorRunInputs({
        snapshot: {
          incubatorId,
          nodes,
          edges,
          spec: useSpecStore.getState().spec,
          results: generationState.results,
          wiring: domainState.incubatorWirings[incubatorId],
          incubationPlans: incubatorState.incubationPlans,
          hypotheses: domainState.hypotheses,
        },
        hypothesisCount,
      });

      const taskSession = createTaskStreamSession({
        sessionId: `incubate-${incubatorId}-${Date.now()}`,
        correlationId: crypto.randomUUID(),
        onPatch: (patch) => setTaskStreamState((prev) => ({ ...prev, ...patch })),
      });
      session = taskSession;
      const thinkingOverride = thinkingOverrideForWire(
        useTaskConfigStore.getState().overrides.incubate,
      );
      const map = await incubateStream(
        {
          spec: runInputs.spec,
          providerId: providerId!,
          modelId: modelId!,
          referenceDesigns: runInputs.referenceDesigns,
          supportsVision,
          promptOptions: runInputs.promptOptions,
          thinking: thinkingOverride,
        },
        { agentic: taskSession.callbacks },
        operation.signal,
      );
      if (!isCurrentOperation()) return;
      removePlaceholders(placeholderIds);
      appendStrategiesToNode(incubatorId, map);
      syncAfterIncubate(map.hypotheses, incubatorId);
      setEdgeStatusBySource(incubatorId, EDGE_STATUS.COMPLETE);
      scheduleCanvasFitView(fitView);
    } catch (err) {
      if (!isCurrentOperation()) return;
      removePlaceholders(placeholderIds);
      setError(normalizeError(err, 'Incubation failed'));
      setEdgeStatusBySource(incubatorId, EDGE_STATUS.ERROR);
    } finally {
      operation.dispose();
      void session?.finalize();
      if (isCurrentOperation()) {
        setTaskStreamState(createInitialTaskStreamState('idle'));
        setCompiling(false);
      }
    }
  }, [
    addPlaceholderHypotheses,
    appendStrategiesToNode,
    edges,
    fitView,
    hypothesisCount,
    incubatorId,
    modelId,
    nodes,
    providerId,
    removePlaceholders,
    setCompiling,
    setEdgeStatusBySource,
    setError,
    setTaskStreamState,
    supportsVision,
    syncAfterIncubate,
  ]);
}
