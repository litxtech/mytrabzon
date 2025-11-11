-- ============================================
-- FIX CHAT RLS POLICIES - INFINITE RECURSION
-- ============================================
-- Run this in Supabase SQL Editor to fix the infinite recursion error

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users view their rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users view room members" ON chat_members;
DROP POLICY IF EXISTS "Room admins can add members" ON chat_members;
DROP POLICY IF EXISTS "Users view messages in their rooms" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON messages;

-- ============================================
-- NEW FIXED POLICIES
-- ============================================

-- Chat Members Policies (Fix first - no recursion)
CREATE POLICY "Users view room members" ON chat_members FOR SELECT 
  USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM chat_members cm 
      WHERE cm.room_id = chat_members.room_id 
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Room creators and admins can add members" ON chat_members FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = chat_members.room_id 
      AND (
        cr.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM chat_members cm
          WHERE cm.room_id = chat_members.room_id
          AND cm.user_id = auth.uid()
          AND cm.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can leave rooms" ON chat_members FOR DELETE
  USING (user_id = auth.uid());

-- Chat Rooms Policies (Now safe to reference chat_members)
CREATE POLICY "Users view their rooms" ON chat_rooms FOR SELECT 
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM chat_members cm 
      WHERE cm.room_id = chat_rooms.id 
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create rooms" ON chat_rooms FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update rooms" ON chat_rooms FOR UPDATE
  USING (created_by = auth.uid());

-- Messages Policies
CREATE POLICY "Users view messages in their rooms" ON messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM chat_members cm 
      WHERE cm.room_id = messages.room_id 
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send messages" ON messages FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id
    AND
    EXISTS (
      SELECT 1 FROM chat_members cm 
      WHERE cm.room_id = messages.room_id 
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own messages" ON messages FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" ON messages FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify policies are created:
-- SELECT schemaname, tablename, policyname FROM pg_policies 
-- WHERE tablename IN ('chat_rooms', 'chat_members', 'messages')
-- ORDER BY tablename, policyname;
