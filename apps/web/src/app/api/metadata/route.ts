import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

type Platform =
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'PINTEREST'
  | 'X_TWITTER'
  | 'VIMEO'
  | 'REDDIT'
  | 'OTHER';

function detectPlatform(url: string): Platform {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'YOUTUBE';
  if (/tiktok\.com/i.test(url)) return 'TIKTOK';
  if (/instagram\.com/i.test(url)) return 'INSTAGRAM';
  if (/facebook\.com|fb\.com/i.test(url)) return 'FACEBOOK';
  if (/pinterest\.com|pin\.it/i.test(url)) return 'PINTEREST';
  if (/twitter\.com|x\.com/i.test(url)) return 'X_TWITTER';
  if (/vimeo\.com/i.test(url)) return 'VIMEO';
  if (/reddit\.com/i.test(url)) return 'REDDIT';
  return 'OTHER';
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  duration?: number;
}

async function tryOEmbed(oEmbedUrl: string): Promise<OEmbedResponse | null> {
  try {
    const res = await fetch(oEmbedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Use separate double/single-quote patterns so apostrophes in content don't
// prematurely end the capture (e.g. "Don't stop" with double-quoted attribute).
function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content="([^"]*)"`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+content="([^"]*)"[^>]+(?:property|name)=["']${property}["']`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content='([^']*)'`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+content='([^']*)'[^>]+(?:property|name)=["']${property}["']`,
      'i',
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

// Strip trailing " - YouTube", " | YouTube", etc. from scraped page titles.
function cleanTitle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.replace(/\s*[-–|]\s*(YouTube|TikTok|Instagram|Vimeo|Reddit)\s*$/i, '').trim() || null;
}

async function tryOpenGraph(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const rawTitle =
      extractMeta(html, 'og:title') ||
      extractMeta(html, 'twitter:title') ||
      extractTitle(html);
    return {
      title: cleanTitle(rawTitle),
      description:
        extractMeta(html, 'og:description') || extractMeta(html, 'twitter:description'),
      thumbnailUrl: extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image'),
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  const platform = detectPlatform(url);
  const ytId = platform === 'YOUTUBE' ? extractYouTubeId(url) : null;

  // Try oEmbed for supported platforms
  let oEmbed: OEmbedResponse | null = null;
  if (platform === 'YOUTUBE') {
    oEmbed = await tryOEmbed(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    );
  } else if (platform === 'VIMEO') {
    oEmbed = await tryOEmbed(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
    );
  } else if (platform === 'TIKTOK') {
    oEmbed = await tryOEmbed(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
    );
  }

  if (oEmbed) {
    // oEmbed succeeded — use its data, with YouTube thumbnail fallback
    const thumbnail =
      oEmbed.thumbnail_url ??
      (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
    return NextResponse.json({
      platform,
      title: oEmbed.title ?? null,
      description: null,
      thumbnailUrl: thumbnail,
      duration: oEmbed.duration ?? null,
      authorName: oEmbed.author_name ?? null,
      authorUrl: oEmbed.author_url ?? null,
    });
  }

  // Fall back to Open Graph scraping
  const og = await tryOpenGraph(url);
  // For YouTube, always guarantee a thumbnail via the known ytimg URL
  const thumbnail =
    og?.thumbnailUrl ?? (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);

  return NextResponse.json({
    platform,
    title: og?.title ?? null,
    description: og?.description ?? null,
    thumbnailUrl: thumbnail,
    duration: null,
    authorName: null,
    authorUrl: null,
  });
}
