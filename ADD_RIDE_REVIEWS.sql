-- Ride reviews table
CREATE TABLE IF NOT EXISTS ride_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_offer_id UUID NOT NULL REFERENCES ride_offers(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL UNIQUE REFERENCES ride_bookings(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ride_reviews_driver ON ride_reviews(driver_id);
CREATE INDEX IF NOT EXISTS idx_ride_reviews_passenger ON ride_reviews(passenger_id);

