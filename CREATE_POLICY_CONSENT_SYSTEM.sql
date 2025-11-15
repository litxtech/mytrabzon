-- MyTrabzon Politika Onay Sistemi
-- Kullanıcıların politikaları onaylamasını takip eder

-- ============================================
-- 1. KULLANICI POLİTİKA ONAYLARI TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS user_policy_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  policy_type VARCHAR(50) NOT NULL, -- 'terms', 'privacy', 'community', 'cookie', 'child_safety', 'ai', etc.
  policy_version INTEGER NOT NULL DEFAULT 1, -- Politika versiyonu
  consented BOOLEAN NOT NULL DEFAULT false,
  consent_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Bir kullanıcı aynı politika versiyonunu sadece bir kez onaylayabilir
  UNIQUE(user_id, policy_id, policy_version)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_user_policy_consents_user_id ON user_policy_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_policy_consents_policy_type ON user_policy_consents(policy_type);
CREATE INDEX IF NOT EXISTS idx_user_policy_consents_consented ON user_policy_consents(consented);

-- RLS Politikaları
ALTER TABLE user_policy_consents ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi onaylarını görebilir
CREATE POLICY "Users can view their own consents"
  ON user_policy_consents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Kullanıcılar kendi onaylarını ekleyebilir/güncelleyebilir
CREATE POLICY "Users can insert their own consents"
  ON user_policy_consents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consents"
  ON user_policy_consents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin'ler tüm onayları görebilir
CREATE POLICY "Admins can view all consents"
  ON user_policy_consents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================
-- 2. ÖZELLİK BAZLI ONAYLAR TABLOSU
-- ============================================
-- Eşleşme, video arama, AI kullanımı gibi özellikler için özel onaylar
CREATE TABLE IF NOT EXISTS user_feature_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_type VARCHAR(50) NOT NULL, -- 'matching', 'video_call', 'audio_call', 'ai_chat', 'location_sharing', etc.
  consented BOOLEAN NOT NULL DEFAULT false,
  consent_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  age_verified BOOLEAN NOT NULL DEFAULT false, -- 18+ özellikler için yaş doğrulaması
  kyc_verified BOOLEAN NOT NULL DEFAULT false, -- KYC doğrulaması
  revoked_date TIMESTAMPTZ, -- Onay geri çekilme tarihi
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Bir kullanıcı bir özellik için sadece bir aktif onay kaydı olabilir
  UNIQUE(user_id, feature_type)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_user_feature_consents_user_id ON user_feature_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feature_consents_feature_type ON user_feature_consents(feature_type);
CREATE INDEX IF NOT EXISTS idx_user_feature_consents_consented ON user_feature_consents(consented);

-- RLS Politikaları
ALTER TABLE user_feature_consents ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi özellik onaylarını görebilir
CREATE POLICY "Users can view their own feature consents"
  ON user_feature_consents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Kullanıcılar kendi özellik onaylarını ekleyebilir/güncelleyebilir
CREATE POLICY "Users can insert their own feature consents"
  ON user_feature_consents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feature consents"
  ON user_feature_consents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin'ler tüm özellik onaylarını görebilir
CREATE POLICY "Admins can view all feature consents"
  ON user_feature_consents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================
-- 3. POLİTİKA VERSİYONLARI İÇİN TRİGGER
-- ============================================
-- Politika güncellendiğinde versiyon numarasını artır
CREATE OR REPLACE FUNCTION increment_policy_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Eğer içerik değiştiyse versiyonu artır
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
    -- Versiyon numarası yoksa 1'den başlat, varsa artır
    -- Not: policies tablosunda version kolonu yoksa eklenmeli
    -- Şimdilik updated_at kullanılacak
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. KULLANICI ONAY KONTROL FONKSİYONLARI
-- ============================================
-- Kullanıcının belirli bir politikayı onaylayıp onaylamadığını kontrol eder
CREATE OR REPLACE FUNCTION has_user_consented_to_policy(
  p_user_id UUID,
  p_policy_type VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_consented BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM user_policy_consents 
    WHERE user_id = p_user_id 
      AND policy_type = p_policy_type 
      AND consented = true
    ORDER BY consent_date DESC
    LIMIT 1
  ) INTO v_consented;
  
  RETURN COALESCE(v_consented, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kullanıcının belirli bir özelliği kullanma izni var mı kontrol eder
CREATE OR REPLACE FUNCTION can_user_use_feature(
  p_user_id UUID,
  p_feature_type VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_consented BOOLEAN;
  v_age_verified BOOLEAN;
  v_kyc_verified BOOLEAN;
BEGIN
  SELECT 
    consented,
    age_verified,
    kyc_verified
  INTO 
    v_consented,
    v_age_verified,
    v_kyc_verified
  FROM user_feature_consents
  WHERE user_id = p_user_id 
    AND feature_type = p_feature_type
    AND revoked_date IS NULL
  ORDER BY consent_date DESC
  LIMIT 1;
  
  -- Eğer kayıt yoksa false döndür
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- 18+ özellikler için yaş ve KYC doğrulaması gerekli
  IF p_feature_type IN ('matching', 'video_call', 'audio_call') THEN
    RETURN v_consented AND v_age_verified AND v_kyc_verified;
  END IF;
  
  -- Diğer özellikler için sadece onay yeterli
  RETURN v_consented;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. ZORUNLU POLİTİKALAR İÇİN VIEW
-- ============================================
-- Kullanıcının onaylaması gereken tüm politikaları gösterir
CREATE OR REPLACE VIEW user_required_policies AS
SELECT 
  p.id,
  p.title,
  p.policy_type,
  p.display_order,
  p.is_active,
  p.updated_at as policy_updated_at,
  CASE 
    WHEN upc.consented = true THEN true
    ELSE false
  END as user_consented,
  upc.consent_date,
  upc.policy_version
FROM policies p
LEFT JOIN user_policy_consents upc ON (
  p.id = upc.policy_id 
  AND upc.user_id = auth.uid()
  AND upc.consented = true
)
WHERE p.is_active = true
  AND p.policy_type IN ('terms', 'privacy', 'community', 'cookie', 'child_safety')
ORDER BY p.display_order;

-- ============================================
-- 6. ÖRNEK VERİLER (TEST İÇİN)
-- ============================================
-- Bu bölüm test amaçlıdır, production'da kaldırılabilir

-- ============================================
-- 7. YARDIMCI FONKSİYONLAR
-- ============================================
-- Kullanıcının tüm zorunlu politikaları onaylayıp onaylamadığını kontrol eder
CREATE OR REPLACE FUNCTION has_user_consented_all_required_policies(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_required_count INTEGER;
  v_consented_count INTEGER;
BEGIN
  -- Zorunlu politika sayısı
  SELECT COUNT(*) INTO v_required_count
  FROM policies
  WHERE is_active = true
    AND policy_type IN ('terms', 'privacy', 'community', 'cookie', 'child_safety');
  
  -- Kullanıcının onayladığı zorunlu politika sayısı
  SELECT COUNT(DISTINCT policy_type) INTO v_consented_count
  FROM user_policy_consents
  WHERE user_id = p_user_id
    AND consented = true
    AND policy_type IN ('terms', 'privacy', 'community', 'cookie', 'child_safety');
  
  RETURN v_consented_count >= v_required_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. COMMENTS
-- ============================================
COMMENT ON TABLE user_policy_consents IS 'Kullanıcıların politikaları onaylama kayıtları';
COMMENT ON TABLE user_feature_consents IS 'Kullanıcıların özellik bazlı onayları (eşleşme, video arama, vb.)';
COMMENT ON FUNCTION has_user_consented_to_policy IS 'Kullanıcının belirli bir politikayı onaylayıp onaylamadığını kontrol eder';
COMMENT ON FUNCTION can_user_use_feature IS 'Kullanıcının belirli bir özelliği kullanma izni var mı kontrol eder';
COMMENT ON FUNCTION has_user_consented_all_required_policies IS 'Kullanıcının tüm zorunlu politikaları onaylayıp onaylamadığını kontrol eder';

