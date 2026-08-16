-- PaperHub — D1 schema (replaces the Base44 entity store).
-- Every table carries the Base44 record envelope (id/created_date/updated_date/
-- created_by_id/created_by) so records exported from Base44 import unchanged.

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT,
  full_name       TEXT,
  email_verified  INTEGER NOT NULL DEFAULT 0,
  is_admin        INTEGER NOT NULL DEFAULT 0,
  role            TEXT DEFAULT 'student',      -- student | researcher | lecturer
  university      TEXT,
  points          REAL DEFAULT 0,
  orcid_id        TEXT,
  username        TEXT,
  profile_visible INTEGER DEFAULT 1,
  created_date    TEXT NOT NULL,
  updated_date    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS presentations (
  id                        TEXT PRIMARY KEY,
  title                     TEXT NOT NULL,
  file_url                  TEXT,
  video_url                 TEXT,
  handout_url               TEXT,
  handout_license           TEXT,
  handout_status            TEXT,               -- approved | blocked | pending
  handout_is_derived        INTEGER DEFAULT 0,
  handout_downloads         REAL DEFAULT 0,
  handout_uploaded_at       TEXT,
  handout_uploaded_by       TEXT,
  thumbnail_url             TEXT,
  doi                       TEXT NOT NULL,
  paper_title               TEXT,
  paper_license             TEXT,
  has_nd_restriction        INTEGER DEFAULT 0,
  extra_papers              TEXT,               -- JSON array [{doi,title}]
  discipline                TEXT NOT NULL,
  paper_type                TEXT,
  license                   TEXT NOT NULL,
  is_author                 INTEGER DEFAULT 0,
  authorship_verified       INTEGER DEFAULT 0,
  authorship_method         TEXT,
  authorship_matched_author TEXT,
  download_allowed          INTEGER DEFAULT 1,
  tags                      TEXT,
  uploader_id               TEXT,
  uploader_name             TEXT,
  uploader_university       TEXT,
  avg_rating                REAL DEFAULT 0,
  rating_count              REAL DEFAULT 0,
  downloads                 REAL DEFAULT 0,
  created_by_id             TEXT,
  created_by                TEXT,
  created_date              TEXT NOT NULL,
  updated_date              TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pres_uploader ON presentations(uploader_id);
CREATE INDEX IF NOT EXISTS idx_pres_created ON presentations(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_pres_doi ON presentations(doi);

CREATE TABLE IF NOT EXISTS comments (
  id              TEXT PRIMARY KEY,
  presentation_id TEXT NOT NULL,
  user_id         TEXT,
  user_name       TEXT,
  user_university TEXT,
  text            TEXT NOT NULL,
  created_by_id   TEXT,
  created_by      TEXT,
  created_date    TEXT NOT NULL,
  updated_date    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_pres ON comments(presentation_id);

CREATE TABLE IF NOT EXISTS ratings (
  id              TEXT PRIMARY KEY,
  presentation_id TEXT NOT NULL,
  user_id         TEXT,
  score           REAL NOT NULL,
  created_by_id   TEXT,
  created_by      TEXT,
  created_date    TEXT NOT NULL,
  updated_date    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ratings_pres ON ratings(presentation_id);

CREATE TABLE IF NOT EXISTS download_consents (
  id              TEXT PRIMARY KEY,
  presentation_id TEXT NOT NULL,
  user_id         TEXT,
  user_name       TEXT,
  license         TEXT NOT NULL,
  download_mode   TEXT,
  timestamp       TEXT NOT NULL,
  created_by_id   TEXT,
  created_by      TEXT,
  created_date    TEXT NOT NULL,
  updated_date    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS authorship_audit_log (
  id                   TEXT PRIMARY KEY,
  presentation_id      TEXT,
  user_id              TEXT,
  user_email           TEXT,
  user_name            TEXT,
  doi                  TEXT NOT NULL,
  claimed_author       INTEGER DEFAULT 0,
  verification_method  TEXT,
  verification_result  INTEGER NOT NULL DEFAULT 0,
  matched_author_name  TEXT,
  email_quality_score  REAL,
  orcid_id             TEXT,
  timestamp            TEXT NOT NULL,
  created_by_id        TEXT,
  created_by           TEXT,
  created_date         TEXT NOT NULL,
  updated_date         TEXT NOT NULL
);

-- Auth support tables ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS otp_codes (
  email      TEXT PRIMARY KEY,
  code_hash  TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  sent_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0
);
