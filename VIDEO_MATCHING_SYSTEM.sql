-- ============================================
-- GÖRÜNTÜLÜ EŞLEŞME SİSTEMİ - TAM SQL
-- ============================================
-- Hızlı görüntülü eşleşme sistemi için gerekli tablolar
-- ============================================

-- ============================================
-- 1. MATCH SESSIONS (Eşleşme Oturumları)
-- ============================================

CREATE TABLE IF NOT EXISTS match_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  agora_token TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  disconnect_reason TEXT CHECK (disconnect_reason IN ('next', 'timeout', 'network', 'report', 'mutual_continue')),
  user1_next BOOLEAN DEFAULT false,
  user2_next BOOLEAN DEFAULT false,
  user1_video_enabled BOOLEAN DEFAULT true,
  user2_video_enabled BOOLEAN DEFAULT true,
  user1_audio_enabled BOOLEAN DEFAULT true,
  user2_audio_enabled BOOLEAN DEFAULT true,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_match_sessions_user1 ON match_sessions(user1_id);
CREATE INDEX IF NOT EXISTS idx_match_sessions_user2 ON match_sessions(user2_id);
CREATE INDEX IF NOT EXISTS idx_match_sessions_started_at ON match_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_sessions_channel_name ON match_sessions(channel_name);

-- ============================================
-- 2. WAITING QUEUE (Bekleme Kuyruğu)
-- ============================================

CREATE TABLE IF NOT EXISTS waiting_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  city TEXT,
  district TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waiting_queue_user_id ON waiting_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_waiting_queue_gender ON waiting_queue(gender);
CREATE INDEX IF NOT EXISTS idx_waiting_queue_active ON waiting_queue(is_active, gender, joined_at);
CREATE INDEX IF NOT EXISTS idx_waiting_queue_expires ON waiting_queue(expires_at);

-- Unique constraint: Bir kullanıcı aynı anda sadece bir kez kuyrukta olabilir
CREATE UNIQUE INDEX IF NOT EXISTS idx_waiting_queue_unique_user 
ON waiting_queue(user_id) 
WHERE is_active = true;

-- ============================================
-- 3. MATCH REPORTS (Şikayetler)
-- ============================================

CREATE TABLE IF NOT EXISTS match_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_session_id UUID REFERENCES match_sessions(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate', 'harassment', 'spam', 'fake', 'other')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_match_reports_reporter ON match_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_match_reports_reported ON match_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_match_reports_session ON match_reports(match_session_id);
CREATE INDEX IF NOT EXISTS idx_match_reports_created_at ON match_reports(created_at DESC);

-- ============================================
-- 4. USER MATCH LIMITS (Günlük Limitler)
-- ============================================

CREATE TABLE IF NOT EXISTS user_match_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_matches INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  total_matches INTEGER DEFAULT 0,
  is_restricted BOOLEAN DEFAULT false,
  restriction_reason TEXT,
  restriction_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. FUNCTIONS
-- ============================================

-- Günlük limitleri sıfırla
CREATE OR REPLACE FUNCTION reset_daily_match_limits()
RETURNS void AS $$
BEGIN
  UPDATE user_match_limits
  SET daily_matches = 0, last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Kullanıcının günlük limitini kontrol et
CREATE OR REPLACE FUNCTION check_user_match_limit(p_user_id UUID, p_daily_limit INTEGER DEFAULT 50)
RETURNS BOOLEAN AS $$
DECLARE
  v_daily_matches INTEGER;
  v_last_reset DATE;
  v_is_restricted BOOLEAN;
BEGIN
  -- Kısıtlama kontrolü
  SELECT is_restricted, restriction_until INTO v_is_restricted
  FROM user_match_limits
  WHERE user_id = p_user_id;
  
  IF v_is_restricted AND (restriction_until IS NULL OR restriction_until > NOW()) THEN
    RETURN false;
  END IF;
  
  -- Günlük limit kontrolü
  SELECT daily_matches, last_reset_date INTO v_daily_matches, v_last_reset
  FROM user_match_limits
  WHERE user_id = p_user_id;
  
  -- Eğer kayıt yoksa oluştur
  IF v_daily_matches IS NULL THEN
    INSERT INTO user_match_limits (user_id, daily_matches, last_reset_date)
    VALUES (p_user_id, 0, CURRENT_DATE)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN true;
  END IF;
  
  -- Eğer bugün değilse sıfırla
  IF v_last_reset < CURRENT_DATE THEN
    UPDATE user_match_limits
    SET daily_matches = 0, last_reset_date = CURRENT_DATE
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;
  
  -- Limit kontrolü
  RETURN v_daily_matches < p_daily_limit;
END;
$$ LANGUAGE plpgsql;

-- Günlük limiti artır
CREATE OR REPLACE FUNCTION increment_daily_match_limit(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_match_limits (user_id, daily_matches, total_matches)
  VALUES (p_user_id, 1, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    daily_matches = user_match_limits.daily_matches + 1,
    total_matches = user_match_limits.total_matches + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Bekleme kuyruğundan eşleşme bul
CREATE OR REPLACE FUNCTION find_match(
  p_user_id UUID,
  p_gender TEXT,
  p_city TEXT DEFAULT NULL,
  p_district TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_match_user_id UUID;
  v_match_id UUID;
  v_channel_name TEXT;
BEGIN
  -- Önce aynı şehir/ilçeden ara
  SELECT user_id INTO v_match_user_id
  FROM waiting_queue
  WHERE is_active = true
    AND user_id != p_user_id
    AND gender != p_gender
    AND expires_at > NOW()
    AND (p_city IS NULL OR city = p_city)
    AND (p_district IS NULL OR district = p_district)
  ORDER BY joined_at ASC
  LIMIT 1;
  
  -- Bulamazsa şehir filtresini kaldır
  IF v_match_user_id IS NULL THEN
    SELECT user_id INTO v_match_user_id
    FROM waiting_queue
    WHERE is_active = true
      AND user_id != p_user_id
      AND gender != p_gender
      AND expires_at > NOW()
    ORDER BY joined_at ASC
    LIMIT 1;
  END IF;
  
  -- Eşleşme bulunduysa
  IF v_match_user_id IS NOT NULL THEN
    -- Kanal adı oluştur
    v_channel_name := 'match_' || LEAST(p_user_id::text, v_match_user_id::text) || '_' || GREATEST(p_user_id::text, v_match_user_id::text);
    
    -- Match session oluştur
    INSERT INTO match_sessions (user1_id, user2_id, channel_name)
    VALUES (p_user_id, v_match_user_id, v_channel_name)
    RETURNING id INTO v_match_id;
    
    -- Her iki kullanıcıyı da kuyruktan çıkar
    UPDATE waiting_queue
    SET is_active = false
    WHERE user_id IN (p_user_id, v_match_user_id) AND is_active = true;
    
    RETURN v_match_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Kuyruğa ekle
CREATE OR REPLACE FUNCTION join_waiting_queue(
  p_user_id UUID,
  p_gender TEXT,
  p_city TEXT DEFAULT NULL,
  p_district TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
BEGIN
  -- Önce mevcut aktif kaydı kaldır
  UPDATE waiting_queue
  SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;
  
  -- Yeni kayıt ekle
  INSERT INTO waiting_queue (user_id, gender, city, district, expires_at)
  VALUES (p_user_id, p_gender, p_city, p_district, NOW() + INTERVAL '5 minutes')
  RETURNING id INTO v_queue_id;
  
  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Kuyruktan çıkar
CREATE OR REPLACE FUNCTION leave_waiting_queue(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE waiting_queue
  SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Süresi dolmuş kuyruk kayıtlarını temizle
CREATE OR REPLACE FUNCTION cleanup_expired_queue()
RETURNS void AS $$
BEGIN
  UPDATE waiting_queue
  SET is_active = false
  WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_match_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_match_sessions_updated_at
  BEFORE UPDATE ON match_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_match_sessions_updated_at();

-- Match session bitince süreyi hesapla
CREATE OR REPLACE FUNCTION calculate_match_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_match_duration_trigger
  BEFORE UPDATE ON match_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_match_duration();

-- ============================================
-- 7. RLS POLICIES
-- ============================================

-- Match Sessions
ALTER TABLE match_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own match sessions" ON match_sessions;
CREATE POLICY "Users can view their own match sessions" ON match_sessions
  FOR SELECT
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own match sessions" ON match_sessions;
CREATE POLICY "Users can insert their own match sessions" ON match_sessions
  FOR INSERT
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own match sessions" ON match_sessions;
CREATE POLICY "Users can update their own match sessions" ON match_sessions
  FOR UPDATE
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- Waiting Queue
ALTER TABLE waiting_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view waiting queue" ON waiting_queue;
CREATE POLICY "Users can view waiting queue" ON waiting_queue
  FOR SELECT
  USING (true); -- Herkes görebilir (eşleşme için gerekli)

DROP POLICY IF EXISTS "Users can insert themselves to queue" ON waiting_queue;
CREATE POLICY "Users can insert themselves to queue" ON waiting_queue
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own queue entry" ON waiting_queue;
CREATE POLICY "Users can update their own queue entry" ON waiting_queue
  FOR UPDATE
  USING (user_id = auth.uid());

-- Match Reports
ALTER TABLE match_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reports" ON match_reports;
CREATE POLICY "Users can view their own reports" ON match_reports
  FOR SELECT
  USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users can create reports" ON match_reports;
CREATE POLICY "Users can create reports" ON match_reports
  FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- User Match Limits
ALTER TABLE user_match_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own limits" ON user_match_limits;
CREATE POLICY "Users can view their own limits" ON user_match_limits
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- 8. CLEANUP JOB (Süresi dolmuş kayıtları temizle)
-- ============================================

-- Bu fonksiyon periyodik olarak çalıştırılmalı (cron job veya Edge Function)
-- Şimdilik manuel çalıştırılabilir

-- ============================================
-- SONUÇ
-- ============================================
-- ✅ match_sessions tablosu oluşturuldu
-- ✅ waiting_queue tablosu oluşturuldu
-- ✅ match_reports tablosu oluşturuldu
-- ✅ user_match_limits tablosu oluşturuldu
-- ✅ Tüm fonksiyonlar oluşturuldu
-- ✅ RLS policy'leri eklendi
-- ============================================

