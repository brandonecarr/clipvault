'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { FolderThumbnails } from './FolderThumbnails';

const COLOR_PRESETS = [
  '#6C5CE7', '#00CEC9', '#FD79A8', '#FDCB6E',
  '#00B894', '#E17055', '#74B9FF', '#A29BFE',
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

interface FolderCardProps {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string | null;
  thumbs: string[];
  videoCount: number;
  totalDuration: number;
  lastAdded: string | null;
  userId: string;
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
  userId,
}: FolderCardProps) {
  const durStr = formatTotalDuration(totalDuration);
  const router = useRouter();

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editColor, setEditColor] = useState(color);
  const [editIconFile, setEditIconFile] = useState<File | null>(null);
  const [editIconPreview, setEditIconPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function openEdit(e: React.MouseEvent) {
    e.preventDefault();
    setEditName(name);
    setEditColor(color);
    setEditIconFile(null);
    setEditIconPreview(icon?.startsWith('http') ? icon : null);
    setEditError('');
    setEditing(true);
  }

  function openDelete(e: React.MouseEvent) {
    e.preventDefault();
    setConfirmDelete(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setEditError('Only JPEG, PNG, WebP, and GIF images are allowed.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setEditError('Image must be smaller than 5 MB.');
      e.target.value = '';
      return;
    }
    setEditError('');
    setEditIconFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setEditIconPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSaveEdit() {
    if (!editName.trim()) return;
    setSaving(true);
    setEditError('');

    const supabase = createClient();
    let iconValue: string | undefined = undefined;

    if (editIconFile) {
      const ext = editIconFile.name.split('.').pop() ?? 'jpg';
      const path = `folder-icons/${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(path, editIconFile, { contentType: editIconFile.type, upsert: false });

      if (uploadError) {
        setEditError(`Photo upload failed: ${uploadError.message}`);
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(path);
      iconValue = urlData.publicUrl;
    }

    const updates: Record<string, unknown> = {
      name: editName.trim().slice(0, 100),
      color: editColor,
    };
    if (iconValue !== undefined) {
      // New file uploaded
      updates.icon = iconValue;
    } else if (editIconPreview === null && icon?.startsWith('http')) {
      // User hit "Remove" to clear an existing photo
      updates.icon = null;
    }
    // Otherwise: preview still shows the existing URL → don't touch icon

    const { error: dbError } = await supabase
      .from('Folder')
      .update(updates)
      .eq('id', id)
      .eq('"userId"', userId);

    if (dbError) {
      setEditError(dbError.message);
      setSaving(false);
    } else {
      setEditing(false);
      setSaving(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from('Folder').delete().eq('id', id).eq('"userId"', userId);
    // Fire-and-forget audit log
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DELETE_FOLDER', folderId: id, folderName: name }),
    }).catch(() => {});
    router.refresh();
  }

  return (
    <>
      {/* Card wrapper */}
      <div
        className="folder-card group relative overflow-hidden rounded-3xl ring-1 ring-white/10 transition duration-300 hover:scale-[1.01]"
        style={{
          background: `linear-gradient(to top, ${color}00, ${color}20), #0f172a`,
          '--folder-color': color,
        } as React.CSSProperties}
      >
        {/* Full-card link (below buttons in z-order) */}
        <Link
          href={`/folder/${id}`}
          className="absolute inset-0 z-0"
          aria-label={name}
        />

        <div
          className="pointer-events-none flex h-[150px]"
          style={{
            background: `radial-gradient(circle at bottom left, ${color}28, transparent)`,
          }}
        >
          {/* Left: thumbnail */}
          <div className="relative h-full w-[44%] shrink-0 overflow-hidden">
            <div className="absolute inset-0">
              <FolderThumbnails thumbs={thumbs} icon={icon} color={color} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-transparent opacity-60" />
            {durStr && (
              <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[11px] text-white">
                {durStr}
              </span>
            )}
          </div>

          {/* Right: info — pointer-events-none so clicks fall through to the Link */}
          <div
            className="pointer-events-none flex w-[56%] min-w-0 flex-col justify-center px-4 py-4"
            style={{
              background: `radial-gradient(circle at bottom left, ${color}40, transparent)`,
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

        {/* Action buttons — pointer-events-auto re-enables clicks; z-20 keeps them above everything */}
        <div className="pointer-events-auto absolute right-3 top-3 z-20 flex items-center gap-1.5 opacity-0 transition-all group-hover:opacity-100">
          <button
            type="button"
            onClick={openEdit}
            className="rounded-full bg-white/20 p-1.5 backdrop-blur-sm transition hover:bg-white/40"
            title="Edit folder"
          >
            <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={openDelete}
            className="rounded-full bg-white/20 p-1.5 backdrop-blur-sm transition hover:bg-red-500/70"
            title="Delete folder"
          >
            <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditing(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Edit Folder</h2>
              <button
                onClick={() => setEditing(false)}
                className="text-xl leading-none text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Name</label>
                <input
                  autoFocus
                  maxLength={100}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
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
                      onClick={() => setEditColor(c)}
                      className="h-7 w-7 rounded-full transition hover:scale-110"
                      style={{
                        backgroundColor: c,
                        outline: editColor === c ? `2px solid ${c}` : 'none',
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
                  {editIconPreview && (
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
                      <img src={editIconPreview} alt="" className="h-full w-full object-cover" />
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
                    {editIconPreview ? 'Change photo' : 'Upload photo'}
                  </button>
                  {editIconPreview && (
                    <button
                      type="button"
                      onClick={() => { setEditIconFile(null); setEditIconPreview(null); }}
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

              {editError && (
                <p className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">{editError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-xl border border-[var(--input-border)] py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saving || !editName.trim()}
                  className="flex-1 rounded-xl bg-[#6C5CE7] py-2.5 text-sm font-semibold text-white transition hover:bg-[#5849C8] disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[var(--surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-base font-bold text-[var(--text-primary)]">Delete folder?</h2>
            <p className="mb-1 text-sm text-[var(--text-secondary)]">{name}</p>
            <p className="mb-5 text-xs text-[var(--text-muted)]">All videos inside will also be deleted.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-xl border border-[#E0E0E0] py-2.5 text-sm font-medium text-[#636E72] transition hover:bg-[#F8F9FA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
