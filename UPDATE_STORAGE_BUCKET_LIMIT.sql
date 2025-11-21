-- ============================================
-- STORAGE BUCKET LİMİTİNİ GÜNCELLE
-- ============================================
-- Video boyut limitini artır (50GB)
-- Bu SQL'i Supabase SQL Editor'de çalıştırın

-- POSTS bucket limitini 50GB'a çıkar ve allowed_mime_types'ı güncelle
UPDATE storage.buckets 
SET 
  file_size_limit = 53687091200,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
WHERE id = 'posts';

-- Eğer bucket yoksa oluştur
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'posts',
  'posts',
  true,
  53687091200, -- 50GB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET 
  file_size_limit = 53687091200,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

-- Kontrol et
SELECT id, name, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'posts';

