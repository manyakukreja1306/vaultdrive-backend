-- =============================================================
-- VaultDrive — Initial Schema Migration
-- Version: 001
-- Instruction: Run this manually inside Docker:
--   docker exec -it vaultdrive-db psql -U postgres -d vaultdrive -f /migrations/001_initial_schema.sql
-- OR paste into psql interactive shell:
--   docker exec -it vaultdrive-db psql -U postgres -d vaultdrive
-- WARNING: Drops existing tables — only run on a fresh database.
-- =============================================================

-- Drop old tables if they exist (run carefully — this resets data)
DROP TABLE IF EXISTS file_references CASCADE;
DROP TABLE IF EXISTS file_blobs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS folders CASCADE;
DROP TABLE IF EXISTS dedup_events CASCADE;
DROP TABLE IF EXISTS shared_links CASCADE;

-- USERS TABLE (full schema)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  display_name TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'local',
  oauth_id TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  storage_used BIGINT NOT NULL DEFAULT 0,
  storage_limit BIGINT NOT NULL DEFAULT 5368709120,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- FILE BLOBS TABLE (full schema)
CREATE TABLE file_blobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sha256_hash TEXT NOT NULL UNIQUE,
  s3_key TEXT NOT NULL UNIQUE,
  size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  reference_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- FILE REFERENCES TABLE
CREATE TABLE file_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blob_id UUID NOT NULL REFERENCES file_blobs(id),
  folder_id UUID,
  display_name TEXT NOT NULL,
  is_trashed BOOLEAN NOT NULL DEFAULT FALSE,
  trashed_at TIMESTAMP,
  is_starred BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMP
);

-- FOLDERS TABLE
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- DEDUP EVENTS TABLE
CREATE TABLE dedup_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blob_id UUID NOT NULL REFERENCES file_blobs(id),
  bytes_saved BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- SHARED LINKS TABLE
CREATE TABLE shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_ref_id UUID NOT NULL REFERENCES file_references(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash TEXT,
  download_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE UNIQUE INDEX idx_file_blobs_hash ON file_blobs(sha256_hash);
CREATE INDEX idx_file_refs_user ON file_references(user_id);
CREATE INDEX idx_file_refs_folder ON file_references(folder_id);
CREATE INDEX idx_file_refs_user_trashed ON file_references(user_id, is_trashed);
CREATE INDEX idx_dedup_events_user ON dedup_events(user_id);
CREATE UNIQUE INDEX idx_shared_links_token ON shared_links(token);
CREATE INDEX idx_folders_user_parent ON folders(user_id, parent_id);

-- VIEWS
CREATE OR REPLACE VIEW storage_savings_per_user AS
SELECT
  u.id AS user_id,
  u.email,
  COALESCE(SUM(de.bytes_saved), 0) AS total_bytes_saved,
  COUNT(de.id) AS dedup_count,
  u.storage_used,
  u.storage_limit,
  CASE
    WHEN (COALESCE(SUM(de.bytes_saved), 0) + u.storage_used) = 0 THEN 0
    ELSE ROUND(
      COALESCE(SUM(de.bytes_saved), 0)::NUMERIC /
      NULLIF((COALESCE(SUM(de.bytes_saved), 0) + u.storage_used), 0) * 100,
      2
    )
  END AS dedup_rate_pct
FROM users u
LEFT JOIN dedup_events de ON de.user_id = u.id
GROUP BY u.id, u.email, u.storage_used, u.storage_limit;

CREATE OR REPLACE VIEW file_reference_details AS
SELECT
  fr.id,
  fr.display_name,
  fb.mime_type,
  fb.size_bytes,
  fb.sha256_hash,
  fb.s3_key,
  fr.uploaded_at,
  fr.is_starred,
  fr.is_trashed,
  fr.folder_id,
  u.email AS uploader_email,
  fr.user_id
FROM file_references fr
JOIN file_blobs fb ON fb.id = fr.blob_id
JOIN users u ON u.id = fr.user_id;

-- STORED PROCEDURES
CREATE OR REPLACE FUNCTION increment_reference_count(blob_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE file_blobs SET reference_count = reference_count + 1 WHERE id = blob_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_global_savings()
RETURNS TABLE(
  total_unique_blobs BIGINT,
  total_references BIGINT,
  total_bytes_saved_globally BIGINT,
  global_dedup_rate_pct NUMERIC,
  total_s3_storage_bytes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT fb.id)::BIGINT AS total_unique_blobs,
    COUNT(fr.id)::BIGINT AS total_references,
    COALESCE(SUM(de.bytes_saved), 0)::BIGINT AS total_bytes_saved_globally,
    CASE
      WHEN COUNT(fr.id) = 0 THEN 0
      ELSE ROUND(
        COUNT(de.id)::NUMERIC / NULLIF(COUNT(fr.id), 0) * 100, 2
      )
    END AS global_dedup_rate_pct,
    COALESCE(SUM(DISTINCT fb.size_bytes), 0)::BIGINT AS total_s3_storage_bytes
  FROM file_blobs fb
  LEFT JOIN file_references fr ON fr.blob_id = fb.id
  LEFT JOIN dedup_events de ON de.blob_id = fb.id;
END;
$$ LANGUAGE plpgsql;
