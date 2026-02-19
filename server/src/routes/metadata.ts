import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { extractMetadata } from '../services/metadataExtractor.js';
import { ExtractMetadataSchema, buildApiSuccess, buildApiError } from '@clipvault/shared';

const router = Router();

// Rate limit metadata extraction to prevent abuse
const extractRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { data: null, error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/v1/meta/extract
router.post(
  '/extract',
  requireAuth,
  extractRateLimit,
  validate(ExtractMetadataSchema),
  async (req: Request, res: Response) => {
    const { url } = req.body as { url: string };

    try {
      const metadata = await extractMetadata(url);
      res.json(buildApiSuccess({ metadata }));
    } catch (err) {
      console.error('[Metadata] Extraction error:', err);
      res.status(500).json(buildApiError('Failed to extract metadata from URL', 'EXTRACTION_FAILED'));
    }
  },
);

export default router;
