# 📝 Profil Sistemi Kurulum Rehberi

## 🎯 Özellikler

### ✨ Profil Yönetimi
- **Profil Resmi**: Yükleme, değiştirme, silme
- **Temel Bilgiler**: Ad, soyad, biyografi, şehir, ilçe
- **Kişisel Bilgiler**: Yaş, cinsiyet, boy, kilo
- **İletişim**: Telefon, e-posta, adres
- **Sosyal Medya**: Instagram, Twitter, Facebook, LinkedIn, TikTok, YouTube
- **Gizlilik Ayarları**: Her bilgi için ayrı gizlilik kontrolü

## 📋 Kurulum Adımları

### 1. Database Şeması Güncelleme

Supabase SQL Editor'de aşağıdaki kodu çalıştırın:

```sql
-- constants/profile-update-schema.sql dosyasını açın ve tüm içeriğini kopyalayın
-- Supabase Dashboard > SQL Editor'e yapıştırın ve RUN yapın
```

Bu şema şunları oluşturacak:
- `city_type` enum (Trabzon, Giresun, Rize)
- `gender_type` enum (male, female, other)
- `user_profiles` tablosuna yeni kolonlar
- Storage bucket'ları (avatars, posts, selfies)
- Storage politikaları
- Profil güncelleme fonksiyonları

### 2. Storage Bucket Kontrolü

Supabase Dashboard > Storage bölümünde şu bucket'ların oluştuğundan emin olun:
- ✅ `avatars` (public)
- ✅ `posts` (public)
- ✅ `selfies` (private)

### 3. Environment Variables

`.env` dosyanızda şunları kontrol edin:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🚀 Kullanım

### Profil Düzenleme Sayfası

Kullanıcılar profil sayfasından "Profili Düzenle" butonuna tıklayarak erişebilir.

**Yol**: `/profile/edit`

### Profil Resmi Yükleme

```typescript
// Otomatik olarak çalışır:
// 1. Galeri izni istenir
// 2. Resim seçilir (1:1 kırpılabilir)
// 3. Supabase Storage'a yüklenir
// 4. Database'de profil resmi URL'si güncellenir
```

### Gizlilik Ayarları

Kullanıcılar her bilgi için göz ikonu (👁️) ile gizlilik ayarlarını kontrol edebilir:

- ✅ **Göz Açık**: Bilgi herkese görünür
- ❌ **Göz Kapalı**: Bilgi gizli

## 📱 Ekranlar

### 1. Profil Sayfası (`app/(tabs)/profile.tsx`)
- Profil resmi görüntüleme
- Temel bilgiler
- İstatistikler
- "Profili Düzenle" butonu

### 2. Profil Düzenleme (`app/profile/edit.tsx`)
- Profil resmi yükleme/silme
- Tüm bilgileri düzenleme
- Gizlilik ayarları
- Kaydet/İptal butonları

## 🔧 Teknik Detaylar

### Database Şeması

```typescript
interface UserProfile {
  // Mevcut alanlar
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  district: District;
  
  // Yeni alanlar
  city: 'Trabzon' | 'Giresun' | 'Rize' | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  phone: string | null;
  address: string | null;
  height: number | null;
  weight: number | null;
  social_media: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
  };
  privacy_settings: {
    show_age: boolean;
    show_gender: boolean;
    show_phone: boolean;
    show_email: boolean;
    show_address: boolean;
    show_height: boolean;
    show_weight: boolean;
    show_social_media: boolean;
  };
}
```

### Storage Yapısı

```
avatars/
  ├── {user_id}/
  │   └── {timestamp}.{ext}
posts/
  ├── {user_id}/
  │   └── {timestamp}.{ext}
selfies/
  ├── {user_id}/
  │   └── {timestamp}.{ext}
```

### Güvenlik

- **RLS Policies**: Her kullanıcı sadece kendi bilgilerini düzenleyebilir
- **Storage Policies**: Kullanıcılar sadece kendi klasörlerine dosya yükleyebilir
- **Validation**: Form validasyonları client-side yapılır
- **Privacy**: Gizlilik ayarlarına göre veri görünürlüğü kontrol edilir

## 🔒 Gizlilik ve Güvenlik

### Profil Görünürlüğü

Kullanıcılar `privacy_settings` ile hangi bilgilerinin görüneceğini kontrol eder:

```typescript
const canShowAge = userProfile.privacy_settings.show_age;
const canShowPhone = userProfile.privacy_settings.show_phone;
// ... diğer ayarlar
```

### Veri Koruması

- Profil resimleri public storage'da (CDN üzerinden hızlı erişim)
- Kimlik doğrulama dosyaları private storage'da
- Kullanıcı verileri RLS ile korunur
- Soft delete ile 7 günlük veri kurtarma imkanı

## 🎨 UI/UX Özellikleri

- **Mobil Optimized**: Tüm inputlar mobile-friendly
- **Live Preview**: Profil resmi değişikliği anında görülür
- **Loading States**: Yükleme sırasında kullanıcı bilgilendirilir
- **Error Handling**: Hata durumlarında açıklayıcı mesajlar
- **Validation**: Gerçek zamanlı form validasyonu
- **Accessibility**: Tüm elementler erişilebilir

## 📊 Özellik Listesi

| Özellik | Durum | Açıklama |
|---------|-------|----------|
| Profil Resmi Yükleme | ✅ | Galeri'den seçim, 1:1 kırpma |
| Profil Resmi Silme | ✅ | Onay ile silme |
| Ad Soyad Düzenleme | ✅ | Text input |
| Biyografi | ✅ | Multi-line text |
| Şehir Seçimi | ✅ | Trabzon, Giresun, Rize |
| İlçe Seçimi | ✅ | 18 ilçe |
| Yaş | ✅ | Number input + gizlilik |
| Cinsiyet | ✅ | Picker + gizlilik |
| Boy/Kilo | ✅ | Number input + gizlilik |
| Telefon | ✅ | Phone input + gizlilik |
| E-posta | ✅ | Email input + gizlilik |
| Adres | ✅ | Multi-line + gizlilik |
| Sosyal Medya | ✅ | 6 platform + gizlilik |
| Gizlilik Ayarları | ✅ | 8 farklı ayar |

## 🐛 Bilinen Sorunlar

Şu an bilinen bir sorun yok.

## 🔮 Gelecek Özellikler

- [ ] Profil doğrulama (mavi tik)
- [ ] Arka plan resmi
- [ ] Profil temaları
- [ ] QR kod profil paylaşımı
- [ ] Profil görüntülenme sayısı
- [ ] Profil ziyaretçileri

## 📞 Destek

Herhangi bir sorun yaşarsanız:
- E-posta: support@litxtech.com
- Telefon: +1 307 271 5151
- Website: www.litxtech.com
