-- ============================================
-- ADMIN PANEL - COMPLETE DATABASE SCHEMA
-- ============================================

-- 1. ADMIN USERS TABLE (Mevcut kullanıcıyı admin yapmak için)
-- Önce mevcut tabloyu kontrol et ve user_id kolonunu ekle
DO $$ 
BEGIN
  -- Eğer admin_users tablosu yoksa oluştur
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_users') THEN
    CREATE TABLE admin_users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator')),
      is_active BOOLEAN DEFAULT true,
      permissions JSONB DEFAULT '{}'::jsonb,
      last_login_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ELSE
    -- Mevcut tabloya user_id kolonunu ekle (eğer yoksa)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'user_id') THEN
      ALTER TABLE admin_users ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
      -- Unique constraint'i ayrı ekle
      CREATE UNIQUE INDEX IF NOT EXISTS admin_users_user_id_unique ON admin_users(user_id) WHERE user_id IS NOT NULL;
    END IF;
    
    -- permissions kolonunu ekle (eğer yoksa)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'permissions') THEN
      ALTER TABLE admin_users ADD COLUMN permissions JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- updated_at kolonunu ekle (eğer yoksa)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'updated_at') THEN
      ALTER TABLE admin_users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
  END IF;
END $$;

-- Admin kullanıcıyı ekle (UID: 98542f02-11f8-4ccd-b38d-4dd42066daa7)
DO $$
BEGIN
  -- Önce user_id ile kontrol et
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = '98542f02-11f8-4ccd-b38d-4dd42066daa7') THEN
    UPDATE admin_users 
    SET email = 'support@litxtech.com',
        role = 'super_admin',
        is_active = true
    WHERE user_id = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
  -- Email ile kontrol et
  ELSIF EXISTS (SELECT 1 FROM admin_users WHERE email = 'support@litxtech.com') THEN
    UPDATE admin_users 
    SET user_id = '98542f02-11f8-4ccd-b38d-4dd42066daa7',
        role = 'super_admin',
        is_active = true
    WHERE email = 'support@litxtech.com';
  -- Yeni kayıt ekle
  ELSE
    INSERT INTO admin_users (user_id, email, role, is_active)
    VALUES (
      '98542f02-11f8-4ccd-b38d-4dd42066daa7',
      'support@litxtech.com',
      'super_admin',
      true
    );
  END IF;
END $$;

-- 2. BLUE TICK (VERIFIED BADGE) TABLE
CREATE TABLE IF NOT EXISTS blue_ticks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_by UUID REFERENCES admin_users(id),
  verification_type TEXT DEFAULT 'manual' CHECK (verification_type IN ('manual', 'automatic', 'celebrity')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. POLICIES TABLE
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('terms', 'privacy', 'community', 'cookie', 'refund', 'other')),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES admin_users(id),
  updated_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. COMPANY INFO TABLE
CREATE TABLE IF NOT EXISTS company_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL DEFAULT 'MyTrabzon',
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  social_media JSONB DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES admin_users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İlk company info kaydı
INSERT INTO company_info (company_name, email, phone, address)
VALUES (
  'MyTrabzon',
  'support@litxtech.com',
  NULL,
  NULL
)
ON CONFLICT DO NOTHING;

-- 5. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES admin_users(id),
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 6. USER BANS TABLE
CREATE TABLE IF NOT EXISTS user_bans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by UUID REFERENCES admin_users(id),
  reason TEXT NOT NULL,
  ban_type TEXT DEFAULT 'temporary' CHECK (ban_type IN ('temporary', 'permanent')),
  ban_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ADMIN LOGS TABLE
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES admin_users(id),
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. USER REPORTS TABLE (Şikayetler)
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('spam', 'harassment', 'inappropriate', 'fake', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES admin_users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. INDEXES
-- user_id kolonu varsa index oluştur
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_blue_ticks_user_id ON blue_ticks(user_id);
CREATE INDEX IF NOT EXISTS idx_policies_type ON policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_policies_display_order ON policies(display_order);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON user_reports(created_at);

-- 10. RLS POLICIES

-- Admin Users (Sadece adminler görebilir)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_users_select" ON admin_users;
CREATE POLICY "admin_users_select" ON admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
    )
  );

-- Blue Ticks (Herkes görebilir, sadece adminler ekleyebilir)
ALTER TABLE blue_ticks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blue_ticks_select" ON blue_ticks;
CREATE POLICY "blue_ticks_select" ON blue_ticks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "blue_ticks_insert" ON blue_ticks;
CREATE POLICY "blue_ticks_insert" ON blue_ticks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
    )
  );

-- Policies (Herkes görebilir, sadece adminler yönetebilir)
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policies_select" ON policies;
CREATE POLICY "policies_select" ON policies
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "policies_insert" ON policies;
CREATE POLICY "policies_insert" ON policies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
    )
  );

DROP POLICY IF EXISTS "policies_update" ON policies;
CREATE POLICY "policies_update" ON policies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
    )
  );

DROP POLICY IF EXISTS "policies_delete" ON policies;
CREATE POLICY "policies_delete" ON policies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
    )
  );

-- Company Info (Herkes görebilir, sadece adminler güncelleyebilir)
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_info_select" ON company_info;
CREATE POLICY "company_info_select" ON company_info
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "company_info_update" ON company_info;
CREATE POLICY "company_info_update" ON company_info
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
    )
  );

-- Support Tickets (Kullanıcılar kendi ticket'larını görebilir, adminler hepsini)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "support_tickets_select" ON support_tickets;
CREATE POLICY "support_tickets_select" ON support_tickets
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
    )
  );

DROP POLICY IF EXISTS "support_tickets_insert" ON support_tickets;
CREATE POLICY "support_tickets_insert" ON support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- User Bans (Sadece adminler görebilir)
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_bans_select" ON user_bans;
CREATE POLICY "user_bans_select" ON user_bans
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
    )
  );

-- Admin Logs (Sadece adminler görebilir)
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_logs_select" ON admin_logs;
CREATE POLICY "admin_logs_select" ON admin_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
    )
  );

-- User Reports (Kullanıcılar kendi report'larını, adminler hepsini görebilir)
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_reports_select" ON user_reports;
CREATE POLICY "user_reports_select" ON user_reports
  FOR SELECT USING (
    reporter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
    )
  );

-- 11. HELPER FUNCTIONS

-- Admin kontrolü
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users au
    WHERE au.user_id = $1
    AND au.is_active = true
  );
$$;

-- Super admin kontrolü
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users au
    WHERE au.user_id = $1
    AND au.is_active = true
    AND au.role = 'super_admin'
  );
$$;

-- Kullanıcı banlı mı kontrolü
CREATE OR REPLACE FUNCTION is_user_banned(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_bans ub
    WHERE ub.user_id = $1
    AND ub.is_active = true
    AND (
      ub.ban_type = 'permanent'
      OR (ub.ban_type = 'temporary' AND ub.ban_until > NOW())
    )
  );
$$;

-- İstatistikler için fonksiyonlar
CREATE OR REPLACE FUNCTION get_today_registrations()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM auth.users
  WHERE DATE(created_at) = CURRENT_DATE;
$$;

CREATE OR REPLACE FUNCTION get_today_reports()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM user_reports
  WHERE DATE(created_at) = CURRENT_DATE
  AND status = 'pending';
$$;

-- 12. TRIGGERS

-- Updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mevcut trigger'ları kaldır ve yeniden oluştur
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_policies_updated_at ON policies;
CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_info_updated_at ON company_info;
CREATE TRIGGER update_company_info_updated_at
  BEFORE UPDATE ON company_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 13. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_banned(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_today_registrations() TO authenticated;
GRANT EXECUTE ON FUNCTION get_today_reports() TO authenticated;

-- 14. PROFILES TABLOSUNA BLUE TICK KOLONU EKLE (Eğer yoksa)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_blue_tick BOOLEAN DEFAULT false;

-- Blue tick ile senkronizasyon trigger'ı
CREATE OR REPLACE FUNCTION sync_blue_tick_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE profiles
    SET has_blue_tick = NEW.is_active
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles
    SET has_blue_tick = false
    WHERE id = OLD.user_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_blue_tick_trigger ON blue_ticks;
CREATE TRIGGER sync_blue_tick_trigger
  AFTER INSERT OR UPDATE OR DELETE ON blue_ticks
  FOR EACH ROW
  EXECUTE FUNCTION sync_blue_tick_to_profile();

