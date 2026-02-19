import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';

interface Folder {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  description: string | null;
  createdAt: string;
}

const COLOR_PRESETS: Record<string, string> = {
  '#6C5CE7': '#6C5CE7',
  '#00CEC9': '#00CEC9',
  '#FD79A8': '#FD79A8',
  '#FDCB6E': '#FDCB6E',
  '#00B894': '#00B894',
  '#E17055': '#E17055',
  '#74B9FF': '#74B9FF',
  '#A29BFE': '#A29BFE',
};

export default async function LibraryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: folders } = await supabase
    .from('Folder')
    .select('id, name, color, icon, description, "createdAt"')
    .eq('"userId"', user.id)
    .is('"parentId"', null)
    .order('"sortOrder"', { ascending: true });

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
            <LogoutButton />
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2D3436]">My Library</h1>
            <p className="mt-1 text-sm text-[#636E72]">
              {folders && folders.length > 0
                ? `${folders.length} folder${folders.length !== 1 ? 's' : ''}`
                : 'No folders yet'}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-[#6C5CE7]/10 px-4 py-2.5">
            <span className="text-sm text-[#6C5CE7]">📱</span>
            <span className="text-xs font-medium text-[#6C5CE7]">
              Use the mobile app to save videos
            </span>
          </div>
        </div>

        {folders && folders.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {folders.map((folder: Folder) => (
              <div
                key={folder.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Color bar */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: folder.color || '#6C5CE7' }}
                />
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-2 text-2xl">{folder.icon || '📁'}</div>
                  <h3 className="text-sm font-semibold text-[#2D3436] leading-tight">
                    {folder.name}
                  </h3>
                  {folder.description && (
                    <p className="mt-1 text-xs text-[#636E72] line-clamp-2">
                      {folder.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-20 shadow-sm">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#F0EDFF]">
              <span className="text-4xl">📁</span>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-[#2D3436]">Your library is empty</h2>
            <p className="mb-6 max-w-xs text-center text-sm text-[#636E72]">
              Download the ClipVault mobile app to start saving and organizing your favorite social
              media videos.
            </p>
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <a
                href="https://apps.apple.com"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#2D3436] px-5 text-xs font-semibold text-white transition hover:bg-black"
              >
                <span>🍎</span> App Store
              </a>
              <a
                href="https://play.google.com"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#2D3436] px-5 text-xs font-semibold text-[#2D3436] transition hover:bg-[#F8F9FA]"
              >
                <span>▶</span> Google Play
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function LogoutButton() {
  return (
    <form action="/auth/signout" method="POST">
      <button
        type="submit"
        className="rounded-lg border border-[#E0E0E0] px-3 py-1.5 text-xs font-medium text-[#636E72] transition hover:bg-[#F8F9FA] hover:text-[#2D3436]"
      >
        Sign out
      </button>
    </form>
  );
}
