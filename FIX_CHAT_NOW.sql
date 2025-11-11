-- ============================================
-- INSTANT FIX: CHAT INFINITE RECURSION ERROR
-- ============================================
-- Copy this ENTIRE file and paste into Supabase SQL Editor
-- Then click RUN

-- Step 1: Drop ALL existing chat policies
DROP POLICY IF EXISTS "Users view their rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Room creators can update rooms" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_select" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_insert" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_update" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_delete" ON chat_rooms;

DROP POLICY IF EXISTS "Users view room members" ON chat_members;
DROP POLICY IF EXISTS "Room creators and admins can add members" ON chat_members;
DROP POLICY IF EXISTS "Room admins can add members" ON chat_members;
DROP POLICY IF EXISTS "Users can leave rooms" ON chat_members;
DROP POLICY IF EXISTS "chat_members_select" ON chat_members;
DROP POLICY IF EXISTS "chat_members_insert" ON chat_members;
DROP POLICY IF EXISTS "chat_members_delete" ON chat_members;
DROP POLICY IF EXISTS "chat_members_update" ON chat_members;

DROP POLICY IF EXISTS "Users view messages in their rooms" ON messages;
DROP POLICY IF EXISTS "Members can send messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;

DROP POLICY IF EXISTS "reactions_viewable" ON message_reactions;
DROP POLICY IF EXISTS "users_can_add_reactions" ON message_reactions;
DROP POLICY IF EXISTS "users_can_remove_reactions" ON message_reactions;

-- Step 2: Create helper functions to prevent recursion
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_room_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_room_admin(UUID, UUID) TO authenticated;

-- Step 3: Create NEW policies using helper functions

-- Chat Members Policies
CREATE POLICY "chat_members_select" ON chat_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_room_member(room_id, auth.uid())
  );

CREATE POLICY "chat_members_insert" ON chat_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = chat_members.room_id
      AND cr.created_by = auth.uid()
    )
    OR is_room_admin(room_id, auth.uid())
  );

CREATE POLICY "chat_members_delete" ON chat_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR is_room_admin(room_id, auth.uid())
  );

-- Chat Rooms Policies
CREATE POLICY "chat_rooms_select" ON chat_rooms
  FOR SELECT USING (
    created_by = auth.uid()
    OR is_room_member(id, auth.uid())
  );

CREATE POLICY "chat_rooms_insert" ON chat_rooms
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "chat_rooms_update" ON chat_rooms
  FOR UPDATE USING (
    created_by = auth.uid()
    OR is_room_admin(id, auth.uid())
  );

CREATE POLICY "chat_rooms_delete" ON chat_rooms
  FOR DELETE USING (created_by = auth.uid());

-- Messages Policies
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (is_room_member(room_id, auth.uid()));

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND is_room_member(room_id, auth.uid())
  );

CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "messages_delete" ON messages
  FOR DELETE USING (
    user_id = auth.uid()
    OR is_room_admin(room_id, auth.uid())
  );

-- Message Reactions Policies
CREATE POLICY "reactions_viewable" ON message_reactions
  FOR SELECT USING (
    is_room_member(
      (SELECT room_id FROM messages WHERE id = message_reactions.message_id),
      auth.uid()
    )
  );

CREATE POLICY "users_can_add_reactions" ON message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_remove_reactions" ON message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- ✅ FIX COMPLETE - Test your chat now!
-- ============================================
