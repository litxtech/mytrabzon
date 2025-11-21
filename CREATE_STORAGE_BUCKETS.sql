-- ============================================
-- STORAGE BUCKET'LARI OLUŞTUR
-- ============================================
-- Supabase Storage bucket'larını oluştur
-- Bu SQL'i Supabase SQL Editor'de çalıştırın

-- 1. AVATARS BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- Public bucket (herkes görebilir)
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. POSTS BUCKET
-- Video boyut limiti kaldırıldı - artık herhangi bir boyutta video kabul ediliyor
-- Mevcut bucket'ı güncellemek için: UPDATE storage.buckets SET file_size_limit = 53687091200 WHERE id = 'posts'; -- 50GB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'posts',
  'posts',
  true, -- Public bucket
  53687091200, -- 50GB limit (pratik olarak limitsiz - video boyut kontrolü kaldırıldı)
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 53687091200; -- Mevcut bucket'ı güncelle

-- 3. KYC DOCUMENTS BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false, -- Private bucket (sadece authenticated kullanıcılar)
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- 4. MISSING PLAYER POSTS BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'missing_player_posts',
  'missing_player_posts',
  true, -- Public bucket
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES (RLS)
-- ============================================
-- Mevcut policy'leri silip yeniden oluşturuyoruz (IF EXISTS ile güvenli)

-- AVATARS: Herkes okuyabilir, sadece kendi dosyalarını silebilir/yükleyebilir
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- POSTS: Herkes okuyabilir, sadece kendi dosyalarını silebilir/yükleyebilir
DROP POLICY IF EXISTS "Posts are publicly accessible" ON storage.objects;
CREATE POLICY "Posts are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'posts');

DROP POLICY IF EXISTS "Users can upload their own posts" ON storage.objects;
CREATE POLICY "Users can upload their own posts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own posts" ON storage.objects;
CREATE POLICY "Users can update their own posts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own posts" ON storage.objects;
CREATE POLICY "Users can delete their own posts"
ON storage.objects FOR DELETE
USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- KYC DOCUMENTS: Sadece authenticated kullanıcılar erişebilir
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
CREATE POLICY "Users can view their own KYC documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- MISSING PLAYER POSTS: Herkes okuyabilir, sadece kendi dosyalarını silebilir/yükleyebilir
DROP POLICY IF EXISTS "Missing player posts are publicly accessible" ON storage.objects;
CREATE POLICY "Missing player posts are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'missing_player_posts');

DROP POLICY IF EXISTS "Users can upload their own missing player posts" ON storage.objects;
CREATE POLICY "Users can upload their own missing player posts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'missing_player_posts' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own missing player posts" ON storage.objects;
CREATE POLICY "Users can delete their own missing player posts"
ON storage.objects FOR DELETE
USING (bucket_id = 'missing_player_posts' AND auth.uid()::text = (storage.foldername(name))[1]);

