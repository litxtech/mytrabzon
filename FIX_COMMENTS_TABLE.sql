-- ============================================
-- COMMENTS TABLOSU DÜZELTME
-- ============================================
-- Yorum yapma özelliği için gerekli düzeltmeler

-- 1. COMMENTS TABLOSU KONTROLÜ
-- Eğer post_comments varsa comments'e rename et
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_comments')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') THEN
    ALTER TABLE post_comments RENAME TO comments;
    RAISE NOTICE 'post_comments tablosu comments olarak rename edildi';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_comments')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') THEN
    DROP TABLE IF EXISTS post_comments CASCADE;
    RAISE NOTICE 'post_comments tablosu silindi (comments zaten mevcut)';
  END IF;
END $$;

-- 2. COMMENTS TABLOSU KOLONLARINI KONTROL ET
DO $$
BEGIN
  -- likes_count kolonu (like_count değil)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comments' AND column_name = 'likes_count'
  ) THEN
    -- Eğer like_count varsa rename et
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'comments' AND column_name = 'like_count'
    ) THEN
      ALTER TABLE comments RENAME COLUMN like_count TO likes_count;
      RAISE NOTICE 'comments.like_count likes_count olarak rename edildi';
    ELSE
      ALTER TABLE comments ADD COLUMN likes_count INTEGER DEFAULT 0;
      RAISE NOTICE 'comments.likes_count kolonu eklendi';
    END IF;
  END IF;
  
  -- parent_id kolonu (nested comments için)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comments' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE comments ADD COLUMN parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;
    RAISE NOTICE 'comments.parent_id kolonu eklendi';
  END IF;
END $$;

-- 3. FOREIGN KEY'LERİ DÜZELT
-- Eski foreign key'leri sil
ALTER TABLE comments DROP CONSTRAINT IF EXISTS post_comments_post_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_post_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;

-- Yeni foreign key'ler oluştur
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'comments_post_id_fkey' 
    AND table_name = 'comments'
  ) THEN
    ALTER TABLE comments 
      ADD CONSTRAINT comments_post_id_fkey 
      FOREIGN KEY (post_id) 
      REFERENCES posts(id) 
      ON DELETE CASCADE;
    RAISE NOTICE 'comments_post_id_fkey foreign key eklendi';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'comments_user_id_fkey' 
    AND table_name = 'comments'
  ) THEN
    ALTER TABLE comments 
      ADD CONSTRAINT comments_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES profiles(id) 
      ON DELETE CASCADE;
    RAISE NOTICE 'comments_user_id_fkey foreign key eklendi';
  END IF;
END $$;

-- 4. RLS POLICY'LERİ DÜZELT
-- Eski policy'leri sil
DROP POLICY IF EXISTS "Comments viewable by everyone" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
DROP POLICY IF EXISTS "post_comments_select" ON comments;
DROP POLICY IF EXISTS "post_comments_insert" ON comments;

-- Tüm comments policy'lerini sil (güvenli)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'comments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON comments', r.policyname);
  END LOOP;
END $$;

-- Yeni policy'ler oluştur
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

-- 5. COMMENT_LIKES RLS POLICY'LERİ
DROP POLICY IF EXISTS "Comment likes viewable by everyone" ON comment_likes;
DROP POLICY IF EXISTS "Users can like comments" ON comment_likes;
DROP POLICY IF EXISTS "Users can unlike comments" ON comment_likes;

CREATE POLICY "Comment likes viewable by everyone" 
  ON comment_likes FOR SELECT 
  USING (true);

CREATE POLICY "Users can like comments" 
  ON comment_likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments" 
  ON comment_likes FOR DELETE 
  USING (auth.uid() = user_id);

-- 6. TRIGGER'LARI KONTROL ET
-- increment_comment_likes fonksiyonu
CREATE OR REPLACE FUNCTION increment_comment_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- decrement_comment_likes fonksiyonu
CREATE OR REPLACE FUNCTION decrement_comment_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ları oluştur
DROP TRIGGER IF EXISTS on_comment_like_created ON comment_likes;
CREATE TRIGGER on_comment_like_created 
  AFTER INSERT ON comment_likes
  FOR EACH ROW 
  EXECUTE FUNCTION increment_comment_likes();

DROP TRIGGER IF EXISTS on_comment_like_deleted ON comment_likes;
CREATE TRIGGER on_comment_like_deleted 
  AFTER DELETE ON comment_likes
  FOR EACH ROW 
  EXECUTE FUNCTION decrement_comment_likes();

-- 7. INDEX'LERİ KONTROL ET
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- ============================================
-- ✅ COMMENTS DÜZELTME TAMAMLANDI
-- ============================================
-- Artık:
-- 1. Tablo ismi: 'comments' (kodla uyumlu)
-- 2. Foreign key'ler: profiles'e bağlı
-- 3. RLS Policy'ler: Düzeltildi
-- 4. Trigger'lar: Like count otomatik güncelleniyor
-- 5. Index'ler: Performans optimize edildi

