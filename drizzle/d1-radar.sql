-- 潛在賣家雷達 schema
-- 在 D1 Console 執行一次即可

CREATE TABLE IF NOT EXISTS radar_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,           -- dcard / ptt / threads
  external_id TEXT NOT NULL,      -- 原站 post id，用於去重
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  author TEXT,
  brand_tags TEXT,                -- JSON array string e.g. '["Hermès","Rolex"]'
  priority INTEGER NOT NULL DEFAULT 0,  -- 0~100 heuristic score
  ai_reply TEXT,                  -- 生成後快取，on-demand 時避免重複呼叫
  status TEXT NOT NULL DEFAULT 'pending',  -- pending / handled / skipped
  handled_by TEXT,                -- 處理人員名字
  handled_at INTEGER,             -- unix ms
  scraped_at INTEGER NOT NULL,    -- unix ms
  UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_radar_scraped ON radar_posts(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_status ON radar_posts(status, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_priority ON radar_posts(priority DESC, scraped_at DESC);
