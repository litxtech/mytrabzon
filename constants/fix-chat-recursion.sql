-- ============================================
-- FIX CHAT INFINITE RECURSION - UPDATED SCRIPT
-- ============================================

-- Step 1: Drop SPECIFIC policies that might conflict
DROP POLICY IF EXISTS "chat_members_select" ON chat_members;
DROP POLICY IF EXISTS "chat_members_insert" ON chat_members;
DROP POLICY IF EXISTS "chat_members_delete" ON chat_members;
DROP POLICY IF EXISTS "chat_rooms_select" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_insert" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_update" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_delete" ON chat_rooms;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;

-- Step 2: Drop old helper functions if they exist
DROP FUNCTION IF EXISTS is_room_member(UUID, UUID);
DROP FUNCTION IF EXISTS is_room_admin(UUID, UUID);

-- Step 3: Create helper function to check room membership
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

-- Step 4: Create helper function to check if user is room admin
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

-- Step 5: Create new policies using helper functions (NO RECURSION)

-- Chat Members Policies
CREATE POLICY "chat_members_select_policy" ON chat_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_room_member(room_id, auth.uid())
  );

CREATE POLICY "chat_members_insert_policy" ON chat_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = chat_members.room_id
      AND cr.created_by = auth.uid()
    )
    OR is_room_admin(room_id, auth.uid())
  );

CREATE POLICY "chat_members_delete_policy" ON chat_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR is_room_admin(room_id, auth.uid())
  );

-- Chat Rooms Policies
CREATE POLICY "chat_rooms_select_policy" ON chat_rooms
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_room_member(id, auth.uid())
  );

CREATE POLICY "chat_rooms_insert_policy" ON chat_rooms
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "chat_rooms_update_policy" ON chat_rooms
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR is_room_admin(id, auth.uid())
  );

CREATE POLICY "chat_rooms_delete_policy" ON chat_rooms
  FOR DELETE
  USING (created_by = auth.uid());

-- Messages Policies
CREATE POLICY "messages_select_policy" ON messages
  FOR SELECT
  USING (is_room_member(room_id, auth.uid()));

CREATE POLICY "messages_insert_policy" ON messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_room_member(room_id, auth.uid())
  );

CREATE POLICY "messages_update_policy" ON messages
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "messages_delete_policy" ON messages
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR is_room_admin(room_id, auth.uid())
  );

-- Step 6: Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION is_room_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_room_admin(UUID, UUID) TO authenticated;

-- Step 7: Verify policies are created
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
