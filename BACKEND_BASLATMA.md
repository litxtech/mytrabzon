# 🚀 BACKEND BAŞLATMA REHBERİ

## ⚠️ ÖNEMLİ: Backend Ayrı Çalışmalı

Uygulamanız Rork kullanıyor. Backend'i ayrı bir terminal'de başlatmanız gerekiyor.

---

## 📋 ADIMLAR

### 1. Yeni Terminal Açın
- PowerShell veya CMD açın
- **Expo terminal'inden AYRI bir terminal olmalı**

### 2. Backend'i Başlatın

```powershell
cd c:\Users\ilkse\mytrabzon
npm run start-web
```

veya

```powershell
cd c:\Users\ilkse\mytrabzon
bun run start-web
```

### 3. Backend Çalıştığını Kontrol Edin

Terminal'de şunları görmelisiniz:
- Server başladı mesajı
- Port bilgisi (örn: `Listening on port 8082`)
- Rork URL'si

### 4. Expo'yu Başlatın (Ayrı Terminal'de)

**Başka bir terminal açın:**
```powershell
cd c:\Users\ilkse\mytrabzon
npx expo start
```

---

## ✅ BAŞARILI OLDUĞUNDA

- Backend terminal'de: Server çalışıyor
- Expo terminal'de: QR kod ve Metro bundler
- Uygulamada: tRPC istekleri çalışıyor

---

## ❌ HATA ALIRSANIZ

### "Port already in use"
- Başka bir process o portu kullanıyor
- Port'u değiştirin veya process'i durdurun

### "Cannot find module"
- `npm install` veya `bun install` çalıştırın

### "Backend not responding"
- Backend'in çalıştığından emin olun
- URL'yi kontrol edin (`http://localhost:8082` veya Rork URL)

---

## 🔍 KONTROL

Backend çalışıyor mu?
- Tarayıcıda `http://localhost:8082` veya Rork URL'sini açın
- `{"status":"ok","message":"API is running"}` görmelisiniz

