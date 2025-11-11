-- ============================================
-- FIX CHAT INFINITE RECURSION - FINAL FIX
-- ============================================
-- This fixes the "infinite recursion detected in policy" error
-- Run this entire script in Supabase SQL Editor

-- Step 1: Drop ALL existing chat-related policies
DROP POLICY IF EXISTS "Users view their rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Room creators can update rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users view room members" ON chat_members;
DROP POLICY IF EXISTS "Room creators and admins can add members" ON chat_members;
DROP POLICY IF EXISTS "Room admins can add members" ON chat_members;
DROP POLICY IF EXISTS "Users can leave rooms" ON chat_members;
DROP POLICY IF EXISTS "Users view messages in their rooms" ON messages;
DROP POLICY IF EXISTS "Members can send messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

-- Step 2: Create helper function to check room membership
-- This breaks the recursion by using a direct query instead of RLS
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

-- Step 3: Create helper function to check if user is room admin
CREATE OR REPLACE FUNCTION is_room_admin(room_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.room_id = $1 
    AND chat_members.user_id = $2
    AND chat_members.role = 'admin'
  );
$$;

-- Step 4: Create new policies using helper functions (NO RECURSION)

-- Chat Members Policies
CREATE POLICY "chat_members_select" ON chat_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_room_member(room_id, auth.uid())
  );

CREATE POLICY "chat_members_insert" ON chat_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = chat_members.room_id
      AND cr.created_by = auth.uid()
    )
    OR is_room_admin(room_id, auth.uid())
  );

CREATE POLICY "chat_members_delete" ON chat_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR is_room_admin(room_id, auth.uid())
  );

-- Chat Rooms Policies
CREATE POLICY "chat_rooms_select" ON chat_rooms
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_room_member(id, auth.uid())
  );

CREATE POLICY "chat_rooms_insert" ON chat_rooms
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "chat_rooms_update" ON chat_rooms
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR is_room_admin(id, auth.uid())
  );

CREATE POLICY "chat_rooms_delete" ON chat_rooms
  FOR DELETE
  USING (created_by = auth.uid());

-- Messages Policies
CREATE POLICY "messages_select" ON messages
  FOR SELECT
  USING (is_room_member(room_id, auth.uid()));

CREATE POLICY "messages_insert" ON messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_room_member(room_id, auth.uid())
  );

CREATE POLICY "messages_update" ON messages
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "messages_delete" ON messages
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR is_room_admin(room_id, auth.uid())
  );

-- Step 5: Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION is_room_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_room_admin(UUID, UUID) TO authenticated;

-- Step 6: Verify policies are created
SELECT 
  schemaname, 
  tablename, 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('chat_rooms', 'chat_members', 'messages')
ORDER BY tablename, policyname;

-- ============================================
-- ✅ RECURSION FIX COMPLETE
-- ============================================
-- The helper functions use SECURITY DEFINER which bypasses RLS
-- This breaks the infinite recursion loop
-- All policies now use these helper functions instead of direct queries
