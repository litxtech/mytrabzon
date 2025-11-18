-- Add currency column to ride_offers table
ALTER TABLE ride_offers 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TL' CHECK (currency IN ('TL', 'USD', 'EUR'));

-- Update existing rows to have TL as default
UPDATE ride_offers 
SET currency = 'TL' 
WHERE currency IS NULL;

