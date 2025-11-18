-- Add vehicle and driver snapshot fields to ride_offers
ALTER TABLE ride_offers
  ADD COLUMN IF NOT EXISTS vehicle_brand TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_model TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_color TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_plate TEXT,
  ADD COLUMN IF NOT EXISTS driver_full_name TEXT;

-- Backfill driver_full_name for existing rides if empty
UPDATE ride_offers AS r
SET driver_full_name = COALESCE(driver_full_name, p.full_name)
FROM profiles AS p
WHERE r.driver_id = p.id;

