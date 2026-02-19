'use client';

import { useEffect } from 'react';

interface VideoPlayerModalProps {
  embedUrl: string;
  title: string | null;
  url: string;
  platformColor: string;
  platformLabel: string;
  authorName: string | null;
  duration: number | null;
  notes: string | null;
  createdAt: string;
  aspectRatio: 'landscape' | 'portrait';
  onClose: () => void;
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

export function VideoPlayerModal({
  embedUrl,
  title,
  url,
  platformColor,
  platformLabel,
  authorName,
  duration,
  notes,
  createdAt,
  aspectRatio,
  onClose,
}: VideoPlayerModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const isPortrait = aspectRatio === 'portrait';
  const durationStr = formatDuration(duration);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2.5 text-white backdrop-blur-sm transition hover:bg-white/25"
        aria-label="Close"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {/*
        Modal: video on left, metadata sidebar on right.
        On small screens: stacked vertically.
      */}
      <div
        className={`flex w-full flex-col overflow-hidden rounded-2xl bg-black shadow-2xl sm:flex-row ${
          isPortrait ? 'sm:max-w-2xl' : 'sm:max-w-5xl'
        } max-h-[calc(100vh-2rem)]`}
        style={{ animation: 'modalIn 180ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Video ── */}
        <div className={isPortrait ? 'sm:w-72 sm:flex-shrink-0' : 'sm:min-w-0 sm:flex-1'}>
          <div className={isPortrait ? 'aspect-[9/16]' : 'aspect-video'}>
            <iframe
              src={embedUrl}
              className="h-full w-full border-0"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              title={title ?? 'Video'}
            />
          </div>
        </div>

        {/* ── Metadata sidebar ── */}
        <div className="flex w-full flex-col overflow-y-auto bg-[#0e0e0e] sm:w-72 sm:flex-shrink-0">
          <div className="flex flex-1 flex-col p-5">

            {/* Platform + author */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                style={{ backgroundColor: platformColor }}
              >
                {platformLabel}
              </span>
              {authorName && (
                <span className="text-xs text-white/50">{authorName}</span>
              )}
            </div>

            {/* Title */}
            {title && (
              <h3 className="mb-4 text-sm font-semibold leading-snug text-white">
                {title}
              </h3>
            )}

            {/* Duration */}
            {durationStr && (
              <div className="mb-4 flex items-center gap-2 text-white/50">
                <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span className="text-xs">{durationStr}</span>
              </div>
            )}

            {/* Notes */}
            {notes && (
              <div className="mb-4">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                  Notes
                </p>
                <p className="text-xs leading-relaxed text-white/60">{notes}</p>
              </div>
            )}

            {/* Divider */}
            <div className="my-1 border-t border-white/[0.08]" />

            {/* Added date */}
            <div className="mt-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                Added
              </p>
              <p className="text-xs text-white/60">{formatDate(createdAt)}</p>
            </div>

            {/* Spacer pushes Open button to bottom */}
            <div className="flex-1" />

            {/* Open original */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-5 flex items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2.5 text-xs font-medium text-white/60 transition hover:border-white/30 hover:text-white/90"
            >
              Open in {platformLabel}
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
