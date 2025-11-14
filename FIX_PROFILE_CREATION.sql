-- ============================================
-- PROFİL OLUŞTURMA HATASINI DÜZELT
-- ============================================
-- Bu SQL'i Supabase SQL Editor'de çalıştırın
-- ============================================

-- 1. RLS Policy'lerini kontrol et ve düzelt
-- Profiles tablosu için INSERT policy'si

-- Eski policy'leri sil
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON profiles;

-- Yeni INSERT policy oluştur
-- Kullanıcılar kendi profillerini oluşturabilir (auth.uid() = id)
CREATE POLICY "Users can insert own profile" 
  ON profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 2. UPDATE policy'sini kontrol et
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile" 
  ON profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. SELECT policy'sini kontrol et (herkes görebilir)
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON profiles;

CREATE POLICY "Profiles viewable by everyone" 
  ON profiles 
  FOR SELECT 
  USING (true);

-- 4. Trigger'ı kontrol et ve düzelt
-- create_user_profile fonksiyonunu güncelle
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  user_district TEXT;
  user_full_name TEXT;
  user_email TEXT;
BEGIN
  -- Metadata'dan bilgileri al
  user_district := COALESCE(NEW.raw_user_meta_data->>'district', 'Ortahisar');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kullanıcı');
  user_email := COALESCE(NEW.email, '');
  
  -- Profile oluştur (ON CONFLICT ile güvenli)
  -- Email kolonu varsa email ile, yoksa email olmadan
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'email'
  ) THEN
    INSERT INTO public.profiles (
      id, 
      email, 
      full_name, 
      district,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id, 
      user_email, 
      user_full_name,
      user_district,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO public.profiles (
      id, 
      full_name, 
      district,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id, 
      user_full_name,
      user_district,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Hata durumunda logla ama trigger'ı durdurma
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı yeniden oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION create_user_profile();

-- 5. Email kolonunu kontrol et ve ekle (yoksa)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
    RAISE NOTICE 'Email kolonu eklendi';
  END IF;
END $$;

-- 6. Mevcut kullanıcılar için eksik profilleri oluştur
-- auth.users'da olup profiles'da olmayan kullanıcılar için profil oluştur
-- Önce email kolonunu kontrol et
DO $$
BEGIN
  -- Email kolonu varsa kullan
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'email'
  ) THEN
    INSERT INTO public.profiles (id, email, full_name, district, created_at, updated_at)
    SELECT 
      u.id,
      COALESCE(u.email, ''),
      COALESCE(u.raw_user_meta_data->>'full_name', 'Kullanıcı'),
      COALESCE(u.raw_user_meta_data->>'district', 'Ortahisar'),
      COALESCE(u.created_at, NOW()),
      NOW()
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = u.id
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    -- Email kolonu yoksa, email olmadan oluştur
    INSERT INTO public.profiles (id, full_name, district, created_at, updated_at)
    SELECT 
      u.id,
      COALESCE(u.raw_user_meta_data->>'full_name', 'Kullanıcı'),
      COALESCE(u.raw_user_meta_data->>'district', 'Ortahisar'),
      COALESCE(u.created_at, NOW()),
      NOW()
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = u.id
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 7. Email kolonunu kontrol et (NULL olabilmeli veya default değer olmalı)
DO $$
BEGIN
  -- Email kolonu varsa kontrol et
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'email'
  ) THEN
    -- Eğer email NOT NULL ise ve default değer yoksa, default ekle
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
        AND column_name = 'email'
        AND is_nullable = 'NO'
        AND column_default IS NULL
    ) THEN
      ALTER TABLE profiles 
        ALTER COLUMN email SET DEFAULT '';
      
      RAISE NOTICE 'Email kolonuna default değer eklendi';
    END IF;
    
    -- Email kolonunu NULL yapılabilir hale getir (eğer NOT NULL ise)
    BEGIN
      ALTER TABLE profiles 
        ALTER COLUMN email DROP NOT NULL;
      RAISE NOTICE 'Email kolonu NULL yapılabilir hale getirildi';
    EXCEPTION
      WHEN OTHERS THEN
        -- Zaten NULL yapılabilir veya başka bir sorun var
        NULL;
    END;
  END IF;
END $$;

-- 7. Test sorgusu
SELECT 
  'RLS Policies' as check_type,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'profiles';

SELECT 
  'Profiles without users' as check_type,
  COUNT(*) as count
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

SELECT 
  'Users without profiles' as check_type,
  COUNT(*) as count
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

-- ============================================
-- NOT: Bu SQL çalıştırıldıktan sonra
-- Yeni kullanıcı kayıtlarında otomatik profil oluşturulacak
-- Mevcut kullanıcılar için eksik profiller oluşturulacak
-- ============================================

