-- 1. user_profiles tablosuna show_in_directory kolonu ekleme
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS show_in_directory BOOLEAN DEFAULT true;

-- 2. Index oluşturma (performans için)
CREATE INDEX IF NOT EXISTS idx_user_profiles_show_in_directory 
ON user_profiles(show_in_directory);

CREATE INDEX IF NOT EXISTS idx_user_profiles_full_name 
ON user_profiles(full_name);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email 
ON user_profiles(email);

-- 3. Username için index (arama için)
CREATE INDEX IF NOT EXISTS idx_user_profiles_full_name_trgm 
ON user_profiles USING gin(full_name gin_trgm_ops);

-- 4. RLS Politikalarını güncelleme

-- Kullanıcılar kendi profillerini görebilir
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

-- Kullanıcılar show_in_directory=true olanları görebilir
DROP POLICY IF EXISTS "Users can view public profiles" ON user_profiles;
CREATE POLICY "Users can view public profiles"
ON user_profiles FOR SELECT
USING (show_in_directory = true);

-- Kullanıcılar kendi profillerini güncelleyebilir
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = id);

-- 5. Trigger için fonksiyon (updated_at otomatik güncelleme)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger oluşturma (eğer yoksa)
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 7. Mevcut kayıtları güncelleme (varsayılan olarak true)
UPDATE user_profiles SET show_in_directory = true WHERE show_in_directory IS NULL;

COMMENT ON COLUMN user_profiles.show_in_directory IS 'Kullanıcının listede görünüp görünmeyeceğini belirler';
