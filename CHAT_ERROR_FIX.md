# Chat RLS Policy Fix

## Problem
The chat system was experiencing an **infinite recursion error** due to incorrect RLS (Row Level Security) policies:

```
infinite recursion detected in policy for relation "chat_members"
```

## Root Cause
The `chat_members` table had a policy that queried itself, creating a circular dependency:

```sql
-- ❌ WRONG - This causes infinite recursion
CREATE POLICY "Users view room members" ON chat_members FOR SELECT 
  USING (room_id IN (SELECT room_id FROM chat_members WHERE user_id = auth.uid()));
```

## Solution
Run the SQL fix script to update the policies without recursion.

### Steps to Fix

1. **Go to Supabase Dashboard**
   - Open your Supabase project
   - Navigate to SQL Editor

2. **Run the Fix Script**
   - Open `constants/fix-chat-policies.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click "Run"

3. **Verify the Fix**
   ```sql
   -- Run this to verify policies are updated
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE tablename IN ('chat_rooms', 'chat_members', 'messages')
   ORDER BY tablename, policyname;
   ```

4. **Test the Chat**
   - Restart your app
   - Navigate to the Chat tab
   - Chat rooms should now load without errors

## What Changed

### Before (❌ Causes Recursion)
```sql
CREATE POLICY "Users view room members" ON chat_members FOR SELECT 
  USING (room_id IN (SELECT room_id FROM chat_members WHERE user_id = auth.uid()));
```

### After (✅ No Recursion)
```sql
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
```

## Key Changes

1. **Chat Members Policies** - Removed self-referencing subquery
2. **Chat Rooms Policies** - Now safely references chat_members
3. **Messages Policies** - Simplified with EXISTS clause
4. **Added Missing Policy** - "Users can leave rooms" for DELETE operations

## Files Modified

- ✅ `constants/supabase-schema.sql` - Updated with correct policies
- ✅ `constants/fix-chat-policies.sql` - New fix script to run in Supabase

## Verify Success

After running the fix, you should see:
- ✅ No more "infinite recursion" errors
- ✅ Chat rooms load successfully
- ✅ Messages display correctly
- ✅ Real-time updates work

## Need Help?

If you still see errors after applying the fix:
1. Check that all policies were dropped and recreated
2. Verify you have chat_rooms and chat_members data in your database
3. Check browser console for any other errors
4. Make sure your user is authenticated
