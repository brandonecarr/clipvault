import { detectPlatform, extractYouTubeVideoId } from '@clipvault/shared';
import type { VideoMetadata, Platform } from '@clipvault/shared';
import { OEMBED_ENDPOINTS } from '@clipvault/shared';
import ogs from 'open-graph-scraper';

// ─── oEmbed extraction ──────────────────────────────────────────────────────

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  duration?: number;
  description?: string;
  type?: string;
}

async function tryOEmbed(url: string, platform: Platform): Promise<VideoMetadata | null> {
  const endpointTemplate = OEMBED_ENDPOINTS[platform];
  if (!endpointTemplate) return null;

  const endpoint = endpointTemplate.replace('{url}', encodeURIComponent(url));

  try {
    const response = await fetch(endpoint, {
      headers: { 'User-Agent': 'ClipVault/1.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as OEmbedResponse;

    return {
      title: data.title ?? null,
      description: data.description ?? null,
      thumbnailUrl: data.thumbnail_url ?? null,
      duration: data.duration ?? null,
      authorName: data.author_name ?? null,
      authorUrl: data.author_url ?? null,
      platform,
    };
  } catch {
    return null;
  }
}

// ─── Open Graph extraction ──────────────────────────────────────────────────

async function tryOpenGraph(url: string, platform: Platform): Promise<VideoMetadata | null> {
  try {
    const { result, error } = await ogs({
      url,
      timeout: 8000,
      fetchOptions: {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; ClipVaultBot/1.0; +https://clipvault.app)',
        },
      },
    });

    if (error || !result) return null;

    // Extract duration from meta tags (varies by platform)
    let duration: number | null = null;
    if (result.ogVideoDuration) {
      duration = parseInt(String(result.ogVideoDuration), 10) || null;
    }

    const thumbnailUrl =
      result.ogImage?.[0]?.url ??
      result.twitterImage?.[0]?.url ??
      null;

    return {
      title: result.ogTitle ?? result.twitterTitle ?? null,
      description: result.ogDescription ?? result.twitterDescription ?? null,
      thumbnailUrl,
      duration,
      authorName: result.author ?? null,
      authorUrl: null,
      platform,
    };
  } catch {
    return null;
  }
}

// ─── YouTube-specific: direct thumbnail URL ─────────────────────────────────

function getYouTubeDirectMetadata(url: string): Partial<VideoMetadata> | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  return {
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    platform: 'YOUTUBE',
  };
}

// ─── Main extraction function ───────────────────────────────────────────────

export async function extractMetadata(url: string): Promise<VideoMetadata> {
  const platform = detectPlatform(url);

  // For YouTube, we can construct the thumbnail URL directly as a fallback
  const youtubeFallback = platform === 'YOUTUBE' ? getYouTubeDirectMetadata(url) : null;

  // 1. Try oEmbed (highest quality, structured data)
  const oembedResult = await tryOEmbed(url, platform);
  if (oembedResult) {
    // If oEmbed didn't return a thumbnail but we have YouTube ID, use that
    if (!oembedResult.thumbnailUrl && youtubeFallback?.thumbnailUrl) {
      oembedResult.thumbnailUrl = youtubeFallback.thumbnailUrl;
    }
    return oembedResult;
  }

  // 2. Fall back to Open Graph scraping
  const ogResult = await tryOpenGraph(url, platform);
  if (ogResult) {
    if (!ogResult.thumbnailUrl && youtubeFallback?.thumbnailUrl) {
      ogResult.thumbnailUrl = youtubeFallback.thumbnailUrl;
    }
    return ogResult;
  }

  // 3. Minimal fallback — return what we know from the URL itself
  return {
    title: null,
    description: null,
    thumbnailUrl: youtubeFallback?.thumbnailUrl ?? null,
    duration: null,
    authorName: null,
    authorUrl: null,
    platform,
  };
}
