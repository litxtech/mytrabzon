-- Üç hesaptan "Merhaba Dünya" postları oluştur

-- 1. Hesap: 372fb4fc-6f16-4ad5-b411-edb505db7931 (support@litxtech.com - 61-1-2024)
INSERT INTO public.posts (
  user_id,
  content,
  district,
  created_at
) VALUES (
  '372fb4fc-6f16-4ad5-b411-edb505db7931',
  'Merhaba Dünya 🌍',
  'Ortahisar',
  now()
);

-- 2. Hesap: 98542f02-11f8-4ccd-b38d-4dd42066daa7 (snertoprak97@gmail.com - 61-2-2024)
INSERT INTO public.posts (
  user_id,
  content,
  district,
  created_at
) VALUES (
  '98542f02-11f8-4ccd-b38d-4dd42066daa7',
  'Merhaba Dünya 🌍',
  'Ortahisar',
  now()
);

-- 3. Hesap: 9b1a75ed-0a94-4365-955b-301f114d97b4 (sonertoprak97@gmail.com - 61-3-2024)
INSERT INTO public.posts (
  user_id,
  content,
  district,
  created_at
) VALUES (
  '9b1a75ed-0a94-4365-955b-301f114d97b4',
  'Merhaba Dünya 🌍',
  'Ortahisar',
  now()
);

-- Postların oluşturulduğunu kontrol et
SELECT 
  p.id,
  p.content,
  p.district,
  pr.public_id,
  pr.email,
  pr.full_name,
  p.created_at
FROM public.posts p
JOIN public.profiles pr ON p.user_id = pr.id
WHERE p.user_id IN (
  '372fb4fc-6f16-4ad5-b411-edb505db7931',
  '98542f02-11f8-4ccd-b38d-4dd42066daa7',
  '9b1a75ed-0a94-4365-955b-301f114d97b4'
)
ORDER BY p.created_at DESC;
