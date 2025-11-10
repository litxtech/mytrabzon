-- Profil Güncelleme SQL Schema
-- Bu kodu Supabase SQL Editor'de çalıştırın

-- City enum oluştur
DO $$ BEGIN
  CREATE TYPE city_type AS ENUM ('Trabzon', 'Giresun', 'Rize');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Gender enum oluştur
DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- User profiles tablosuna yeni kolonlar ekle
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS city city_type,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS gender gender_type,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS weight INTEGER,
ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "show_age": true,
  "show_gender": true,
  "show_phone": true,
  "show_email": true,
  "show_address": true,
  "show_height": true,
  "show_weight": true,
  "show_social_media": true
}'::jsonb;

-- Privacy settings için default değer güncelle
UPDATE user_profiles 
SET privacy_settings = '{
  "show_age": true,
  "show_gender": true,
  "show_phone": true,
  "show_email": true,
  "show_address": true,
  "show_height": true,
  "show_weight": true,
  "show_social_media": true
}'::jsonb
WHERE privacy_settings IS NULL OR privacy_settings = '{}'::jsonb;

-- Storage bucket'ları oluştur (eğer yoksa)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('posts', 'posts', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime']),
  ('selfies', 'selfies', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Avatar storage politikaları
DROP POLICY IF EXISTS "Avatar görüntüleme" ON storage.objects;
CREATE POLICY "Avatar görüntüleme" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar yükleme" ON storage.objects;
CREATE POLICY "Avatar yükleme" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Avatar güncelleme" ON storage.objects;
CREATE POLICY "Avatar güncelleme" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Avatar silme" ON storage.objects;
CREATE POLICY "Avatar silme" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Profil güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_user_profile(
  p_full_name TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_city city_type DEFAULT NULL,
  p_age INTEGER DEFAULT NULL,
  p_gender gender_type DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_height INTEGER DEFAULT NULL,
  p_weight INTEGER DEFAULT NULL,
  p_social_media JSONB DEFAULT NULL,
  p_privacy_settings JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE user_profiles 
  SET 
    full_name = COALESCE(p_full_name, full_name),
    bio = COALESCE(p_bio, bio),
    city = COALESCE(p_city, city),
    age = COALESCE(p_age, age),
    gender = COALESCE(p_gender, gender),
    phone = COALESCE(p_phone, phone),
    email = COALESCE(p_email, email),
    address = COALESCE(p_address, address),
    height = COALESCE(p_height, height),
    weight = COALESCE(p_weight, weight),
    social_media = COALESCE(p_social_media, social_media),
    privacy_settings = COALESCE(p_privacy_settings, privacy_settings),
    updated_at = NOW()
  WHERE id = auth.uid();
  
  v_result := json_build_object(
    'success', true,
    'message', 'Profil başarıyla güncellendi'
  );
  
  RETURN v_result;
END;
$$;

-- Avatar güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_user_avatar(p_avatar_url TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE user_profiles 
  SET 
    avatar_url = p_avatar_url,
    updated_at = NOW()
  WHERE id = auth.uid();
  
  v_result := json_build_object(
    'success', true,
    'message', 'Profil resmi başarıyla güncellendi',
    'avatar_url', p_avatar_url
  );
  
  RETURN v_result;
END;
$$;

-- Avatar silme fonksiyonu
CREATE OR REPLACE FUNCTION delete_user_avatar()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE user_profiles 
  SET 
    avatar_url = NULL,
    updated_at = NOW()
  WHERE id = auth.uid();
  
  v_result := json_build_object(
    'success', true,
    'message', 'Profil resmi başarıyla silindi'
  );
  
  RETURN v_result;
END;
$$;
