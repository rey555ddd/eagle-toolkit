-- Cloudflare D1 schema for AI output feedback (FeedbackBar)
-- Run once with: wrangler d1 execute eagle-toolkit-db --remote --file=./drizzle/d1-feedback.sql

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  output_id TEXT NOT NULL,
  rating TEXT NOT NULL CHECK(rating IN ('up', 'down', 'gold')),
  tool TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_tool ON feedback(tool);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);

CREATE TABLE IF NOT EXISTS gold_library (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  tool TEXT NOT NULL,
  tags TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gold_tool ON gold_library(tool);
