-- ============================================
-- NOTIFICATIONS TABLOSU BODY KOLONU DÜZELTMESİ
-- ============================================
-- Schema cache hatası için: "could not find the body column of notifications in the schema cache"
-- Bu hata, notifications tablosunda body kolonu olmadığında veya yanlış isimlendirildiğinde oluşur.

-- 1. Body kolonu yoksa ekle
DO $$ 
BEGIN
  -- body kolonu kontrolü ve ekleme
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'body'
  ) THEN
    -- Eğer message kolonu varsa, body'ye taşı ve message'ı sil
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'message'
    ) THEN
      -- Message kolonunu body'ye kopyala
      ALTER TABLE notifications ADD COLUMN body TEXT;
      UPDATE notifications SET body = message WHERE body IS NULL;
      ALTER TABLE notifications ALTER COLUMN body SET NOT NULL;
      -- Message kolonunu sil (eğer başka yerde kullanılmıyorsa)
      -- ALTER TABLE notifications DROP COLUMN message;
    ELSE
      -- Body kolonu yoksa direkt ekle
      ALTER TABLE notifications ADD COLUMN body TEXT NOT NULL DEFAULT '';
    END IF;
  END IF;
  
  -- Body kolonu NULL ise NOT NULL yap
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'body' 
    AND is_nullable = 'YES'
  ) THEN
    -- Önce NULL değerleri düzelt
    UPDATE notifications SET body = '' WHERE body IS NULL;
    ALTER TABLE notifications ALTER COLUMN body SET NOT NULL;
  END IF;
END $$;

-- 2. Index'leri kontrol et
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_is_deleted ON notifications(is_deleted) WHERE is_deleted = false;

-- 3. RLS Policy'leri kontrol et
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
CREATE POLICY "Users can insert their own notifications" ON notifications
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- 4. Schema cache'i yenilemek için (Supabase otomatik yapar ama manuel de yapılabilir)
-- NOTIFY pgrst, 'reload schema';

-- 5. Eğer hala "could not find" hatası alınıyorsa, Supabase Dashboard'dan:
--    - Settings > API > Rebuild API Schema butonuna tıklayın
--    - Veya Edge Function'ı yeniden deploy edin: npx supabase functions deploy trpc

-- 6. Notifications tablosunun yapısını kontrol et
DO $$
BEGIN
  -- Body kolonu var mı kontrol et
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'body'
  ) THEN
    RAISE EXCEPTION 'Body kolonu hala bulunamadı! Lütfen manuel olarak ekleyin: ALTER TABLE notifications ADD COLUMN body TEXT NOT NULL DEFAULT '''';';
  END IF;
  
  -- Body kolonu NULL olabilir mi kontrol et
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'body' 
    AND is_nullable = 'YES'
  ) THEN
    RAISE WARNING 'Body kolonu NULL olabilir! Lütfen düzeltin: UPDATE notifications SET body = '''' WHERE body IS NULL; ALTER TABLE notifications ALTER COLUMN body SET NOT NULL;';
  END IF;
END $$;

