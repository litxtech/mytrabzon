-- ============================================
-- PAYLAŞILAN GÖNDERİLERİN SİLİNMEMESİ İÇİN KORUMA
-- ============================================
-- Paylaşılan gönderiler (post_shares tablosunda kayıt varsa) kesinlikle silinmeyecek

-- Step 1: posts tablosuna is_deleted kolonu ekle (soft delete için)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS posts_is_deleted_idx ON posts(is_deleted);

-- Step 2: Paylaşılan gönderileri kontrol eden function
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

-- Step 3: Post silme işlemini engelleyen trigger
-- Paylaşılan gönderiler için soft delete yap (exception fırlatma)
CREATE OR REPLACE FUNCTION prevent_shared_post_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Eğer gönderi paylaşıldıysa, hard delete'i engelle ve soft delete yap
  IF check_post_has_shares(OLD.id) AND NOT OLD.is_deleted THEN
    -- Soft delete yap (is_deleted = true)
    UPDATE posts
    SET is_deleted = true,
        archived = true,
        updated_at = NOW()
    WHERE id = OLD.id;
    
    -- DELETE işlemini iptal et (sessizce soft delete yapıldı)
    RETURN NULL;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Eski trigger'ı kaldır ve yenisini ekle
DROP TRIGGER IF EXISTS prevent_shared_post_deletion_trigger ON posts;
CREATE TRIGGER prevent_shared_post_deletion_trigger
  BEFORE DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_shared_post_deletion();

-- Step 4: Soft delete için function (paylaşılan gönderiler için)
CREATE OR REPLACE FUNCTION soft_delete_post(p_post_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_shares BOOLEAN;
  v_author_id UUID;
BEGIN
  -- Gönderiyi kontrol et
  SELECT author_id INTO v_author_id
  FROM posts
  WHERE id = p_post_id;
  
  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'Gönderi bulunamadı';
  END IF;
  
  IF v_author_id != p_user_id THEN
    RAISE EXCEPTION 'Bu gönderiyi silmeye yetkiniz yok';
  END IF;
  
  -- Paylaşım kontrolü
  v_has_shares := check_post_has_shares(p_post_id);
  
  IF v_has_shares THEN
    -- Paylaşılan gönderiler için soft delete
    UPDATE posts
    SET is_deleted = true,
        archived = true,
        updated_at = NOW()
    WHERE id = p_post_id;
    
    RETURN true;
  ELSE
    -- Paylaşılmayan gönderiler için hard delete (normal silme)
    DELETE FROM posts WHERE id = p_post_id;
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: RLS policy güncelle - silinen gönderileri gösterme
DROP POLICY IF EXISTS "Posts are viewable based on visibility" ON posts;
CREATE POLICY "Posts are viewable based on visibility" ON posts
  FOR SELECT USING (
    is_deleted = false
    AND (
      visibility = 'public' 
      OR author_id = auth.uid()
    )
  );

-- Step 6: Paylaşılan gönderiler için özel görünürlük
-- Eğer bir gönderi paylaşıldıysa, paylaşan kullanıcılar görebilir
CREATE OR REPLACE FUNCTION can_view_shared_post(p_post_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_author BOOLEAN;
  v_has_shared BOOLEAN;
  v_visibility TEXT;
  v_is_deleted BOOLEAN;
BEGIN
  -- Gönderi sahibi mi?
  SELECT author_id = p_user_id INTO v_is_author
  FROM posts
  WHERE id = p_post_id;
  
  IF v_is_author THEN
    RETURN true;
  END IF;
  
  -- Gönderi silindi mi?
  SELECT is_deleted INTO v_is_deleted
  FROM posts
  WHERE id = p_post_id;
  
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
  SELECT visibility INTO v_visibility
  FROM posts
  WHERE id = p_post_id;
  
  RETURN v_visibility = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Paylaşım sayısını güncelleyen trigger (mevcut trigger'ı güncelle)
-- Bu zaten var, sadece kontrol ediyoruz

-- Step 8: Paylaşılan gönderileri listeleyen view
CREATE OR REPLACE VIEW shared_posts_view AS
SELECT 
  p.*,
  COUNT(ps.id) as total_shares,
  ARRAY_AGG(DISTINCT ps.user_id) as shared_by_users
FROM posts p
LEFT JOIN post_shares ps ON p.id = ps.post_id
WHERE p.is_deleted = false
GROUP BY p.id;

-- Step 9: Grant permissions
GRANT EXECUTE ON FUNCTION check_post_has_shares(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_post(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_shared_post(UUID, UUID) TO authenticated;
GRANT SELECT ON shared_posts_view TO authenticated;

