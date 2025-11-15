-- ============================================
-- MyTrabzon - Destekçi (Bağış) Sistemi
-- ============================================
-- Google Play + App Store uyumlu bağış sistemi
-- Ticari satış değil, gönüllü destek modeli

-- Destek paketleri tablosu
CREATE TABLE IF NOT EXISTS supporter_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'supporter_basic', 'supporter_plus', 'supporter_premium'
  display_name TEXT NOT NULL, -- 'Temel Destek', 'Plus Destek', 'Premium Destek'
  description TEXT,
  amount INTEGER NOT NULL, -- Bağış miktarı (kuruş cinsinden)
  badge_duration_days INTEGER, -- Etiket süresi (gün), NULL = kalıcı
  features JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Destek kayıtları tablosu
CREATE TABLE IF NOT EXISTS supporter_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES supporter_packages(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Kuruş cinsinden
  stripe_payment_intent_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  badge_expires_at TIMESTAMPTZ, -- Etiket bitiş tarihi (NULL = kalıcı)
  is_anonymous BOOLEAN DEFAULT false, -- İsimsiz bağış
  message TEXT, -- Bağış mesajı
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles tablosuna destekçi etiketi ekle
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS supporter_badge BOOLEAN DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS supporter_badge_visible BOOLEAN DEFAULT true; -- Etiketi göster/gizle

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS supporter_badge_expires_at TIMESTAMPTZ; -- Etiket bitiş tarihi

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_supporter_donations_user_id ON supporter_donations(user_id);
CREATE INDEX IF NOT EXISTS idx_supporter_donations_status ON supporter_donations(status);
CREATE INDEX IF NOT EXISTS idx_supporter_donations_package_id ON supporter_donations(package_id);
CREATE INDEX IF NOT EXISTS idx_profiles_supporter_badge ON profiles(supporter_badge) WHERE supporter_badge = true;

-- RLS Policies
ALTER TABLE supporter_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_donations ENABLE ROW LEVEL SECURITY;

-- Herkes destek paketlerini görebilir
CREATE POLICY "Anyone can view supporter packages"
ON supporter_packages
FOR SELECT
USING (is_active = true);

-- Kullanıcılar sadece kendi bağışlarını görebilir
CREATE POLICY "Users can view their own donations"
ON supporter_donations
FOR SELECT
USING (auth.uid() = user_id);

-- Kullanıcılar kendi bağışlarını oluşturabilir
CREATE POLICY "Users can create their own donations"
ON supporter_donations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- DEFAULT DESTEK PAKETLERİ
-- ============================================

-- 1. TEMEL DESTEK (89 TRY)
INSERT INTO supporter_packages (name, display_name, description, amount, badge_duration_days, features, sort_order)
VALUES (
  'supporter_basic',
  'Temel Destek',
  'MyTrabzon topluluğuna destek ol',
  8900, -- 89.00 TRY
  30, -- 30 gün etiket
  jsonb_build_object(
    'badge', true,
    'badge_duration_days', 30,
    'thank_you_message', true
  ),
  1
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  amount = EXCLUDED.amount,
  badge_duration_days = EXCLUDED.badge_duration_days,
  features = EXCLUDED.features;

-- 2. PLUS DESTEK (139 TRY)
INSERT INTO supporter_packages (name, display_name, description, amount, badge_duration_days, features, sort_order)
VALUES (
  'supporter_plus',
  'Plus Destek',
  'MyTrabzon topluluğuna daha fazla destek ol',
  13900, -- 139.00 TRY
  90, -- 90 gün etiket
  jsonb_build_object(
    'badge', true,
    'badge_duration_days', 90,
    'thank_you_message', true,
    'special_recognition', true
  ),
  2
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  amount = EXCLUDED.amount,
  badge_duration_days = EXCLUDED.badge_duration_days,
  features = EXCLUDED.features;

-- 3. PREMIUM DESTEK (339 TRY)
INSERT INTO supporter_packages (name, display_name, description, amount, badge_duration_days, features, sort_order)
VALUES (
  'supporter_premium',
  'Premium Destek',
  'MyTrabzon topluluğuna maksimum destek ol',
  33900, -- 339.00 TRY
  NULL, -- Kalıcı etiket
  jsonb_build_object(
    'badge', true,
    'badge_duration_days', NULL,
    'thank_you_message', true,
    'special_recognition', true,
    'permanent_badge', true
  ),
  3
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  amount = EXCLUDED.amount,
  badge_duration_days = EXCLUDED.badge_duration_days,
  features = EXCLUDED.features;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Bağış sonrası destekçi etiketi ekle
CREATE OR REPLACE FUNCTION add_supporter_badge(p_user_id UUID, p_package_id UUID)
RETURNS VOID AS $$
DECLARE
  v_badge_duration_days INTEGER;
  v_badge_expires_at TIMESTAMPTZ;
BEGIN
  -- Paket bilgilerini al
  SELECT badge_duration_days INTO v_badge_duration_days
  FROM supporter_packages
  WHERE id = p_package_id;
  
  -- Etiket bitiş tarihini hesapla
  IF v_badge_duration_days IS NULL THEN
    -- Kalıcı etiket
    v_badge_expires_at := NULL;
  ELSE
    -- Süreli etiket
    v_badge_expires_at := NOW() + (v_badge_duration_days || ' days')::INTERVAL;
  END IF;
  
  -- Profil'e destekçi etiketi ekle
  UPDATE profiles
  SET 
    supporter_badge = true,
    supporter_badge_visible = true,
    supporter_badge_expires_at = v_badge_expires_at
  WHERE id = p_user_id;
  
  -- Eğer daha uzun süreli bir etiket varsa, onu koru
  UPDATE profiles
  SET supporter_badge_expires_at = GREATEST(
    supporter_badge_expires_at,
    v_badge_expires_at
  )
  WHERE id = p_user_id
    AND supporter_badge = true
    AND supporter_badge_expires_at IS NOT NULL
    AND v_badge_expires_at IS NOT NULL
    AND supporter_badge_expires_at > v_badge_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Süresi dolmuş etiketleri temizle
CREATE OR REPLACE FUNCTION cleanup_expired_supporter_badges()
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET 
    supporter_badge = false,
    supporter_badge_expires_at = NULL
  WHERE supporter_badge = true
    AND supporter_badge_expires_at IS NOT NULL
    AND supporter_badge_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kullanıcının aktif destekçi etiketi var mı kontrol et
CREATE OR REPLACE FUNCTION has_active_supporter_badge(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = p_user_id
      AND supporter_badge = true
      AND supporter_badge_visible = true
      AND (supporter_badge_expires_at IS NULL OR supporter_badge_expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at fonksiyonu (eğer yoksa oluştur)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
DROP TRIGGER IF EXISTS supporter_packages_updated_at ON supporter_packages;
CREATE TRIGGER supporter_packages_updated_at
  BEFORE UPDATE ON supporter_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS supporter_donations_updated_at ON supporter_donations;
CREATE TRIGGER supporter_donations_updated_at
  BEFORE UPDATE ON supporter_donations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Bağış tamamlandığında otomatik etiket ekle
CREATE OR REPLACE FUNCTION on_donation_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Bağış tamamlandığında destekçi etiketi ekle
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM add_supporter_badge(NEW.user_id, NEW.package_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_donation_completed ON supporter_donations;
CREATE TRIGGER trigger_on_donation_completed
  AFTER UPDATE OF status ON supporter_donations
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION on_donation_completed();

-- Günlük süresi dolmuş etiketleri temizle (cron job için)
-- Bu fonksiyonu pg_cron ile günlük çalıştırabilirsiniz
-- SELECT cron.schedule('cleanup-expired-badges', '0 2 * * *', 'SELECT cleanup_expired_supporter_badges();');

