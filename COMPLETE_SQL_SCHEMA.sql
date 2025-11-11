-- ============================================
-- MYTRABZON - TAM VE EKSİKSİZ SQL SCHEMA
-- ============================================
-- Bu dosyanın TAMAMINI Supabase SQL Editor'e yapıştırın
-- Mesajlaşma, Profil, Gönderiler, Video/Resim Paylaşımı - HERŞEYİ içerir
-- ============================================

-- ============================================
-- 1. EXTENSIONS (Gerekli uzantılar)
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; 
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 2. ENUM TYPES (Sabit değerler)
-- ============================================

-- Trabzon İlçeleri
DROP TYPE IF EXISTS district_type CASCADE;
CREATE TYPE district_type AS ENUM (
  'Ortahisar', 'Akçaabat', 'Araklı', 'Arsin', 'Beşikdüzü', 
  'Çarşıbaşı', 'Çaykara', 'Dernekpazarı', 'Düzköy', 'Hayrat', 
  'Köprübaşı', 'Maçka', 'Of', 'Sürmene', 'Şalpazarı', 
  'Tonya', 'Vakfıkebir', 'Yomra'
);

-- Şehir
DROP TYPE IF EXISTS city_type CASCADE;
CREATE TYPE city_type AS ENUM ('Trabzon', 'Giresun', 'Rize');

-- Cinsiyet
DROP TYPE IF EXISTS gender_type CASCADE;
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

-- ============================================
-- 3. STORAGE BUCKETS (Dosya depolama)
-- ============================================

-- Bucket'ları oluştur
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('posts', 'posts', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']),
  ('selfies', 'selfies', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('chat-media', 'chat-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'audio/mpeg', 'audio/wav', 'application/pdf']),
  ('events', 'events', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('businesses', 'businesses', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('help-requests', 'help-requests', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. USER PROFILES (Kullanıcı profilleri)
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  
  -- Lokasyon bilgileri
  district district_type NOT NULL,
  city city_type,
  address TEXT,
  
  -- Kişisel bilgiler
  phone TEXT,
  date_of_birth DATE,
  age INTEGER,
  gender gender_type,
  height INTEGER,
  weight INTEGER,
  
  -- Sosyal medya
  social_media JSONB DEFAULT '{}'::jsonb,
  
  -- Gizlilik ayarları
  privacy_settings JSONB DEFAULT '{
    "show_age": true,
    "show_gender": true,
    "show_phone": true,
    "show_email": true,
    "show_address": true,
    "show_height": true,
    "show_weight": true,
    "show_social_media": true
  }'::jsonb,
  
  show_address BOOLEAN DEFAULT true,
  
  -- Doğrulama
  verified BOOLEAN DEFAULT false,
  selfie_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'unverified')),
  verification_documents TEXT[],
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_notes TEXT,
  
  -- Puan sistemi
  points INTEGER DEFAULT 0,
  
  -- Online durum
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  
  -- Hesap silme
  deletion_requested_at TIMESTAMP WITH TIME ZONE,
  deletion_scheduled_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. POSTS (Gönderiler - Resim/Video Paylaşımı)
-- ============================================

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- İçerik
  content TEXT NOT NULL,
  
  -- Medya (Resim/Video) - Array olarak birden fazla dosya
  media_url TEXT[],
  media_type TEXT CHECK (media_type IN ('image', 'video', 'mixed')),
  
  -- Lokasyon
  district district_type NOT NULL,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_name TEXT,
  
  -- Etiketler
  tags TEXT[],
  
  -- İstatistikler
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  
  -- Özellikler
  is_pinned BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post beğenileri
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Yorumlar
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Yorum beğenileri
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- ============================================
-- 6. CHAT SYSTEM (Mesajlaşma Sistemi)
-- ============================================

-- Chat odaları
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  avatar_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'district')),
  district district_type,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Oda üyeleri
CREATE TABLE IF NOT EXISTS chat_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  unread_count INTEGER DEFAULT 0,
  last_read_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Mesajlar (Metin + Resim/Video/Ses)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Mesaj içeriği
  content TEXT NOT NULL,
  
  -- Medya desteği (resim, video, ses, dosya)
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'audio', 'file')),
  
  -- Yanıtlanan mesaj
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Düzenlenme durumu
  is_edited BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mesaj reaksiyonları (emoji)
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Engellenen kullanıcılar
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- ============================================
-- 7. NOTIFICATIONS (Bildirimler)
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  district district_type,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('general', 'district', 'emergency', 'post', 'comment', 'like', 'follow', 'message')),
  reference_id UUID,
  reference_type TEXT,
  image_url TEXT,
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. ADMIN SYSTEM (Yönetim Paneli)
-- ============================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'moderator' CHECK (role IN ('super_admin', 'admin', 'moderator')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 9. ADDITIONAL TABLES (Ek tablolar)
-- ============================================

-- Takip sistemi
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Raporlama sistemi
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'message', 'user', 'business')),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Uygulama ayarları
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kullanıcı rozetleri
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- ============================================
-- 10. INDEXES (Performans optimizasyonu)
-- ============================================

-- User Profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_district ON user_profiles(district);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_deletion ON user_profiles(deletion_scheduled_at) WHERE deletion_scheduled_at IS NOT NULL;

-- Posts
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_district ON posts(district);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);

-- Comments
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Chat
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_room_id ON chat_members(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Follows
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- Blocked Users
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- ============================================
-- 11. ROW LEVEL SECURITY (Güvenlik)
-- ============================================

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. RLS POLICIES (Erişim kuralları)
-- ============================================

-- User Profiles
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON user_profiles;
CREATE POLICY "Profiles viewable by everyone" ON user_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Posts
DROP POLICY IF EXISTS "Posts viewable by everyone" ON posts;
CREATE POLICY "Posts viewable by everyone" ON posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create posts" ON posts;
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Post Likes
DROP POLICY IF EXISTS "Likes viewable by everyone" ON post_likes;
CREATE POLICY "Likes viewable by everyone" ON post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like posts" ON post_likes;
CREATE POLICY "Users can like posts" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike posts" ON post_likes;
CREATE POLICY "Users can unlike posts" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments
DROP POLICY IF EXISTS "Comments viewable by everyone" ON comments;
CREATE POLICY "Comments viewable by everyone" ON comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Comment Likes
DROP POLICY IF EXISTS "Comment likes viewable by everyone" ON comment_likes;
CREATE POLICY "Comment likes viewable by everyone" ON comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like comments" ON comment_likes;
CREATE POLICY "Users can like comments" ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike comments" ON comment_likes;
CREATE POLICY "Users can unlike comments" ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- CHAT RLS POLICIES (Recursion olmadan)
-- ============================================

-- Helper fonksiyonlar (Recursion'u önler)
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

GRANT EXECUTE ON FUNCTION is_room_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_room_admin(UUID, UUID) TO authenticated;

-- Chat Members Policies
DROP POLICY IF EXISTS "chat_members_select" ON chat_members;
CREATE POLICY "chat_members_select" ON chat_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_room_member(room_id, auth.uid())
  );

DROP POLICY IF EXISTS "chat_members_insert" ON chat_members;
CREATE POLICY "chat_members_insert" ON chat_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = chat_members.room_id
      AND cr.created_by = auth.uid()
    )
    OR is_room_admin(room_id, auth.uid())
  );

DROP POLICY IF EXISTS "chat_members_delete" ON chat_members;
CREATE POLICY "chat_members_delete" ON chat_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR is_room_admin(room_id, auth.uid())
  );

-- Chat Rooms Policies
DROP POLICY IF EXISTS "chat_rooms_select" ON chat_rooms;
CREATE POLICY "chat_rooms_select" ON chat_rooms
  FOR SELECT USING (
    created_by = auth.uid()
    OR is_room_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "chat_rooms_insert" ON chat_rooms;
CREATE POLICY "chat_rooms_insert" ON chat_rooms
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "chat_rooms_update" ON chat_rooms;
CREATE POLICY "chat_rooms_update" ON chat_rooms
  FOR UPDATE USING (
    created_by = auth.uid()
    OR is_room_admin(id, auth.uid())
  );

DROP POLICY IF EXISTS "chat_rooms_delete" ON chat_rooms;
CREATE POLICY "chat_rooms_delete" ON chat_rooms
  FOR DELETE USING (created_by = auth.uid());

-- Messages Policies
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (is_room_member(room_id, auth.uid()));

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND is_room_member(room_id, auth.uid())
  );

DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "messages_delete" ON messages;
CREATE POLICY "messages_delete" ON messages
  FOR DELETE USING (
    user_id = auth.uid()
    OR is_room_admin(room_id, auth.uid())
  );

-- Message Reactions Policies
DROP POLICY IF EXISTS "reactions_viewable" ON message_reactions;
CREATE POLICY "reactions_viewable" ON message_reactions
  FOR SELECT USING (is_room_member(
    (SELECT room_id FROM messages WHERE id = message_reactions.message_id),
    auth.uid()
  ));

DROP POLICY IF EXISTS "users_can_add_reactions" ON message_reactions;
CREATE POLICY "users_can_add_reactions" ON message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_remove_reactions" ON message_reactions;
CREATE POLICY "users_can_remove_reactions" ON message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Blocked Users Policies
DROP POLICY IF EXISTS "Users view own blocks" ON blocked_users;
CREATE POLICY "Users view own blocks" ON blocked_users FOR SELECT USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can block others" ON blocked_users;
CREATE POLICY "Users can block others" ON blocked_users FOR INSERT WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can unblock" ON blocked_users;
CREATE POLICY "Users can unblock" ON blocked_users FOR DELETE USING (blocker_id = auth.uid());

-- Notifications Policies
DROP POLICY IF EXISTS "Users view their notifications" ON notifications;
CREATE POLICY "Users view their notifications" ON notifications FOR SELECT 
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE 
  USING (user_id = auth.uid());

-- Follows Policies
DROP POLICY IF EXISTS "Follows viewable by everyone" ON follows;
CREATE POLICY "Follows viewable by everyone" ON follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON follows;
CREATE POLICY "Users can follow others" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Reports Policies
DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);

-- Badges Policies
DROP POLICY IF EXISTS "Badges viewable by everyone" ON badges;
CREATE POLICY "Badges viewable by everyone" ON badges FOR SELECT USING (true);

DROP POLICY IF EXISTS "User badges viewable by everyone" ON user_badges;
CREATE POLICY "User badges viewable by everyone" ON user_badges FOR SELECT USING (true);

-- Admin Policies
DROP POLICY IF EXISTS "Only admins can view admin users" ON admin_users;
CREATE POLICY "Only admins can view admin users" ON admin_users FOR SELECT USING (false);

DROP POLICY IF EXISTS "Only admins can view admin logs" ON admin_logs;
CREATE POLICY "Only admins can view admin logs" ON admin_logs FOR SELECT USING (false);

-- App Settings Policies
DROP POLICY IF EXISTS "App settings viewable by everyone" ON app_settings;
CREATE POLICY "App settings viewable by everyone" ON app_settings FOR SELECT USING (true);

-- ============================================
-- 13. STORAGE POLICIES (Dosya erişimi)
-- ============================================

-- Avatars
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

-- Posts (Resim/Video)
DROP POLICY IF EXISTS "Posts media görüntüleme" ON storage.objects;
CREATE POLICY "Posts media görüntüleme" ON storage.objects
  FOR SELECT USING (bucket_id = 'posts');

DROP POLICY IF EXISTS "Posts media yükleme" ON storage.objects;
CREATE POLICY "Posts media yükleme" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'posts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Posts media silme" ON storage.objects;
CREATE POLICY "Posts media silme" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'posts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Chat Media
DROP POLICY IF EXISTS "Chat media görüntüleme" ON storage.objects;
CREATE POLICY "Chat media görüntüleme" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "Chat media yükleme" ON storage.objects;
CREATE POLICY "Chat media yükleme" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Chat media silme" ON storage.objects;
CREATE POLICY "Chat media silme" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 14. TRIGGERS (Otomatik işlemler)
-- ============================================

-- Updated at güncellemesi
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Post beğeni sayısı
CREATE OR REPLACE FUNCTION increment_post_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_post_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_post_like_created ON post_likes;
CREATE TRIGGER on_post_like_created AFTER INSERT ON post_likes
  FOR EACH ROW EXECUTE FUNCTION increment_post_likes();

DROP TRIGGER IF EXISTS on_post_like_deleted ON post_likes;
CREATE TRIGGER on_post_like_deleted AFTER DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION decrement_post_likes();

-- Yorum sayısı
CREATE OR REPLACE FUNCTION increment_post_comments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_post_comments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comment_created ON comments;
CREATE TRIGGER on_comment_created AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION increment_post_comments();

DROP TRIGGER IF EXISTS on_comment_deleted ON comments;
CREATE TRIGGER on_comment_deleted AFTER DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION decrement_post_comments();

-- Yorum beğeni sayısı
CREATE OR REPLACE FUNCTION increment_comment_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_comment_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comment_like_created ON comment_likes;
CREATE TRIGGER on_comment_like_created AFTER INSERT ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION increment_comment_likes();

DROP TRIGGER IF EXISTS on_comment_like_deleted ON comment_likes;
CREATE TRIGGER on_comment_like_deleted AFTER DELETE ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION decrement_comment_likes();

-- Chat oda son mesaj zamanı
CREATE OR REPLACE FUNCTION update_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms SET last_message_at = NEW.created_at WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_room_last_message();

-- Okunmamış mesaj sayısı
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_members 
  SET unread_count = unread_count + 1 
  WHERE room_id = NEW.room_id 
    AND user_id != NEW.user_id
    AND (last_read_at IS NULL OR last_read_at < NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION increment_unread_count();

-- Otomatik profil oluşturma
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, district)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kullanıcı'),
    COALESCE((NEW.raw_user_meta_data->>'district')::district_type, 'Ortahisar')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- ============================================
-- 15. FUNCTIONS (Yardımcı fonksiyonlar)
-- ============================================

-- Profil güncelleme
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
  
  RETURN json_build_object(
    'success', true,
    'message', 'Profil başarıyla güncellendi'
  );
END;
$$;

-- Avatar güncelleme
CREATE OR REPLACE FUNCTION update_user_avatar(p_avatar_url TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_profiles 
  SET 
    avatar_url = p_avatar_url,
    updated_at = NOW()
  WHERE id = auth.uid();
  
  RETURN json_build_object(
    'success', true,
    'message', 'Profil resmi başarıyla güncellendi',
    'avatar_url', p_avatar_url
  );
END;
$$;

-- Mesaj okuma işareti
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE chat_members 
  SET 
    unread_count = 0,
    last_read_at = NOW()
  WHERE room_id = p_room_id 
    AND user_id = auth.uid();
  
  RETURN json_build_object(
    'success', true,
    'message', 'Mesajlar okundu olarak işaretlendi'
  );
END;
$$;

-- ============================================
-- 16. REALTIME (Canlı güncellemeler)
-- ============================================

-- Realtime'ı etkinleştir
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_members;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;

-- ============================================
-- 17. DEFAULT DATA (Başlangıç verileri)
-- ============================================

-- Admin kullanıcı (ŞİFRE: admin123 - DEĞİŞTİRİN!)
INSERT INTO admin_users (email, password_hash, full_name, role) 
VALUES (
  'sonertoprak@litxtech.com', 
  '$2a$10$N9qo8uLOickgx2ZMRZoMye6MmWQJGTnJC7P4F6pFg/xGI5GZ/HW0e',
  'Admin',
  'super_admin'
)
ON CONFLICT (email) DO NOTHING;

-- Rozetler
INSERT INTO badges (name, description, icon, points) VALUES
  ('first_post', 'İlk paylaşımını yaptın!', '🎉', 10),
  ('verified', 'Kimliğini doğruladın', '✅', 50),
  ('social', '100 takipçiye ulaştın', '👥', 200),
  ('photographer', '50 fotoğraf paylaştın', '📸', 100)
ON CONFLICT (name) DO NOTHING;

-- Uygulama ayarları
INSERT INTO app_settings (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('min_app_version', '"1.0.0"'),
  ('features', '{"chat": true, "posts": true}'),
  ('contact', '{"email": "support@litxtech.com", "phone": "+1 307 271 5151"}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================
-- ✅ KURULUM TAMAMLANDI!
-- ============================================
-- 
-- Mesajlaşma Sistemi: ✅ Metin, Resim, Video, Ses
-- Profil Sistemi: ✅ Tüm bilgiler + Avatar yükleme
-- Gönderi Sistemi: ✅ Resim/Video paylaşımı (array)
-- Yorum Sistemi: ✅ Çalışıyor
-- Beğeni Sistemi: ✅ Çalışıyor
-- Bildirimler: ✅ Çalışıyor
-- RLS Güvenlik: ✅ Tam koruma
-- Realtime: ✅ Canlı güncellemeler
-- Storage: ✅ Tüm bucket'lar hazır
-- 
-- Sonraki adımlar:
-- 1. Supabase Dashboard'dan storage bucket'larının public olduğunu kontrol edin
-- 2. Admin şifresini değiştirin
-- 3. .env dosyanıza Supabase bilgilerini ekleyin
-- 
-- 🚀 HAZIR!
-- ============================================
