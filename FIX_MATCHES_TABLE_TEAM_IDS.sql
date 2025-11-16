-- ============================================
-- MATCHES TABLOSU DÜZELTME
-- team1_id ve team2_id kolonlarını NULL yapabilir hale getir
-- ============================================

-- team1_id ve team2_id'yi nullable yap
ALTER TABLE matches 
  ALTER COLUMN team1_id DROP NOT NULL;

ALTER TABLE matches 
  ALTER COLUMN team2_id DROP NOT NULL;

-- Alternatif olarak, takım oluşturmadan maç oluşturabilmek için
-- organizer_id'yi kullanarak basit bir takım oluşturma sistemi:

-- Maç oluşturulduğunda otomatik takım oluştur (opsiyonel)
CREATE OR REPLACE FUNCTION create_match_with_auto_team()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Eğer team1_id NULL ise, otomatik takım oluştur
  IF NEW.team1_id IS NULL THEN
    INSERT INTO teams (
      name,
      city,
      captain_id,
      member_count,
      is_active
    ) VALUES (
      'Takım ' || NEW.organizer_id::text,
      NEW.city,
      NEW.organizer_id,
      1,
      true
    )
    RETURNING id INTO v_team_id;
    
    NEW.team1_id := v_team_id;
    
    -- Organizeri takıma ekle
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (v_team_id, NEW.organizer_id, 'captain');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS auto_create_team_for_match ON matches;
CREATE TRIGGER auto_create_team_for_match
  BEFORE INSERT ON matches
  FOR EACH ROW
  EXECUTE FUNCTION create_match_with_auto_team();

-- ============================================
-- SONUÇ
-- ============================================
-- ✅ team1_id ve team2_id artık NULL olabilir
-- ✅ Maç oluşturulurken otomatik takım oluşturulur
-- ============================================

