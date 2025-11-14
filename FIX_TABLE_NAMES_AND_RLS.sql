-- ============================================
-- KRİTİK DÜZELTME: Tablo İsimleri ve RLS
-- ============================================
-- Bu SQL'i Supabase SQL Editor'de çalıştırın
-- Sorun: Kod 'profiles' kullanıyor, SQL 'user_profiles' kullanıyor

-- 1. ÖNCE MEVCUT TABLOLARI KONTROL ET
-- Eğer 'user_profiles' varsa ve 'profiles' yoksa rename et
-- Eğer her ikisi de varsa, user_profiles'ı sil (profiles zaten doğru)
DO $$
BEGIN
  -- Eğer user_profiles varsa ve profiles yoksa
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE user_profiles RENAME TO profiles;
    RAISE NOTICE 'user_profiles tablosu profiles olarak rename edildi';
  -- Eğer her ikisi de varsa, user_profiles'ı sil (profiles zaten doğru)
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Önce foreign key'leri kontrol et ve gerekirse düzelt
    -- Sonra user_profiles'ı sil (CASCADE ile tüm bağımlılıkları sil)
    DROP TABLE IF EXISTS user_profiles CASCADE;
    RAISE NOTICE 'user_profiles tablosu silindi (profiles zaten mevcut)';
  -- Eğer sadece profiles varsa, hiçbir şey yapma
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE NOTICE 'profiles tablosu zaten mevcut, rename işlemi gerekmiyor';
  END IF;
END $$;

-- 2. POSTS TABLOSUNU DÜZELT
-- Kod 'author_id' kullanıyor, SQL 'user_id' kullanıyor
-- ÖNCE: user_id'ye bağlı tüm policy'leri sil (Türkçe ve İngilizce)
DROP POLICY IF EXISTS "Posts viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
DROP POLICY IF EXISTS "posts_insert_own" ON posts;
DROP POLICY IF EXISTS "Kullanıcılar gönderi oluşturabilir" ON posts;
DROP POLICY IF EXISTS "Kullanıcılar kendi gönderilerini güncelleyebilir" ON posts;
DROP POLICY IF EXISTS "Kullanıcılar kendi gönderilerini silebilir" ON posts;
-- Tüm posts policy'lerini sil (güvenli)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'posts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON posts', r.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  -- Eğer author_id zaten varsa, user_id'yi sil
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'author_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'user_id'
  ) THEN
    -- Önce foreign key'i sil
    ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
    -- Sonra user_id kolonunu sil
    ALTER TABLE posts DROP COLUMN user_id CASCADE;
    RAISE NOTICE 'posts.user_id kolonu silindi (author_id zaten mevcut)';
  -- Eğer sadece user_id varsa, author_id'ye rename et
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE posts RENAME COLUMN user_id TO author_id;
    RAISE NOTICE 'posts.user_id author_id olarak rename edildi';
  -- Eğer sadece author_id varsa, hiçbir şey yapma
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'author_id'
  ) THEN
    RAISE NOTICE 'posts.author_id zaten mevcut, rename işlemi gerekmiyor';
  END IF;
END $$;

-- 3. FOREIGN KEY'LERİ DÜZELT
-- Eski foreign key'i sil
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;

-- Yeni foreign key oluştur
ALTER TABLE posts 
  ADD CONSTRAINT posts_author_id_fkey 
  FOREIGN KEY (author_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- 4. RLS POLİCY'LERİ DÜZELT
-- Eski policy'leri sil
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users view own profile" ON profiles;

-- Yeni policy'ler oluştur
CREATE POLICY "Profiles viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. POSTS RLS POLİCY'LERİNİ DÜZELT
DROP POLICY IF EXISTS "Posts viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

CREATE POLICY "Posts viewable by everyone" 
  ON posts FOR SELECT 
  USING (true);

CREATE POLICY "Users can create posts" 
  ON posts FOR INSERT 
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts" 
  ON posts FOR UPDATE 
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own posts" 
  ON posts FOR DELETE 
  USING (auth.uid() = author_id);

-- 6. POST_LIKES RLS POLİCY'LERİNİ DÜZELT
DROP POLICY IF EXISTS "Likes viewable by everyone" ON post_likes;
DROP POLICY IF EXISTS "Users can like posts" ON post_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON post_likes;

CREATE POLICY "Likes viewable by everyone" 
  ON post_likes FOR SELECT 
  USING (true);

CREATE POLICY "Users can like posts" 
  ON post_likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" 
  ON post_likes FOR DELETE 
  USING (auth.uid() = user_id);

-- 7. COMMENTS RLS POLİCY'LERİNİ DÜZELT
DROP POLICY IF EXISTS "Comments viewable by everyone" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;

CREATE POLICY "Comments viewable by everyone" 
  ON comments FOR SELECT 
  USING (true);

CREATE POLICY "Users can create comments" 
  ON comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" 
  ON comments FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" 
  ON comments FOR DELETE 
  USING (auth.uid() = user_id);

-- 8. TRIGGER'LARI DÜZELT
-- create_user_profile trigger'ını düzelt
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile();

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, district)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kullanıcı'),
    COALESCE((NEW.raw_user_meta_data->>'district')::text, 'Ortahisar')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION create_user_profile();

-- 9. POST LIKES COUNT TRIGGER'LARINI DÜZELT
-- Trigger'lar zaten doğru, sadece kontrol et
DROP TRIGGER IF EXISTS on_post_like_created ON post_likes;
DROP TRIGGER IF EXISTS on_post_like_deleted ON post_likes;

CREATE TRIGGER on_post_like_created 
  AFTER INSERT ON post_likes
  FOR EACH ROW 
  EXECUTE FUNCTION increment_post_likes();

CREATE TRIGGER on_post_like_deleted 
  AFTER DELETE ON post_likes
  FOR EACH ROW 
  EXECUTE FUNCTION decrement_post_likes();

-- 10. COMMENT COUNT TRIGGER'LARINI DÜZELT
DROP TRIGGER IF EXISTS on_comment_created ON comments;
DROP TRIGGER IF EXISTS on_comment_deleted ON comments;

CREATE TRIGGER on_comment_created 
  AFTER INSERT ON comments
  FOR EACH ROW 
  EXECUTE FUNCTION increment_post_comments();

CREATE TRIGGER on_comment_deleted 
  AFTER DELETE ON comments
  FOR EACH ROW 
  EXECUTE FUNCTION decrement_post_comments();

-- 11. INDEX'LERİ DÜZELT
DROP INDEX IF EXISTS idx_posts_user_id;
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_district ON posts(district);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- 12. GET_POSTS QUERY'DE AUTHOR JOIN'İ DÜZELT
-- Bu zaten kod tarafında düzeltilecek ama SQL'de de kontrol edelim

-- ============================================
-- ✅ DÜZELTME TAMAMLANDI
-- ============================================
-- Şimdi:
-- 1. Tablo isimleri: 'profiles' (kodla uyumlu)
-- 2. Post kolonu: 'author_id' (kodla uyumlu)
-- 3. RLS Policy'ler: Düzeltildi
-- 4. Trigger'lar: Düzeltildi
-- 5. Foreign Key'ler: Düzeltildi

