# 🔧 Hata Çözüm Kılavuzu

## Tespit Edilen Hatalar ve Çözümleri

### ✅ 1. FileSystem Deprecation Hatası - ÇÖZÜLDÜ
**Hata:** `Method readAsStringAsync imported from 'expo-file-system' is deprecated`

**Çözüm:** Expo SDK 54 için güncelleme yapıldı.

**Değişiklikler:**
- `app/create-post.tsx` dosyasında eski import ve kullanım yeni API'ye güncellendi

```typescript
// Eski
import * as FileSystem from 'expo-file-system';
const base64 = await FileSystem.readAsStringAsync(uri, {
  encoding: 'base64' as FileSystem.EncodingType,
});

// Yeni
import { FileSystem } from 'expo-file-system';
const base64 = await FileSystem.readAsStringAsync(uri, {
  encoding: FileSystem.EncodingType.Base64,
});
```

---

### ⚠️ 2. JSON Parse Hatası
**Hata:** `JSON Parse error: Unexpected character: < veya S`

**Neden:** API'den JSON beklenirken HTML veya düz metin dönüyor.

**Olası Sebepler:**
1. Backend bir hata veriyor ve HTML döndürüyor
2. CORS veya auth hatası sonucu redirect oluyor
3. Endpoint yanlış veya mevcut değil

**Kontrol Edilmesi Gerekenler:**
1. Browser Developer Tools → Network sekmesinde API isteklerini kontrol edin
2. Response'ların Content-Type'ının `application/json` olduğunu doğrulayın
3. Backend'in düzgün çalıştığından emin olun

---

### ⚠️ 3. Profil Güncelleme Hatası
**Hata:** "Profil güncellenirken bir hata oluştu"

**İyileştirmeler Yapıldı:**
- `utils/retry.ts` - Daha iyi hata mesajları
- `contexts/AuthContext.tsx` - Gelişmiş hata yönetimi

**Profil güncellemesi için:**
1. `app/profile/edit.tsx` açın
2. Formu doldurun
3. Kaydet butonuna basın
4. Hata alırsanız, konsol loglarına bakın (Browser DevTools)

---

### 🔥 4. Chat Infinite Recursion Hatası - ÇÖZÜM GEREKLİ

**Hata:** `infinite recursion detected in policy for relation "chat_members"`

**Neden:** Supabase RLS (Row Level Security) policy'lerinde sonsuz döngü var.

**ÇÖZÜM ADIMLARI:**

#### Adım 1: Supabase Dashboard'a Girin
https://supabase.com → Projenizi seçin

#### Adım 2: SQL Editor'ü Açın
Sol menüden `SQL Editor` → `New Query`

#### Adım 3: SQL Scriptini Çalıştırın
`FIX_CHAT_NOW.sql` dosyasının tüm içeriğini kopyalayın ve SQL Editor'e yapıştırın.

```sql
-- FIX_CHAT_NOW.sql dosyasındaki tüm kodu buraya yapıştırın
```

#### Adım 4: RUN Butonuna Basın
Sağ alttaki yeşil `RUN` butonuna tıklayın.

#### Adım 5: Sonucu Kontrol Edin
Yeşil "Success" mesajı görmelisiniz.

#### Adım 6: Uygulamayı Yeniden Başlatın
Tarayıcıyı yenileyin veya uygulamayı kapatıp açın.

**Alternatif SQL Dosyaları:**
- `FIX_CHAT_NOW.sql` - En güncel fix (ÖNERİLEN)
- `constants/fix-chat-recursion.sql` - Eski fix
- `constants/fix-chat-policies.sql` - Eski fix

---

## 📊 Hataların Durumu

| Hata | Durum | Aksiyon Gereken |
|------|-------|----------------|
| FileSystem Deprecation | ✅ Çözüldü | Hayır |
| JSON Parse Error | ⚠️ Araştırılıyor | Network loglarına bakın |
| Profil Güncelleme | ⚠️ İyileştirildi | Test edin |
| Chat Recursion | 🔴 SQL gerekli | SQL çalıştırın |

---

## 🔍 Debug İçin Yararlı Komutlar

### 1. Tarayıcı Konsolunda Logları Görme
```javascript
// Chrome DevTools
F12 veya Ctrl+Shift+I → Console sekmesi
```

### 2. Network İsteklerini İnceleme
```javascript
// Chrome DevTools
F12 → Network sekmesi
// Filtreleme: "trpc" veya "api" yazın
```

### 3. Supabase Bağlantı Testi
```typescript
// utils/supabaseTest.ts dosyasını çalıştırın
import { testSupabaseConnection } from '@/utils/supabaseTest';
await testSupabaseConnection();
```

---

## 📝 Sık Karşılaşılan Sorunlar

### "Failed to fetch" Hatası
**Çözümler:**
1. İnternet bağlantınızı kontrol edin
2. Backend'in çalıştığından emin olun
3. CORS ayarlarını kontrol edin
4. `.env` dosyasındaki API URL'ini kontrol edin

### "TRPCClientError" Hatası
**Çözümler:**
1. Backend'in çalıştığından emin olun
2. API endpoint'inin doğru olduğunu kontrol edin
3. Auth token'ın geçerli olduğunu kontrol edin
4. Network sekmesinde response'u inceleyin

### Profil Yüklenemedi
**Çözümler:**
1. Tekrar giriş yapın
2. Tarayıcı cache'ini temizleyin
3. Supabase'de `user_profiles` tablosunu kontrol edin
4. RLS policy'lerinin doğru olduğunu kontrol edin

---

## 🆘 Yardım Gerekiyorsa

1. **Console loglarını kopyalayın**
   - Browser DevTools → Console
   - Tüm hata mesajlarını kopyalayın

2. **Network isteklerini kontrol edin**
   - Network tab → Failed isteklere bakın
   - Response içeriğini kontrol edin

3. **Supabase loglarını kontrol edin**
   - Supabase Dashboard → Logs
   - Son hataları inceleyin

---

## 📚 İlgili Dosyalar

### Frontend
- `app/create-post.tsx` - Post oluşturma (FileSystem fix uygulandı)
- `contexts/AuthContext.tsx` - Kullanıcı yönetimi
- `contexts/ChatContext.tsx` - Chat yönetimi (recursion hatası için iyileştirildi)
- `utils/retry.ts` - Retry logic (hata mesajları iyileştirildi)

### Backend
- `backend/trpc/routes/user/update-profile/route.ts` - Profil güncelleme
- `backend/trpc/routes/user/get-profile/route.ts` - Profil getirme

### SQL
- `FIX_CHAT_NOW.sql` - Chat RLS fix (ÇALIŞTIRIN!)
- `COMPLETE_SQL_SCHEMA.sql` - Tam veritabanı şeması

---

## ✨ Öneri: Önce Chat Hatasını Düzeltin

Chat infinite recursion hatası birçok özelliği etkiliyor. **İlk önce SQL script'ini çalıştırmanızı öneriyoruz.**

Adımlar:
1. `FIX_CHAT_NOW.sql` dosyasını açın
2. Tüm içeriği kopyalayın
3. Supabase SQL Editor'de çalıştırın
4. Uygulamayı yeniden başlatın
5. Chat özelliğini test edin

Bu hata düzelince diğer hatalar da çözülmüş olabilir.
