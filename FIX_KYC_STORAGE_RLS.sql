-- ============================================
-- KYC DOCUMENTS STORAGE RLS POLİTİKALARI DÜZELTME
-- ============================================
-- Bu SQL'i Supabase SQL Editor'de çalıştırın

-- Mevcut politikaları sil (eğer varsa)
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all KYC documents" ON storage.objects;

-- KYC DOCUMENTS: Kullanıcılar sadece kendi dosyalarını görebilir
-- Dosya yolu formatı: {user_id}/{type}_{timestamp}.{ext}
CREATE POLICY "Users can view their own KYC documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- KYC DOCUMENTS: Kullanıcılar sadece kendi klasörlerine yükleyebilir
-- Dosya yolu formatı: {user_id}/{type}_{timestamp}.{ext}
CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- KYC DOCUMENTS: Kullanıcılar sadece kendi dosyalarını güncelleyebilir
CREATE POLICY "Users can update their own KYC documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- KYC DOCUMENTS: Kullanıcılar sadece kendi dosyalarını silebilir
CREATE POLICY "Users can delete their own KYC documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Admin kullanıcılar tüm KYC belgelerini görebilir
CREATE POLICY "Admins can view all KYC documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kyc-documents'
  AND EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

