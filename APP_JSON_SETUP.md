# app.json Yapılandırma Rehberi

MyTrabzon uygulaması için `app.json` dosyasında yapmanız gereken manuel değişiklikler.

## ⚠️ Yapılması Gereken Değişiklikler

### 1. URL Scheme Değişikliği

`app.json` dosyasında aşağıdaki satırı bulun:
```json
"scheme": "rork-app",
```

Şu şekilde değiştirin:
```json
"scheme": "mytrabzon",
```

**Neden önemli?**
- Google OAuth redirect URI'ları için gerekli
- Magic Link deep linking için gerekli
- Şifre sıfırlama redirect'leri için gerekli

### 2. Splash Screen Arka Plan Rengi

`app.json` dosyasında `splash` bölümünü bulun:
```json
"splash": {
  "image": "./assets/images/splash-icon.png",
  "resizeMode": "contain",
  "backgroundColor": "#ffffff"
},
```

`backgroundColor`'ı değiştirin:
```json
"splash": {
  "image": "./assets/images/splash-icon.png",
  "resizeMode": "contain",
  "backgroundColor": "#001F3F"
},
```

### 3. Android Adaptive Icon Arka Plan Rengi

`app.json` dosyasında `android` > `adaptiveIcon` bölümünü bulun:
```json
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/images/adaptive-icon.png",
    "backgroundColor": "#ffffff"
  },
  "package": "app.rork.mytrabzon"
},
```

`backgroundColor`'ı değiştirin:
```json
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/images/adaptive-icon.png",
    "backgroundColor": "#001F3F"
  },
  "package": "app.rork.mytrabzon"
},
```

## ✅ Güncellenmiş app.json

Tüm değişikliklerden sonra `app.json` dosyanız şu şekilde görünmelidir:

```json
{
  "expo": {
    "name": "MyTrabzon",
    "slug": "mytrabzon",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "mytrabzon",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#001F3F"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "app.rork.mytrabzon"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#001F3F"
      },
      "package": "app.rork.mytrabzon"
    },
    "web": {
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      [
        "expo-router",
        {
          "origin": "https://rork.com/"
        }
      ],
      "expo-font",
      "expo-web-browser"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

## 🔗 OAuth Redirect URI'ları

Bu değişikliklerden sonra, Google OAuth için aşağıdaki redirect URI'ları kullanın:

### Geliştirme (Development)
```
mytrabzon://auth/callback
http://localhost:19006/auth/callback
```

### Production (App Store / Google Play)
```
mytrabzon://auth/callback
https://your-production-domain.com/auth/callback
```

## 📱 Deep Linking

Şifre sıfırlama ve magic link için kullanılacak URL'ler:

### Geliştirme
```
mytrabzon://auth/reset-password
mytrabzon://auth/callback
```

### Web (Production)
```
https://your-production-domain.com/auth/reset-password
https://your-production-domain.com/auth/callback
```

## ⚙️ Supabase Yapılandırması

Bu değişikliklerden sonra Supabase Dashboard'da:

1. **Authentication** > **URL Configuration** menüsüne gidin
2. **Redirect URLs** bölümüne aşağıdakileri ekleyin:
   ```
   mytrabzon://auth/callback
   http://localhost:19006/auth/callback
   https://your-production-domain.com/auth/callback
   ```

3. **Additional Redirect URLs** için şifre sıfırlama URL'lerini ekleyin:
   ```
   mytrabzon://auth/reset-password
   https://your-production-domain.com/auth/reset-password
   ```

## 🎨 Renk Açıklaması

**#001F3F** (Lacivert)
- MyTrabzon'un ana tema rengi
- Karadeniz'in derinliğini simgeler
- Tüm splash screen ve loading ekranlarında kullanılır

## 🔄 Değişiklikleri Uygulama

Değişiklikleri yaptıktan sonra:

1. Development sunucusunu yeniden başlatın:
   ```bash
   # Ctrl+C ile mevcut sunucuyu durdurun
   # Sonra yeniden başlatın:
   bun start
   ```

2. Expo Go uygulamasındaki cache'i temizleyin:
   ```bash
   bunx expo start --clear
   ```

3. Build alırken (EAS Build):
   ```bash
   eas build --clear-cache --platform all
   ```

## ✅ Değişiklikleri Kontrol Etme

Doğru yapıldığını kontrol etmek için:

1. **Scheme kontrolü:**
   - Uygulamayı QR kod ile açın
   - Browser'da `mytrabzon://` ile açılabilir olmalı

2. **Splash screen kontrolü:**
   - Uygulamayı açın
   - Başlangıç ekranında lacivert arka plan görünmeli

3. **OAuth kontrolü:**
   - Google ile giriş yapın
   - Redirect başarılı olmalı

## 📞 Sorun mu Yaşıyorsunuz?

Eğer değişiklikleri yaparken sorun yaşarsanız:

1. `app.json` formatının bozulmadığından emin olun (JSON syntax)
2. Tüm değişikliklerden sonra sunucuyu yeniden başlatın
3. Cache'i temizleyin
4. Gerekirse `node_modules` ve `bun.lockb` dosyalarını silin ve yeniden yükleyin

---

© 2025 LITXTECH LLC
