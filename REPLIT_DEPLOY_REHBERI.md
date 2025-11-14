# 🚀 REPLIT DEPLOY REHBERİ

## ⚠️ MEVCUT DURUM

Replit'te şu mesajı görüyorsunuz:
```
The app is currently not running. Deploy this app to keep it running externally.
Learn how to Deploy on Replit
```

**Anlamı**: Backend Replit'te deploy edilmemiş, bu yüzden çalışmıyor.

---

## 🎯 ÇÖZÜM: 2 SEÇENEK

### ✅ SEÇENEK 1: Replit'te Deploy Et (Önerilen - Sürekli Çalışır)

Backend'i Replit'te deploy ederek sürekli çalışır hale getirin.

#### Adım 1: Replit'te Deploy Butonuna Tıklayın

1. **Replit'te projenizi açın**
2. **Sağ üst köşede "Deploy" butonunu bulun**
3. **"Deploy" butonuna tıklayın**

#### Adım 2: Deploy Ayarlarını Yapın

- **Deployment Target**: `cloudrun` (Google Cloud Run)
- **Region**: Size en yakın bölgeyi seçin
- **Resources**: Minimum (ücretsiz tier için yeterli)

#### Adım 3: Deploy'u Başlatın

1. **"Deploy" butonuna tıklayın**
2. **Deploy işlemi tamamlanana kadar bekleyin** (2-5 dakika)
3. **Deploy tamamlandığında URL'yi kopyalayın**

#### Adım 4: URL'yi Güncelleyin

Deploy tamamlandıktan sonra yeni URL'yi `.env` dosyasına ekleyin:

```env
EXPO_PUBLIC_RORK_API_BASE_URL=https://yeni-deploy-url.replit.app
```

**Not**: Replit deploy URL'si genellikle şu formatta olur:
```
https://your-project-name.your-username.replit.app
```

---

### ✅ SEÇENEK 2: Local'de Çalıştır (Geçici Çözüm)

Backend'i local'de çalıştırarak test edebilirsiniz (bilgisayarınız açık olduğu sürece çalışır).

#### Adım 1: Backend'i Başlatın

**Yeni bir terminal açın:**
```powershell
cd c:\Users\ilkse\mytrabzon
npm run start-web
```

veya

```powershell
cd c:\Users\ilkse\mytrabzon
bun run start-web
```

#### Adım 2: Rork URL'sini Kopyalayın

Backend başladığında terminal'de şunu göreceksiniz:
```
✓ Rork URL: https://xxxxx-xxxxx-xxxxx.sisko.replit.dev
```

Bu URL'yi kopyalayın.

#### Adım 3: URL'yi Güncelleyin

`.env` dosyasına ekleyin:
```env
EXPO_PUBLIC_RORK_API_BASE_URL=https://xxxxx-xxxxx-xxxxx.sisko.replit.dev
```

#### Adım 4: Expo'yu Yeniden Başlatın

```powershell
npx expo start --clear
```

**⚠️ ÖNEMLİ**: Local çalıştırma geçici bir çözümdür. Bilgisayarınızı kapatırsanız backend durur. Production için Replit'te deploy etmeniz gerekir.

---

## 🔍 HANGİ SEÇENEĞİ SEÇMELİYİM?

### Replit'te Deploy Et (SEÇENEK 1) - Önerilen ✅

**Avantajlar:**
- ✅ Backend sürekli çalışır (7/24)
- ✅ Bilgisayarınızı kapatabilirsiniz
- ✅ Production için uygun
- ✅ Ücretsiz tier mevcut

**Dezavantajlar:**
- ⚠️ İlk deploy 2-5 dakika sürer
- ⚠️ Replit hesabı gerekir

### Local'de Çalıştır (SEÇENEK 2) - Geçici

**Avantajlar:**
- ✅ Hızlı başlatma
- ✅ Test için uygun
- ✅ Ekstra ayar gerekmez

**Dezavantajlar:**
- ❌ Bilgisayarınız açık olmalı
- ❌ Production için uygun değil
- ❌ İnternet bağlantısı kesilirse durur

---

## 📋 ADIM ADIM: REPLIT'TE DEPLOY

### 1. Replit'te Projeyi Açın

- Replit.com'a gidin
- Projenizi açın

### 2. Deploy Butonunu Bulun

- Sağ üst köşede "Deploy" butonunu arayın
- Veya sol menüde "Deploy" sekmesine tıklayın

### 3. Deploy Ayarlarını Yapın

- **Platform**: Google Cloud Run (varsayılan)
- **Region**: Size en yakın bölge
- **Resources**: Minimum (ücretsiz)

### 4. Deploy'u Başlatın

- "Deploy" butonuna tıklayın
- İşlem tamamlanana kadar bekleyin
- URL'yi kopyalayın

### 5. URL'yi Güncelleyin

`.env` dosyasına yeni URL'yi ekleyin:
```env
EXPO_PUBLIC_RORK_API_BASE_URL=https://yeni-url.replit.app
```

### 6. Expo'yu Yeniden Başlatın

```powershell
npx expo start --clear
```

---

## ✅ DEPLOY SONRASI KONTROL

### 1. Backend Çalışıyor mu?

Tarayıcıda deploy URL'sini açın:
```
https://yeni-url.replit.app
```

**Beklenen yanıt:**
```json
{"status":"ok","message":"API is running"}
```

### 2. tRPC Endpoint Çalışıyor mu?

```
https://yeni-url.replit.app/api/trpc/user.getProfile
```

**Beklenen yanıt:**
- JSON formatında (hata olsa bile JSON olmalı)

### 3. Uygulamada Test Edin

- Profil güncelleme çalışmalı
- Post oluşturma çalışmalı
- Avatar upload çalışmalı

---

## ❓ SIK SORULAN SORULAR

**S: Replit'te deploy ücretsiz mi?**
C: Evet, Replit'in ücretsiz tier'ı var. Ancak kullanım limitleri olabilir.

**S: Deploy ne kadar sürer?**
C: İlk deploy 2-5 dakika sürebilir. Sonraki deploy'lar daha hızlıdır.

**S: Deploy URL'si değişir mi?**
C: Hayır, deploy URL'si sabit kalır (projeyi silmediğiniz sürece).

**S: Local'de çalıştırırken deploy gerekir mi?**
C: Hayır, local çalıştırma için deploy gerekmez. Ama production için deploy şarttır.

**S: Deploy sonrası kod değişikliği yaparsam ne olur?**
C: Kod değişikliklerini deploy etmeniz gerekir. Replit'te "Redeploy" butonuna tıklayın.

---

## 🆘 YARDIM

Deploy sırasında sorun yaşarsanız:

1. **Replit Loglarını Kontrol Edin**
   - Deploy sekmesinde logları görüntüleyin
   - Hata mesajlarını okuyun

2. **Rork Dashboard'u Kontrol Edin**
   - Rork.com'a gidin
   - Projenizi açın
   - Backend durumunu kontrol edin

3. **Environment Variables'ı Kontrol Edin**
   - `.env` dosyasında `EXPO_PUBLIC_RORK_API_BASE_URL` var mı?
   - URL doğru mu?

---

## 📝 ÖZET

1. ✅ **Replit'te Deploy Et** (Önerilen - Sürekli çalışır)
   - Replit'te "Deploy" butonuna tıklayın
   - Deploy tamamlandıktan sonra URL'yi `.env`'e ekleyin

2. ✅ **Local'de Çalıştır** (Geçici - Test için)
   - `npm run start-web` çalıştırın
   - Rork URL'sini `.env`'e ekleyin

**Production için Replit'te deploy etmeniz şiddetle önerilir!** 🚀

