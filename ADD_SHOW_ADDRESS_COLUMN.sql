-- ============================================
-- Profiles tablosuna show_address kolonu ekle
-- ============================================
-- Bu script mevcut yapıyı bozmaz, sadece eksik kolonu ekler
-- IF NOT EXISTS kullanıldığı için güvenle çalıştırılabilir

-- profiles tablosuna show_address kolonu ekle (eğer yoksa)
-- DEFAULT true ile eklenir, mevcut kayıtlar otomatik true değerini alır
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS show_address BOOLEAN DEFAULT true;

-- Index ekle (opsiyonel, performans için)
-- Mevcut index varsa hiçbir şey yapmaz
CREATE INDEX IF NOT EXISTS idx_profiles_show_address ON profiles(show_address);

