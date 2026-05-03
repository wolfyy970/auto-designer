/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrateModelNodeToSettings } from '../migrate-model-node-to-settings';
import { useCanvasStore } from '../../stores/canvas-store';
import { useTaskConfigStore } from '../../stores/task-config-store';
import { STORAGE_KEYS } from '../storage-keys';
import { NODE_TYPES, buildEdgeId, EDGE_TYPES, EDGE_STATUS } from '../../constants/canvas';
import type { WorkspaceNode, WorkspaceEdge } from '../../types/workspace-graph';

const HYP_ID = 'hyp-1';
const INC_ID = 'inc-1';
const MODEL_A = 'model-a';
const MODEL_B = 'model-b';

function modelNode(id: string, providerId: string, modelId: string): WorkspaceNode {
  return {
    id,
    type: NODE_TYPES.MODEL,
    position: { x: 0, y: 0 },
    data: { providerId, modelId },
  } as WorkspaceNode;
}

function targetNode(id: string, type: string): WorkspaceNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: {},
  } as WorkspaceNode;
}

function edge(source: string, target: string): WorkspaceEdge {
  return {
    id: buildEdgeId(source, target),
    source,
    target,
    type: EDGE_TYPES.DATA_FLOW,
    data: { status: EDGE_STATUS.IDLE },
  } as WorkspaceEdge;
}

describe('migrateModelNodeToSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    useCanvasStore.setState({ nodes: [], edges: [] });
    useTaskConfigStore.getState().resetAll();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('writes Model node selections into the per-task store', () => {
    useCanvasStore.setState({
      nodes: [
        modelNode(MODEL_A, 'openrouter', 'foo/bar'),
        targetNode(HYP_ID, NODE_TYPES.HYPOTHESIS),
        targetNode(INC_ID, NODE_TYPES.INCUBATOR),
      ],
      edges: [edge(MODEL_A, HYP_ID), edge(MODEL_A, INC_ID)],
    });

    const wrote = migrateModelNodeToSettings();
    expect(wrote).toBe(true);

    const overrides = useTaskConfigStore.getState().overrides;
    expect(overrides.design.providerId).toBe('openrouter');
    expect(overrides.design.modelId).toBe('foo/bar');
    expect(overrides.incubate.providerId).toBe('openrouter');
    expect(overrides.incubate.modelId).toBe('foo/bar');
  });

  it('does not overwrite an existing user override', () => {
    useTaskConfigStore.getState().setModel('design', 'lmstudio', 'local');
    useCanvasStore.setState({
      nodes: [
        modelNode(MODEL_A, 'openrouter', 'foo/bar'),
        targetNode(HYP_ID, NODE_TYPES.HYPOTHESIS),
      ],
      edges: [edge(MODEL_A, HYP_ID)],
    });

    migrateModelNodeToSettings();

    const overrides = useTaskConfigStore.getState().overrides;
    expect(overrides.design.providerId).toBe('lmstudio');
    expect(overrides.design.modelId).toBe('local');
  });

  it('is idempotent: a second run is a no-op', () => {
    useCanvasStore.setState({
      nodes: [
        modelNode(MODEL_A, 'openrouter', 'foo/bar'),
        targetNode(HYP_ID, NODE_TYPES.HYPOTHESIS),
      ],
      edges: [edge(MODEL_A, HYP_ID)],
    });

    expect(migrateModelNodeToSettings()).toBe(true);
    // Add a second model node — should NOT be migrated since flag is set.
    useCanvasStore.setState({
      nodes: [
        modelNode(MODEL_B, 'lmstudio', 'other'),
        targetNode(INC_ID, NODE_TYPES.INCUBATOR),
      ],
      edges: [edge(MODEL_B, INC_ID)],
    });

    expect(migrateModelNodeToSettings()).toBe(false);
    expect(useTaskConfigStore.getState().overrides.incubate.providerId).toBeUndefined();
  });

  it('sets the flag even when there are no Model nodes', () => {
    useCanvasStore.setState({ nodes: [], edges: [] });
    expect(migrateModelNodeToSettings()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.MODEL_NODE_TO_SETTINGS_MIGRATION_DONE)).toBe('1');
  });
});
