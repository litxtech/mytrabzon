-- ============================================
-- FIX ADMIN_USERS RLS - BASIT ÇÖZÜM
-- ============================================
-- Bu script'i Supabase SQL Editor'de çalıştırın
-- RLS'yi tamamen devre dışı bırakır veya çok basit policy kullanır

-- Step 1: Tüm mevcut policy'leri kaldır
DROP POLICY IF EXISTS "Admin users are viewable by admins" ON admin_users;
DROP POLICY IF EXISTS "admin_users_select" ON admin_users;
DROP POLICY IF EXISTS "admin_users_select_policy" ON admin_users;
DROP POLICY IF EXISTS "Only admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can be managed by super admins" ON admin_users;
DROP POLICY IF EXISTS "Service role can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "admin_users_insert_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_update_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_delete_policy" ON admin_users;

-- Step 2: Helper function'ları kaldır (eğer varsa)
DROP FUNCTION IF EXISTS is_admin_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_admin(UUID) CASCADE;

-- Step 3: RLS'yi devre dışı bırak VEYA çok basit policy kullan
-- Seçenek 1: RLS'yi tamamen devre dışı bırak (EN KOLAY)
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- VEYA Seçenek 2: Çok basit policy (kendi kaydını görebilir)
-- ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own admin record" ON admin_users
--   FOR SELECT
--   USING (user_id = auth.uid());

-- Step 4: Özel admin kullanıcısını ekle/güncelle
DO $$
BEGIN
  -- Özel admin ID: 98542f02-11f8-4ccd-b38d-4dd42066daa7
  INSERT INTO admin_users (user_id, email, role, is_active)
  VALUES (
    '98542f02-11f8-4ccd-b38d-4dd42066daa7'::uuid,
    'support@litxtech.com',
    'super_admin',
    true
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      role = EXCLUDED.role,
      is_active = true,
      updated_at = NOW();
  
  RAISE NOTICE '✅ Admin kullanıcı eklendi/güncellendi: support@litxtech.com';
END $$;

-- Step 5: Kontrol et
SELECT 
  id,
  user_id,
  email,
  role,
  is_active,
  created_at
FROM admin_users
WHERE user_id = '98542f02-11f8-4ccd-b38d-4dd42066daa7'::uuid;

-- Sonuç: 
-- - RLS devre dışı bırakıldı, artık sonsuz döngü oluşmayacak
-- - Özel admin kullanıcısı eklendi
-- - Frontend'deki özel admin bypass ile birlikte çalışacak

