-- ============================================
-- LAZGPT SİSTEMİ - SQL TABLOLARI
-- ============================================
-- LazGPT sohbet geçmişi ve bildirimler için tablolar
-- ============================================

-- ============================================
-- 1. LAZGPT CONVERSATIONS (Sohbet Geçmişi)
-- ============================================

CREATE TABLE IF NOT EXISTS lazgpt_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lazgpt_conversations_user_id ON lazgpt_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_lazgpt_conversations_updated_at ON lazgpt_conversations(updated_at DESC);

-- ============================================
-- 2. LAZGPT NOTIFICATIONS (Fıkra Bildirimleri)
-- ============================================

CREATE TABLE IF NOT EXISTS lazgpt_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL DEFAULT 'joke_suggestion',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lazgpt_notifications_user_id ON lazgpt_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_lazgpt_notifications_is_read ON lazgpt_notifications(is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lazgpt_notifications_created_at ON lazgpt_notifications(created_at DESC);

-- ============================================
-- 3. FUNCTIONS
-- ============================================

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_lazgpt_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lazgpt_conversations_updated_at
  BEFORE UPDATE ON lazgpt_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_lazgpt_conversations_updated_at();

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- LazGPT Conversations
ALTER TABLE lazgpt_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own conversations" ON lazgpt_conversations;
CREATE POLICY "Users can view their own conversations" ON lazgpt_conversations
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own conversations" ON lazgpt_conversations;
CREATE POLICY "Users can create their own conversations" ON lazgpt_conversations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own conversations" ON lazgpt_conversations;
CREATE POLICY "Users can update their own conversations" ON lazgpt_conversations
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own conversations" ON lazgpt_conversations;
CREATE POLICY "Users can delete their own conversations" ON lazgpt_conversations
  FOR DELETE
  USING (user_id = auth.uid());

-- LazGPT Notifications
ALTER TABLE lazgpt_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON lazgpt_notifications;
CREATE POLICY "Users can view their own notifications" ON lazgpt_notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON lazgpt_notifications;
CREATE POLICY "Users can update their own notifications" ON lazgpt_notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- SONUÇ
-- ============================================
-- ✅ lazgpt_conversations tablosu oluşturuldu
-- ✅ lazgpt_notifications tablosu oluşturuldu
-- ✅ RLS policy'leri eklendi
-- ============================================

