import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { NewFolderModal } from '../../../components/NewFolderModal';
import { AddVideoModal } from '../../../components/AddVideoModal';

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

interface Folder {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  description: string | null;
  parentId: string | null;
}

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

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default async function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: folder } = await supabase
    .from('Folder')
    .select('id, name, color, icon, description, "parentId"')
    .eq('id', id)
    .single();

  if (!folder) redirect('/library');

  const [{ data: videos }, { data: subfolders }, parentResult] = await Promise.all([
    supabase
      .from('Video')
      .select('id, url, platform, title, "thumbnailUrl", duration, "authorName", notes, "createdAt"')
      .eq('"folderId"', id)
      .order('"createdAt"', { ascending: false }),
    supabase
      .from('Folder')
      .select('id, name, color, icon, description')
      .eq('"parentId"', id)
      .order('"sortOrder"', { ascending: true }),
    folder.parentId
      ? supabase
          .from('Folder')
          .select('id, name')
          .eq('id', folder.parentId)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const parentFolder = parentResult.data as { id: string; name: string } | null;

  const typedFolder = folder as Folder;
  const typedVideos = (videos ?? []) as Video[];
  const typedSubfolders = (subfolders ?? []) as Folder[];

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-[#E0E0E0] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6C5CE7]">
              <span className="text-base">📼</span>
            </div>
            <span className="font-bold text-[#2D3436]">ClipVault</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#636E72]">{user.email}</span>
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="rounded-lg border border-[#E0E0E0] px-3 py-1.5 text-xs font-medium text-[#636E72] transition hover:bg-[#F8F9FA] hover:text-[#2D3436]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-[#636E72]">
          <Link href="/library" className="hover:text-[#2D3436] transition">
            Library
          </Link>
          {parentFolder && (
            <>
              <span>/</span>
              <Link
                href={`/folder/${parentFolder.id}`}
                className="hover:text-[#2D3436] transition"
              >
                {parentFolder.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="font-medium text-[#2D3436]">{typedFolder.name}</span>
        </nav>

        {/* Folder header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-3xl"
              style={{ backgroundColor: (typedFolder.color ?? '#6C5CE7') + '20' }}
            >
              {typedFolder.icon ?? '📁'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#2D3436]">{typedFolder.name}</h1>
              {typedFolder.description && (
                <p className="mt-0.5 text-sm text-[#636E72]">{typedFolder.description}</p>
              )}
              <p className="mt-1 text-xs text-[#B2BEC3]">
                {typedVideos.length} link{typedVideos.length !== 1 ? 's' : ''}
                {typedSubfolders.length > 0 &&
                  ` · ${typedSubfolders.length} subfolder${typedSubfolders.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <NewFolderModal userId={user.id} parentId={id} />
            <AddVideoModal folderId={id} userId={user.id} />
          </div>
        </div>

        {/* Subfolders */}
        {typedSubfolders.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#B2BEC3]">
              Folders
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {typedSubfolders.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/folder/${sub.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md"
                >
                  <div
                    className="h-1.5 w-full"
                    style={{ backgroundColor: sub.color ?? '#6C5CE7' }}
                  />
                  <div className="flex flex-1 flex-col p-3">
                    <div className="mb-1.5 text-xl">{sub.icon ?? '📁'}</div>
                    <h3 className="text-xs font-semibold leading-tight text-[#2D3436]">
                      {sub.name}
                    </h3>
                    {sub.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-[#636E72]">
                        {sub.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Videos / Links */}
        <section>
          {typedVideos.length > 0 ? (
            <>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#B2BEC3]">
                Links
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {typedVideos.map((video) => {
                  const color = PLATFORM_COLORS[video.platform] ?? '#636E72';
                  const label = PLATFORM_LABELS[video.platform] ?? 'Link';
                  const duration = formatDuration(video.duration);
                  return (
                    <a
                      key={video.id}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-[3/4] overflow-hidden rounded-3xl shadow-[0_2.8px_2.2px_rgba(0,0,0,0.034),0_6.7px_5.3px_rgba(0,0,0,0.048),0_12.5px_10px_rgba(0,0,0,0.06),0_22.3px_17.9px_rgba(0,0,0,0.072),0_41.8px_33.4px_rgba(0,0,0,0.086),0_100px_80px_rgba(0,0,0,0.12)] transition-transform duration-300 hover:scale-[1.02]"
                    >
                      {/* Background image */}
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title ?? ''}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{ backgroundColor: color + '30' }}
                        />
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                      {/* Top-left: platform + author */}
                      <div className="absolute left-4 top-4 text-white">
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                            style={{ backgroundColor: color }}
                          >
                            {label}
                          </span>
                          {video.authorName && (
                            <span className="text-xs font-medium drop-shadow">
                              {video.authorName}
                            </span>
                          )}
                        </div>
                        {video.notes && (
                          <p className="max-w-[180px] rounded-lg bg-black/20 p-2 text-xs leading-4 backdrop-blur-sm">
                            {video.notes}
                          </p>
                        )}
                      </div>

                      {/* Top-right: play button */}
                      <div className="absolute right-4 top-4">
                        <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm transition-colors group-hover:bg-white/30">
                          <svg
                            className="h-4 w-4 text-white"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
                          </svg>
                        </div>
                      </div>

                      {/* Bottom: title + duration */}
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                          <div className="flex items-start justify-between gap-2 text-white">
                            <span className="line-clamp-2 text-sm font-medium leading-tight">
                              {video.title || video.url}
                            </span>
                            {duration && (
                              <span className="flex flex-shrink-0 items-center gap-1 text-xs opacity-80">
                                <svg
                                  className="h-3 w-3"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                >
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
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg
                            className="h-16 w-16 opacity-10"
                            style={{ color }}
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
                          </svg>
                        </div>
                        )}
                    </a>
                  );
                })}
              </div>
            </>
          ) : typedSubfolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F0EDFF]">
                <span className="text-3xl">🔗</span>
              </div>
              <h2 className="mb-1.5 text-base font-semibold text-[#2D3436]">No links yet</h2>
              <p className="mb-5 max-w-xs text-center text-sm text-[#636E72]">
                Paste any YouTube, TikTok, Instagram, or other social media URL to save it here.
              </p>
              <AddVideoModal folderId={id} userId={user.id} />
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
