-- MyTrabzon - Policies Tablosu Policy Type Constraint Güncelleme
-- Yeni politika tiplerini eklemek için CHECK constraint'i güncelle

-- ============================================
-- 1. MEVCUT CONSTRAINT'I KALDIR
-- ============================================
DO $$ 
BEGIN
  -- Eğer constraint varsa kaldır
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'policies_policy_type_check'
  ) THEN
    ALTER TABLE policies DROP CONSTRAINT policies_policy_type_check;
  END IF;
END $$;

-- ============================================
-- 2. YENİ CONSTRAINT EKLE (TÜM POLİTİKA TİPLERİ İLE)
-- ============================================
ALTER TABLE policies 
ADD CONSTRAINT policies_policy_type_check 
CHECK (policy_type IN (
  'terms',           -- Kullanım Şartları
  'privacy',         -- Gizlilik Politikası
  'community',       -- Topluluk Kuralları
  'cookie',          -- Çerez Politikası
  'refund',          -- İade Politikası
  'child_safety',    -- Çocuk Güvenliği Politikası
  'payment',         -- Ödeme ve Bağış Politikası
  'moderation',      -- Moderasyon & Şikâyet Politikası
  'data_storage',    -- Veri Saklama & İmha Politikası
  'eula',            -- Son Kullanıcı Lisans Sözleşmesi
  'university',      -- Üniversite Modu Politikası
  'event',           -- Etkinlik & Halı Saha Politikası
  'other'            -- Diğer
));

-- ============================================
-- TAMAMLANDI
-- ============================================

