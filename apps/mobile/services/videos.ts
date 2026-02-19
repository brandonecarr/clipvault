import api, { apiRequest } from './api.js';
import type { Video, VideoMetadata, PaginatedResult } from '@clipvault/shared';

export const videosService = {
  async getFolderVideos(
    folderId: string,
    params: { limit?: number; cursor?: string; sortBy?: string; sortDir?: string } = {},
  ): Promise<PaginatedResult<Video> & { videos: Video[] }> {
    const result = await apiRequest<
      { videos: Video[]; nextCursor: string | null; hasMore: boolean }
    >(api.get(`/folders/${folderId}/videos`, { params }));
    return { items: result.videos, videos: result.videos, nextCursor: result.nextCursor, hasMore: result.hasMore };
  },

  async extractMetadata(url: string): Promise<VideoMetadata> {
    const result = await apiRequest<{ metadata: VideoMetadata }>(
      api.post('/meta/extract', { url }),
    );
    return result.metadata;
  },

  async create(data: {
    url: string;
    folderId: string;
    notes?: string | null;
    tags?: string[];
  }): Promise<Video> {
    const result = await apiRequest<{ video: Video }>(api.post('/videos', data));
    return result.video;
  },

  async update(
    id: string,
    data: {
      folderId?: string;
      notes?: string | null;
      tags?: string[];
    },
  ): Promise<Video> {
    const result = await apiRequest<{ video: Video }>(api.patch(`/videos/${id}`, data));
    return result.video;
  },

  async delete(id: string): Promise<void> {
    await apiRequest<{ message: string }>(api.delete(`/videos/${id}`));
  },

  async move(id: string, newFolderId: string): Promise<Video> {
    const result = await apiRequest<{ video: Video }>(
      api.patch(`/videos/${id}/move`, { newFolderId }),
    );
    return result.video;
  },

  async bulkMove(videoIds: string[], newFolderId: string): Promise<{ movedCount: number }> {
    return apiRequest<{ movedCount: number }>(
      api.post('/videos/bulk-move', { videoIds, newFolderId }),
    );
  },

  async search(q: string, limit = 20): Promise<{
    folders: import('@clipvault/shared').Folder[];
    videos: Video[];
    query: string;
  }> {
    return apiRequest(api.get('/videos/search', { params: { q, limit } }));
  },
};
