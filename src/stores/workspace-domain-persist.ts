import type { WorkspaceDomainStore } from './workspace-domain-store-types';
import { STORAGE_KEYS } from '../lib/storage-keys';
import { migrateWorkspaceDomainPersist } from './workspace-domain-migrate';

export const workspaceDomainPersistOptions = {
  name: STORAGE_KEYS.WORKSPACE_DOMAIN,
  partialize: (state: WorkspaceDomainStore) => ({
    incubatorWirings: state.incubatorWirings,
    hypotheses: state.hypotheses,
    designSystems: state.designSystems,
    previewSlots: state.previewSlots,
  }),
  version: 12,
  migrate: migrateWorkspaceDomainPersist,
};
