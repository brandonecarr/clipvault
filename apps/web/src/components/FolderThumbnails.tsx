interface FolderThumbnailsProps {
  thumbs: string[];
  icon: string;
  color: string;
}

// Each image gets its own overflow-hidden cell so the scale transform
// crops YouTube's hqdefault letterbox bars without bleeding into siblings.
function Cell({ src, className }: { src: string; className?: string }) {
  return (
    <div className={`overflow-hidden ${className ?? ''}`}>
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        style={{ transform: 'scale(1.35)', transformOrigin: 'center' }}
      />
    </div>
  );
}

export function FolderThumbnails({ thumbs, icon, color }: FolderThumbnailsProps) {
  if (thumbs.length === 0) {
    // icon may be a URL (uploaded photo) or null (no icon set)
    if (icon && icon.startsWith('http')) {
      return <Cell src={icon} className="h-full w-full" />;
    }
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ background: `linear-gradient(145deg, ${color}60, ${color}20)` }}
      >
        <svg className="h-10 w-10 opacity-60" style={{ color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </div>
    );
  }

  if (thumbs.length === 1) {
    return <Cell src={thumbs[0]} className="h-full w-full" />;
  }

  if (thumbs.length === 2) {
    return (
      <div className="flex h-full w-full">
        <Cell src={thumbs[0]} className="h-full w-1/2" />
        <Cell src={thumbs[1]} className="h-full w-1/2" />
      </div>
    );
  }

  if (thumbs.length === 3) {
    return (
      <div className="flex h-full w-full">
        <Cell src={thumbs[0]} className="h-full w-1/2 shrink-0" />
        <div className="flex h-full w-1/2 flex-col">
          <Cell src={thumbs[1]} className="h-1/2 w-full" />
          <Cell src={thumbs[2]} className="h-1/2 w-full" />
        </div>
      </div>
    );
  }

  // 4+: 2×2 grid
  return (
    <div className="grid h-full w-full grid-cols-2">
      {thumbs.slice(0, 4).map((t, i) => (
        <Cell key={i} src={t} className="h-full w-full" />
      ))}
    </div>
  );
}
