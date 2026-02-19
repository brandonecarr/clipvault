'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

const COLOR_PRESETS = [
  '#6C5CE7', '#00CEC9', '#FD79A8', '#FDCB6E',
  '#00B894', '#E17055', '#74B9FF', '#A29BFE',
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

interface NewFolderModalProps {
  userId: string;
  parentId?: string | null;
}

export function NewFolderModal({ userId, parentId }: NewFolderModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6C5CE7');
  const [description, setDescription] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleClose() {
    setOpen(false);
    setName('');
    setDescription('');
    setColor('#6C5CE7');
    setIconFile(null);
    setIconPreview(null);
    setError('');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, WebP, and GIF images are allowed.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('Image must be smaller than 5 MB.');
      e.target.value = '';
      return;
    }
    setError('');
    setIconFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setIconPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    const supabase = createClient();
    let iconValue: string | null = null;

    // Upload cover photo if provided
    if (iconFile) {
      const ext = iconFile.name.split('.').pop() ?? 'jpg';
      const path = `folder-icons/${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(path, iconFile, { contentType: iconFile.type, upsert: false });

      if (uploadError) {
        setError(`Photo upload failed: ${uploadError.message}`);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(path);
      iconValue = urlData.publicUrl;
    }

    const { error: dbError } = await supabase.from('Folder').insert({
      name: name.trim(),
      color,
      icon: iconValue,
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
            className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">New Folder</h2>
              <button
                onClick={handleClose}
                className="text-xl leading-none text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Live preview */}
              <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-subtle)] p-3">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl"
                  style={
                    iconPreview
                      ? undefined
                      : { backgroundColor: color + '20', border: `2px solid ${color}` }
                  }
                >
                  {iconPreview ? (
                    <img src={iconPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <svg className="h-5 w-5" style={{ color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[var(--text-primary)]">
                    {name || 'Folder name'}
                  </div>
                  {description && (
                    <div className="truncate text-xs text-[var(--text-secondary)]">{description}</div>
                  )}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Name</label>
                <input
                  autoFocus
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Folder"
                  className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20"
                />
              </div>

              {/* Color */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Color</label>
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

              {/* Cover photo */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                  Cover Photo <span className="text-[var(--text-muted)]">(optional)</span>
                </label>
                <div className="flex items-center gap-3">
                  {iconPreview && (
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
                      <img src={iconPreview} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--input-border)] px-4 py-3 text-sm text-[var(--text-secondary)] transition hover:border-[#6C5CE7] hover:text-[#6C5CE7]"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    {iconPreview ? 'Change photo' : 'Upload photo'}
                  </button>
                  {iconPreview && (
                    <button
                      type="button"
                      onClick={() => { setIconFile(null); setIconPreview(null); }}
                      className="text-xs text-red-400 transition hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                  Description <span className="text-[var(--text-muted)]">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What goes in this folder?"
                  rows={2}
                  maxLength={500}
                  className="w-full resize-none rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-xl border border-[var(--input-border)] py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-subtle)]"
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
