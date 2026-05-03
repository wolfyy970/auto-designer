/**
 * One-time migration that copies the model selections from canvas Model
 * nodes into the per-task Settings store, then sets a flag so it never
 * runs again. Safe to call on every app boot — the flag check makes it
 * a no-op after the first run.
 *
 * Stage 5 of the canvas Model-node removal will physically strip Model
 * nodes from saved snapshots; this stage just preserves the user's
 * choices so that strip is non-destructive.
 */
import { NODE_TYPES } from '../constants/canvas';
import { STORAGE_KEYS } from './storage-keys';
import { useThinkingDefaultsStore } from '../stores/thinking-defaults-store';
import { useCanvasStore } from '../stores/canvas-store';
import { getModelNodeData } from './canvas-node-data';
import type { ThinkingTask } from './thinking-defaults';

/** Returns true when the migration ran and wrote at least one task override. */
export function migrateModelNodeToSettings(): boolean {
  if (typeof localStorage === 'undefined') return false;
  if (localStorage.getItem(STORAGE_KEYS.MODEL_NODE_TO_SETTINGS_MIGRATION_DONE)) {
    return false;
  }

  const canvas = useCanvasStore.getState();
  const thinking = useThinkingDefaultsStore.getState();
  const overrides = thinking.overrides;
  const modelNodes = canvas.nodes.filter((n) => n.type === NODE_TYPES.MODEL);
  if (modelNodes.length === 0) {
    localStorage.setItem(STORAGE_KEYS.MODEL_NODE_TO_SETTINGS_MIGRATION_DONE, '1');
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

  localStorage.setItem(STORAGE_KEYS.MODEL_NODE_TO_SETTINGS_MIGRATION_DONE, '1');
  return wrote;
}

function nodeTypeToTask(type: string | undefined): ThinkingTask | null {
  switch (type) {
    case NODE_TYPES.HYPOTHESIS:
      return 'design';
    case NODE_TYPES.INCUBATOR:
      return 'incubate';
    case 'researchContext':
    case 'objectivesMetrics':
    case 'designConstraints':
    case 'designBrief':
      return 'inputs';
    case NODE_TYPES.DESIGN_SYSTEM:
      return 'design-system';
    default:
      return null;
  }
}
