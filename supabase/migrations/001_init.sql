-- =============================================================
-- ClipVault — Initial Supabase Migration
-- Run this in the Supabase SQL Editor after creating your project
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- for fuzzy text search
CREATE EXTENSION IF NOT EXISTS "unaccent";     -- for accent-insensitive search

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE "Platform" AS ENUM (
  'YOUTUBE',
  'TIKTOK',
  'INSTAGRAM',
  'FACEBOOK',
  'PINTEREST',
  'X_TWITTER',
  'VIMEO',
  'REDDIT',
  'OTHER'
);

-- =============================================================
-- TABLES
-- =============================================================

CREATE TABLE "User" (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email         TEXT        UNIQUE NOT NULL,
  "displayName" TEXT,
  "avatarUrl"   TEXT,
  "createdAt"   TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE "Folder" (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT        NOT NULL,
  description TEXT,
  color       TEXT,
  icon        TEXT,
  "parentId"  TEXT        REFERENCES "Folder"(id) ON DELETE CASCADE,
  "userId"    TEXT        NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "sortOrder" INTEGER     DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE "Video" (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  url             TEXT        NOT NULL,
  platform        "Platform"  NOT NULL,
  title           TEXT,
  description     TEXT,
  "thumbnailUrl"  TEXT,
  "originalThumb" TEXT,
  duration        INTEGER,
  "authorName"    TEXT,
  "authorUrl"     TEXT,
  notes           TEXT,
  "folderId"      TEXT        NOT NULL REFERENCES "Folder"(id) ON DELETE CASCADE,
  "userId"        TEXT        NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "sortOrder"     INTEGER     DEFAULT 0,
  "createdAt"     TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE ("userId", url)
);

CREATE TABLE "Tag" (
  id       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name     TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  UNIQUE ("userId", name)
);

-- Join table for Video <-> Tag many-to-many
CREATE TABLE "_VideoTags" (
  "A" TEXT NOT NULL REFERENCES "Video"(id) ON DELETE CASCADE,
  "B" TEXT NOT NULL REFERENCES "Tag"(id) ON DELETE CASCADE,
  PRIMARY KEY ("A", "B")
);

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_folder_user_parent   ON "Folder"("userId", "parentId");
CREATE INDEX idx_folder_user_sort     ON "Folder"("userId", "sortOrder");
CREATE INDEX idx_video_user_folder    ON "Video"("userId", "folderId");
CREATE INDEX idx_video_platform       ON "Video"(platform);
CREATE INDEX idx_video_user_created   ON "Video"("userId", "createdAt" DESC);
CREATE INDEX idx_tag_user             ON "Tag"("userId");
CREATE INDEX idx_video_tags_b         ON "_VideoTags"("B");

-- =============================================================
-- FULL-TEXT SEARCH
-- =============================================================

-- Add tsvector columns for full-text search
ALTER TABLE "Video" ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;

ALTER TABLE "Folder" ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX idx_video_fts    ON "Video" USING GIN(search_vector);
CREATE INDEX idx_folder_fts   ON "Folder" USING GIN(search_vector);

-- =============================================================
-- UPDATED_AT TRIGGER
-- =============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_updated_at   BEFORE UPDATE ON "User"   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_folder_updated_at BEFORE UPDATE ON "Folder" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_video_updated_at  BEFORE UPDATE ON "Video"  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- ROW-LEVEL SECURITY (RLS)
-- =============================================================

ALTER TABLE "User"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Folder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Video"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag"    ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own profile
CREATE POLICY "users_own_profile"
  ON "User" FOR ALL
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- Folders: users can only access their own
CREATE POLICY "folders_own"
  ON "Folder" FOR ALL
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- Videos: users can only access their own
CREATE POLICY "videos_own"
  ON "Video" FOR ALL
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- Tags: users can only access their own
CREATE POLICY "tags_own"
  ON "Tag" FOR ALL
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- =============================================================
-- STORAGE BUCKET
-- =============================================================

-- Run this in Supabase Dashboard > Storage, or via the Management API:
-- Create a bucket named "thumbnails" with public access for reading

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('thumbnails', 'thumbnails', true);

-- Storage policies (allow users to manage their own thumbnails)
-- CREATE POLICY "thumbnail_insert" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "thumbnail_read" ON storage.objects FOR SELECT
--   USING (bucket_id = 'thumbnails');

-- CREATE POLICY "thumbnail_delete" ON storage.objects FOR DELETE
--   USING (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);
