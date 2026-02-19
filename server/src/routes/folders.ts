import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  CreateFolderSchema,
  UpdateFolderSchema,
  MoveFolderSchema,
  ReorderFoldersSchema,
  buildApiSuccess,
  buildApiError,
  MAX_FOLDER_DEPTH,
} from '@clipvault/shared';

const router = Router();
router.use(requireAuth);

// ─── Helper: calculate folder depth ────────────────────────────────────────

async function getFolderDepth(folderId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = folderId;

  while (currentId) {
    const folder = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!folder?.parentId) break;
    currentId = folder.parentId;
    depth++;
    if (depth > MAX_FOLDER_DEPTH) break;
  }

  return depth;
}

// ─── GET /api/v1/folders ────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;

  const folders = await prisma.folder.findMany({
    where: { userId },
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: { videos: true, children: true },
      },
    },
  });

  const result = folders.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    color: f.color,
    icon: f.icon,
    parentId: f.parentId,
    userId: f.userId,
    sortOrder: f.sortOrder,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    videoCount: f._count.videos,
    subfolderCount: f._count.children,
  }));

  res.json(buildApiSuccess({ folders: result }));
});

// ─── GET /api/v1/folders/:id ────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const folder = await prisma.folder.findFirst({
    where: { id, userId },
    include: {
      children: {
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { videos: true, children: true } },
        },
      },
      _count: { select: { videos: true, children: true } },
    },
  });

  if (!folder) {
    res.status(404).json(buildApiError('Folder not found', 'NOT_FOUND'));
    return;
  }

  // Build breadcrumb path
  const path: Array<{ id: string; name: string }> = [];
  let currentParentId = folder.parentId;

  while (currentParentId) {
    const parent = await prisma.folder.findUnique({
      where: { id: currentParentId },
      select: { id: true, name: true, parentId: true },
    });
    if (!parent) break;
    path.unshift({ id: parent.id, name: parent.name });
    currentParentId = parent.parentId;
  }

  res.json(
    buildApiSuccess({
      folder: {
        ...folder,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
        videoCount: folder._count.videos,
        subfolderCount: folder._count.children,
        children: folder.children.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          videoCount: c._count.videos,
          subfolderCount: c._count.children,
        })),
        path,
      },
    }),
  );
});

// ─── POST /api/v1/folders ───────────────────────────────────────────────────

router.post('/', validate(CreateFolderSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { name, parentId, color, icon, description } = req.body as {
    name: string;
    parentId?: string | null;
    color?: string | null;
    icon?: string | null;
    description?: string | null;
  };

  // Validate parent belongs to user
  if (parentId) {
    const parent = await prisma.folder.findFirst({ where: { id: parentId, userId } });
    if (!parent) {
      res.status(404).json(buildApiError('Parent folder not found', 'NOT_FOUND'));
      return;
    }

    // Check depth
    const depth = await getFolderDepth(parentId);
    if (depth >= MAX_FOLDER_DEPTH - 1) {
      res
        .status(400)
        .json(
          buildApiError(
            `Maximum folder nesting depth of ${MAX_FOLDER_DEPTH} exceeded`,
            'MAX_DEPTH_EXCEEDED',
          ),
        );
      return;
    }
  }

  // Get next sort order
  const maxOrder = await prisma.folder.aggregate({
    where: { userId, parentId: parentId ?? null },
    _max: { sortOrder: true },
  });

  const folder = await prisma.folder.create({
    data: {
      name,
      parentId: parentId ?? null,
      color: color ?? null,
      icon: icon ?? null,
      description: description ?? null,
      userId,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  res.status(201).json(
    buildApiSuccess({
      folder: {
        ...folder,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
        videoCount: 0,
        subfolderCount: 0,
      },
    }),
  );
});

// ─── PATCH /api/v1/folders/:id ─────────────────────────────────────────────

router.patch('/:id', validate(UpdateFolderSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const existing = await prisma.folder.findFirst({ where: { id, userId } });
  if (!existing) {
    res.status(404).json(buildApiError('Folder not found', 'NOT_FOUND'));
    return;
  }

  const { name, color, icon, description } = req.body as {
    name?: string;
    color?: string | null;
    icon?: string | null;
    description?: string | null;
  };

  const folder = await prisma.folder.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon }),
      ...(description !== undefined && { description }),
    },
  });

  res.json(
    buildApiSuccess({
      folder: {
        ...folder,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
      },
    }),
  );
});

// ─── DELETE /api/v1/folders/:id ────────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const existing = await prisma.folder.findFirst({ where: { id, userId } });
  if (!existing) {
    res.status(404).json(buildApiError('Folder not found', 'NOT_FOUND'));
    return;
  }

  // Cascade delete handled by Prisma/DB (children + videos)
  await prisma.folder.delete({ where: { id } });

  res.json(buildApiSuccess({ message: 'Folder deleted' }));
});

// ─── PATCH /api/v1/folders/:id/move ────────────────────────────────────────

router.patch('/:id/move', validate(MoveFolderSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  const { newParentId } = req.body as { newParentId: string | null };

  const folder = await prisma.folder.findFirst({ where: { id, userId } });
  if (!folder) {
    res.status(404).json(buildApiError('Folder not found', 'NOT_FOUND'));
    return;
  }

  // Prevent moving to own descendant
  if (newParentId) {
    let checkId: string | null = newParentId;
    while (checkId) {
      if (checkId === id) {
        res.status(400).json(buildApiError('Cannot move folder into its own subfolder', 'INVALID_MOVE'));
        return;
      }
      const parent = await prisma.folder.findUnique({
        where: { id: checkId },
        select: { parentId: true },
      });
      checkId = parent?.parentId ?? null;
    }

    // Check destination parent belongs to user
    const parent = await prisma.folder.findFirst({ where: { id: newParentId, userId } });
    if (!parent) {
      res.status(404).json(buildApiError('Destination folder not found', 'NOT_FOUND'));
      return;
    }

    // Check depth
    const depth = await getFolderDepth(newParentId);
    if (depth >= MAX_FOLDER_DEPTH - 1) {
      res
        .status(400)
        .json(buildApiError(`Maximum folder depth of ${MAX_FOLDER_DEPTH} exceeded`, 'MAX_DEPTH_EXCEEDED'));
      return;
    }
  }

  const updated = await prisma.folder.update({
    where: { id },
    data: { parentId: newParentId },
  });

  res.json(
    buildApiSuccess({
      folder: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    }),
  );
});

// ─── PATCH /api/v1/folders/reorder ─────────────────────────────────────────

router.patch('/reorder', validate(ReorderFoldersSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { orderedIds } = req.body as { orderedIds: string[] };

  // Verify all folders belong to user
  const folders = await prisma.folder.findMany({
    where: { id: { in: orderedIds }, userId },
    select: { id: true },
  });

  if (folders.length !== orderedIds.length) {
    res.status(400).json(buildApiError('One or more folders not found', 'NOT_FOUND'));
    return;
  }

  // Update sort orders in a transaction
  await prisma.$transaction(
    orderedIds.map((folderId, index) =>
      prisma.folder.update({
        where: { id: folderId },
        data: { sortOrder: index },
      }),
    ),
  );

  res.json(buildApiSuccess({ message: 'Folders reordered' }));
});

export default router;
