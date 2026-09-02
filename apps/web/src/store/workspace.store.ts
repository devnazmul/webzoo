import { create } from 'zustand';
import { Workspace } from '@webzoo/shared';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  workspaceUnreadCounts: Record<string, number>;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspace: (workspace: Workspace) => void;
  incrementWorkspaceUnread: (workspaceId: string) => void;
  clearWorkspaceUnread: (workspaceId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeWorkspace: null,
  workspaceUnreadCounts: {},
  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  incrementWorkspaceUnread: (workspaceId) =>
    set((state) => ({
      workspaceUnreadCounts: {
        ...state.workspaceUnreadCounts,
        [workspaceId]: (state.workspaceUnreadCounts[workspaceId] ?? 0) + 1,
      },
    })),
  clearWorkspaceUnread: (workspaceId) =>
    set((state) => ({
      workspaceUnreadCounts: { ...state.workspaceUnreadCounts, [workspaceId]: 0 },
    })),
}));
