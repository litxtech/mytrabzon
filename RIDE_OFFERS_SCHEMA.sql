-- RIDE OFFERS TABLE (Yolculuk Paylaşımı)
CREATE TABLE IF NOT EXISTS ride_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Kalkış
  departure_title TEXT NOT NULL,
  departure_description TEXT,
  departure_raw TEXT NOT NULL,
  
  -- Varış
  destination_title TEXT NOT NULL,
  destination_description TEXT,
  destination_raw TEXT NOT NULL,
  
  -- Duraklar
  stops_text TEXT[] DEFAULT '{}'::TEXT[],
  stops_raw TEXT,
  
  -- Zaman
  departure_time TIMESTAMPTZ NOT NULL,
  estimated_arrival_time TIMESTAMPTZ,
  
  -- Kapasite & fiyat
  total_seats INTEGER NOT NULL CHECK (total_seats > 0),
  available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
  price_per_seat NUMERIC(10,2),
  vehicle_brand TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  vehicle_plate TEXT,
  driver_full_name TEXT,
  
  -- Kurallar & not
  notes TEXT,
  allow_pets BOOLEAN DEFAULT false,
  allow_smoking BOOLEAN DEFAULT false,
  
  -- Durum
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','full','cancelled','finished','expired')),
  
  -- Otomatik düşürme için
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ride_offers_driver_id ON ride_offers(driver_id);
CREATE INDEX IF NOT EXISTS idx_ride_offers_status ON ride_offers(status);
CREATE INDEX IF NOT EXISTS idx_ride_offers_departure_time ON ride_offers(departure_time);
CREATE INDEX IF NOT EXISTS idx_ride_offers_expires_at ON ride_offers(expires_at);
CREATE INDEX IF NOT EXISTS idx_ride_offers_departure_raw ON ride_offers USING gin(to_tsvector('turkish', departure_raw));
CREATE INDEX IF NOT EXISTS idx_ride_offers_destination_raw ON ride_offers USING gin(to_tsvector('turkish', destination_raw));
CREATE INDEX IF NOT EXISTS idx_ride_offers_stops_raw ON ride_offers USING gin(to_tsvector('turkish', stops_raw));

-- RIDE BOOKINGS TABLE (Yolculuk Rezervasyonları)
CREATE TABLE IF NOT EXISTS ride_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_offer_id UUID NOT NULL REFERENCES ride_offers(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seats_requested INTEGER NOT NULL DEFAULT 1 CHECK (seats_requested > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ride_offer_id, passenger_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ride_bookings_ride_offer_id ON ride_bookings(ride_offer_id);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_passenger_id ON ride_bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_status ON ride_bookings(status);

-- Function to update departure_raw and destination_raw
CREATE OR REPLACE FUNCTION update_ride_offer_raw_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Update departure_raw
  NEW.departure_raw = TRIM(
    NEW.departure_title || 
    CASE WHEN NEW.departure_description IS NOT NULL AND NEW.departure_description != '' 
      THEN ' - ' || NEW.departure_description 
      ELSE '' 
    END
  );
  
  -- Update destination_raw
  NEW.destination_raw = TRIM(
    NEW.destination_title || 
    CASE WHEN NEW.destination_description IS NOT NULL AND NEW.destination_description != '' 
      THEN ' - ' || NEW.destination_description 
      ELSE '' 
    END
  );
  
  -- Update stops_raw
  IF NEW.stops_text IS NOT NULL AND array_length(NEW.stops_text, 1) > 0 THEN
    NEW.stops_raw = array_to_string(NEW.stops_text, ' | ');
  ELSE
    NEW.stops_raw = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update raw fields
DROP TRIGGER IF EXISTS trigger_update_ride_offer_raw_fields ON ride_offers;
CREATE TRIGGER trigger_update_ride_offer_raw_fields
  BEFORE INSERT OR UPDATE ON ride_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_ride_offer_raw_fields();

-- Function to update available_seats when booking status changes
CREATE OR REPLACE FUNCTION update_ride_offer_seats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'approved' THEN
      UPDATE ride_offers
      SET available_seats = available_seats - NEW.seats_requested
      WHERE id = NEW.ride_offer_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        UPDATE ride_offers
        SET available_seats = available_seats - NEW.seats_requested
        WHERE id = NEW.ride_offer_id;
      ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
        UPDATE ride_offers
        SET available_seats = available_seats + OLD.seats_requested
        WHERE id = NEW.ride_offer_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'approved' THEN
      UPDATE ride_offers
      SET available_seats = available_seats + OLD.seats_requested
      WHERE id = OLD.ride_offer_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update seats
DROP TRIGGER IF EXISTS trigger_update_ride_offer_seats ON ride_bookings;
CREATE TRIGGER trigger_update_ride_offer_seats
  AFTER INSERT OR UPDATE OR DELETE ON ride_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_ride_offer_seats();

-- RLS Policies
ALTER TABLE ride_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active ride offers
CREATE POLICY "Anyone can view active ride offers"
  ON ride_offers FOR SELECT
  USING (status = 'active' AND expires_at > NOW());

-- Policy: Users can create their own ride offers
CREATE POLICY "Users can create ride offers"
  ON ride_offers FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

-- Policy: Users can update their own ride offers
CREATE POLICY "Users can update their own ride offers"
  ON ride_offers FOR UPDATE
  USING (auth.uid() = driver_id);

-- Policy: Users can delete their own ride offers
CREATE POLICY "Users can delete their own ride offers"
  ON ride_offers FOR DELETE
  USING (auth.uid() = driver_id);

-- Policy: Users can view their own bookings
CREATE POLICY "Users can view their own bookings"
  ON ride_bookings FOR SELECT
  USING (auth.uid() = passenger_id OR auth.uid() IN (SELECT driver_id FROM ride_offers WHERE id = ride_bookings.ride_offer_id));

-- Policy: Users can create bookings
CREATE POLICY "Users can create bookings"
  ON ride_bookings FOR INSERT
  WITH CHECK (auth.uid() = passenger_id);

-- Policy: Users can update their own bookings
CREATE POLICY "Users can update their own bookings"
  ON ride_bookings FOR UPDATE
  USING (auth.uid() = passenger_id);

-- Policy: Drivers can update bookings for their rides
CREATE POLICY "Drivers can update bookings for their rides"
  ON ride_bookings FOR UPDATE
  USING (auth.uid() IN (SELECT driver_id FROM ride_offers WHERE id = ride_bookings.ride_offer_id));

