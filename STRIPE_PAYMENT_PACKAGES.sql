mi -- ============================================
-- MyTrabzon - Ödeme Paketleri ve Özellikler
-- ============================================

-- Paketler tablosu
CREATE TABLE IF NOT EXISTS payment_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'premium', 'boost', 'video_match_premium', etc.
  display_name TEXT NOT NULL, -- 'Premium Üyelik', 'Boost Paketi', etc.
  description TEXT,
  price_monthly INTEGER, -- Aylık fiyat (kuruş cinsinden)
  price_yearly INTEGER, -- Yıllık fiyat (kuruş cinsinden)
  stripe_price_id_monthly TEXT, -- Stripe Price ID (aylık)
  stripe_price_id_yearly TEXT, -- Stripe Price ID (yıllık)
  features JSONB DEFAULT '{}'::jsonb, -- Paket özellikleri
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kullanıcı paketleri (aktif abonelikler)
CREATE TABLE IF NOT EXISTS user_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES payment_packages(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'past_due')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, package_id, status) WHERE status = 'active'
);

-- Boost kullanımları (tek seferlik)
CREATE TABLE IF NOT EXISTS boost_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boost_type TEXT NOT NULL CHECK (boost_type IN ('post', 'reel', 'profile', 'match')),
  target_id UUID NOT NULL, -- Post ID, Reel ID, Profile ID, Match ID
  boost_duration_hours INTEGER DEFAULT 24, -- Kaç saat boost edilecek
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_user_packages_user_id ON user_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_packages_status ON user_packages(status);
CREATE INDEX IF NOT EXISTS idx_user_packages_expires_at ON user_packages(expires_at);

CREATE INDEX IF NOT EXISTS idx_boost_usage_user_id ON boost_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_boost_usage_target_id ON boost_usage(target_id);
CREATE INDEX IF NOT EXISTS idx_boost_usage_expires_at ON boost_usage(expires_at);
CREATE INDEX IF NOT EXISTS idx_boost_usage_boost_type ON boost_usage(boost_type);

-- RLS Policies
ALTER TABLE payment_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE boost_usage ENABLE ROW LEVEL SECURITY;

-- Herkes paketleri görebilir
CREATE POLICY "Anyone can view packages"
ON payment_packages
FOR SELECT
USING (is_active = true);

-- Kullanıcılar sadece kendi paketlerini görebilir
CREATE POLICY "Users can view their own packages"
ON user_packages
FOR SELECT
USING (auth.uid() = user_id);

-- Kullanıcılar sadece kendi boost'larını görebilir
CREATE POLICY "Users can view their own boosts"
ON boost_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS payment_packages_updated_at ON payment_packages;
CREATE TRIGGER payment_packages_updated_at
  BEFORE UPDATE ON payment_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_updated_at();

DROP TRIGGER IF EXISTS user_packages_updated_at ON user_packages;
CREATE TRIGGER user_packages_updated_at
  BEFORE UPDATE ON user_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_updated_at();

-- ============================================
-- DEFAULT PAKETLER
-- ============================================

-- 1. PREMIUM ÜYELİK
INSERT INTO payment_packages (name, display_name, description, price_monthly, price_yearly, features, sort_order)
VALUES (
  'premium',
  'Premium Üyelik',
  'Reklamsız deneyim, özel özellikler ve sınırsız kullanım',
  9900, -- 99.00 TRY/ay
  99000, -- 990.00 TRY/yıl (2 ay bedava)
  jsonb_build_object(
    'ad_free', true,
    'unlimited_posts', true,
    'unlimited_reels', true,
    'unlimited_matches', true,
    'priority_support', true,
    'exclusive_features', true,
    'profile_badge', true,
    'advanced_analytics', true,
    'custom_theme', true
  ),
  1
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features;

-- 2. BOOST PAKETİ (Tek seferlik)
INSERT INTO payment_packages (name, display_name, description, price_monthly, features, sort_order)
VALUES (
  'boost',
  'Boost Paketi',
  'Gönderilerini, reellerini veya profili öne çıkar',
  4900, -- 49.00 TRY (tek seferlik)
  jsonb_build_object(
    'boost_post', true,
    'boost_reel', true,
    'boost_profile', true,
    'boost_duration_hours', 24,
    'priority_feed', true
  ),
  2
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  features = EXCLUDED.features;

-- 3. VIDEO EŞLEŞME PREMIUM
INSERT INTO payment_packages (name, display_name, description, price_monthly, price_yearly, features, sort_order)
VALUES (
  'video_match_premium',
  'Video Eşleşme Premium',
  'Sınırsız eşleşme, özel filtreler ve öncelikli eşleşme',
  7900, -- 79.00 TRY/ay
  79000, -- 790.00 TRY/yıl
  jsonb_build_object(
    'unlimited_matches', true,
    'advanced_filters', true,
    'priority_matching', true,
    'unlimited_swipes', true,
    'see_who_liked_you', true,
    'rewind_last_swipe', true
  ),
  3
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features;

-- 4. HALI SAHA PREMIUM
INSERT INTO payment_packages (name, display_name, description, price_monthly, price_yearly, features, sort_order)
VALUES (
  'football_premium',
  'Halı Saha Premium',
  'Özel maçlar, öncelikli rezervasyon ve istatistikler',
  5900, -- 59.00 TRY/ay
  59000, -- 590.00 TRY/yıl
  jsonb_build_object(
    'priority_reservation', true,
    'exclusive_matches', true,
    'advanced_statistics', true,
    'team_management', true,
    'match_history', true,
    'player_ratings', true
  ),
  4
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features;

-- 5. KTÜ PREMIUM (Öğrenciler için)
INSERT INTO payment_packages (name, display_name, description, price_monthly, price_yearly, features, sort_order)
VALUES (
  'ktu_premium',
  'KTÜ Premium',
  'Özel öğrenci özellikleri, not paylaşımı ve kampüs etkinlikleri',
  3900, -- 39.00 TRY/ay (öğrenci indirimi)
  39000, -- 390.00 TRY/yıl
  jsonb_build_object(
    'unlimited_notes', true,
    'exclusive_events', true,
    'campus_features', true,
    'study_groups', true,
    'exam_calendar', true,
    'cafeteria_menu', true
  ),
  5
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Kullanıcının aktif paketini kontrol et
CREATE OR REPLACE FUNCTION has_active_package(p_user_id UUID, p_package_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_packages up
    JOIN payment_packages pp ON up.package_id = pp.id
    WHERE up.user_id = p_user_id
      AND pp.name = p_package_name
      AND up.status = 'active'
      AND (up.expires_at IS NULL OR up.expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kullanıcının boost hakkı var mı kontrol et
CREATE OR REPLACE FUNCTION has_boost_available(p_user_id UUID, p_boost_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Premium üyeler sınırsız boost kullanabilir
  IF has_active_package(p_user_id, 'premium') THEN
    RETURN true;
  END IF;
  
  -- Aktif boost var mı kontrol et
  RETURN EXISTS (
    SELECT 1
    FROM boost_usage
    WHERE user_id = p_user_id
      AND boost_type = p_boost_type
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kullanıcının aktif paketlerini getir
CREATE OR REPLACE FUNCTION get_user_active_packages(p_user_id UUID)
RETURNS TABLE (
  package_name TEXT,
  display_name TEXT,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.name,
    pp.display_name,
    up.expires_at
  FROM user_packages up
  JOIN payment_packages pp ON up.package_id = pp.id
  WHERE up.user_id = p_user_id
    AND up.status = 'active'
    AND (up.expires_at IS NULL OR up.expires_at > NOW())
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

