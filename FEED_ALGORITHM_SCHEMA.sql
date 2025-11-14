-- ============================================
-- FEED ALGORITHM & REELS SYSTEM - DATABASE SCHEMA
-- ============================================
-- Instagram-like feed ve Reels sistemi için database güncellemeleri

-- Step 1: Posts tablosuna reel ve video desteği ekle
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'image' CHECK (post_type IN ('image', 'video', 'reel'));

ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS video_metadata JSONB;

-- Video metadata örneği:
-- {
--   "width": 1080,
--   "height": 1920,
--   "duration": 15.5,
--   "video_url": "https://...",
--   "thumbnail_url": "https://..."
-- }

-- Step 2: Post Views tablosu (Reels için view tracking)
CREATE TABLE IF NOT EXISTS post_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  view_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  view_completed_at TIMESTAMP WITH TIME ZONE,
  view_duration_seconds DECIMAL(10, 2),
  completion_rate DECIMAL(5, 2), -- 0-100
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS post_views_post_id_idx ON post_views(post_id);
CREATE INDEX IF NOT EXISTS post_views_user_id_idx ON post_views(user_id);
CREATE INDEX IF NOT EXISTS post_views_created_at_idx ON post_views(created_at);
CREATE INDEX IF NOT EXISTS posts_post_type_idx ON posts(post_type);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);

-- Step 3: Post Tags tablosu (interest matching için)
CREATE TABLE IF NOT EXISTS post_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, tag)
);

CREATE INDEX IF NOT EXISTS post_tags_post_id_idx ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS post_tags_tag_idx ON post_tags(tag);

-- Step 4: User Interests tablosu (kullanıcı ilgi alanları)
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  weight DECIMAL(3, 2) DEFAULT 1.0, -- 0.0 - 1.0 arası ağırlık
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tag)
);

CREATE INDEX IF NOT EXISTS user_interests_user_id_idx ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS user_interests_tag_idx ON user_interests(tag);

-- Step 5: Follows tablosu (eğer yoksa oluştur)
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows(following_id);

-- Step 6: Post Saves tablosu (eğer yoksa oluştur)
CREATE TABLE IF NOT EXISTS post_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS post_saves_post_id_idx ON post_saves(post_id);
CREATE INDEX IF NOT EXISTS post_saves_user_id_idx ON post_saves(user_id);

-- Step 7: RLS Policies

-- Post Views Policies
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own post views" ON post_views;
CREATE POLICY "Users can view their own post views" ON post_views
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create post views" ON post_views;
CREATE POLICY "Users can create post views" ON post_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own post views" ON post_views;
CREATE POLICY "Users can update their own post views" ON post_views
  FOR UPDATE USING (auth.uid() = user_id);

-- Post Tags Policies
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Post tags viewable by everyone" ON post_tags;
CREATE POLICY "Post tags viewable by everyone" ON post_tags
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Post authors can add tags" ON post_tags;
CREATE POLICY "Post authors can add tags" ON post_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_tags.post_id 
      AND posts.author_id = auth.uid()
    )
  );

-- User Interests Policies
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own interests" ON user_interests;
CREATE POLICY "Users can view their own interests" ON user_interests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own interests" ON user_interests;
CREATE POLICY "Users can manage their own interests" ON user_interests
  FOR ALL USING (auth.uid() = user_id);

-- Follows Policies
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Follows viewable by everyone" ON follows;
CREATE POLICY "Follows viewable by everyone" ON follows
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON follows;
CREATE POLICY "Users can follow others" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Post Saves Policies
ALTER TABLE post_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Post saves viewable by owner" ON post_saves;
CREATE POLICY "Post saves viewable by owner" ON post_saves
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save posts" ON post_saves;
CREATE POLICY "Users can save posts" ON post_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave posts" ON post_saves;
CREATE POLICY "Users can unsave posts" ON post_saves
  FOR DELETE USING (auth.uid() = user_id);

-- Step 8: View count trigger (posts tablosuna view_count ekle)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- View count güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_post_view_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET view_count = view_count + 1 
    WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS post_view_count_trigger ON post_views;
CREATE TRIGGER post_view_count_trigger
  AFTER INSERT ON post_views
  FOR EACH ROW
  EXECUTE FUNCTION update_post_view_count();

-- Step 9: Save count trigger (posts tablosuna save_count ekle)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;

-- Save count güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_post_save_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET save_count = save_count + 1 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET save_count = GREATEST(0, save_count - 1) 
    WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS post_save_count_trigger ON post_saves;
CREATE TRIGGER post_save_count_trigger
  AFTER INSERT OR DELETE ON post_saves
  FOR EACH ROW
  EXECUTE FUNCTION update_post_save_count();

