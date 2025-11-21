-- Yolculuk tamamlama ve karma skoru sistemi

-- 1. ride_bookings tablosuna completed_at ekle
ALTER TABLE ride_bookings
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- 2. ride_reviews tablosuna reviewed_by ekle (kim yorum yaptı - passenger veya driver)
ALTER TABLE ride_reviews
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reviewed_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. profiles tablosuna karma skoru alanları ekle
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS karma_score INTEGER DEFAULT 50 CHECK (karma_score >= 0 AND karma_score <= 100),
  ADD COLUMN IF NOT EXISTS karma_level TEXT DEFAULT 'neutral' CHECK (karma_level IN ('noble', 'good', 'neutral', 'bad', 'banned')),
  ADD COLUMN IF NOT EXISTS total_ride_reviews INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS positive_reviews INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS negative_reviews INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_banned_from_rides BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ride_bookings_completed_at ON ride_bookings(completed_at);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_reviewed_at ON ride_bookings(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_profiles_karma_score ON profiles(karma_score);
CREATE INDEX IF NOT EXISTS idx_profiles_karma_level ON profiles(karma_level);
CREATE INDEX IF NOT EXISTS idx_profiles_banned_from_rides ON profiles(is_banned_from_rides);

-- Function: Karma skorunu güncelle
CREATE OR REPLACE FUNCTION update_karma_score()
RETURNS TRIGGER AS $$
DECLARE
  v_total_reviews INTEGER;
  v_positive_reviews INTEGER;
  v_negative_reviews INTEGER;
  v_karma_score INTEGER;
  v_karma_level TEXT;
BEGIN
  -- Hangi kullanıcı için karma skoru güncellenecek?
  DECLARE
    target_user_id UUID;
  BEGIN
    -- Eğer reviewed_by driver ise, driver_id için güncelle
    -- Eğer reviewed_by passenger ise, passenger_id için güncelle
    IF NEW.reviewed_by = (SELECT driver_id FROM ride_bookings WHERE id = NEW.booking_id) THEN
      target_user_id := NEW.driver_id;
    ELSE
      target_user_id := NEW.passenger_id;
    END IF;

    -- Toplam, pozitif ve negatif yorumları say
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE rating >= 4),
      COUNT(*) FILTER (WHERE rating <= 2)
    INTO v_total_reviews, v_positive_reviews, v_negative_reviews
    FROM ride_reviews
    WHERE (driver_id = target_user_id OR passenger_id = target_user_id)
      AND id != NEW.id; -- Yeni eklenen yorumu hariç tut

    -- Yeni yorumu da ekle
    v_total_reviews := v_total_reviews + 1;
    IF NEW.rating >= 4 THEN
      v_positive_reviews := v_positive_reviews + 1;
    ELSIF NEW.rating <= 2 THEN
      v_negative_reviews := v_negative_reviews + 1;
    END IF;

    -- Karma skorunu hesapla (0-100 arası)
    -- Pozitif yorumlar yeşile, negatif yorumlar kırmızıya kaydırır
    IF v_total_reviews > 0 THEN
      v_karma_score := 50 + ((v_positive_reviews::FLOAT / v_total_reviews::FLOAT) * 50) - ((v_negative_reviews::FLOAT / v_total_reviews::FLOAT) * 50);
      v_karma_score := GREATEST(0, LEAST(100, v_karma_score::INTEGER));
    ELSE
      v_karma_score := 50;
    END IF;

    -- Karma seviyesini belirle
    IF v_karma_score = 100 THEN
      v_karma_level := 'noble';
    ELSIF v_karma_score >= 70 THEN
      v_karma_level := 'good';
    ELSIF v_karma_score >= 30 THEN
      v_karma_level := 'neutral';
    ELSIF v_karma_score > 0 THEN
      v_karma_level := 'bad';
    ELSE
      v_karma_level := 'banned';
    END IF;

    -- Profili güncelle
    UPDATE profiles
    SET 
      karma_score = v_karma_score,
      karma_level = v_karma_level,
      total_ride_reviews = v_total_reviews,
      positive_reviews = v_positive_reviews,
      negative_reviews = v_negative_reviews,
      is_banned_from_rides = (v_karma_level = 'banned'),
      ban_reason = CASE WHEN v_karma_level = 'banned' THEN 'Karma skoru 0''a düştü' ELSE NULL END
    WHERE id = target_user_id;

    -- Eğer karma skoru 0 ise, verified ve asil etiketlerini kaldır
    IF v_karma_score = 0 THEN
      UPDATE profiles
      SET verified = false
      WHERE id = target_user_id;
    END IF;

    -- Eğer karma skoru 100 ise, asil etiketi ver (verified zaten true olmalı)
    IF v_karma_score = 100 THEN
      UPDATE profiles
      SET verified = true
      WHERE id = target_user_id;
    END IF;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Yorum eklendiğinde karma skorunu güncelle
DROP TRIGGER IF EXISTS trigger_update_karma_score ON ride_reviews;
CREATE TRIGGER trigger_update_karma_score
  AFTER INSERT ON ride_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_karma_score();

-- Function: Yolculuk tamamlandığında bildirim gönder
CREATE OR REPLACE FUNCTION notify_ride_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_ride_offer_id UUID;
  v_driver_id UUID;
  v_passenger_ids UUID[];
BEGIN
  -- Sadece completed_at set edildiğinde ve daha önce null ise çalış
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    v_ride_offer_id := NEW.ride_offer_id;
    
    -- Driver'ı bul
    SELECT driver_id INTO v_driver_id
    FROM ride_offers
    WHERE id = v_ride_offer_id;

    -- Tüm onaylanmış yolcuları bul
    SELECT ARRAY_AGG(passenger_id)
    INTO v_passenger_ids
    FROM ride_bookings
    WHERE ride_offer_id = v_ride_offer_id
      AND status = 'approved'
      AND passenger_id != v_driver_id;

    -- Her yolcuya bildirim gönder
    IF v_passenger_ids IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, body, message, data, push_sent, is_deleted)
      SELECT 
        passenger_id,
        'RESERVATION',
        'Yolculuk Tamamlandı',
        'Yolculuk tamamlandı. Lütfen sürücüyü değerlendirin.',
        'Yolculuk tamamlandı. Lütfen sürücüyü değerlendirin.',
        jsonb_build_object(
          'type', 'RIDE_COMPLETED',
          'ride_offer_id', v_ride_offer_id,
          'booking_id', NEW.id,
          'driver_id', v_driver_id
        ),
        false,
        false
      FROM unnest(v_passenger_ids) AS passenger_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Yolculuk tamamlandığında bildirim gönder
DROP TRIGGER IF EXISTS trigger_notify_ride_completion ON ride_bookings;
CREATE TRIGGER trigger_notify_ride_completion
  AFTER UPDATE OF completed_at ON ride_bookings
  FOR EACH ROW
  WHEN (NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL)
  EXECUTE FUNCTION notify_ride_completion();

