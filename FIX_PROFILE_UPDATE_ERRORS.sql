-- ========================================
-- FIX PROFILE UPDATE ERRORS
-- Bu dosya profil güncelleme hatalarını düzeltir
-- ========================================

-- 1. show_in_directory kolonunu ekle (yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'show_in_directory'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN show_in_directory BOOLEAN DEFAULT true;
        
        COMMENT ON COLUMN user_profiles.show_in_directory 
        IS 'Kullanıcı listesinde görünür olsun mu?';
        
        RAISE NOTICE '✅ show_in_directory kolonu eklendi';
    ELSE
        RAISE NOTICE '⚠️  show_in_directory kolonu zaten mevcut';
    END IF;
END $$;

-- 2. Email kolonunun varsa UNIQUE olduğundan emin ol
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_profiles_email_key'
    ) THEN
        ALTER TABLE user_profiles 
        ADD CONSTRAINT user_profiles_email_key UNIQUE (email);
        
        RAISE NOTICE '✅ Email UNIQUE constraint eklendi';
    ELSE
        RAISE NOTICE '⚠️  Email UNIQUE constraint zaten mevcut';
    END IF;
END $$;

-- 3. Updated_at trigger'ının doğru çalıştığından emin ol
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS politikalarının doğru olduğundan emin ol
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Herkese okuma izni
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON user_profiles;
CREATE POLICY "Profiles viewable by everyone" 
    ON user_profiles FOR SELECT 
    USING (true);

-- Kullanıcılar sadece kendi profillerini güncelleyebilir
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" 
    ON user_profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Kullanıcılar kendi profil kayıtlarını ekleyebilir
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" 
    ON user_profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- 5. Mevcut tüm kullanıcılara varsayılan değerler ata
UPDATE user_profiles 
SET 
    show_in_directory = COALESCE(show_in_directory, true),
    social_media = COALESCE(social_media, '{}'::jsonb),
    privacy_settings = COALESCE(privacy_settings, '{
        "show_age": true,
        "show_gender": true,
        "show_phone": true,
        "show_email": true,
        "show_address": true,
        "show_height": true,
        "show_weight": true,
        "show_social_media": true
    }'::jsonb)
WHERE 
    show_in_directory IS NULL 
    OR social_media IS NULL 
    OR privacy_settings IS NULL;

-- 6. İndeksleri oluştur
CREATE INDEX IF NOT EXISTS idx_user_profiles_show_in_directory 
    ON user_profiles(show_in_directory) 
    WHERE show_in_directory = true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_district 
    ON user_profiles(district);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email 
    ON user_profiles(email);

-- 7. Test sorgusu - bir kullanıcının profilini görüntüle
DO $$
DECLARE
    profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM user_profiles;
    RAISE NOTICE '📊 Toplam profil sayısı: %', profile_count;
END $$;

-- ========================================
-- ✅ Tüm düzeltmeler tamamlandı!
-- ========================================

-- Test için profil güncelleme örneği (yorumlu):
/*
-- Bir kullanıcının profilini güncelleme testi:
UPDATE user_profiles
SET 
    full_name = 'Test User',
    bio = 'Test bio',
    district = 'Ortahisar',
    show_in_directory = true,
    updated_at = NOW()
WHERE id = 'USER_ID_BURAYA';

-- Profil görüntüleme testi:
SELECT 
    id, 
    email, 
    full_name, 
    district, 
    show_in_directory,
    social_media,
    privacy_settings,
    created_at,
    updated_at
FROM user_profiles
WHERE id = 'USER_ID_BURAYA';
*/
