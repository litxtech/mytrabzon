# MyTrabzon - Kurulum ve Yapılandırma Rehberi

## 🎯 Proje Hakkında

MyTrabzon, Trabzon halkının birbirleriyle iletişim kurabileceği, paylaşım yapabileceği ve yardımlaşabileceği bir sosyal medya platformudur.

## 📋 Önemli Bilgiler

### Admin Paneli Erişimi
- **URL**: `mytrabzon.com/admin`
- **Kullanıcı Adı**: `sonertoprak@litxtech.com`
- **Şifre**: `admin123`

⚠️ **GÜVENLİK UYARISI**: Production ortamında bu şifreyi mutlaka değiştirin!

## 🚀 Kurulum Adımları

### 1. Supabase Kurulumu

#### A. Proje Oluşturma
1. [Supabase](https://supabase.com) hesabı oluşturun
2. "New Project" butonuna tıklayın
3. Proje adı: `mytrabzon`
4. Database şifresi belirleyin (güçlü bir şifre seçin)
5. Region: Europe (Frankfurt) veya en yakın bölge

#### B. Database Schema Kurulumu
1. Supabase Dashboard'da **SQL Editor** sekmesine gidin
2. "New Query" butonuna tıklayın
3. `constants/supabase-schema.sql` dosyasının içeriğini kopyalayın
4. SQL Editor'a yapıştırın
5. "Run" butonuna tıklayın
6. Başarılı olduğunu doğrulayın (yeşil check işareti)

#### C. Storage Buckets Oluşturma
1. **Storage** sekmesine gidin
2. "Create a new bucket" butonuna tıklayın
3. İki bucket oluşturun:
   - **avatars**
     - Name: `avatars`
     - Public bucket: ✅ (işaretli)
   - **posts**
     - Name: `posts`
     - Public bucket: ✅ (işaretli)

#### D. API Anahtarlarını Alma
1. **Project Settings** > **API** sekmesine gidin
2. Şu değerleri kopyalayın:
   ```
   Project URL: https://xcvcplwimicylaxghiak.supabase.co
   anon/public key: eyJ...
   service_role key: eyJ... (GİZLİ tutun!)
   ```

### 2. Google OAuth Kurulumu

#### A. Google Cloud Console
1. [Google Cloud Console](https://console.cloud.google.com) açın
2. Yeni proje oluşturun: "MyTrabzon"
3. **APIs & Services** > **Credentials** gidin
4. "Create Credentials" > "OAuth 2.0 Client ID"
5. Application type: Web application
6. Name: MyTrabzon OAuth
7. Authorized redirect URIs:
   ```
   https://xcvcplwimicylaxghiak.supabase.co/auth/v1/callback
   ```
8. "Create" butonuna tıklayın
9. Client ID ve Client Secret'i kopyalayın

#### B. Supabase'e Ekleme
1. Supabase Dashboard > **Authentication** > **Providers**
2. Google provider'ı bulun ve aktifleştirin
3. Client ID ve Client Secret'i yapıştırın
4. "Save" butonuna tıklayın

### 3. Environment Variables Ayarlama

#### A. .env Dosyası Oluşturma
Proje kök dizininde `.env` dosyası oluşturun:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://xcvcplwimicylaxghiak.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(GİZLİ)

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456...

# JWT Secret (rastgele güçlü bir string)
JWT_SECRET=super-secret-jwt-key-change-this-in-production

# App Configuration
EXPO_PUBLIC_APP_NAME=MyTrabzon
EXPO_PUBLIC_LAZGPT_NAME=LazGPT

# Gelecek Özellikler için (şimdilik boş bırakılabilir)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
DEEPSEEK_API_KEY=
```

#### B. Değerleri Doldurma
1. `EXPO_PUBLIC_SUPABASE_URL`: Supabase Project URL
2. `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
3. `SUPABASE_SERVICE_ROLE_KEY`: Supabase service_role key
4. `GOOGLE_CLIENT_ID`: Google OAuth Client ID
5. `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret
6. `JWT_SECRET`: Güçlü bir rastgele string (örn: `openssl rand -base64 32`)

### 4. Uygulamayı Başlatma

```bash
# Bağımlılıkları yükle
bun install

# Development server'ı başlat
bun start

# Veya doğrudan platform seç
bun ios      # iOS simulator
bun android  # Android emulator  
bun web      # Web tarayıcı
```

## 🔐 Admin Şifresini Değiştirme

### Yöntem 1: SQL ile (Önerilen)
1. Supabase Dashboard > SQL Editor
2. Aşağıdaki kodu çalıştırın:

```sql
-- Yeni şifre hash'i oluştur (Node.js ile)
-- Terminal'de: node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YeniSifreniz', 10));"

-- Ardından hash'i kullanarak güncelle
UPDATE admin_users 
SET password_hash = '$2a$10$...' -- Yukarıda oluşturduğunuz hash
WHERE email = 'sonertoprak@litxtech.com';
```

### Yöntem 2: Node.js Scripti
```javascript
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SERVICE_ROLE_KEY'
);

async function updateAdminPassword() {
  const newPassword = 'YeniGüçlüŞifreniz123!';
  const hash = bcrypt.hashSync(newPassword, 10);
  
  const { error } = await supabase
    .from('admin_users')
    .update({ password_hash: hash })
    .eq('email', 'sonertoprak@litxtech.com');
  
  if (error) console.error('Error:', error);
  else console.log('Şifre güncellendi!');
}

updateAdminPassword();
```

## 📱 Test Etme

### Kullanıcı Akışı Test
1. Uygulamayı başlatın
2. "Google ile Giriş Yap" butonuna tıklayın
3. Google hesabınızı seçin
4. Profil bilgilerini doldurun (isim, ilçe)
5. Ana akışa yönlendirilmelisiniz

### Admin Paneli Test
1. Web tarayıcıda `/admin/login` sayfasına gidin
2. Email: `sonertoprak@litxtech.com`
3. Şifre: `admin123`
4. "Giriş Yap" butonuna tıklayın
5. Dashboard'a erişebilmelisiniz

## 🎨 İlçeler ve Rozetler

Uygulama 18 Trabzon ilçesini destekler:

| İlçe | Rozet | İlçe | Rozet |
|------|-------|------|-------|
| Ortahisar | 🏛️ | Akçaabat | 🥙 |
| Araklı | 🏔️ | Arsin | 🌊 |
| Beşikdüzü | ⛰️ | Çarşıbaşı | 🏞️ |
| Çaykara | ☕ | Dernekpazarı | 🌲 |
| Düzköy | 🌾 | Hayrat | 🎣 |
| Köprübaşı | 🌉 | Maçka | 🏞️ |
| Of | 🌿 | Sürmene | ⚓ |
| Şalpazarı | 🌳 | Tonya | 🥜 |
| Vakfıkebir | 🎋 | Yomra | 🏖️ |

## 🔍 Sorun Giderme

### "Session not found" Hatası
- Supabase URL ve anon key'i kontrol edin
- Browser'da cache temizleyin
- Supabase Dashboard > Authentication > Policies kontrol edin

### Google OAuth Çalışmıyor
- Redirect URI'ları kontrol edin
- Google Cloud Console'da OAuth ekranı durumunu kontrol edin
- Supabase'de Google provider'ın aktif olduğundan emin olun

### Admin Girişi Çalışmıyor
- SQL schema'nın başarıyla çalıştığını doğrulayın
- `admin_users` tablosunda kayıt olup olmadığını kontrol edin
- Console'da hata loglarını inceleyin

### Gönderi Paylaşımı Çalışmıyor
- Storage buckets'ın oluşturulduğunu doğrulayın
- Buckets'ın public olarak ayarlandığını kontrol edin
- RLS policies'in doğru olduğunu kontrol edin

## 📞 Destek

Sorun yaşarsanız:
1. Console loglarını kontrol edin
2. Supabase Dashboard > Logs sekmesini inceleyin
3. GitHub Issues'a sorun bildirin
4. Email: sonertoprak@litxtech.com

## ✅ Kurulum Kontrol Listesi

- [ ] Supabase projesi oluşturuldu
- [ ] SQL schema çalıştırıldı
- [ ] Storage buckets oluşturuldu (avatars, posts)
- [ ] Google OAuth yapılandırıldı
- [ ] .env dosyası oluşturuldu ve dolduruldu
- [ ] Bağımlılıklar yüklendi (bun install)
- [ ] Uygulama başlatıldı (bun start)
- [ ] Google ile giriş test edildi
- [ ] Admin paneli test edildi
- [ ] Admin şifresi değiştirildi (production için)

## 🚀 Sonraki Adımlar

Kurulum tamamlandıktan sonra:

1. **LazGPT Entegrasyonu**: DeepSeek API ile yapay zeka asistanı
2. **Stripe Ödemeleri**: Bağış ve premium üyelik sistemi
3. **Push Notifications**: Firebase/OneSignal ile anlık bildirimler
4. **Agora Video**: Canlı yayın ve görüntülü arama
5. **Harita Entegrasyonu**: Konum tabanlı özellikler

Her özellik için detaylı dökümantasyon eklenecektir.

---

🏔️ **MyTrabzon** - Trabzon'un Dijital Sesi
