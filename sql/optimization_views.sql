-- ============================================
-- SUPABASE EGRESS OPTİMİZASYONU - SQL VIEWS
-- ============================================
-- Lightweight views for mobile - sadece gerekli alanlar

-- 1. POSTS LIGHTWEIGHT VIEW
CREATE OR REPLACE VIEW posts_lightweight AS
SELECT 
  id,
  author_id,
  content,
  media,
  like_count,
  comment_count,
  share_count,
  views_count,
  created_at,
  updated_at,
  district,
  visibility,
  archived
FROM posts;

-- 2. PROFILES LIGHTWEIGHT VIEW (mobile için)
CREATE OR REPLACE VIEW profiles_lightweight AS
SELECT 
  id,
  full_name,
  username,
  avatar_url,
  verified,
  supporter_badge,
  supporter_badge_visible,
  supporter_badge_color,
  district,
  city,
  created_at
FROM profiles;

-- 3. MARKET ITEMS LIGHTWEIGHT VIEW (eğer market_items tablosu varsa)
-- CREATE OR REPLACE VIEW market_items_lightweight AS
-- SELECT 
--   id,
--   seller_id,
--   title,
--   price,
--   currency,
--   image_urls,
--   category,
--   condition,
--   created_at,
--   updated_at
-- FROM market_items;

-- Index'ler zaten mevcut, view'lar sadece select'i optimize ediyor
-- Mobil uygulamada bu view'ları kullanarak sadece gerekli alanları çekin

