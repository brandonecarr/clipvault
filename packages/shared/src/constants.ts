import type { Platform } from './types.js';

// ─── Limits ────────────────────────────────────────────────────────────────

export const MAX_FOLDER_DEPTH = 5;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_TAG_LENGTH = 32;
export const MAX_FOLDER_NAME_LENGTH = 64;
export const MAX_VIDEO_NOTES_LENGTH = 1000;

// ─── Platform URL patterns ─────────────────────────────────────────────────

export const PLATFORM_PATTERNS: Record<Platform, RegExp[]> = {
  YOUTUBE: [
    /youtube\.com\/watch/,
    /youtu\.be\//,
    /youtube\.com\/shorts/,
    /youtube\.com\/live/,
    /m\.youtube\.com\/watch/,
  ],
  TIKTOK: [
    /tiktok\.com\/@[\w.]+\/video\/\d+/,
    /vm\.tiktok\.com/,
    /vt\.tiktok\.com/,
  ],
  INSTAGRAM: [
    /instagram\.com\/p\//,
    /instagram\.com\/reel\//,
    /instagram\.com\/tv\//,
  ],
  FACEBOOK: [
    /facebook\.com.*\/videos\//,
    /fb\.watch\//,
    /facebook\.com\/watch/,
    /facebook\.com\/reel\//,
  ],
  PINTEREST: [
    /pinterest\.com\/pin\//,
    /pin\.it\//,
  ],
  X_TWITTER: [
    /x\.com\/\w+\/status\//,
    /twitter\.com\/\w+\/status\//,
  ],
  VIMEO: [
    /vimeo\.com\/\d+/,
    /player\.vimeo\.com\/video\//,
  ],
  REDDIT: [
    /reddit\.com\/r\/\w+\/comments\//,
    /v\.redd\.it\//,
  ],
  OTHER: [/.*/],
};

// ─── Platform display info ─────────────────────────────────────────────────

export const PLATFORM_COLORS: Record<Platform, string> = {
  YOUTUBE: '#FF0000',
  TIKTOK: '#010101',
  INSTAGRAM: '#E4405F',
  FACEBOOK: '#1877F2',
  PINTEREST: '#BD081C',
  X_TWITTER: '#000000',
  VIMEO: '#1AB7EA',
  REDDIT: '#FF4500',
  OTHER: '#636E72',
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  YOUTUBE: 'YouTube',
  TIKTOK: 'TikTok',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  PINTEREST: 'Pinterest',
  X_TWITTER: 'X (Twitter)',
  VIMEO: 'Vimeo',
  REDDIT: 'Reddit',
  OTHER: 'Other',
};

// oEmbed endpoint templates (use {url} placeholder)
export const OEMBED_ENDPOINTS: Partial<Record<Platform, string>> = {
  YOUTUBE: 'https://www.youtube.com/oembed?url={url}&format=json',
  VIMEO: 'https://vimeo.com/api/oembed.json?url={url}',
  TIKTOK: 'https://www.tiktok.com/oembed?url={url}',
};

// ─── Design theme tokens ────────────────────────────────────────────────────

export const COLORS = {
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  secondary: '#00CEC9',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#2D3436',
  textSecondary: '#636E72',
  border: '#DFE6E9',
  error: '#FF7675',
  success: '#00B894',
} as const;

// ─── Folder presets ─────────────────────────────────────────────────────────

export const FOLDER_COLOR_PRESETS = [
  '#6C5CE7', // Purple
  '#00CEC9', // Teal
  '#0984E3', // Blue
  '#00B894', // Green
  '#FDCB6E', // Yellow
  '#E17055', // Orange
  '#D63031', // Red
  '#E84393', // Pink
  '#2D3436', // Dark
  '#636E72', // Gray
] as const;
