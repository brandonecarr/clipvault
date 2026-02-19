import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth.js';
import foldersRouter from './routes/folders.js';
import videosRouter from './routes/videos.js';
import metadataRouter from './routes/metadata.js';
import tagsRouter from './routes/tags.js';
import { getFolderVideos } from './routes/videos.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ─── Security middleware ────────────────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: [
      'http://localhost:3000', // web app
      'http://localhost:8081', // Expo dev server
      'clipvault://',          // mobile deep link scheme
      ...(process.env.ALLOWED_ORIGINS?.split(',') ?? []),
    ],
    credentials: true,
  }),
);

// Global rate limit
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ─── Body parsing ───────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Health check ───────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/folders', foldersRouter);
app.use('/api/v1/videos', videosRouter);
app.use('/api/v1/meta', metadataRouter);
app.use('/api/v1/tags', tagsRouter);

// Videos within a folder (nested route)
app.get('/api/v1/folders/:folderId/videos', requireAuth, getFolderVideos);

// ─── Error handling ──────────────────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

// ─── Start server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[ClipVault Server] Running on http://localhost:${PORT}`);
  console.log(`[ClipVault Server] Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;
