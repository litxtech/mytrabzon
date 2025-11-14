-- ============================================
-- PROFİL SAYFASI İÇİN SQL EKLEMELERİ
-- ============================================
-- Bu SQL'i Supabase SQL Editor'de çalıştırın
-- Çakışma olmaz, mevcut fonksiyonları günceller veya yeni ekler
-- ============================================

-- ============================================
-- 1. KULLANICI GÖNDERİ İSTATİSTİKLERİ FONKSİYONU
-- ============================================
-- Profil sayfasında gösterilecek istatistikleri hesaplar
CREATE OR REPLACE FUNCTION get_user_posts_stats(p_user_id UUID)
RETURNS TABLE (
  total_posts INTEGER,
  total_likes INTEGER,
  total_comments INTEGER,
  total_shares INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(COUNT(DISTINCT p.id), 0)::INTEGER as total_posts,
    COALESCE(SUM(p.like_count), 0)::INTEGER as total_likes,
    COALESCE(SUM(p.comment_count), 0)::INTEGER as total_comments,
    COALESCE(SUM(p.share_count), 0)::INTEGER as total_shares
  FROM posts p
  WHERE p.author_id = p_user_id
    AND p.archived = false;
END;
$$;

-- ============================================
-- 2. KULLANICI GÖNDERİLERİNİ GETİREN FONKSİYON
-- ============================================
-- Profil sayfasında kullanıcının gönderilerini getirir
-- author_id kullanır (user_id değil)
CREATE OR REPLACE FUNCTION get_user_posts(
  p_author_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_include_private BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  content TEXT,
  media JSONB,
  district TEXT,
  hashtags TEXT[],
  visibility TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  share_count INTEGER,
  views_count INTEGER,
  is_pinned BOOLEAN,
  edited BOOLEAN,
  archived BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_full_name TEXT,
  author_avatar_url TEXT,
  is_liked BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Mevcut kullanıcıyı al
  current_user_id := auth.uid();
  
  -- Eğer kullanıcı kendi gönderilerini görüntülüyorsa, private gönderileri de dahil et
  IF p_include_private OR (current_user_id = p_author_id) THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.author_id,
      p.content,
      p.media,
      p.district,
      p.hashtags,
      p.visibility,
      p.like_count,
      p.comment_count,
      p.share_count,
      p.views_count,
      p.is_pinned,
      p.edited,
      p.archived,
      p.created_at,
      p.updated_at,
      pr.full_name as author_full_name,
      pr.avatar_url as author_avatar_url,
      EXISTS(
        SELECT 1 FROM post_likes pl 
        WHERE pl.post_id = p.id 
        AND pl.user_id = current_user_id
      ) as is_liked
    FROM posts p
    LEFT JOIN profiles pr ON p.author_id = pr.id
    WHERE p.author_id = p_author_id
      AND p.archived = false
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  ELSE
    -- Başka birinin gönderilerini görüntülüyorsa, sadece public göster
    RETURN QUERY
    SELECT 
      p.id,
      p.author_id,
      p.content,
      p.media,
      p.district,
      p.hashtags,
      p.visibility,
      p.like_count,
      p.comment_count,
      p.share_count,
      p.views_count,
      p.is_pinned,
      p.edited,
      p.archived,
      p.created_at,
      p.updated_at,
      pr.full_name as author_full_name,
      pr.avatar_url as author_avatar_url,
      EXISTS(
        SELECT 1 FROM post_likes pl 
        WHERE pl.post_id = p.id 
        AND pl.user_id = current_user_id
      ) as is_liked
    FROM posts p
    LEFT JOIN profiles pr ON p.author_id = pr.id
    WHERE p.author_id = p_author_id
      AND p.visibility = 'public'
      AND p.archived = false
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$;

-- ============================================
-- 3. KULLANICI GÖNDERİLERİ VIEW (OPSİYONEL)
-- ============================================
-- Daha hızlı sorgular için view oluştur
-- Eğer view zaten varsa, önce sil
DROP VIEW IF EXISTS user_posts_view CASCADE;

CREATE VIEW user_posts_view AS
SELECT 
  p.id,
  p.author_id,
  p.content,
  p.media,
  p.district,
  p.hashtags,
  p.visibility,
  p.like_count,
  p.comment_count,
  p.share_count,
  p.views_count,
  p.is_pinned,
  p.edited,
  p.archived,
  p.created_at,
  p.updated_at,
  pr.full_name as author_full_name,
  pr.avatar_url as author_avatar_url,
  pr.district as author_district
FROM posts p
LEFT JOIN profiles pr ON p.author_id = pr.id
WHERE p.archived = false;

-- View için index (performans)
CREATE INDEX IF NOT EXISTS idx_user_posts_view_author ON posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_posts_view_visibility ON posts(visibility, author_id);

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================
-- Fonksiyonları ve view'ı kullanıcılara aç
GRANT EXECUTE ON FUNCTION get_user_posts_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_posts(UUID, INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT SELECT ON user_posts_view TO authenticated;

-- ============================================
-- 5. KULLANIM ÖRNEKLERİ
-- ============================================
-- 
-- İstatistikleri getir:
-- SELECT * FROM get_user_posts_stats('user-uuid-here');
--
-- Kullanıcının gönderilerini getir (kendi gönderileri):
-- SELECT * FROM get_user_posts('user-uuid-here', 50, 0, true);
--
-- Başka birinin gönderilerini getir (sadece public):
-- SELECT * FROM get_user_posts('user-uuid-here', 50, 0, false);
--
-- View kullanarak:
-- SELECT * FROM user_posts_view WHERE author_id = 'user-uuid-here' ORDER BY created_at DESC;

-- ============================================
-- NOT: Bu SQL çakışma yapmaz çünkü:
-- 1. CREATE OR REPLACE kullanıyor (mevcut fonksiyonları günceller)
-- 2. DROP VIEW IF EXISTS kullanıyor (güvenli silme)
-- 3. IF NOT EXISTS kullanıyor (index'ler için)
-- 4. Yeni isimler kullanıyor (get_user_posts_stats, get_user_posts)
-- ============================================

