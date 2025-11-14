# 🚀 KURULUM TALİMATLARI

## ✅ Tamamlanan Özellikler

### 1. Environment Variables
- ✅ Google Client ID
- ✅ Agora App ID ve Certificate
- `.env` dosyasına eklendi

### 2. Image/Video Responsive
- ✅ Tüm post image'ları responsive
- ✅ Aspect ratio: 16/9
- ✅ Sola kayma sorunu çözüldü

### 3. Agora Call System
- ✅ Arama butonları tüm kullanıcılara eklendi
- ✅ Sesli/Görüntülü arama ekranı

### 4. Notification Sound
- ✅ Bildirim sesi sistemi

### 5. Reels System
- ✅ Database schema
- ✅ Backend API
- ✅ Video player
- ✅ Upload screen

---

## 📋 Yapılması Gerekenler

### 1. SQL Script Çalıştır
Supabase SQL Editor'de şu dosyayı çalıştırın:
```sql
-- REELS_COMPLETE_SYSTEM.sql
```

### 2. Paket Kurulumu
```bash
npm install --legacy-peer-deps
```

### 3. Expo Başlat
```bash
npx expo start
```

---

## 🎯 Özellikler

### Agora Call
- Sesli arama butonu
- Görüntülü arama butonu
- Tüm kullanıcı listelerinde görünür

### Reels
- TikTok/Instagram tarzı swipe UI
- Video player (expo-av)
- View tracking
- Algoritma ile sıralama

### Responsive Images
- Tüm telefonlara uyumlu
- 16:9 aspect ratio
- Sola kayma sorunu çözüldü

---

## 📝 Notlar

- Agora için native module gerekli (Expo Config Plugin)
- Reels için video format: MP4, 9:16, max 60 saniye
- Bildirim sesi otomatik çalışıyor

