-- ============================================
-- KULLANICI ENGELLEME SİSTEMİ (USER BLOCKING SYSTEM)
-- ============================================
-- Bu SQL kodu Supabase SQL Editor'de çalıştırılmalıdır
-- Kullanıcı engelleme sistemi için gerekli tablo, indexler ve RLS politikalarını oluşturur

-- ============================================
-- 1. USER_BLOCKS TABLOSU OLUŞTURMA
-- ============================================

CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id) -- Kullanıcı kendini engelleyemez
);

-- ============================================
-- 2. İNDEXLER OLUŞTURMA (Performans için)
-- ============================================

-- Engelleyen kullanıcı sorguları için index
CREATE INDEX IF NOT EXISTS user_blocks_blocker_id_idx ON user_blocks(blocker_id);

-- Engellenen kullanıcı sorguları için index
CREATE INDEX IF NOT EXISTS user_blocks_blocked_id_idx ON user_blocks(blocked_id);

-- Composite index (her iki yönde de hızlı sorgu için)
CREATE INDEX IF NOT EXISTS user_blocks_blocker_blocked_idx ON user_blocks(blocker_id, blocked_id);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS) ETKİNLEŞTİRME
-- ============================================

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS POLİTİKALARI
-- ============================================

-- Mevcut politikaları temizle (varsa)
DROP POLICY IF EXISTS "Users can view their own blocks" ON user_blocks;
DROP POLICY IF EXISTS "Users can create their own blocks" ON user_blocks;
DROP POLICY IF EXISTS "Users can delete their own blocks" ON user_blocks;

-- Kullanıcılar kendi engellemelerini görebilir
CREATE POLICY "Users can view their own blocks" ON user_blocks
  FOR SELECT
  USING (auth.uid() = blocker_id);

-- Kullanıcılar kendi engellemelerini oluşturabilir
CREATE POLICY "Users can create their own blocks" ON user_blocks
  FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- Kullanıcılar kendi engellemelerini silebilir (engeli kaldırabilir)
CREATE POLICY "Users can delete their own blocks" ON user_blocks
  FOR DELETE
  USING (auth.uid() = blocker_id);

-- ============================================
-- 5. HELPER FUNCTIONS (Engelleme kontrolü için)
-- ============================================

-- İki kullanıcı arasında engelleme var mı kontrol eden fonksiyon
CREATE OR REPLACE FUNCTION is_user_blocked(p_blocker_id UUID, p_blocked_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_blocks
    WHERE (blocker_id = p_blocker_id AND blocked_id = p_blocked_id)
       OR (blocker_id = p_blocked_id AND blocked_id = p_blocker_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kullanıcının engellediği kullanıcıların listesini döndüren fonksiyon
CREATE OR REPLACE FUNCTION get_blocked_user_ids(p_user_id UUID)
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT blocked_id
    FROM user_blocks
    WHERE blocker_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kullanıcıyı engelleyen kullanıcıların listesini döndüren fonksiyon
CREATE OR REPLACE FUNCTION get_blocker_user_ids(p_user_id UUID)
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT blocker_id
    FROM user_blocks
    WHERE blocked_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

-- Authenticated kullanıcılar için izinler
GRANT SELECT, INSERT, DELETE ON user_blocks TO authenticated;

-- ============================================
-- TAMAMLANDI
-- ============================================
-- Bu SQL kodu çalıştırıldıktan sonra:
-- 1. user_blocks tablosu oluşturulmuş olacak
-- 2. Indexler performans için eklenecek
-- 3. RLS politikaları güvenlik için aktif olacak
-- 4. Helper fonksiyonlar engelleme kontrolü için hazır olacak

