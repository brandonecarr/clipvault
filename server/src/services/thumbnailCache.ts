import { supabaseAdmin } from '../lib/supabase.js';

const BUCKET = 'thumbnails';

export async function cacheThumbnail(
  thumbnailUrl: string,
  userId: string,
  videoId: string,
): Promise<string | null> {
  try {
    // Fetch the thumbnail image
    const response = await fetch(thumbnailUrl, {
      headers: { 'User-Agent': 'ClipVault/1.0' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') ?? 'image/jpeg';

    // Determine file extension from content-type
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const path = `${userId}/${videoId}.${ext}`;

    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.error('[ThumbnailCache] Upload failed:', error.message);
      return null;
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error('[ThumbnailCache] Error:', err);
    return null;
  }
}

export async function deleteThumbnail(userId: string, videoId: string): Promise<void> {
  const extensions = ['jpg', 'png', 'webp'];
  const paths = extensions.map((ext) => `${userId}/${videoId}.${ext}`);

  await supabaseAdmin.storage.from(BUCKET).remove(paths);
}
