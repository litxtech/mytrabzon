-- profile_change_logs tablosunu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS profile_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_viewed_at TIMESTAMPTZ
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_profile_change_logs_user_id ON profile_change_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_change_logs_field_name ON profile_change_logs(field_name);
CREATE INDEX IF NOT EXISTS idx_profile_change_logs_changed_at ON profile_change_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_change_logs_admin_viewed_at 
ON profile_change_logs(admin_viewed_at) 
WHERE admin_viewed_at IS NULL;

-- RLS Policies
ALTER TABLE profile_change_logs ENABLE ROW LEVEL SECURITY;

-- Admin'ler tüm değişiklikleri görebilir
DROP POLICY IF EXISTS "Admins can view all profile changes" ON profile_change_logs;
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
DROP POLICY IF EXISTS "Users can view their own changes" ON profile_change_logs;
CREATE POLICY "Users can view their own changes"
  ON profile_change_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admin'ler admin_viewed_at'i güncelleyebilir
DROP POLICY IF EXISTS "Admins can update admin_viewed_at" ON profile_change_logs;
CREATE POLICY "Admins can update admin_viewed_at"
  ON profile_change_logs
  FOR UPDATE
  USING (
    auth.uid() = '98542f02-11f8-4ccd-b38d-4dd42066daa7' OR
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  )
  WITH CHECK (
    auth.uid() = '98542f02-11f8-4ccd-b38d-4dd42066daa7' OR
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

