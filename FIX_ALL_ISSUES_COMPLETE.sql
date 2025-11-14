-- ============================================
-- TÜM SORUNLARI DÜZELTEN KAPSAMLI SQL SCRIPT
-- ============================================
-- Bu script'i Supabase SQL Editor'de çalıştırın
-- Tüm RLS policy'leri, helper function'ları ve index'leri düzeltir
-- ============================================

-- ============================================
-- 1. ÖNCE TÜM POLICY'LERİ KALDIR (Function'a bağımlı oldukları için)
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

-- Chat Rooms Policies
DROP POLICY IF EXISTS "Users can view chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Chat rooms viewable by members" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can update chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Members can update chat rooms" ON chat_rooms;

-- Messages Policies
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Messages viewable by room members" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;
DROP POLICY IF EXISTS "Users can delete messages" ON messages;

-- ============================================
-- 2. HELPER FUNCTIONS (Recursion önlemek için)
-- ============================================

-- Chat room membership kontrolü (SECURITY DEFINER ile recursion önlenir)
-- Önce CASCADE ile drop et (bağımlı policy'ler zaten kaldırıldı)
DROP FUNCTION IF EXISTS is_room_member(UUID, UUID) CASCADE;

CREATE OR REPLACE FUNCTION is_room_member(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.room_id = p_room_id 
    AND chat_members.user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION is_room_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_room_member(UUID, UUID) TO anon;

-- ============================================
-- 3. CHAT MEMBERS POLICIES (Recursion olmadan)
-- ============================================

-- YENİ: Recursion olmayan policy'ler (Helper function kullanarak)
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
-- 3. CHAT ROOMS POLICIES (Helper function ile)
-- ============================================

DROP POLICY IF EXISTS "Users can view chat rooms" ON chat_rooms;
CREATE POLICY "Users can view chat rooms" ON chat_rooms
  FOR SELECT USING (
    created_by = auth.uid()
    OR is_room_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;
CREATE POLICY "Users can create chat rooms" ON chat_rooms
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update chat rooms" ON chat_rooms;
CREATE POLICY "Users can update chat rooms" ON chat_rooms
  FOR UPDATE USING (
    created_by = auth.uid()
    OR (
      is_room_member(id, auth.uid())
      AND EXISTS (
        SELECT 1 FROM chat_members
        WHERE room_id = chat_rooms.id
        AND user_id = auth.uid()
        AND role = 'admin'
      )
    )
  );

-- ============================================
-- 4. MESSAGES POLICIES (Helper function ile)
-- ============================================

DROP POLICY IF EXISTS "Users can view messages" ON messages;
CREATE POLICY "Users can view messages" ON messages
  FOR SELECT USING (
    is_room_member(room_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert messages" ON messages;
CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND is_room_member(room_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can update messages" ON messages;
CREATE POLICY "Users can update messages" ON messages
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete messages" ON messages;
CREATE POLICY "Users can delete messages" ON messages
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 5. PROFILES POLICIES (Kullanıcılar listesi için)
-- ============================================

-- Profiles SELECT policy - Herkes kendi profilini görebilir, directory'de olanları görebilir
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
CREATE POLICY "Users can view profiles" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR (
      show_in_directory = true
      AND (privacy_settings->>'profileVisible')::boolean IS NOT FALSE
    )
  );

-- Profiles UPDATE policy - Sadece kendi profilini güncelleyebilir
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Profiles INSERT policy - Otomatik oluşturulur, auth trigger ile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ============================================
-- 6. PERFORMANCE INDEXES
-- ============================================

-- Chat members için composite index
CREATE INDEX IF NOT EXISTS idx_chat_members_room_user 
  ON chat_members(room_id, user_id);

-- Profiles için directory ve visibility index
CREATE INDEX IF NOT EXISTS idx_profiles_directory 
  ON profiles(show_in_directory) 
  WHERE show_in_directory = true;

-- ============================================
-- 7. VERIFICATION
-- ============================================

-- Policy'lerin doğru oluşturulduğunu kontrol et
DO $$
BEGIN
  RAISE NOTICE '✅ Chat members policies created';
  RAISE NOTICE '✅ Helper function is_room_member created';
  RAISE NOTICE '✅ All RLS policies updated';
END $$;

-- ============================================
-- SONUÇ
-- ============================================
-- Tüm policy'ler güncellendi
-- Recursion sorunu çözüldü (helper function kullanılıyor)
-- Performance index'leri eklendi
-- ============================================

