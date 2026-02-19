'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

const COLOR_PRESETS = [
  '#6C5CE7', '#00CEC9', '#FD79A8', '#FDCB6E',
  '#00B894', '#E17055', '#74B9FF', '#A29BFE',
];

const EMOJI_PRESETS = [
  '📁', '🎬', '🎵', '📚', '🏋️', '🎮',
  '✈️', '🍕', '💡', '❤️', '⭐', '🔥',
  '🎯', '🎨', '📸', '🎤', '🏆', '🌟',
];

interface NewFolderModalProps {
  userId: string;
  parentId?: string | null;
}

export function NewFolderModal({ userId, parentId }: NewFolderModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6C5CE7');
  const [icon, setIcon] = useState('📁');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  function handleClose() {
    setOpen(false);
    setName('');
    setDescription('');
    setColor('#6C5CE7');
    setIcon('📁');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: dbError } = await supabase.from('Folder').insert({
      name: name.trim(),
      color,
      icon,
      description: description.trim() || null,
      userId,
      parentId: parentId ?? null,
      sortOrder: 0,
    });

    if (dbError) {
      setError(dbError.message);
    } else {
      handleClose();
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-[#6C5CE7] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5849C8]"
      >
        <span className="text-base leading-none">+</span>
        New Folder
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#2D3436]">New Folder</h2>
              <button
                onClick={handleClose}
                className="text-xl leading-none text-[#636E72] hover:text-[#2D3436]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Live preview */}
              <div className="flex items-center gap-3 rounded-xl bg-[#F8F9FA] p-3">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{ backgroundColor: color + '20', border: `2px solid ${color}` }}
                >
                  {icon}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[#2D3436]">
                    {name || 'Folder name'}
                  </div>
                  {description && (
                    <div className="truncate text-xs text-[#636E72]">{description}</div>
                  )}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#636E72]">
                  Name
                </label>
                <input
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Folder"
                  className="w-full rounded-xl border border-[#E0E0E0] bg-[#F8F9FA] px-4 py-2.5 text-sm text-[#2D3436] outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20"
                />
              </div>

              {/* Color */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#636E72]">
                  Color
                </label>
                <div className="flex gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="h-7 w-7 rounded-full transition hover:scale-110"
                      style={{
                        backgroundColor: c,
                        outline: color === c ? `2px solid ${c}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#636E72]">
                  Icon
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_PRESETS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setIcon(e)}
                      className={`h-9 w-9 rounded-lg text-xl transition hover:bg-[#F0EDFF] ${
                        icon === e ? 'bg-[#F0EDFF] ring-2 ring-[#6C5CE7]' : 'bg-[#F8F9FA]'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#636E72]">
                  Description <span className="text-[#B2BEC3]">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What goes in this folder?"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-[#E0E0E0] bg-[#F8F9FA] px-4 py-2.5 text-sm text-[#2D3436] outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-xl border border-[#E0E0E0] py-2.5 text-sm font-medium text-[#636E72] transition hover:bg-[#F8F9FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 rounded-xl bg-[#6C5CE7] py-2.5 text-sm font-semibold text-white transition hover:bg-[#5849C8] disabled:opacity-60"
                >
                  {loading ? 'Creating…' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
