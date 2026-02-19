import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter (20 req / user / minute).
// Sufficient for single-instance / Vercel edge deployments.
// Replace the Map with a Redis/Upstash store for multi-instance production.
// ---------------------------------------------------------------------------
const rlStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const LIMIT = 20;
  const WINDOW = 60_000; // 1 minute
  const now = Date.now();
  let entry = rlStore.get(key);
  if (!entry || entry.resetAt <= now) {
    rlStore.set(key, { count: 1, resetAt: now + WINDOW });
    return { allowed: true };
  }
  if (entry.count >= LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// SSRF guard — reject private/loopback IPs and non-HTTPS schemes.
// ---------------------------------------------------------------------------
const PRIVATE_HOST_RE =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc00:|fd)/i;

function validateUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    return { ok: false, error: 'Only HTTP(S) URLs are allowed' };
  }
  if (PRIVATE_HOST_RE.test(url.hostname)) {
    return { ok: false, error: 'URL not allowed' };
  }
  if (raw.length > 2048) {
    return { ok: false, error: 'URL too long' };
  }
  return { ok: true, url };
}

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// YouTube Innertube — same endpoint the YouTube web client uses.
// Key is the public web-client key embedded in youtube.com; store in env to
// centralise rotation: YOUTUBE_INNERTUBE_KEY in .env.local
// ---------------------------------------------------------------------------
const YT_KEY =
  process.env.YOUTUBE_INNERTUBE_KEY ??
  'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'; // fallback; set env var to rotate

async function tryYouTubeInnertube(
  videoId: string,
): Promise<{ title: string | null; author: string | null; thumbnail: string | null; duration: number | null }> {
  try {
    const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${YT_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-YouTube-Client-Name': '1',
        'X-YouTube-Client-Version': '2.20231121.08.00',
        Origin: 'https://www.youtube.com',
        Referer: 'https://www.youtube.com/',
      },
      body: JSON.stringify({
        context: {
          client: { hl: 'en', gl: 'US', clientName: 'WEB', clientVersion: '2.20231121.08.00' },
        },
        videoId,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { title: null, author: null, thumbnail: null, duration: null };
    const data = await res.json();
    const details = data?.videoDetails;
    if (!details) return { title: null, author: null, thumbnail: null, duration: null };

    const thumbs: { url: string; width?: number }[] = details.thumbnail?.thumbnails ?? [];
    const thumbnail = thumbs.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;

    return {
      title: details.title || null,
      author: details.author || null,
      thumbnail,
      duration: details.lengthSeconds ? parseInt(details.lengthSeconds, 10) : null,
    };
  } catch {
    return { title: null, author: null, thumbnail: null, duration: null };
  }
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

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content="([^"]*)"`, 'i'),
    new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content='([^']*)'`, 'i'),
    new RegExp(`<meta[^>]+content='([^']*)'[^>]+(?:property|name)=["']${property}["']`, 'i'),
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

function extractYouTubePageTitle(html: string): string | null {
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
        Cookie: 'CONSENT=YES+1; SOCS=CAI',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();

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

// ---------------------------------------------------------------------------
// POST /api/metadata
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate limiting
  const rl = checkRateLimit(user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  // Parse body
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawUrl = body.url?.trim();
  if (!rawUrl) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  // SSRF guard
  const validation = validateUrl(rawUrl);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const url = rawUrl;

  const platform = detectPlatform(url);
  const ytId = platform === 'YOUTUBE' ? extractYouTubeId(url) : null;

  // ── YouTube: Innertube API first, oEmbed fallback ──────────────────────────
  if (platform === 'YOUTUBE' && ytId) {
    const [innertube, oEmbed] = await Promise.all([
      tryYouTubeInnertube(ytId),
      tryOEmbed(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ytId}`)}&format=json`,
      ),
    ]);

    const title = innertube.title || (oEmbed?.title ? cleanTitle(oEmbed.title) || oEmbed.title : null);
    const thumbnail =
      innertube.thumbnail ||
      oEmbed?.thumbnail_url ||
      `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;

    return NextResponse.json({
      platform,
      title,
      description: null,
      thumbnailUrl: thumbnail,
      duration: innertube.duration ?? oEmbed?.duration ?? null,
      authorName: innertube.author || oEmbed?.author_name || null,
      authorUrl: oEmbed?.author_url || null,
    });
  }

  // ── Other oEmbed platforms ─────────────────────────────────────────────────
  let oEmbed: OEmbedResponse | null = null;
  if (platform === 'VIMEO') {
    oEmbed = await tryOEmbed(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
  } else if (platform === 'TIKTOK') {
    oEmbed = await tryOEmbed(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
  }

  if (oEmbed?.title) {
    return NextResponse.json({
      platform,
      title: cleanTitle(oEmbed.title) || oEmbed.title,
      description: null,
      thumbnailUrl: oEmbed.thumbnail_url || null,
      duration: oEmbed.duration ?? null,
      authorName: oEmbed.author_name || null,
      authorUrl: oEmbed.author_url || null,
    });
  }

  // ── Generic OG scraping fallback ───────────────────────────────────────────
  const og = await tryOpenGraph(url);

  return NextResponse.json({
    platform,
    title: og?.title || null,
    description: og?.description || null,
    thumbnailUrl: og?.thumbnailUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null),
    duration: null,
    authorName: null,
    authorUrl: null,
  });
}
