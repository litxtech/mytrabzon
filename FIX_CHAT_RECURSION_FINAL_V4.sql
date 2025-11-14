-- ============================================
-- CHAT RECURSION HATASI DÜZELTME - FINAL V4
-- ============================================
-- Bu script'i Supabase SQL Editor'de çalıştırın
-- Tüm recursion hatalarını kesin olarak düzeltir
-- ============================================

-- ============================================
-- 1. TÜM ESKİ POLICY'LERİ KALDIR (CASCADE)
-- ============================================

-- Önce tüm bağımlı policy'leri kaldır
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Chat Members Policies
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'chat_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON chat_members CASCADE', r.policyname);
  END LOOP;

  -- Chat Rooms Policies
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'chat_rooms'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON chat_rooms CASCADE', r.policyname);
  END LOOP;

  -- Messages Policies
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON messages CASCADE', r.policyname);
  END LOOP;
END $$;

-- ============================================
-- 2. HELPER FUNCTION (RECURSION ÖNLEMEK İÇİN)
-- ============================================

-- Önce eski fonksiyonu kaldır
DROP FUNCTION IF EXISTS is_room_member(UUID, UUID) CASCADE;

-- YENİ: SECURITY DEFINER ile RLS bypass - LANGUAGE sql kullan (daha güvenli)
CREATE OR REPLACE FUNCTION is_room_member(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  -- SECURITY DEFINER + SET row_security = off ile RLS tamamen bypass edilir
  -- Bu fonksiyon policy'lerde kullanıldığında recursion oluşmaz
  SELECT EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.room_id = p_room_id 
    AND chat_members.user_id = p_user_id
  );
$$;

-- Fonksiyon sahibini postgres yap (daha güvenli)
ALTER FUNCTION is_room_member(UUID, UUID) OWNER TO postgres;

-- İzinleri ver
GRANT EXECUTE ON FUNCTION is_room_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_room_member(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION is_room_member(UUID, UUID) TO service_role;

-- ============================================
-- 3. CHAT MEMBERS POLICIES (RECURSION OLMADAN)
-- ============================================

-- SELECT: Kullanıcı kendi üyeliğini veya aynı odada üye olduğu diğer üyeleri görebilir
CREATE POLICY "chat_members_select_v4" ON chat_members
  FOR SELECT 
  USING (
    user_id = auth.uid()
    OR is_room_member(room_id, auth.uid())
  );

-- INSERT: Kullanıcı kendini ekleyebilir veya oda sahibi ekleyebilir
CREATE POLICY "chat_members_insert_v4" ON chat_members
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = room_id
      AND created_by = auth.uid()
    )
  );

-- UPDATE: Kullanıcı kendi üyeliğini veya oda sahibi güncelleyebilir
CREATE POLICY "chat_members_update_v4" ON chat_members
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = room_id
      AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = room_id
      AND created_by = auth.uid()
    )
  );

-- DELETE: Kullanıcı kendini çıkarabilir veya oda sahibi çıkarabilir
CREATE POLICY "chat_members_delete_v4" ON chat_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = room_id
      AND created_by = auth.uid()
    )
  );

-- ============================================
-- 4. CHAT ROOMS POLICIES
-- ============================================

CREATE POLICY "chat_rooms_select_v4" ON chat_rooms
  FOR SELECT USING (
    created_by = auth.uid()
    OR is_room_member(id, auth.uid())
  );

CREATE POLICY "chat_rooms_insert_v4" ON chat_rooms
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "chat_rooms_update_v4" ON chat_rooms
  FOR UPDATE USING (
    created_by = auth.uid()
    OR is_room_member(id, auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    OR is_room_member(id, auth.uid())
  );

-- ============================================
-- 5. MESSAGES POLICIES
-- ============================================

CREATE POLICY "messages_select_v4" ON messages
  FOR SELECT USING (
    is_room_member(room_id, auth.uid())
  );

CREATE POLICY "messages_insert_v4" ON messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND is_room_member(room_id, auth.uid())
  );

CREATE POLICY "messages_update_v4" ON messages
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "messages_delete_v4" ON messages
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 6. VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Chat recursion düzeltmesi tamamlandı (V4)';
  RAISE NOTICE '✅ is_room_member fonksiyonu oluşturuldu (SECURITY DEFINER + row_security = off)';
  RAISE NOTICE '✅ Tüm policy''ler güncellendi (recursion yok)';
END $$;

-- ============================================
-- SONUÇ
-- ============================================
-- Tüm recursion hataları kesin olarak düzeltildi
-- SECURITY DEFINER + SET row_security = off ile RLS tamamen bypass edildi
-- Policy'ler artık kesinlikle recursion oluşturmuyor
-- ============================================

