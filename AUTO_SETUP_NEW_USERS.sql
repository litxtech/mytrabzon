-- ============================================
-- YENİ KULLANICILAR İÇİN OTOMATIK KURULUM
-- ============================================
-- Bu script, yeni kayıt olan kullanıcıların otomatik olarak
-- tüm özelliklere entegre olmasını sağlar
-- ============================================

-- ============================================
-- 1. PROFİL OLUŞTURMA TRIGGER'INI GÜNCELLE
-- ============================================

-- Mevcut trigger'ı kaldır
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Profil oluşturma fonksiyonunu güncelle
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  user_district TEXT;
  user_full_name TEXT;
  user_email TEXT;
  default_username TEXT;
BEGIN
  -- Metadata'dan bilgileri al
  user_district := COALESCE(NEW.raw_user_meta_data->>'district', 'Ortahisar');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kullanıcı');
  user_email := COALESCE(NEW.email, '');
  
  -- Email'den username oluştur (eğer yoksa)
  IF user_email IS NOT NULL AND user_email != '' THEN
    default_username := LOWER(SPLIT_PART(user_email, '@', 1));
    -- Özel karakterleri temizle
    default_username := REGEXP_REPLACE(default_username, '[^a-z0-9_]', '', 'g');
    -- 3-30 karakter arası olmalı
    IF LENGTH(default_username) < 3 THEN
      default_username := 'user_' || SUBSTR(NEW.id::text, 1, 8);
    ELSIF LENGTH(default_username) > 30 THEN
      default_username := SUBSTR(default_username, 1, 30);
    END IF;
  ELSE
    default_username := 'user_' || SUBSTR(NEW.id::text, 1, 8);
  END IF;
  
  -- Username benzersizliğini kontrol et ve gerekirse numara ekle
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = default_username) LOOP
    default_username := default_username || '_' || FLOOR(RANDOM() * 1000)::TEXT;
  END LOOP;
  
  -- Profile oluştur (TÜM YENİ ALANLAR İLE)
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    district,
    username,
    show_in_directory,
    privacy_settings,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    user_email, 
    user_full_name,
    user_district,
    default_username,
    true, -- Yeni kullanıcılar varsayılan olarak dizinde görünsün
    jsonb_build_object(
      'privacy', jsonb_build_object(
        'showOnline', true,
        'allowTagging', true,
        'allowMessages', true,
        'profileVisible', true
      ),
      'show_age', false,
      'show_email', false,
      'show_phone', false,
      'show_gender', false,
      'show_height', false,
      'show_weight', false,
      'show_address', false,
      'notifications', jsonb_build_object(
        'sms', false,
        'push', true,
        'email', true,
        'likes', true,
        'follows', true,
        'comments', true,
        'messages', true
      ),
      'show_social_media', false
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Hata durumunda logla ama trigger'ı durdurma
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı yeniden oluştur
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION create_user_profile();

-- ============================================
-- 2. PUBLIC_ID OTOMATIK OLUŞTURMA
-- ============================================

-- Public ID oluşturma fonksiyonu (eğer yoksa)
CREATE OR REPLACE FUNCTION generate_public_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := 'user_' || SUBSTR(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı oluştur (eğer yoksa)
DROP TRIGGER IF EXISTS set_public_id ON profiles;
CREATE TRIGGER set_public_id
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.public_id IS NULL)
  EXECUTE FUNCTION generate_public_id();

-- ============================================
-- 3. USERNAME KOLONUNU KONTROL ET
-- ============================================

-- Username kolonu yoksa ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username TEXT;
    RAISE NOTICE 'Username kolonu eklendi';
  END IF;
END $$;

-- ============================================
-- 4. SHOW_IN_DIRECTORY KOLONUNU KONTROL ET
-- ============================================

-- show_in_directory kolonu yoksa ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'show_in_directory'
  ) THEN
    ALTER TABLE profiles ADD COLUMN show_in_directory BOOLEAN DEFAULT true;
    RAISE NOTICE 'show_in_directory kolonu eklendi';
  END IF;
END $$;

-- ============================================
-- 5. PRIVACY_SETTINGS KOLONUNU KONTROL ET
-- ============================================

-- privacy_settings kolonu yoksa ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'privacy_settings'
  ) THEN
    ALTER TABLE profiles ADD COLUMN privacy_settings JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'privacy_settings kolonu eklendi';
  END IF;
END $$;

-- ============================================
-- 6. MEVCUT KULLANICILAR İÇİN EKSİK ALANLARI DOLDUR
-- ============================================

-- Username olmayan kullanıcılar için otomatik username oluştur
UPDATE profiles
SET username = 'user_' || SUBSTR(id::text, 1, 8) || '_' || FLOOR(RANDOM() * 10000)::TEXT
WHERE username IS NULL;

-- show_in_directory null olanları true yap
UPDATE profiles
SET show_in_directory = true
WHERE show_in_directory IS NULL;

-- privacy_settings null olanları varsayılan değerlerle doldur
UPDATE profiles
SET privacy_settings = jsonb_build_object(
  'privacy', jsonb_build_object(
    'showOnline', true,
    'allowTagging', true,
    'allowMessages', true,
    'profileVisible', true
  ),
  'show_age', false,
  'show_email', false,
  'show_phone', false,
  'show_gender', false,
  'show_height', false,
  'show_weight', false,
  'show_address', false,
  'notifications', jsonb_build_object(
    'sms', false,
    'push', true,
    'email', true,
    'likes', true,
    'follows', true,
    'comments', true,
    'messages', true
  ),
  'show_social_media', false
)
WHERE privacy_settings IS NULL OR privacy_settings = '{}'::jsonb;

-- ============================================
-- 7. VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Yeni kullanıcılar için otomatik kurulum tamamlandı';
  RAISE NOTICE '✅ Profil oluşturma trigger''ı güncellendi';
  RAISE NOTICE '✅ Username otomatik oluşturuluyor';
  RAISE NOTICE '✅ Privacy settings otomatik ayarlanıyor';
  RAISE NOTICE '✅ show_in_directory otomatik true olarak ayarlanıyor';
END $$;

-- ============================================
-- SONUÇ
-- ============================================
-- Artık yeni kayıt olan kullanıcılar:
-- ✅ Otomatik profil oluşturulur
-- ✅ Otomatik username atanır
-- ✅ Privacy settings varsayılan değerlerle ayarlanır
-- ✅ show_in_directory true olarak ayarlanır
-- ✅ Tüm özellikler (chat, grup, mesaj) otomatik kullanılabilir
-- ============================================

