// TypeScript interfaces matching the Prisma schema models

export type Platform =
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'PINTEREST'
  | 'X_TWITTER'
  | 'VIMEO'
  | 'REDDIT'
  | 'OTHER';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  parentId: string | null;
  userId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  // Computed / joined
  children?: Folder[];
  videoCount?: number;
  subfolderCount?: number;
}

export interface Video {
  id: string;
  url: string;
  platform: Platform;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  originalThumb: string | null;
  duration: number | null;
  authorName: string | null;
  authorUrl: string | null;
  notes: string | null;
  folderId: string;
  userId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  // Joined
  tags?: Tag[];
  folder?: Pick<Folder, 'id' | 'name' | 'color' | 'icon'>;
}

export interface Tag {
  id: string;
  name: string;
  userId: string;
  // Computed
  videoCount?: number;
}

// Metadata extracted from a video URL before saving
export interface VideoMetadata {
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  authorName: string | null;
  authorUrl: string | null;
  platform: Platform;
}

// Standard API response envelope
export type ApiSuccess<T> = { data: T; error: null };
export type ApiError = { data: null; error: { message: string; code: string } };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Pagination
export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Auth
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
}

// Search results
export interface SearchResults {
  folders: Folder[];
  videos: Video[];
  query: string;
}

// Folder with breadcrumb path
export interface FolderWithPath extends Folder {
  path: Array<{ id: string; name: string }>;
}
