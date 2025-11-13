-- ============================================
-- MYTRABZON - COMPLETE ERROR FIX
-- ============================================
-- Bu dosya tüm hataları düzeltir:
-- 1. Table isim uyumsuzluğu (user_profiles -> profiles)
-- 2. Profile oluşturma sorunu
-- 3. Chat relationship hatası
-- 4. Public ID sistemi
-- ============================================

-- ============================================
-- 1. ÖNCE MEVCUT YAPILARI KONTROL ET
-- ============================================

-- Mevcut user_profiles tablosu varsa profiles'a dönüştür
DO $$
BEGIN
  -- Eğer user_profiles var ve profiles yoksa, rename et
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') 
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    
    -- Önce RLS'i kapat
    ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
    
    -- Foreign key'leri drop et
    ALTER TABLE IF EXISTS posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
    ALTER TABLE IF EXISTS chat_members DROP CONSTRAINT IF EXISTS chat_members_user_id_fkey;
    ALTER TABLE IF EXISTS chat_rooms DROP CONSTRAINT IF EXISTS chat_rooms_created_by_fkey;
    ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
    ALTER TABLE IF EXISTS follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
    ALTER TABLE IF EXISTS follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;
    ALTER TABLE IF EXISTS blocked_users DROP CONSTRAINT IF EXISTS blocked_users_blocker_id_fkey;
    ALTER TABLE IF EXISTS blocked_users DROP CONSTRAINT IF EXISTS blocked_users_blocked_id_fkey;
    ALTER TABLE IF EXISTS post_likes DROP CONSTRAINT IF EXISTS post_likes_user_id_fkey;
    ALTER TABLE IF EXISTS comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
    ALTER TABLE IF EXISTS comment_likes DROP CONSTRAINT IF EXISTS comment_likes_user_id_fkey;
    ALTER TABLE IF EXISTS message_reactions DROP CONSTRAINT IF EXISTS message_reactions_user_id_fkey;
    ALTER TABLE IF EXISTS reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
    ALTER TABLE IF EXISTS reports DROP CONSTRAINT IF EXISTS reports_reported_user_id_fkey;
    ALTER TABLE IF EXISTS user_badges DROP CONSTRAINT IF EXISTS user_badges_user_id_fkey;
    
    -- Tabloyu yeniden adlandır
    ALTER TABLE user_profiles RENAME TO profiles;
    
    -- Index'leri güncelle
    ALTER INDEX IF EXISTS idx_user_profiles_district RENAME TO idx_profiles_district;
    ALTER INDEX IF EXISTS idx_user_profiles_email RENAME TO idx_profiles_email;
    ALTER INDEX IF EXISTS idx_user_profiles_deletion RENAME TO idx_profiles_deletion;
    
    -- Trigger'ı güncelle
    DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON profiles;
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    
  END IF;
END $$;

-- ============================================
-- 2. PROFILES TABLOSUNU TAM YAP
-- ============================================

-- Eğer profiles tablosu yoksa oluştur
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  public_id TEXT UNIQUE,
  full_name TEXT NOT NULL DEFAULT 'Kullanıcı',
  avatar_url TEXT,
  bio TEXT,
  
  -- Lokasyon bilgileri
  district TEXT NOT NULL DEFAULT 'Ortahisar',
  city TEXT,
  address TEXT,
  
  -- Kişisel bilgiler
  phone TEXT,
  date_of_birth DATE,
  age INTEGER,
  gender TEXT,
  height INTEGER,
  weight INTEGER,
  
  -- Sosyal medya
  social_media JSONB DEFAULT '{}'::jsonb,
  
  -- Gizlilik ayarları
  privacy_settings JSONB DEFAULT '{
    "show_age": true,
    "show_gender": true,
    "show_phone": true,
    "show_email": true,
    "show_address": true,
    "show_height": true,
    "show_weight": true,
    "show_social_media": true
  }'::jsonb,
  
  show_address BOOLEAN DEFAULT true,
  show_in_directory BOOLEAN DEFAULT true,
  
  -- Doğrulama
  verified BOOLEAN DEFAULT false,
  selfie_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'unverified',
  verification_documents TEXT[],
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_notes TEXT,
  
  -- Puan sistemi
  points INTEGER DEFAULT 0,
  
  -- Online durum
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  
  -- Hesap silme
  deletion_requested_at TIMESTAMP WITH TIME ZONE,
  deletion_scheduled_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eksik kolonları ekle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_in_directory BOOLEAN DEFAULT true;

-- Email unique constraint'i kaldır (çünkü birden fazla auth provider olabilir)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

-- ============================================
-- 3. PUBLIC ID SEQUENCE VE FUNCTION
-- ============================================

-- Sequence'i oluştur (4'ten başlar)
CREATE SEQUENCE IF NOT EXISTS public_id_seq START 4 INCREMENT 1;

-- Mevcut kullanıcılara public_id ata
UPDATE profiles 
SET public_id = '61-1-2025'
WHERE id = '372fb4fc-6f16-4ad5-b411-edb505db7931'
AND public_id IS NULL;

UPDATE profiles 
SET public_id = '61-2-2025'
WHERE id = '98542f02-11f8-4ccd-b38d-4dd42066daa7'
AND public_id IS NULL;

UPDATE profiles 
SET public_id = '61-3-2025'
WHERE id = '9b1a75ed-0a94-4365-955b-301f114d97b4'
AND public_id IS NULL;

-- assign_public_id fonksiyonu
CREATE OR REPLACE FUNCTION public.assign_public_id(p_user_id UUID, p_email TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_no BIGINT;
  yr TEXT := to_char(now(), 'YYYY');
  pid TEXT;
BEGIN
  -- 1. Profil satırı yoksa oluştur
  INSERT INTO public.profiles (id, email, full_name, district, updated_at)
  VALUES (p_user_id, COALESCE(p_email, ''), 'Kullanıcı', 'Ortahisar', NOW())
  ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

  -- 2. Daha önce public_id verilmişse aynısını döndür
  SELECT public_id INTO pid FROM public.profiles WHERE id = p_user_id;
  IF pid IS NOT NULL AND pid != '' THEN
    RETURN pid;
  END IF;

  -- 3. Sıradaki numarayı al ve formatla
  next_no := nextval('public_id_seq');
  pid := '61-' || next_no::text || '-' || yr;

  -- 4. Public_id'yi profile kaydet
  UPDATE public.profiles
     SET public_id = pid,
         updated_at = NOW()
   WHERE id = p_user_id;

  RETURN pid;
END;
$$;

-- Yetkilendirme
GRANT EXECUTE ON FUNCTION public.assign_public_id(UUID, TEXT) TO service_role, authenticated;

-- ============================================
-- 4. FOREIGN KEY'LERİ YENİDEN OLUŞTUR
-- ============================================

-- Posts
ALTER TABLE IF EXISTS posts 
  DROP CONSTRAINT IF EXISTS posts_user_id_fkey,
  ADD CONSTRAINT posts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Chat Members (ÖNEMLİ: İlişkiyi düzelt)
ALTER TABLE IF EXISTS chat_members 
  DROP CONSTRAINT IF EXISTS chat_members_user_id_fkey,
  ADD CONSTRAINT chat_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Chat Rooms
ALTER TABLE IF EXISTS chat_rooms 
  DROP CONSTRAINT IF EXISTS chat_rooms_created_by_fkey,
  ADD CONSTRAINT chat_rooms_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Messages
ALTER TABLE IF EXISTS messages 
  DROP CONSTRAINT IF EXISTS messages_user_id_fkey,
  ADD CONSTRAINT messages_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Follows
ALTER TABLE IF EXISTS follows 
  DROP CONSTRAINT IF EXISTS follows_follower_id_fkey,
  DROP CONSTRAINT IF EXISTS follows_following_id_fkey,
  ADD CONSTRAINT follows_follower_id_fkey 
  FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT follows_following_id_fkey 
  FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Blocked Users
ALTER TABLE IF EXISTS blocked_users 
  DROP CONSTRAINT IF EXISTS blocked_users_blocker_id_fkey,
  DROP CONSTRAINT IF EXISTS blocked_users_blocked_id_fkey,
  ADD CONSTRAINT blocked_users_blocker_id_fkey 
  FOREIGN KEY (blocker_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT blocked_users_blocked_id_fkey 
  FOREIGN KEY (blocked_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Post Likes
ALTER TABLE IF EXISTS post_likes 
  DROP CONSTRAINT IF EXISTS post_likes_user_id_fkey,
  ADD CONSTRAINT post_likes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Comments
ALTER TABLE IF EXISTS comments 
  DROP CONSTRAINT IF EXISTS comments_user_id_fkey,
  ADD CONSTRAINT comments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Comment Likes
ALTER TABLE IF EXISTS comment_likes 
  DROP CONSTRAINT IF EXISTS comment_likes_user_id_fkey,
  ADD CONSTRAINT comment_likes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Message Reactions
ALTER TABLE IF EXISTS message_reactions 
  DROP CONSTRAINT IF EXISTS message_reactions_user_id_fkey,
  ADD CONSTRAINT message_reactions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Reports
ALTER TABLE IF EXISTS reports 
  DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey,
  DROP CONSTRAINT IF EXISTS reports_reported_user_id_fkey,
  ADD CONSTRAINT reports_reporter_id_fkey 
  FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT reports_reported_user_id_fkey 
  FOREIGN KEY (reported_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- User Badges
ALTER TABLE IF EXISTS user_badges 
  DROP CONSTRAINT IF EXISTS user_badges_user_id_fkey,
  ADD CONSTRAINT user_badges_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ============================================
-- 5. TRIGGER'LARI DÜZELT
-- ============================================

-- Otomatik profil oluşturma trigger'ını güncelle
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  user_district TEXT;
  user_full_name TEXT;
BEGIN
  -- Metadata'dan bilgileri al
  user_district := COALESCE(NEW.raw_user_meta_data->>'district', 'Ortahisar');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kullanıcı');
  
  -- Profile oluştur
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    district,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    user_full_name,
    user_district,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı yeniden oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION create_user_profile();

-- ============================================
-- 6. RLS POLİCY'LERİNİ DÜZELT
-- ============================================

-- RLS'i etkinleştir
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Eski policy'leri kaldır
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Yeni policy'ler
CREATE POLICY "Profiles viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 7. MEVCUT KULLANICILAR İÇİN PROFİL OLUŞTUR
-- ============================================

-- auth.users'da olup profiles'da olmayan kullanıcılar için profil oluştur
INSERT INTO public.profiles (id, email, full_name, district, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Kullanıcı'),
  COALESCE(u.raw_user_meta_data->>'district', 'Ortahisar'),
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. INDEX'LERI OLUŞTUR
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_district ON profiles(district);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_public_id ON profiles(public_id);
CREATE INDEX IF NOT EXISTS idx_profiles_deletion ON profiles(deletion_scheduled_at) 
  WHERE deletion_scheduled_at IS NOT NULL;

-- ============================================
-- 9. REALTIME'I AKTİFLEŞTİR
-- ============================================

-- Realtime için publikasyon
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- ============================================
-- ✅ TÜM HATALAR DÜZELTİLDİ!
-- ============================================
-- 
-- Düzeltilen sorunlar:
-- ✅ user_profiles -> profiles (tablo adı düzeltildi)
-- ✅ Foreign key ilişkileri düzeltildi
-- ✅ chat_members -> profiles ilişkisi eklendi
-- ✅ Profil otomatik oluşturma trigger'ı düzeltildi
-- ✅ public_id sistemi düzeltildi
-- ✅ RLS policy'leri düzeltildi
-- ✅ Mevcut kullanıcılar için profil oluşturuldu
-- 
-- Şimdi test edin:
-- 1. Yeni kullanıcı kaydı
-- 2. Profil güncelleme
-- 3. Chat odaları yükleme
-- 4. Gönderi paylaşma
-- 
-- 🚀 HAZIR!
-- ============================================
