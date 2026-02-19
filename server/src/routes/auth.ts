import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { SignupSchema, LoginSchema, buildApiSuccess, buildApiError } from '@clipvault/shared';

const router = Router();

// POST /api/v1/auth/signup
router.post('/signup', validate(SignupSchema), async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body as {
    email: string;
    password: string;
    displayName?: string;
  };

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { displayName },
  });

  if (authError || !authData.user) {
    const message = authError?.message ?? 'Failed to create account';
    if (message.includes('already registered')) {
      res.status(409).json(buildApiError('Email already registered', 'EMAIL_TAKEN'));
      return;
    }
    res.status(400).json(buildApiError(message, 'SIGNUP_FAILED'));
    return;
  }

  // Upsert user in our DB
  const user = await prisma.user.upsert({
    where: { id: authData.user.id },
    create: {
      id: authData.user.id,
      email,
      displayName: displayName ?? null,
    },
    update: { email, displayName: displayName ?? null },
  });

  // Sign the user in to get a session
  const { data: session, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (sessionError || !session.session) {
    res.status(201).json(buildApiSuccess({ user, session: null }));
    return;
  }

  res.status(201).json(
    buildApiSuccess({
      user,
      session: {
        accessToken: session.session.access_token,
        refreshToken: session.session.refresh_token,
        expiresAt: session.session.expires_at,
      },
    }),
  );
});

// POST /api/v1/auth/login
router.post('/login', validate(LoginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    res.status(401).json(buildApiError('Invalid email or password', 'INVALID_CREDENTIALS'));
    return;
  }

  // Ensure user exists in our DB (may have been created via OAuth elsewhere)
  const user = await prisma.user.upsert({
    where: { id: data.user.id },
    create: {
      id: data.user.id,
      email: data.user.email ?? email,
      displayName: (data.user.user_metadata?.displayName as string) ?? null,
      avatarUrl: (data.user.user_metadata?.avatar_url as string) ?? null,
    },
    update: {
      email: data.user.email ?? email,
    },
  });

  res.json(
    buildApiSuccess({
      user,
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
    }),
  );
});

// POST /api/v1/auth/logout
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  const { accessToken } = req as AuthenticatedRequest;

  await supabaseAdmin.auth.admin.signOut(accessToken);
  res.json(buildApiSuccess({ message: 'Logged out successfully' }));
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    res.status(404).json(buildApiError('User not found', 'NOT_FOUND'));
    return;
  }

  res.json(buildApiSuccess({ user }));
});

// PATCH /api/v1/auth/me — update profile
router.patch('/me', requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { displayName, avatarUrl } = req.body as {
    displayName?: string;
    avatarUrl?: string;
  };

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(displayName !== undefined && { displayName }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    },
  });

  res.json(buildApiSuccess({ user }));
});

// POST /api/v1/auth/refresh — refresh session token
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    res.status(400).json(buildApiError('Refresh token required', 'VALIDATION_ERROR'));
    return;
  }

  const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session) {
    res.status(401).json(buildApiError('Invalid or expired refresh token', 'UNAUTHORIZED'));
    return;
  }

  res.json(
    buildApiSuccess({
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
    }),
  );
});

export default router;
