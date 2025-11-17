-- ============================================
-- Profiles tablosuna verified kolonu ekle
-- ============================================
-- Bu script mevcut yapıyı bozmaz, sadece eksik kolonu ekler
-- IF NOT EXISTS kullanıldığı için güvenle çalıştırılabilir

-- profiles tablosuna verified kolonu ekle (eğer yoksa)
-- DEFAULT false ile eklenir, mevcut kayıtlar otomatik false değerini alır
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Index ekle (opsiyonel, performans için)
-- Mevcut index varsa hiçbir şey yapmaz
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verified);

