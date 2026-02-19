import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { videosService } from '../services/videos';

const videoKeys = {
  folder: (folderId: string) => ['videos', 'folder', folderId] as const,
  search: (q: string) => ['videos', 'search', q] as const,
};

export function useFolderVideos(
  folderId: string,
  options: { sortBy?: string; sortDir?: string } = {},
) {
  return useInfiniteQuery({
    queryKey: [...videoKeys.folder(folderId), options],
    queryFn: ({ pageParam }) =>
      videosService.getFolderVideos(folderId, {
        cursor: pageParam as string | undefined,
        ...options,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!folderId,
  });
}

export function useSearchVideos(q: string) {
  return useQuery({
    queryKey: videoKeys.search(q),
    queryFn: () => videosService.search(q),
    enabled: q.length >= 2,
  });
}

export function useExtractMetadata() {
  return useMutation({
    mutationFn: videosService.extractMetadata,
  });
}

export function useSaveVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: videosService.create,
    onSuccess: (video) => {
      queryClient.invalidateQueries({ queryKey: videoKeys.folder(video.folderId) });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useUpdateVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof videosService.update>[1] }) =>
      videosService.update(id, data),
    onSuccess: (video) => {
      queryClient.invalidateQueries({ queryKey: videoKeys.folder(video.folderId) });
    },
  });
}

export function useDeleteVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string }) =>
      videosService.delete(id).then(() => ({ folderId })),
    onSuccess: ({ folderId }) => {
      queryClient.invalidateQueries({ queryKey: videoKeys.folder(folderId) });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useMoveVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newFolderId }: { id: string; newFolderId: string }) =>
      videosService.move(id, newFolderId),
    onSuccess: (video) => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}
