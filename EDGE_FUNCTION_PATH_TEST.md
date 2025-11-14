# 🔍 SUPABASE EDGE FUNCTION PATH TEST

## ❌ SORUN

**404 Not Found** hatası alıyorsunuz.

**Sebep:** Path yapısı yanlış olabilir.

---

## 🔍 PATH YAPISI KONTROLÜ

### Mevcut Yapı:

**Client URL:**
```
https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc
```

**Edge Function Path:**
```
/functions/v1/trpc/api/trpc/example.hi
```

**fetchRequestHandler endpoint:**
```
endpoint: "/api/trpc"
```

---

## 🧪 FARKLI PATH YAPILARINI TEST ET

### Test 1: Sadece Function URL (Base)

**URL:**
```
https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc
```

**Beklenen:**
- 404 veya 405 (normal, çünkü procedure path'i yok)

---

### Test 2: /api/trpc ile

**URL:**
```
https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc/example.hi
```

**Beklenen:**
- JSON yanıt (çalışıyorsa)
- 404 (path yanlışsa)

---

### Test 3: Sadece / ile

**URL:**
```
https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/example.hi
```

**Beklenen:**
- JSON yanıt (çalışıyorsa)
- 404 (path yanlışsa)

---

## ✅ EN İYİ TEST YÖNTEMİ

**Expo app'ten test edin:**

1. **Expo'yu başlatın:**
   ```powershell
   npx expo start --clear
   ```

2. **Feed sayfasını açın:**
   - Post'lar yüklenmeli
   - Hata olmamalı

3. **Supabase Dashboard'da log'ları kontrol edin:**
   - Edge Functions > trpc > Logs
   - Pathname'i görüntüleyin
   - Gerçek path'i öğrenin

---

## 🔍 SUPABASE DASHBOARD'DA KONTROL

1. **Supabase Dashboard'a gidin:**
   - https://supabase.com/dashboard/project/xcvcplwimicylaxghiak

2. **Edge Functions > trpc > Logs:**
   - Son request'leri görüntüleyin
   - Pathname'i kontrol edin
   - Örnek:
     ```
     pathname: /functions/v1/trpc/api/trpc/example.hi
     ```

3. **Gerçek path'i öğrenin:**
   - Log'larda pathname'i görüntüleyin
   - Doğru path'i bulun

---

## 📋 HIZLI ÇÖZÜM

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
   - Pathname'i görüntüleyin
   - Gerçek path'i öğrenin

---

## ✅ SONUÇ

**404 hatası alıyorsanız:**

1. **Expo app'ten test edin** (en kolay)
2. **Supabase Dashboard log'larını kontrol edin** (gerçek path'i öğrenin)
3. **Path yapısını düzeltin** (gerekirse)

**Önerilen:** Expo app'ten test edin! 🚀

