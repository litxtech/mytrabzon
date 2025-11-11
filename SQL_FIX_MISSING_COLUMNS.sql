-- ============================================
-- EKSİK KOLONLARI EKLE
-- ============================================
-- Bu SQL kodunu Supabase SQL Editor'e yapıştırın
-- Profil kaydetme ve gönderi sorunlarını düzeltir
-- ============================================

-- 1. user_profiles tablosuna show_in_directory kolonu ekle
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'show_in_directory'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN show_in_directory BOOLEAN DEFAULT true;
    COMMENT ON COLUMN user_profiles.show_in_directory IS 'Kullanıcı listesinde görünür olsun mu?';
  END IF;
END $$;

-- 2. Mevcut kullanıcılar için default değeri ayarla
UPDATE user_profiles 
SET show_in_directory = true 
WHERE show_in_directory IS NULL;

-- 3. user_profiles tablosundaki email kolonunu güncelle (varsa)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Email kolonuna unique constraint ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_email_key'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_email_key UNIQUE (email);
  END IF;
END $$;

-- 4. posts tablosundaki media_url kolonunun tipini kontrol et ve düzelt
-- media_url array olmalı (TEXT[])
DO $$ 
BEGIN
  -- Eğer TEXT tipindeyse TEXT[] tipine çevir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'media_url'
    AND data_type = 'text'
  ) THEN
    -- Önce mevcut verileri yedekle ve dönüştür
    ALTER TABLE posts RENAME COLUMN media_url TO media_url_old;
    ALTER TABLE posts ADD COLUMN media_url TEXT[];
    
    -- Mevcut string değerleri array'e çevir
    UPDATE posts 
    SET media_url = ARRAY[media_url_old]::TEXT[]
    WHERE media_url_old IS NOT NULL AND media_url_old != '';
    
    -- Eski kolonu sil
    ALTER TABLE posts DROP COLUMN media_url_old;
    
    RAISE NOTICE 'media_url kolonu TEXT[] tipine dönüştürüldü';
  END IF;
END $$;

-- 5. Index oluştur (performans için)
CREATE INDEX IF NOT EXISTS idx_user_profiles_show_in_directory 
  ON user_profiles(show_in_directory) 
  WHERE show_in_directory = true;

-- ============================================
-- ✅ EKSİK KOLONLAR EKLENDİ!
-- ============================================
-- 
-- Eklenen/Güncellenen Kolonlar:
-- ✅ user_profiles.show_in_directory (BOOLEAN)
-- ✅ user_profiles.email (TEXT, UNIQUE)
-- ✅ posts.media_url (TEXT[] - Array olarak düzeltildi)
-- 
-- Şimdi profil kaydetme ve gönderi oluşturma çalışacak!
-- ============================================
