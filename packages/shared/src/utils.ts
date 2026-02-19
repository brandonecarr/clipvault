import { PLATFORM_PATTERNS } from './constants.js';
import type { Platform } from './types.js';

// ─── Platform detection ─────────────────────────────────────────────────────

export function detectPlatform(url: string): Platform {
  // Iterate platforms in priority order (most specific first, OTHER last)
  const platforms: Platform[] = [
    'YOUTUBE',
    'TIKTOK',
    'INSTAGRAM',
    'FACEBOOK',
    'PINTEREST',
    'X_TWITTER',
    'VIMEO',
    'REDDIT',
  ];

  for (const platform of platforms) {
    const patterns = PLATFORM_PATTERNS[platform];
    if (patterns.some((pattern) => pattern.test(url))) {
      return platform;
    }
  }

  return 'OTHER';
}

// ─── Duration formatting ────────────────────────────────────────────────────

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── URL utilities ──────────────────────────────────────────────────────────

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    // Remove tracking params common on social media
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'fbclid',
      'igshid',
      'si', // YouTube sharing
    ];
    trackingParams.forEach((p) => parsed.searchParams.delete(p));
    return parsed.toString();
  } catch {
    return url;
  }
}

// ─── YouTube URL utilities ──────────────────────────────────────────────────

export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?&#]+)/,
    /youtube\.com\/shorts\/([^?&#]+)/,
    /youtube\.com\/live\/([^?&#]+)/,
    /youtube\.com\/embed\/([^?&#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  // maxresdefault is highest quality, fallback to hqdefault
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// ─── Date formatting ────────────────────────────────────────────────────────

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

// ─── API helpers ────────────────────────────────────────────────────────────

export function buildApiSuccess<T>(data: T) {
  return { data, error: null } as const;
}

export function buildApiError(message: string, code: string) {
  return { data: null, error: { message, code } } as const;
}

// ─── Cursor pagination ──────────────────────────────────────────────────────

export function encodeCursor(id: string, date: string): string {
  return Buffer.from(`${id}::${date}`).toString('base64url');
}

export function decodeCursor(cursor: string): { id: string; date: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const [id, date] = decoded.split('::');
    if (!id || !date) return null;
    return { id, date };
  } catch {
    return null;
  }
}

// ─── Tag normalization ──────────────────────────────────────────────────────

export function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
