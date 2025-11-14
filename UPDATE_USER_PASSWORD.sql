-- ============================================
-- KULLANICI ŞİFRESİ GÜNCELLEME
-- ============================================
-- Email: support@litxtech.com
-- User UID: 98542f02-11f8-4ccd-b38d-4dd42066daa7
-- Yeni Şifre: Bavul2017?
-- ============================================

-- ÖNEMLİ: Bu script'i Supabase SQL Editor'de çalıştırın
-- Şifre otomatik olarak hash'lenecek ve güvenli şekilde kaydedilecek

-- 1. Kullanıcıyı kontrol et
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE id = '98542f02-11f8-4ccd-b38d-4dd42066daa7'
   OR email = 'support@litxtech.com';

-- 2. Şifreyi güncelle
-- Supabase'de şifre güncelleme için auth.users tablosunu güncellemek gerekir
-- Ancak bu işlem için Supabase'in kendi fonksiyonunu kullanmak daha güvenlidir

-- YÖNTEM 1: Supabase Dashboard'dan (ÖNERİLEN)
-- 1. Supabase Dashboard → Authentication → Users
-- 2. support@litxtech.com kullanıcısını bulun
-- 3. "Reset Password" veya "Update Password" seçeneğini kullanın
-- 4. Yeni şifreyi girin: Bavul2017?

-- YÖNTEM 2: SQL ile (Dikkatli kullanın!)
-- NOT: Bu yöntem şifreyi direkt hash'ler, ancak Supabase'in kendi şifre reset mekanizması daha güvenlidir

-- Şifreyi hash'le ve güncelle
UPDATE auth.users
SET 
    encrypted_password = crypt('Bavul2017?', gen_salt('bf')),
    updated_at = NOW()
WHERE id = '98542f02-11f8-4ccd-b38d-4dd42066daa7'
   OR email = 'support@litxtech.com';

-- 3. Güncellemeyi kontrol et
SELECT 
    id,
    email,
    encrypted_password IS NOT NULL as has_password,
    updated_at
FROM auth.users
WHERE id = '98542f02-11f8-4ccd-b38d-4dd42066daa7'
   OR email = 'support@litxtech.com';

-- ============================================
-- ÖNEMLİ NOTLAR:
-- ============================================
-- 1. Şifre güncelleme işleminden sonra kullanıcının mevcut session'ları geçersiz olabilir
-- 2. Kullanıcı yeni şifre ile login yapmalı
-- 3. Yeni şifre ile login yaptıktan sonra authenticated token alınabilir
-- 4. Token almak için: get-user-token.ps1 script'ini kullanın
-- ============================================

