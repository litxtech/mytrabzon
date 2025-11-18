-- Add driver and passenger contact fields for rides
ALTER TABLE ride_offers
  ADD COLUMN IF NOT EXISTS driver_phone TEXT;

ALTER TABLE ride_bookings
  ADD COLUMN IF NOT EXISTS passenger_phone TEXT;

