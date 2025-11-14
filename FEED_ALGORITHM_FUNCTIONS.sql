-- ============================================
-- FEED ALGORITHM - SUPABASE RPC FUNCTIONS
-- ============================================
-- Feed scoring ve sıralama için SQL fonksiyonları

-- ============================================
-- 1. FEED SCORING FUNCTION
-- ============================================
-- Basit bir feed scoring algoritması
-- Formül: recency_score + engagement_score + relationship_score + interest_score

CREATE OR REPLACE FUNCTION calculate_feed_score(
  p_post_id UUID,
  p_viewer_user_id UUID,
  p_post_created_at TIMESTAMP WITH TIME ZONE,
  p_like_count INTEGER,
  p_comment_count INTEGER,
  p_save_count INTEGER,
  p_view_count INTEGER,
  p_author_id UUID
)
RETURNS DECIMAL(10, 4) AS $$
DECLARE
  recency_score DECIMAL(10, 4);
  engagement_score DECIMAL(10, 4);
  relationship_score DECIMAL(10, 4);
  interest_score DECIMAL(10, 4);
  hours_since_post DECIMAL(10, 2);
  is_following BOOLEAN;
  common_tags_count INTEGER;
BEGIN
  -- 1. RECENCY SCORE (0-100)
  -- Yeni post'lar daha yüksek skor alır
  -- İlk 24 saat: 100, sonra exponential decay
  hours_since_post := EXTRACT(EPOCH FROM (NOW() - p_post_created_at)) / 3600.0;
  
  IF hours_since_post < 24 THEN
    recency_score := 100.0 * EXP(-hours_since_post / 24.0);
  ELSIF hours_since_post < 168 THEN -- 1 hafta
    recency_score := 50.0 * EXP(-(hours_since_post - 24) / 144.0);
  ELSE
    recency_score := 10.0 * EXP(-(hours_since_post - 168) / 720.0);
  END IF;
  
  -- 2. ENGAGEMENT SCORE (0-100)
  -- Like, comment, save sayılarına göre normalize edilmiş skor
  -- Normalizasyon: log(1 + count) / log(1 + max_count) * 100
  engagement_score := (
    LOG(1 + GREATEST(p_like_count, 0)) * 0.4 +
    LOG(1 + GREATEST(p_comment_count, 0)) * 0.3 +
    LOG(1 + GREATEST(p_save_count, 0)) * 0.2 +
    LOG(1 + GREATEST(p_view_count, 0)) * 0.1
  ) / LOG(1 + 1000) * 100.0;
  
  -- 3. RELATIONSHIP SCORE (0-50)
  -- Takip edilen kullanıcıların post'ları daha yüksek skor alır
  SELECT EXISTS (
    SELECT 1 FROM follows 
    WHERE follower_id = p_viewer_user_id 
    AND following_id = p_author_id
  ) INTO is_following;
  
  IF is_following THEN
    relationship_score := 50.0;
  ELSIF p_author_id = p_viewer_user_id THEN
    relationship_score := 30.0; -- Kendi post'ları
  ELSE
    relationship_score := 10.0;
  END IF;
  
  -- 4. INTEREST SCORE (0-50)
  -- Post tag'leri ile kullanıcı ilgi alanlarının eşleşmesi
  SELECT COALESCE(SUM(ui.weight), 0) INTO interest_score
  FROM post_tags pt
  JOIN user_interests ui ON pt.tag = ui.tag
  WHERE pt.post_id = p_post_id
  AND ui.user_id = p_viewer_user_id;
  
  -- Normalize: max 50 puan
  interest_score := LEAST(interest_score * 10.0, 50.0);
  
  -- Toplam skor
  RETURN recency_score + engagement_score + relationship_score + interest_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. GET PERSONALIZED FEED
-- ============================================
-- Kullanıcı için kişiselleştirilmiş feed

CREATE OR REPLACE FUNCTION get_personalized_feed(
  p_viewer_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  author_id UUID,
  author_full_name TEXT,
  author_avatar_url TEXT,
  content TEXT,
  media JSONB,
  post_type TEXT,
  video_metadata JSONB,
  district TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  save_count INTEGER,
  view_count INTEGER,
  share_count INTEGER,
  is_liked BOOLEAN,
  is_saved BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  feed_score DECIMAL(10, 4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS post_id,
    p.author_id,
    pr.full_name AS author_full_name,
    pr.avatar_url AS author_avatar_url,
    p.content,
    p.media,
    p.post_type,
    p.video_metadata,
    p.district,
    p.like_count,
    p.comment_count,
    p.save_count,
    p.view_count,
    p.share_count,
    EXISTS(
      SELECT 1 FROM post_likes pl 
      WHERE pl.post_id = p.id 
      AND pl.user_id = p_viewer_user_id
    ) AS is_liked,
    EXISTS(
      SELECT 1 FROM post_saves ps 
      WHERE ps.post_id = p.id 
      AND ps.user_id = p_viewer_user_id
    ) AS is_saved,
    p.created_at,
    calculate_feed_score(
      p.id,
      p_viewer_user_id,
      p.created_at,
      p.like_count,
      p.comment_count,
      p.save_count,
      p.view_count,
      p.author_id
    ) AS feed_score
  FROM posts p
  JOIN profiles pr ON p.author_id = pr.id
  WHERE 
    p.room_id IS NULL -- Grup post'ları hariç
    AND p.archived = false
    AND p.visibility = 'public'
    AND (
      -- Takip edilen kullanıcıların post'ları
      EXISTS (
        SELECT 1 FROM follows f 
        WHERE f.follower_id = p_viewer_user_id 
        AND f.following_id = p.author_id
      )
      -- VEYA kendi post'ları
      OR p.author_id = p_viewer_user_id
    )
  ORDER BY feed_score DESC, p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. REELS SCORING FUNCTION
-- ============================================
-- Reels için özel scoring algoritması

CREATE OR REPLACE FUNCTION calculate_reel_score(
  p_post_id UUID,
  p_viewer_user_id UUID,
  p_post_created_at TIMESTAMP WITH TIME ZONE,
  p_like_count INTEGER,
  p_comment_count INTEGER,
  p_view_count INTEGER,
  p_share_count INTEGER,
  p_author_id UUID,
  p_avg_completion_rate DECIMAL(5, 2),
  p_avg_like_rate DECIMAL(5, 2),
  p_avg_share_rate DECIMAL(5, 2)
)
RETURNS DECIMAL(10, 4) AS $$
DECLARE
  recency_score DECIMAL(10, 4);
  engagement_score DECIMAL(10, 4);
  relationship_score DECIMAL(10, 4);
  quality_score DECIMAL(10, 4);
  hours_since_post DECIMAL(10, 2);
  is_following BOOLEAN;
BEGIN
  -- 1. RECENCY SCORE (0-40)
  hours_since_post := EXTRACT(EPOCH FROM (NOW() - p_post_created_at)) / 3600.0;
  
  IF hours_since_post < 48 THEN
    recency_score := 40.0 * EXP(-hours_since_post / 48.0);
  ELSIF hours_since_post < 168 THEN
    recency_score := 20.0 * EXP(-(hours_since_post - 48) / 120.0);
  ELSE
    recency_score := 5.0;
  END IF;
  
  -- 2. ENGAGEMENT SCORE (0-30)
  -- View count'a daha fazla ağırlık (Reels için önemli)
  engagement_score := (
    LOG(1 + GREATEST(p_view_count, 0)) * 0.5 +
    LOG(1 + GREATEST(p_like_count, 0)) * 0.3 +
    LOG(1 + GREATEST(p_comment_count, 0)) * 0.1 +
    LOG(1 + GREATEST(p_share_count, 0)) * 0.1
  ) / LOG(1 + 10000) * 30.0;
  
  -- 3. RELATIONSHIP SCORE (0-15)
  SELECT EXISTS (
    SELECT 1 FROM follows 
    WHERE follower_id = p_viewer_user_id 
    AND following_id = p_author_id
  ) INTO is_following;
  
  IF is_following THEN
    relationship_score := 15.0;
  ELSIF p_author_id = p_viewer_user_id THEN
    relationship_score := 10.0;
  ELSE
    relationship_score := 5.0;
  END IF;
  
  -- 4. QUALITY SCORE (0-15)
  -- Completion rate, like rate, share rate'a göre
  quality_score := (
    COALESCE(p_avg_completion_rate, 0) * 0.1 +
    COALESCE(p_avg_like_rate, 0) * 0.03 +
    COALESCE(p_avg_share_rate, 0) * 0.02
  );
  
  RETURN recency_score + engagement_score + relationship_score + quality_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. GET REELS FEED
-- ============================================
-- Reels için özel feed

CREATE OR REPLACE FUNCTION get_reels_feed(
  p_viewer_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  author_id UUID,
  author_full_name TEXT,
  author_avatar_url TEXT,
  content TEXT,
  media JSONB,
  video_metadata JSONB,
  district TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  view_count INTEGER,
  share_count INTEGER,
  is_liked BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  reel_score DECIMAL(10, 4),
  avg_completion_rate DECIMAL(5, 2),
  avg_like_rate DECIMAL(5, 2),
  avg_share_rate DECIMAL(5, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS post_id,
    p.author_id,
    pr.full_name AS author_full_name,
    pr.avatar_url AS author_avatar_url,
    p.content,
    p.media,
    p.video_metadata,
    p.district,
    p.like_count,
    p.comment_count,
    p.view_count,
    p.share_count,
    EXISTS(
      SELECT 1 FROM post_likes pl 
      WHERE pl.post_id = p.id 
      AND pl.user_id = p_viewer_user_id
    ) AS is_liked,
    p.created_at,
    -- Ortalama completion rate
    (
      SELECT AVG(completion_rate) 
      FROM post_views pv 
      WHERE pv.post_id = p.id 
      AND pv.completion_rate IS NOT NULL
    ) AS avg_completion_rate,
    -- Like rate (likes / views)
    CASE 
      WHEN p.view_count > 0 THEN (p.like_count::DECIMAL / p.view_count::DECIMAL) * 100
      ELSE 0
    END AS avg_like_rate,
    -- Share rate (shares / views)
    CASE 
      WHEN p.view_count > 0 THEN (p.share_count::DECIMAL / p.view_count::DECIMAL) * 100
      ELSE 0
    END AS avg_share_rate,
    calculate_reel_score(
      p.id,
      p_viewer_user_id,
      p.created_at,
      p.like_count,
      p.comment_count,
      p.view_count,
      p.share_count,
      p.author_id,
      (
        SELECT AVG(completion_rate) 
        FROM post_views pv 
        WHERE pv.post_id = p.id 
        AND pv.completion_rate IS NOT NULL
      ),
      CASE 
        WHEN p.view_count > 0 THEN (p.like_count::DECIMAL / p.view_count::DECIMAL) * 100
        ELSE 0
      END,
      CASE 
        WHEN p.view_count > 0 THEN (p.share_count::DECIMAL / p.view_count::DECIMAL) * 100
        ELSE 0
      END
    ) AS reel_score
  FROM posts p
  JOIN profiles pr ON p.author_id = pr.id
  WHERE 
    p.post_type = 'reel'
    AND p.room_id IS NULL
    AND p.archived = false
    AND p.visibility = 'public'
  ORDER BY reel_score DESC, p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_feed_score(UUID, UUID, TIMESTAMP WITH TIME ZONE, INTEGER, INTEGER, INTEGER, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_personalized_feed(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_reel_score(UUID, UUID, TIMESTAMP WITH TIME ZONE, INTEGER, INTEGER, INTEGER, INTEGER, UUID, DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_reels_feed(UUID, INTEGER, INTEGER) TO authenticated;

