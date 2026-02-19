import { z } from 'zod';
import {
  MAX_FOLDER_NAME_LENGTH,
  MAX_TAG_LENGTH,
  MAX_VIDEO_NOTES_LENGTH,
} from './constants.js';

// ─── Auth validators ────────────────────────────────────────────────────────

export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1).max(64).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Folder validators ──────────────────────────────────────────────────────

export const CreateFolderSchema = z.object({
  name: z
    .string()
    .min(1, 'Folder name is required')
    .max(MAX_FOLDER_NAME_LENGTH, `Name must be ${MAX_FOLDER_NAME_LENGTH} characters or fewer`),
  parentId: z.string().uuid('Invalid parent folder ID').optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g. #6C5CE7)')
    .optional()
    .nullable(),
  icon: z.string().max(8, 'Icon must be a single emoji').optional().nullable(),
  description: z.string().max(256).optional().nullable(),
});

export const UpdateFolderSchema = CreateFolderSchema.partial();

export const MoveFolderSchema = z.object({
  newParentId: z.string().uuid('Invalid parent folder ID').nullable(),
});

export const ReorderFoldersSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1, 'At least one folder ID required'),
});

// ─── Video validators ───────────────────────────────────────────────────────

export const CreateVideoSchema = z.object({
  url: z.string().url('Invalid URL'),
  folderId: z.string().uuid('Invalid folder ID'),
  notes: z.string().max(MAX_VIDEO_NOTES_LENGTH).optional().nullable(),
  tags: z.array(z.string().max(MAX_TAG_LENGTH)).max(20, 'Maximum 20 tags allowed').optional(),
});

export const UpdateVideoSchema = z.object({
  folderId: z.string().uuid().optional(),
  notes: z.string().max(MAX_VIDEO_NOTES_LENGTH).optional().nullable(),
  tags: z.array(z.string().max(MAX_TAG_LENGTH)).max(20).optional(),
  sortOrder: z.number().int().optional(),
});

export const MoveVideoSchema = z.object({
  newFolderId: z.string().uuid('Invalid folder ID'),
});

export const BulkMoveVideosSchema = z.object({
  videoIds: z.array(z.string().uuid()).min(1).max(100),
  newFolderId: z.string().uuid('Invalid folder ID'),
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(128),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  cursor: z.string().optional(),
});

// ─── Metadata validator ─────────────────────────────────────────────────────

export const ExtractMetadataSchema = z.object({
  url: z.string().url('Invalid URL'),
});

// ─── Tag validators ─────────────────────────────────────────────────────────

export const UpdateTagSchema = z.object({
  name: z
    .string()
    .min(1, 'Tag name is required')
    .max(MAX_TAG_LENGTH, `Tag must be ${MAX_TAG_LENGTH} characters or fewer`),
});

export const TagAutocompleteSchema = z.object({
  q: z.string().min(1).max(MAX_TAG_LENGTH),
  limit: z.coerce.number().int().min(1).max(20).optional().default(10),
});

// ─── Pagination ─────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  sortBy: z.enum(['createdAt', 'title', 'platform', 'sortOrder']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ─── Inferred types ─────────────────────────────────────────────────────────

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateFolderInput = z.infer<typeof CreateFolderSchema>;
export type UpdateFolderInput = z.infer<typeof UpdateFolderSchema>;
export type MoveFolderInput = z.infer<typeof MoveFolderSchema>;
export type ReorderFoldersInput = z.infer<typeof ReorderFoldersSchema>;
export type CreateVideoInput = z.infer<typeof CreateVideoSchema>;
export type UpdateVideoInput = z.infer<typeof UpdateVideoSchema>;
export type MoveVideoInput = z.infer<typeof MoveVideoSchema>;
export type BulkMoveVideosInput = z.infer<typeof BulkMoveVideosSchema>;
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
export type ExtractMetadataInput = z.infer<typeof ExtractMetadataSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagSchema>;
export type TagAutocompleteInput = z.infer<typeof TagAutocompleteSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
