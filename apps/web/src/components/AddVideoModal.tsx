'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: 'YouTube',
  TIKTOK: 'TikTok',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  PINTEREST: 'Pinterest',
  X_TWITTER: 'X / Twitter',
  VIMEO: 'Vimeo',
  REDDIT: 'Reddit',
  OTHER: 'Link',
};

const PLATFORM_COLORS: Record<string, string> = {
  YOUTUBE: '#FF0000',
  TIKTOK: '#010101',
  INSTAGRAM: '#E1306C',
  FACEBOOK: '#1877F2',
  PINTEREST: '#E60023',
  X_TWITTER: '#000000',
  VIMEO: '#1AB7EA',
  REDDIT: '#FF4500',
  OTHER: '#636E72',
};

interface VideoMetadata {
  platform: string;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  authorName: string | null;
  authorUrl: string | null;
}

interface AddVideoModalProps {
  folderId: string;
  userId: string;
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AddVideoModal({ folderId, userId }: AddVideoModalProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [saveError, setSaveError] = useState('');
  const router = useRouter();

  function handleClose() {
    setOpen(false);
    setUrl('');
    setNotes('');
    setMetadata(null);
    setFetchError('');
    setSaveError('');
  }

  async function fetchMetadata(rawUrl: string) {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;
    setFetching(true);
    setFetchError('');
    setMetadata(null);

    try {
      const res = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error || 'Failed to fetch link info');
      } else {
        setMetadata(data);
      }
    } catch {
      setFetchError('Failed to reach server');
    } finally {
      setFetching(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').trim();
    if (pasted) {
      setUrl(pasted);
      setMetadata(null);
      setFetchError('');
      fetchMetadata(pasted);
      e.preventDefault();
    }
  }

  async function handleSave() {
    if (!metadata) return;
    setSaving(true);
    setSaveError('');

    const supabase = createClient();
    const { error } = await supabase.from('Video').insert({
      url: url.trim(),
      platform: metadata.platform,
      title: metadata.title,
      description: metadata.description,
      thumbnailUrl: metadata.thumbnailUrl,
      originalThumb: metadata.thumbnailUrl,
      duration: metadata.duration,
      authorName: metadata.authorName,
      authorUrl: metadata.authorUrl,
      notes: notes.trim() || null,
      folderId,
      userId,
      sortOrder: 0,
    });

    if (error) {
      setSaveError(error.message);
      setSaving(false);
    } else {
      handleClose();
      router.refresh();
    }
    setSaving(false);
  }

  const platformColor = metadata ? (PLATFORM_COLORS[metadata.platform] ?? '#636E72') : '#636E72';
  const platformLabel = metadata ? (PLATFORM_LABELS[metadata.platform] ?? 'Link') : 'Link';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-[#6C5CE7] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5849C8]"
      >
        <span className="text-base leading-none">+</span>
        Add Link
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#2D3436]">Add Link</h2>
              <button
                onClick={handleClose}
                className="text-xl leading-none text-[#636E72] hover:text-[#2D3436]"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* URL input */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#636E72]">URL</label>
                <div className="relative">
                  <input
                    autoFocus
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setMetadata(null);
                      setFetchError('');
                    }}
                    onPaste={handlePaste}
                    placeholder="Paste a link…"
                    className="w-full rounded-xl border border-[#E0E0E0] bg-[#F8F9FA] px-4 py-2.5 pr-10 text-sm text-[#2D3436] outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20"
                  />
                  {fetching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#6C5CE7] border-t-transparent" />
                    </div>
                  )}
                </div>
                {fetchError && (
                  <p className="mt-1.5 text-xs text-red-500">{fetchError}</p>
                )}
              </div>

              {/* Metadata preview */}
              {metadata && (
                <div className="overflow-hidden rounded-xl border border-[#E0E0E0]">
                  {metadata.thumbnailUrl && (
                    <img
                      src={metadata.thumbnailUrl}
                      alt={metadata.title ?? ''}
                      className="h-44 w-full object-cover"
                    />
                  )}
                  <div className="p-3">
                    <div className="mb-1.5 flex items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: platformColor }}
                      >
                        {platformLabel}
                      </span>
                      {metadata.duration && (
                        <span className="text-xs text-[#636E72]">
                          {formatDuration(metadata.duration)}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold text-[#2D3436]">
                      {metadata.title || url}
                    </p>
                    {metadata.authorName && (
                      <p className="mt-0.5 text-xs text-[#636E72]">{metadata.authorName}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#636E72]">
                  Notes <span className="text-[#B2BEC3]">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Why did you save this?"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-[#E0E0E0] bg-[#F8F9FA] px-4 py-2.5 text-sm text-[#2D3436] outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20"
                />
              </div>

              {saveError && (
                <p className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">{saveError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-xl border border-[#E0E0E0] py-2.5 text-sm font-medium text-[#636E72] transition hover:bg-[#F8F9FA]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !metadata}
                  className="flex-1 rounded-xl bg-[#6C5CE7] py-2.5 text-sm font-semibold text-white transition hover:bg-[#5849C8] disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
