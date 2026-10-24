CREATE TABLE players (
  id                TEXT PRIMARY KEY,
  provider          TEXT NOT NULL DEFAULT 'web'
                    CHECK (provider IN ('web', 'tiktok')),
  external_id       TEXT,
  pseudo            TEXT NOT NULL,
  pseudo_normalized TEXT NOT NULL,
  avatar            TEXT NOT NULL,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  CHECK (
    (provider = 'web' AND external_id IS NULL)
    OR (provider = 'tiktok' AND external_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX players_provider_external
  ON players(provider, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX players_pseudo_normalized
  ON players(pseudo_normalized);

CREATE TABLE player_sessions (
  id           TEXT PRIMARY KEY,
  player_id    TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX player_sessions_player
  ON player_sessions(player_id);

CREATE INDEX player_sessions_expires
  ON player_sessions(expires_at);

CREATE TABLE matches (
  id                TEXT PRIMARY KEY,
  room_code         TEXT NOT NULL,
  mode              TEXT NOT NULL
                    CHECK (mode IN ('CLASSIC', 'SUBJECT', 'CONTEST')),
  category          TEXT,
  difficulty        TEXT
                    CHECK (difficulty IS NULL OR difficulty IN ('Novice', 'Adventurer', 'Wizard')),
  source            TEXT NOT NULL
                    CHECK (source IN ('web', 'tiktok')),
  player_count      INTEGER NOT NULL CHECK (player_count BETWEEN 0 AND 100),
  total_questions   INTEGER NOT NULL CHECK (total_questions > 0),
  status            TEXT NOT NULL
                    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  winning_player_id TEXT,
  settings_json     TEXT NOT NULL,
  protocol_version  INTEGER NOT NULL DEFAULT 1,
  created_at        INTEGER NOT NULL,
  started_at        INTEGER,
  ended_at          INTEGER,
  FOREIGN KEY (winning_player_id) REFERENCES players(id),
  CHECK (
    (mode = 'SUBJECT' AND category IS NOT NULL AND difficulty IS NOT NULL)
    OR (mode IN ('CLASSIC', 'CONTEST') AND category IS NULL AND difficulty IS NULL)
  )
);

CREATE INDEX matches_status_ended
  ON matches(status, ended_at);

CREATE INDEX matches_mode_source
  ON matches(mode, source);

CREATE TABLE scores (
  match_id          TEXT NOT NULL,
  player_id         TEXT NOT NULL,
  pseudo_snapshot   TEXT NOT NULL,
  avatar_snapshot   TEXT NOT NULL,
  provider          TEXT NOT NULL
                    CHECK (provider IN ('web', 'tiktok')),
  score             INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  correct_count     INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  wrong_count       INTEGER NOT NULL DEFAULT 0 CHECK (wrong_count >= 0),
  timeout_count     INTEGER NOT NULL DEFAULT 0 CHECK (timeout_count >= 0),
  total_response_ms INTEGER NOT NULL DEFAULT 0 CHECK (total_response_ms >= 0),
  best_streak       INTEGER NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  lives_remaining   INTEGER NOT NULL DEFAULT 0 CHECK (lives_remaining >= 0),
  status            TEXT NOT NULL
                    CHECK (status IN ('playing', 'completed', 'eliminated',
                                      'forfeited', 'abandoned')),
  joined_at         INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  finalized_at      INTEGER,
  PRIMARY KEY (match_id, player_id),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE INDEX scores_player
  ON scores(player_id, finalized_at);

CREATE INDEX scores_match_score
  ON scores(match_id, score DESC);

CREATE TABLE questions (
  id               TEXT PRIMARY KEY,
  category         TEXT NOT NULL,
  subject          TEXT NOT NULL,
  question_text    TEXT NOT NULL,
  options_json     TEXT NOT NULL,
  correct_index    INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation      TEXT NOT NULL,
  article_title    TEXT NOT NULL,
  article_body     TEXT NOT NULL,
  image_url        TEXT,
  image_alt        TEXT,
  image_credit     TEXT,
  image_license    TEXT,
  image_source_url TEXT,
  content_hash     TEXT NOT NULL UNIQUE,
  imported_at      INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);

CREATE INDEX questions_category
  ON questions(category);

CREATE TABLE questions_pending (
  id             TEXT PRIMARY KEY,
  payload_json   TEXT NOT NULL,
  source         TEXT NOT NULL CHECK (source IN ('gemini', 'manual', 'legacy')),
  model          TEXT,
  prompt_version TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at     INTEGER NOT NULL,
  reviewed_at    INTEGER,
  review_note    TEXT
);

CREATE INDEX questions_pending_status
  ON questions_pending(status, created_at);
