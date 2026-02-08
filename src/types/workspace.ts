import type { SpecSectionId } from './spec';

export type WorkspaceView = 'editor' | 'compiler' | 'generation';

export interface WorkspaceState {
  activeView: WorkspaceView;
  activeSpecId: string | null;
  activeSectionId: SpecSectionId;
}
