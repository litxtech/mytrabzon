-- ============================================
-- MATCHES TABLOSU TEAM1_ID NULL YAPILABİLİR HALE GETİRME
-- ============================================
-- Maç oluştururken takım zorunlu olmaması için team1_id ve team2_id NULL yapılabilir hale getirilir

-- team1_id NOT NULL kısıtını kaldır
ALTER TABLE matches 
  ALTER COLUMN team1_id DROP NOT NULL;

-- team2_id zaten NULL yapılabilir, ama yine de kontrol edelim
-- (Eğer NOT NULL ise kaldırırız)
DO $$
BEGIN
  -- team1_id için foreign key constraint'i kontrol et ve gerekirse güncelle
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'matches_team1_id_fkey' 
    AND table_name = 'matches'
  ) THEN
    -- Foreign key constraint'i kaldır (eğer varsa)
    ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team1_id_fkey;
    
    -- Yeni foreign key constraint ekle (NULL değerlere izin verir)
    ALTER TABLE matches 
      ADD CONSTRAINT matches_team1_id_fkey 
      FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- TAMAMLANDI
-- ============================================
-- Artık matches tablosunda team1_id ve team2_id NULL olabilir
-- Bu sayede kullanıcılar takım adı girmeden de maç oluşturabilir

