# 🔧 BACKEND SORUN GİDERME REHBERİ

## ⚠️ MEVCUT HATA

```
ERROR ❌ Profile update error: [TRPCClientError: JSON Parse error: Unexpected character: <]
```

**Anlamı**: Backend HTML döndürüyor, JSON değil. Bu, backend'in çalışmadığı veya yanlış yanıt verdiği anlamına gelir.

---

## 🔍 ADIM 1: Backend'i Test Edin

### Yöntem 1: Tarayıcıda Test

**1. Root endpoint'i test edin:**
```
https://3b6137c9-9f4e-4971-a4d1-f4410f1a6a2c-00-rgv4vnjcpau4.sisko.replit.dev
```

**Beklenen yanıt:**
```json
{"status":"ok","message":"API is running"}
```

**Eğer HTML görüyorsanız:**
- ❌ Backend çalışmıyor
- Backend'i başlatmanız gerekiyor

---

**2. tRPC endpoint'i test edin:**
```
https://3b6137c9-9f4e-4971-a4d1-f4410f1a6a2c-00-rgv4vnjcpau4.sisko.replit.dev/api/trpc/user.getProfile
```

**Beklenen yanıt:**
- JSON formatında (hata olsa bile JSON olmalı)
- Örnek: `{"error": {...}}` veya `{"result": {...}}`

**Eğer HTML görüyorsanız:**
- ❌ Backend çalışmıyor veya tRPC router mount edilmemiş

---

### Yöntem 2: Test Script'i Kullanın

**Terminal'de:**
```powershell
node test-backend.js
```

Bu script backend'in çalışıp çalışmadığını otomatik olarak test eder.

---

## 🚀 ADIM 2: Backend'i Başlatın

### ⚠️ ÖNEMLİ: Backend Ayrı Terminal'de Çalışmalı

**1. Yeni bir terminal açın** (Expo terminal'inden AYRI)

**2. Backend'i başlatın:**
```powershell
cd c:\Users\ilkse\mytrabzon
npm run start-web
```

veya

```powershell
cd c:\Users\ilkse\mytrabzon
bun run start-web
```

**3. Backend başladığında terminal'de şunları görmelisiniz:**
```
✓ Server started
✓ Listening on port...
✓ Rork URL: https://...
```

---

## ✅ ADIM 3: Backend Çalıştığını Doğrulayın

**1. Tarayıcıda tekrar test edin:**
```
https://3b6137c9-9f4e-4971-a4d1-f4410f1a6a2c-00-rgv4vnjcpau4.sisko.replit.dev
```

**2. JSON yanıt görmelisiniz:**
```json
{"status":"ok","message":"API is running"}
```

**3. Expo'yu yeniden başlatın:**
```powershell
npx expo start --clear
```

---

## 🔍 ADIM 4: Hala Çalışmıyorsa

### 1. Rork Dashboard'u Kontrol Edin

- Rork dashboard'da backend'in aktif olduğunu kontrol edin
- Logları kontrol edin
- URL'nin doğru olduğunu kontrol edin

### 2. Environment Variables'ı Kontrol Edin

`.env` dosyasında:
```
EXPO_PUBLIC_RORK_API_BASE_URL=https://3b6137c9-9f4e-4971-a4d1-f4410f1a6a2c-00-rgv4vnjcpau4.sisko.replit.dev
```

### 3. Backend Kodunu Kontrol Edin

`backend/hono.ts` dosyası doğru mu?
- tRPC router mount edilmiş mi?
- CORS ayarları doğru mu?

### 4. Network Bağlantısını Kontrol Edin

- İnternet bağlantınız var mı?
- Rork URL'si erişilebilir mi?
- Firewall backend'e izin veriyor mu?

---

## 📋 ÖZET

1. ✅ Backend'i test edin (tarayıcı veya test script)
2. ✅ Backend'i başlatın (ayrı terminal'de `npm run start-web`)
3. ✅ Backend'in çalıştığını doğrulayın (JSON yanıt)
4. ✅ Expo'yu yeniden başlatın (`npx expo start --clear`)

---

## ❓ SIK SORULAN SORULAR

**S: Backend'i her seferinde başlatmam gerekiyor mu?**
C: Evet, backend ayrı bir process olarak çalışmalı. Expo ile birlikte çalışmaz.

**S: Backend'i durdurmak için ne yapmalıyım?**
C: Backend terminal'inde `Ctrl+C` tuşlarına basın.

**S: Backend URL'si değişti mi?**
C: Rork her başlatmada yeni bir URL verebilir. `.env` dosyasını güncelleyin.

**S: Backend çalışıyor ama hala hata alıyorum?**
C: Expo'yu `--clear` ile yeniden başlatın ve cache'i temizleyin.

