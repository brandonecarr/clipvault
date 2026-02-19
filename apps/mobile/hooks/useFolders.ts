import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { foldersService } from '../services/folders';
import type { Folder } from '@clipvault/shared';

const FOLDERS_KEY = ['folders'] as const;

export function useFolders() {
  return useQuery({
    queryKey: FOLDERS_KEY,
    queryFn: foldersService.getAll,
  });
}

export function useFolder(id: string) {
  return useQuery({
    queryKey: ['folders', id],
    queryFn: () => foldersService.getById(id),
    enabled: !!id,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: foldersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_KEY });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof foldersService.update>[1] }) =>
      foldersService.update(id, data),
    onMutate: async ({ id, data }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: FOLDERS_KEY });
      const previous = queryClient.getQueryData<Folder[]>(FOLDERS_KEY);

      queryClient.setQueryData<Folder[]>(FOLDERS_KEY, (old) =>
        old?.map((f) => (f.id === id ? { ...f, ...data } : f)) ?? [],
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FOLDERS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_KEY });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: foldersService.delete,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: FOLDERS_KEY });
      const previous = queryClient.getQueryData<Folder[]>(FOLDERS_KEY);
      queryClient.setQueryData<Folder[]>(FOLDERS_KEY, (old) =>
        old?.filter((f) => f.id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FOLDERS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_KEY });
    },
  });
}

export function useMoveFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newParentId }: { id: string; newParentId: string | null }) =>
      foldersService.move(id, newParentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_KEY });
    },
  });
}

export function useReorderFolders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: foldersService.reorder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_KEY });
    },
  });
}

// Build a folder tree from a flat list
export function buildFolderTree(
  folders: Folder[],
  parentId: string | null = null,
): Folder[] {
  return folders
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// Get all root folders
export function getRootFolders(folders: Folder[]): Folder[] {
  return buildFolderTree(folders, null);
}

// Get children of a folder
export function getChildFolders(folders: Folder[], parentId: string): Folder[] {
  return buildFolderTree(folders, parentId);
}
