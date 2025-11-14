-- ============================================
-- MyTrabzon - EKSİKSİZ SQL SCHEMA
-- ============================================
-- Bu dosyanın TAMAMINI Supabase SQL Editor'e yapıştırın ve çalıştırın
-- Tüm tablolar, RLS policy'ler, trigger'lar, function'lar ve index'ler dahil
-- ============================================

-- ============================================
-- 1. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 2. TABLOLAR
-- ============================================

-- Profiles Tablosu
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  city TEXT,
  district TEXT,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  phone TEXT,
  address TEXT,
  height INTEGER,
  weight INTEGER,
  social_media JSONB DEFAULT '{}'::jsonb,
  privacy_settings JSONB DEFAULT '{
    "show_age": false,
    "show_email": false,
    "show_phone": false,
    "show_gender": false,
    "show_height": false,
    "show_weight": false,
    "show_address": false,
    "show_social_media": false
  }'::jsonb,
  show_in_directory BOOLEAN DEFAULT false,
  public_id TEXT UNIQUE,
  deletion_requested_at TIMESTAMP WITH TIME ZONE,
  deletion_scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts Tablosu
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  district TEXT NOT NULL,
  media JSONB,
  hashtags TEXT[],
  mentions UUID[],
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  edited BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post Likes Tablosu
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Comments Tablosu
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comment Likes Tablosu
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Post Shares Tablosu
CREATE TABLE IF NOT EXISTS post_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  share_to TEXT DEFAULT 'feed' CHECK (share_to IN ('feed', 'story', 'external')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Rooms Tablosu
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  avatar_url TEXT,
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  district TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Members Tablosu
CREATE TABLE IF NOT EXISTS chat_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  unread_count INTEGER DEFAULT 0,
  last_read_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Messages Tablosu
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'audio', 'file')),
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Reactions Tablosu
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- User Blocks Tablosu
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- ============================================
-- 3. INDEX'LER
-- ============================================

-- Profiles Index'leri
CREATE INDEX IF NOT EXISTS idx_profiles_public_id ON profiles(public_id);
CREATE INDEX IF NOT EXISTS idx_profiles_district ON profiles(district);
CREATE INDEX IF NOT EXISTS idx_profiles_show_in_directory ON profiles(show_in_directory) WHERE show_in_directory = true;

-- Posts Index'leri
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_district ON posts(district);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON posts USING GIN(hashtags);

-- Post Likes Index'leri
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);

-- Comments Index'leri
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- Comment Likes Index'leri
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Chat Index'leri
CREATE INDEX IF NOT EXISTS idx_chat_members_room_id ON chat_members(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

-- RLS'i Aktif Et
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON profiles;
CREATE POLICY "Profiles viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Posts Policies
DROP POLICY IF EXISTS "Posts viewable by everyone" ON posts;
CREATE POLICY "Posts viewable by everyone" ON posts FOR SELECT USING (visibility = 'public' OR (visibility = 'friends' AND author_id = auth.uid()) OR author_id = auth.uid());

DROP POLICY IF EXISTS "Users can create posts" ON posts;
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = author_id);

-- Post Likes Policies
DROP POLICY IF EXISTS "Post likes viewable by everyone" ON post_likes;
CREATE POLICY "Post likes viewable by everyone" ON post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like posts" ON post_likes;
CREATE POLICY "Users can like posts" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike own likes" ON post_likes;
CREATE POLICY "Users can unlike own likes" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments Policies
DROP POLICY IF EXISTS "Comments viewable by everyone" ON comments;
CREATE POLICY "Comments viewable by everyone" ON comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Comment Likes Policies
DROP POLICY IF EXISTS "Comment likes viewable by everyone" ON comment_likes;
CREATE POLICY "Comment likes viewable by everyone" ON comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like comments" ON comment_likes;
CREATE POLICY "Users can like comments" ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike own comment likes" ON comment_likes;
CREATE POLICY "Users can unlike own comment likes" ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Post Shares Policies
DROP POLICY IF EXISTS "Post shares viewable by everyone" ON post_shares;
CREATE POLICY "Post shares viewable by everyone" ON post_shares FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can share posts" ON post_shares;
CREATE POLICY "Users can share posts" ON post_shares FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat Rooms Policies
DROP POLICY IF EXISTS "Chat rooms viewable by members" ON chat_rooms;
CREATE POLICY "Chat rooms viewable by members" ON chat_rooms FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_members WHERE room_id = chat_rooms.id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;
CREATE POLICY "Users can create chat rooms" ON chat_rooms FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Chat Members Policies
DROP POLICY IF EXISTS "Chat members viewable by members" ON chat_members;
CREATE POLICY "Chat members viewable by members" ON chat_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_members cm WHERE cm.room_id = chat_members.room_id AND cm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can join chat rooms" ON chat_members;
CREATE POLICY "Users can join chat rooms" ON chat_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages Policies
DROP POLICY IF EXISTS "Messages viewable by room members" ON messages;
CREATE POLICY "Messages viewable by room members" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_members WHERE room_id = messages.room_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE USING (auth.uid() = user_id);

-- Message Reactions Policies
DROP POLICY IF EXISTS "Message reactions viewable by room members" ON message_reactions;
CREATE POLICY "Message reactions viewable by room members" ON message_reactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM messages m JOIN chat_members cm ON m.room_id = cm.room_id WHERE m.id = message_reactions.message_id AND cm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can react to messages" ON message_reactions;
CREATE POLICY "Users can react to messages" ON message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own reactions" ON message_reactions;
CREATE POLICY "Users can remove own reactions" ON message_reactions FOR DELETE USING (auth.uid() = user_id);

-- User Blocks Policies
DROP POLICY IF EXISTS "User blocks viewable by blocker" ON user_blocks;
CREATE POLICY "User blocks viewable by blocker" ON user_blocks FOR SELECT USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can block others" ON user_blocks;
CREATE POLICY "Users can block others" ON user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can unblock" ON user_blocks;
CREATE POLICY "Users can unblock" ON user_blocks FOR DELETE USING (auth.uid() = blocker_id);

-- ============================================
-- 5. TRIGGER'LAR
-- ============================================

-- Profil Oluşturma Trigger'ı
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, district, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kullanıcı'),
    COALESCE(NEW.raw_user_meta_data->>'district', 'Ortahisar'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Public ID Oluşturma Trigger'ı
CREATE OR REPLACE FUNCTION generate_public_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_public_id ON profiles;
CREATE TRIGGER set_public_id
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_public_id();

-- Updated At Trigger'ı
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Post Like Count Trigger'ı
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS post_like_count_trigger ON post_likes;
CREATE TRIGGER post_like_count_trigger
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_like_count();

-- Comment Count Trigger'ı
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS post_comment_count_trigger ON comments;
CREATE TRIGGER post_comment_count_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();

-- Comment Like Count Trigger'ı
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comment_like_count_trigger ON comment_likes;
CREATE TRIGGER comment_like_count_trigger
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_like_count();

-- Post Share Count Trigger'ı
CREATE OR REPLACE FUNCTION update_post_share_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET share_count = share_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET share_count = GREATEST(0, share_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS post_share_count_trigger ON post_shares;
CREATE TRIGGER post_share_count_trigger
  AFTER INSERT OR DELETE ON post_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_post_share_count();

-- Chat Room Last Message Trigger'ı
CREATE OR REPLACE FUNCTION update_chat_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms SET last_message_at = NOW() WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_room_last_message_trigger ON messages;
CREATE TRIGGER chat_room_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_room_last_message();

-- ============================================
-- 6. FUNCTION'LAR
-- ============================================

-- Kullanıcı Post'larını Getir
CREATE OR REPLACE FUNCTION get_user_posts(user_uuid UUID, limit_count INTEGER DEFAULT 50, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  content TEXT,
  district TEXT,
  media JSONB,
  hashtags TEXT[],
  visibility TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  share_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  author JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.author_id,
    p.content,
    p.district,
    p.media,
    p.hashtags,
    p.visibility,
    p.like_count,
    p.comment_count,
    p.share_count,
    p.created_at,
    p.updated_at,
    jsonb_build_object(
      'id', pr.id,
      'full_name', pr.full_name,
      'avatar_url', pr.avatar_url,
      'district', pr.district
    ) as author
  FROM posts p
  JOIN profiles pr ON p.author_id = pr.id
  WHERE p.author_id = user_uuid
    AND p.archived = false
  ORDER BY p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. STORAGE BUCKET'LARI (Manuel Oluşturulmalı)
-- ============================================
-- Supabase Dashboard > Storage bölümünden şu bucket'ları oluşturun:
-- - avatars (public)
-- - posts (public)

-- ============================================
-- 8. TAMAMLANDI
-- ============================================
-- Bu SQL script'i çalıştırdıktan sonra:
-- 1. Storage bucket'larını oluşturun (Dashboard'dan)
-- 2. Test edin
-- 3. Eksik profil varsa CREATE_MISSING_PROFILES.sql çalıştırın

