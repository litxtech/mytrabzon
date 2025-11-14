-- ============================================
-- PROJE EKSİKLİKLERİNİ KONTROL ET VE DÜZELT
-- ============================================
-- Bu SQL'i Supabase SQL Editor'de çalıştırın
-- Kod ile database şeması arasındaki uyumsuzlukları düzeltir

-- ============================================
-- 1. POSTS TABLOSU KOLONLARINI KONTROL ET VE DÜZELT
-- ============================================

-- Media kolonu JSONB olmalı (kodda array of objects kullanılıyor)
DO $$
BEGIN
  -- Eğer media kolonu yoksa veya TEXT[] ise, JSONB'ye çevir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'media'
  ) THEN
    ALTER TABLE posts ADD COLUMN media JSONB;
    RAISE NOTICE 'posts.media kolonu eklendi (JSONB)';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'media' 
    AND data_type = 'ARRAY'
  ) THEN
    -- TEXT[] ise JSONB'ye çevir (veri kaybı olabilir, dikkatli olun)
    ALTER TABLE posts ALTER COLUMN media TYPE JSONB USING media::text::jsonb;
    RAISE NOTICE 'posts.media TEXT[] den JSONB ye çevrildi';
  END IF;
END $$;

-- Hashtags kolonu TEXT[] olmalı
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'hashtags'
  ) THEN
    ALTER TABLE posts ADD COLUMN hashtags TEXT[];
    RAISE NOTICE 'posts.hashtags kolonu eklendi';
  END IF;
END $$;

-- Mentions kolonu UUID[] olmalı
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'mentions'
  ) THEN
    ALTER TABLE posts ADD COLUMN mentions UUID[];
    RAISE NOTICE 'posts.mentions kolonu eklendi';
  END IF;
END $$;

-- Visibility kolonu TEXT olmalı (public, friends, private)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE posts ADD COLUMN visibility TEXT DEFAULT 'public' 
      CHECK (visibility IN ('public', 'friends', 'private'));
    RAISE NOTICE 'posts.visibility kolonu eklendi';
  END IF;
END $$;

-- Edited kolonu BOOLEAN olmalı
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'edited'
  ) THEN
    ALTER TABLE posts ADD COLUMN edited BOOLEAN DEFAULT false;
    RAISE NOTICE 'posts.edited kolonu eklendi';
  END IF;
END $$;

-- ============================================
-- 2. PROFILES TABLOSU KOLONLARINI KONTROL ET
-- ============================================

-- Social media JSONB olmalı
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'social_media'
  ) THEN
    ALTER TABLE profiles ADD COLUMN social_media JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'profiles.social_media kolonu eklendi';
  END IF;
END $$;

-- Privacy settings JSONB olmalı
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'privacy_settings'
  ) THEN
    ALTER TABLE profiles ADD COLUMN privacy_settings JSONB DEFAULT '{
      "show_age": false,
      "show_gender": false,
      "show_phone": false,
      "show_email": false,
      "show_address": false,
      "show_height": false,
      "show_weight": false,
      "show_social_media": false
    }'::jsonb;
    RAISE NOTICE 'profiles.privacy_settings kolonu eklendi';
  END IF;
END $$;

-- District kolonu (ÖNEMLİ: Önce bu eklenmeli)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'district') THEN
    ALTER TABLE profiles ADD COLUMN district TEXT NOT NULL DEFAULT 'Ortahisar';
    RAISE NOTICE 'profiles.district kolonu eklendi';
  END IF;
END $$;

-- City, age, gender, height, weight, address, phone kolonları
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'city') THEN
    ALTER TABLE profiles ADD COLUMN city TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'age') THEN
    ALTER TABLE profiles ADD COLUMN age INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gender') THEN
    ALTER TABLE profiles ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'height') THEN
    ALTER TABLE profiles ADD COLUMN height INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'weight') THEN
    ALTER TABLE profiles ADD COLUMN weight INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'address') THEN
    ALTER TABLE profiles ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE profiles ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_in_directory') THEN
    ALTER TABLE profiles ADD COLUMN show_in_directory BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Posts tablosunda district kolonu
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'district') THEN
    ALTER TABLE posts ADD COLUMN district TEXT NOT NULL DEFAULT 'Ortahisar';
    RAISE NOTICE 'posts.district kolonu eklendi';
  END IF;
END $$;

-- ============================================
-- 3. FOREIGN KEY'LERİ KONTROL ET
-- ============================================

-- posts.author_id -> profiles.id foreign key kontrolü
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'posts_author_id_fkey' 
    AND table_name = 'posts'
  ) THEN
    ALTER TABLE posts 
      ADD CONSTRAINT posts_author_id_fkey 
      FOREIGN KEY (author_id) 
      REFERENCES profiles(id) 
      ON DELETE CASCADE;
    RAISE NOTICE 'posts_author_id_fkey foreign key eklendi';
  END IF;
END $$;

-- ============================================
-- 4. INDEX'LERİ KONTROL ET (Kolonlar var olduktan sonra)
-- ============================================

-- Posts index'leri
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'author_id') THEN
    CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'district') THEN
    CREATE INDEX IF NOT EXISTS idx_posts_district ON posts(district);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'visibility') THEN
    CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'archived') THEN
    CREATE INDEX IF NOT EXISTS idx_posts_archived ON posts(archived);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'hashtags') THEN
    CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON posts USING GIN(hashtags);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'mentions') THEN
    CREATE INDEX IF NOT EXISTS idx_posts_mentions ON posts USING GIN(mentions);
  END IF;
END $$;

-- Profiles index'leri
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'district') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_district ON profiles(district);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
  END IF;
END $$;

-- ============================================
-- 5. RLS POLICY'LERİ KONTROL ET (Eksik olanları ekle)
-- ============================================

-- Profiles policy'leri zaten var mı kontrol et
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Profiles viewable by everyone'
  ) THEN
    CREATE POLICY "Profiles viewable by everyone" 
      ON profiles FOR SELECT 
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" 
      ON profiles FOR INSERT 
      WITH CHECK (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" 
      ON profiles FOR UPDATE 
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Posts policy'leri zaten var mı kontrol et
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'posts' 
    AND policyname = 'Posts viewable by everyone'
  ) THEN
    CREATE POLICY "Posts viewable by everyone" 
      ON posts FOR SELECT 
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'posts' 
    AND policyname = 'Users can create posts'
  ) THEN
    CREATE POLICY "Users can create posts" 
      ON posts FOR INSERT 
      WITH CHECK (auth.uid() = author_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'posts' 
    AND policyname = 'Users can update own posts'
  ) THEN
    CREATE POLICY "Users can update own posts" 
      ON posts FOR UPDATE 
      USING (auth.uid() = author_id)
      WITH CHECK (auth.uid() = author_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'posts' 
    AND policyname = 'Users can delete own posts'
  ) THEN
    CREATE POLICY "Users can delete own posts" 
      ON posts FOR DELETE 
      USING (auth.uid() = author_id);
  END IF;
END $$;

-- ============================================
-- 6. TRIGGER FONKSİYONLARINI KONTROL ET
-- ============================================

-- increment_post_likes fonksiyonu
CREATE OR REPLACE FUNCTION increment_post_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- decrement_post_likes fonksiyonu
CREATE OR REPLACE FUNCTION decrement_post_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- increment_post_comments fonksiyonu
CREATE OR REPLACE FUNCTION increment_post_comments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- decrement_post_comments fonksiyonu
CREATE OR REPLACE FUNCTION decrement_post_comments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ları oluştur
DROP TRIGGER IF EXISTS on_post_like_created ON post_likes;
CREATE TRIGGER on_post_like_created 
  AFTER INSERT ON post_likes
  FOR EACH ROW 
  EXECUTE FUNCTION increment_post_likes();

DROP TRIGGER IF EXISTS on_post_like_deleted ON post_likes;
CREATE TRIGGER on_post_like_deleted 
  AFTER DELETE ON post_likes
  FOR EACH ROW 
  EXECUTE FUNCTION decrement_post_likes();

DROP TRIGGER IF EXISTS on_comment_created ON comments;
CREATE TRIGGER on_comment_created 
  AFTER INSERT ON comments
  FOR EACH ROW 
  EXECUTE FUNCTION increment_post_comments();

DROP TRIGGER IF EXISTS on_comment_deleted ON comments;
CREATE TRIGGER on_comment_deleted 
  AFTER DELETE ON comments
  FOR EACH ROW 
  EXECUTE FUNCTION decrement_post_comments();

-- ============================================
-- 7. ÖZET RAPOR
-- ============================================

DO $$
DECLARE
  posts_cols TEXT;
  profiles_cols TEXT;
BEGIN
  -- Posts kolonlarını listele
  SELECT string_agg(column_name, ', ' ORDER BY column_name)
  INTO posts_cols
  FROM information_schema.columns
  WHERE table_name = 'posts';
  
  -- Profiles kolonlarını listele
  SELECT string_agg(column_name, ', ' ORDER BY column_name)
  INTO profiles_cols
  FROM information_schema.columns
  WHERE table_name = 'profiles';
  
  RAISE NOTICE '✅ Posts tablosu kolonları: %', posts_cols;
  RAISE NOTICE '✅ Profiles tablosu kolonları: %', profiles_cols;
END $$;

-- ============================================
-- ✅ KONTROL TAMAMLANDI
-- ============================================
-- Artık:
-- 1. Posts tablosu kodla uyumlu
-- 2. Profiles tablosu kodla uyumlu
-- 3. RLS Policy'ler aktif
-- 4. Trigger'lar çalışıyor
-- 5. Index'ler optimize edildi

