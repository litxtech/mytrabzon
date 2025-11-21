-- Post/Comment/Event uyarı sistemi
-- Admin gönderilere uyarı verebilir, kullanıcı uyarıyı görür ve silerse uyarı kalkar
-- Eğer kullanıcı silmezse admin silebilir

CREATE TABLE IF NOT EXISTS post_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  warned_by UUID REFERENCES profiles(id) NOT NULL, -- Admin ID
  warning_reason TEXT NOT NULL, -- Uyarı nedeni
  warning_message TEXT, -- Kullanıcıya gösterilecek mesaj
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'event')), -- Gönderi, yorum veya etkinlik
  is_resolved BOOLEAN DEFAULT FALSE, -- Kullanıcı tarafından çözüldü mü (silindi mi)
  resolved_at TIMESTAMPTZ, -- Çözülme zamanı
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_post_warnings_post_id ON post_warnings(post_id);
CREATE INDEX IF NOT EXISTS idx_post_warnings_comment_id ON post_warnings(comment_id);
CREATE INDEX IF NOT EXISTS idx_post_warnings_event_id ON post_warnings(event_id);
CREATE INDEX IF NOT EXISTS idx_post_warnings_warned_by ON post_warnings(warned_by);
CREATE INDEX IF NOT EXISTS idx_post_warnings_is_resolved ON post_warnings(is_resolved);
CREATE INDEX IF NOT EXISTS idx_post_warnings_content_type ON post_warnings(content_type);

-- RLS Policies
ALTER TABLE post_warnings ENABLE ROW LEVEL SECURITY;

-- Herkes uyarıları görebilir (kendi gönderileri için)
CREATE POLICY "Users can view warnings on their own content"
  ON post_warnings FOR SELECT
  USING (
    -- Post sahibi
    (content_type = 'post' AND EXISTS (
      SELECT 1 FROM posts WHERE posts.id = post_warnings.post_id AND posts.author_id = auth.uid()
    ))
    OR
    -- Comment sahibi
    (content_type = 'comment' AND EXISTS (
      SELECT 1 FROM comments WHERE comments.id = post_warnings.comment_id AND comments.user_id = auth.uid()
    ))
    OR
    -- Event sahibi
    (content_type = 'event' AND EXISTS (
      SELECT 1 FROM events WHERE events.id = post_warnings.event_id AND events.user_id = auth.uid()
    ))
    OR
    -- Admin
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
  );

-- Sadece admin uyarı ekleyebilir
CREATE POLICY "Only admins can create warnings"
  ON post_warnings FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
  );

-- Sadece admin uyarı güncelleyebilir
CREATE POLICY "Only admins can update warnings"
  ON post_warnings FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
  );

-- Kullanıcılar kendi gönderilerindeki uyarıları çözebilir (is_resolved = true yapabilir)
-- NOT: RLS policy'de OLD/NEW kullanılamaz, bu kontrol backend'de yapılmalı
CREATE POLICY "Users can resolve warnings on their own content"
  ON post_warnings FOR UPDATE
  USING (
    -- Post sahibi
    (content_type = 'post' AND EXISTS (
      SELECT 1 FROM posts WHERE posts.id = post_warnings.post_id AND posts.author_id = auth.uid()
    ))
    OR
    -- Comment sahibi
    (content_type = 'comment' AND EXISTS (
      SELECT 1 FROM comments WHERE comments.id = post_warnings.comment_id AND comments.user_id = auth.uid()
    ))
    OR
    -- Event sahibi
    (content_type = 'event' AND EXISTS (
      SELECT 1 FROM events WHERE events.id = post_warnings.event_id AND events.user_id = auth.uid()
    ))
  )
  WITH CHECK (
    -- Sadece is_resolved = true yapılabilir (backend'de kontrol edilecek)
    is_resolved = TRUE
  );

-- Sadece admin uyarı silebilir
CREATE POLICY "Only admins can delete warnings"
  ON post_warnings FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
  );

-- Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_post_warnings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_post_warnings_updated_at_trigger
  BEFORE UPDATE ON post_warnings
  FOR EACH ROW
  EXECUTE FUNCTION update_post_warnings_updated_at();

