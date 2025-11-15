-- ============================================
-- Bağış Sistemi - Destekçi Etiketi
-- ============================================
-- Web sitesinden gelen bağışlar için destekçi etiketi sistemi
-- 89 TL: Sarı (🌟), 139 TL: Yeşil (💚), 339 TL: Mavi (💙), 3000 TL: Kırmızı (❤️)

-- Profiles tablosuna destekçi etiketi rengi ekle
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS supporter_badge_color TEXT CHECK (supporter_badge_color IN ('yellow', 'green', 'blue', 'red'));

-- Eğer supporter_badge kolonu yoksa ekle
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS supporter_badge BOOLEAN DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS supporter_badge_visible BOOLEAN DEFAULT true;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS supporter_badge_expires_at TIMESTAMPTZ;

-- Bağış kayıtları tablosu (eğer yoksa)
CREATE TABLE IF NOT EXISTS supporter_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Kuruş cinsinden
  stripe_payment_intent_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  badge_color TEXT CHECK (badge_color IN ('yellow', 'green', 'blue', 'red')),
  badge_expires_at TIMESTAMPTZ, -- Etiket bitiş tarihi (NULL = kalıcı)
  is_anonymous BOOLEAN DEFAULT false,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_supporter_donations_user_id ON supporter_donations(user_id);
CREATE INDEX IF NOT EXISTS idx_supporter_donations_status ON supporter_donations(status);
CREATE INDEX IF NOT EXISTS idx_supporter_donations_payment_id ON supporter_donations(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_supporter_badge ON profiles(supporter_badge) WHERE supporter_badge = true;

-- RLS Policies
ALTER TABLE supporter_donations ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi bağışlarını görebilir
DROP POLICY IF EXISTS "Users can view their own donations" ON supporter_donations;
CREATE POLICY "Users can view their own donations"
ON supporter_donations
FOR SELECT
USING (auth.uid() = user_id);

-- Kullanıcılar kendi bağışlarını oluşturabilir
DROP POLICY IF EXISTS "Users can create their own donations" ON supporter_donations;
CREATE POLICY "Users can create their own donations"
ON supporter_donations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Webhook ile bağış kaydı oluşturma (service role kullanılacak, RLS bypass)
-- Bu işlem edge function tarafından service role key ile yapılacak

-- Bağış miktarına göre etiket rengi belirleme fonksiyonu
CREATE OR REPLACE FUNCTION get_badge_color_from_amount(amount_cents INTEGER)
RETURNS TEXT AS $$
BEGIN
  -- Amount kuruş cinsinden geliyor
  IF amount_cents >= 300000 THEN -- 3000 TL
    RETURN 'red';
  ELSIF amount_cents >= 33900 THEN -- 339 TL
    RETURN 'blue';
  ELSIF amount_cents >= 13900 THEN -- 139 TL
    RETURN 'green';
  ELSIF amount_cents >= 8900 THEN -- 89 TL
    RETURN 'yellow';
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Bağış tamamlandığında etiket ekleme fonksiyonu
CREATE OR REPLACE FUNCTION add_supporter_badge_from_donation(
  p_user_id UUID,
  p_amount_cents INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_badge_color TEXT;
BEGIN
  -- Etiket rengini belirle
  v_badge_color := get_badge_color_from_amount(p_amount_cents);
  
  IF v_badge_color IS NULL THEN
    RETURN; -- Miktar yetersiz
  END IF;
  
  -- Profil'e destekçi etiketi ekle
  UPDATE profiles
  SET 
    supporter_badge = true,
    supporter_badge_color = v_badge_color,
    supporter_badge_visible = true,
    supporter_badge_expires_at = NULL, -- Kalıcı etiket
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Süresi dolmuş etiketleri temizle
CREATE OR REPLACE FUNCTION cleanup_expired_supporter_badges()
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET 
    supporter_badge = false,
    supporter_badge_color = NULL,
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

-- Kullanıcının destekçi etiket rengini getir
CREATE OR REPLACE FUNCTION get_supporter_badge_color(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_color TEXT;
BEGIN
  SELECT supporter_badge_color INTO v_color
  FROM profiles
  WHERE id = p_user_id
    AND supporter_badge = true
    AND supporter_badge_visible = true
    AND (supporter_badge_expires_at IS NULL OR supporter_badge_expires_at > NOW());
  
  RETURN v_color;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

