import { NODE_TYPES, INPUT_NODE_TYPES } from '../constants/canvas';
import { defaultIncubatorWiring } from '../types/workspace-domain';
import { ensureWiring, uniqPush, removeId } from './workspace-domain-helpers';
import type { WorkspaceDomainStore } from './workspace-domain-store-types';

type DomainSet = (
  partial:
    | Partial<WorkspaceDomainStore>
    | ((state: WorkspaceDomainStore) => Partial<WorkspaceDomainStore> | WorkspaceDomainStore),
) => void;

export function createWorkspaceDomainWiringSlice(set: DomainSet): Pick<
  WorkspaceDomainStore,
  | 'ensureIncubatorWiring'
  | 'attachIncubatorInput'
  | 'detachIncubatorInput'
> {
  return {
    ensureIncubatorWiring: (incubatorId) =>
      set((s) => {
        if (s.incubatorWirings[incubatorId]) return s;
        return {
          incubatorWirings: {
            ...s.incubatorWirings,
            [incubatorId]: defaultIncubatorWiring(),
          },
        };
      }),

    attachIncubatorInput: (incubatorId, sourceId, sourceType) =>
      set((s) => {
        const w = { ...ensureWiring(s.incubatorWirings, incubatorId) };
        if (INPUT_NODE_TYPES.has(sourceType)) {
          w.inputNodeIds = uniqPush(w.inputNodeIds, sourceId);
        } else if (sourceType === NODE_TYPES.PREVIEW) {
          w.previewNodeIds = uniqPush(w.previewNodeIds, sourceId);
        } else return s;
        return {
          incubatorWirings: { ...s.incubatorWirings, [incubatorId]: w },
        };
      }),

    detachIncubatorInput: (incubatorId, sourceId, sourceType) =>
      set((s) => {
        const cur = s.incubatorWirings[incubatorId];
        if (!cur) return s;
        const w = { ...cur };
        if (INPUT_NODE_TYPES.has(sourceType)) {
          w.inputNodeIds = removeId(w.inputNodeIds, sourceId);
        } else if (sourceType === NODE_TYPES.PREVIEW) {
          w.previewNodeIds = removeId(w.previewNodeIds, sourceId);
        } else return s;
        return {
          incubatorWirings: { ...s.incubatorWirings, [incubatorId]: w },
        };
      }),
  };
}
