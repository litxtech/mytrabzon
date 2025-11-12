-- ==============================================
-- PROFIL GÜNCELLEME HATASI - HIZLI DÜZELTME
-- ==============================================
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

-- 1. user_profiles tablosuna eksik alanı ekle
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS show_in_directory BOOLEAN DEFAULT true;

-- 2. public_id alanını ekle (eğer yoksa)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS public_id TEXT UNIQUE;

-- 3. public_id sırası oluştur (eğer yoksa)
CREATE SEQUENCE IF NOT EXISTS public_id_seq START 4 INCREMENT 1;

-- 4. Mevcut kullanıcılara public_id ata (eğer yoksa)
UPDATE user_profiles 
SET public_id = '61-1-2024'
WHERE id = '372fb4fc-6f16-4ad5-b411-edb505db7931' AND public_id IS NULL;

UPDATE user_profiles 
SET public_id = '61-2-2024'
WHERE id = '98542f02-11f8-4ccd-b38d-4dd42066daa7' AND public_id IS NULL;

UPDATE user_profiles 
SET public_id = '61-3-2024'
WHERE id = '9b1a75ed-0a94-4365-955b-301f114d97b4' AND public_id IS NULL;

-- 5. assign_public_id fonksiyonu
CREATE OR REPLACE FUNCTION public.assign_public_id(p_user_id uuid, p_email text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_no bigint;
  yr text := to_char(now(), 'YYYY');
  pid text;
BEGIN
  -- Profil satırı yoksa oluştur
  INSERT INTO public.user_profiles (id, email, full_name, district, updated_at)
  VALUES (p_user_id, p_email, 'Kullanıcı', 'Ortahisar', now())
  ON CONFLICT (id) DO UPDATE SET updated_at = now();

  -- Daha önce public_id verilmişse aynısını döndür
  SELECT public_id INTO pid FROM public.user_profiles WHERE id = p_user_id;
  IF pid IS NOT NULL THEN
    RETURN pid;
  END IF;

  -- Sıradaki numarayı al ve formatla
  next_no := nextval('public_id_seq');
  pid := '61-' || next_no::text || '-' || yr;

  -- Public_id'yi profile kaydet
  UPDATE public.user_profiles
     SET public_id = pid,
         updated_at = now()
   WHERE id = p_user_id;

  RETURN pid;
END;
$$;

-- 6. Yetkilendirme
REVOKE ALL ON FUNCTION public.assign_public_id(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.assign_public_id(uuid, text) TO service_role, authenticated;

-- ✅ TAMAMLANDI!
-- Artık profil güncelleme çalışmalı
