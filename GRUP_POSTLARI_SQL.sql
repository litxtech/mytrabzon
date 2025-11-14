-- ============================================
-- GRUP POSTLARI İÇİN DATABASE ŞEMASI
-- ============================================
-- Bu script'i Supabase SQL Editor'de çalıştırın

-- Step 1: posts tablosuna room_id kolonu ekle (nullable - grup post'ları için)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE;

-- Step 2: room_id için index ekle (performans için)
CREATE INDEX IF NOT EXISTS posts_room_id_idx ON posts(room_id) WHERE room_id IS NOT NULL;

-- Step 3: RLS Policy güncelle - Grup post'ları sadece grup üyeleri görebilir
DROP POLICY IF EXISTS "Posts viewable by everyone" ON posts;
CREATE POLICY "Posts viewable by everyone" ON posts 
  FOR SELECT 
  USING (
    -- Eğer room_id NULL ise, normal post (herkes görebilir)
    (room_id IS NULL AND visibility = 'public')
    -- Eğer room_id varsa, grup post'u (sadece grup üyeleri görebilir)
    OR (room_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.room_id = posts.room_id 
      AND chat_members.user_id = auth.uid()
    ))
    -- Kendi post'larını her zaman görebilir
    OR author_id = auth.uid()
  );

-- Step 4: Grup post'ları için INSERT policy
DROP POLICY IF EXISTS "Users can create posts" ON posts;
CREATE POLICY "Users can create posts" ON posts 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = author_id
    AND (
      -- Normal post (room_id NULL)
      room_id IS NULL
      -- VEYA grup post'u (kullanıcı grup üyesi olmalı)
      OR EXISTS (
        SELECT 1 FROM chat_members 
        WHERE chat_members.room_id = posts.room_id 
        AND chat_members.user_id = auth.uid()
      )
    )
  );

-- Step 5: Grup post'ları için UPDATE policy
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts" ON posts 
  FOR UPDATE 
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Step 6: Grup post'ları için DELETE policy
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts" ON posts 
  FOR DELETE 
  USING (auth.uid() = author_id);

-- Step 7: Constraint - room_id varsa, visibility 'public' olmalı (grup post'ları her zaman public)
ALTER TABLE posts 
DROP CONSTRAINT IF EXISTS posts_room_visibility_check;

ALTER TABLE posts 
ADD CONSTRAINT posts_room_visibility_check 
CHECK (
  (room_id IS NULL) -- Normal post, herhangi bir visibility olabilir
  OR (room_id IS NOT NULL AND visibility = 'public') -- Grup post'u, her zaman public
);

-- Step 8: Grup post'larını profile'dan filtrelemek için view oluştur (opsiyonel)
CREATE OR REPLACE VIEW user_profile_posts AS
SELECT * FROM posts
WHERE room_id IS NULL -- Sadece normal post'lar (grup post'ları hariç)
AND author_id = auth.uid();

-- Step 9: Grup post'larını getirmek için function
CREATE OR REPLACE FUNCTION get_group_posts(p_room_id UUID, p_limit INT DEFAULT 20, p_offset INT DEFAULT 0)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  content TEXT,
  media JSONB,
  hashtags TEXT[],
  mentions UUID[],
  district district_type,
  visibility TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  share_count INTEGER,
  views_count INTEGER,
  is_pinned BOOLEAN,
  edited BOOLEAN,
  archived BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  room_id UUID,
  author JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Kullanıcının grup üyesi olduğunu kontrol et
  IF NOT EXISTS (
    SELECT 1 FROM chat_members 
    WHERE room_id = p_room_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this room';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.author_id,
    p.content,
    p.media,
    p.hashtags,
    p.mentions,
    p.district,
    p.visibility,
    p.like_count,
    p.comment_count,
    p.share_count,
    p.views_count,
    p.is_pinned,
    p.edited,
    p.archived,
    p.created_at,
    p.updated_at,
    p.room_id,
    jsonb_build_object(
      'id', pr.id,
      'full_name', pr.full_name,
      'avatar_url', pr.avatar_url,
      'district', pr.district
    ) as author
  FROM posts p
  JOIN profiles pr ON p.author_id = pr.id
  WHERE p.room_id = p_room_id
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_group_posts(UUID, INT, INT) TO authenticated;

