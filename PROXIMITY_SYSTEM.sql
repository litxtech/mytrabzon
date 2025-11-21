-- ============================================
-- Yakındaki Kullanıcılar - Çift Onaylı Karşılaşma Sistemi
-- ============================================
-- Bu migration dosyası, kullanıcıların yakınlık bazlı karşılaşma özelliğini sağlar.
-- Gizlilik odaklı: Harita yok, sadece mesafe hesaplaması, çift onay sistemi.

-- 1. PostGIS uzantısını aktif et (eğer yoksa)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Profiles tablosuna location_opt_in kolonu ekle
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS location_opt_in boolean NOT NULL DEFAULT false;

-- 3. Kullanıcı konumları tablosu
CREATE TABLE IF NOT EXISTS user_locations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  geom geography(Point, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PostGIS index - mesafe sorguları için kritik
CREATE INDEX IF NOT EXISTS idx_user_locations_geom
  ON user_locations
  USING GIST (geom);

-- updated_at için index - son 10 dakika içindeki aktif kullanıcıları bulmak için
CREATE INDEX IF NOT EXISTS idx_user_locations_updated_at
  ON user_locations (updated_at DESC);

-- 4. Proximity status enum tipi
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proximity_status') THEN
    CREATE TYPE proximity_status AS ENUM (
      'pending',       -- iki taraf da henüz cevap vermedi
      'a_accepted',   -- A kabul etti, B bekliyor
      'b_accepted',   -- B kabul etti, A bekliyor
      'accepted',     -- iki taraf da kabul etti
      'rejected',     -- en az bir taraf reddetti
      'blocked'       -- en az bir taraf engelledi
    );
  END IF;
END$$;

-- 5. Proximity pairs tablosu - kullanıcı ikilileri ve durumları
CREATE TABLE IF NOT EXISTS proximity_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status proximity_status NOT NULL DEFAULT 'pending',
  last_notified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- user_a_id < user_b_id olmalı (canonical order)
  CONSTRAINT check_canonical_order CHECK (user_a_id < user_b_id)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_proximity_pairs_user_a ON proximity_pairs(user_a_id);
CREATE INDEX IF NOT EXISTS idx_proximity_pairs_user_b ON proximity_pairs(user_b_id);
CREATE INDEX IF NOT EXISTS idx_proximity_pairs_status ON proximity_pairs(status);
CREATE INDEX IF NOT EXISTS idx_proximity_pairs_last_notified ON proximity_pairs(last_notified_at DESC);

-- Canonical pair unique index - aynı ikiliyi tekrar oluşturmayı engeller
-- Expression-based unique index kullanarak LEAST/GREATEST ile canonical pair kontrolü
CREATE UNIQUE INDEX IF NOT EXISTS idx_proximity_pairs_unique_pair 
  ON proximity_pairs (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id));

-- updated_at için trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_proximity_pairs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS trigger_proximity_pairs_updated_at ON proximity_pairs;
CREATE TRIGGER trigger_proximity_pairs_updated_at
  BEFORE UPDATE ON proximity_pairs
  FOR EACH ROW
  EXECUTE FUNCTION update_proximity_pairs_updated_at();

-- 6. RLS Policies

-- user_locations için RLS
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi konumlarını görebilir/güncelleyebilir
CREATE POLICY "Users can view their own location"
  ON user_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own location"
  ON user_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location"
  ON user_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own location"
  ON user_locations FOR DELETE
  USING (auth.uid() = user_id);

-- proximity_pairs için RLS
ALTER TABLE proximity_pairs ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi dahil oldukları pair'leri görebilir
CREATE POLICY "Users can view their proximity pairs"
  ON proximity_pairs FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Service role ile insert/update yapılacak (Edge Function'dan)
-- Bu yüzden insert/update policy'si yok, service role kullanılacak

-- 7. Yardımcı fonksiyonlar

-- İki kullanıcı arasındaki mesafeyi hesapla (metre cinsinden)
CREATE OR REPLACE FUNCTION calculate_distance_meters(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
) RETURNS double precision AS $$
BEGIN
  RETURN ST_Distance(
    ST_SetSRID(ST_MakePoint(lng1, lat1), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lng2, lat2), 4326)::geography
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Canonical user pair oluştur (a < b olacak şekilde)
CREATE OR REPLACE FUNCTION get_canonical_pair(
  user1_id uuid,
  user2_id uuid
) RETURNS TABLE(user_a_id uuid, user_b_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    LEAST(user1_id, user2_id) as user_a_id,
    GREATEST(user1_id, user2_id) as user_b_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Notifications tablosu kontrolü ve proximity bildirimleri için hazırlık
-- Mevcut notifications tablosu varsa kullanılacak, yoksa basit bir yapı oluşturulabilir
-- Bu migration mevcut notifications yapısını bozmaz

-- 9. Proximity contacts tablosu (accepted olan kullanıcılar için)
-- Bu tablo, kabul edilen yakınlık eşleşmelerini tutar
CREATE TABLE IF NOT EXISTS proximity_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proximity_pair_id uuid NOT NULL REFERENCES proximity_pairs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Bir kullanıcı aynı kişiyi birden fazla kez ekleyemez
  CONSTRAINT unique_contact UNIQUE (user_id, contact_user_id)
);

CREATE INDEX IF NOT EXISTS idx_proximity_contacts_user ON proximity_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_proximity_contacts_contact ON proximity_contacts(contact_user_id);
CREATE INDEX IF NOT EXISTS idx_proximity_contacts_pair ON proximity_contacts(proximity_pair_id);

-- RLS Policies for proximity_contacts
ALTER TABLE proximity_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their contacts"
  ON proximity_contacts FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = contact_user_id);

-- 10. RPC Fonksiyonu - Yakındaki kullanıcıları bul (PostGIS ile)
CREATE OR REPLACE FUNCTION find_nearby_users(
  current_user_id uuid,
  current_lat double precision,
  current_lng double precision,
  radius_meters double precision DEFAULT 200,
  max_age_minutes integer DEFAULT 10
)
RETURNS TABLE(user_id uuid, distance_meters double precision) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ul.user_id,
    ST_Distance(
      ul.geom,
      ST_SetSRID(ST_MakePoint(current_lng, current_lat), 4326)::geography
    ) as distance_meters
  FROM user_locations ul
  JOIN profiles p ON p.id = ul.user_id
  WHERE ul.user_id <> current_user_id
    AND p.location_opt_in = true
    AND ul.updated_at > now() - (max_age_minutes || ' minutes')::interval
    AND ST_DWithin(
      ul.geom,
      ST_SetSRID(ST_MakePoint(current_lng, current_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 11. Comments ve açıklamalar
COMMENT ON TABLE user_locations IS 'Kullanıcıların son bilinen konumları. Sadece location_opt_in=true olan kullanıcılar için kayıt tutulur.';
COMMENT ON TABLE proximity_pairs IS 'Yakınlık bazlı kullanıcı ikilileri ve durumları. Çift onay sistemi için.';
COMMENT ON TABLE proximity_contacts IS 'Kabul edilen yakınlık eşleşmeleri. Bu kullanıcılar birbirlerinin profilini görebilir.';
COMMENT ON COLUMN profiles.location_opt_in IS 'Kullanıcının yakınlık bazlı karşılaşma özelliğine katılıp katılmadığı. Varsayılan: false (gizlilik için).';
COMMENT ON COLUMN proximity_pairs.status IS 'İkili arasındaki durum: pending, a_accepted, b_accepted, accepted, rejected, blocked';
COMMENT ON COLUMN proximity_pairs.last_notified_at IS 'Son bildirim gönderilme zamanı. Aynı ikiliye 24 saat içinde tekrar bildirim gönderilmez.';
COMMENT ON FUNCTION find_nearby_users IS 'PostGIS kullanarak yakındaki kullanıcıları bulur. Sadece location_opt_in=true ve son 10 dakika içinde aktif olanları döndürür.';