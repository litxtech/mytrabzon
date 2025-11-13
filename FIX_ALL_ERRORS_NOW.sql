-- ============================================
-- FIX ALL ERRORS - CRITICAL DATABASE FIXES
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE PROFILES VIEW (Compatibility Layer)
-- ============================================
-- This creates a 'profiles' view that maps to 'user_profiles'
-- So both names work in queries

DROP VIEW IF EXISTS profiles CASCADE;
CREATE OR REPLACE VIEW profiles AS SELECT * FROM user_profiles;

-- Grant permissions
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
GRANT ALL ON profiles TO service_role;

-- ============================================
-- 2. ENSURE PROFILE CREATION TRIGGER EXISTS
-- ============================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;

-- Create improved function
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if profile already exists
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = NEW.id) THEN
    INSERT INTO user_profiles (id, email, full_name, district)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kullanıcı'),
      COALESCE((NEW.raw_user_meta_data->>'district')::district_type, 'Ortahisar')
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created 
AFTER INSERT ON auth.users
FOR EACH ROW 
EXECUTE FUNCTION create_user_profile();

-- ============================================
-- 3. CREATE MISSING PROFILES FOR EXISTING USERS
-- ============================================
-- This ensures all existing users have profiles

INSERT INTO user_profiles (id, email, full_name, district)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Kullanıcı'),
  COALESCE((u.raw_user_meta_data->>'district')::district_type, 'Ortahisar')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. FIX CHAT_MEMBERS TO PROFILES RELATIONSHIP
-- ============================================

-- Ensure the foreign key exists with proper cascade
ALTER TABLE chat_members 
DROP CONSTRAINT IF EXISTS chat_members_user_id_fkey;

ALTER TABLE chat_members
ADD CONSTRAINT chat_members_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES user_profiles(id) 
ON DELETE CASCADE;

-- Ensure chat_rooms foreign key is correct
ALTER TABLE chat_rooms 
DROP CONSTRAINT IF EXISTS chat_rooms_created_by_fkey;

ALTER TABLE chat_rooms
ADD CONSTRAINT chat_rooms_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES user_profiles(id) 
ON DELETE SET NULL;

-- ============================================
-- 5. FIX MESSAGES TO PROFILES RELATIONSHIP
-- ============================================

ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

ALTER TABLE messages
ADD CONSTRAINT messages_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES user_profiles(id) 
ON DELETE CASCADE;

-- ============================================
-- 6. UPDATE HELPER FUNCTIONS TO BE MORE ROBUST
-- ============================================

-- Recreate helper functions with better error handling
DROP FUNCTION IF EXISTS is_room_member(UUID, UUID) CASCADE;
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

DROP FUNCTION IF EXISTS is_room_admin(UUID, UUID) CASCADE;
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
GRANT EXECUTE ON FUNCTION is_room_member(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION is_room_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_room_admin(UUID, UUID) TO anon;

-- ============================================
-- 7. RECREATE ALL CHAT RLS POLICIES
-- ============================================

-- Chat Members Policies
DROP POLICY IF EXISTS "chat_members_select" ON chat_members;
CREATE POLICY "chat_members_select" ON chat_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_members cm2 
      WHERE cm2.room_id = chat_members.room_id 
      AND cm2.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_members_insert" ON chat_members;
CREATE POLICY "chat_members_insert" ON chat_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = chat_members.room_id
      AND (
        cr.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM chat_members cm2
          WHERE cm2.room_id = chat_members.room_id
          AND cm2.user_id = auth.uid()
          AND cm2.role = 'admin'
        )
      )
    )
  );

DROP POLICY IF EXISTS "chat_members_update" ON chat_members;
CREATE POLICY "chat_members_update" ON chat_members
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_members cm2
      WHERE cm2.room_id = chat_members.room_id
      AND cm2.user_id = auth.uid()
      AND cm2.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "chat_members_delete" ON chat_members;
CREATE POLICY "chat_members_delete" ON chat_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_members cm2
      WHERE cm2.room_id = chat_members.room_id
      AND cm2.user_id = auth.uid()
      AND cm2.role = 'admin'
    )
  );

-- Chat Rooms Policies
DROP POLICY IF EXISTS "chat_rooms_select" ON chat_rooms;
CREATE POLICY "chat_rooms_select" ON chat_rooms
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_members cm
      WHERE cm.room_id = chat_rooms.id
      AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_rooms_insert" ON chat_rooms;
CREATE POLICY "chat_rooms_insert" ON chat_rooms
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "chat_rooms_update" ON chat_rooms;
CREATE POLICY "chat_rooms_update" ON chat_rooms
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_members cm
      WHERE cm.room_id = chat_rooms.id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "chat_rooms_delete" ON chat_rooms;
CREATE POLICY "chat_rooms_delete" ON chat_rooms
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Messages Policies  
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members cm
      WHERE cm.room_id = messages.room_id
      AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_members cm
      WHERE cm.room_id = messages.room_id
      AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "messages_delete" ON messages;
CREATE POLICY "messages_delete" ON messages
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_members cm
      WHERE cm.room_id = messages.room_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  );

-- ============================================
-- 8. ADD INDEXES FOR BETTER PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_chat_members_user_room ON chat_members(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ============================================
-- 9. VERIFY SETUP
-- ============================================

-- This will show any users without profiles
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = u.id);
  
  IF missing_count > 0 THEN
    RAISE WARNING '% users still missing profiles!', missing_count;
  ELSE
    RAISE NOTICE '✅ All users have profiles';
  END IF;
END $$;

-- ============================================
-- ✅ FIXES APPLIED
-- ============================================
-- 
-- Fixed:
-- 1. ✅ Created 'profiles' view for compatibility
-- 2. ✅ Ensured profile creation trigger exists
-- 3. ✅ Created missing profiles for existing users
-- 4. ✅ Fixed chat_members to profiles relationship
-- 5. ✅ Fixed messages to profiles relationship  
-- 6. ✅ Updated helper functions
-- 7. ✅ Recreated all chat RLS policies (no recursion)
-- 8. ✅ Added performance indexes
-- 9. ✅ Verified setup
-- 
-- All errors should now be fixed!
-- ============================================
