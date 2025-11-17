-- Gizli Kullanıcılar Sistemi
-- Profilde "gizli" butonu açık olduğu sürece (profileVisible = false) tüm kullanıcılar otomatik olarak bu tabloya eklenecek

-- 1. Hidden Users Tablosu
CREATE TABLE IF NOT EXISTS hidden_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hidden_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Index'ler
CREATE INDEX IF NOT EXISTS idx_hidden_users_user_id ON hidden_users(user_id);
CREATE INDEX IF NOT EXISTS idx_hidden_users_hidden_at ON hidden_users(hidden_at);

-- 3. RLS Policies
ALTER TABLE hidden_users ENABLE ROW LEVEL SECURITY;

-- Admin'ler tüm gizli kullanıcıları görebilir
DROP POLICY IF EXISTS "admins_view_all_hidden_users" ON hidden_users;
CREATE POLICY "admins_view_all_hidden_users" ON hidden_users
  FOR SELECT USING (is_admin(auth.uid()));

-- Kullanıcılar kendi gizli durumlarını görebilir
DROP POLICY IF EXISTS "users_view_own_hidden_status" ON hidden_users;
CREATE POLICY "users_view_own_hidden_status" ON hidden_users
  FOR SELECT USING (user_id = auth.uid());

-- 4. Trigger: profileVisible false olduğunda otomatik ekle
CREATE OR REPLACE FUNCTION sync_hidden_users()
RETURNS TRIGGER AS $$
DECLARE
  profile_visible BOOLEAN;
BEGIN
  -- privacy_settings'den profileVisible değerini al
  IF NEW.privacy_settings IS NOT NULL THEN
    profile_visible := (NEW.privacy_settings->'privacy'->>'profileVisible')::boolean;
  ELSE
    profile_visible := true; -- Default olarak görünür
  END IF;

  -- profileVisible false ise hidden_users'a ekle
  IF profile_visible = false THEN
    INSERT INTO hidden_users (user_id, hidden_at)
    VALUES (NEW.id, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET hidden_at = NOW();
  ELSE
    -- profileVisible true ise hidden_users'dan sil
    DELETE FROM hidden_users WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı profiles tablosuna ekle
DROP TRIGGER IF EXISTS sync_hidden_users_trigger ON profiles;
CREATE TRIGGER sync_hidden_users_trigger
  AFTER INSERT OR UPDATE OF privacy_settings ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_hidden_users();

-- 5. Mevcut gizli kullanıcıları ekle (retroactive)
INSERT INTO hidden_users (user_id, hidden_at)
SELECT 
  id,
  updated_at
FROM profiles
WHERE privacy_settings IS NOT NULL
  AND (privacy_settings->'privacy'->>'profileVisible')::boolean = false
ON CONFLICT (user_id) DO NOTHING;

-- 6. Grant permissions
GRANT SELECT ON hidden_users TO authenticated;
GRANT INSERT, UPDATE, DELETE ON hidden_users TO authenticated;

