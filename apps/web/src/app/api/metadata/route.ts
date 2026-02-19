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

// YouTube's internal Innertube API — the same endpoint the YouTube web client
// uses. Works reliably from cloud/server environments where oEmbed returns 401.
async function tryYouTubeInnertube(
  videoId: string,
): Promise<{ title: string | null; author: string | null; thumbnail: string | null }> {
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/player', {
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
          client: {
            hl: 'en',
            gl: 'US',
            clientName: 'WEB',
            clientVersion: '2.20231121.08.00',
          },
        },
        videoId,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { title: null, author: null, thumbnail: null };
    const data = await res.json();
    const details = data?.videoDetails;
    if (!details) return { title: null, author: null, thumbnail: null };

    // Pick the highest-res thumbnail available
    const thumbs: { url: string; width?: number }[] =
      details.thumbnail?.thumbnails ?? [];
    const thumbnail =
      thumbs.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;

    return {
      title: details.title || null,
      author: details.author || null,
      thumbnail,
    };
  } catch {
    return { title: null, author: null, thumbnail: null };
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
      `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;

    return NextResponse.json({
      platform,
      title,
      description: null,
      thumbnailUrl: thumbnail,
      duration: oEmbed?.duration ?? null,
      authorName: innertube.author || oEmbed?.author_name || null,
      authorUrl: oEmbed?.author_url || null,
    });
  }

  // ── Other oEmbed platforms ─────────────────────────────────────────────────
  let oEmbed: OEmbedResponse | null = null;
  if (platform === 'VIMEO') {
    oEmbed = await tryOEmbed(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
    );
  } else if (platform === 'TIKTOK') {
    oEmbed = await tryOEmbed(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
    );
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
