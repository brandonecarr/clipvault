import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { NewFolderModal } from '../../../components/NewFolderModal';
import { AddVideoModal } from '../../../components/AddVideoModal';
import { FolderCard } from '../../../components/FolderCard';
import { VideoCard } from '../../../components/VideoCard';
import { ThemeToggle } from '../../../components/ThemeToggle';

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

  // Fetch all videos per subfolder for stats (count, total duration, last added, thumbnails)
  const subfolderIds = typedSubfolders.map((s) => s.id);
  interface SubFolderStats { thumbs: string[]; count: number; totalDuration: number; lastAdded: string | null; }
  const subStatsByFolder: Record<string, SubFolderStats> = {};
  if (subfolderIds.length > 0) {
    const { data: subVideoRows } = await supabase
      .from('Video')
      .select('"folderId", "thumbnailUrl", duration, "createdAt"')
      .in('"folderId"', subfolderIds)
      .order('"createdAt"', { ascending: false });
    for (const row of subVideoRows ?? []) {
      const r = row as { folderId: string; thumbnailUrl: string | null; duration: number | null; createdAt: string };
      if (!subStatsByFolder[r.folderId]) subStatsByFolder[r.folderId] = { thumbs: [], count: 0, totalDuration: 0, lastAdded: null };
      const s = subStatsByFolder[r.folderId];
      s.count++;
      if (r.duration) s.totalDuration += r.duration;
      if (r.thumbnailUrl && s.thumbs.length < 4) s.thumbs.push(r.thumbnailUrl);
      if (!s.lastAdded || r.createdAt > s.lastAdded) s.lastAdded = r.createdAt;
    }
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-[var(--nav-border)] bg-[var(--nav-bg)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6C5CE7]">
              <span className="text-base">📼</span>
            </div>
            <span className="font-bold text-[var(--text-primary)]">ClipVault</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)]">{user.email}</span>
            <ThemeToggle />
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="rounded-lg border border-[var(--input-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
          <Link href="/library" className="transition hover:text-[var(--text-primary)]">
            Library
          </Link>
          {parentFolder && (
            <>
              <span>/</span>
              <Link
                href={`/folder/${parentFolder.id}`}
                className="transition hover:text-[var(--text-primary)]"
              >
                {parentFolder.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="font-medium text-[var(--text-primary)]">{typedFolder.name}</span>
        </nav>

        {/* Folder header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl text-3xl"
              style={typedFolder.icon?.startsWith('http') ? undefined : { backgroundColor: (typedFolder.color ?? '#6C5CE7') + '20' }}
            >
              {typedFolder.icon?.startsWith('http') ? (
                <img src={typedFolder.icon} alt="" className="h-full w-full object-cover" />
              ) : (
                typedFolder.icon ?? '📁'
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{typedFolder.name}</h1>
              {typedFolder.description && (
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{typedFolder.description}</p>
              )}
              <p className="mt-1 text-xs text-[var(--text-muted)]">
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
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Folders
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {typedSubfolders.map((sub) => {
                const stats = subStatsByFolder[sub.id] ?? { thumbs: [], count: 0, totalDuration: 0, lastAdded: null };
                return (
                  <FolderCard
                    key={sub.id}
                    id={sub.id}
                    name={sub.name}
                    color={sub.color ?? '#6C5CE7'}
                    icon={sub.icon ?? ''}
                    description={sub.description}
                    thumbs={stats.thumbs}
                    videoCount={stats.count}
                    totalDuration={stats.totalDuration}
                    lastAdded={stats.lastAdded}
                    userId={user.id}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Videos / Links */}
        <section>
          {typedVideos.length > 0 ? (
            <>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Links
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {typedVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    platformColor={PLATFORM_COLORS[video.platform] ?? '#636E72'}
                    platformLabel={PLATFORM_LABELS[video.platform] ?? 'Link'}
                    userId={user.id}
                  />
                ))}
              </div>
            </>
          ) : typedSubfolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-[var(--surface)] py-16 shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F0EDFF] dark:bg-[#6C5CE7]/20">
                <span className="text-3xl">🔗</span>
              </div>
              <h2 className="mb-1.5 text-base font-semibold text-[var(--text-primary)]">No links yet</h2>
              <p className="mb-5 max-w-xs text-center text-sm text-[var(--text-secondary)]">
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
