import Link from 'next/link';
import { FolderThumbnails } from './FolderThumbnails';

interface FolderCardProps {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string | null;
  thumbs: string[];
  videoCount: number;
  totalDuration: number; // seconds
  lastAdded: string | null; // ISO date
}

function formatTotalDuration(seconds: number): string | null {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function FolderCard({
  id,
  name,
  color,
  icon,
  description,
  thumbs,
  videoCount,
  totalDuration,
  lastAdded,
}: FolderCardProps) {
  const durStr = formatTotalDuration(totalDuration);

  return (
    <Link
      href={`/folder/${id}`}
      className="group overflow-hidden rounded-2xl bg-slate-900 transition duration-300 hover:scale-[1.01]"
      style={{ boxShadow: `0 8px 32px -8px ${color}50` }}
    >
      <div className="flex h-[110px]">
        {/* Left: thumbnail grid */}
        <div className="relative w-[38%] shrink-0 overflow-hidden">
          <FolderThumbnails thumbs={thumbs} icon={icon} color={color} />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/25" />
          {/* Total duration badge */}
          {durStr && (
            <div className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white backdrop-blur-sm">
              {durStr}
            </div>
          )}
        </div>

        {/* Right: info */}
        <div
          className="flex min-w-0 flex-col justify-between px-4 py-3"
          style={{
            background: `radial-gradient(circle at bottom left, ${color}18, transparent)`,
          }}
        >
          {/* Name + description */}
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[15px] font-bold leading-tight tracking-tight text-white">
              {name}
            </h3>
            {description && (
              <p className="mt-1 line-clamp-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                {description}
              </p>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-1.5 text-[11px] text-white/40">
            <span>
              {videoCount} {videoCount === 1 ? 'video' : 'videos'}
            </span>
            {lastAdded && (
              <>
                <span className="text-white/20">—</span>
                <span>Last added {timeAgo(lastAdded)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
