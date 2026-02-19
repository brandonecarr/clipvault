'use client';

import { useEffect } from 'react';

interface VideoPlayerModalProps {
  embedUrl: string;
  title: string | null;
  url: string;
  platformColor: string;
  platformLabel: string;
  authorName: string | null;
  aspectRatio: 'landscape' | 'portrait';
  onClose: () => void;
}

export function VideoPlayerModal({
  embedUrl,
  title,
  url,
  platformColor,
  platformLabel,
  authorName,
  aspectRatio,
  onClose,
}: VideoPlayerModalProps) {
  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const isPortrait = aspectRatio === 'portrait';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button — fixed in corner, always accessible */}
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

      {/* Modal card */}
      <div
        className={`relative w-full overflow-hidden rounded-2xl bg-black shadow-2xl ${
          isPortrait ? 'max-w-xs' : 'max-w-4xl'
        }`}
        style={{ animation: 'modalIn 180ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Video */}
        <div className={isPortrait ? 'aspect-[9/16]' : 'aspect-video'}>
          <iframe
            src={embedUrl}
            className="h-full w-full border-0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            title={title ?? 'Video'}
          />
        </div>

        {/* Info bar */}
        <div className="flex items-center justify-between gap-3 bg-[#111] px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                style={{ backgroundColor: platformColor }}
              >
                {platformLabel}
              </span>
              {authorName && (
                <span className="text-xs text-white/50">{authorName}</span>
              )}
            </div>
            {title && (
              <p className="line-clamp-1 text-sm font-medium text-white">{title}</p>
            )}
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/30 hover:text-white/90"
          >
            Open ↗
          </a>
        </div>
      </div>
    </div>
  );
}
