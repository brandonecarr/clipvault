import api, { apiRequest } from './api.js';
import type { Folder } from '@clipvault/shared';

interface FoldersResponse {
  folders: Array<Folder & { videoCount: number; subfolderCount: number }>;
}

interface FolderResponse {
  folder: Folder & {
    videoCount: number;
    subfolderCount: number;
    children: Array<Folder & { videoCount: number; subfolderCount: number }>;
    path: Array<{ id: string; name: string }>;
  };
}

export const foldersService = {
  async getAll(): Promise<FoldersResponse['folders']> {
    const result = await apiRequest<FoldersResponse>(api.get('/folders'));
    return result.folders;
  },

  async getById(id: string): Promise<FolderResponse['folder']> {
    const result = await apiRequest<FolderResponse>(api.get(`/folders/${id}`));
    return result.folder;
  },

  async create(data: {
    name: string;
    parentId?: string | null;
    color?: string | null;
    icon?: string | null;
    description?: string | null;
  }): Promise<Folder> {
    const result = await apiRequest<{ folder: Folder }>(api.post('/folders', data));
    return result.folder;
  },

  async update(
    id: string,
    data: {
      name?: string;
      color?: string | null;
      icon?: string | null;
      description?: string | null;
    },
  ): Promise<Folder> {
    const result = await apiRequest<{ folder: Folder }>(api.patch(`/folders/${id}`, data));
    return result.folder;
  },

  async delete(id: string): Promise<void> {
    await apiRequest<{ message: string }>(api.delete(`/folders/${id}`));
  },

  async move(id: string, newParentId: string | null): Promise<Folder> {
    const result = await apiRequest<{ folder: Folder }>(
      api.patch(`/folders/${id}/move`, { newParentId }),
    );
    return result.folder;
  },

  async reorder(orderedIds: string[]): Promise<void> {
    await apiRequest<{ message: string }>(api.patch('/folders/reorder', { orderedIds }));
  },
};
