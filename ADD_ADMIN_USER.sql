-- ============================================
-- ADMIN KULLANICI EKLEME
-- ============================================
-- Bu script'i Supabase SQL Editor'de çalıştırın
-- ============================================

-- 1. Önce admin_users tablosunun var olduğundan emin ol
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator')),
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}'::jsonb,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. password_hash kolonunu NULL yapılabilir hale getir (eğer varsa ve NOT NULL ise)
DO $$
BEGIN
  -- password_hash kolonu varsa ve NOT NULL ise, NULL yapılabilir hale getir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' 
    AND column_name = 'password_hash'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE admin_users ALTER COLUMN password_hash DROP NOT NULL;
  END IF;
END $$;

-- 3. user_id kolonunu ekle (eğer yoksa)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. user_id üzerinde UNIQUE constraint oluştur (ON CONFLICT için gerekli)
DO $$
BEGIN
  -- Önce unique index oluştur
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'admin_users' 
    AND indexname = 'admin_users_user_id_unique'
  ) THEN
    CREATE UNIQUE INDEX admin_users_user_id_unique ON admin_users(user_id) WHERE user_id IS NOT NULL;
  END IF;
END $$;

-- 4. RLS Policy ekle (admin_users tablosu için)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users are viewable by admins" ON admin_users;
CREATE POLICY "Admin users are viewable by admins" ON admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Service role can manage admin users" ON admin_users;
CREATE POLICY "Service role can manage admin users" ON admin_users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5. Kullanıcıyı admin yap
DO $$
DECLARE
  target_email TEXT := 'sonertoprak97@gmail.com';
  target_user_id UUID := '9b1a75ed-0a94-4365-955b-301f114d97b4';
BEGIN
  -- Kullanıcı ID'sini kontrol et
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Kullanıcı bulunamadı: % (User ID: %)', target_email, target_user_id;
  END IF;

  -- Email'i kontrol et
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id AND email = target_email) THEN
    RAISE WARNING 'Email eşleşmiyor! User ID: %, Beklenen Email: %', target_user_id, target_email;
  END IF;

  -- Admin kullanıcı ekle veya güncelle
  -- Önce mevcut kaydı kontrol et
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = target_user_id) THEN
    -- Güncelle
    UPDATE admin_users
    SET 
      email = target_email,
      role = 'super_admin',
      is_active = true,
      permissions = '{"all": true, "users": true, "posts": true, "kyc": true, "policies": true, "company": true, "support": true}'::jsonb,
      updated_at = NOW()
    WHERE user_id = target_user_id;
    
    RAISE NOTICE '✅ Admin kullanıcı güncellendi: % (User ID: %)', target_email, target_user_id;
  ELSE
    -- Yeni ekle
    INSERT INTO admin_users (user_id, email, role, is_active, permissions)
    VALUES (
      target_user_id, 
      target_email, 
      'super_admin', 
      true,
      '{"all": true, "users": true, "posts": true, "kyc": true, "policies": true, "company": true, "support": true}'::jsonb
    );
    
    RAISE NOTICE '✅ Admin kullanıcı başarıyla eklendi: % (User ID: %)', target_email, target_user_id;
  END IF;
  
  RAISE NOTICE '✅ Rol: super_admin (Tam Yetki)';
END $$;

-- 6. Tüm admin kullanıcıları listele
SELECT 
  au.id,
  au.email,
  au.role,
  au.is_active,
  au.created_at,
  p.full_name
FROM admin_users au
LEFT JOIN profiles p ON p.id = au.user_id
ORDER BY au.created_at DESC;

-- ============================================
-- KULLANIM:
-- ============================================
-- 1. Script'i Supabase SQL Editor'de çalıştırın
-- 2. Uygulamada giriş yapın (sonertoprak97@gmail.com)
-- 3. Profil sayfasından "Admin Paneli" butonuna tıklayın
-- ============================================
