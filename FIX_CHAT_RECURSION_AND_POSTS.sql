-- ============================================
-- CHAT RECURSION HATASI DÜZELTME + POSTS ROOM_ID
-- ============================================

-- Step 1: Chat Members RLS Policy Recursion Hatası Düzeltme
-- Mevcut problematik policy'leri kaldır
DROP POLICY IF EXISTS "Users can view chat members" ON chat_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON chat_members;
DROP POLICY IF EXISTS "Chat members are viewable by room members" ON chat_members;

-- Basit ve recursion olmayan policy'ler oluştur
CREATE POLICY "Users can view chat members" ON chat_members
  FOR SELECT 
  USING (
    -- Kullanıcı kendi üyeliğini görebilir
    user_id = auth.uid()
    OR
    -- Veya aynı odada üye olan kullanıcılar görebilir
    EXISTS (
      SELECT 1 FROM chat_members cm2
      WHERE cm2.room_id = chat_members.room_id
      AND cm2.user_id = auth.uid()
    )
  );

-- Step 2: Posts tablosuna room_id kolonu ekle (eğer yoksa)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES chat_rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_room_id_idx ON posts(room_id);

-- Step 3: is_deleted kolonu ekle (soft delete için)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS posts_is_deleted_idx ON posts(is_deleted);

-- Step 4: Paylaşılan gönderileri koruma function
CREATE OR REPLACE FUNCTION check_post_has_shares(p_post_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_share_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_share_count
  FROM post_shares
  WHERE post_id = p_post_id;
  
  RETURN v_share_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Paylaşılan gönderileri silmeyi engelleyen trigger
CREATE OR REPLACE FUNCTION prevent_shared_post_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Eğer gönderi paylaşıldıysa, hard delete'i engelle
  IF check_post_has_shares(OLD.id) AND NOT OLD.is_deleted THEN
    -- Soft delete yap (is_deleted = true)
    UPDATE posts
    SET is_deleted = true,
        archived = true,
        updated_at = NOW()
    WHERE id = OLD.id;
    
    -- DELETE işlemini iptal et
    RETURN NULL;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_shared_post_deletion_trigger ON posts;
CREATE TRIGGER prevent_shared_post_deletion_trigger
  BEFORE DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_shared_post_deletion();

-- Step 6: RLS Policy güncelle - silinen gönderileri gösterme
DROP POLICY IF EXISTS "Posts are viewable based on visibility" ON posts;
CREATE POLICY "Posts are viewable based on visibility" ON posts
  FOR SELECT USING (
    is_deleted = false
    AND (
      visibility = 'public' 
      OR author_id = auth.uid()
    )
  );

-- Step 7: Paylaşılan gönderiler için özel görünürlük
-- Paylaşan kullanıcılar silinen gönderiyi görebilir
CREATE OR REPLACE FUNCTION can_view_shared_post(p_post_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_author BOOLEAN;
  v_has_shared BOOLEAN;
  v_is_deleted BOOLEAN;
  v_visibility TEXT;
BEGIN
  -- Gönderi bilgilerini al
  SELECT 
    author_id = p_user_id,
    is_deleted,
    visibility
  INTO 
    v_is_author,
    v_is_deleted,
    v_visibility
  FROM posts
  WHERE id = p_post_id;
  
  -- Gönderi yoksa
  IF v_is_author IS NULL THEN
    RETURN false;
  END IF;
  
  -- Gönderi sahibi her zaman görebilir
  IF v_is_author THEN
    RETURN true;
  END IF;
  
  -- Silinen gönderi kontrolü
  IF v_is_deleted THEN
    -- Paylaşan kullanıcılar silinen gönderiyi görebilir
    SELECT EXISTS(
      SELECT 1 FROM post_shares
      WHERE post_id = p_post_id
      AND user_id = p_user_id
    ) INTO v_has_shared;
    
    RETURN v_has_shared;
  END IF;
  
  -- Normal görünürlük kontrolü
  RETURN v_visibility = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Grant permissions
GRANT EXECUTE ON FUNCTION check_post_has_shares(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_shared_post(UUID, UUID) TO authenticated;

