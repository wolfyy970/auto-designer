import { create } from 'zustand';
import type { SpecSectionId } from '../types/spec';
import type { WorkspaceView } from '../types/workspace';

interface WorkspaceStore {
  activeView: WorkspaceView;
  activeSectionId: SpecSectionId;

  setActiveView: (view: WorkspaceView) => void;
  setActiveSectionId: (id: SpecSectionId) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()((set) => ({
  activeView: 'editor',
  activeSectionId: 'existing-design',

  setActiveView: (view) => set({ activeView: view }),
  setActiveSectionId: (id) => set({ activeSectionId: id }),
}));
