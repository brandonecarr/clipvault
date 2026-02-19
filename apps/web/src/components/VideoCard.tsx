'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { VideoPlayerModal } from './VideoPlayerModal';

interface Video {
  id: string;
  url: string;
  platform: string;
  title: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  authorName: string | null;
  notes: string | null;
  createdAt: string;
}

interface VideoCardProps {
  video: Video;
  platformColor: string;
  platformLabel: string;
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Returns an embeddable iframe URL for supported platforms, null otherwise.
function getEmbedUrl(url: string, platform: string): string | null {
  if (platform === 'YOUTUBE') {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0` : null;
  }
  if (platform === 'VIMEO') {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? `https://player.vimeo.com/video/${m[1]}?autoplay=1` : null;
  }
  if (platform === 'TIKTOK') {
    const m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
    return m ? `https://www.tiktok.com/embed/v2/${m[1]}` : null;
  }
  return null;
}

export function VideoCard({ video, platformColor, platformLabel }: VideoCardProps) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // resolvedTitle starts as the DB value; auto-fetched if null
  const [resolvedTitle, setResolvedTitle] = useState<string | null>(video.title);
  const [editTitle, setEditTitle] = useState(video.title ?? '');
  const [editNotes, setEditNotes] = useState(video.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const fetchedRef = useRef(false);

  // If the video was saved without a title or duration, fetch metadata and patch the DB record.
  useEffect(() => {
    const needsTitle = !resolvedTitle;
    const needsDuration = video.duration === null;
    if ((!needsTitle && !needsDuration) || fetchedRef.current) return;
    fetchedRef.current = true;
    fetch('/api/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: video.url }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const updates: Record<string, unknown> = {};
        if (needsTitle && data.title) {
          setResolvedTitle(data.title);
          setEditTitle(data.title);
          updates.title = data.title;
        }
        if (needsDuration && data.duration) {
          updates.duration = data.duration;
        }
        if (Object.keys(updates).length > 0) {
          createClient().from('Video').update(updates).eq('id', video.id).then(() => {});
        }
      })
      .catch(() => {});
  }, [video.id, video.url, resolvedTitle, video.duration]);

  const duration = formatDuration(video.duration);
  const embedUrl = getEmbedUrl(video.url, video.platform);
  const displayTitle = resolvedTitle || (() => {
    try { return new URL(video.url).hostname.replace(/^www\./, ''); }
    catch { return platformLabel; }
  })();

  async function handleSaveEdit() {
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase
      .from('Video')
      .update({ title: editTitle.trim() || null, notes: editNotes.trim() || null })
      .eq('id', video.id);
    if (err) {
      setError(err.message);
      setSaving(false);
    } else {
      setEditing(false);
      setSaving(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from('Video').delete().eq('id', video.id);
    router.refresh();
  }

  return (
    <>
      {/* Card */}
      <div className="group relative aspect-[3/4] overflow-hidden rounded-3xl shadow-[0_2.8px_2.2px_rgba(0,0,0,0.034),0_6.7px_5.3px_rgba(0,0,0,0.048),0_12.5px_10px_rgba(0,0,0,0.06),0_22.3px_17.9px_rgba(0,0,0,0.072),0_41.8px_33.4px_rgba(0,0,0,0.086),0_100px_80px_rgba(0,0,0,0.12)] transition-transform duration-300 hover:scale-[1.02]">
        {/* Background image */}
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title ?? ''}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: platformColor + '30' }} />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/*
          Full-card link / play trigger.
          - If the platform is embeddable: intercept click → open player modal.
          - Otherwise: behaves as a normal link (open in new tab).
          The action buttons come after this in DOM order so they sit on top
          and intercept clicks first — no stopPropagation needed on the buttons.
        */}
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0"
          aria-label={video.title ?? 'Open video'}
          onClick={
            embedUrl
              ? (e) => {
                  e.preventDefault();
                  setPlayerOpen(true);
                }
              : undefined
          }
        />

        {/* Top-left: platform + author + notes (pointer-events-none so clicks fall through to the link) */}
        <div className="pointer-events-none absolute left-4 top-4 text-white">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: platformColor }}
            >
              {platformLabel}
            </span>
            {video.authorName && (
              <span className="text-xs font-medium drop-shadow">{video.authorName}</span>
            )}
          </div>
          {video.notes && (
            <p className="max-w-[180px] rounded-lg bg-black/20 p-2 text-xs leading-4 backdrop-blur-sm">
              {video.notes}
            </p>
          )}
        </div>

        {/*
          Top-right: action buttons + play indicator.
          Come AFTER the <a> in DOM → sit on top → clicks never reach the link.
        */}
        <div className="absolute right-4 top-4 flex items-center gap-1.5">
          {/* Edit */}
          <button
            type="button"
            onClick={() => {
              setEditTitle(video.title ?? '');
              setEditNotes(video.notes ?? '');
              setError('');
              setEditing(true);
            }}
            className="rounded-full bg-white/20 p-2 opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-white/40"
            title="Edit"
          >
            <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          {/* Delete */}
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-full bg-white/20 p-2 opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-red-500/70"
            title="Delete"
          >
            <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
          {/* Play indicator (visual only) */}
          <div className="pointer-events-none rounded-full bg-white/20 p-2 backdrop-blur-sm transition-colors group-hover:bg-white/30">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
            </svg>
          </div>
        </div>

        {/* Bottom: title + duration (pointer-events-none, visual only) */}
        <div className="pointer-events-none absolute bottom-4 left-4 right-4">
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-2 text-white">
              <span className="line-clamp-2 text-sm font-medium leading-tight">
                {displayTitle}
              </span>
              {duration && (
                <span className="flex flex-shrink-0 items-center gap-1 text-xs opacity-80">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  {duration}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* No-thumbnail fallback icon */}
        {!video.thumbnailUrl && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <svg className="h-16 w-16 opacity-10" style={{ color: platformColor }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
            </svg>
          </div>
        )}
      </div>

      {/* Video player modal (YouTube / Vimeo / TikTok) */}
      {playerOpen && embedUrl && (
        <VideoPlayerModal
          embedUrl={embedUrl}
          title={video.title}
          url={video.url}
          platformColor={platformColor}
          platformLabel={platformLabel}
          authorName={video.authorName}
          duration={video.duration}
          notes={video.notes}
          createdAt={video.createdAt}
          aspectRatio={video.platform === 'TIKTOK' ? 'portrait' : 'landscape'}
          onClose={() => setPlayerOpen(false)}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditing(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#2D3436]">Edit Link</h2>
              <button type="button" onClick={() => setEditing(false)} className="text-xl leading-none text-[#636E72] hover:text-[#2D3436]">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#636E72]">Title</label>
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={video.url}
                  className="w-full rounded-xl border border-[#E0E0E0] bg-[#F8F9FA] px-4 py-2.5 text-sm text-[#2D3436] outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#636E72]">
                  Notes <span className="text-[#B2BEC3]">(optional)</span>
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Why did you save this?"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[#E0E0E0] bg-[#F8F9FA] px-4 py-2.5 text-sm text-[#2D3436] outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20"
                />
              </div>
              {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditing(false)}
                  className="flex-1 rounded-xl border border-[#E0E0E0] py-2.5 text-sm font-medium text-[#636E72] transition hover:bg-[#F8F9FA]">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveEdit} disabled={saving}
                  className="flex-1 rounded-xl bg-[#6C5CE7] py-2.5 text-sm font-semibold text-white transition hover:bg-[#5849C8] disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-base font-bold text-[#2D3436]">Delete link?</h2>
            <p className="mb-5 text-sm text-[#636E72]">{displayTitle}</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-xl border border-[#E0E0E0] py-2.5 text-sm font-medium text-[#636E72] transition hover:bg-[#F8F9FA]">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
