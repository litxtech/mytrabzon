# 🏔️ MyTrabzon - Kurulum Rehberi

**Trabzon'un Dijital Sesi**

> MyTrabzon projesini başarıyla kurmak için bu rehberi adım adım takip edin.

---

## 📋 İçindekiler

1. [Önkoşullar](#önkoşullar)
2. [Projeyi Klonlama](#projeyi-klonlama)
3. [Environment Variables Ayarlama](#environment-variables-ayarlama)
4. [Supabase Kurulumu](#supabase-kurulumu)
5. [Uygulamayı Başlatma](#uygulamayı-başlatma)
6. [Admin Paneli](#admin-paneli)
7. [Sorun Giderme](#sorun-giderme)

---

## 🔧 Önkoşullar

Aşağıdaki araçların sisteminizde kurulu olduğundan emin olun:

### Zorunlu
- **Node.js** (v18 veya üzeri) - [nvm ile kurulum](https://github.com/nvm-sh/nvm)
- **Bun** - [Kurulum rehberi](https://bun.sh/docs/installation)
- **Git** - [Git kurulumu](https://git-scm.com/downloads)

### İsteğe Bağlı
- **Xcode** (macOS) - iOS simulator için
- **Android Studio** - Android emulator için
- **Expo Go** mobil uygulama - Mobil test için

---

## 📥 Projeyi Klonlama

```bash
# Repository'yi klonlayın
git clone <YOUR_GIT_URL>

# Proje dizinine gidin
cd mytrabzon

# Bağımlılıkları yükleyin
bun install
```

---

## 🔑 Environment Variables Ayarlama

### 1. .env Dosyası Oluşturun

Proje kök dizininde `.env` dosyası oluşturun:

```bash
touch .env
```

### 2. Gerekli Değişkenleri Ekleyin

```env
# ============================================
# SUPABASE AYARLARI (ZORUNLU)
# ============================================
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# ============================================
# GOOGLE OAUTH (OPSİYONEL)
# ============================================
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ============================================
# DEEPSEEK AI - LazGPT (OPSİYONEL)
# ============================================
DEEPSEEK_API_KEY=sk-your_deepseek_api_key

# ============================================
# STRIPE ÖDEME (OPSİYONEL)
# ============================================
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# ============================================
# UYGULAMA AYARLARI
# ============================================
EXPO_PUBLIC_APP_NAME=MyTrabzon
EXPO_PUBLIC_LAZGPT_NAME=LazGPT
EXPO_PUBLIC_APP_VERSION=1.0.0
```

### 3. Supabase Değişkenlerini Alın

#### Adım 3.1: Supabase Dashboard'a gidin
1. [Supabase Dashboard](https://app.supabase.com) adresine gidin
2. Hesabınıza giriş yapın (yoksa ücretsiz hesap oluşturun)
3. Projenizi seçin (veya yeni proje oluşturun)

#### Adım 3.2: API Anahtarlarını Bulun
1. Sol menüden **Settings** > **API** seçeneğine gidin
2. Aşağıdaki değerleri kopyalayın:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **ÖNEMLİ:** Service role key'i asla GitHub'a pushlamayın!

### 4. Google OAuth Ayarlama (Opsiyonel)

#### Adım 4.1: Google Cloud Console
1. [Google Cloud Console](https://console.cloud.google.com/) adresine gidin
2. Yeni proje oluşturun veya mevcut projeyi seçin
3. **APIs & Services** > **Credentials** menüsüne gidin
4. **Create Credentials** > **OAuth 2.0 Client ID** seçin
5. Application type: **Web application**
6. Authorized redirect URIs ekleyin:
   ```
   https://YOUR_SUPABASE_URL/auth/v1/callback
   http://localhost:19006/auth/callback
   ```

#### Adım 4.2: Supabase'de Yapılandırma
1. Supabase Dashboard > **Authentication** > **Providers**
2. **Google** sağlayıcısını etkinleştirin
3. Client ID ve Client Secret'ı girin
4. **Save** butonuna tıklayın

### 5. DeepSeek API Key Alma (LazGPT için)

1. [DeepSeek Platform](https://platform.deepseek.com/) adresine gidin
2. Hesap oluşturun
3. **API Keys** bölümünden yeni key oluşturun
4. Key'i `.env` dosyasına ekleyin

### 6. Stripe Ayarlama (Opsiyonel)

1. [Stripe Dashboard](https://dashboard.stripe.com/) adresine gidin
2. **Developers** > **API keys** bölümüne gidin
3. Test mode'da key'leri kopyalayın
4. `.env` dosyasına ekleyin

⚠️ Production'a geçerken test key'lerini production key'leri ile değiştirin!

---

## 🗄️ Supabase Kurulumu

### 1. SQL Schema'yı Çalıştırın

#### Adım 1.1: SQL Editor'ü Açın
1. Supabase Dashboard'da projenizi seçin
2. Sol menüden **SQL Editor** seçeneğine tıklayın

#### Adım 1.2: Schema'yı Yükleyin
1. Projenizdeki `constants/supabase-schema.sql` dosyasını açın
2. Tüm SQL kodunu kopyalayın
3. SQL Editor'e yapıştırın
4. **Run** butonuna tıklayın

#### Bu İşlem Neler Yapar?
✅ Tüm database tablolarını oluşturur
✅ İlişkileri kurar
✅ Row Level Security (RLS) politikalarını ayarlar
✅ Indexleri oluşturur
✅ Varsayılan admin kullanıcısı ekler
✅ Trigger'ları kurar

### 2. Storage Bucket'ları Oluşturun (Opsiyonel)

Medya dosyaları için:

1. Supabase Dashboard > **Storage** menüsüne gidin
2. **Create bucket** butonuna tıklayın
3. Bucket adları:
   - `avatars` - Kullanıcı profil fotoğrafları için
   - `posts` - Post medya dosyaları için
4. Her bucket için **Public bucket** seçeneğini işaretleyin

---

## 🚀 Uygulamayı Başlatma

### Web Önizleme (Önerilen - Hızlı Test)

```bash
bun start-web
```

Tarayıcınızda otomatik olarak açılacaktır: `http://localhost:8081`

### Mobil Önizleme (QR Kod ile)

```bash
# Geliştirme sunucusunu başlat
bun start

# Expo Go uygulaması ile QR kodu tarayın
```

**Mobil Test için:**
1. iOS: [Expo Go](https://apps.apple.com/app/expo-go/id982107779) indir
2. Android: [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) indir
3. QR kodu tarayın

### iOS Simulator

```bash
# Xcode gerektirir
bun start -- --ios
```

### Android Emulator

```bash
# Android Studio gerektirir
bun start -- --android
```

---

## 👤 Admin Paneli

### Giriş Bilgileri

```
URL: http://localhost:8081/admin/login
Email: sonertoprak@litxtech.com
Şifre: admin123
```

⚠️ **ÖNEMLİ GÜVENLİK UYARISI:**
Production ortamına geçmeden önce admin şifresini mutlaka değiştirin!

### Admin Şifresini Değiştirme

#### Yöntem 1: Supabase SQL Editor

```sql
-- Yeni şifrenin bcrypt hash'ini oluşturun
-- Örnek: bcrypt hash of 'new_secure_password'
UPDATE admin_users 
SET password_hash = '$2a$10$YOUR_NEW_BCRYPT_HASH_HERE'
WHERE email = 'sonertoprak@litxtech.com';
```

Bcrypt hash oluşturmak için:
- Online tool: [bcrypt-generator.com](https://bcrypt-generator.com/)
- Node.js: `bcrypt.hashSync('password', 10)`

#### Yöntem 2: Backend Endpoint

Backend'de yeni bir endpoint oluşturarak şifreyi güncelleyebilirsiniz.

---

## 🏗️ Proje Yapısı

```
mytrabzon/
├── app/                          # Uygulama ekranları (Expo Router)
│   ├── (tabs)/                  # Tab navigation
│   │   ├── feed.tsx            # Ana akış
│   │   ├── chat.tsx            # Sohbet
│   │   ├── notifications.tsx   # Bildirimler
│   │   └── profile.tsx         # Profil
│   ├── auth/                    # Kimlik doğrulama
│   │   ├── login.tsx           # Giriş ekranı
│   │   ├── onboarding.tsx      # İlk kayıt
│   │   └── reset-password.tsx  # Şifre sıfırlama
│   └── admin/                   # Admin paneli
│       ├── login.tsx           # Admin girişi
│       └── dashboard.tsx       # Admin kontrol paneli
├── components/                   # Yeniden kullanılabilir bileşenler
│   └── Footer.tsx               # Footer component
├── constants/                    # Sabitler
│   ├── colors.ts               # Renkler
│   ├── theme.ts                # Tema ayarları
│   ├── districts.ts            # İlçeler listesi
│   └── supabase-schema.sql     # Database şeması
├── contexts/                     # React Context'ler
│   └── AuthContext.tsx          # Auth state yönetimi
├── lib/                          # Yardımcı kütüphaneler
│   ├── supabase.ts             # Supabase client
│   └── trpc.ts                 # tRPC client
├── backend/                      # Backend (Hono + tRPC)
│   ├── hono.ts                 # Ana server dosyası
│   └── trpc/                   # tRPC routes
└── types/                        # TypeScript type tanımları
    └── database.ts              # Database types
```

---

## 🐛 Sorun Giderme

### Uygulama Açılmıyor

**Çözüm 1: Cache'i Temizleyin**
```bash
bunx expo start --clear
```

**Çözüm 2: node_modules'u Yeniden Yükleyin**
```bash
rm -rf node_modules
bun install
```

**Çözüm 3: Bun cache'i temizleyin**
```bash
bun pm cache rm
```

### Supabase Bağlantı Hatası

✅ URL ve key'lerin doğru olduğunu kontrol edin
✅ Supabase projesinin aktif olduğunu kontrol edin
✅ `.env` dosyasının proje kök dizininde olduğunu kontrol edin
✅ Environment variable'ların `EXPO_PUBLIC_` prefix'i ile başladığını kontrol edin

### Google OAuth Çalışmıyor

✅ Redirect URI'ların doğru olduğunu kontrol edin
✅ Supabase'de Google provider'ın etkin olduğunu kontrol edin
✅ Google Console'da OAuth consent screen'i yapılandırın
✅ Test kullanıcılarını ekleyin (development mode'da)

### Magic Link Gelmiyor

✅ Spam klasörünü kontrol edin
✅ Supabase Dashboard > Authentication > Email Templates kontrol edin
✅ SMTP ayarlarını kontrol edin (varsayılan Supabase SMTP kullanılır)
✅ Email rate limits'i kontrol edin

### Mobil Cihazda Bağlanamıyor

✅ Telefon ve bilgisayar aynı WiFi ağında olmalı
✅ Firewall ayarlarını kontrol edin
✅ Tunnel mode kullanmayı deneyin:
```bash
bun start -- --tunnel
```

---

## 📚 Ek Kaynaklar

### Dokümantasyon
- **ENV_SETUP_GUIDE.md** - Detaylı ENV kurulum rehberi
- **DATABASE_GUIDE.md** - Database yapısı ve ilişkiler
- **PROJECT_GUIDE.md** - Proje mimarisi
- **SETUP.md** - Genel kurulum bilgileri

### Dış Kaynaklar
- [Expo Dokümantasyonu](https://docs.expo.dev/)
- [Supabase Dokümantasyonu](https://supabase.com/docs)
- [React Native Dokümantasyonu](https://reactnative.dev/docs/getting-started)
- [tRPC Dokümantasyonu](https://trpc.io/docs)

---

## 📞 Destek

Sorularınız için:

**LITXTECH LLC**
- 🌐 Web: [www.litxtech.com](https://www.litxtech.com)
- 📧 Email: support@litxtech.com

---

## ✅ Kurulum Kontrol Listesi

Kurulumunuzun tamamlandığından emin olmak için:

- [ ] Node.js ve Bun kurulu
- [ ] Proje klonlandı ve bağımlılıklar yüklendi
- [ ] `.env` dosyası oluşturuldu
- [ ] Supabase project URL ve key'leri eklendi
- [ ] Supabase SQL schema çalıştırıldı
- [ ] Storage bucket'ları oluşturuldu (opsiyonel)
- [ ] Google OAuth yapılandırıldı (opsiyonel)
- [ ] DeepSeek API key eklendi (opsiyonel)
- [ ] Stripe key'leri eklendi (opsiyonel)
- [ ] Uygulama başarıyla başlatıldı
- [ ] Giriş/Kayıt çalışıyor
- [ ] Admin paneline erişim sağlandı

---

🎉 **Tebrikler!** MyTrabzon'u başarıyla kurdunuz!

Şimdi geliştirmeye başlayabilirsiniz. İyi kodlamalar!

---

© 2025 LITXTECH LLC. Tüm hakları saklıdır.
