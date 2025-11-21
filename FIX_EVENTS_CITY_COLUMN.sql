-- ============================================
-- EVENTS TABLOSUNA CITY KOLONU EKLE
-- ============================================

-- City kolonu yoksa ekle
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'city'
  ) THEN
    ALTER TABLE events ADD COLUMN city TEXT NOT NULL DEFAULT 'Trabzon' 
      CHECK (city IN ('Trabzon', 'Giresun'));
  END IF;
END $$;

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_city_district ON events(city, district);

