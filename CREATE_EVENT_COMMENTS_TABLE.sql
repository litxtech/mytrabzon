-- ============================================
-- EVENT_COMMENTS TABLOSU OLUŞTURMA
-- ============================================
-- Event'ler için yorum sistemi
-- ============================================

-- Event Comments Tablosu
CREATE TABLE IF NOT EXISTS event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_comments_event_id ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_user_id ON event_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_created_at ON event_comments(created_at DESC);

-- RLS Policies
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

-- Herkes event yorumlarını görebilir
DROP POLICY IF EXISTS "Event comments are viewable by everyone" ON event_comments;
CREATE POLICY "Event comments are viewable by everyone" ON event_comments
  FOR SELECT
  USING (true);

-- Kullanıcılar yorum ekleyebilir
DROP POLICY IF EXISTS "Users can create event comments" ON event_comments;
CREATE POLICY "Users can create event comments" ON event_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar kendi yorumlarını güncelleyebilir
DROP POLICY IF EXISTS "Users can update their own event comments" ON event_comments;
CREATE POLICY "Users can update their own event comments" ON event_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Kullanıcılar kendi yorumlarını silebilir
DROP POLICY IF EXISTS "Users can delete their own event comments" ON event_comments;
CREATE POLICY "Users can delete their own event comments" ON event_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Event comment count trigger function
CREATE OR REPLACE FUNCTION increment_event_comments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET comment_count = COALESCE(comment_count, 0) + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_event_comments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0)
  WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment count
DROP TRIGGER IF EXISTS on_event_comment_created ON event_comments;
CREATE TRIGGER on_event_comment_created
  AFTER INSERT ON event_comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_event_comments();

DROP TRIGGER IF EXISTS on_event_comment_deleted ON event_comments;
CREATE TRIGGER on_event_comment_deleted
  AFTER DELETE ON event_comments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_event_comments();

-- Events tablosuna comment_count kolonu ekle (eğer yoksa)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'comment_count'
  ) THEN
    ALTER TABLE events ADD COLUMN comment_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON event_comments TO authenticated;
GRANT SELECT ON event_comments TO anon;

-- ============================================
-- TAMAMLANDI
-- ============================================

