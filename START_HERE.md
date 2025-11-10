# 🏔️ MyTrabzon - Başlangıç Rehberi

**Trabzon'un Dijital Sesi** - LITXTECH LLC

Bu dosya, MyTrabzon projesini sıfırdan kurmak için ihtiyacınız olan tüm bilgileri içerir.

---

## 📚 Dokümantasyon İndeksi

Projeyi kurmak için aşağıdaki rehberleri sırasıyla takip edin:

### 1️⃣ [SETUP_MYTRABZON.md](./SETUP_MYTRABZON.md)
**İlk adım - Zorunlu!**
- Projeyi klonlama
- Bağımlılıkları yükleme
- Uygulamayı ilk kez çalıştırma
- Temel sorun giderme

### 2️⃣ [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md)
**Environment Variables - Zorunlu!**
- Supabase yapılandırması
- Google OAuth kurulumu
- DeepSeek API (LazGPT)
- Stripe ödeme entegrasyonu
- Tüm ENV değişkenlerinin detaylı açıklaması

### 3️⃣ [APP_JSON_SETUP.md](./APP_JSON_SETUP.md)
**app.json Yapılandırması - Zorunlu!**
- URL scheme değişikliği (`mytrabzon`)
- Splash screen renk ayarları
- Deep linking yapılandırması
- OAuth redirect URI'ları

### 4️⃣ [DATABASE_GUIDE.md](./DATABASE_GUIDE.md)
**Supabase Database - Bilgi Amaçlı**
- Database şeması açıklaması
- Tablo ilişkileri
- RLS politikaları
- Trigger'lar ve fonksiyonlar

### 5️⃣ [PROJECT_GUIDE.md](./PROJECT_GUIDE.md)
**Proje Mimarisi - Bilgi Amaçlı**
- Dosya yapısı
- Code organization
- State management
- Best practices

---

## 🚀 Hızlı Başlangıç (5 Dakika)

Deneyimli geliştiriciler için hızlı kurulum:

```bash
# 1. Klonla ve yükle
git clone <YOUR_GIT_URL> && cd mytrabzon && bun install

# 2. .env oluştur
cp env.example .env
# Supabase URL ve key'leri ekle

# 3. app.json'u güncelle
# scheme: "mytrabzon" olarak değiştir
# backgroundColor: "#001F3F" olarak değiştir

# 4. Supabase SQL'i çalıştır
# constants/supabase-schema.sql dosyasını Supabase SQL Editor'de çalıştır

# 5. Başlat
bun start-web
```

---

## ✅ Kurulum Kontrol Listesi

Her adımı tamamladıkça işaretleyin:

### Temel Kurulum
- [ ] Node.js ve Bun kuruldu
- [ ] Repository klonlandı
- [ ] `bun install` çalıştırıldı
- [ ] `.env` dosyası oluşturuldu

### Supabase
- [ ] Supabase projesi oluşturuldu
- [ ] URL ve key'ler `.env`'e eklendi
- [ ] `supabase-schema.sql` çalıştırıldı
- [ ] Admin kullanıcısı oluşturuldu
- [ ] Storage bucket'ları oluşturuldu (opsiyonel)

### app.json
- [ ] `scheme: "mytrabzon"` olarak değiştirildi
- [ ] Splash screen `backgroundColor: "#001F3F"`
- [ ] Android adaptive icon `backgroundColor: "#001F3F"`

### OAuth (Opsiyonel)
- [ ] Google Cloud Console projesi oluşturuldu
- [ ] OAuth 2.0 Client ID oluşturuldu
- [ ] Redirect URI'ları eklendi
- [ ] Supabase'de Google provider etkinleştirildi
- [ ] Client ID ve Secret `.env`'e eklendi

### AI (Opsiyonel)
- [ ] DeepSeek hesabı oluşturuldu
- [ ] API key alındı
- [ ] `.env`'e eklendi

### Ödeme (Opsiyonel)
- [ ] Stripe hesabı oluşturuldu
- [ ] Test mode key'leri alındı
- [ ] `.env`'e eklendi

### Test
- [ ] Uygulama başlatıldı (`bun start-web`)
- [ ] Giriş/Kayıt çalışıyor
- [ ] Google OAuth çalışıyor (opsiyonel)
- [ ] Magic Link çalışıyor
- [ ] Admin paneline erişildi
- [ ] Profil oluşturuldu

---

## 🎯 Önemli Linkler

### Supabase
- Dashboard: https://app.supabase.com
- Docs: https://supabase.com/docs

### Google Cloud
- Console: https://console.cloud.google.com
- OAuth Docs: https://developers.google.com/identity/protocols/oauth2

### DeepSeek
- Platform: https://platform.deepseek.com
- Docs: https://platform.deepseek.com/docs

### Stripe
- Dashboard: https://dashboard.stripe.com
- Docs: https://stripe.com/docs

### Expo
- Docs: https://docs.expo.dev
- Go App: https://expo.dev/go

---

## 🎨 Proje Özellikleri

### Kimlik Doğrulama
- ✅ Email/Şifre ile kayıt
- ✅ Google OAuth
- ✅ Magic Link (şifresiz giriş)
- ✅ Şifre sıfırlama
- ✅ Email doğrulama

### Sosyal Özellikler
- ✅ İlçe bazlı feed
- ✅ Fotoğraf/video paylaşımı
- ✅ Beğeni ve yorum
- ✅ Kullanıcı profilleri
- ✅ Sohbet sistemi
- ✅ Bildirimler

### Admin
- ✅ Admin paneli
- ✅ Kullanıcı yönetimi
- ✅ Bildirim gönderimi
- ✅ İçerik moderasyonu

### AI
- ✅ LazGPT asistan
- ✅ Trabzon kültürüne özel
- ✅ Şehir rehberi

---

## 🛠️ Teknoloji Stack

### Frontend
- **React Native** - Cross-platform framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **Expo Router** - File-based routing
- **React Query** - Server state management

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Storage
  - Real-time subscriptions
- **Hono** - Web framework
- **tRPC** - Type-safe API

### Services
- **DeepSeek** - AI API (LazGPT)
- **Stripe** - Payments
- **Google OAuth** - Social login

---

## 📱 Platform Desteği

| Platform | Development | Production |
|----------|-------------|------------|
| **iOS** | ✅ Expo Go | ✅ App Store |
| **Android** | ✅ Expo Go | ✅ Google Play |
| **Web** | ✅ Browser | ✅ Vercel/Netlify |

---

## 🎓 Öğrenme Kaynakları

### Yeni Başlayanlar İçin
1. [React Native Tutorial](https://reactnative.dev/docs/tutorial)
2. [Expo Tutorial](https://docs.expo.dev/tutorial/introduction/)
3. [TypeScript for Beginners](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html)

### İleri Seviye
1. [Expo Router Deep Dive](https://docs.expo.dev/router/introduction/)
2. [Supabase with React Native](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
3. [tRPC with React Query](https://trpc.io/docs/react-query)

---

## 🐛 Sık Karşılaşılan Sorunlar

### "Cannot connect to Metro"
**Çözüm:**
```bash
bunx expo start --clear
# veya
bunx expo start --tunnel
```

### "Authentication failed"
**Kontrol edin:**
- Supabase URL ve key'lerin doğru olduğunu
- `.env` dosyasının var olduğunu
- `EXPO_PUBLIC_` prefix'inin doğru olduğunu

### "Database connection error"
**Kontrol edin:**
- SQL schema'nın çalıştırıldığını
- RLS politikalarının etkin olduğunu
- Supabase projesinin aktif olduğunu

### "Google OAuth not working"
**Kontrol edin:**
- Redirect URI'ların doğru olduğunu
- `scheme: "mytrabzon"` olarak ayarlandığını
- Google Console'da OAuth consent screen'in yapılandırıldığını

---

## 📞 Destek

### Dokümantasyon
Tüm rehberler `docs/` dizininde bulunmaktadır.

### İletişim
**LITXTECH LLC**
- 🌐 Web: [www.litxtech.com](https://www.litxtech.com)
- 📧 Email: support@litxtech.com
- 💬 GitHub Issues: Sorun bildirin

---

## 🔒 Güvenlik

### Production Checklist
- [ ] Admin şifresini değiştir
- [ ] Stripe test key'lerini production key'leri ile değiştir
- [ ] `.env` dosyasını GitHub'a pushlama
- [ ] Service role key'leri güvenli tut
- [ ] RLS politikalarını gözden geçir
- [ ] CORS ayarlarını yapılandır
- [ ] Rate limiting ekle

---

## 📊 Performans

### Optimizasyon İpuçları
- React Query cache stratejileri
- Image optimization (Expo Image)
- Bundle size optimization
- Lazy loading
- Memoization

---

## 🚢 Deployment

### Development
```bash
bun start-web  # Web preview
bun start      # Mobile (Expo Go)
```

### Production

**Mobile Apps:**
```bash
# iOS
eas build --platform ios
eas submit --platform ios

# Android
eas build --platform android
eas submit --platform android
```

**Web:**
```bash
# Vercel
vercel

# Netlify
netlify deploy
```

---

## 🎉 Sonraki Adımlar

Kurulumu tamamladıktan sonra:

1. **Profil oluştur** - Bir test kullanıcısı oluşturun
2. **Post paylaş** - İlk gönderinizi yapın
3. **LazGPT'yi dene** - AI asistanı test edin
4. **Admin panelini keşfet** - Yönetim özelliklerini inceleyin
5. **Dokümantasyonu oku** - Tüm özellikleri öğrenin

---

## 🌟 Katkıda Bulunma

Katkılarınızı bekliyoruz!

1. Fork yapın
2. Feature branch oluşturun
3. Commit edin
4. Push edin
5. Pull Request açın

---

## 📄 Lisans

© 2025 LITXTECH LLC. Tüm hakları saklıdır.

---

## 🙏 Teşekkürler

MyTrabzon'u seçtiğiniz için teşekkür ederiz!

**Trabzon'un dijital sesini birlikte oluşturalım!** 🏔️

---

**Son Güncelleme:** 2025-01-10
**Versiyon:** 1.0.0
