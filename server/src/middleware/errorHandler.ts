import type { Request, Response, NextFunction } from 'express';
import { buildApiError } from '@clipvault/shared';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[Error]', err.message, err.stack);

  // Prisma unique constraint violation
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as Error & { code: string };
    if (prismaErr.code === 'P2002') {
      res.status(409).json(buildApiError('This item already exists', 'CONFLICT'));
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json(buildApiError('Resource not found', 'NOT_FOUND'));
      return;
    }
  }

  res.status(500).json(buildApiError('Internal server error', 'INTERNAL_ERROR'));
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json(buildApiError('Route not found', 'NOT_FOUND'));
}
