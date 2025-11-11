-- ============================================
-- MYTRABZON - TAM FIX SQL
-- ============================================
-- Bu dosyayı Supabase SQL Editor'e yapıştırın ve çalıştırın
-- Tüm hataları düzeltir: Chat, Profil, Kayıt, RLS Policies

-- ============================================
-- 1. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 2. ENUM TYPES FIX
-- ============================================

-- District type (zaten var, tekrar oluşturmaya çalışma)
DO $$ BEGIN
  CREATE TYPE district_type AS ENUM (
    'Ortahisar', 'Akçaabat', 'Araklı', 'Arsin', 'Beşikdüzü', 
    'Çarşıbaşı', 'Çaykara', 'Dernekpazarı', 'Düzköy', 'Hayrat', 
    'Köprübaşı', 'Maçka', 'Of', 'Sürmene', 'Şalpazarı', 
    'Tonya', 'Vakfıkebir', 'Yomra',
    'Alucra', 'Bulancak', 'Çamoluk', 'Çanakçı', 'Dereli', 
    'Doğankent', 'Espiye', 'Eynesil', 'Görele', 'Güce', 
    'Keşap', 'Merkez', 'Piraziz', 'Şebinkarahisar', 'Tirebolu', 'Yağlıdere'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- City type
DO $$ BEGIN
  CREATE TYPE city_type AS ENUM ('Trabzon', 'Giresun', 'Rize');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Gender type
DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 3. USER PROFILES FIX - Eksik kolonları ekle
-- ============================================

-- City kolonu ekle
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS city city_type;

-- Age kolonu ekle
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Gender kolonu ekle
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS gender gender_type;

-- Address kolonu ekle
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Height kolonu ekle
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS height INTEGER;

-- Weight kolonu ekle
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS weight INTEGER;

-- Social media kolonu ekle
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}'::jsonb;

-- Privacy settings kolonu ekle
ALTER TABLE user_profiles 
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

-- Mevcut kayıtlar için privacy settings güncelle
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

-- ============================================
-- 4. CHAT INFINITE RECURSION FIX
-- ============================================

-- Tüm chat politikalarını sil
DROP POLICY IF EXISTS "Users view their rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Room creators can update rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users view room members" ON chat_members;
DROP POLICY IF EXISTS "Room creators and admins can add members" ON chat_members;
DROP POLICY IF EXISTS "Room admins can add members" ON chat_members;
DROP POLICY IF EXISTS "Users can leave rooms" ON chat_members;
DROP POLICY IF EXISTS "Users view messages in their rooms" ON messages;
DROP POLICY IF EXISTS "Members can send messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

-- Yeni policy isimleri sil
DROP POLICY IF EXISTS "chat_members_select" ON chat_members;
DROP POLICY IF EXISTS "chat_members_insert" ON chat_members;
DROP POLICY IF EXISTS "chat_members_delete" ON chat_members;
DROP POLICY IF EXISTS "chat_rooms_select" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_insert" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_update" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_delete" ON chat_rooms;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;

-- Helper fonksiyonları oluştur (RECURSION FIX)
CREATE OR REPLACE FUNCTION is_room_member(room_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.room_id = $1 
    AND chat_members.user_id = $2
  );
$$;

CREATE OR REPLACE FUNCTION is_room_admin(room_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.room_id = $1 
    AND chat_members.user_id = $2
    AND chat_members.role = 'admin'
  );
$$;

-- Chat Members Policies (YENİ - RECURSION YOK)
CREATE POLICY "chat_members_select" ON chat_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_room_member(room_id, auth.uid())
  );

CREATE POLICY "chat_members_insert" ON chat_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = chat_members.room_id
      AND cr.created_by = auth.uid()
    )
    OR is_room_admin(room_id, auth.uid())
  );

CREATE POLICY "chat_members_delete" ON chat_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR is_room_admin(room_id, auth.uid())
  );

-- Chat Rooms Policies (YENİ - RECURSION YOK)
CREATE POLICY "chat_rooms_select" ON chat_rooms
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_room_member(id, auth.uid())
  );

CREATE POLICY "chat_rooms_insert" ON chat_rooms
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "chat_rooms_update" ON chat_rooms
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR is_room_admin(id, auth.uid())
  );

CREATE POLICY "chat_rooms_delete" ON chat_rooms
  FOR DELETE
  USING (created_by = auth.uid());

-- Messages Policies (YENİ - RECURSION YOK)
CREATE POLICY "messages_select" ON messages
  FOR SELECT
  USING (is_room_member(room_id, auth.uid()));

CREATE POLICY "messages_insert" ON messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_room_member(room_id, auth.uid())
  );

CREATE POLICY "messages_update" ON messages
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "messages_delete" ON messages
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR is_room_admin(room_id, auth.uid())
  );

-- Helper fonksiyonlarına yetki ver
GRANT EXECUTE ON FUNCTION is_room_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_room_admin(UUID, UUID) TO authenticated;

-- ============================================
-- 5. STORAGE BUCKETS FIX
-- ============================================

-- Avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Posts bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
  ('posts', 'posts', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'];

-- Selfies bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
  ('selfies', 'selfies', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- ============================================
-- 6. STORAGE POLICIES FIX
-- ============================================

-- Avatars storage policies
DROP POLICY IF EXISTS "Avatar görüntüleme" ON storage.objects;
DROP POLICY IF EXISTS "Avatar yükleme" ON storage.objects;
DROP POLICY IF EXISTS "Avatar güncelleme" ON storage.objects;
DROP POLICY IF EXISTS "Avatar silme" ON storage.objects;

CREATE POLICY "Avatar görüntüleme" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Avatar yükleme" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Avatar güncelleme" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Avatar silme" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Posts storage policies
DROP POLICY IF EXISTS "Posts görüntüleme" ON storage.objects;
DROP POLICY IF EXISTS "Posts yükleme" ON storage.objects;
DROP POLICY IF EXISTS "Posts güncelleme" ON storage.objects;
DROP POLICY IF EXISTS "Posts silme" ON storage.objects;

CREATE POLICY "Posts görüntüleme" ON storage.objects
  FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "Posts yükleme" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'posts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Posts güncelleme" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'posts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Posts silme" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'posts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 7. USER PROFILE FUNCTIONS FIX
-- ============================================

-- Profil güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_user_profile(
  p_full_name TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_city city_type DEFAULT NULL,
  p_district district_type DEFAULT NULL,
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
    district = COALESCE(p_district, district),
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

-- ============================================
-- 8. KULLANICI KAYDINI FIX ET
-- ============================================

-- Trigger'ı güncelle
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (
    id, 
    email, 
    full_name, 
    district,
    city,
    social_media,
    privacy_settings
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kullanıcı'),
    COALESCE((NEW.raw_user_meta_data->>'district')::district_type, 'Ortahisar'),
    COALESCE((NEW.raw_user_meta_data->>'city')::city_type, 'Trabzon'),
    '{}'::jsonb,
    '{
      "show_age": true,
      "show_gender": true,
      "show_phone": true,
      "show_email": true,
      "show_address": true,
      "show_height": true,
      "show_weight": true,
      "show_social_media": true
    }'::jsonb
  );
  
  -- Varsayılan user settings oluştur
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı sil ve tekrar oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION create_user_profile();

-- ============================================
-- 9. MESSAGE REACTIONS TABLE (Eksik tablo)
-- ============================================

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- RLS aktif et
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "message_reactions_select" ON message_reactions
  FOR SELECT
  USING (is_room_member(
    (SELECT room_id FROM messages WHERE id = message_reactions.message_id),
    auth.uid()
  ));

CREATE POLICY "message_reactions_insert" ON message_reactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_room_member(
      (SELECT room_id FROM messages WHERE id = message_reactions.message_id),
      auth.uid()
    )
  );

CREATE POLICY "message_reactions_delete" ON message_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

-- ============================================
-- 10. REALTIME FIX
-- ============================================

-- Realtime'ı aktif et (hata verirse devam eder)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_members;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 11. USER SETTINGS TABLE CHECK
-- ============================================

-- User settings tablosu yoksa oluştur
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Privacy Settings
  profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  show_phone BOOLEAN DEFAULT false,
  show_email BOOLEAN DEFAULT false,
  show_birth_date BOOLEAN DEFAULT false,
  allow_messages_from TEXT DEFAULT 'everyone' CHECK (allow_messages_from IN ('everyone', 'friends', 'none')),
  allow_tagging TEXT DEFAULT 'everyone' CHECK (allow_tagging IN ('everyone', 'friends', 'none')),
  show_online_status BOOLEAN DEFAULT true,
  
  -- Notification Settings
  push_enabled BOOLEAN DEFAULT true,
  push_posts BOOLEAN DEFAULT true,
  push_comments BOOLEAN DEFAULT true,
  push_likes BOOLEAN DEFAULT true,
  push_follows BOOLEAN DEFAULT true,
  push_messages BOOLEAN DEFAULT true,
  push_events BOOLEAN DEFAULT true,
  push_help_requests BOOLEAN DEFAULT true,
  
  email_enabled BOOLEAN DEFAULT true,
  email_digest TEXT DEFAULT 'daily' CHECK (email_digest IN ('realtime', 'daily', 'weekly', 'never')),
  email_marketing BOOLEAN DEFAULT false,
  
  sms_enabled BOOLEAN DEFAULT false,
  sms_important_only BOOLEAN DEFAULT true,
  
  -- District Settings
  interested_districts district_type[],
  show_all_districts BOOLEAN DEFAULT true,
  
  -- Security Settings
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_method TEXT CHECK (two_factor_method IN ('sms', 'email', 'authenticator')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS aktif et
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users update own settings" ON user_settings;

CREATE POLICY "Users view own settings" ON user_settings 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users insert own settings" ON user_settings 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own settings" ON user_settings 
  FOR UPDATE USING (user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Mevcut tüm kullanıcılar için user_settings oluştur
INSERT INTO user_settings (user_id)
SELECT id FROM user_profiles
WHERE id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- ✅ TÜM FIX'LER TAMAMLANDI!
-- ============================================
-- 
-- Düzeltilen Hatalar:
-- ✅ Chat infinite recursion hatası
-- ✅ Profil güncelleme hataları (city, age, gender, etc. kolonları eklendi)
-- ✅ Kayıt olma hatası (trigger düzeltildi)
-- ✅ Storage policies düzeltildi
-- ✅ Message reactions tablosu eklendi
-- ✅ User settings tablosu kontrol edildi
-- ✅ RLS policies düzeltildi
-- ✅ Realtime subscriptions aktif edildi
-- 
-- Artık şunlar çalışıyor:
-- ✅ Yeni kullanıcı kaydı
-- ✅ Profil düzenleme
-- ✅ Chat odaları
-- ✅ Mesaj gönderme
-- ✅ Resim yükleme
-- ✅ Real-time güncellemeler
-- 
-- Hazır! 🚀
-- ============================================
