-- ============================================
-- FIX ADMIN_USERS RLS INFINITE RECURSION
-- ============================================
-- Bu script'i Supabase SQL Editor'de çalıştırın
-- Sorun: admin_users tablosundaki policy, kendi tablosuna sorgu yaparak sonsuz döngüye giriyor

-- Step 1: Mevcut problematik policy'leri kaldır
DROP POLICY IF EXISTS "Admin users are viewable by admins" ON admin_users;
DROP POLICY IF EXISTS "admin_users_select" ON admin_users;
DROP POLICY IF EXISTS "Only admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can be managed by super admins" ON admin_users;
DROP POLICY IF EXISTS "Service role can manage admin users" ON admin_users;

-- Step 2: Helper function oluştur (SECURITY DEFINER ile RLS bypass)
-- Bu fonksiyon policy'lerde kullanıldığında recursion oluşmaz
DROP FUNCTION IF EXISTS is_admin_user(UUID) CASCADE;

CREATE OR REPLACE FUNCTION is_admin_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- SECURITY DEFINER ile RLS bypass edilir
  -- Bu fonksiyon policy'lerde kullanıldığında recursion oluşmaz
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = p_user_id
    AND admin_users.is_active = true
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user(UUID) TO anon;

-- Step 3: Yeni policy'ler oluştur (Helper function kullanarak - NO RECURSION)

-- SELECT Policy: Admin kullanıcılar kendi kayıtlarını görebilir veya admin ise tümünü görebilir
CREATE POLICY "admin_users_select_policy" ON admin_users
  FOR SELECT
  USING (
    -- Kendi kaydını görebilir
    user_id = auth.uid()
    -- Veya admin ise tümünü görebilir (helper function ile - recursion yok)
    OR is_admin_user(auth.uid())
  );

-- INSERT Policy: Sadece service role ekleyebilir (veya özel admin ID)
CREATE POLICY "admin_users_insert_policy" ON admin_users
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.uid() = '98542f02-11f8-4ccd-b38d-4dd42066daa7'::uuid
  );

-- UPDATE Policy: Sadece service role güncelleyebilir (veya özel admin ID)
CREATE POLICY "admin_users_update_policy" ON admin_users
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR auth.uid() = '98542f02-11f8-4ccd-b38d-4dd42066daa7'::uuid
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.uid() = '98542f02-11f8-4ccd-b38d-4dd42066daa7'::uuid
  );

-- DELETE Policy: Sadece service role silebilir
CREATE POLICY "admin_users_delete_policy" ON admin_users
  FOR DELETE
  USING (auth.role() = 'service_role');

-- Step 4: Özel admin kullanıcısını ekle/güncelle (eğer yoksa)
DO $$
BEGIN
  -- Özel admin ID: 98542f02-11f8-4ccd-b38d-4dd42066daa7
  IF NOT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = '98542f02-11f8-4ccd-b38d-4dd42066daa7'::uuid
  ) THEN
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
  ELSE
    -- Mevcut kaydı güncelle
    UPDATE admin_users
    SET email = 'support@litxtech.com',
        role = 'super_admin',
        is_active = true,
        updated_at = NOW()
    WHERE user_id = '98542f02-11f8-4ccd-b38d-4dd42066daa7'::uuid;
  END IF;
END $$;

-- Sonuç: Artık admin_users tablosuna sorgu yaparken sonsuz döngü oluşmayacak
-- Helper function (SECURITY DEFINER) sayesinde RLS bypass edilir ve recursion önlenir

