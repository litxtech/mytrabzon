-- ============================================
-- EKSİK PROFİLLERİ OLUŞTUR
-- ============================================
-- Belirli kullanıcılar için profil oluştur
-- ============================================

-- 1. Email kolonunu kontrol et ve ekle (yoksa)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
    RAISE NOTICE 'Email kolonu eklendi';
  END IF;
END $$;

-- 2. Belirli kullanıcılar için profil oluştur
-- Email kolonu varsa email ile, yoksa email olmadan

DO $$
BEGIN
  -- Email kolonu kontrolü
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'email'
  ) THEN
    -- Email kolonu varsa
    INSERT INTO profiles (id, email, full_name, district, created_at, updated_at)
    SELECT 
      u.id,
      COALESCE(u.email, ''),
      COALESCE(u.raw_user_meta_data->>'full_name', 'Kullanıcı'),
      COALESCE(u.raw_user_meta_data->>'district', 'Ortahisar'),
      COALESCE(u.created_at, NOW()),
      NOW()
    FROM auth.users u
    WHERE u.id IN (
      '98542f02-11f8-4ccd-b38d-4dd42066daa7', -- support@litxtech.com
      '51658e96-c70d-49df-9231-77dbe06a0151', -- sonertoprak97@icloud.com
      '9b1a75ed-0a94-4365-955b-301f114d97b4', -- sonertoprak97@gmail.com
      '22f07c07-c7c6-4134-8c91-16632fa1d52a'  -- (email yok)
    )
    AND NOT EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = u.id
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Profiller oluşturuldu (email ile)';
  ELSE
    -- Email kolonu yoksa
    INSERT INTO profiles (id, full_name, district, created_at, updated_at)
    SELECT 
      u.id,
      COALESCE(u.raw_user_meta_data->>'full_name', 'Kullanıcı'),
      COALESCE(u.raw_user_meta_data->>'district', 'Ortahisar'),
      COALESCE(u.created_at, NOW()),
      NOW()
    FROM auth.users u
    WHERE u.id IN (
      '98542f02-11f8-4ccd-b38d-4dd42066daa7',
      '51658e96-c70d-49df-9231-77dbe06a0151',
      '9b1a75ed-0a94-4365-955b-301f114d97b4',
      '22f07c07-c7c6-4134-8c91-16632fa1d52a'
    )
    AND NOT EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = u.id
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Profiller oluşturuldu (email olmadan)';
  END IF;
END $$;

-- 3. Tüm eksik profilleri oluştur (tüm kullanıcılar için)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'email'
  ) THEN
    INSERT INTO profiles (id, email, full_name, district, created_at, updated_at)
    SELECT 
      u.id,
      COALESCE(u.email, ''),
      COALESCE(u.raw_user_meta_data->>'full_name', 'Kullanıcı'),
      COALESCE(u.raw_user_meta_data->>'district', 'Ortahisar'),
      COALESCE(u.created_at, NOW()),
      NOW()
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = u.id
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO profiles (id, full_name, district, created_at, updated_at)
    SELECT 
      u.id,
      COALESCE(u.raw_user_meta_data->>'full_name', 'Kullanıcı'),
      COALESCE(u.raw_user_meta_data->>'district', 'Ortahisar'),
      COALESCE(u.created_at, NOW()),
      NOW()
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = u.id
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RAISE NOTICE 'Tüm eksik profiller oluşturuldu';
END $$;

-- 4. Sonuçları kontrol et
SELECT 
  'Toplam Kullanıcı' as bilgi,
  COUNT(*) as sayi
FROM auth.users
UNION ALL
SELECT 
  'Toplam Profil' as bilgi,
  COUNT(*) as sayi
FROM profiles
UNION ALL
SELECT 
  'Eksik Profil' as bilgi,
  COUNT(*) as sayi
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

-- ============================================
-- NOT: Bu SQL sadece profil oluşturur
-- RLS policy'leri için FIX_PROFILE_CREATION.sql'i çalıştırın
-- ============================================

