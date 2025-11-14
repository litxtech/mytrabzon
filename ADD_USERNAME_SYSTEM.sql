-- ============================================
-- KULLANICI ADI SİSTEMİ EKLEME
-- ============================================
-- Instagram tarzı benzersiz kullanıcı adı sistemi
-- ============================================

-- ============================================
-- 1. USERNAME KOLONUNU EKLE
-- ============================================

-- Username kolonunu ekle (nullable, çünkü mevcut kullanıcılar var)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Username için unique index oluştur (NULL değerler hariç)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique 
  ON profiles(username) 
  WHERE username IS NOT NULL;

-- Username için lowercase index (arama performansı için)
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower 
  ON profiles(LOWER(username)) 
  WHERE username IS NOT NULL;

-- ============================================
-- 2. USERNAME VALIDATION FUNCTION
-- ============================================

-- Username validation function
CREATE OR REPLACE FUNCTION is_valid_username(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Boş kontrolü
  IF p_username IS NULL OR LENGTH(TRIM(p_username)) = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Minimum 3 karakter
  IF LENGTH(p_username) < 3 THEN
    RETURN FALSE;
  END IF;
  
  -- Maksimum 30 karakter (Instagram limiti)
  IF LENGTH(p_username) > 30 THEN
    RETURN FALSE;
  END IF;
  
  -- Sadece harf, rakam, nokta ve alt çizgi
  IF p_username !~ '^[a-zA-Z0-9._]+$' THEN
    RETURN FALSE;
  END IF;
  
  -- Nokta ile başlayamaz veya bitemez
  IF p_username ~ '^\.|\.$' THEN
    RETURN FALSE;
  END IF;
  
  -- Ardışık nokta olamaz
  IF p_username ~ '\.\.' THEN
    RETURN FALSE;
  END IF;
  
  -- Sadece nokta olamaz
  IF p_username = '.' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- ============================================
-- 3. USERNAME AVAILABILITY CHECK FUNCTION
-- ============================================

-- Username müsaitlik kontrolü
CREATE OR REPLACE FUNCTION is_username_available(p_username TEXT, p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_username TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Username'i lowercase'e çevir
  v_username := LOWER(TRIM(p_username));
  
  -- Validation kontrolü
  IF NOT is_valid_username(v_username) THEN
    RETURN FALSE;
  END IF;
  
  -- Mevcut kullanıcı hariç, başka birisi bu username'i kullanıyor mu?
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE LOWER(username) = v_username
    AND (p_user_id IS NULL OR id != p_user_id)
  ) INTO v_exists;
  
  RETURN NOT v_exists;
END;
$$;

-- ============================================
-- 4. USERNAME SUGGESTION FUNCTION
-- ============================================

-- Username önerisi oluştur
CREATE OR REPLACE FUNCTION suggest_username(p_base_username TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_base TEXT;
  v_suggestions TEXT[];
  v_counter INTEGER := 1;
  v_suggestion TEXT;
BEGIN
  -- Base username'i temizle ve lowercase yap
  v_base := LOWER(REGEXP_REPLACE(TRIM(p_base_username), '[^a-zA-Z0-9._]', '', 'g'));
  
  -- Base username geçerli değilse, varsayılan kullan
  IF LENGTH(v_base) < 3 THEN
    v_base := 'user';
  END IF;
  
  -- İlk 30 karakteri al
  IF LENGTH(v_base) > 30 THEN
    v_base := SUBSTRING(v_base, 1, 30);
  END IF;
  
  -- Nokta ile bitiyorsa kaldır
  IF v_base ~ '\.$' THEN
    v_base := RTRIM(v_base, '.');
  END IF;
  
  -- Öneriler oluştur
  WHILE array_length(v_suggestions, 1) IS NULL OR array_length(v_suggestions, 1) < 5 LOOP
    -- İlk öneri: base username
    IF v_counter = 1 THEN
      v_suggestion := v_base;
    ELSE
      -- Sonraki öneriler: base + sayı
      v_suggestion := v_base || v_counter::TEXT;
    END IF;
    
    -- 30 karakter limiti
    IF LENGTH(v_suggestion) > 30 THEN
      v_suggestion := SUBSTRING(v_suggestion, 1, 30 - LENGTH(v_counter::TEXT)) || v_counter::TEXT;
    END IF;
    
    -- Müsait mi kontrol et
    IF is_username_available(v_suggestion) THEN
      v_suggestions := array_append(v_suggestions, v_suggestion);
    END IF;
    
    v_counter := v_counter + 1;
    
    -- Sonsuz döngü önleme
    IF v_counter > 1000 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_suggestions;
END;
$$;

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION is_valid_username(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION is_username_available(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_username_available(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION suggest_username(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION suggest_username(TEXT) TO anon;

-- ============================================
-- 6. TRIGGER: USERNAME LOWERCASE
-- ============================================

-- Username'i otomatik lowercase yap
CREATE OR REPLACE FUNCTION lowercase_username()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.username IS NOT NULL THEN
    NEW.username := LOWER(TRIM(NEW.username));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_lowercase_username ON profiles;
CREATE TRIGGER trigger_lowercase_username
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.username IS NOT NULL)
  EXECUTE FUNCTION lowercase_username();

-- ============================================
-- 7. MEVCUT KULLANICILAR İÇİN USERNAME ATAMA
-- ============================================

-- Mevcut kullanıcılar için otomatik username oluştur (opsiyonel)
-- Bu script'i çalıştırmak isterseniz, aşağıdaki yorumu kaldırın
/*
DO $$
DECLARE
  v_user RECORD;
  v_username TEXT;
  v_counter INTEGER;
BEGIN
  FOR v_user IN 
    SELECT id, email, full_name 
    FROM profiles 
    WHERE username IS NULL
  LOOP
    -- Email'den username oluştur
    v_username := LOWER(SPLIT_PART(v_user.email, '@', 1));
    v_username := REGEXP_REPLACE(v_username, '[^a-zA-Z0-9._]', '', 'g');
    
    -- Geçerli değilse, full_name'den oluştur
    IF NOT is_valid_username(v_username) THEN
      v_username := LOWER(REGEXP_REPLACE(v_user.full_name, '[^a-zA-Z0-9._]', '', 'g'));
    END IF;
    
    -- Hala geçerli değilse, varsayılan kullan
    IF NOT is_valid_username(v_username) THEN
      v_username := 'user';
    END IF;
    
    -- Müsait değilse, sayı ekle
    v_counter := 1;
    WHILE NOT is_username_available(v_username, v_user.id) LOOP
      v_username := v_username || v_counter::TEXT;
      v_counter := v_counter + 1;
      
      IF v_counter > 1000 THEN
        v_username := 'user' || v_user.id::TEXT;
        EXIT;
      END IF;
    END LOOP;
    
    -- Username'i güncelle
    UPDATE profiles 
    SET username = v_username 
    WHERE id = v_user.id;
    
    RAISE NOTICE 'Username assigned: % -> %', v_user.email, v_username;
  END LOOP;
END $$;
*/

-- ============================================
-- 8. VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Username sistemi eklendi';
  RAISE NOTICE '✅ Username validation function oluşturuldu';
  RAISE NOTICE '✅ Username availability check function oluşturuldu';
  RAISE NOTICE '✅ Username suggestion function oluşturuldu';
  RAISE NOTICE '✅ Username lowercase trigger oluşturuldu';
END $$;

-- ============================================
-- SONUÇ
-- ============================================
-- Username sistemi hazır
-- Kullanıcılar benzersiz username oluşturabilir
-- Instagram tarzı validation kuralları uygulanır
-- ============================================

