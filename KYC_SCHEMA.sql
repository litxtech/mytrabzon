-- ============================================
-- KYC (KIMLIK DOĞRULAMA) SİSTEMİ - DATABASE SCHEMA
-- ============================================

-- 1. KYC REQUESTS TABLE
CREATE TABLE IF NOT EXISTS kyc_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  full_name TEXT NOT NULL,
  national_id TEXT NOT NULL, -- TCKN veya pasaport no
  birth_date DATE NOT NULL,
  country TEXT,
  city TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES admin_users(id),
  review_notes TEXT,
  verification_code TEXT, -- Selfie + kimlik fotoğrafı için kod (örn: "MYTRABZON – 14.11.2025 – KOD: 7391")
  code_generated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, status) WHERE status = 'pending' -- Bir kullanıcının aynı anda sadece bir pending başvurusu olabilir
);

-- 2. KYC DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kyc_id UUID NOT NULL REFERENCES kyc_requests(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('id_front', 'id_back', 'selfie', 'selfie_with_id')),
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_kyc_requests_user_id ON kyc_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status ON kyc_requests(status);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_created_at ON kyc_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_kyc_id ON kyc_documents(kyc_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_type ON kyc_documents(type);

-- 4. PROFILES TABLOSUNA is_verified KOLONU EKLE
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);

-- 5. RLS POLICIES

-- KYC Requests
DROP POLICY IF EXISTS "kyc_requests_select" ON kyc_requests;
CREATE POLICY "kyc_requests_select" ON kyc_requests
  FOR SELECT USING (
    user_id = auth.uid() OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "kyc_requests_insert" ON kyc_requests;
CREATE POLICY "kyc_requests_insert" ON kyc_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "kyc_requests_update" ON kyc_requests;
CREATE POLICY "kyc_requests_update" ON kyc_requests
  FOR UPDATE USING (
    user_id = auth.uid() OR is_admin(auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid() OR is_admin(auth.uid())
  );

-- KYC Documents
DROP POLICY IF EXISTS "kyc_documents_select" ON kyc_documents;
CREATE POLICY "kyc_documents_select" ON kyc_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM kyc_requests
      WHERE kyc_requests.id = kyc_documents.kyc_id
      AND (kyc_requests.user_id = auth.uid() OR is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "kyc_documents_insert" ON kyc_documents;
CREATE POLICY "kyc_documents_insert" ON kyc_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_requests
      WHERE kyc_requests.id = kyc_documents.kyc_id
      AND kyc_requests.user_id = auth.uid()
      AND kyc_requests.status = 'pending'
    )
  );

-- 6. FUNCTIONS

-- KYC onaylandığında profile'ı güncelle
CREATE OR REPLACE FUNCTION update_profile_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE profiles
    SET is_verified = true
    WHERE id = NEW.user_id;
  ELSIF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
    UPDATE profiles
    SET is_verified = false
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profile_verification_trigger ON kyc_requests;
CREATE TRIGGER update_profile_verification_trigger
  AFTER UPDATE OF status ON kyc_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_verification();

-- 7. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION update_profile_verification() TO authenticated;

-- 8. STORAGE BUCKET (Manuel olarak Supabase Dashboard'dan oluşturulacak)
-- Bucket adı: kyc-documents
-- Public: false (sadece authenticated kullanıcılar erişebilir)
-- File size limit: 10MB
-- Allowed MIME types: image/jpeg, image/png, image/jpg

