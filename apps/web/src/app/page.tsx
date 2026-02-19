export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FA] px-6">
      <div className="text-center max-w-xl">
        {/* Logo mark */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#6C5CE7]">
          <span className="text-4xl">📼</span>
        </div>

        <h1 className="mb-3 text-4xl font-bold text-[#6C5CE7]">ClipVault</h1>
        <p className="mb-2 text-xl font-medium text-[#2D3436]">
          Save, organize, and revisit your favorite social media videos.
        </p>
        <p className="mb-10 text-base text-[#636E72]">
          The web app is coming soon. Download the mobile app to get started.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="#"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#6C5CE7] px-6 text-sm font-semibold text-white transition hover:bg-[#5849C8]"
          >
            📱 Download for iOS
          </a>
          <a
            href="#"
            className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-[#6C5CE7] px-6 text-sm font-semibold text-[#6C5CE7] transition hover:bg-[#F0EDFF]"
          >
            🤖 Download for Android
          </a>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 text-center">
          {[
            { icon: '📁', title: 'Hierarchical Folders', desc: 'Organize videos into nested folders up to 5 levels deep.' },
            { icon: '🔗', title: 'Any Platform', desc: 'YouTube, TikTok, Instagram, Facebook, Pinterest, Reddit, and more.' },
            { icon: '🔍', title: 'Full-Text Search', desc: 'Find any saved video instantly by title, notes, or tags.' },
          ].map((feature) => (
            <div key={feature.title} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-2 text-3xl">{feature.icon}</div>
              <h3 className="mb-1 text-sm font-semibold text-[#2D3436]">{feature.title}</h3>
              <p className="text-xs text-[#636E72] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
