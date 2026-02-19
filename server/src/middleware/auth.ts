import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { buildApiError } from '@clipvault/shared';

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
  accessToken: string;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json(buildApiError('Missing or invalid authorization header', 'UNAUTHORIZED'));
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json(buildApiError('Invalid or expired token', 'UNAUTHORIZED'));
      return;
    }

    // Attach user info to request
    (req as AuthenticatedRequest).userId = data.user.id;
    (req as AuthenticatedRequest).userEmail = data.user.email ?? '';
    (req as AuthenticatedRequest).accessToken = token;

    next();
  } catch {
    res.status(401).json(buildApiError('Token verification failed', 'UNAUTHORIZED'));
  }
}
