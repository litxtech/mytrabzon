-- ============================================
-- MyTrabzon - Eksiksiz Supabase SQL Schema
-- ============================================
-- Bu dosyanın tamamını Supabase SQL Editor'e yapıştırın
-- Her bölüm ayrı ayrı çalıştırılabilir veya tamamı bir seferde

-- ============================================
-- 1. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Full-text search için

-- ============================================
-- 2. CUSTOM TYPES
-- ============================================

-- İlçeler
CREATE TYPE district_type AS ENUM (
  'Ortahisar', 'Akçaabat', 'Araklı', 'Arsin', 'Beşikdüzü', 
  'Çarşıbaşı', 'Çaykara', 'Dernekpazarı', 'Düzköy', 'Hayrat', 
  'Köprübaşı', 'Maçka', 'Of', 'Sürmene', 'Şalpazarı', 
  'Tonya', 'Vakfıkebir', 'Yomra'
);

-- ============================================
-- 3. ADMIN SYSTEM (Önce oluşturulacak)
-- ============================================

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'moderator' CHECK (role IN ('super_admin', 'admin', 'moderator')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. CORE TABLES
-- ============================================

-- User Profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  district district_type NOT NULL,
  phone TEXT,
  show_address BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  selfie_verified BOOLEAN DEFAULT false,
  points INTEGER DEFAULT 0,
  deletion_requested_at TIMESTAMP WITH TIME ZONE,
  deletion_scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts (Ana paylaşımlar)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT[],
  media_type TEXT CHECK (media_type IN ('image', 'video', 'mixed')),
  district district_type NOT NULL,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_name TEXT,
  tags TEXT[],
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post Likes
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comment Likes
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- ============================================
-- 5. CHAT SYSTEM
-- ============================================

-- Chat Rooms
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  avatar_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'district')),
  district district_type,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Members
CREATE TABLE chat_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  unread_count INTEGER DEFAULT 0,
  last_read_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'audio', 'file')),
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  district district_type,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('general', 'district', 'emergency', 'post', 'comment', 'like', 'follow', 'message')),
  reference_id UUID,
  reference_type TEXT,
  image_url TEXT,
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. LAZGPT SYSTEM
-- ============================================

CREATE TABLE lazgpt_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lazgpt_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES lazgpt_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. EVENTS (Etkinlikler)
-- ============================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  district district_type NOT NULL,
  location_name TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  capacity INTEGER,
  attendees_count INTEGER DEFAULT 0,
  category TEXT,
  tags TEXT[],
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE event_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'interested', 'not_going')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ============================================
-- 9. HELP REQUESTS (Yardımlaşma)
-- ============================================

CREATE TABLE help_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('blood', 'lost', 'found', 'volunteer', 'other')),
  district district_type NOT NULL,
  contact_info TEXT,
  location_name TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  image_url TEXT,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  helpers_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE help_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(request_id, user_id)
);

-- ============================================
-- 10. MARKETPLACE (İşletmeler & Pazar)
-- ============================================

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  district district_type NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  cover_url TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  rating DECIMAL(2, 1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TRY',
  images TEXT[],
  category TEXT,
  stock INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE business_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- ============================================
-- 11. PAYMENTS & DONATIONS (Stripe)
-- ============================================

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal_amount DECIMAL(10, 2) NOT NULL,
  current_amount DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'TRY',
  district district_type,
  category TEXT,
  image_url TEXT,
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  stripe_account_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TRY',
  is_anonymous BOOLEAN DEFAULT false,
  message TEXT,
  stripe_payment_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 12. FOLLOWS & CONNECTIONS
-- ============================================

CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ============================================
-- 13. REPORTS & MODERATION
-- ============================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'message', 'user', 'business')),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 14. SYSTEM TABLES
-- ============================================

-- App Settings
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Badges & Achievements
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Analytics
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  district district_type,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 15. INDEXES (Performance)
-- ============================================

-- User Profiles
CREATE INDEX idx_user_profiles_district ON user_profiles(district);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_deletion ON user_profiles(deletion_scheduled_at) WHERE deletion_scheduled_at IS NOT NULL;

-- Posts
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_district ON posts(district);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
CREATE INDEX idx_posts_location ON posts(location_lat, location_lng) WHERE location_lat IS NOT NULL;

-- Comments
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- Chat
CREATE INDEX idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX idx_chat_members_room_id ON chat_members(room_id);
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_district ON notifications(district);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(is_read, user_id);

-- Events
CREATE INDEX idx_events_district ON events(district);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_approved ON events(is_approved);

-- Help Requests
CREATE INDEX idx_help_requests_district ON help_requests(district);
CREATE INDEX idx_help_requests_category ON help_requests(category);
CREATE INDEX idx_help_requests_status ON help_requests(status);
CREATE INDEX idx_help_requests_created_at ON help_requests(created_at DESC);

-- Businesses
CREATE INDEX idx_businesses_district ON businesses(district);
CREATE INDEX idx_businesses_category ON businesses(category);
CREATE INDEX idx_businesses_verified ON businesses(is_verified);

-- Follows
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Full-text search indexes
CREATE INDEX idx_posts_content_search ON posts USING GIN(to_tsvector('turkish', content));
CREATE INDEX idx_businesses_search ON businesses USING GIN(to_tsvector('turkish', name || ' ' || description));
CREATE INDEX idx_user_profiles_search ON user_profiles USING GIN(to_tsvector('turkish', full_name));

-- ============================================
-- 16. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lazgpt_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lazgpt_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Profiles viewable by everyone" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Posts Policies
CREATE POLICY "Posts viewable by everyone" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Post Likes Policies
CREATE POLICY "Likes viewable by everyone" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments Policies
CREATE POLICY "Comments viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Comment Likes Policies
CREATE POLICY "Comment likes viewable by everyone" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can like comments" ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike comments" ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Chat Rooms Policies
CREATE POLICY "Users view their rooms" ON chat_rooms FOR SELECT 
  USING (id IN (SELECT room_id FROM chat_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can create rooms" ON chat_rooms FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Chat Members Policies
CREATE POLICY "Users view room members" ON chat_members FOR SELECT 
  USING (room_id IN (SELECT room_id FROM chat_members WHERE user_id = auth.uid()));
CREATE POLICY "Room admins can add members" ON chat_members FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_members WHERE room_id = chat_members.room_id AND user_id = auth.uid() AND role = 'admin'
  ));

-- Messages Policies
CREATE POLICY "Users view messages in their rooms" ON messages FOR SELECT 
  USING (room_id IN (SELECT room_id FROM chat_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can send messages to their rooms" ON messages FOR INSERT 
  WITH CHECK (room_id IN (SELECT room_id FROM chat_members WHERE user_id = auth.uid()) AND auth.uid() = user_id);
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE USING (auth.uid() = user_id);

-- Notifications Policies
CREATE POLICY "Users view their notifications" ON notifications FOR SELECT 
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE 
  USING (user_id = auth.uid());

-- LazGPT Policies
CREATE POLICY "Users view own conversations" ON lazgpt_conversations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users create own conversations" ON lazgpt_conversations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users view own messages" ON lazgpt_messages FOR SELECT 
  USING (conversation_id IN (SELECT id FROM lazgpt_conversations WHERE user_id = auth.uid()));
CREATE POLICY "Users create own messages" ON lazgpt_messages FOR INSERT 
  WITH CHECK (conversation_id IN (SELECT id FROM lazgpt_conversations WHERE user_id = auth.uid()));

-- Events Policies
CREATE POLICY "Events viewable by everyone" ON events FOR SELECT USING (true);
CREATE POLICY "Users can create events" ON events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON events FOR UPDATE USING (auth.uid() = user_id);

-- Event Attendees Policies
CREATE POLICY "Attendees viewable by everyone" ON event_attendees FOR SELECT USING (true);
CREATE POLICY "Users can join events" ON event_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update attendance" ON event_attendees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can leave events" ON event_attendees FOR DELETE USING (auth.uid() = user_id);

-- Help Requests Policies
CREATE POLICY "Help requests viewable by everyone" ON help_requests FOR SELECT USING (true);
CREATE POLICY "Users can create help requests" ON help_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own help requests" ON help_requests FOR UPDATE USING (auth.uid() = user_id);

-- Help Responses Policies
CREATE POLICY "Help responses viewable by everyone" ON help_responses FOR SELECT USING (true);
CREATE POLICY "Users can respond to help requests" ON help_responses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Businesses Policies
CREATE POLICY "Businesses viewable by everyone" ON businesses FOR SELECT USING (true);
CREATE POLICY "Users can create businesses" ON businesses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own businesses" ON businesses FOR UPDATE USING (auth.uid() = user_id);

-- Products Policies
CREATE POLICY "Products viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Business owners can manage products" ON products FOR INSERT 
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "Business owners can update products" ON products FOR UPDATE 
  USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Business Reviews Policies
CREATE POLICY "Reviews viewable by everyone" ON business_reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON business_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON business_reviews FOR UPDATE USING (auth.uid() = user_id);

-- Campaigns Policies
CREATE POLICY "Campaigns viewable by everyone" ON campaigns FOR SELECT USING (true);
CREATE POLICY "Users can create campaigns" ON campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaigns" ON campaigns FOR UPDATE USING (auth.uid() = user_id);

-- Donations Policies
CREATE POLICY "Donations viewable by campaign creators" ON donations FOR SELECT 
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Users can donate" ON donations FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Follows Policies
CREATE POLICY "Follows viewable by everyone" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Reports Policies
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);

-- Badges Policies
CREATE POLICY "Badges viewable by everyone" ON badges FOR SELECT USING (true);
CREATE POLICY "User badges viewable by everyone" ON user_badges FOR SELECT USING (true);

-- Admin Users (Restricted)
CREATE POLICY "Only admins can view admin users" ON admin_users FOR SELECT USING (false);
CREATE POLICY "Only admins can view admin logs" ON admin_logs FOR SELECT USING (false);

-- App Settings Policies
CREATE POLICY "App settings viewable by everyone" ON app_settings FOR SELECT USING (true);

-- Analytics Policies
CREATE POLICY "Analytics insertable by everyone" ON analytics_events FOR INSERT WITH CHECK (true);

-- ============================================
-- 17. FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_help_requests_updated_at BEFORE UPDATE ON help_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Post Likes Count
CREATE OR REPLACE FUNCTION increment_post_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_post_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_post_like_created AFTER INSERT ON post_likes
  FOR EACH ROW EXECUTE FUNCTION increment_post_likes();
CREATE TRIGGER on_post_like_deleted AFTER DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION decrement_post_likes();

-- Comment Count
CREATE OR REPLACE FUNCTION increment_post_comments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_post_comments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_comment_created AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION increment_post_comments();
CREATE TRIGGER on_comment_deleted AFTER DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION decrement_post_comments();

-- Comment Likes Count
CREATE OR REPLACE FUNCTION increment_comment_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_comment_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_comment_like_created AFTER INSERT ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION increment_comment_likes();
CREATE TRIGGER on_comment_like_deleted AFTER DELETE ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION decrement_comment_likes();

-- Event Attendees Count
CREATE OR REPLACE FUNCTION update_event_attendees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'going' THEN
    UPDATE events SET attendees_count = attendees_count + 1 WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'going' THEN
    UPDATE events SET attendees_count = attendees_count - 1 WHERE id = OLD.event_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'going' AND NEW.status != 'going' THEN
      UPDATE events SET attendees_count = attendees_count - 1 WHERE id = NEW.event_id;
    ELSIF OLD.status != 'going' AND NEW.status = 'going' THEN
      UPDATE events SET attendees_count = attendees_count + 1 WHERE id = NEW.event_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_event_attendee_change AFTER INSERT OR UPDATE OR DELETE ON event_attendees
  FOR EACH ROW EXECUTE FUNCTION update_event_attendees_count();

-- Help Responses Count
CREATE OR REPLACE FUNCTION update_helpers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE help_requests SET helpers_count = helpers_count + 1 WHERE id = NEW.request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE help_requests SET helpers_count = helpers_count - 1 WHERE id = OLD.request_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_help_response_change AFTER INSERT OR DELETE ON help_responses
  FOR EACH ROW EXECUTE FUNCTION update_helpers_count();

-- Business Rating Update
CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE businesses 
  SET 
    rating = (SELECT AVG(rating) FROM business_reviews WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)),
    reviews_count = (SELECT COUNT(*) FROM business_reviews WHERE business_id = COALESCE(NEW.business_id, OLD.business_id))
  WHERE id = COALESCE(NEW.business_id, OLD.business_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_business_review_change AFTER INSERT OR UPDATE OR DELETE ON business_reviews
  FOR EACH ROW EXECUTE FUNCTION update_business_rating();

-- Campaign Amount Update
CREATE OR REPLACE FUNCTION update_campaign_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE campaigns 
    SET current_amount = current_amount + NEW.amount
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_donation_completed AFTER UPDATE ON donations
  FOR EACH ROW 
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION update_campaign_amount();

-- Last message update for chat rooms
CREATE OR REPLACE FUNCTION update_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms SET last_message_at = NEW.created_at WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_created AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_room_last_message();

-- Unread count for chat members
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_members 
  SET unread_count = unread_count + 1 
  WHERE room_id = NEW.room_id 
    AND user_id != NEW.user_id
    AND (last_read_at IS NULL OR last_read_at < NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_message AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION increment_unread_count();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, district)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kullanıcı'),
    COALESCE((NEW.raw_user_meta_data->>'district')::district_type, 'Ortahisar')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Schedule account deletion
CREATE OR REPLACE FUNCTION schedule_account_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deletion_requested_at IS NOT NULL AND OLD.deletion_requested_at IS NULL THEN
    NEW.deletion_scheduled_at = NEW.deletion_requested_at + INTERVAL '7 days';
  ELSIF NEW.deletion_requested_at IS NULL AND OLD.deletion_requested_at IS NOT NULL THEN
    NEW.deletion_scheduled_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_deletion_request BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION schedule_account_deletion();

-- ============================================
-- 18. DEFAULT DATA
-- ============================================

-- Default Admin User
-- Email: sonertoprak@litxtech.com
-- Password: admin123
-- ⚠️ DEĞİŞTİRMEYİ UNUTMAYIN!
INSERT INTO admin_users (email, password_hash, full_name, role) 
VALUES (
  'sonertoprak@litxtech.com', 
  '$2a$10$N9qo8uLOickgx2ZMRZoMye6MmWQJGTnJC7P4F6pFg/xGI5GZ/HW0e',
  'Admin',
  'super_admin'
)
ON CONFLICT (email) DO NOTHING;

-- Default Badges
INSERT INTO badges (name, description, icon, points) VALUES
  ('first_post', 'İlk paylaşımını yaptın!', '🎉', 10),
  ('verified', 'Kimliğini doğruladın', '✅', 50),
  ('helpful', '10 yardım isteğine cevap verdin', '🤝', 100),
  ('social', '100 takipçiye ulaştın', '👥', 200),
  ('local_hero', 'İlçende en aktif kullanıcısın', '🏆', 500),
  ('event_organizer', '5 etkinlik düzenledin', '📅', 150),
  ('photographer', '50 fotoğraf paylaştın', '📸', 100),
  ('supporter', 'İlk bağışını yaptın', '💝', 50)
ON CONFLICT (name) DO NOTHING;

-- Default App Settings
INSERT INTO app_settings (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('min_app_version', '"1.0.0"'),
  ('features', '{"chat": true, "events": true, "marketplace": true, "donations": true}'),
  ('contact', '{"email": "support@litxtech.com", "phone": "+1 307 271 5151", "website": "https://www.litxtech.com"}'),
  ('policies', '{"privacy": "https://www.litxtech.com/privacy-policy", "terms": "https://www.litxtech.com/terms-of-service", "commercial": "https://www.litxtech.com/commercial-agreement"}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================
-- 19. HELPER FUNCTIONS (API için)
-- ============================================

-- Get user feed
CREATE OR REPLACE FUNCTION get_user_feed(
  p_user_id UUID,
  p_district district_type DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  district district_type,
  content TEXT,
  media_url TEXT[],
  media_type TEXT,
  likes_count INTEGER,
  comments_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  is_liked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    up.full_name,
    up.avatar_url,
    p.district,
    p.content,
    p.media_url,
    p.media_type,
    p.likes_count,
    p.comments_count,
    p.created_at,
    EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = p_user_id) as is_liked
  FROM posts p
  JOIN user_profiles up ON p.user_id = up.id
  WHERE (p_district IS NULL OR p.district = p_district)
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unread notifications count
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM notifications WHERE user_id = p_user_id AND is_read = false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user stats
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  posts_count INTEGER,
  followers_count INTEGER,
  following_count INTEGER,
  points INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM posts WHERE user_id = p_user_id),
    (SELECT COUNT(*)::INTEGER FROM follows WHERE following_id = p_user_id),
    (SELECT COUNT(*)::INTEGER FROM follows WHERE follower_id = p_user_id),
    (SELECT points FROM user_profiles WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search users by name
CREATE OR REPLACE FUNCTION search_users(
  search_term TEXT,
  user_district district_type DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  district district_type,
  bio TEXT,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.full_name,
    up.avatar_url,
    up.district,
    up.bio,
    similarity(up.full_name, search_term) as similarity_score
  FROM user_profiles up
  WHERE 
    (user_district IS NULL OR up.district = user_district)
    AND (
      up.full_name ILIKE '%' || search_term || '%'
      OR similarity(up.full_name, search_term) > 0.1
    )
  ORDER BY similarity_score DESC, up.full_name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 20. REALTIME SETUP
-- ============================================

-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_members;

-- ============================================
-- ✅ KURULUM TAMAMLANDI!
-- ============================================
-- 
-- Sonraki Adımlar:
-- 1. Supabase Dashboard > Authentication > Providers'dan Google OAuth'u aktifleştirin
-- 2. Supabase Dashboard > Authentication > Email Templates'i düzenleyin
-- 3. Supabase Dashboard > Storage'dan "avatars", "posts", "events", "businesses", "help-requests" bucket'ları oluşturun
-- 4. Admin şifrenizi değiştirin (yukarıdaki default şifre: admin123)
-- 5. .env dosyasına Supabase anahtarlarınızı ekleyin
-- 
-- Tablolar: ✅ Oluşturuldu (20+ tablo)
-- İndeksler: ✅ Oluşturuldu (Performance optimized)
-- RLS Policies: ✅ Oluşturuldu (Güvenlik sağlandı)
-- Triggers: ✅ Oluşturuldu (Auto-update mekanizmaları)
-- Functions: ✅ Oluşturuldu (Helper fonksiyonlar)
-- Default Data: ✅ Eklendi (Admin, badges, settings)
-- Full-text Search: ✅ Türkçe dil desteği ile
-- Realtime: ✅ Chat ve bildirimler için aktif
-- 
-- Hazır! 🚀
-- ============================================
