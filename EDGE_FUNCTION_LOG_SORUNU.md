# 🔍 EDGE FUNCTION LOG SORUNU - ÇÖZÜM

## ❌ SORUN

**Yeni log yok, sadece eski "shutdown" log'u var.**

**Anlamı:** Edge Function hiç çağrılmıyor olabilir.

---

## 🔍 KONTROL ADIMLARI

### 1. ✅ Expo App Çalışıyor mu?

**Kontrol:**
```powershell
npx expo start --clear
```

**Beklenen:**
- Expo başlamalı
- Metro bundler çalışmalı
- Uygulama açılmalı

---

### 2. ✅ tRPC Request Gönderiliyor mu?

**Expo terminal'inde kontrol edin:**
- `tRPC base URL (Supabase Edge Functions) https://...supabase.co/functions/v1/trpc/api/trpc` görmelisiniz
- `✅ Adding auth token to tRPC request` görmelisiniz (auth varsa)
- `⚠️ No auth token available` görmelisiniz (auth yoksa)

**Eğer bu log'ları görmüyorsanız:**
- tRPC client çalışmıyor olabilir
- Request gönderilmiyor olabilir

---

### 3. ✅ Supabase Dashboard Log Filtreleri

**Supabase Dashboard'da:**
1. Edge Functions > trpc > Logs
2. **Filtreleri kontrol edin:**
   - Time range (son 1 saat, son 24 saat, vb.)
   - Log level (All, Error, Info, vb.)
   - Event type (All, Request, Shutdown, vb.)

**Önerilen Filtreler:**
- Time range: Son 1 saat
- Log level: All
- Event type: All

---

### 4. ✅ Edge Function Deploy Edildi mi?

**Kontrol:**
```powershell
supabase functions list
```

**Beklenen:**
```
trpc (deployed)
```

**Eğer deploy edilmemişse:**
```powershell
supabase functions deploy trpc
```

---

### 5. ✅ Expo App'ten Test

**En önemli test:**

1. **Expo'yu başlatın:**
   ```powershell
   npx expo start --clear
   ```

2. **Feed sayfasını açın:**
   - Post'lar yüklenmeye çalışmalı
   - tRPC request gönderilmeli

3. **Expo terminal'inde kontrol edin:**
   - tRPC request log'larını görüyor musunuz?
   - Hata var mı?

4. **Supabase Dashboard'da kontrol edin:**
   - Edge Functions > trpc > Logs
   - Yeni log'lar görünüyor mu?

---

## 🔧 ÇÖZÜMLER

### Çözüm 1: Expo'yu Yeniden Başlatın

```powershell
npx expo start --clear
```

**Neden?**
- Cache temizlenir
- tRPC client yeniden başlatılır
- Yeni request'ler gönderilir

---

### Çözüm 2: Supabase Dashboard Log Filtrelerini Kontrol Edin

**Supabase Dashboard'da:**
1. Edge Functions > trpc > Logs
2. **Time range'i değiştirin:**
   - Son 1 saat → Son 24 saat
   - Son 24 saat → Son 7 gün

3. **Event type'i değiştirin:**
   - All → Request
   - Request → All

---

### Çözüm 3: Edge Function'ı Manuel Test Edin

**Supabase Dashboard'da:**
1. Edge Functions > trpc > Invoke
2. **Test edin:**
   - Request body: `{}`
   - Headers: (boş bırakın veya anon key ekleyin)

3. **Log'ları kontrol edin:**
   - Yeni log görünüyor mu?

---

### Çözüm 4: tRPC Client Log'larını Kontrol Edin

**Expo terminal'inde şunları görmelisiniz:**

**Başarılı:**
```
tRPC base URL (Supabase Edge Functions) https://...supabase.co/functions/v1/trpc/api/trpc
✅ Adding auth token to tRPC request
```

**Hata:**
```
⚠️ No auth token available - request will be unauthenticated
Failed to attach Supabase auth header
```

**Eğer hiç log görmüyorsanız:**
- tRPC client çalışmıyor olabilir
- Request gönderilmiyor olabilir

---

## 📋 KONTROL LİSTESİ

- [ ] Expo app çalışıyor mu?
- [ ] Expo terminal'inde tRPC log'ları görünüyor mu?
- [ ] Supabase Dashboard log filtreleri doğru mu?
- [ ] Edge Function deploy edildi mi?
- [ ] Feed sayfası açılıyor mu?
- [ ] Post'lar yükleniyor mu?

---

## 🎯 SONRAKI ADIM

**1. Expo'yu başlatın:**
```powershell
npx expo start --clear
```

**2. Feed sayfasını açın:**
- Post'lar yüklenmeye çalışmalı

**3. Expo terminal'inde kontrol edin:**
- tRPC request log'larını görüyor musunuz?

**4. Supabase Dashboard'da kontrol edin:**
- Edge Functions > trpc > Logs
- Time range: Son 1 saat
- Yeni log'lar görünüyor mu?

---

## ✅ BEKLENEN SONUÇ

**Expo terminal'inde:**
```
tRPC base URL (Supabase Edge Functions) https://...supabase.co/functions/v1/trpc/api/trpc
✅ Adding auth token to tRPC request
```

**Supabase Dashboard'da:**
```
tRPC request: {
  method: "POST",
  url: "...",
  pathname: "/functions/v1/trpc/api/trpc/post.getPosts",
  hasAuth: true
}
```

---

## 🚀 HEMEN TEST EDİN

**Expo'yu başlatın ve feed sayfasını açın!**

Log'lar görünmeye başlamalı! 🎯

