-- ============================================
-- KRİTİK SORUNLARI DÜZELTME SQL
-- ============================================

-- 1. POST GÖRÜNÜRLÜĞÜ SORUNU
-- Tüm public post'lar herkes tarafından görülebilmeli
DROP POLICY IF EXISTS "Posts are viewable based on visibility" ON posts;
DROP POLICY IF EXISTS "Posts viewable by everyone" ON posts;

CREATE POLICY "Posts are viewable based on visibility" ON posts
  FOR SELECT USING (
    is_deleted = false
    AND (
      visibility = 'public' 
      OR author_id = auth.uid()
      OR (visibility = 'friends' AND author_id = auth.uid())
    )
  );

-- 2. KULLANICI ARAMA SORUNU
-- profiles tablosunda arama yapılabilmeli
-- Zaten getAllUsers query'sinde yapılıyor, sadece RLS kontrol ediyoruz

-- 3. POST PAYLAŞIM SORUNU
-- Paylaşılan post'lar görülebilmeli
-- post_shares tablosu için RLS policy
DROP POLICY IF EXISTS "Post shares are viewable" ON post_shares;
CREATE POLICY "Post shares are viewable" ON post_shares
  FOR SELECT USING (true);

-- 4. KULLANICI LİSTESİ SORUNU
-- Tüm kullanıcılar görülebilmeli (privacy ayarlarına göre)
-- profiles tablosu için RLS policy zaten var, kontrol ediyoruz
DROP POLICY IF EXISTS "Profiles are viewable" ON profiles;
CREATE POLICY "Profiles are viewable" ON profiles
  FOR SELECT USING (
    -- Herkes kendi profilini görebilir
    id = auth.uid()
    -- VEYA privacy ayarlarına göre görülebilir
    OR (
      (privacy_settings->>'profileVisible' IS NULL OR privacy_settings->>'profileVisible' = 'true')
      AND (privacy_settings->>'profileVisibility' IS NULL OR privacy_settings->>'profileVisibility' != 'private')
    )
  );

-- 5. EŞLEŞME SİSTEMİ SORUNU
-- match_sessions ve waiting_queue tabloları için RLS policy (tablolar varsa)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'match_sessions') THEN
    DROP POLICY IF EXISTS "Match sessions are viewable" ON match_sessions;
    CREATE POLICY "Match sessions are viewable" ON match_sessions
      FOR SELECT USING (
        user1_id = auth.uid() OR user2_id = auth.uid()
      );
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'waiting_queue') THEN
    DROP POLICY IF EXISTS "Waiting queue is viewable" ON waiting_queue;
    CREATE POLICY "Waiting queue is viewable" ON waiting_queue
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- 6. GRUP POSTLARI SORUNU
-- Grup post'ları grup üyeleri görebilmeli
-- Zaten room_id kontrolü var, sadece RLS güncelliyoruz
DROP POLICY IF EXISTS "Group posts are viewable" ON posts;
-- Yukarıdaki policy zaten grup post'larını da kapsıyor

-- 7. MESAJ GÖNDERME SORUNU
-- chat_rooms ve chat_members için RLS policy zaten var
-- Sadece kontrol ediyoruz

-- 8. ETKİNLİKLER VE DUYURULAR
-- ktu_announcements ve ktu_events için RLS policy (tablolar varsa)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ktu_announcements') THEN
    DROP POLICY IF EXISTS "KTU announcements are viewable" ON ktu_announcements;
    CREATE POLICY "KTU announcements are viewable" ON ktu_announcements
      FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ktu_events') THEN
    DROP POLICY IF EXISTS "KTU events are viewable" ON ktu_events;
    CREATE POLICY "KTU events are viewable" ON ktu_events
      FOR SELECT USING (true);
  END IF;
END $$;

-- 9. HALI SAHA MAÇLARI
-- matches tablosu için RLS policy (football_matches değil, matches) - tablo varsa
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'matches') THEN
    DROP POLICY IF EXISTS "Football matches are viewable" ON matches;
    CREATE POLICY "Football matches are viewable" ON matches
      FOR SELECT USING (true);
  END IF;
END $$;

-- 10. GRUPLAR
-- chat_rooms için RLS policy (zaten var, kontrol ediyoruz)
DROP POLICY IF EXISTS "Chat rooms are viewable" ON chat_rooms;
CREATE POLICY "Chat rooms are viewable" ON chat_rooms
  FOR SELECT USING (
    -- Kendi oluşturduğun grupları görebilirsin
    created_by = auth.uid()
    -- VEYA grup üyesiysen görebilirsin
    OR EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_rooms.id
      AND chat_members.user_id = auth.uid()
    )
  );

-- ============================================
-- INDEX'LER (PERFORMANS İÇİN)
-- ============================================

-- Post görünürlüğü için index
CREATE INDEX IF NOT EXISTS idx_posts_visibility_deleted ON posts(visibility, is_deleted) WHERE is_deleted = false;

-- Kullanıcı arama için index
CREATE INDEX IF NOT EXISTS idx_profiles_search ON profiles USING gin(to_tsvector('turkish', coalesce(full_name, '') || ' ' || coalesce(username, '') || ' ' || coalesce(bio, '')));

-- Eşleşme sistemi için index (tablolar varsa)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'match_sessions') THEN
    CREATE INDEX IF NOT EXISTS idx_match_sessions_users ON match_sessions(user1_id, user2_id);
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'waiting_queue') THEN
    CREATE INDEX IF NOT EXISTS idx_waiting_queue_user ON waiting_queue(user_id) WHERE is_active = true;
  END IF;
END $$;

-- ============================================
-- ANALYZE (QUERY OPTIMIZER İÇİN)
-- ============================================
-- Sadece mevcut tablolar için ANALYZE çalıştır

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
    ANALYZE posts;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    ANALYZE profiles;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'match_sessions') THEN
    ANALYZE match_sessions;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'waiting_queue') THEN
    ANALYZE waiting_queue;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_rooms') THEN
    ANALYZE chat_rooms;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_members') THEN
    ANALYZE chat_members;
  END IF;
END $$;
