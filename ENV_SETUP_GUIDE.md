# MyTrabzon - ENV Yapılandırma Rehberi

Bu dosya, MyTrabzon uygulamasını çalıştırmak için gerekli environment variables (çevre değişkenleri) hakkında bilgi içerir.

## 📋 Gerekli ENV Değişkenleri

Projenizin kök dizininde bir `.env` dosyası oluşturun ve aşağıdaki değişkenleri ekleyin:

### 1. Supabase Ayarları

```env
EXPO_PUBLIC_SUPABASE_URL=https://xcvcplwimicylaxghiak.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

**Nerede Bulunur:**
1. [Supabase Dashboard](https://app.supabase.com)'a gidin
2. Projenizi seçin
3. Settings > API menüsüne gidin
4. "Project URL" → `EXPO_PUBLIC_SUPABASE_URL`
5. "anon public" key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
6. "service_role" key → `SUPABASE_SERVICE_ROLE_KEY` (güvenli tutun!)

**Önemli:**
- Service role key'i asla client tarafında kullanmayın!
- Bu key'i GitHub'a push etmeyin!

### 2. Google OAuth Ayarları (Opsiyonel)

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Nasıl Alınır:**
1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin
2. Yeni proje oluşturun veya mevcut projeyi seçin
3. "APIs & Services" > "Credentials" menüsüne gidin
4. "Create Credentials" > "OAuth 2.0 Client ID" seçin
5. Application type: Web application
6. Authorized redirect URIs ekleyin:
   - `https://xcvcplwimicylaxghiak.supabase.co/auth/v1/callback`
   - Yerel test için: `http://localhost:19006/auth/callback`

**Supabase'de Yapılandırma:**
1. Supabase Dashboard > Authentication > Providers
2. Google'ı etkinleştirin
3. Client ID ve Client Secret'ı girin

### 3. DeepSeek API (LazGPT için)

```env
DEEPSEEK_API_KEY=sk-your_deepseek_api_key
```

**Nasıl Alınır:**
1. [DeepSeek Platform](https://platform.deepseek.com/)'a gidin
2. Hesap oluşturun
3. API Keys bölümünden yeni key oluşturun
4. Bu key'i yukarıdaki değişkene yapıştırın

### 4. Stripe Ayarları (Ödeme için)

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

**Nasıl Alınır:**
1. [Stripe Dashboard](https://dashboard.stripe.com/)'a gidin
2. Developers > API keys bölümüne gidin
3. Test mode'da:
   - "Publishable key" → `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - "Secret key" → `STRIPE_SECRET_KEY`

**Önemli:** Production'a geçerken test key'lerini production key'leri ile değiştirin!

### 5. Uygulama Ayarları

```env
EXPO_PUBLIC_APP_NAME=MyTrabzon
EXPO_PUBLIC_LAZGPT_NAME=LazGPT
EXPO_PUBLIC_APP_VERSION=1.0.0
```

Bu değişkenler zaten varsayılan olarak ayarlanmıştır. İsterseniz özelleştirebilirsiniz.

## 🔒 Güvenlik Notları

### ⚠️ Asla GitHub'a Pushlamamanız Gerekenler:
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPSEEK_API_KEY`
- `STRIPE_SECRET_KEY`
- `GOOGLE_CLIENT_SECRET`

### ✅ Client-side'da Kullanılabilir:
- `EXPO_PUBLIC_` ile başlayan tüm değişkenler

`.gitignore` dosyanızda `.env` olduğundan emin olun!

## 🗄️ Supabase Database Kurulumu

1. Supabase Dashboard > SQL Editor'e gidin
2. `constants/supabase-schema.sql` dosyasını açın
3. Tüm SQL kodunu kopyalayın ve SQL Editor'e yapıştırın
4. "Run" butonuna tıklayın

Bu işlem:
- Tüm tabloları oluşturur
- İlişkileri kurar
- Row Level Security (RLS) politikalarını ayarlar
- Varsayılan admin kullanıcısı oluşturur

## 👤 Admin Hesabı

**Varsayılan admin bilgileri:**
- Email: `sonertoprak@litxtech.com`
- Şifre: `admin123`

**Önemli:** Production'a geçmeden önce şifreyi değiştirin!

Şifreyi değiştirmek için SQL Editor'de:
```sql
-- Yeni şifrenin hash'ini oluşturun (bcrypt)
-- Örnek: bcrypt hash of 'yeni_guvenli_sifre'
UPDATE admin_users 
SET password_hash = '$2a$10$your_new_password_hash_here'
WHERE email = 'sonertoprak@litxtech.com';
```

## 🚀 Çalıştırma

ENV'leri ayarladıktan sonra:

```bash
# Bağımlılıkları yükle
bun install

# Geliştirme modunda başlat
bun start

# Web modunda başlat
bun start-web
```

## 📱 Mobil Test

QR kodu tarayarak Expo Go uygulamasıyla test edebilirsiniz.

**Önemli:** Google OAuth mobilde test etmek için:
1. `app.json` içinde `scheme: "mytrabzon"` olduğundan emin olun
2. Google Console'da redirect URI: `mytrabzon://auth/callback`

## 🌐 Web Deployment

Web'de deploy ederken (Vercel, Netlify vb.):
1. Tüm `EXPO_PUBLIC_*` değişkenlerini environment variables'a ekleyin
2. Backend key'lerini (STRIPE_SECRET_KEY vb.) güvenli şekilde saklayın
3. Production URL'lerini Google OAuth ve Stripe'ta güncelleyin

## ❓ Sorun Giderme

### Supabase Bağlantı Hatası
- URL ve key'leri kontrol edin
- Supabase Dashboard'da projenin aktif olduğunu kontrol edin

### Google OAuth Çalışmıyor
- Redirect URI'ların doğru olduğunu kontrol edin
- Supabase'de Google provider'ın etkin olduğunu kontrol edin

### Magic Link Gelmiyor
- Supabase Dashboard > Authentication > Email Templates'i kontrol edin
- Spam klasörünü kontrol edin
- SMTP ayarlarını kontrol edin (varsayılan Supabase SMTP)

## 📞 Destek

Sorularınız için:
- Web: www.litxtech.com
- Email: support@litxtech.com

---

**LITXTECH LLC** - MyTrabzon © 2025
