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
      className="relative overflow-hidden rounded-3xl ring-1 ring-white/10 transition duration-300 hover:scale-[1.01]"
      style={{
        background: `linear-gradient(to top, ${color}00, ${color}20)`,
        boxShadow: `0 10px 40px -10px ${color}60`,
      }}
    >
      <div
        className="flex"
        style={{
          background: `radial-gradient(circle at bottom left, ${color}30, transparent)`,
        }}
      >
        {/* Left: thumbnail */}
        <div className="relative w-[44%] shrink-0 overflow-hidden" style={{ minHeight: '150px' }}>
          <FolderThumbnails thumbs={thumbs} icon={icon} color={color} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-transparent opacity-60" />
          {durStr && (
            <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[11px] text-white">
              {durStr}
            </span>
          )}
        </div>

        {/* Right: info */}
        <div
          className="w-[56%] min-w-0 px-4 py-4"
          style={{
            background: `radial-gradient(circle at bottom left, ${color}50, ${color}00)`,
          }}
        >
          <h3 className="line-clamp-2 text-[16px] font-semibold tracking-tight text-white">
            {name}
          </h3>
          {description && (
            <p className="mt-1 line-clamp-1 text-[11px] uppercase tracking-wide text-slate-400">
              {description}
            </p>
          )}
          <p className="mt-2 text-[12px] text-slate-300">
            {videoCount} {videoCount === 1 ? 'video' : 'videos'}
            {lastAdded && ` — Last added ${timeAgo(lastAdded)}`}
          </p>
        </div>
      </div>
    </Link>
  );
}
