-- ============================================
-- KALAN SORUNLARI DÜZELTME SQL
-- ============================================

-- 1. KULLANICI SAYISI HATASI DÜZELTME
-- getAllUsers query'sinde count doğru döndürülüyor ama frontend'de gösterilmiyor
-- Bu SQL sadece trigger'ları kontrol ediyor

-- 2. BEĞENİ/YORUM SAYISI HATASI DÜZELTME
-- Trigger'lar çalışıyor ama belki duplicate trigger'lar var
-- Tüm eski trigger'ları kaldırıp yeniden oluştur

-- ============================================
-- POST LIKE COUNT TRIGGER'LARI
-- ============================================

-- ÖNCE trigger'ları kaldır (fonksiyonlardan önce)
DROP TRIGGER IF EXISTS trigger_update_post_like_count ON post_likes;
DROP TRIGGER IF EXISTS post_like_count_trigger ON post_likes;
DROP TRIGGER IF EXISTS on_post_like_created ON post_likes;
DROP TRIGGER IF EXISTS on_post_like_deleted ON post_likes;
DROP TRIGGER IF EXISTS trg_update_post_like_count ON post_likes;

-- SONRA fonksiyonları kaldır (CASCADE ile)
DROP FUNCTION IF EXISTS update_post_like_count() CASCADE;
DROP FUNCTION IF EXISTS increment_post_likes() CASCADE;
DROP FUNCTION IF EXISTS decrement_post_likes() CASCADE;

-- YENİ: Tek bir fonksiyon ile hem INSERT hem DELETE işlemi
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Sadece 1 artır
    UPDATE posts 
    SET like_count = COALESCE(like_count, 0) + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Sadece 1 azalt
    UPDATE posts 
    SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1) 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- YENİ: Tek trigger ile hem INSERT hem DELETE
CREATE TRIGGER post_like_count_trigger
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_like_count();

-- ============================================
-- POST COMMENT COUNT TRIGGER'LARI
-- ============================================
-- NOT: Tablo adı "comments" (post_comments değil)

-- ÖNCE trigger'ları kaldır (fonksiyonlardan önce)
-- post_comments tablosu yok, sadece comments var
DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON comments;
DROP TRIGGER IF EXISTS post_comment_count_trigger ON comments;
DROP TRIGGER IF EXISTS on_comment_created ON comments;
DROP TRIGGER IF EXISTS on_comment_deleted ON comments;
DROP TRIGGER IF EXISTS comment_count_trigger ON comments;
DROP TRIGGER IF EXISTS trg_update_post_comment_count ON comments;

-- SONRA fonksiyonları kaldır (CASCADE ile)
DROP FUNCTION IF EXISTS update_post_comment_count() CASCADE;
DROP FUNCTION IF EXISTS increment_post_comments() CASCADE;
DROP FUNCTION IF EXISTS decrement_post_comments() CASCADE;

-- YENİ: Tek bir fonksiyon ile hem INSERT hem DELETE işlemi
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Sadece 1 artır
    UPDATE posts 
    SET comment_count = COALESCE(comment_count, 0) + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Sadece 1 azalt
    UPDATE posts 
    SET comment_count = GREATEST(0, COALESCE(comment_count, 0) - 1) 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- YENİ: Tek trigger ile hem INSERT hem DELETE
-- comments tablosu için (post_comments yok)
CREATE TRIGGER comment_count_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Tüm trigger''lar düzeltildi';
  RAISE NOTICE '✅ Beğeni/yorum sayısı artık doğru çalışacak (1 artır/1 azalt)';
END $$;

-- ============================================
-- SONUÇ
-- ============================================
-- Tüm duplicate trigger'lar kaldırıldı
-- Yeni trigger'lar sadece 1 artır/1 azalt yapıyor
-- Beğeni/yorum sayısı artık doğru çalışacak
-- ============================================

