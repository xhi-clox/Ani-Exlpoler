import { query } from "./pool";
import { logger } from "../lib/logger";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anime_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  analysis_type VARCHAR(50) NOT NULL DEFAULT 'other',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  view_count INT DEFAULT 0,
  upvote_count INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, analysis_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  upvote_count INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS comment_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);

CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_analyses_anime_id ON analyses(anime_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_upvote_count ON analyses(upvote_count DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_analysis_id ON comments(analysis_id);
CREATE INDEX IF NOT EXISTS idx_upvotes_analysis_id ON upvotes(analysis_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS pronouns VARCHAR(50) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_view_count INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS top_anime (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anime_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  image_url TEXT DEFAULT '',
  rank INT NOT NULL CHECK (rank >= 1 AND rank <= 10),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, rank)
);

CREATE TABLE IF NOT EXISTS profile_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, target_user_id)
);

CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  anime_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  image_url TEXT DEFAULT '',
  rank INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_top_anime_user_id ON top_anime(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_profile_upvotes_target ON profile_upvotes(target_user_id);

CREATE TABLE IF NOT EXISTS top_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id INT NOT NULL,
  name VARCHAR(300) NOT NULL,
  image_url TEXT DEFAULT '',
  anime_name VARCHAR(500) DEFAULT '',
  rank INT NOT NULL CHECK (rank >= 1 AND rank <= 10),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_top_characters_user_id ON top_characters(user_id);

CREATE TABLE IF NOT EXISTS streaming_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id INT NOT NULL,
  episode_number INT NOT NULL DEFAULT 0,
  site_name VARCHAR(100) NOT NULL,
  site_url TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'sub',
  quality VARCHAR(20) DEFAULT 'hd',
  is_active BOOLEAN DEFAULT TRUE,
  submitted_by UUID REFERENCES users(id),
  last_checked TIMESTAMP,
  last_verified TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(anime_id, episode_number, site_url)
);

CREATE TABLE IF NOT EXISTS watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anime_id INT NOT NULL,
  episode_number INT NOT NULL DEFAULT 0,
  source_id UUID REFERENCES streaming_sources(id),
  watched_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, anime_id, episode_number)
);

CREATE TABLE IF NOT EXISTS link_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES streaming_sources(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  report_type VARCHAR(20) NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watch_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anime_id INT NOT NULL,
  current_episode INT NOT NULL DEFAULT 0,
  total_episodes INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, anime_id)
);

CREATE INDEX IF NOT EXISTS idx_sources_anime_id ON streaming_sources(anime_id);
CREATE INDEX IF NOT EXISTS idx_sources_active ON streaming_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_watch_user_anime ON watch_history(user_id, anime_id);
CREATE INDEX IF NOT EXISTS idx_watch_user ON watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON watch_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_anime ON watch_progress(user_id, anime_id);
`;

export async function runMigrations(): Promise<void> {
  logger.info("Running database migrations...");
  const statements = SCHEMA.split(";").filter((s) => s.trim().length > 0);
  for (const stmt of statements) {
    await query(stmt.trim() + ";");
  }
  logger.info("Database migrations complete");
}
