import type { WorkspaceDomainStore } from './workspace-domain-store-types';

type DomainSet = (
  partial:
    | Partial<WorkspaceDomainStore>
    | ((state: WorkspaceDomainStore) => Partial<WorkspaceDomainStore> | WorkspaceDomainStore),
) => void;

export function createWorkspaceDomainEntitiesSlice(set: DomainSet): Pick<
  WorkspaceDomainStore,
  'upsertDesignSystem' | 'removeDesignSystem'
> {
  return {
    upsertDesignSystem: (nodeId, partial) =>
      set((s) => {
        const cur = s.designSystems[nodeId] ?? {
          nodeId,
          title: '',
          content: '',
          images: [],
          markdownSources: [],
        };
        return {
          designSystems: {
            ...s.designSystems,
            [nodeId]: {
              ...cur,
              ...partial,
              nodeId,
              images: partial.images ?? cur.images,
              markdownSources: partial.markdownSources ?? cur.markdownSources,
            },
          },
        };
      }),

    removeDesignSystem: (nodeId) =>
      set((s) => {
        const rest = { ...s.designSystems };
        delete rest[nodeId];
        return { designSystems: rest };
      }),
  };
}
