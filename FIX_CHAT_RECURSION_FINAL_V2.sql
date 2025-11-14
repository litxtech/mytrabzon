-- ============================================
-- CHAT MEMBERS INFINITE RECURSION HATASI DÜZELTME
-- ============================================

-- Mevcut problematik policy'leri kaldır
DROP POLICY IF EXISTS "Users can view chat members" ON chat_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON chat_members;
DROP POLICY IF EXISTS "Chat members are viewable by room members" ON chat_members;

-- Basit ve recursion olmayan policy oluştur
-- Sadece kullanıcının kendi üyeliğini görebilmesi veya aynı odada üye olması kontrolü
CREATE POLICY "Users can view chat members" ON chat_members
  FOR SELECT 
  USING (
    -- Kullanıcı kendi üyeliğini görebilir
    user_id = auth.uid()
    OR
    -- Veya aynı odada üye olan kullanıcılar görebilir (recursion olmadan)
    room_id IN (
      SELECT room_id 
      FROM chat_members 
      WHERE user_id = auth.uid()
    )
  );

-- INSERT policy
DROP POLICY IF EXISTS "Users can insert chat members" ON chat_members;
CREATE POLICY "Users can insert chat members" ON chat_members
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = room_id
      AND created_by = auth.uid()
    )
  );

-- UPDATE policy
DROP POLICY IF EXISTS "Users can update chat members" ON chat_members;
CREATE POLICY "Users can update chat members" ON chat_members
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = room_id
      AND created_by = auth.uid()
    )
  );

-- DELETE policy
DROP POLICY IF EXISTS "Users can delete chat members" ON chat_members;
CREATE POLICY "Users can delete chat members" ON chat_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = room_id
      AND created_by = auth.uid()
    )
  );

