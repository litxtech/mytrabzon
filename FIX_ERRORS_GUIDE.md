# 🔧 HATALARI DÜZELTİN - ADIM ADIM REHBERİ

## ❌ Şu Anki Hatalar

1. **Profile not found** - Profile tablosu yanlış adlandırılmış (`user_profiles` olmalıydı `profiles`)
2. **Chat members relationship error** - `chat_members` ve `profiles` arasında ilişki yok
3. **Signup hatası** - Yeni kullanıcılar için profil oluşturulmuyor

## ✅ Çözüm - 3 ADIM

### ADIM 1: SQL Düzeltmesini Çalıştırın

1. **Supabase Dashboard'a gidin**: https://supabase.com/dashboard
2. **SQL Editor'ı açın** (Sol menüden)
3. **`FIX_ALL_ERRORS_NOW.sql` dosyasını açın** (proje dizininde)
4. **Dosyanın TAMAMINI kopyalayıp SQL Editor'a yapıştırın**
5. **"RUN" butonuna basın** (sağ üstte)
6. **Yeşil ✓ görünce tamamdır**

Bu SQL dosyası şunları yapar:
- ✅ `user_profiles` tablosunu `profiles` olarak yeniden adlandırır
- ✅ Tüm foreign key ilişkilerini düzeltir
- ✅ `chat_members` → `profiles` ilişkisini ekler
- ✅ Profile oluşturma trigger'ını düzeltir
- ✅ `public_id` sistemini düzeltir
- ✅ Mevcut kullanıcılar için profil oluşturur

### ADIM 2: Supabase Function'ı Deploy Edin

Bu işlem için Supabase CLI gereklidir. Eğer yoksa atlayabilirsiniz, SQL fix yeterli olacaktır.

```bash
# Eğer Supabase CLI kuruluysa:
cd supabase/functions/signup-init
supabase functions deploy signup-init
```

**NOT**: Bu adım opsiyoneldir. SQL trigger zaten profil oluşturacak.

### ADIM 3: Uygulamayı Test Edin

1. **Uygulamayı yeniden başlatın**:
   ```bash
   # Terminalde
   bun start
   # veya
   npm start
   ```

2. **Test senaryoları**:
   
   ✅ **Yeni Kullanıcı Kaydı**:
   - Login ekranına gidin
   - "Kayıt Ol"a tıklayın
   - Email ve şifre girin
   - Başarılı şekilde profil oluşturulmalı
   
   ✅ **Mevcut Kullanıcı Girişi**:
   - Login ekranına gidin
   - Email/şifre ile giriş yapın
   - Profile yüklenmeli, "Profile not found" hatası olmamalı
   
   ✅ **Profil Güncelleme**:
   - Profile → Settings'e gidin
   - Bilgilerinizi güncelleyin
   - "Kaydet"e basın
   - Değişiklikler başarıyla kaydedilmeli
   
   ✅ **Chat Odaları**:
   - Chat sekmesine gidin
   - Chat odaları yüklenmeli
   - "relationship between chat_members and profiles" hatası olmamalı
   
   ✅ **Gönderi Paylaşma**:
   - Feed sekmesine gidin
   - Yeni gönderi oluşturun
   - Başarıyla paylaşılmalı ve listelenmeli

## 🎯 Özel Test: Mevcut 3 Kullanıcı

SQL fix aşağıdaki kullanıcılara otomatik public_id atayacak:

1. **support@litxtech.com** → `61-1-2025`
2. **sonertoprak97@gmail.com** → `61-2-2025`
3. **snertoprak97@gmail.com** → `61-3-2025`

Bu kullanıcılarla giriş yapıp test edebilirsiniz.

## 🐛 Hala Sorun mu Var?

### Hata: "Profile not found"
```sql
-- Supabase SQL Editor'da çalıştırın:
SELECT * FROM profiles WHERE email = 'YOUR_EMAIL_HERE';
-- Sonuç yoksa:
INSERT INTO profiles (id, email, full_name, district)
SELECT id, email, 'Kullanıcı', 'Ortahisar'
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE';
```

### Hata: "relationship between chat_members and profiles"
```sql
-- Foreign key'i kontrol edin:
SELECT
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'chat_members';

-- Eğer profiles'a referans yoksa:
ALTER TABLE chat_members 
  DROP CONSTRAINT IF EXISTS chat_members_user_id_fkey,
  ADD CONSTRAINT chat_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
```

### Hata: "Database error saving new user"
```sql
-- Trigger'ı kontrol edin:
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Yoksa tekrar oluşturun:
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, district)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kullanıcı'),
    COALESCE(NEW.raw_user_meta_data->>'district', 'Ortahisar')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION create_user_profile();
```

## 📊 Veritabanı Durumunu Kontrol Etme

```sql
-- 1. Kaç kullanıcı var?
SELECT COUNT(*) as total_users FROM auth.users;

-- 2. Kaç profil var?
SELECT COUNT(*) as total_profiles FROM profiles;

-- 3. Profili olmayan kullanıcılar?
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 4. Public_id olmayan profiller?
SELECT id, email, full_name
FROM profiles
WHERE public_id IS NULL;

-- 5. Chat member ilişkileri?
SELECT 
  cm.id, 
  cm.user_id, 
  p.full_name,
  cr.name as room_name
FROM chat_members cm
LEFT JOIN profiles p ON p.id = cm.user_id
LEFT JOIN chat_rooms cr ON cr.id = cm.room_id
LIMIT 10;
```

## 🚀 Tamamlandığında

Tüm hatalar düzeltildiğinde:
- ✅ Yeni kullanıcılar otomatik profil alacak
- ✅ Profil güncellemeleri çalışacak
- ✅ Chat odaları yüklenecek
- ✅ Gönderiler paylaşılacak
- ✅ Tüm ilişkiler düzgün çalışacak

**Başarılar! 🎉**
