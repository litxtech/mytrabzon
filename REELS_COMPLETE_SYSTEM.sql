-- ============================================
-- REELS COMPLETE SYSTEM - DATABASE SCHEMA
-- ============================================
-- Instagram/TikTok seviyesinde Reels sistemi için tam database yapısı

-- Step 1: Posts tablosuna reel kolonları ekle (eğer yoksa)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'image' CHECK (type IN ('image', 'video', 'reel'));

ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Step 2: Reel Views Tablosu (İzlenme istatistikleri - algoritmanın yakıtı)
CREATE TABLE IF NOT EXISTS reel_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reel_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  watch_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  watch_end TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT false,
  duration_watched INTEGER DEFAULT 0, -- saniye cinsinden
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(reel_id, user_id)
);

CREATE INDEX IF NOT EXISTS reel_views_reel_id_idx ON reel_views(reel_id);
CREATE INDEX IF NOT EXISTS reel_views_user_id_idx ON reel_views(user_id);
CREATE INDEX IF NOT EXISTS reel_views_watch_start_idx ON reel_views(watch_start DESC);

-- Step 3: Reel Likes Tablosu
CREATE TABLE IF NOT EXISTS reel_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reel_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(reel_id, user_id)
);

CREATE INDEX IF NOT EXISTS reel_likes_reel_id_idx ON reel_likes(reel_id);
CREATE INDEX IF NOT EXISTS reel_likes_user_id_idx ON reel_likes(user_id);

-- Step 4: Reel Shares Tablosu
CREATE TABLE IF NOT EXISTS reel_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reel_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT DEFAULT 'internal', -- 'instagram', 'whatsapp', 'internal', vs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reel_shares_reel_id_idx ON reel_shares(reel_id);
CREATE INDEX IF NOT EXISTS reel_shares_user_id_idx ON reel_shares(user_id);

-- Step 5: RLS Policies

-- Reel Views Policies
ALTER TABLE reel_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reel views" ON reel_views;
CREATE POLICY "Users can view their own reel views" ON reel_views
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create reel views" ON reel_views;
CREATE POLICY "Users can create reel views" ON reel_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reel views" ON reel_views;
CREATE POLICY "Users can update their own reel views" ON reel_views
  FOR UPDATE USING (auth.uid() = user_id);

-- Reel Likes Policies
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reel likes viewable by everyone" ON reel_likes;
CREATE POLICY "Reel likes viewable by everyone" ON reel_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like reels" ON reel_likes;
CREATE POLICY "Users can like reels" ON reel_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike reels" ON reel_likes;
CREATE POLICY "Users can unlike reels" ON reel_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Reel Shares Policies
ALTER TABLE reel_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reel shares viewable by everyone" ON reel_shares;
CREATE POLICY "Reel shares viewable by everyone" ON reel_shares
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can share reels" ON reel_shares;
CREATE POLICY "Users can share reels" ON reel_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 6: Reel Score Calculation Function
-- Instagram/TikTok seviyesinde algoritma
CREATE OR REPLACE FUNCTION calculate_reel_score(p_reel_id UUID)
RETURNS DECIMAL(10, 4) AS $$
DECLARE
  v_total_views INTEGER;
  v_completions INTEGER;
  v_likes INTEGER;
  v_shares INTEGER;
  v_completion_rate DECIMAL(5, 4);
  v_like_rate DECIMAL(5, 4);
  v_share_rate DECIMAL(5, 4);
  v_recency_score DECIMAL(10, 4);
  v_created_at TIMESTAMP WITH TIME ZONE;
  v_hours_since_creation DECIMAL(10, 2);
BEGIN
  -- Reel bilgilerini al
  SELECT created_at INTO v_created_at
  FROM posts
  WHERE id = p_reel_id AND type = 'reel';
  
  IF v_created_at IS NULL THEN
    RETURN 0;
  END IF;
  
  -- İstatistikleri hesapla
  SELECT 
    COUNT(*),
    SUM(CASE WHEN completed = true THEN 1 ELSE 0 END)
  INTO v_total_views, v_completions
  FROM reel_views
  WHERE reel_id = p_reel_id;
  
  SELECT COUNT(*) INTO v_likes
  FROM reel_likes
  WHERE reel_id = p_reel_id;
  
  SELECT COUNT(*) INTO v_shares
  FROM reel_shares
  WHERE reel_id = p_reel_id;
  
  -- Rate'leri hesapla
  v_completion_rate := CASE 
    WHEN v_total_views > 0 THEN (v_completions::DECIMAL / v_total_views)
    ELSE 0
  END;
  
  v_like_rate := CASE 
    WHEN v_total_views > 0 THEN (v_likes::DECIMAL / v_total_views)
    ELSE 0
  END;
  
  v_share_rate := CASE 
    WHEN v_total_views > 0 THEN (v_shares::DECIMAL / v_total_views)
    ELSE 0
  END;
  
  -- Recency score (yeni videolara boost)
  v_hours_since_creation := EXTRACT(EPOCH FROM (NOW() - v_created_at)) / 3600.0;
  
  IF v_hours_since_creation < 24 THEN
    v_recency_score := 1.0 * EXP(-v_hours_since_creation / 24.0);
  ELSIF v_hours_since_creation < 168 THEN -- 1 hafta
    v_recency_score := 0.5 * EXP(-(v_hours_since_creation - 24) / 144.0);
  ELSE
    v_recency_score := 0.1 * EXP(-(v_hours_since_creation - 168) / 720.0);
  END IF;
  
  -- Final score: 0.50 * completion + 0.25 * like + 0.15 * share + 0.10 * recency
  RETURN (
    0.50 * v_completion_rate +
    0.25 * v_like_rate +
    0.15 * v_share_rate +
    0.10 * v_recency_score
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Get Top Reels Function (Algoritma ile sıralanmış)
CREATE OR REPLACE FUNCTION get_top_reels(
  p_viewer_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  reel_id UUID,
  author_id UUID,
  author_full_name TEXT,
  author_avatar_url TEXT,
  content TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,
  tags TEXT[],
  like_count INTEGER,
  comment_count INTEGER,
  share_count INTEGER,
  view_count INTEGER,
  is_liked BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  reel_score DECIMAL(10, 4),
  total_views INTEGER,
  completions INTEGER,
  likes INTEGER,
  shares INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS reel_id,
    p.author_id,
    pr.full_name AS author_full_name,
    pr.avatar_url AS author_avatar_url,
    p.content,
    p.video_url,
    p.thumbnail_url,
    p.width,
    p.height,
    p.duration_seconds,
    p.tags,
    p.like_count,
    p.comment_count,
    p.share_count,
    p.views_count AS view_count,
    EXISTS(
      SELECT 1 FROM reel_likes rl 
      WHERE rl.reel_id = p.id 
      AND rl.user_id = p_viewer_user_id
    ) AS is_liked,
    p.created_at,
    calculate_reel_score(p.id) AS reel_score,
    COALESCE(rv.total_views, 0) AS total_views,
    COALESCE(rv.completions, 0) AS completions,
    COALESCE(rl.likes, 0) AS likes,
    COALESCE(rs.shares, 0) AS shares
  FROM posts p
  JOIN profiles pr ON p.author_id = pr.id
  LEFT JOIN (
    SELECT 
      reel_id,
      COUNT(*) AS total_views,
      SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) AS completions
    FROM reel_views
    GROUP BY reel_id
  ) rv ON rv.reel_id = p.id
  LEFT JOIN (
    SELECT reel_id, COUNT(*) AS likes
    FROM reel_likes
    GROUP BY reel_id
  ) rl ON rl.reel_id = p.id
  LEFT JOIN (
    SELECT reel_id, COUNT(*) AS shares
    FROM reel_shares
    GROUP BY reel_id
  ) rs ON rs.reel_id = p.id
  WHERE 
    p.type = 'reel'
    AND p.archived = false
    AND p.visibility = 'public'
    AND p.room_id IS NULL -- Grup reel'leri hariç
  ORDER BY calculate_reel_score(p.id) DESC, p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Track Reel View Function
CREATE OR REPLACE FUNCTION track_reel_view(
  p_reel_id UUID,
  p_user_id UUID,
  p_watch_start TIMESTAMP WITH TIME ZONE,
  p_watch_end TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_completed BOOLEAN DEFAULT false,
  p_duration_watched INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_view_id UUID;
BEGIN
  INSERT INTO reel_views (
    reel_id,
    user_id,
    watch_start,
    watch_end,
    completed,
    duration_watched
  )
  VALUES (
    p_reel_id,
    p_user_id,
    p_watch_start,
    p_watch_end,
    p_completed,
    p_duration_watched
  )
  ON CONFLICT (reel_id, user_id) 
  DO UPDATE SET
    watch_start = EXCLUDED.watch_start,
    watch_end = EXCLUDED.watch_end,
    completed = EXCLUDED.completed,
    duration_watched = EXCLUDED.duration_watched
  RETURNING id INTO v_view_id;
  
  -- View count'u güncelle
  UPDATE posts 
  SET views_count = views_count + 1
  WHERE id = p_reel_id;
  
  RETURN v_view_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Grant Permissions
GRANT EXECUTE ON FUNCTION calculate_reel_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_reels(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION track_reel_view(UUID, UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, BOOLEAN, INTEGER) TO authenticated;

-- Step 10: Trigger for Reel Like Count
CREATE OR REPLACE FUNCTION update_reel_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET like_count = like_count + 1 
    WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET like_count = GREATEST(0, like_count - 1) 
    WHERE id = OLD.reel_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reel_like_count_trigger ON reel_likes;
CREATE TRIGGER reel_like_count_trigger
  AFTER INSERT OR DELETE ON reel_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_reel_like_count();

-- Step 11: Trigger for Reel Share Count
CREATE OR REPLACE FUNCTION update_reel_share_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET share_count = share_count + 1 
    WHERE id = NEW.reel_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reel_share_count_trigger ON reel_shares;
CREATE TRIGGER reel_share_count_trigger
  AFTER INSERT ON reel_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_reel_share_count();

