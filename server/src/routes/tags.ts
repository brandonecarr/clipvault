import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { UpdateTagSchema, TagAutocompleteSchema, buildApiSuccess, buildApiError, normalizeTag } from '@clipvault/shared';

const router = Router();
router.use(requireAuth);

// GET /api/v1/tags — list all tags with video count
router.get('/', async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;

  const tags = await prisma.tag.findMany({
    where: { userId },
    include: { _count: { select: { videos: true } } },
    orderBy: { name: 'asc' },
  });

  res.json(
    buildApiSuccess({
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        userId: t.userId,
        videoCount: t._count.videos,
      })),
    }),
  );
});

// GET /api/v1/tags/autocomplete?q=
router.get(
  '/autocomplete',
  validate(TagAutocompleteSchema, 'query'),
  async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const { q, limit } = req.query as { q: string; limit: string };

    const tags = await prisma.tag.findMany({
      where: {
        userId,
        name: { contains: q.toLowerCase(), mode: 'insensitive' },
      },
      take: parseInt(String(limit), 10) || 10,
      orderBy: { name: 'asc' },
      include: { _count: { select: { videos: true } } },
    });

    res.json(
      buildApiSuccess({
        tags: tags.map((t) => ({
          id: t.id,
          name: t.name,
          userId: t.userId,
          videoCount: t._count.videos,
        })),
      }),
    );
  },
);

// PATCH /api/v1/tags/:id — rename tag
router.patch('/:id', validate(UpdateTagSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  const { name } = req.body as { name: string };

  const existing = await prisma.tag.findFirst({ where: { id, userId } });
  if (!existing) {
    res.status(404).json(buildApiError('Tag not found', 'NOT_FOUND'));
    return;
  }

  const normalized = normalizeTag(name);

  // Check for name collision
  const collision = await prisma.tag.findFirst({
    where: { userId, name: normalized, NOT: { id } },
  });
  if (collision) {
    res.status(409).json(buildApiError('A tag with this name already exists', 'CONFLICT'));
    return;
  }

  const tag = await prisma.tag.update({
    where: { id },
    data: { name: normalized },
  });

  res.json(buildApiSuccess({ tag }));
});

// DELETE /api/v1/tags/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const existing = await prisma.tag.findFirst({ where: { id, userId } });
  if (!existing) {
    res.status(404).json(buildApiError('Tag not found', 'NOT_FOUND'));
    return;
  }

  await prisma.tag.delete({ where: { id } });

  res.json(buildApiSuccess({ message: 'Tag deleted' }));
});

export default router;
