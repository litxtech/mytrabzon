-- ============================================
-- EDGE FUNCTIONS PERFORMANCE İYİLEŞTİRMELERİ
-- ============================================
-- Execution time'ı düşürmek için gerekli index'ler ve optimizasyonlar
-- ============================================

-- ============================================
-- 1. CHAT TABLES PERFORMANCE INDEXES
-- ============================================

-- Chat Members - User ID ve Room ID composite index (en çok kullanılan sorgu)
CREATE INDEX IF NOT EXISTS idx_chat_members_user_room 
  ON chat_members(user_id, room_id);

-- Chat Members - Room ID ve User ID için ayrı index'ler (JOIN performansı)
CREATE INDEX IF NOT EXISTS idx_chat_members_room_user 
  ON chat_members(room_id, user_id);

-- Messages - Room ID ve Created At composite index (mesaj listesi için)
CREATE INDEX IF NOT EXISTS idx_messages_room_created 
  ON messages(room_id, created_at DESC);

-- Messages - User ID ve Created At (kullanıcı mesajları için)
CREATE INDEX IF NOT EXISTS idx_messages_user_created 
  ON messages(user_id, created_at DESC);

-- Chat Rooms - Last Message At index (sıralama için)
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message 
  ON chat_rooms(last_message_at DESC NULLS LAST);

-- Chat Rooms - Type ve Created By (filtreleme için)
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type_created 
  ON chat_rooms(type, created_by);

-- ============================================
-- 2. KYC TABLES PERFORMANCE INDEXES
-- ============================================

-- KYC Requests - User ID ve Status composite index
CREATE INDEX IF NOT EXISTS idx_kyc_requests_user_status 
  ON kyc_requests(user_id, status);

-- KYC Requests - Status ve Created At (admin listesi için)
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status_created 
  ON kyc_requests(status, created_at DESC);

-- ============================================
-- 3. ANALYZE TABLES (Query Planner için)
-- ============================================

ANALYZE chat_rooms;
ANALYZE chat_members;
ANALYZE messages;
ANALYZE message_reactions;
ANALYZE blocked_users;
ANALYZE kyc_requests;
ANALYZE kyc_documents;
ANALYZE profiles;

-- ============================================
-- 4. VACUUM (Gereksiz verileri temizle)
-- ============================================

VACUUM ANALYZE chat_rooms;
VACUUM ANALYZE chat_members;
VACUUM ANALYZE messages;

-- ============================================
-- 5. RLS POLICY OPTIMIZATION
-- ============================================
-- Mevcut policies'ler zaten optimize edilmiş durumda
-- Recursion olmayan versiyonlar kullanılıyor

-- ============================================
-- TAMAMLANDI!
-- ============================================
-- Bu index'ler execution time'ı önemli ölçüde düşürecektir.
-- Özellikle chat-get-rooms ve chat-get-messages için.
-- ============================================

