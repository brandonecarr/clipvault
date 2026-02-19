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
      headers: { 'User-Agent': 'ClipVault/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
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

async function tryOpenGraph(url: string) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ClipVault/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return {
      title: extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || extractTitle(html),
      description: extractMeta(html, 'og:description') || extractMeta(html, 'twitter:description'),
      thumbnailUrl: extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image'),
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    return NextResponse.json({
      platform,
      title: oEmbed.title ?? null,
      description: null,
      thumbnailUrl: oEmbed.thumbnail_url ?? null,
      duration: oEmbed.duration ?? null,
      authorName: oEmbed.author_name ?? null,
      authorUrl: oEmbed.author_url ?? null,
    });
  }

  // Fall back to Open Graph scraping
  const og = await tryOpenGraph(url);
  return NextResponse.json({
    platform,
    title: og?.title ?? null,
    description: og?.description ?? null,
    thumbnailUrl: og?.thumbnailUrl ?? null,
    duration: null,
    authorName: null,
    authorUrl: null,
  });
}
