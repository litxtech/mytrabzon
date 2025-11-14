# 🧪 SUPABASE EDGE FUNCTION TEST - DÜZELTME

## ❌ SORUN

**401 Unauthorized** hatası alıyorsunuz.

**Sebep:** Supabase Edge Functions varsayılan olarak auth gerektirebilir.

---

## ✅ ÇÖZÜM

### Yöntem 1: Anon Key ile Test (Önerilen)

**cURL:**
```bash
curl https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc/example.hi \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**PowerShell:**
```powershell
$anonKey = "YOUR_ANON_KEY"
Invoke-WebRequest -Uri "https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc/example.hi" `
  -Headers @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
  }
```

---

### Yöntem 2: Supabase Dashboard'dan Test

1. **Supabase Dashboard'a gidin:**
   - https://supabase.com/dashboard/project/xcvcplwimicylaxghiak

2. **Edge Functions > trpc > Invoke:**
   - Dashboard'da "Invoke" butonuna tıklayın
   - Test edebilirsiniz (anon key otomatik eklenir)

---

### Yöntem 3: Expo App'ten Test (En İyi)

**En iyi test yöntemi Expo app'ten yapmaktır:**
- Expo app'te feed sayfasını açın
- Post'lar yüklenmeli
- Hata olmamalı

**Neden?**
- Expo app zaten anon key'i kullanıyor
- Auth token otomatik ekleniyor
- Gerçek kullanım senaryosu

---

## 🔍 ANON KEY'İ BULMA

**Supabase Dashboard'da:**
1. Settings > API
2. "anon public" key'i kopyalayın
3. Test'te kullanın

**Veya `.env` dosyasından:**
```
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ✅ BAŞARILI TEST İŞARETLERİ

### ✅ Çalışıyorsa:
```json
{
  "result": {
    "data": {
      "message": "Hello from Supabase Edge Functions!"
    }
  }
}
```

### ❌ Hala 401 Alıyorsanız:
- Anon key doğru mu kontrol edin
- Edge Function'da auth kontrolü var mı kontrol edin
- Supabase Dashboard log'larını kontrol edin

---

## 🎯 ÖNERİLEN TEST YÖNTEMİ

**En iyi test yöntemi Expo app'ten yapmaktır:**

1. **Expo'yu başlatın:**
   ```powershell
   npx expo start --clear
   ```

2. **Feed sayfasını açın:**
   - Post'lar yüklenmeli
   - Hata olmamalı

3. **Supabase Dashboard'da log'ları kontrol edin:**
   - Edge Functions > trpc > Logs
   - Request'leri görüntüleyin

---

## 📋 HIZLI TEST (Anon Key ile)

**PowerShell'de:**
```powershell
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdmNwbHdpbWljeWxheGdoaWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NTAyNzUsImV4cCI6MjA3NzQyNjI3NX0.m-eijSqNdec6zalRvurUpKiVpecTBGAG6a8rIpEuPK8"

Invoke-WebRequest -Uri "https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc/example.hi" `
  -Method GET `
  -Headers @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
  }
```

**Not:** Anon key'i `.env` dosyasından alın veya Supabase Dashboard'dan kopyalayın.

---

## ✅ SONUÇ

**Evet, bu URL'yi sorgulayabilirsiniz!**

**Ama:**
- Anon key eklemeniz gerekebilir
- Veya Expo app'ten test edin (daha kolay)

**Önerilen:** Expo app'ten test edin! 🚀

