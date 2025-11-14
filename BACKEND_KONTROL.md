# 🔍 BACKEND KONTROL REHBERİ

## ⚠️ MEVCUT DURUM

Terminal'de görünen:
- ✅ `tRPC base URL (env) https://3b6137c9-9f4e-4971-a4d1-f4410f1a6a2c-00-rgv4vnjcpau4.sisko.replit.dev`
- ❌ `JSON Parse error: Unexpected character: <` (Backend HTML döndürüyor)

---

## 🔧 ÇÖZÜM ADIMLARI

### 1. Backend'in Çalıştığını Kontrol Edin

**Tarayıcıda şu URL'yi açın:**
```
https://3b6137c9-9f4e-4971-a4d1-f4410f1a6a2c-00-rgv4vnjcpau4.sisko.replit.dev
```

**Beklenen yanıt:**
```json
{"status":"ok","message":"API is running"}
```

**Eğer HTML veya hata sayfası görüyorsanız:**
- Backend çalışmıyor demektir
- Rork dashboard'da backend'in aktif olduğunu kontrol edin

---

### 2. tRPC Endpoint'ini Test Edin

**Tarayıcıda şu URL'yi açın:**
```
https://3b6137c9-9f4e-4971-a4d1-f4410f1a6a2c-00-rgv4vnjcpau4.sisko.replit.dev/api/trpc/user.getProfile
```

**Beklenen yanıt:**
- JSON formatında bir yanıt (hata olsa bile JSON olmalı)
- HTML değil!

**Eğer HTML görüyorsanız:**
- Backend'de tRPC router düzgün mount edilmemiş olabilir
- `backend/hono.ts` dosyasını kontrol edin

---

### 3. Backend'i Yeniden Başlatın

**Yeni bir terminal açın:**
```powershell
cd c:\Users\ilkse\mytrabzon
npm run start-web
```

**Backend başladığında:**
- Terminal'de "Server is running" mesajı görmelisiniz
- Rork URL'si aktif olmalı

---

### 4. Expo'yu Yeniden Başlatın

**Expo terminal'inde:**
```powershell
npx expo start --clear
```

---

## 🔍 DEBUGGING

### Backend Loglarını Kontrol Edin

Backend terminal'inde şunları görmelisiniz:
- `Server started on port...`
- `tRPC endpoint: /api/trpc`
- Her istek için log mesajları

### Network İsteklerini Kontrol Edin

Expo Go veya simulator'de:
1. Developer menu'yu açın (shake device)
2. "Debug Remote JS" seçin
3. Chrome DevTools'da Network tab'ı açın
4. tRPC isteklerini kontrol edin

---

## ✅ BAŞARILI OLDUĞUNDA

- Backend URL'si JSON döndürüyor
- tRPC endpoint'leri çalışıyor
- Profil güncelleme çalışıyor
- Post oluşturma çalışıyor
- Avatar upload çalışıyor

---

## ❌ HALA HATA VARSA

1. **Rork Dashboard'u Kontrol Edin**
   - Backend'in aktif olduğundan emin olun
   - Logları kontrol edin

2. **Environment Variables'ı Kontrol Edin**
   - `.env` dosyasında `EXPO_PUBLIC_RORK_API_BASE_URL` var mı?
   - Rork URL'si doğru mu?

3. **Backend Kodunu Kontrol Edin**
   - `backend/hono.ts` dosyası doğru mu?
   - tRPC router mount edilmiş mi?

4. **Network Bağlantısını Kontrol Edin**
   - İnternet bağlantınız var mı?
   - Rork URL'si erişilebilir mi?

