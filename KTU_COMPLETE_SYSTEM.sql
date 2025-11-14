-- ===================================================================
-- KTÜ (KARADENİZ TEKNİK ÜNİVERSİTESİ) SİSTEMİ
-- ===================================================================
-- Bu SQL script'i KTÜ özelliklerini ekler:
-- - Öğrenci doğrulama sistemi
-- - Fakülte/Bölüm sistemi
-- - Kampüs duyuruları
-- - Etkinlikler (temel)
-- ===================================================================

-- ===================================================================
-- 1. FAKÜLTELER TABLOSU
-- ===================================================================
CREATE TABLE IF NOT EXISTS ktu_faculties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- 2. BÖLÜMLER TABLOSU
-- ===================================================================
CREATE TABLE IF NOT EXISTS ktu_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES ktu_faculties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(faculty_id, code)
);

-- ===================================================================
-- 3. ÖĞRENCİ BİLGİLERİ TABLOSU
-- ===================================================================
CREATE TABLE IF NOT EXISTS ktu_students (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  student_number TEXT NOT NULL UNIQUE,
  faculty_id UUID REFERENCES ktu_faculties(id) ON DELETE SET NULL,
  department_id UUID REFERENCES ktu_departments(id) ON DELETE SET NULL,
  class_year INTEGER CHECK (class_year >= 1 AND class_year <= 8),
  ktu_email TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_document_url TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- 4. KAMPÜS DUYURULARI TABLOSU
-- ===================================================================
CREATE TABLE IF NOT EXISTS ktu_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'faculty', 'department', 'club', 'event', 'exam', 'academic')),
  faculty_id UUID REFERENCES ktu_faculties(id) ON DELETE SET NULL,
  department_id UUID REFERENCES ktu_departments(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_important BOOLEAN NOT NULL DEFAULT FALSE,
  attachment_url TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- 5. ÖĞRENCİ KULÜPLERİ TABLOSU (ÖNCE BUNU OLUŞTUR - ktu_events'te referans var)
-- ===================================================================
CREATE TABLE IF NOT EXISTS ktu_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  faculty_id UUID REFERENCES ktu_faculties(id) ON DELETE SET NULL,
  president_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- 6. ETKİNLİKLER TABLOSU (ktu_clubs'tan sonra - çünkü club_id referansı var)
-- ===================================================================
CREATE TABLE IF NOT EXISTS ktu_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'general' CHECK (event_type IN ('seminar', 'concert', 'sports', 'academic', 'social', 'club', 'general')),
  faculty_id UUID REFERENCES ktu_faculties(id) ON DELETE SET NULL,
  department_id UUID REFERENCES ktu_departments(id) ON DELETE SET NULL,
  club_id UUID REFERENCES ktu_clubs(id) ON DELETE SET NULL,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  image_url TEXT,
  max_attendees INTEGER,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  registration_required BOOLEAN NOT NULL DEFAULT FALSE,
  attendee_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- 7. KULÜP ÜYELERİ TABLOSU
-- ===================================================================
CREATE TABLE IF NOT EXISTS ktu_club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES ktu_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'board', 'president')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

-- ===================================================================
-- 8. ETKİNLİK KATILIMCILARI TABLOSU
-- ===================================================================
CREATE TABLE IF NOT EXISTS ktu_event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES ktu_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ===================================================================
-- 9. İNDEKSLER
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_ktu_students_user_id ON ktu_students(id);
CREATE INDEX IF NOT EXISTS idx_ktu_students_student_number ON ktu_students(student_number);
CREATE INDEX IF NOT EXISTS idx_ktu_students_faculty ON ktu_students(faculty_id);
CREATE INDEX IF NOT EXISTS idx_ktu_students_department ON ktu_students(department_id);
CREATE INDEX IF NOT EXISTS idx_ktu_students_verification ON ktu_students(verification_status);

CREATE INDEX IF NOT EXISTS idx_ktu_announcements_category ON ktu_announcements(category);
CREATE INDEX IF NOT EXISTS idx_ktu_announcements_faculty ON ktu_announcements(faculty_id);
CREATE INDEX IF NOT EXISTS idx_ktu_announcements_department ON ktu_announcements(department_id);
CREATE INDEX IF NOT EXISTS idx_ktu_announcements_created ON ktu_announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ktu_announcements_pinned ON ktu_announcements(is_pinned DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ktu_clubs_faculty ON ktu_clubs(faculty_id);
CREATE INDEX IF NOT EXISTS idx_ktu_clubs_active ON ktu_clubs(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ktu_events_start_date ON ktu_events(start_date);
CREATE INDEX IF NOT EXISTS idx_ktu_events_faculty ON ktu_events(faculty_id);
CREATE INDEX IF NOT EXISTS idx_ktu_events_department ON ktu_events(department_id);
CREATE INDEX IF NOT EXISTS idx_ktu_events_type ON ktu_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ktu_events_club ON ktu_events(club_id);

CREATE INDEX IF NOT EXISTS idx_ktu_club_members_club ON ktu_club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_ktu_club_members_user ON ktu_club_members(user_id);

CREATE INDEX IF NOT EXISTS idx_ktu_event_attendees_event ON ktu_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_ktu_event_attendees_user ON ktu_event_attendees(user_id);

-- ===================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Fakülteler: Herkes görebilir
ALTER TABLE ktu_faculties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Fakülteler herkese açık" ON ktu_faculties;
CREATE POLICY "Fakülteler herkese açık" ON ktu_faculties
  FOR SELECT USING (true);

-- Bölümler: Herkes görebilir
ALTER TABLE ktu_departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bölümler herkese açık" ON ktu_departments;
CREATE POLICY "Bölümler herkese açık" ON ktu_departments
  FOR SELECT USING (true);

-- Öğrenci bilgileri: Kendi bilgilerini görebilir, doğrulanmış öğrenciler diğerlerini görebilir
ALTER TABLE ktu_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Öğrenciler kendi bilgilerini görebilir" ON ktu_students;
CREATE POLICY "Öğrenciler kendi bilgilerini görebilir" ON ktu_students
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Doğrulanmış öğrenciler diğerlerini görebilir" ON ktu_students;
CREATE POLICY "Doğrulanmış öğrenciler diğerlerini görebilir" ON ktu_students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ktu_students
      WHERE id = auth.uid() AND verification_status = 'verified'
    )
  );

DROP POLICY IF EXISTS "Öğrenciler kendi bilgilerini güncelleyebilir" ON ktu_students;
CREATE POLICY "Öğrenciler kendi bilgilerini güncelleyebilir" ON ktu_students
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Öğrenciler kendi bilgilerini ekleyebilir" ON ktu_students;
CREATE POLICY "Öğrenciler kendi bilgilerini ekleyebilir" ON ktu_students
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Duyurular: Herkes görebilir, sadece admin/doğrulanmış öğrenciler ekleyebilir
ALTER TABLE ktu_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Duyurular herkese açık" ON ktu_announcements;
CREATE POLICY "Duyurular herkese açık" ON ktu_announcements
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin ve doğrulanmış öğrenciler duyuru ekleyebilir" ON ktu_announcements;
CREATE POLICY "Admin ve doğrulanmış öğrenciler duyuru ekleyebilir" ON ktu_announcements
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND (
      EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
      OR EXISTS (SELECT 1 FROM ktu_students WHERE id = auth.uid() AND verification_status = 'verified')
    )
  );

DROP POLICY IF EXISTS "Duyuru yazarı güncelleyebilir" ON ktu_announcements;
CREATE POLICY "Duyuru yazarı güncelleyebilir" ON ktu_announcements
  FOR UPDATE USING (auth.uid() = author_id);

-- Etkinlikler: Herkes görebilir, doğrulanmış öğrenciler ekleyebilir
ALTER TABLE ktu_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Etkinlikler herkese açık" ON ktu_events;
CREATE POLICY "Etkinlikler herkese açık" ON ktu_events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Doğrulanmış öğrenciler etkinlik ekleyebilir" ON ktu_events;
CREATE POLICY "Doğrulanmış öğrenciler etkinlik ekleyebilir" ON ktu_events
  FOR INSERT WITH CHECK (
    auth.uid() = organizer_id AND
    EXISTS (SELECT 1 FROM ktu_students WHERE id = auth.uid() AND verification_status = 'verified')
  );

DROP POLICY IF EXISTS "Etkinlik düzenleyicisi güncelleyebilir" ON ktu_events;
CREATE POLICY "Etkinlik düzenleyicisi güncelleyebilir" ON ktu_events
  FOR UPDATE USING (auth.uid() = organizer_id);

-- Kulüpler: Herkes görebilir
ALTER TABLE ktu_clubs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Kulüpler herkese açık" ON ktu_clubs;
CREATE POLICY "Kulüpler herkese açık" ON ktu_clubs
  FOR SELECT USING (true);

-- Kulüp üyeleri: Üyeler görebilir
ALTER TABLE ktu_club_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Kulüp üyeleri görebilir" ON ktu_club_members;
CREATE POLICY "Kulüp üyeleri görebilir" ON ktu_club_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM ktu_club_members WHERE club_id = ktu_club_members.club_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Doğrulanmış öğrenciler kulübe katılabilir" ON ktu_club_members;
CREATE POLICY "Doğrulanmış öğrenciler kulübe katılabilir" ON ktu_club_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM ktu_students WHERE id = auth.uid() AND verification_status = 'verified')
  );

-- Etkinlik katılımcıları: Herkes görebilir, doğrulanmış öğrenciler katılabilir
ALTER TABLE ktu_event_attendees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Etkinlik katılımcıları herkese açık" ON ktu_event_attendees;
CREATE POLICY "Etkinlik katılımcıları herkese açık" ON ktu_event_attendees
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Doğrulanmış öğrenciler etkinliğe katılabilir" ON ktu_event_attendees;
CREATE POLICY "Doğrulanmış öğrenciler etkinliğe katılabilir" ON ktu_event_attendees
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM ktu_students WHERE id = auth.uid() AND verification_status = 'verified')
  );

-- ===================================================================
-- 11. TRIGGER'LAR
-- ===================================================================

-- Updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_ktu_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ktu_faculties_updated_at
  BEFORE UPDATE ON ktu_faculties
  FOR EACH ROW
  EXECUTE FUNCTION update_ktu_updated_at();

CREATE TRIGGER ktu_departments_updated_at
  BEFORE UPDATE ON ktu_departments
  FOR EACH ROW
  EXECUTE FUNCTION update_ktu_updated_at();

CREATE TRIGGER ktu_students_updated_at
  BEFORE UPDATE ON ktu_students
  FOR EACH ROW
  EXECUTE FUNCTION update_ktu_updated_at();

CREATE TRIGGER ktu_announcements_updated_at
  BEFORE UPDATE ON ktu_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_ktu_updated_at();

CREATE TRIGGER ktu_events_updated_at
  BEFORE UPDATE ON ktu_events
  FOR EACH ROW
  EXECUTE FUNCTION update_ktu_updated_at();

CREATE TRIGGER ktu_clubs_updated_at
  BEFORE UPDATE ON ktu_clubs
  FOR EACH ROW
  EXECUTE FUNCTION update_ktu_updated_at();

-- Kulüp üye sayısı güncelleme
CREATE OR REPLACE FUNCTION update_club_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ktu_clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ktu_clubs SET member_count = member_count - 1 WHERE id = OLD.club_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ktu_club_members_count
  AFTER INSERT OR DELETE ON ktu_club_members
  FOR EACH ROW
  EXECUTE FUNCTION update_club_member_count();

-- Etkinlik katılımcı sayısı güncelleme
CREATE OR REPLACE FUNCTION update_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ktu_events SET attendee_count = attendee_count + 1 WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ktu_events SET attendee_count = attendee_count - 1 WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ktu_event_attendees_count
  AFTER INSERT OR DELETE ON ktu_event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION update_event_attendee_count();

-- Duyuru görüntülenme sayısı (manuel artırılacak, trigger yok)

-- ===================================================================
-- 12. VARSayılan VERİLER (KTÜ Fakülteler ve Bölümler)
-- ===================================================================

-- Fakülteler
INSERT INTO ktu_faculties (name, code, description) VALUES
  ('Mühendislik Fakültesi', 'MUH', 'Karadeniz Teknik Üniversitesi Mühendislik Fakültesi'),
  ('Fen Fakültesi', 'FEN', 'Karadeniz Teknik Üniversitesi Fen Fakültesi'),
  ('İktisadi ve İdari Bilimler Fakültesi', 'IIBF', 'Karadeniz Teknik Üniversitesi İİBF'),
  ('Mimarlık Fakültesi', 'MIM', 'Karadeniz Teknik Üniversitesi Mimarlık Fakültesi'),
  ('Orman Fakültesi', 'ORM', 'Karadeniz Teknik Üniversitesi Orman Fakültesi'),
  ('Tıp Fakültesi', 'TIP', 'Karadeniz Teknik Üniversitesi Tıp Fakültesi'),
  ('Eğitim Fakültesi', 'EGT', 'Karadeniz Teknik Üniversitesi Eğitim Fakültesi'),
  ('Güzel Sanatlar Fakültesi', 'GSF', 'Karadeniz Teknik Üniversitesi Güzel Sanatlar Fakültesi')
ON CONFLICT (code) DO NOTHING;

-- Mühendislik Fakültesi Bölümleri
INSERT INTO ktu_departments (faculty_id, name, code, description)
SELECT f.id, d.name, d.code, d.description
FROM (VALUES
  ('Bilgisayar Mühendisliği', 'BIL'),
  ('Elektrik-Elektronik Mühendisliği', 'ELE'),
  ('Makine Mühendisliği', 'MAK'),
  ('İnşaat Mühendisliği', 'INS'),
  ('Endüstri Mühendisliği', 'END'),
  ('Kimya Mühendisliği', 'KIM'),
  ('Jeoloji Mühendisliği', 'JEO'),
  ('Maden Mühendisliği', 'MAD'),
  ('Harita Mühendisliği', 'HAR')
) AS d(name, code)
CROSS JOIN (SELECT id FROM ktu_faculties WHERE code = 'MUH') AS f
ON CONFLICT (faculty_id, code) DO NOTHING;

-- Fen Fakültesi Bölümleri
INSERT INTO ktu_departments (faculty_id, name, code, description)
SELECT f.id, d.name, d.code, d.description
FROM ktu_faculties f,
(VALUES
  ('Matematik', 'MAT'),
  ('Fizik', 'FIZ'),
  ('Kimya', 'KIM'),
  ('Biyoloji', 'BIO'),
  ('İstatistik', 'IST')
) AS d(name, code)
CROSS JOIN (SELECT id FROM ktu_faculties WHERE code = 'FEN') AS f
ON CONFLICT (faculty_id, code) DO NOTHING;

-- İİBF Bölümleri
INSERT INTO ktu_departments (faculty_id, name, code, description)
SELECT f.id, d.name, d.code, d.description
FROM ktu_faculties f,
(VALUES
  ('İşletme', 'ISL'),
  ('İktisat', 'IKT'),
  ('Maliye', 'MAL'),
  ('Siyaset Bilimi ve Kamu Yönetimi', 'SBK')
) AS d(name, code)
CROSS JOIN (SELECT id FROM ktu_faculties WHERE code = 'IIBF') AS f
ON CONFLICT (faculty_id, code) DO NOTHING;

-- ===================================================================
-- ✅ KTÜ SİSTEMİ KURULUMU TAMAMLANDI!
-- ===================================================================
-- 
-- Oluşturulan Tablolar:
-- ✅ ktu_faculties - Fakülteler
-- ✅ ktu_departments - Bölümler
-- ✅ ktu_students - Öğrenci bilgileri
-- ✅ ktu_announcements - Duyurular
-- ✅ ktu_events - Etkinlikler
-- ✅ ktu_clubs - Öğrenci kulüpleri
-- ✅ ktu_club_members - Kulüp üyeleri
-- ✅ ktu_event_attendees - Etkinlik katılımcıları
-- 
-- RLS Policies: ✅ Güvenlik sağlandı
-- Indexes: ✅ Performans optimizasyonu
-- Triggers: ✅ Otomatik güncellemeler
-- Default Data: ✅ Fakülteler ve bölümler eklendi
-- 
-- 🚀 HAZIR!
-- ===================================================================

