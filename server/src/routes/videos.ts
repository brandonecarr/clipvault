import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { extractMetadata } from '../services/metadataExtractor.js';
import { cacheThumbnail, deleteThumbnail } from '../services/thumbnailCache.js';
import {
  CreateVideoSchema,
  UpdateVideoSchema,
  MoveVideoSchema,
  BulkMoveVideosSchema,
  SearchQuerySchema,
  PaginationSchema,
  buildApiSuccess,
  buildApiError,
  normalizeUrl,
  normalizeTag,
  encodeCursor,
  decodeCursor,
} from '@clipvault/shared';

const router = Router();
router.use(requireAuth);

// ─── GET /api/v1/videos/search ──────────────────────────────────────────────

router.get('/search', validate(SearchQuerySchema, 'query'), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { q, limit } = req.query as { q: string; limit: string };

  const parsedLimit = parseInt(String(limit), 10) || 20;

  // Use the SQL function we defined in the migration
  const results = await prisma.$queryRaw<
    Array<{ result_type: string; id: string; title: string | null; subtitle: string | null; rank: number }>
  >`SELECT * FROM search_content(${userId}, ${q}, ${parsedLimit})`;

  const folderIds = results.filter((r) => r.result_type === 'folder').map((r) => r.id);
  const videoIds = results.filter((r) => r.result_type === 'video').map((r) => r.id);

  const [folders, videos] = await Promise.all([
    folderIds.length > 0
      ? prisma.folder.findMany({
          where: { id: { in: folderIds }, userId },
          include: { _count: { select: { videos: true, children: true } } },
        })
      : [],
    videoIds.length > 0
      ? prisma.video.findMany({
          where: { id: { in: videoIds }, userId },
          include: { tags: true },
        })
      : [],
  ]);

  res.json(
    buildApiSuccess({
      query: q,
      folders: folders.map((f) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
        videoCount: f._count.videos,
        subfolderCount: f._count.children,
      })),
      videos: videos.map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      })),
    }),
  );
});

// ─── GET /api/v1/folders/:folderId/videos ──────────────────────────────────
// (registered in folders router, but implemented here for co-location)

export async function getFolderVideos(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthenticatedRequest;
  const { folderId } = req.params;
  const { limit, cursor, sortBy, sortDir } = req.query as {
    limit?: string;
    cursor?: string;
    sortBy?: string;
    sortDir?: string;
  };

  const parsedLimit = Math.min(parseInt(String(limit), 10) || 20, 100);

  // Verify folder access
  const folder = await prisma.folder.findFirst({ where: { id: folderId, userId } });
  if (!folder) {
    res.status(404).json(buildApiError('Folder not found', 'NOT_FOUND'));
    return;
  }

  const orderField = (sortBy as 'createdAt' | 'title' | 'sortOrder') || 'createdAt';
  const orderDir = (sortDir as 'asc' | 'desc') || 'desc';

  // Cursor-based pagination
  let cursorFilter = {};
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      cursorFilter = {
        cursor: { id: decoded.id },
        skip: 1,
      };
    }
  }

  const videos = await prisma.video.findMany({
    where: { folderId, userId },
    orderBy: { [orderField]: orderDir },
    take: parsedLimit + 1,
    include: { tags: true },
    ...cursorFilter,
  });

  const hasMore = videos.length > parsedLimit;
  const items = hasMore ? videos.slice(0, parsedLimit) : videos;
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.id, lastItem.createdAt.toISOString()) : null;

  res.json(
    buildApiSuccess({
      videos: items.map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      })),
      nextCursor,
      hasMore,
    }),
  );
}

// ─── POST /api/v1/videos ────────────────────────────────────────────────────

router.post('/', validate(CreateVideoSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { url: rawUrl, folderId, notes, tags } = req.body as {
    url: string;
    folderId: string;
    notes?: string | null;
    tags?: string[];
  };

  const url = normalizeUrl(rawUrl);

  // Verify folder access
  const folder = await prisma.folder.findFirst({ where: { id: folderId, userId } });
  if (!folder) {
    res.status(404).json(buildApiError('Folder not found', 'NOT_FOUND'));
    return;
  }

  // Check for duplicate
  const existing = await prisma.video.findFirst({ where: { userId, url } });
  if (existing) {
    res.status(409).json(buildApiError('This video is already saved to your library', 'DUPLICATE'));
    return;
  }

  // Extract metadata
  const metadata = await extractMetadata(url);

  // Get next sort order
  const maxOrder = await prisma.video.aggregate({
    where: { folderId, userId },
    _max: { sortOrder: true },
  });

  // Create the video record first (so we have an ID for the thumbnail path)
  const { data: videoId } = await prisma.$transaction(async (tx) => {
    // Create/find tags
    const tagRecords = await Promise.all(
      (tags ?? []).map(async (tagName) => {
        const normalized = normalizeTag(tagName);
        return tx.tag.upsert({
          where: { userId_name: { userId, name: normalized } },
          create: { name: normalized, userId },
          update: {},
        });
      }),
    );

    const video = await tx.video.create({
      data: {
        url,
        platform: metadata.platform,
        title: metadata.title,
        description: metadata.description,
        thumbnailUrl: null, // Will update after caching
        originalThumb: metadata.thumbnailUrl,
        duration: metadata.duration,
        authorName: metadata.authorName,
        authorUrl: metadata.authorUrl,
        notes: notes ?? null,
        folderId,
        userId,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        tags: { connect: tagRecords.map((t) => ({ id: t.id })) },
      },
      include: { tags: true },
    });

    return { data: video.id };
  });

  // Cache thumbnail in background (don't await — respond quickly)
  if (metadata.thumbnailUrl) {
    cacheThumbnail(metadata.thumbnailUrl, userId, videoId).then(async (cachedUrl) => {
      if (cachedUrl) {
        await prisma.video.update({
          where: { id: videoId },
          data: { thumbnailUrl: cachedUrl },
        });
      }
    });
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { tags: true },
  });

  res.status(201).json(
    buildApiSuccess({
      video: video
        ? {
            ...video,
            thumbnailUrl: video.thumbnailUrl ?? metadata.thumbnailUrl,
            createdAt: video.createdAt.toISOString(),
            updatedAt: video.updatedAt.toISOString(),
          }
        : null,
    }),
  );
});

// ─── PATCH /api/v1/videos/:id ───────────────────────────────────────────────

router.patch('/:id', validate(UpdateVideoSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  const { folderId, notes, tags, sortOrder } = req.body as {
    folderId?: string;
    notes?: string | null;
    tags?: string[];
    sortOrder?: number;
  };

  const existing = await prisma.video.findFirst({ where: { id, userId } });
  if (!existing) {
    res.status(404).json(buildApiError('Video not found', 'NOT_FOUND'));
    return;
  }

  if (folderId) {
    const folder = await prisma.folder.findFirst({ where: { id: folderId, userId } });
    if (!folder) {
      res.status(404).json(buildApiError('Target folder not found', 'NOT_FOUND'));
      return;
    }
  }

  // Handle tag updates
  let tagConnect: { id: string }[] | undefined;
  if (tags !== undefined) {
    const tagRecords = await Promise.all(
      tags.map(async (tagName) => {
        const normalized = normalizeTag(tagName);
        return prisma.tag.upsert({
          where: { userId_name: { userId, name: normalized } },
          create: { name: normalized, userId },
          update: {},
        });
      }),
    );
    tagConnect = tagRecords.map((t) => ({ id: t.id }));
  }

  const video = await prisma.video.update({
    where: { id },
    data: {
      ...(folderId !== undefined && { folderId }),
      ...(notes !== undefined && { notes }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(tagConnect !== undefined && {
        tags: { set: tagConnect },
      }),
    },
    include: { tags: true },
  });

  res.json(
    buildApiSuccess({
      video: {
        ...video,
        createdAt: video.createdAt.toISOString(),
        updatedAt: video.updatedAt.toISOString(),
      },
    }),
  );
});

// ─── DELETE /api/v1/videos/:id ──────────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const existing = await prisma.video.findFirst({ where: { id, userId } });
  if (!existing) {
    res.status(404).json(buildApiError('Video not found', 'NOT_FOUND'));
    return;
  }

  await prisma.video.delete({ where: { id } });

  // Delete cached thumbnail in background
  deleteThumbnail(userId, id).catch(console.error);

  res.json(buildApiSuccess({ message: 'Video deleted' }));
});

// ─── PATCH /api/v1/videos/:id/move ─────────────────────────────────────────

router.patch('/:id/move', validate(MoveVideoSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  const { newFolderId } = req.body as { newFolderId: string };

  const [video, folder] = await Promise.all([
    prisma.video.findFirst({ where: { id, userId } }),
    prisma.folder.findFirst({ where: { id: newFolderId, userId } }),
  ]);

  if (!video) {
    res.status(404).json(buildApiError('Video not found', 'NOT_FOUND'));
    return;
  }
  if (!folder) {
    res.status(404).json(buildApiError('Destination folder not found', 'NOT_FOUND'));
    return;
  }

  const updated = await prisma.video.update({
    where: { id },
    data: { folderId: newFolderId },
    include: { tags: true },
  });

  res.json(
    buildApiSuccess({
      video: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    }),
  );
});

// ─── POST /api/v1/videos/bulk-move ─────────────────────────────────────────

router.post('/bulk-move', validate(BulkMoveVideosSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { videoIds, newFolderId } = req.body as { videoIds: string[]; newFolderId: string };

  const folder = await prisma.folder.findFirst({ where: { id: newFolderId, userId } });
  if (!folder) {
    res.status(404).json(buildApiError('Destination folder not found', 'NOT_FOUND'));
    return;
  }

  const result = await prisma.video.updateMany({
    where: { id: { in: videoIds }, userId },
    data: { folderId: newFolderId },
  });

  res.json(buildApiSuccess({ movedCount: result.count }));
});

export default router;
