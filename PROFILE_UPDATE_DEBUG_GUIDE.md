# Profil Güncelleme Hataları Çözüm Kılavuzu

## 🔴 Sorunlar

1. **"Error updating profile: [object Object]"** - Hata mesajı düzgün gösterilmiyor
2. **"Profile update error: [object Object]"** - Frontend'de hata detayları eksik
3. **Profil güncelleniyor ama eski haline geri dönüyor**

## ✅ Çözümler

### 1. Supabase SQL Düzeltmeleri

Aşağıdaki SQL dosyasını Supabase SQL Editor'de çalıştırın:

```bash
FIX_PROFILE_UPDATE_ERRORS.sql
```

Bu dosya:
- ✅ `show_in_directory` kolonunu ekler (yoksa)
- ✅ Email UNIQUE constraint'ini ekler
- ✅ `updated_at` trigger'ını düzeltir
- ✅ RLS politikalarını doğru şekilde ayarlar
- ✅ Varsayılan değerleri atar
- ✅ İndeksleri oluşturur

### 2. Kod Düzeltmeleri Yapıldı

#### Backend (`backend/trpc/routes/user/update-profile/route.ts`):
- ✅ Detaylı hata logları eklendi
- ✅ Hata mesajları düzgün formatlandı
- ✅ `updated_at` otomatik ekleniyor
- ✅ Data kontrolü yapılıyor

#### Frontend Context (`contexts/AuthContext.tsx`):
- ✅ Detaylı hata logları eklendi
- ✅ Hata mesajları düzgün yakalanıyor
- ✅ User kontrolü yapılıyor
- ✅ Profile refresh mekanizması geliştirildi

#### Profile Edit Screen (`app/profile/edit.tsx`):
- ✅ Hata mesajları kullanıcıya gösteriliyor
- ✅ Detaylı error logging
- ✅ Null değerler düzgün handle ediliyor
- ✅ Email varsayılan değeri korunuyor

### 3. Hata Kontrol Listesi

Aşağıdaki adımları sırayla yapın:

#### ✅ Supabase Kontrolleri

1. **SQL dosyasını çalıştırın:**
   - Supabase Dashboard → SQL Editor
   - `FIX_PROFILE_UPDATE_ERRORS.sql` dosyasını yapıştırın
   - Run tuşuna basın
   - Success mesajlarını kontrol edin

2. **Tablo yapısını kontrol edin:**
```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
```

3. **RLS Politikalarını kontrol edin:**
```sql
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies
WHERE tablename = 'user_profiles';
```

4. **Mevcut profilleri kontrol edin:**
```sql
SELECT 
    id,
    email,
    full_name,
    district,
    show_in_directory,
    created_at,
    updated_at
FROM user_profiles
LIMIT 10;
```

#### ✅ Uygulama Kontrolleri

1. **Console loglarını açın:**
   - Web: Browser DevTools Console
   - Mobile: React Native Debugger veya Expo Go

2. **Profil güncelleme testi:**
   - Profile Edit sayfasına gidin
   - Bir alan değiştirin (örn: Bio)
   - Save'e basın
   - Console'da şu logları arayın:
     - `💾 Saving profile with data:`
     - `🔄 Updating profile with:`
     - `✅ Profile updated successfully`

3. **Hata durumunda:**
   - Console'da `❌` ile başlayan hataları arayın
   - Error mesajındaki detayları okuyun:
     - `message`: Ana hata mesajı
     - `code`: Supabase hata kodu
     - `details`: Ek detaylar
     - `hint`: Çözüm önerisi

### 4. Yaygın Hatalar ve Çözümleri

#### Hata: "relation 'user_profiles' does not exist"
**Çözüm:**
```sql
-- Tablo gerçekten var mı kontrol et
SELECT tablename FROM pg_tables WHERE tablename = 'user_profiles';

-- Yoksa COMPLETE_SQL_SCHEMA.sql'i çalıştır
```

#### Hata: "column 'show_in_directory' does not exist"
**Çözüm:**
```sql
-- FIX_PROFILE_UPDATE_ERRORS.sql dosyasını çalıştır
-- veya manuel olarak:
ALTER TABLE user_profiles ADD COLUMN show_in_directory BOOLEAN DEFAULT true;
```

#### Hata: "new row violates row-level security policy"
**Çözüm:**
```sql
-- RLS politikalarını kontrol et ve düzelt
-- FIX_PROFILE_UPDATE_ERRORS.sql dosyasındaki RLS bölümünü çalıştır
```

#### Hata: "null value in column 'email' violates not-null constraint"
**Çözüm:**
```sql
-- Email zorunlu, frontend'de email gönderildiğinden emin ol
-- veya email kolonunu nullable yap:
ALTER TABLE user_profiles ALTER COLUMN email DROP NOT NULL;
```

### 5. Test Senaryoları

#### Test 1: Temel Güncelleme
```typescript
// Profile Edit sayfasında
// 1. Bio değiştir: "Test bio"
// 2. Save'e bas
// 3. Alert "Başarılı" mesajı gelmeli
// 4. Profile sayfasında yeni bio görünmeli
```

#### Test 2: Çoklu Alan Güncelleme
```typescript
// 1. Full name: "Test User"
// 2. Bio: "Test bio"
// 3. Phone: "5551234567"
// 4. Save'e bas
// 5. Tüm alanlar güncellenmiş olmalı
```

#### Test 3: Privacy Settings
```typescript
// 1. "Yaş" gizliliğini değiştir (göz ikonuna bas)
// 2. Save'e bas
// 3. Privacy settings kaydedilmeli
```

### 6. Monitoring

Console'da bu mesajları görmelisiniz:

**Başarılı güncelleme:**
```
💾 Saving profile with data: {...}
🔄 Updating profile with: {...}
🔑 User ID: xxx-xxx-xxx
✅ Profile updated successfully in database
🔄 Refreshing profile to ensure consistency...
✅ Profile refreshed successfully
```

**Hata durumu:**
```
❌ Profile update error: {
  message: "...",
  name: "...",
  stack: "...",
  full: {...}
}
```

### 7. Production'a Almadan Önce

- [ ] SQL düzeltmeleri production Supabase'e uygulandı
- [ ] Test kullanıcısıyla profil güncellemesi yapıldı
- [ ] Tüm alanlar (bio, phone, social media, privacy) test edildi
- [ ] Console'da hata yok
- [ ] Real-time güncelleme çalışıyor (başka sekmede aç, profil güncelle, otomatik yenilensin)

## 🆘 Hala Çözülmediyse

1. **Supabase Logs:**
   - Supabase Dashboard → Logs → API Logs
   - Son profil update request'lerini incele
   - Error status kodlarına bak (400, 401, 403, 500)

2. **Network Tab:**
   - Browser DevTools → Network
   - Update request'i bul
   - Request payload ve response'u incele

3. **Auth Kontrolü:**
```typescript
// Console'da çalıştır:
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);
```

4. **Manuel Test:**
```sql
-- Supabase SQL Editor'de manuel update dene
UPDATE user_profiles
SET bio = 'Test manuel update'
WHERE id = 'USER_ID_BURAYA';

-- Başarılı olursa sorun frontend'de
-- Başarısız olursa sorun RLS veya tablo yapısında
```

## 📞 İletişim

Hala sorun devam ediyorsa, aşağıdaki bilgileri paylaşın:

1. Console'daki tam hata mesajı
2. Supabase logs'taki error
3. Network tab'daki request/response
4. `SELECT * FROM user_profiles LIMIT 1;` sonucu (hassas bilgileri maskeleyerek)
