-- ===================================================================
-- HALI SAHA UYGULAMASI - TRABZON & GİRESUN
-- ===================================================================
-- Bu SQL script'i halı saha uygulamasının tüm özelliklerini ekler:
-- - Saha rehberi (Trabzon & Giresun)
-- - Takım sistemi
-- - Maç yönetimi
-- - Eksik oyuncu sistemi
-- - Rakip bulma
-- - Oyuncu istatistikleri
-- - Üniversite modu (KTÜ + Giresun Üniversitesi)
-- ===================================================================

-- ===================================================================
-- 1. SAHALAR TABLOSU
-- ===================================================================
CREATE TABLE IF NOT EXISTS football_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL CHECK (city IN ('Trabzon', 'Giresun')),
  district TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  image_urls TEXT[],
  price_per_hour DECIMAL(10, 2),
  surface_type TEXT DEFAULT 'artificial' CHECK (surface_type IN ('artificial', 'natural', 'hybrid')),
  field_size TEXT DEFAULT '5v5' CHECK (field_size IN ('5v5', '7v7', '11v11')),
  has_lighting BOOLEAN DEFAULT true,
  has_parking BOOLEAN DEFAULT false,
  has_locker_room BOOLEAN DEFAULT false,
  has_cafeteria BOOLEAN DEFAULT false,
  rating DECIMAL(3, 2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- 2. SAHA REZERVASYONLARI (Boş saatler) - match_id foreign key sonra eklenecek
-- ===================================================================
CREATE TABLE IF NOT EXISTS field_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES football_fields(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  reserved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  match_id UUID, -- Foreign key matches tablosu oluşturulduktan sonra eklenecek
  price DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(field_id, reservation_date, start_time)
);

-- ===================================================================
-- 3. TAKIMLAR TABLOSU
-- ===================================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL CHECK (city IN ('Trabzon', 'Giresun')),
  logo_url TEXT,
  jersey_color TEXT,
  description TEXT,
  captain_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  member_count INTEGER DEFAULT 1,
  total_matches INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  goals_scored INTEGER DEFAULT 0,
  goals_conceded INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  is_university_team BOOLEAN DEFAULT false,
  university_id UUID REFERENCES ktu_faculties(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- 4. TAKIM ÜYELERİ TABLOSU
-- ===================================================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('captain', 'vice_captain', 'member')),
  position TEXT CHECK (position IN ('goalkeeper', 'defender', 'midfielder', 'forward', 'any')),
  jersey_number INTEGER,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(team_id, user_id)
);

-- ===================================================================
-- 5. MAÇLAR TABLOSU
-- ===================================================================
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team1_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  team2_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  field_id UUID NOT NULL REFERENCES football_fields(id) ON DELETE RESTRICT,
  match_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  city TEXT NOT NULL CHECK (city IN ('Trabzon', 'Giresun')),
  district TEXT,
  match_type TEXT NOT NULL DEFAULT 'friendly' CHECK (match_type IN ('friendly', 'league', 'tournament', 'university')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'looking_for_opponent', 'looking_for_players', 'in_progress', 'completed', 'cancelled')),
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  missing_players_count INTEGER DEFAULT 0,
  missing_positions TEXT[],
  is_public BOOLEAN DEFAULT true,
  max_players INTEGER DEFAULT 10,
  current_players_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- field_reservations tablosuna match_id foreign key ekle (matches tablosu oluşturulduktan sonra)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'field_reservations_match_id_fkey'
  ) THEN
    ALTER TABLE field_reservations 
      ADD CONSTRAINT field_reservations_match_id_fkey 
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ===================================================================
-- 6. MAÇ KATILIMCILARI (Oyuncular)
-- ===================================================================
CREATE TABLE IF NOT EXISTS match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  position TEXT CHECK (position IN ('goalkeeper', 'defender', 'midfielder', 'forward')),
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

-- ===================================================================
-- 7. EKSİK OYUNCU İLANLARI
-- ===================================================================
CREATE TABLE IF NOT EXISTS missing_player_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position_needed TEXT NOT NULL CHECK (position_needed IN ('goalkeeper', 'defender', 'midfielder', 'forward', 'any')),
  city TEXT NOT NULL CHECK (city IN ('Trabzon', 'Giresun')),
  district TEXT,
  field_name TEXT,
  match_time TIMESTAMPTZ NOT NULL,
  is_filled BOOLEAN DEFAULT false,
  filled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  filled_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- 8. EKSİK OYUNCU BAŞVURULARI
-- ===================================================================
CREATE TABLE IF NOT EXISTS missing_player_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES missing_player_posts(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(post_id, applicant_id)
);

-- ===================================================================
-- 9. RAKİP BULMA İLANLARI
-- ===================================================================
CREATE TABLE IF NOT EXISTS opponent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES football_fields(id) ON DELETE RESTRICT,
  match_date DATE NOT NULL,
  start_time TIME NOT NULL,
  city TEXT NOT NULL CHECK (city IN ('Trabzon', 'Giresun')),
  district TEXT,
  match_type TEXT DEFAULT 'friendly' CHECK (match_type IN ('friendly', 'league', 'tournament')),
  preferred_team_level TEXT CHECK (preferred_team_level IN ('beginner', 'intermediate', 'advanced', 'any')),
  is_filled BOOLEAN DEFAULT false,
  accepted_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  application_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- 10. RAKİP BAŞVURULARI
-- ===================================================================
CREATE TABLE IF NOT EXISTS opponent_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES opponent_requests(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(request_id, team_id)
);

-- ===================================================================
-- 11. OYUNCU İSTATİSTİKLERİ
-- ===================================================================
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clean_sheets INTEGER DEFAULT 0,
  man_of_the_match BOOLEAN DEFAULT false,
  rating DECIMAL(3, 2) CHECK (rating >= 0 AND rating <= 5),
  position TEXT CHECK (position IN ('goalkeeper', 'defender', 'midfielder', 'forward')),
  minutes_played INTEGER DEFAULT 0,
  match_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- 12. MAÇ YORUMLARI (Saha değerlendirmeleri)
-- ===================================================================
CREATE TABLE IF NOT EXISTS field_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES football_fields(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(field_id, user_id, match_id)
);

-- ===================================================================
-- 13. BİLDİRİMLER
-- ===================================================================
CREATE TABLE IF NOT EXISTS football_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'match_reminder',
    'missing_player_found',
    'opponent_found',
    'team_invitation',
    'match_result',
    'new_match_today',
    'application_accepted',
    'application_rejected'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- 14. TAKIM LİGLERİ (İleride kullanılabilir)
-- ===================================================================
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL CHECK (city IN ('Trabzon', 'Giresun')),
  season TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS league_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  position INTEGER,
  UNIQUE(league_id, team_id)
);

-- ===================================================================
-- 15. İNDEKSLER (Performans için)
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_football_fields_city ON football_fields(city);
CREATE INDEX IF NOT EXISTS idx_football_fields_district ON football_fields(district);
CREATE INDEX IF NOT EXISTS idx_football_fields_active ON football_fields(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_field_reservations_field_date ON field_reservations(field_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_field_reservations_available ON field_reservations(is_available) WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_teams_city ON teams(city);
CREATE INDEX IF NOT EXISTS idx_teams_captain ON teams(captain_id);
CREATE INDEX IF NOT EXISTS idx_teams_university ON teams(is_university_team) WHERE is_university_team = true;

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_city ON matches(city);
-- NOT: CURRENT_DATE partial index'te sorun yaratabilir, normal index kullanıyoruz
CREATE INDEX IF NOT EXISTS idx_matches_today ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_team1 ON matches(team1_id);
CREATE INDEX IF NOT EXISTS idx_matches_team2 ON matches(team2_id);
CREATE INDEX IF NOT EXISTS idx_matches_field ON matches(field_id);

CREATE INDEX IF NOT EXISTS idx_match_participants_match ON match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_user ON match_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_team ON match_participants(team_id);

CREATE INDEX IF NOT EXISTS idx_missing_player_posts_city ON missing_player_posts(city);
CREATE INDEX IF NOT EXISTS idx_missing_player_posts_filled ON missing_player_posts(is_filled) WHERE is_filled = false;
CREATE INDEX IF NOT EXISTS idx_missing_player_posts_match_time ON missing_player_posts(match_time);
-- NOT: expires_at > NOW() partial index kullanılamaz (NOW() IMMUTABLE değil)
-- Bunun yerine normal index kullanıyoruz, sorgularda expires_at > NOW() filtresi uygulanacak
CREATE INDEX IF NOT EXISTS idx_missing_player_posts_expires ON missing_player_posts(expires_at);

CREATE INDEX IF NOT EXISTS idx_missing_player_applications_post ON missing_player_applications(post_id);
CREATE INDEX IF NOT EXISTS idx_missing_player_applications_applicant ON missing_player_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_missing_player_applications_status ON missing_player_applications(status);

CREATE INDEX IF NOT EXISTS idx_opponent_requests_team ON opponent_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_opponent_requests_filled ON opponent_requests(is_filled) WHERE is_filled = false;
CREATE INDEX IF NOT EXISTS idx_opponent_requests_date ON opponent_requests(match_date);
CREATE INDEX IF NOT EXISTS idx_opponent_requests_city ON opponent_requests(city);

CREATE INDEX IF NOT EXISTS idx_opponent_applications_request ON opponent_applications(request_id);
CREATE INDEX IF NOT EXISTS idx_opponent_applications_team ON opponent_applications(team_id);

CREATE INDEX IF NOT EXISTS idx_player_stats_user ON player_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_team ON player_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_match ON player_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_date ON player_stats(match_date);

CREATE INDEX IF NOT EXISTS idx_field_reviews_field ON field_reviews(field_id);
CREATE INDEX IF NOT EXISTS idx_field_reviews_user ON field_reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_football_notifications_user ON football_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_football_notifications_read ON football_notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_football_notifications_type ON football_notifications(type);

-- ===================================================================
-- 16. ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Sahalar: Herkes görebilir, sadece saha sahipleri güncelleyebilir
ALTER TABLE football_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sahalar herkese açık" ON football_fields;
CREATE POLICY "Sahalar herkese açık" ON football_fields
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Saha sahipleri güncelleyebilir" ON football_fields;
CREATE POLICY "Saha sahipleri güncelleyebilir" ON football_fields
  FOR UPDATE USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "Saha sahipleri ekleyebilir" ON football_fields;
CREATE POLICY "Saha sahipleri ekleyebilir" ON football_fields
  FOR INSERT WITH CHECK (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- Rezervasyonlar: Herkes görebilir, kendi rezervasyonlarını yönetebilir
ALTER TABLE field_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rezervasyonlar herkese açık" ON field_reservations;
CREATE POLICY "Rezervasyonlar herkese açık" ON field_reservations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Kullanıcılar rezervasyon yapabilir" ON field_reservations;
CREATE POLICY "Kullanıcılar rezervasyon yapabilir" ON field_reservations
  FOR INSERT WITH CHECK (reserved_by = auth.uid());

DROP POLICY IF EXISTS "Kendi rezervasyonlarını yönetebilir" ON field_reservations;
CREATE POLICY "Kendi rezervasyonlarını yönetebilir" ON field_reservations
  FOR UPDATE USING (reserved_by = auth.uid());

-- Takımlar: Herkes görebilir, kaptan yönetebilir
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Takımlar herkese açık" ON teams;
CREATE POLICY "Takımlar herkese açık" ON teams
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Kaptan takım yönetebilir" ON teams;
CREATE POLICY "Kaptan takım yönetebilir" ON teams
  FOR UPDATE USING (captain_id = auth.uid());

DROP POLICY IF EXISTS "Kullanıcılar takım kurabilir" ON teams;
CREATE POLICY "Kullanıcılar takım kurabilir" ON teams
  FOR INSERT WITH CHECK (captain_id = auth.uid());

-- Takım üyeleri: Herkes görebilir, kaptan yönetebilir
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Takım üyeleri herkese açık" ON team_members;
CREATE POLICY "Takım üyeleri herkese açık" ON team_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Kaptan üye ekleyebilir" ON team_members;
CREATE POLICY "Kaptan üye ekleyebilir" ON team_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND captain_id = auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Kaptan üye yönetebilir" ON team_members;
CREATE POLICY "Kaptan üye yönetebilir" ON team_members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND captain_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Maçlar: Herkes görebilir, organizatör yönetebilir
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Maçlar herkese açık" ON matches;
CREATE POLICY "Maçlar herkese açık" ON matches
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizatör maç oluşturabilir" ON matches;
CREATE POLICY "Organizatör maç oluşturabilir" ON matches
  FOR INSERT WITH CHECK (organizer_id = auth.uid());

DROP POLICY IF EXISTS "Organizatör maç yönetebilir" ON matches;
CREATE POLICY "Organizatör maç yönetebilir" ON matches
  FOR UPDATE USING (organizer_id = auth.uid());

-- Maç katılımcıları: Herkes görebilir, kendi katılımını yönetebilir
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Maç katılımcıları herkese açık" ON match_participants;
CREATE POLICY "Maç katılımcıları herkese açık" ON match_participants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Kullanıcılar maça katılabilir" ON match_participants;
CREATE POLICY "Kullanıcılar maça katılabilir" ON match_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Kendi katılımını yönetebilir" ON match_participants;
CREATE POLICY "Kendi katılımını yönetebilir" ON match_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Eksik oyuncu ilanları: Herkes görebilir, kendi ilanını yönetebilir
ALTER TABLE missing_player_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eksik oyuncu ilanları herkese açık" ON missing_player_posts;
CREATE POLICY "Eksik oyuncu ilanları herkese açık" ON missing_player_posts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Kullanıcılar ilan açabilir" ON missing_player_posts;
CREATE POLICY "Kullanıcılar ilan açabilir" ON missing_player_posts
  FOR INSERT WITH CHECK (posted_by = auth.uid());

DROP POLICY IF EXISTS "Kendi ilanını yönetebilir" ON missing_player_posts;
CREATE POLICY "Kendi ilanını yönetebilir" ON missing_player_posts
  FOR UPDATE USING (posted_by = auth.uid());

-- Eksik oyuncu başvuruları: Herkes görebilir, kendi başvurusunu yönetebilir
ALTER TABLE missing_player_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eksik oyuncu başvuruları herkese açık" ON missing_player_applications;
CREATE POLICY "Eksik oyuncu başvuruları herkese açık" ON missing_player_applications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Kullanıcılar başvurabilir" ON missing_player_applications;
CREATE POLICY "Kullanıcılar başvurabilir" ON missing_player_applications
  FOR INSERT WITH CHECK (applicant_id = auth.uid());

DROP POLICY IF EXISTS "Kendi başvurusunu yönetebilir" ON missing_player_applications;
CREATE POLICY "Kendi başvurusunu yönetebilir" ON missing_player_applications
  FOR UPDATE USING (applicant_id = auth.uid() OR EXISTS (SELECT 1 FROM missing_player_posts WHERE id = post_id AND posted_by = auth.uid()));

-- Rakip bulma ilanları: Herkes görebilir, takım kaptanı yönetebilir
ALTER TABLE opponent_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rakip bulma ilanları herkese açık" ON opponent_requests;
CREATE POLICY "Rakip bulma ilanları herkese açık" ON opponent_requests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Takım kaptanı ilan açabilir" ON opponent_requests;
CREATE POLICY "Takım kaptanı ilan açabilir" ON opponent_requests
  FOR INSERT WITH CHECK (
    posted_by = auth.uid() AND
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND captain_id = auth.uid())
  );

DROP POLICY IF EXISTS "Takım kaptanı ilan yönetebilir" ON opponent_requests;
CREATE POLICY "Takım kaptanı ilan yönetebilir" ON opponent_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND captain_id = auth.uid())
  );

-- Rakip başvuruları: Herkes görebilir, takım kaptanı yönetebilir
ALTER TABLE opponent_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rakip başvuruları herkese açık" ON opponent_applications;
CREATE POLICY "Rakip başvuruları herkese açık" ON opponent_applications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Takım kaptanı başvurabilir" ON opponent_applications;
CREATE POLICY "Takım kaptanı başvurabilir" ON opponent_applications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND captain_id = auth.uid())
  );

DROP POLICY IF EXISTS "Takım kaptanı başvuru yönetebilir" ON opponent_applications;
CREATE POLICY "Takım kaptanı başvuru yönetebilir" ON opponent_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND captain_id = auth.uid())
    OR EXISTS (SELECT 1 FROM opponent_requests WHERE id = request_id AND team_id IN (SELECT id FROM teams WHERE captain_id = auth.uid()))
  );

-- Oyuncu istatistikleri: Herkes görebilir, sadece maç organizatörü ekleyebilir
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Oyuncu istatistikleri herkese açık" ON player_stats;
CREATE POLICY "Oyuncu istatistikleri herkese açık" ON player_stats
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizatör istatistik ekleyebilir" ON player_stats;
CREATE POLICY "Organizatör istatistik ekleyebilir" ON player_stats
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM matches WHERE id = match_id AND organizer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
  );

-- Saha yorumları: Herkes görebilir, kendi yorumunu yönetebilir
ALTER TABLE field_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Saha yorumları herkese açık" ON field_reviews;
CREATE POLICY "Saha yorumları herkese açık" ON field_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Kullanıcılar yorum yapabilir" ON field_reviews;
CREATE POLICY "Kullanıcılar yorum yapabilir" ON field_reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Kendi yorumunu yönetebilir" ON field_reviews;
CREATE POLICY "Kendi yorumunu yönetebilir" ON field_reviews
  FOR UPDATE USING (user_id = auth.uid());

-- Bildirimler: Sadece kendi bildirimlerini görebilir
ALTER TABLE football_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kendi bildirimlerini görebilir" ON football_notifications;
CREATE POLICY "Kendi bildirimlerini görebilir" ON football_notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Kendi bildirimlerini yönetebilir" ON football_notifications;
CREATE POLICY "Kendi bildirimlerini yönetebilir" ON football_notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ===================================================================
-- 17. TRIGGER'LAR (Otomatik güncellemeler)
-- ===================================================================

-- Updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_football_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS football_fields_updated_at ON football_fields;
CREATE TRIGGER football_fields_updated_at
  BEFORE UPDATE ON football_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_football_updated_at();

DROP TRIGGER IF EXISTS field_reservations_updated_at ON field_reservations;
CREATE TRIGGER field_reservations_updated_at
  BEFORE UPDATE ON field_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_football_updated_at();

DROP TRIGGER IF EXISTS teams_updated_at ON teams;
CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_football_updated_at();

DROP TRIGGER IF EXISTS matches_updated_at ON matches;
CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_football_updated_at();

DROP TRIGGER IF EXISTS missing_player_posts_updated_at ON missing_player_posts;
CREATE TRIGGER missing_player_posts_updated_at
  BEFORE UPDATE ON missing_player_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_football_updated_at();

DROP TRIGGER IF EXISTS opponent_requests_updated_at ON opponent_requests;
CREATE TRIGGER opponent_requests_updated_at
  BEFORE UPDATE ON opponent_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_football_updated_at();

DROP TRIGGER IF EXISTS field_reviews_updated_at ON field_reviews;
CREATE TRIGGER field_reviews_updated_at
  BEFORE UPDATE ON field_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_football_updated_at();

-- Takım üye sayısı otomatik güncelleme
CREATE OR REPLACE FUNCTION update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE teams SET member_count = member_count + 1 WHERE id = NEW.team_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE teams SET member_count = member_count - 1 WHERE id = OLD.team_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS team_members_count_insert ON team_members;
CREATE TRIGGER team_members_count_insert
  AFTER INSERT ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_member_count();

DROP TRIGGER IF EXISTS team_members_count_delete ON team_members;
CREATE TRIGGER team_members_count_delete
  AFTER DELETE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_member_count();

-- Maç katılımcı sayısı otomatik güncelleme
CREATE OR REPLACE FUNCTION update_match_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE matches SET current_players_count = current_players_count + 1 WHERE id = NEW.match_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE matches SET current_players_count = current_players_count - 1 WHERE id = OLD.match_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS match_participants_count_insert ON match_participants;
CREATE TRIGGER match_participants_count_insert
  AFTER INSERT ON match_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_match_participant_count();

DROP TRIGGER IF EXISTS match_participants_count_delete ON match_participants;
CREATE TRIGGER match_participants_count_delete
  AFTER DELETE ON match_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_match_participant_count();

-- Saha rating otomatik güncelleme
CREATE OR REPLACE FUNCTION update_field_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE football_fields
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM field_reviews
      WHERE field_id = NEW.field_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM field_reviews
      WHERE field_id = NEW.field_id
    )
  WHERE id = NEW.field_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS field_reviews_rating_update ON field_reviews;
CREATE TRIGGER field_reviews_rating_update
  AFTER INSERT OR UPDATE OR DELETE ON field_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_field_rating();

-- Eksik oyuncu başvuru sayısı otomatik güncelleme
CREATE OR REPLACE FUNCTION update_missing_player_application_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE missing_player_posts SET application_count = application_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE missing_player_posts SET application_count = application_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS missing_player_applications_count_insert ON missing_player_applications;
CREATE TRIGGER missing_player_applications_count_insert
  AFTER INSERT ON missing_player_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_missing_player_application_count();

DROP TRIGGER IF EXISTS missing_player_applications_count_delete ON missing_player_applications;
CREATE TRIGGER missing_player_applications_count_delete
  AFTER DELETE ON missing_player_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_missing_player_application_count();

-- Rakip başvuru sayısı otomatik güncelleme
CREATE OR REPLACE FUNCTION update_opponent_application_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE opponent_requests SET application_count = application_count + 1 WHERE id = NEW.request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE opponent_requests SET application_count = application_count - 1 WHERE id = OLD.request_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

nDROP TRIGGER IF EXISTS opponent_applications_count_insert ON opponent_applications;
CREATE TRIGGER opponent_applications_count_insert
  AFTER INSERT ON opponent_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_opponent_application_count();

DROP TRIGGER IF EXISTS opponent_applications_count_delete ON opponent_applications;
CREATE TRIGGER opponent_applications_count_delete
  AFTER DELETE ON opponent_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_opponent_application_count();

-- ===================================================================
-- 18. DEFAULT DATA (Trabzon & Giresun Sahaları)
-- ===================================================================

-- Trabzon Sahaları
INSERT INTO football_fields (name, city, district, address, phone, price_per_hour, surface_type, field_size, has_lighting, has_parking)
VALUES
  ('Akyazı 3 Halı Saha', 'Trabzon', 'Ortahisar', 'Akyazı Mahallesi, Trabzon', '0462 XXX XX XX', 200.00, 'artificial', '5v5', true, true),
  ('Kaşüstü Arena', 'Trabzon', 'Ortahisar', 'Kaşüstü Mahallesi, Trabzon', '0462 XXX XX XX', 250.00, 'artificial', '7v7', true, true),
  ('Beşirli Halı Saha', 'Trabzon', 'Ortahisar', 'Beşirli Mahallesi, Trabzon', '0462 XXX XX XX', 180.00, 'artificial', '5v5', true, false),
  ('KTÜ Kampüs Saha', 'Trabzon', 'Ortahisar', 'KTÜ Kampüsü, Trabzon', '0462 XXX XX XX', 150.00, 'artificial', '5v5', true, true),
  ('Yomra Halı Saha', 'Trabzon', 'Yomra', 'Yomra Merkez, Trabzon', '0462 XXX XX XX', 170.00, 'artificial', '5v5', true, false),
  ('Of Gençlik Saha', 'Trabzon', 'Of', 'Of Merkez, Trabzon', '0462 XXX XX XX', 160.00, 'artificial', '5v5', true, false)
ON CONFLICT DO NOTHING;

-- Giresun Sahaları
INSERT INTO football_fields (name, city, district, address, phone, price_per_hour, surface_type, field_size, has_lighting, has_parking)
VALUES
  ('Giresun Merkez Halı Saha', 'Giresun', 'Merkez', 'Giresun Merkez', '0454 XXX XX XX', 200.00, 'artificial', '5v5', true, true),
  ('Giresun Üniversitesi Saha', 'Giresun', 'Merkez', 'Giresun Üniversitesi Kampüsü', '0454 XXX XX XX', 150.00, 'artificial', '5v5', true, true),
  ('Bulancak Halı Saha', 'Giresun', 'Bulancak', 'Bulancak Merkez, Giresun', '0454 XXX XX XX', 170.00, 'artificial', '5v5', true, false)
ON CONFLICT DO NOTHING;

-- ===================================================================
-- ✅ HALI SAHA UYGULAMASI KURULUMU TAMAMLANDI!
-- ===================================================================
-- 
-- Oluşturulan Tablolar:
-- ✅ football_fields - Sahalar
-- ✅ field_reservations - Rezervasyonlar
-- ✅ teams - Takımlar
-- ✅ team_members - Takım üyeleri
-- ✅ matches - Maçlar
-- ✅ match_participants - Maç katılımcıları
-- ✅ missing_player_posts - Eksik oyuncu ilanları
-- ✅ missing_player_applications - Eksik oyuncu başvuruları
-- ✅ opponent_requests - Rakip bulma ilanları
-- ✅ opponent_applications - Rakip başvuruları
-- ✅ player_stats - Oyuncu istatistikleri
-- ✅ field_reviews - Saha yorumları
-- ✅ football_notifications - Bildirimler
-- ✅ leagues - Ligler (ileride)
-- ✅ league_teams - Lig takımları (ileride)
-- 
-- RLS Policies: ✅ Güvenlik sağlandı
-- Indexes: ✅ Performans optimizasyonu
-- Triggers: ✅ Otomatik güncellemeler
-- Default Data: ✅ Trabzon & Giresun sahaları eklendi
-- 
-- 🚀 HAZIR!
-- ===================================================================


