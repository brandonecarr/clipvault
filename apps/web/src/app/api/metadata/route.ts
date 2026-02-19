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

// Extract title from JSON-LD structured data.
function extractJsonLdTitle(html: string): string | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const title = data.name || data.headline;
      if (title && typeof title === 'string') return title;
    } catch { /* skip malformed blocks */ }
  }
  return null;
}

// YouTube embeds video details in ytInitialPlayerResponse inside the page HTML.
// The pattern "videoId":"...","title":"..." is reliable across YouTube layouts.
function extractYouTubePageTitle(html: string): string | null {
  // ytInitialPlayerResponse.videoDetails.title
  const m = html.match(/"videoId"\s*:\s*"[A-Za-z0-9_-]{11}"\s*,\s*"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (m) {
    return m[1]
      .replace(/\\u([\da-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\n/g, ' ')
      .replace(/\\\\/g, '\\')
      .replace(/\\"/g, '"')
      .trim();
  }
  return null;
}

// Decode common HTML entities in scraped text (e.g. &amp; → &).
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

// Strip trailing " - YouTube", " | YouTube", etc. from scraped page titles.
function cleanTitle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const decoded = decodeHtmlEntities(raw);
  return decoded.replace(/\s*[-–|]\s*(YouTube|TikTok|Instagram|Vimeo|Reddit)\s*$/i, '').trim() || null;
}

async function tryOpenGraph(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        // Bypass YouTube/Google cookie consent gates
        Cookie: 'CONSENT=YES+1; SOCS=CAI',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Title priority:
    //   og:title            — standard OG tag
    //   twitter:title       — Twitter card fallback
    //   name="title"        — YouTube uses <meta name="title"> (NOT og:title)
    //   JSON-LD             — structured data blocks
    //   ytInitialPlayerResponse — YouTube page-embedded video details JSON
    //   <title>             — last-resort page title (will strip " - YouTube" suffix)
    const rawTitle =
      extractMeta(html, 'og:title') ||
      extractMeta(html, 'twitter:title') ||
      extractMeta(html, 'title') ||
      extractJsonLdTitle(html) ||
      extractYouTubePageTitle(html) ||
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

  // Try oEmbed for supported platforms.
  // For YouTube, run the official endpoint and noembed.com in parallel —
  // noembed.com is a widely-used proxy that often succeeds when the direct
  // endpoint is slow or blocked from cloud environments.
  let oEmbed: OEmbedResponse | null = null;

  if (platform === 'YOUTUBE') {
    const canonicalUrl = ytId
      ? `https://www.youtube.com/watch?v=${ytId}`
      : url;

    const [official, proxy] = await Promise.all([
      tryOEmbed(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`),
      tryOEmbed(`https://noembed.com/embed?url=${encodeURIComponent(canonicalUrl)}`),
    ]);

    // Pick whichever gave us a title; prefer official, fall back to proxy
    oEmbed = (official?.title ? official : null) ?? (proxy?.title ? proxy : null) ?? official ?? proxy;
  } else if (platform === 'VIMEO') {
    oEmbed = await tryOEmbed(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
    );
  } else if (platform === 'TIKTOK') {
    oEmbed = await tryOEmbed(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
    );
  }

  // If oEmbed returned a non-empty title, use it straight away.
  // Otherwise fall through to OG scraping for a second attempt at the title.
  if (oEmbed?.title) {
    const thumbnail =
      oEmbed.thumbnail_url ||
      (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
    return NextResponse.json({
      platform,
      title: cleanTitle(oEmbed.title) || oEmbed.title,
      description: null,
      thumbnailUrl: thumbnail,
      duration: oEmbed.duration ?? null,
      authorName: oEmbed.author_name || null,
      authorUrl: oEmbed.author_url || null,
    });
  }

  // Fall back to Open Graph + page scraping (includes YouTube-specific extractors).
  const og = await tryOpenGraph(url);

  const thumbnail =
    og?.thumbnailUrl ||
    oEmbed?.thumbnail_url ||
    (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);

  return NextResponse.json({
    platform,
    title: og?.title || null,
    description: og?.description || null,
    thumbnailUrl: thumbnail,
    duration: oEmbed?.duration ?? null,
    authorName: oEmbed?.author_name || null,
    authorUrl: oEmbed?.author_url || null,
  });
}
