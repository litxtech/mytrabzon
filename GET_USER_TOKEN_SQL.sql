-- ============================================
-- KULLANICI BİLGİLERİ İÇİN SQL SORGULARI
-- ============================================
-- Email: support@litxtech.com
-- User UID: 98542f02-11f8-4ccd-b38d-4dd42066daa7
-- ============================================

-- 1. Kullanıcı bilgilerini kontrol et
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    email_confirmed_at,
    phone_confirmed_at
FROM auth.users
WHERE id = '98542f02-11f8-4ccd-b38d-4dd42066daa7'
   OR email = 'support@litxtech.com';

-- 2. Profile bilgilerini kontrol et
SELECT 
    p.*,
    u.email,
    u.created_at as user_created_at
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.id = '98542f02-11f8-4ccd-b38d-4dd42066daa7'
   OR u.email = 'support@litxtech.com';

-- 3. Kullanıcının chat odalarını kontrol et
SELECT 
    cr.*,
    cm.role,
    cm.unread_count,
    cm.last_read_at
FROM chat_rooms cr
JOIN chat_members cm ON cm.room_id = cr.id
WHERE cm.user_id = '98542f02-11f8-4ccd-b38d-4dd42066daa7'
ORDER BY cr.last_message_at DESC NULLS LAST;

-- 4. Kullanıcının mesajlarını kontrol et
SELECT 
    m.*,
    cr.name as room_name,
    cr.type as room_type
FROM messages m
JOIN chat_rooms cr ON cr.id = m.room_id
WHERE m.user_id = '98542f02-11f8-4ccd-b38d-4dd42066daa7'
ORDER BY m.created_at DESC
LIMIT 20;

-- 5. Kullanıcının KYC durumunu kontrol et
SELECT 
    kr.*,
    COUNT(kd.id) as document_count
FROM kyc_requests kr
LEFT JOIN kyc_documents kd ON kd.kyc_id = kr.id
WHERE kr.user_id = '98542f02-11f8-4ccd-b38d-4dd42066daa7'
GROUP BY kr.id
ORDER BY kr.created_at DESC;

-- 6. Kullanıcının admin durumunu kontrol et
SELECT 
    au.*,
    u.email
FROM admin_users au
JOIN auth.users u ON u.id = au.user_id
WHERE au.user_id = '98542f02-11f8-4ccd-b38d-4dd42066daa7'
   OR u.email = 'support@litxtech.com';

-- 7. Kullanıcının engellediği/engellendiği kullanıcıları kontrol et
SELECT 
    bu.*,
    blocker.email as blocker_email,
    blocked.email as blocked_email
FROM blocked_users bu
JOIN auth.users blocker ON blocker.id = bu.blocker_id
JOIN auth.users blocked ON blocked.id = bu.blocked_id
WHERE bu.blocker_id = '98542f02-11f8-4ccd-b38d-4dd42066daa7'
   OR bu.blocked_id = '98542f02-11f8-4ccd-b38d-4dd42066daa7';

-- ============================================
-- NOT: Token'ı SQL ile ALAMAZSINIZ!
-- ============================================
-- Token'ı almak için:
-- 1. Supabase Dashboard → Authentication → Users → support@litxtech.com → Access Token
-- 2. Veya get-user-token.ps1 script'ini çalıştırın (şifre ile login)
-- 3. Veya uygulamanızdan session.access_token alın
-- ============================================

