-- ============================================
-- TAKİP SİSTEMİ (FOLLOW SYSTEM) SQL KODU
-- ============================================
-- Bu SQL kodu Supabase SQL Editor'de çalıştırılmalıdır
-- Takip sistemi için gerekli tablo, indexler ve RLS politikalarını oluşturur

-- ============================================
-- 1. FOLLOWS TABLOSU OLUŞTURMA
-- ============================================

CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id) -- Kullanıcı kendini takip edemez
);

-- ============================================
-- 2. İNDEXLER OLUŞTURMA (Performans için)
-- ============================================

-- Takipçi sorguları için index
CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON follows(follower_id);

-- Takip edilen kullanıcı sorguları için index
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows(following_id);

-- Tarih sıralaması için composite index
CREATE INDEX IF NOT EXISTS follows_following_created_idx ON follows(following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS follows_follower_created_idx ON follows(follower_id, created_at DESC);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS) ETKİNLEŞTİRME
-- ============================================

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS POLİTİKALARI
-- ============================================

-- Mevcut politikaları temizle (varsa)
DROP POLICY IF EXISTS "Users can view all follows" ON follows;
DROP POLICY IF EXISTS "Users can create their own follows" ON follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON follows;
DROP POLICY IF EXISTS "Users can view follows where they are follower" ON follows;
DROP POLICY IF EXISTS "Users can view follows where they are following" ON follows;

-- 1. Herkes takip kayıtlarını görebilir (public read)
CREATE POLICY "Users can view all follows" ON follows
  FOR SELECT
  USING (true);

-- 2. Kullanıcılar sadece kendi takip kayıtlarını oluşturabilir
CREATE POLICY "Users can create their own follows" ON follows
  FOR INSERT
  WITH CHECK (
    auth.uid() = follower_id AND
    auth.uid() != following_id -- Kendini takip edemez
  );

-- 3. Kullanıcılar sadece kendi takip kayıtlarını silebilir (unfollow)
CREATE POLICY "Users can delete their own follows" ON follows
  FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================
-- 5. HELPER FUNCTIONS (Opsiyonel - İstatistikler için)
-- ============================================

-- Kullanıcının takipçi sayısını döndüren fonksiyon
CREATE OR REPLACE FUNCTION get_follower_count(p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Geçersiz UUID string'lerini kontrol et
  BEGIN
    v_user_id := p_user_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    -- Geçersiz UUID ise 0 döndür
    RETURN 0;
  END;
  
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM follows
    WHERE following_id = v_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kullanıcının takip ettiği kişi sayısını döndüren fonksiyon
CREATE OR REPLACE FUNCTION get_following_count(p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Geçersiz UUID string'lerini kontrol et
  BEGIN
    v_user_id := p_user_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    -- Geçersiz UUID ise 0 döndür
    RETURN 0;
  END;
  
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM follows
    WHERE follower_id = v_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- İki kullanıcı arasında takip ilişkisi var mı kontrol eden fonksiyon
CREATE OR REPLACE FUNCTION is_following(p_follower_id TEXT, p_following_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_follower_id UUID;
  v_following_id UUID;
BEGIN
  -- Geçersiz UUID string'lerini kontrol et
  BEGIN
    v_follower_id := p_follower_id::UUID;
    v_following_id := p_following_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    -- Geçersiz UUID ise false döndür
    RETURN false;
  END;
  
  RETURN EXISTS (
    SELECT 1
    FROM follows
    WHERE follower_id = v_follower_id
      AND following_id = v_following_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. TRIGGER'LAR (Opsiyonel - İstatistik güncelleme için)
-- ============================================

-- Takip kaydı oluşturulduğunda veya silindiğinde istatistikleri güncellemek için
-- (Eğer profiles tablosunda follower_count ve following_count kolonları varsa)

-- Örnek trigger (profiles tablosunda follower_count ve following_count kolonları varsa kullanılabilir):
/*
CREATE OR REPLACE FUNCTION update_follow_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Takip edilen kullanıcının follower_count'unu artır
    UPDATE profiles
    SET follower_count = COALESCE(follower_count, 0) + 1
    WHERE id = NEW.following_id;
    
    -- Takip eden kullanıcının following_count'unu artır
    UPDATE profiles
    SET following_count = COALESCE(following_count, 0) + 1
    WHERE id = NEW.follower_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Takip edilen kullanıcının follower_count'unu azalt
    UPDATE profiles
    SET follower_count = GREATEST(COALESCE(follower_count, 0) - 1, 0)
    WHERE id = OLD.following_id;
    
    -- Takip eden kullanıcının following_count'unu azalt
    UPDATE profiles
    SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0)
    WHERE id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS follows_stats_trigger ON follows;
CREATE TRIGGER follows_stats_trigger
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_stats();
*/

-- ============================================
-- 7. VERİ DOĞRULAMA
-- ============================================

-- Mevcut verileri kontrol et ve hatalı kayıtları temizle
-- (Kendini takip eden kayıtları sil)
DELETE FROM follows WHERE follower_id = following_id;

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

-- Authenticated kullanıcılar için izinler
GRANT SELECT, INSERT, DELETE ON follows TO authenticated;
-- Not: UUID kullanıldığı için sequence yok, bu yüzden GRANT USAGE ON SEQUENCE gerekmiyor

-- ============================================
-- TAMAMLANDI
-- ============================================
-- Bu SQL kodu çalıştırıldıktan sonra:
-- 1. follows tablosu oluşturulmuş olacak
-- 2. Indexler performans için eklenecek
-- 3. RLS politikaları güvenlik için aktif olacak
-- 4. Helper fonksiyonlar kullanılabilir olacak
-- 
-- Test için:
-- SELECT * FROM follows LIMIT 10;
-- SELECT get_follower_count('gerçek-uuid-buraya');
-- SELECT get_following_count('gerçek-uuid-buraya');
-- SELECT is_following('follower-uuid', 'following-uuid');
-- 
-- Not: 
-- - Fonksiyonlar TEXT parametre alıyor, UUID string'lerini otomatik olarak UUID'ye cast ediyor
-- - Geçersiz UUID string'leri için güvenli: get_follower_count ve get_following_count 0 döndürür, is_following false döndürür
-- - Örnek: SELECT get_follower_count('user-uuid-here'); -- 0 döndürür (geçersiz UUID)

