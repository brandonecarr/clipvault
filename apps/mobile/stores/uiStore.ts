import { create } from 'zustand';

type ViewMode = 'grid' | 'list';
type SortBy = 'createdAt' | 'title' | 'platform' | 'sortOrder';
type SortDir = 'asc' | 'desc';

interface UIState {
  // View preferences
  viewMode: ViewMode;
  sortBy: SortBy;
  sortDir: SortDir;

  // Navigation state
  activeFolderId: string | null;
  breadcrumbs: Array<{ id: string; name: string }>;

  // Modal state
  isAddVideoModalOpen: boolean;
  addVideoDefaultFolderId: string | null;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortDir: (dir: SortDir) => void;
  setActiveFolderId: (id: string | null) => void;
  setBreadcrumbs: (crumbs: Array<{ id: string; name: string }>) => void;
  openAddVideoModal: (folderId?: string) => void;
  closeAddVideoModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: 'grid',
  sortBy: 'createdAt',
  sortDir: 'desc',
  activeFolderId: null,
  breadcrumbs: [],
  isAddVideoModalOpen: false,
  addVideoDefaultFolderId: null,

  setViewMode: (mode) => set({ viewMode: mode }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortDir: (dir) => set({ sortDir: dir }),
  setActiveFolderId: (id) => set({ activeFolderId: id }),
  setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
  openAddVideoModal: (folderId) =>
    set({ isAddVideoModalOpen: true, addVideoDefaultFolderId: folderId ?? null }),
  closeAddVideoModal: () =>
    set({ isAddVideoModalOpen: false, addVideoDefaultFolderId: null }),
}));
