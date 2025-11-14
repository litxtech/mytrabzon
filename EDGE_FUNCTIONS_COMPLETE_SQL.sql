-- ============================================
-- EDGE FUNCTIONS İÇİN EKSİKSİZ SQL SCHEMA
-- ============================================
-- Bu dosyanın TAMAMINI Supabase SQL Editor'e yapıştırın ve çalıştırın
-- Chat ve KYC Edge Functions için gerekli tüm tablolar, policies, indexes ve functions dahil
-- ============================================

-- ============================================
-- 1. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. CHAT SYSTEM TABLES
-- ============================================

-- Chat Rooms Tablosu
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  avatar_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'district')),
  district TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Members Tablosu
CREATE TABLE IF NOT EXISTS chat_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  unread_count INTEGER DEFAULT 0,
  last_read_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Messages Tablosu
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'audio', 'file')),
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Reactions Tablosu
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Blocked Users Tablosu
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- ============================================
-- 3. KYC SYSTEM TABLES
-- ============================================

-- KYC Requests Tablosu
CREATE TABLE IF NOT EXISTS kyc_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  full_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  birth_date DATE NOT NULL,
  country TEXT,
  city TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES admin_users(id),
  review_notes TEXT,
  verification_code TEXT,
  code_generated_at TIMESTAMP WITH TIME ZONE
);

-- KYC Documents Tablosu
CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kyc_id UUID NOT NULL REFERENCES kyc_requests(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('id_front', 'id_back', 'selfie', 'selfie_with_id')),
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. PROFILES TABLOSUNA is_verified KOLONU EKLE
-- ============================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- ============================================
-- 5. ADMIN USERS TABLOSU (KYC için gerekli)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'moderator' CHECK (role IN ('super_admin', 'admin', 'moderator')),
  permissions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. INDEXES (Performance)
-- ============================================

-- Chat Indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message_at ON chat_rooms(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_room_id ON chat_members(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users(blocked_id);

-- KYC Indexes
CREATE INDEX IF NOT EXISTS idx_kyc_requests_user_id ON kyc_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status ON kyc_requests(status);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_created_at ON kyc_requests(created_at DESC);
-- Partial unique index: Bir kullanıcının aynı anda sadece bir pending başvurusu olabilir
CREATE UNIQUE INDEX IF NOT EXISTS idx_kyc_requests_user_pending 
  ON kyc_requests(user_id, status) 
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_kyc_documents_kyc_id ON kyc_documents(kyc_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_type ON kyc_documents(type);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);

-- Admin Indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);

-- ============================================
-- 7. RLS ENABLE
-- ============================================
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Admin kontrolü için function (önce mevcut olanı kaldır)
DROP FUNCTION IF EXISTS is_admin(UUID);
DROP FUNCTION IF EXISTS is_admin(uuid);

-- Admin kontrolü için function
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = user_uuid
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. CHAT RLS POLICIES
-- ============================================

-- Chat Rooms Policies
DROP POLICY IF EXISTS "Users can view chat rooms" ON chat_rooms;
CREATE POLICY "Users can view chat rooms" ON chat_rooms
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_rooms.id
      AND chat_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;
CREATE POLICY "Users can create chat rooms" ON chat_rooms
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update chat rooms" ON chat_rooms;
CREATE POLICY "Users can update chat rooms" ON chat_rooms
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_rooms.id
      AND chat_members.user_id = auth.uid()
      AND chat_members.role = 'admin'
    )
  );

-- Chat Members Policies (Recursion olmayan versiyon)
DROP POLICY IF EXISTS "Users can view chat members" ON chat_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON chat_members;
DROP POLICY IF EXISTS "Chat members are viewable by room members" ON chat_members;

CREATE POLICY "Users can view chat members" ON chat_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR room_id IN (
      SELECT room_id
      FROM chat_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert chat members" ON chat_members;
CREATE POLICY "Users can insert chat members" ON chat_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = room_id
      AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update chat members" ON chat_members;
CREATE POLICY "Users can update chat members" ON chat_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = room_id
      AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete chat members" ON chat_members;
CREATE POLICY "Users can delete chat members" ON chat_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = room_id
      AND created_by = auth.uid()
    )
  );

-- Messages Policies
DROP POLICY IF EXISTS "Users can view messages" ON messages;
CREATE POLICY "Users can view messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = messages.room_id
      AND chat_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert messages" ON messages;
CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = messages.room_id
      AND chat_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update messages" ON messages;
CREATE POLICY "Users can update messages" ON messages
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete messages" ON messages;
CREATE POLICY "Users can delete messages" ON messages
  FOR DELETE USING (user_id = auth.uid());

-- Message Reactions Policies
DROP POLICY IF EXISTS "Users can view message reactions" ON message_reactions;
CREATE POLICY "Users can view message reactions" ON message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages
      JOIN chat_members ON chat_members.room_id = messages.room_id
      WHERE messages.id = message_reactions.message_id
      AND chat_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert message reactions" ON message_reactions;
CREATE POLICY "Users can insert message reactions" ON message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages
      JOIN chat_members ON chat_members.room_id = messages.room_id
      WHERE messages.id = message_reactions.message_id
      AND chat_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete message reactions" ON message_reactions;
CREATE POLICY "Users can delete message reactions" ON message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- Blocked Users Policies
DROP POLICY IF EXISTS "Users can view blocked users" ON blocked_users;
CREATE POLICY "Users can view blocked users" ON blocked_users
  FOR SELECT USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert blocked users" ON blocked_users;
CREATE POLICY "Users can insert blocked users" ON blocked_users
  FOR INSERT WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete blocked users" ON blocked_users;
CREATE POLICY "Users can delete blocked users" ON blocked_users
  FOR DELETE USING (blocker_id = auth.uid());

-- ============================================
-- 10. KYC RLS POLICIES
-- ============================================

-- KYC Requests Policies
DROP POLICY IF EXISTS "kyc_requests_select" ON kyc_requests;
CREATE POLICY "kyc_requests_select" ON kyc_requests
  FOR SELECT USING (
    user_id = auth.uid() OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "kyc_requests_insert" ON kyc_requests;
CREATE POLICY "kyc_requests_insert" ON kyc_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "kyc_requests_update" ON kyc_requests;
CREATE POLICY "kyc_requests_update" ON kyc_requests
  FOR UPDATE USING (
    user_id = auth.uid() OR is_admin(auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid() OR is_admin(auth.uid())
  );

-- KYC Documents Policies
DROP POLICY IF EXISTS "kyc_documents_select" ON kyc_documents;
CREATE POLICY "kyc_documents_select" ON kyc_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM kyc_requests
      WHERE kyc_requests.id = kyc_documents.kyc_id
      AND (kyc_requests.user_id = auth.uid() OR is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "kyc_documents_insert" ON kyc_documents;
CREATE POLICY "kyc_documents_insert" ON kyc_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_requests
      WHERE kyc_requests.id = kyc_documents.kyc_id
      AND kyc_requests.user_id = auth.uid()
      AND kyc_requests.status = 'pending'
    )
  );

-- ============================================
-- 11. ADMIN USERS RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Admin users are viewable by admins" ON admin_users;
CREATE POLICY "Admin users are viewable by admins" ON admin_users
  FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin users can be managed by super admins" ON admin_users;
CREATE POLICY "Admin users can be managed by super admins" ON admin_users
  FOR ALL USING (is_admin(auth.uid()));

-- ============================================
-- 12. TRIGGERS & FUNCTIONS
-- ============================================

-- Chat room'un last_message_at'ini güncelle
CREATE OR REPLACE FUNCTION update_chat_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms
  SET last_message_at = NEW.created_at
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_chat_room_last_message_trigger ON messages;
CREATE TRIGGER update_chat_room_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_room_last_message();

-- KYC onaylandığında profile'ı güncelle
CREATE OR REPLACE FUNCTION update_profile_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE profiles
    SET is_verified = true
    WHERE id = NEW.user_id;
  ELSIF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
    UPDATE profiles
    SET is_verified = false
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_profile_verification_trigger ON kyc_requests;
CREATE TRIGGER update_profile_verification_trigger
  AFTER UPDATE OF status ON kyc_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_verification();

-- ============================================
-- 13. GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_chat_room_last_message() TO authenticated;
GRANT EXECUTE ON FUNCTION update_profile_verification() TO authenticated;

-- ============================================
-- 14. STORAGE BUCKETS (Manuel oluşturulacak)
-- ============================================
-- Supabase Dashboard'dan manuel olarak oluşturun:
-- 
-- 1. kyc-documents
--    - Public: false
--    - File size limit: 10MB
--    - Allowed MIME types: image/jpeg, image/png, image/jpg
--    - Policies: Sadece authenticated kullanıcılar upload edebilir
--
-- 2. chat-media (opsiyonel)
--    - Public: false
--    - File size limit: 20MB
--    - Allowed MIME types: image/*, video/*, audio/*, application/*
--    - Policies: Sadece authenticated kullanıcılar upload edebilir
-- ============================================

-- ============================================
-- TAMAMLANDI!
-- ============================================
-- Bu SQL dosyası tüm Edge Functions için gerekli
-- tabloları, policies'leri, indexes'leri ve functions'ları içerir.
-- 
-- ÖNEMLİ: Storage bucket'ları manuel olarak Supabase Dashboard'dan oluşturun!
-- ============================================

