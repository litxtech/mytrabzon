-- ============================================
-- PROJE ŞEMASI DOĞRULAMA SORGULARI
-- ============================================
-- Bu sorguları Supabase SQL Editor'de çalıştırarak
-- projenin durumunu kontrol edebilirsiniz

-- ============================================
-- 1. TABLOLAR KONTROLÜ
-- ============================================

SELECT 
  'Tablolar' as kontrol,
  table_name,
  CASE 
    WHEN table_name IN ('profiles', 'posts', 'post_likes', 'comments', 'chat_rooms', 'chat_members', 'messages', 'notifications')
    THEN '✅ Mevcut'
    ELSE '⚠️ Kontrol et'
  END as durum
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'posts', 'post_likes', 'comments', 'chat_rooms', 'chat_members', 'messages', 'notifications')
ORDER BY table_name;

-- ============================================
-- 2. PROFILES TABLOSU KOLONLARI
-- ============================================

SELECT 
  'Profiles Kolonları' as kontrol,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Eksik kolonları kontrol et
SELECT 
  'Profiles Eksik Kolonlar' as kontrol,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'district') THEN '❌ district'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'social_media') THEN '❌ social_media'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'privacy_settings') THEN '❌ privacy_settings'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'city') THEN '❌ city'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_in_directory') THEN '❌ show_in_directory'
    ELSE '✅ Tüm kolonlar mevcut'
  END as durum;

-- ============================================
-- 3. POSTS TABLOSU KOLONLARI
-- ============================================

SELECT 
  'Posts Kolonları' as kontrol,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'posts'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Eksik kolonları kontrol et
SELECT 
  'Posts Eksik Kolonlar' as kontrol,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'author_id') THEN '❌ author_id'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'district') THEN '❌ district'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'media') THEN '❌ media'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'hashtags') THEN '❌ hashtags'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'mentions') THEN '❌ mentions'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'visibility') THEN '❌ visibility'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'edited') THEN '❌ edited'
    ELSE '✅ Tüm kolonlar mevcut'
  END as durum;

-- ============================================
-- 4. FOREIGN KEY KONTROLÜ
-- ============================================

SELECT 
  'Foreign Keys' as kontrol,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  CASE 
    WHEN tc.table_name = 'posts' AND kcu.column_name = 'author_id' AND ccu.table_name = 'profiles' THEN '✅ Doğru'
    ELSE '⚠️ Kontrol et'
  END as durum
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('posts', 'post_likes', 'comments')
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 5. RLS POLICY KONTROLÜ
-- ============================================

SELECT 
  'RLS Policies' as kontrol,
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN tablename = 'profiles' AND cmd IN ('SELECT', 'INSERT', 'UPDATE') THEN '✅ Mevcut'
    WHEN tablename = 'posts' AND cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') THEN '✅ Mevcut'
    ELSE '⚠️ Kontrol et'
  END as durum
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'posts', 'post_likes', 'comments')
ORDER BY tablename, cmd, policyname;

-- Eksik policy'leri kontrol et
SELECT 
  'Eksik Policies' as kontrol,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'SELECT') THEN '❌ profiles SELECT policy yok'
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'INSERT') THEN '❌ profiles INSERT policy yok'
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'UPDATE') THEN '❌ profiles UPDATE policy yok'
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND cmd = 'SELECT') THEN '❌ posts SELECT policy yok'
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND cmd = 'INSERT') THEN '❌ posts INSERT policy yok'
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND cmd = 'UPDATE') THEN '❌ posts UPDATE policy yok'
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND cmd = 'DELETE') THEN '❌ posts DELETE policy yok'
    ELSE '✅ Tüm policyler mevcut'
  END as durum;

-- ============================================
-- 6. INDEX KONTROLÜ
-- ============================================

SELECT 
  'Indexes' as kontrol,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'posts')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- 7. TRIGGER KONTROLÜ
-- ============================================

SELECT 
  'Triggers' as kontrol,
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  CASE 
    WHEN trigger_name LIKE '%like%' OR trigger_name LIKE '%comment%' THEN '✅ Mevcut'
    ELSE '⚠️ Kontrol et'
  END as durum
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('post_likes', 'comments')
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 8. ÖRNEK VERİ KONTROLÜ
-- ============================================

-- Profil sayısı
SELECT 
  'Veri Kontrolü' as kontrol,
  'Profiles' as tablo,
  COUNT(*) as kayit_sayisi
FROM profiles;

-- Post sayısı
SELECT 
  'Veri Kontrolü' as kontrol,
  'Posts' as tablo,
  COUNT(*) as kayit_sayisi
FROM posts;

-- ============================================
-- 9. KOLON TİPLERİ KONTROLÜ
-- ============================================

-- Posts tablosu kritik kolonlar
SELECT 
  'Posts Kolon Tipleri' as kontrol,
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'author_id' AND data_type = 'uuid' THEN '✅ Doğru'
    WHEN column_name = 'media' AND data_type = 'jsonb' THEN '✅ Doğru'
    WHEN column_name = 'hashtags' AND data_type = 'ARRAY' THEN '✅ Doğru'
    WHEN column_name = 'mentions' AND data_type = 'ARRAY' THEN '✅ Doğru'
    WHEN column_name = 'visibility' AND data_type = 'text' THEN '✅ Doğru'
    WHEN column_name = 'edited' AND data_type = 'boolean' THEN '✅ Doğru'
    ELSE '⚠️ Kontrol et: ' || data_type
  END as durum
FROM information_schema.columns
WHERE table_name = 'posts'
  AND column_name IN ('author_id', 'media', 'hashtags', 'mentions', 'visibility', 'edited')
ORDER BY column_name;

-- Profiles tablosu kritik kolonlar
SELECT 
  'Profiles Kolon Tipleri' as kontrol,
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'social_media' AND data_type = 'jsonb' THEN '✅ Doğru'
    WHEN column_name = 'privacy_settings' AND data_type = 'jsonb' THEN '✅ Doğru'
    WHEN column_name = 'district' AND data_type IN ('text', 'character varying') THEN '✅ Doğru'
    ELSE '⚠️ Kontrol et: ' || data_type
  END as durum
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('social_media', 'privacy_settings', 'district')
ORDER BY column_name;

-- ============================================
-- 10. ÖZET RAPOR
-- ============================================

SELECT 
  'ÖZET' as rapor,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'posts', 'post_likes', 'comments')) as tablo_sayisi,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'profiles' AND table_schema = 'public') as profiles_kolon_sayisi,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'posts' AND table_schema = 'public') as posts_kolon_sayisi,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles', 'posts')) as policy_sayisi,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public' AND event_object_table IN ('post_likes', 'comments')) as trigger_sayisi;

