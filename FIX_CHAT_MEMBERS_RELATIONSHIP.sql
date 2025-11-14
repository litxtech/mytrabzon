-- ============================================
-- CHAT_MEMBERS VE PROFILES İLİŞKİSİNİ DÜZELT
-- ============================================
-- Bu SQL'i Supabase SQL Editor'de çalıştırın
-- ============================================

-- 1. Önce geçersiz kayıtları temizle
-- chat_members tablosunda profiles tablosunda olmayan user_id'leri sil
DELETE FROM chat_members 
WHERE user_id NOT IN (SELECT id FROM profiles);

-- Geçersiz kayıt sayısını göster
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM chat_members cm
  WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = cm.user_id);
  
  IF invalid_count > 0 THEN
    RAISE NOTICE '⚠️ % geçersiz chat_members kaydı silindi', invalid_count;
  ELSE
    RAISE NOTICE '✅ Tüm chat_members kayıtları geçerli';
  END IF;
END $$;

-- 2. Mevcut foreign key'i kontrol et ve düzelt
DO $$
BEGIN
  -- Eğer foreign key varsa, önce sil
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'chat_members' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'user_id'
      AND tc.constraint_name LIKE '%user_id%'
  ) THEN
    -- Eski foreign key'i sil
    ALTER TABLE chat_members 
      DROP CONSTRAINT IF EXISTS chat_members_user_id_fkey CASCADE;
    
    RAISE NOTICE 'Eski foreign key silindi';
  END IF;
  
  -- Yeni foreign key oluştur (profiles tablosuna)
  BEGIN
    ALTER TABLE chat_members 
      ADD CONSTRAINT chat_members_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES profiles(id) 
      ON DELETE CASCADE;
    
    RAISE NOTICE '✅ chat_members.user_id foreign key profiles tablosuna yönlendirildi';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'chat_members.user_id foreign key zaten mevcut';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Foreign key oluşturulamadı: %', SQLERRM;
  END;
END $$;

-- 3. Chat rooms için geçersiz kayıtları temizle
UPDATE chat_rooms 
SET created_by = NULL 
WHERE created_by IS NOT NULL 
  AND created_by NOT IN (SELECT id FROM profiles);

-- 4. Chat rooms foreign key'ini kontrol et ve düzelt
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'chat_rooms' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'created_by'
  ) THEN
    ALTER TABLE chat_rooms 
      DROP CONSTRAINT IF EXISTS chat_rooms_created_by_fkey CASCADE;
    
    RAISE NOTICE 'Eski chat_rooms foreign key silindi';
  END IF;
  
  BEGIN
    ALTER TABLE chat_rooms 
      ADD CONSTRAINT chat_rooms_created_by_fkey 
      FOREIGN KEY (created_by) 
      REFERENCES profiles(id) 
      ON DELETE SET NULL;
    
    RAISE NOTICE '✅ chat_rooms.created_by foreign key profiles tablosuna yönlendirildi';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'chat_rooms.created_by foreign key zaten mevcut';
  END;
END $$;

-- 5. Messages için geçersiz kayıtları temizle
DELETE FROM messages 
WHERE user_id NOT IN (SELECT id FROM profiles);

-- 6. Messages foreign key'ini kontrol et ve düzelt
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'messages' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'user_id'
  ) THEN
    ALTER TABLE messages 
      DROP CONSTRAINT IF EXISTS messages_user_id_fkey CASCADE;
    
    RAISE NOTICE 'Eski messages foreign key silindi';
  END IF;
  
  BEGIN
    ALTER TABLE messages 
      ADD CONSTRAINT messages_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES profiles(id) 
      ON DELETE CASCADE;
    
    RAISE NOTICE '✅ messages.user_id foreign key profiles tablosuna yönlendirildi';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'messages.user_id foreign key zaten mevcut';
  END;
END $$;

-- 4. İlişkiyi test et
SELECT 
  'chat_members -> profiles' as relationship,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'chat_members' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'user_id'
        AND ccu.table_name = 'profiles'
    ) THEN '✅ İlişki mevcut'
    ELSE '❌ İlişki eksik'
  END as status;

-- ============================================
-- NOT: Bu SQL çalıştırıldıktan sonra
-- Supabase schema cache'i otomatik güncellenecek
-- Eğer hala hata alırsanız, Supabase Dashboard'da
-- Settings > API > Rebuild Schema Cache butonuna tıklayın
-- ============================================

