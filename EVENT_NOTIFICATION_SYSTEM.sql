-- ============================================
-- OLAY VAR BİLDİRİM SİSTEMİ - TAM SQL
-- ============================================
-- Trabzon'a özel anlık olay bildirim sistemi
-- ============================================

-- ============================================
-- 1. EVENTS (Olaylar) TABLOSU
-- ============================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'trafik', 'kaza', 'mac_hareketlendi', 'sahil_kalabalik', 
    'firtina_yagmur', 'etkinlik', 'konser', 'polis_kontrol', 
    'pazar_yogunlugu', 'kampanya_indirim', 'güvenlik', 'yol_kapanmasi',
    'sel_riski', 'ciddi_olay', 'normal_trafik', 'esnaf_duyuru'
  )),
  severity TEXT NOT NULL DEFAULT 'NORMAL' CHECK (severity IN ('CRITICAL', 'HIGH', 'NORMAL', 'LOW')),
  district TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Trabzon' CHECK (city IN ('Trabzon', 'Giresun')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  media_urls TEXT[], -- Fotoğraf/video URL'leri
  audio_url TEXT, -- Sesli olay için
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false, -- Admin onayı
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. EVENT LIKES TABLE
CREATE TABLE IF NOT EXISTS event_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Helpers for like counters
CREATE OR REPLACE FUNCTION increment_event_likes(event_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE events
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = event_id_param;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_event_likes(event_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE events
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
  WHERE id = event_id_param;
END;
$$ LANGUAGE plpgsql;

-- Eğer tablo zaten varsa ve eksik kolonları ekle
DO $$ 
BEGIN
  -- severity kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'severity'
  ) THEN
    ALTER TABLE events ADD COLUMN severity TEXT NOT NULL DEFAULT 'NORMAL' 
      CHECK (severity IN ('CRITICAL', 'HIGH', 'NORMAL', 'LOW'));
  END IF;
  
  -- expires_at kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE events ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours');
  END IF;
  
  -- media_urls kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'media_urls'
  ) THEN
    ALTER TABLE events ADD COLUMN media_urls TEXT[];
  END IF;
  
  -- audio_url kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'audio_url'
  ) THEN
    ALTER TABLE events ADD COLUMN audio_url TEXT;
  END IF;
  
  -- upvotes kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'upvotes'
  ) THEN
    ALTER TABLE events ADD COLUMN upvotes INTEGER DEFAULT 0;
  END IF;
  
  -- downvotes kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'downvotes'
  ) THEN
    ALTER TABLE events ADD COLUMN downvotes INTEGER DEFAULT 0;
  END IF;
  
  -- is_verified kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE events ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
  
  -- latitude kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE events ADD COLUMN latitude DOUBLE PRECISION;
  END IF;
  
  -- longitude kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE events ADD COLUMN longitude DOUBLE PRECISION;
  END IF;
  
  -- is_active kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE events ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  
  -- is_deleted kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE events ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;
  
  -- updated_at kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE events ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Indexes (kolonlar eklendikten sonra)
CREATE INDEX IF NOT EXISTS idx_events_district ON events(district);
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events(expires_at);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- category index'i için kontrol
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'category'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
  END IF;
END $$;

-- is_active ve is_deleted index'i için kontrol
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' 
    AND column_name = 'is_active'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'events' AND column_name = 'is_deleted'
    )
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active, is_deleted) 
      WHERE is_active = true AND is_deleted = false;
  END IF;
END $$;

-- Severity index'i için kontrol (eğer kolon varsa index oluştur)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'severity'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);
  END IF;
END $$;

-- ============================================
-- 2. NOTIFICATIONS (Bildirimler) TABLOSU
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('EVENT', 'SYSTEM', 'MESSAGE', 'RESERVATION', 'FOOTBALL')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB, -- Ek veri (event_id, match_id, reservation_id vs.)
  read_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  push_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Eğer notifications tablosu zaten varsa ve eksik kolonları ekle
DO $$ 
BEGIN
  -- read_at kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN read_at TIMESTAMPTZ;
  END IF;
  
  -- is_deleted kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE notifications ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;
  
  -- push_sent kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'push_sent'
  ) THEN
    ALTER TABLE notifications ADD COLUMN push_sent BOOLEAN DEFAULT false;
  END IF;
  
  -- data kolonu (JSONB)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'data'
  ) THEN
    ALTER TABLE notifications ADD COLUMN data JSONB;
  END IF;
  
  -- event_id kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- read_at index'i için kontrol
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'read_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at) 
      WHERE read_at IS NULL;
  END IF;
END $$;

-- Unread notifications index'i için kontrol
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'is_deleted'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'read_at'
    )
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_deleted, read_at) 
      WHERE is_deleted = false AND read_at IS NULL;
  END IF;
END $$;

-- ============================================
-- 3. USER_PUSH_TOKENS (Push Token'ları)
-- ============================================

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  device_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON user_push_tokens(user_id, is_active) WHERE is_active = true;

-- ============================================
-- 4. EVENT_VOTES (Olay Onaylama Sistemi)
-- ============================================

CREATE TABLE IF NOT EXISTS event_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote', 'remove')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_votes_event_id ON event_votes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_votes_user_id ON event_votes(user_id);

-- ============================================
-- 5. USER_INTERESTS (Kullanıcı İlgi Alanları)
-- ============================================

CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  weight INTEGER DEFAULT 1, -- İlgi ağırlığı (1-10)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Eğer user_interests tablosu zaten varsa ve eksik kolonları ekle
DO $$ 
BEGIN
  -- category kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_interests' AND column_name = 'category'
  ) THEN
    ALTER TABLE user_interests ADD COLUMN category TEXT NOT NULL DEFAULT '';
  END IF;
  
  -- weight kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_interests' AND column_name = 'weight'
  ) THEN
    ALTER TABLE user_interests ADD COLUMN weight INTEGER DEFAULT 1;
  END IF;
  
  -- created_at kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_interests' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE user_interests ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);

-- category index'i için kontrol
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_interests' AND column_name = 'category'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_user_interests_category ON user_interests(category);
  END IF;
END $$;

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Events: Herkes görebilir, kendi olaylarını yönetebilir
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
CREATE POLICY "Events are viewable by everyone" ON events
  FOR SELECT
  USING (is_deleted = false AND is_active = true AND expires_at > NOW());

DROP POLICY IF EXISTS "Users can create events" ON events;
CREATE POLICY "Users can create events" ON events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own events" ON events;
CREATE POLICY "Users can update their own events" ON events
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own events" ON events;
CREATE POLICY "Users can delete their own events" ON events
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Notifications: Kullanıcılar sadece kendi bildirimlerini görebilir
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT
  USING (auth.uid() = user_id AND is_deleted = false);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- User Push Tokens: Kullanıcılar sadece kendi token'larını yönetebilir
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own push tokens" ON user_push_tokens;
CREATE POLICY "Users can view their own push tokens" ON user_push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own push tokens" ON user_push_tokens;
CREATE POLICY "Users can insert their own push tokens" ON user_push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own push tokens" ON user_push_tokens;
CREATE POLICY "Users can update their own push tokens" ON user_push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own push tokens" ON user_push_tokens;
CREATE POLICY "Users can delete their own push tokens" ON user_push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Event Votes: Herkes oy verebilir
ALTER TABLE event_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view event votes" ON event_votes;
CREATE POLICY "Users can view event votes" ON event_votes
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own votes" ON event_votes;
CREATE POLICY "Users can insert their own votes" ON event_votes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own votes" ON event_votes;
CREATE POLICY "Users can update their own votes" ON event_votes
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own votes" ON event_votes;
CREATE POLICY "Users can delete their own votes" ON event_votes
  FOR DELETE
  USING (auth.uid() = user_id);

-- User Interests: Kullanıcılar kendi ilgi alanlarını yönetebilir
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own interests" ON user_interests;
CREATE POLICY "Users can view their own interests" ON user_interests
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own interests" ON user_interests;
CREATE POLICY "Users can insert their own interests" ON user_interests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own interests" ON user_interests;
CREATE POLICY "Users can update their own interests" ON user_interests
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own interests" ON user_interests;
CREATE POLICY "Users can delete their own interests" ON user_interests
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Kullanıcının okunmamış bildirim sayısını döndür
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id
      AND is_deleted = false
      AND read_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Olay için oy sayısını güncelle
CREATE OR REPLACE FUNCTION update_event_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'upvote' THEN
      UPDATE events SET upvotes = upvotes + 1 WHERE id = NEW.event_id;
    ELSIF NEW.vote_type = 'downvote' THEN
      UPDATE events SET downvotes = downvotes + 1 WHERE id = NEW.event_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Eski oyu geri al
    IF OLD.vote_type = 'upvote' THEN
      UPDATE events SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.event_id;
    ELSIF OLD.vote_type = 'downvote' THEN
      UPDATE events SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = OLD.event_id;
    END IF;
    -- Yeni oyu ekle
    IF NEW.vote_type = 'upvote' THEN
      UPDATE events SET upvotes = upvotes + 1 WHERE id = NEW.event_id;
    ELSIF NEW.vote_type = 'downvote' THEN
      UPDATE events SET downvotes = downvotes + 1 WHERE id = NEW.event_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'upvote' THEN
      UPDATE events SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.event_id;
    ELSIF OLD.vote_type = 'downvote' THEN
      UPDATE events SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = OLD.event_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS event_votes_trigger ON event_votes;
CREATE TRIGGER event_votes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON event_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_event_votes();

-- Süresi dolan olayları otomatik pasif yap
CREATE OR REPLACE FUNCTION expire_old_events()
RETURNS void AS $$
BEGIN
  UPDATE events
  SET is_active = false
  WHERE expires_at < NOW()
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE ON events TO authenticated;
GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_push_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_interests TO authenticated;

-- ============================================
-- TAMAMLANDI
-- ============================================
-- Bu SQL kodu çalıştırıldıktan sonra:
-- 1. events tablosu oluşturulmuş olacak
-- 2. notifications tablosu oluşturulmuş olacak
-- 3. user_push_tokens tablosu oluşturulmuş olacak
-- 4. event_votes tablosu oluşturulmuş olacak
-- 5. user_interests tablosu oluşturulmuş olacak
-- 6. RLS politikaları aktif olacak
-- 7. Helper fonksiyonlar kullanılabilir olacak
-- 
-- Test için:
-- SELECT * FROM events LIMIT 10;
-- SELECT get_unread_notification_count('user-uuid-here');
-- SELECT * FROM notifications WHERE user_id = 'user-uuid-here' AND is_deleted = false ORDER BY created_at DESC;

