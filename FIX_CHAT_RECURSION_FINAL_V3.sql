-- ============================================
-- CHAT RECURSION HATASI DÜZELTME - FINAL V3
-- ============================================
-- Bu script'i Supabase SQL Editor'de çalıştırın
-- Tüm recursion hatalarını düzeltir
-- ============================================

-- ============================================
-- 1. TÜM ESKİ POLICY'LERİ KALDIR
-- ============================================

-- Chat Members Policies
DROP POLICY IF EXISTS "Users can view chat members" ON chat_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON chat_members;
DROP POLICY IF EXISTS "Chat members are viewable by room members" ON chat_members;
DROP POLICY IF EXISTS "Chat members viewable by room members" ON chat_members;
DROP POLICY IF EXISTS "Users can join chat rooms" ON chat_members;
DROP POLICY IF EXISTS "Members can update own membership" ON chat_members;
DROP POLICY IF EXISTS "Members can leave chat rooms" ON chat_members;
DROP POLICY IF EXISTS "Users can insert chat members" ON chat_members;
DROP POLICY IF EXISTS "Users can update chat members" ON chat_members;
DROP POLICY IF EXISTS "Users can delete chat members" ON chat_members;
DROP POLICY IF EXISTS "chat_members_select" ON chat_members;
DROP POLICY IF EXISTS "chat_members_insert" ON chat_members;
DROP POLICY IF EXISTS "chat_members_delete" ON chat_members;
DROP POLICY IF EXISTS "chat_members_select_policy" ON chat_members;
DROP POLICY IF EXISTS "chat_members_insert_policy" ON chat_members;
DROP POLICY IF EXISTS "chat_members_delete_policy" ON chat_members;

-- Chat Rooms Policies
DROP POLICY IF EXISTS "Users can view chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Chat rooms viewable by members" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can update chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Members can update chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_select" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_insert" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_update" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_delete" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_select_policy" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_insert_policy" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_update_policy" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_delete_policy" ON chat_rooms;

-- Messages Policies
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Messages viewable by room members" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;
DROP POLICY IF EXISTS "Users can delete messages" ON messages;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON messages;

-- ============================================
-- 2. HELPER FUNCTION (RECURSION ÖNLEMEK İÇİN)
-- ============================================

-- Önce eski fonksiyonu kaldır
DROP FUNCTION IF EXISTS is_room_member(UUID, UUID) CASCADE;

-- YENİ: SECURITY DEFINER ile RLS bypass
CREATE OR REPLACE FUNCTION is_room_member(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- SECURITY DEFINER ile RLS bypass edilir
  -- Bu fonksiyon policy'lerde kullanıldığında recursion oluşmaz
  SELECT EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.room_id = p_room_id 
    AND chat_members.user_id = p_user_id
  );
$$;

-- İzinleri ver
GRANT EXECUTE ON FUNCTION is_room_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_room_member(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION is_room_member(UUID, UUID) TO service_role;

-- ============================================
-- 3. CHAT MEMBERS POLICIES (RECURSION OLMADAN)
-- ============================================

CREATE POLICY "Users can view chat members" ON chat_members
  FOR SELECT 
  USING (
    user_id = auth.uid()
    OR is_room_member(room_id, auth.uid())
  );

CREATE POLICY "Users can insert chat members" ON chat_members
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = room_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update chat members" ON chat_members
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = room_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete chat members" ON chat_members
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

CREATE POLICY "Users can view chat rooms" ON chat_rooms
  FOR SELECT USING (
    created_by = auth.uid()
    OR is_room_member(id, auth.uid())
  );

CREATE POLICY "Users can create chat rooms" ON chat_rooms
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update chat rooms" ON chat_rooms
  FOR UPDATE USING (
    created_by = auth.uid()
    OR is_room_member(id, auth.uid())
  );

-- ============================================
-- 5. MESSAGES POLICIES
-- ============================================

CREATE POLICY "Users can view messages" ON messages
  FOR SELECT USING (
    is_room_member(room_id, auth.uid())
  );

CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND is_room_member(room_id, auth.uid())
  );

CREATE POLICY "Users can update messages" ON messages
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete messages" ON messages
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 6. VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Chat recursion düzeltmesi tamamlandı';
  RAISE NOTICE '✅ is_room_member fonksiyonu oluşturuldu';
  RAISE NOTICE '✅ Tüm policy''ler güncellendi';
END $$;

-- ============================================
-- SONUÇ
-- ============================================
-- Tüm recursion hataları düzeltildi
-- SECURITY DEFINER fonksiyon ile RLS bypass edildi
-- Policy'ler artık recursion oluşturmuyor
-- ============================================

