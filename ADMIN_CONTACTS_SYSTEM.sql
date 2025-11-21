-- Admin Telefon ve Email Yönetim Sistemi
-- ===========================================

-- Admin mesajları tablosu
CREATE TABLE IF NOT EXISTS admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_phone TEXT,
  recipient_email TEXT,
  message TEXT NOT NULL,
  subject TEXT,
  message_type TEXT NOT NULL CHECK (message_type IN ('sms', 'email')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_admin_messages_admin_id ON admin_messages(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_recipient_phone ON admin_messages(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_admin_messages_recipient_email ON admin_messages(recipient_email);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created_at ON admin_messages(created_at DESC);

-- RLS Policies
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- Admin'ler kendi mesajlarını görebilir
CREATE POLICY "Admins can view their own messages"
  ON admin_messages
  FOR SELECT
  USING (
    auth.uid() = admin_id OR
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Admin'ler mesaj oluşturabilir
CREATE POLICY "Admins can create messages"
  ON admin_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = admin_id AND (
      auth.uid() = '98542f02-11f8-4ccd-b38d-4dd42066daa7' OR
      EXISTS (
        SELECT 1 FROM admin_users
        WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
      )
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_admin_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_messages_updated_at
  BEFORE UPDATE ON admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_messages_updated_at();

-- Kullanıcı profil değişikliklerini takip etmek için tablo
CREATE TABLE IF NOT EXISTS profile_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_profile_change_logs_user_id ON profile_change_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_change_logs_field_name ON profile_change_logs(field_name);
CREATE INDEX IF NOT EXISTS idx_profile_change_logs_changed_at ON profile_change_logs(changed_at DESC);

-- RLS Policies
ALTER TABLE profile_change_logs ENABLE ROW LEVEL SECURITY;

-- Admin'ler tüm değişiklikleri görebilir
CREATE POLICY "Admins can view all profile changes"
  ON profile_change_logs
  FOR SELECT
  USING (
    auth.uid() = '98542f02-11f8-4ccd-b38d-4dd42066daa7' OR
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Kullanıcılar kendi değişikliklerini görebilir
CREATE POLICY "Users can view their own changes"
  ON profile_change_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Profil değişikliklerini takip eden trigger fonksiyonu
CREATE OR REPLACE FUNCTION log_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Email değişikliği
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    INSERT INTO profile_change_logs (user_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'email', OLD.email, NEW.email);
  END IF;

  -- Telefon değişikliği
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    INSERT INTO profile_change_logs (user_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'phone', OLD.phone, NEW.phone);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS profile_changes_trigger ON profiles;
CREATE TRIGGER profile_changes_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone IS DISTINCT FROM NEW.phone
  )
  EXECUTE FUNCTION log_profile_changes();

-- Admin paneline son değişiklikleri getiren view
CREATE OR REPLACE VIEW admin_recent_profile_changes AS
SELECT 
  pcl.id,
  pcl.user_id,
  p.full_name,
  p.email,
  p.phone,
  pcl.field_name,
  pcl.old_value,
  pcl.new_value,
  pcl.changed_at
FROM profile_change_logs pcl
JOIN profiles p ON p.id = pcl.user_id
WHERE pcl.field_name IN ('email', 'phone')
ORDER BY pcl.changed_at DESC
LIMIT 100;

-- View için RLS
ALTER VIEW admin_recent_profile_changes SET (security_invoker = true);

