# 🔐 Environment Variables Rehberi

Bu döküman, MyTrabzon uygulamasının çalışması için gerekli tüm environment variable'ları detaylı şekilde açıklar.

## 📋 Gerekli Değişkenler

### 1. Supabase Konfigürasyonu

```env
EXPO_PUBLIC_SUPABASE_URL=https://xcvcplwimicylaxghiak.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

#### `EXPO_PUBLIC_SUPABASE_URL`
- **Açıklama**: Supabase projenizin ana URL'i
- **Nereden alınır**: Supabase Dashboard > Settings > API > Project URL
- **Örnek**: `https://xcvcplwimicylaxghiak.supabase.co`
- **Not**: `EXPO_PUBLIC_` prefix'i ile başlar, client tarafında erişilebilir

#### `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Açıklama**: Supabase public/anonymous API key
- **Nereden alınır**: Supabase Dashboard > Settings > API > Project API keys > anon public
- **Güvenlik**: Public, client tarafında kullanılabilir
- **RLS**: Row Level Security ile korunur

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Açıklama**: Supabase service role key (yönetici yetkisi)
- **Nereden alınır**: Supabase Dashboard > Settings > API > Project API keys > service_role
- **⚠️ ÇOK ÖNEMLİ**: Bu key'i **ASLA** client kodunda kullanmayın!
- **Kullanım**: Sadece backend/server-side işlemlerde
- **Güvenlik**: RLS bypass eder, tüm veritabanına erişim sağlar

---

### 2. Google OAuth

```env
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456...
```

#### `GOOGLE_CLIENT_ID`
- **Açıklama**: Google OAuth 2.0 Client ID
- **Nereden alınır**: 
  1. [Google Cloud Console](https://console.cloud.google.com)
  2. Proje seçin veya oluşturun
  3. APIs & Services > Credentials
  4. Create Credentials > OAuth 2.0 Client ID
  5. Application type: Web application
- **Format**: `[NUMBERS]-[RANDOM].apps.googleusercontent.com`

#### `GOOGLE_CLIENT_SECRET`
- **Açıklama**: Google OAuth Client Secret
- **Nereden alınır**: Google Cloud Console > Credentials (Client ID ile birlikte)
- **Format**: `GOCSPX-[RANDOM_STRING]`
- **⚠️ Güvenlik**: Gizli tutun, GitHub'a push etmeyin

#### Google OAuth Redirect URI Ayarı
Supabase'de Google OAuth kullanmak için:
1. Google Cloud Console > OAuth 2.0 Client > Authorized redirect URIs
2. Ekle: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
3. Örnek: `https://xcvcplwimicylaxghiak.supabase.co/auth/v1/callback`

---

### 3. JWT Secret

```env
JWT_SECRET=super-secret-jwt-key-change-this-in-production
```

#### `JWT_SECRET`
- **Açıklama**: JWT token'ları imzalamak için kullanılan secret key
- **Nasıl oluşturulur**:
  ```bash
  # Yöntem 1: OpenSSL
  openssl rand -base64 32
  
  # Yöntem 2: Node.js
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  
  # Yöntem 3: Online
  # https://generate-secret.vercel.app/32
  ```
- **⚠️ ÇOK ÖNEMLİ**: Production'da güçlü bir rastgele string kullanın
- **Minimum uzunluk**: 32 karakter
- **Örnek**: `xK9vPmN2qR8tL4wY6aH3jE7fZ1cB5nV9gS8dU0iO2pA=`

---

### 4. App Configuration

```env
EXPO_PUBLIC_APP_NAME=MyTrabzon
EXPO_PUBLIC_LAZGPT_NAME=LazGPT
```

#### `EXPO_PUBLIC_APP_NAME`
- **Açıklama**: Uygulama adı
- **Varsayılan**: `MyTrabzon`
- **Kullanım**: UI'da gösterilir

#### `EXPO_PUBLIC_LAZGPT_NAME`
- **Açıklama**: AI asistanının adı
- **Varsayılan**: `LazGPT`
- **Kullanım**: Chat ve AI özelliklerinde

---

## 🔮 Gelecek Özellikler (Şu an isteğe bağlı)

### 5. Stripe Payments

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

#### `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Açıklama**: Stripe public key (client-side)
- **Nereden alınır**: [Stripe Dashboard](https://dashboard.stripe.com) > Developers > API keys
- **Test modu**: `pk_test_...` ile başlar
- **Production modu**: `pk_live_...` ile başlar

#### `STRIPE_SECRET_KEY`
- **Açıklama**: Stripe secret key (server-side)
- **Nereden alınır**: Stripe Dashboard > Developers > API keys
- **Test modu**: `sk_test_...` ile başlar
- **Production modu**: `sk_live_...` ile başlar
- **⚠️ Güvenlik**: ASLA client tarafında kullanmayın

---

### 6. DeepSeek AI (LazGPT)

```env
DEEPSEEK_API_KEY=sk-...
```

#### `DEEPSEEK_API_KEY`
- **Açıklama**: DeepSeek AI API key (LazGPT için)
- **Nereden alınır**: [DeepSeek Platform](https://platform.deepseek.com)
- **Format**: `sk-...` ile başlar
- **Kullanım**: AI sohbet asistanı özellikleri için

---

## 📝 .env Dosyası Şablonu

### Development (.env)
```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xcvcplwimicylaxghiak.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# App
EXPO_PUBLIC_APP_NAME=MyTrabzon
EXPO_PUBLIC_LAZGPT_NAME=LazGPT

# Future Features (Optional)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
DEEPSEEK_API_KEY=
```

### Production (.env.production)
```env
# ⚠️ Production values - KESİNLİKLE GitHub'a push ETMEYİN!

# Supabase (Production)
EXPO_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=prod_service_role_key

# Google OAuth (Production)
GOOGLE_CLIENT_ID=prod_client_id
GOOGLE_CLIENT_SECRET=prod_client_secret

# JWT (Production - GÜÇ LÜ rastgele string)
JWT_SECRET=prod_super_strong_random_string_minimum_32_chars

# Stripe (Production)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# DeepSeek (Production)
DEEPSEEK_API_KEY=sk-prod...
```

---

## 🔒 Güvenlik En İyi Uygulamaları

### ✅ Yapılması Gerekenler
1. **`.env` dosyasını `.gitignore`'a ekleyin**
   ```gitignore
   .env
   .env.local
   .env.production
   .env.*.local
   ```

2. **Production key'leri ayrı tutun**
   - Development: `.env`
   - Production: `.env.production` veya CI/CD secrets

3. **Güçlü secret'lar kullanın**
   ```bash
   # İyi
   openssl rand -base64 32
   
   # Kötü
   JWT_SECRET=123456
   JWT_SECRET=mysecret
   ```

4. **Environment variable'ları validation yapın**
   ```typescript
   if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
     throw new Error('EXPO_PUBLIC_SUPABASE_URL is required');
   }
   ```

### ❌ Yapılmaması Gerekenler
1. **Secret key'leri client kodunda kullanmayın**
   ```typescript
   // ❌ YANLIŞ
   const secret = process.env.STRIPE_SECRET_KEY;
   
   // ✅ DOĞRU (sadece backend)
   // backend/payment.ts
   const secret = process.env.STRIPE_SECRET_KEY;
   ```

2. **Hardcode etmeyin**
   ```typescript
   // ❌ YANLIŞ
   const supabaseUrl = "https://myproject.supabase.co";
   
   // ✅ DOĞRU
   const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
   ```

3. **Git'e commit etmeyin**
   - `.env` dosyalarını **ASLA** GitHub'a push etmeyin
   - `.env.example` kullanın (değerler olmadan)

---

## 🧪 Değerleri Test Etme

### Supabase Bağlantısı
```bash
# Node.js ile test
node -e "
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  );
  supabase.from('user_profiles').select('count').then(console.log);
"
```

### Google OAuth
- Uygulamayı başlatın
- "Google ile Giriş Yap" butonuna tıklayın
- Hata alırsanız redirect URI'ları kontrol edin

### JWT Secret
```bash
# JWT oluşturma testi
node -e "
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ userId: '123' }, process.env.JWT_SECRET);
  console.log('Token:', token);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Decoded:', decoded);
"
```

---

## 📦 CI/CD Entegrasyonu

### GitHub Actions
```yaml
# .github/workflows/build.yml
env:
  EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  # Diğer secrets...
```

### Vercel
```bash
# Vercel CLI ile environment variables ekle
vercel env add EXPO_PUBLIC_SUPABASE_URL production
vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY production
```

### EAS (Expo Application Services)
```json
// eas.json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://prod.supabase.co"
      }
    }
  }
}
```

---

## 🆘 Sorun Giderme

### "Environment variable not found"
```typescript
// Doğru kullanım
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;

// Expo client'ta erişim için EXPO_PUBLIC_ gerekli
// Backend'de gerekli değil
```

### Değerler güncellenmiyor
```bash
# Development server'ı yeniden başlatın
# Ctrl+C
bun start

# Cache temizle
bun start --clear
```

### Supabase bağlanamıyor
1. URL'i kontrol edin (https:// ile başlamalı)
2. Anon key'i kontrol edin (çok uzun bir string)
3. Network erişimi kontrol edin
4. Supabase Dashboard'da proje durumunu kontrol edin

---

## 📞 Destek

Environment variable sorunları için:
1. Bu dokümantasyonu okuyun
2. `.env.example` ile karşılaştırın
3. Console loglarını kontrol edin
4. GitHub Issues açın

---

🔐 **Güvenlik birinci öncelik!** Production key'lerinizi asla paylaşmayın.
