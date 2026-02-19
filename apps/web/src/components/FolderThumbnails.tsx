interface FolderThumbnailsProps {
  thumbs: string[];
  icon: string;
  color: string;
}

export function FolderThumbnails({ thumbs, icon, color }: FolderThumbnailsProps) {
  if (thumbs.length === 0) {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ background: `linear-gradient(145deg, ${color}60, ${color}20)` }}
      >
        <span className="text-4xl">{icon}</span>
      </div>
    );
  }

  if (thumbs.length === 1) {
    return <img src={thumbs[0]} alt="" className="h-full w-full object-cover" />;
  }

  if (thumbs.length === 2) {
    return (
      <div className="flex h-full gap-px bg-black/20">
        <img src={thumbs[0]} alt="" className="h-full flex-1 object-cover" />
        <img src={thumbs[1]} alt="" className="h-full flex-1 object-cover" />
      </div>
    );
  }

  if (thumbs.length === 3) {
    return (
      <div className="flex h-full gap-px bg-black/20">
        <img src={thumbs[0]} alt="" className="h-full w-1/2 shrink-0 object-cover" />
        <div className="flex h-full w-1/2 flex-col gap-px">
          <img src={thumbs[1]} alt="" className="h-1/2 w-full object-cover" />
          <img src={thumbs[2]} alt="" className="h-1/2 w-full object-cover" />
        </div>
      </div>
    );
  }

  // 4+: 2×2 grid
  return (
    <div className="grid h-full grid-cols-2 gap-px bg-black/20">
      {thumbs.slice(0, 4).map((t, i) => (
        <img key={i} src={t} alt="" className="h-full w-full object-cover" />
      ))}
    </div>
  );
}
