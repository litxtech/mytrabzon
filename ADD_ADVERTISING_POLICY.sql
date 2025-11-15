-- MyTrabzon Uygulama İçi Reklam Politikası Ekleme/Güncelleme
-- Eğer reklam eklenirse gerekli

UPDATE policies
SET 
  title = 'Uygulama İçi Reklam Politikası',
  content = 'UYGULAMA İÇİ REKLAM POLİTİKASI

Son Güncelleme: 2025

1. HEDEFLİ REKLAM YOK

MyTrabzon şu anda hedefli reklam göstermemektedir.

Gelecekte reklam eklenirse bu politika güncellenecektir.

2. ÇOCUKLARA ÖZEL REKLAM POLİTİKASI

13 yaş altı kullanıcılara reklam gösterilmez.

18 yaş altı kullanıcılara uygunsuz reklamlar gösterilmez.

3. ÜÇÜNCÜ TARAF REKLAM AĞLARI

Reklam gösterilirse, güvenilir üçüncü taraf ağlar kullanılır.

Reklam içerikleri moderasyon sürecinden geçer.

4. REKLAM ENGELLEME HAKKI

Kullanıcılar reklamları engelleyebilir (premium üyelik ile).

5. İLETİŞİM

📧 support@litxtech.com',
  policy_type = 'other',
  display_order = 21,
  is_active = true,
  updated_at = NOW()
WHERE title LIKE '%Reklam%';

INSERT INTO policies (title, content, policy_type, display_order, is_active)
SELECT 
  'Uygulama İçi Reklam Politikası',
  'UYGULAMA İÇİ REKLAM POLİTİKASI

Son Güncelleme: 2025

1. HEDEFLİ REKLAM YOK

MyTrabzon şu anda hedefli reklam göstermemektedir.

Gelecekte reklam eklenirse bu politika güncellenecektir.

2. ÇOCUKLARA ÖZEL REKLAM POLİTİKASI

13 yaş altı kullanıcılara reklam gösterilmez.

18 yaş altı kullanıcılara uygunsuz reklamlar gösterilmez.

3. ÜÇÜNCÜ TARAF REKLAM AĞLARI

Reklam gösterilirse, güvenilir üçüncü taraf ağlar kullanılır.

Reklam içerikleri moderasyon sürecinden geçer.

4. REKLAM ENGELLEME HAKKI

Kullanıcılar reklamları engelleyebilir (premium üyelik ile).

5. İLETİŞİM

📧 support@litxtech.com',
  'other',
  21,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE title LIKE '%Reklam%'
);

