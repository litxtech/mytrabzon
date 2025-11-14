-- ============================================
-- FIX CHAT INFINITE RECURSION - FINAL FIX
-- ============================================
-- Bu script'i Supabase SQL Editor'de çalıştırın

-- Step 1: Drop ALL existing chat policies
DROP POLICY IF EXISTS "Chat members viewable by room members" ON chat_members;
DROP POLICY IF EXISTS "Users can join chat rooms" ON chat_members;
DROP POLICY IF EXISTS "Members can update own membership" ON chat_members;
DROP POLICY IF EXISTS "Members can leave chat rooms" ON chat_members;
DROP POLICY IF EXISTS "Chat rooms viewable by members" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Members can update chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admins can delete chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Messages viewable by room members" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

-- Step 2: Create helper function to check room membership (SECURITY DEFINER prevents recursion)
CREATE OR REPLACE FUNCTION is_room_member(room_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.room_id = $1 
    AND chat_members.user_id = $2
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_room_member(UUID, UUID) TO authenticated;

-- Step 3: Create NEW policies using helper function (NO RECURSION)

-- Chat Members Policies
CREATE POLICY "Chat members viewable by room members" ON chat_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_room_member(room_id, auth.uid())
  );

CREATE POLICY "Users can join chat rooms" ON chat_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can update own membership" ON chat_members
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can leave chat rooms" ON chat_members
  FOR DELETE
  USING (user_id = auth.uid());

-- Chat Rooms Policies
CREATE POLICY "Chat rooms viewable by members" ON chat_rooms
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_room_member(id, auth.uid())
  );

CREATE POLICY "Users can create chat rooms" ON chat_rooms
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Members can update chat rooms" ON chat_rooms
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR is_room_member(id, auth.uid())
  );

CREATE POLICY "Admins can delete chat rooms" ON chat_rooms
  FOR DELETE
  USING (created_by = auth.uid());

-- Messages Policies
CREATE POLICY "Messages viewable by room members" ON messages
  FOR SELECT
  USING (is_room_member(room_id, auth.uid()));

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_room_member(room_id, auth.uid())
  );

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE
  USING (user_id = auth.uid());

