# 🔧 Hata Düzeltme Talimatları

## 🚨 Karşılaşılan Hatalar

1. **Error loading profile after auth change: Error: Profil bulunamadı**
2. **Failed to fetch room members [object Object]**
3. **Could not find a relationship between 'chat_members' and 'profiles' in the schema cache**

## ✅ Çözüm

### Adım 1: SQL Dosyasını Çalıştırın

1. Supabase Dashboard'a gidin: https://supabase.com/dashboard
2. SQL Editor'ı açın (sol menüden "SQL Editor")
3. `FIX_ALL_ERRORS_NOW.sql` dosyasının **TÜM İÇERİĞİNİ** kopyalayın
4. SQL Editor'a yapıştırın
5. **Run** butonuna tıklayın
6. Tüm komutların başarıyla çalıştığından emin olun

### Adım 2: Veritabanı Değişikliklerini Doğrulayın

SQL çalıştırıldıktan sonra kontrol edin:

```sql
-- Tüm kullanıcıların profili olup olmadığını kontrol edin
SELECT COUNT(*) as users_without_profile
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = u.id);
-- Sonuç 0 olmalı

-- Profiles view'inin çalıştığını kontrol edin
SELECT COUNT(*) FROM profiles;
-- Kullanıcı sayısı kadar kayıt görmeli

-- Chat members ilişkisini kontrol edin
SELECT 
  cm.id,
  cm.user_id,
  p.full_name
FROM chat_members cm
JOIN profiles p ON p.id = cm.user_id
LIMIT 5;
-- Hata vermemeli, sonuç dönmeli
```

## 🔍 Ne Yapıldı?

### 1. Profiles View Oluşturuldu
- `user_profiles` tablosu için `profiles` view'i oluşturuldu
- Artık hem `profiles` hem `user_profiles` kullanılabilir
- Geriye dönük uyumluluk sağlandı

### 2. Profil Oluşturma Trigger'ı Düzeltildi
- Yeni kullanıcı kaydında otomatik profil oluşturulur
- Hata durumlarında daha iyi error handling
- Mevcut kullanıcılar için eksik profiller oluşturuldu

### 3. Foreign Key İlişkileri Düzeltildi
- `chat_members` → `user_profiles` ilişkisi düzeltildi
- `chat_rooms` → `user_profiles` ilişkisi düzeltildi
- `messages` → `user_profiles` ilişkisi düzeltildi

### 4. RLS Policies Yeniden Oluşturuldu
- Sonsuz döngü (infinite recursion) hatası giderildi
- Daha verimli ve güvenli policy'ler
- Tüm chat işlemleri için doğru yetkilendirme

### 5. AuthContext İyileştirildi
- Profil bulunamazsa otomatik oluşturur
- Daha iyi hata yönetimi
- Kullanıcı deneyimi iyileştirildi

## 🧪 Test Etme

### Test 1: Yeni Kullanıcı Kaydı
1. Yeni bir hesap oluşturun
2. Giriş yapın
3. Profil otomatik oluşturulmalı
4. Hata olmamalı

### Test 2: Chat Listeleme
1. Uygulamaya giriş yapın
2. Chat sekmesine gidin
3. Chat odaları görünmeli
4. "Could not find relationship" hatası olmamalı

### Test 3: Profil Güncelleme
1. Profile sekmesine gidin
2. "Edit Profile" butonuna tıklayın
3. Bilgileri değiştirin
4. Kaydet butonuna tıklayın
5. Değişiklikler kaydedilmeli

### Test 4: Mesaj Gönderme
1. Bir chat odasına girin
2. Mesaj yazın ve gönderin
3. Mesaj gönderilmeli
4. "Failed to fetch room members" hatası olmamalı

## 📊 Beklenen Sonuçlar

✅ **Profil Yükleme**: Tüm kullanıcıların profili yüklenir
✅ **Chat Listeleme**: Chat odaları ve üyeler görünür
✅ **Mesajlaşma**: Mesajlar gönderilir ve alınır
✅ **Profil Güncelleme**: Profil değişiklikleri kaydedilir
✅ **Realtime**: Canlı güncellemeler çalışır

## ⚠️ Hala Hata Alıyorsanız

### Önbelleği Temizleyin
```bash
# Metro bundler'ı yeniden başlatın
# Expo uygulamamızda: shift + r veya r tuşuna basın
```

### Supabase Bağlantısını Kontrol Edin
```typescript
// lib/supabase.ts dosyasını kontrol edin
// EXPO_PUBLIC_SUPABASE_URL doğru mu?
// EXPO_PUBLIC_SUPABASE_ANON_KEY doğru mu?
```

### Loglara Bakın
- Console'da hatayı arayın
- Supabase Dashboard > Logs > Error logs
- Hangi SQL sorgusunun hata verdiğini bulun

## 🆘 Destek

Hala sorun yaşıyorsanız:

1. Console'daki tam hata mesajını kopyalayın
2. Supabase logs'larını kontrol edin
3. Hangi işlemi yaparken hata aldığınızı belirtin

## 📝 Notlar

- SQL dosyası güvenli şekilde tekrar çalıştırılabilir (idempotent)
- Mevcut veriler korunur
- Yedekleme yapmanız tavsiye edilir
- Tüm değişiklikler production-safe'dir

---

**Son Güncelleme**: 2025-11-13
**Versiyon**: 1.0.1
