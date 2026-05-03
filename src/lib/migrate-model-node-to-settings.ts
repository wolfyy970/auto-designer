/**
 * One-time migration that copies the model selections from canvas Model
 * nodes into the per-task Settings store, then sets a flag so it never
 * runs again. Safe to call on every app boot — the flag check makes it
 * a no-op after the first run.
 *
 * Canvas-migration v32 strips Model nodes from saved snapshots after
 * this has run; the migration here preserves the user's choices so the
 * strip is non-destructive.
 */
import { INPUT_NODE_TYPES, NODE_TYPES } from '../constants/canvas';
import { STORAGE_KEYS, isStorageFlagSet, markStorageFlag } from './storage-keys';
import { useTaskConfigStore } from '../stores/task-config-store';
import { useCanvasStore } from '../stores/canvas-store';
import { getModelNodeData } from './canvas-node-data';
import type { ThinkingTask } from './thinking-defaults';

/** Returns true when the migration ran and wrote at least one task override. */
export function migrateModelNodeToSettings(): boolean {
  if (isStorageFlagSet(STORAGE_KEYS.MODEL_NODE_TO_SETTINGS_MIGRATION_DONE)) {
    return false;
  }

  const canvas = useCanvasStore.getState();
  const thinking = useTaskConfigStore.getState();
  const overrides = thinking.overrides;
  const modelNodes = canvas.nodes.filter((n) => n.type === NODE_TYPES.MODEL);
  if (modelNodes.length === 0) {
    markStorageFlag(STORAGE_KEYS.MODEL_NODE_TO_SETTINGS_MIGRATION_DONE);
    return false;
  }

  const targetTasksByModelId = new Map<string, Set<ThinkingTask>>();
  for (const edge of canvas.edges) {
    const src = canvas.nodes.find((n) => n.id === edge.source);
    if (src?.type !== NODE_TYPES.MODEL) continue;
    const tgt = canvas.nodes.find((n) => n.id === edge.target);
    const task = nodeTypeToTask(tgt?.type);
    if (!task) continue;
    if (!targetTasksByModelId.has(src.id)) targetTasksByModelId.set(src.id, new Set());
    targetTasksByModelId.get(src.id)!.add(task);
  }

  let wrote = false;
  for (const m of modelNodes) {
    const data = getModelNodeData(m);
    const providerId = data?.providerId?.trim();
    const modelId = data?.modelId?.trim();
    if (!providerId || !modelId) continue;
    const tasks = targetTasksByModelId.get(m.id) ?? new Set<ThinkingTask>();
    for (const task of tasks) {
      const existing = overrides[task] ?? {};
      if (existing.providerId || existing.modelId) continue;
      thinking.setModel(task, providerId, modelId);
      wrote = true;
    }
  }

  markStorageFlag(STORAGE_KEYS.MODEL_NODE_TO_SETTINGS_MIGRATION_DONE);
  return wrote;
}

function nodeTypeToTask(type: string | undefined): ThinkingTask | null {
  if (!type) return null;
  if (type === NODE_TYPES.HYPOTHESIS) return 'design';
  if (type === NODE_TYPES.INCUBATOR) return 'incubate';
  if (type === NODE_TYPES.DESIGN_SYSTEM) return 'design-system';
  if (INPUT_NODE_TYPES.has(type)) return 'inputs';
  return null;
}
