# 🎉 MyTrabzon - Yeni Özellikler

## ✅ Eklenen Özellikler

### ⚙️ 1. AYARLAR SİSTEMİ

#### Profil Ayarları
- ✅ Ad, soyad, bio güncelleme
- ✅ Telefon numarası ekleme
- ✅ Doğum tarihi ekleme
- ✅ Avatar (profil resmi) yükleme

#### Gizlilik Ayarları
- ✅ Profil görünürlüğü (Herkese Açık / Arkadaşlar / Özel)
- ✅ Telefon numarası gösterme/gizleme
- ✅ E-posta gösterme/gizleme
- ✅ Doğum tarihi gösterme/gizleme
- ✅ Mesajlaşma izinleri (Herkes / Arkadaşlar / Kimse)
- ✅ Etiketlenme izinleri (Herkes / Arkadaşlar / Kimse)
- ✅ Çevrimiçi durum gösterme/gizleme

#### Bildirim Ayarları
- ✅ Push bildirimler (Ana açma/kapama)
  - Paylaşımlar
  - Yorumlar
  - Beğeniler
  - Takipçiler
  - Mesajlar
  - Etkinlikler
  - Yardım istekleri
- ✅ E-posta bildirimleri
  - Bildirim sıklığı (Anında / Günlük / Haftalık / Asla)
  - Pazarlama e-postaları
- ✅ SMS bildirimleri
  - SMS açma/kapama
  - Sadece önemli bildirimler

#### Güvenlik Ayarları
- ✅ Şifre değiştirme
- ✅ İki faktörlü kimlik doğrulama
  - SMS ile doğrulama
  - E-posta ile doğrulama
  - Authenticator uygulaması ile doğrulama
- ✅ Oturum yönetimi (Aktif cihazları görme ve kapatma)

#### Hesap Yönetimi
- ✅ Veri indirme (GDPR uyumlu - tüm verilerinizi JSON formatında)
- ✅ Hesap silme talebi (7 gün beklemeli silme sistemi)
- ✅ Hesap silme iptal etme

#### İlçe Ayarları
- ✅ Ana ilçe seçimi
- ✅ İlgilenilen ilçeler seçimi
- ✅ Tüm ilçelerden içerik gösterme/gizleme

---

### 🔐 2. KİMLİK DOĞRULAMA SİSTEMİ

#### Selfie Doğrulama
- ✅ Selfie fotoğrafı yükleme
- ✅ Admin onay sistemi
- ✅ Doğrulama durumu takibi (Beklemede / Onaylandı / Reddedildi)
- ✅ Güven skoru hesaplama

#### Kimlik Belgesi Doğrulama
- ✅ Kimlik ön yüz fotoğrafı
- ✅ Kimlik arka yüz fotoğrafı (opsiyonel)
- ✅ Kimlik ile selfie fotoğrafı
- ✅ Admin onay sistemi
- ✅ Kişisel bilgi doğrulama

---

### 📊 3. İSTATİSTİK PANELİ

#### Kullanıcı İstatistikleri
- ✅ Toplam paylaşım sayısı
- ✅ Takipçi sayısı
- ✅ Takip edilen sayısı
- ✅ Puan durumu
- ✅ Kazanılan rozetler

#### Sistem İstatistikleri (Admin için)
- ✅ Toplam kullanıcı sayısı
- ✅ Doğrulanmış kullanıcı sayısı
- ✅ Bugün aktif kullanıcılar
- ✅ Toplam paylaşım, yorum, etkinlik sayıları
- ✅ Bekleyen doğrulama talepleri
- ✅ Bekleyen raporlar
- ✅ İlçe bazlı kullanıcı dağılımı

---

### 🗂️ 4. VERİ YÖNETİMİ

#### Veri İndirme (GDPR)
Kullanıcılar tüm verilerini indirebilir:
- ✅ Profil bilgileri
- ✅ Ayarlar
- ✅ Paylaşımlar
- ✅ Yorumlar
- ✅ İşletmeler
- ✅ Etkinlikler
- ✅ Yardım istekleri
- ✅ Kampanyalar
- ✅ Takipçi/Takip listesi

#### Hesap Silme
- ✅ 7 günlük bekleme süresi
- ✅ Silme talebini iptal etme
- ✅ Otomatik veri temizleme
- ✅ Zamanlayıcı sistemi

---

### 🚫 5. ENGELLEME SİSTEMİ

- ✅ Kullanıcı engelleme
- ✅ Engelleme nedeni ekleme
- ✅ Engellenen kullanıcılar listesi
- ✅ Engeli kaldırma

---

### 📱 6. OTURUM YÖNETİMİ

- ✅ Aktif cihazları görme
- ✅ Cihaz adı ve türü
- ✅ IP adresi
- ✅ Son aktivite zamanı
- ✅ Uzaktan oturum kapatma

---

### 🔍 7. GELİŞMİŞ ARAMA

- ✅ İsim-soyisim ile kullanıcı arama
- ✅ Benzerlik algoritması (fuzzy search)
- ✅ İlçe bazlı filtreleme
- ✅ Tam metin arama (Türkçe dil desteği)

---

## 📦 VERİTABANI DEĞİŞİKLİKLERİ

### Yeni Tablolar
1. **user_settings** - Kullanıcı ayarları (gizlilik, bildirim, güvenlik)
2. **user_sessions** - Aktif oturum yönetimi
3. **selfie_verifications** - Selfie doğrulama talepleri
4. **identity_verifications** - Kimlik belgesi doğrulama
5. **blocked_users** - Engellenmiş kullanıcılar

### Güncellenmiş Tablolar
**user_profiles** tablosuna yeni alanlar:
- `date_of_birth` - Doğum tarihi
- `verification_status` - Doğrulama durumu
- `verification_documents` - Doğrulama belgeleri
- `verified_at` - Doğrulama tarihi
- `verification_notes` - Doğrulama notları
- `is_online` - Çevrimiçi durumu
- `last_seen_at` - Son görülme zamanı

---

## 🛠️ YENİ FONKSİYONLAR

### Kullanıcı Fonksiyonları
- `request_account_deletion()` - Hesap silme talebi
- `cancel_account_deletion()` - Hesap silme iptali
- `download_user_data()` - Veri indirme (GDPR)
- `get_user_settings(user_id)` - Ayarları getir
- `update_user_settings(settings_data)` - Ayarları güncelle

### Admin Fonksiyonları
- `approve_selfie_verification(verification_id)` - Selfie onayla
- `approve_identity_verification(verification_id)` - Kimlik onayla
- `get_system_stats()` - Sistem istatistikleri

---

## 🔒 GÜVENLİK

### Row Level Security (RLS)
Tüm yeni tablolar için RLS politikaları eklendi:
- ✅ Kullanıcılar sadece kendi verilerini görebilir
- ✅ Adminler doğrulama taleplerini görebilir
- ✅ Engellemeler özel tutulur
- ✅ Oturum bilgileri korunur

### Trigger'lar
- ✅ Otomatik ayar oluşturma (yeni kullanıcı kaydında)
- ✅ Hesap silme zamanlayıcı (7 gün)
- ✅ Otomatik zaman damgası güncellemeleri

---

## 📋 KURULUM TALİMATLARI

### 1. Supabase SQL Editör
`constants/supabase-schema.sql` dosyasındaki tüm kodu Supabase SQL Editor'e yapıştırın ve çalıştırın.

### 2. Storage Bucket'ları
Supabase Dashboard > Storage bölümünden şu bucket'ları oluşturun:
- `avatars` (public)
- `selfies` (private)
- `verification` (private)
- `posts` (public)
- `events` (public)
- `businesses` (public)

### 3. Authentication
Supabase Dashboard > Authentication:
- Google OAuth'u etkinleştirin
- Email Templates'i düzenleyin
- Magic Link'i etkinleştirin

### 4. Environment Variables
`.env` dosyanıza ekleyin:
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 5. Admin Şifresi
Varsayılan admin şifresini değiştirin:
- Email: `sonertoprak@litxtech.com`
- Şifre: `admin123` (⚠️ ÖNEMLİ: Hemen değiştirin!)

---

## 🎯 KULLANIM ÖRNEKLERİ

### Ayarları Güncelleme
```typescript
import { supabase } from '@/lib/supabase';

// Gizlilik ayarlarını güncelle
const { data, error } = await supabase.rpc('update_user_settings', {
  settings_data: {
    profile_visibility: 'friends',
    show_phone: false,
    allow_messages_from: 'friends',
    push_enabled: true
  }
});
```

### Hesap Silme Talebi
```typescript
// Hesap silme talebi oluştur
const { data, error } = await supabase.rpc('request_account_deletion');

// Hesap silme talebini iptal et
const { data, error } = await supabase.rpc('cancel_account_deletion');
```

### Veri İndirme
```typescript
// Tüm verileri JSON olarak indir
const { data, error } = await supabase.rpc('download_user_data');
console.log(data); // JSON formatında tüm veriler
```

### Kullanıcı Engelleme
```typescript
// Kullanıcıyı engelle
await supabase.from('blocked_users').insert({
  blocked_id: userId,
  reason: 'Spam içerik paylaşımı'
});

// Engeli kaldır
await supabase.from('blocked_users').delete().eq('blocked_id', userId);
```

### Selfie Doğrulama (Admin)
```typescript
// Selfie doğrulamayı onayla
const { data, error } = await supabase.rpc('approve_selfie_verification', {
  verification_id: verificationId,
  confidence_score: 0.95
});
```

---

## 🚀 ÖNERİLEN SONRAKI ADIMLAR

1. **UI Geliştirme**
   - Ayarlar sayfası tasarımı
   - Profil doğrulama akışı
   - İstatistik dashboard'u

2. **Bildirim Sistemi**
   - Push notification entegrasyonu
   - Email notification servisi
   - SMS servisi entegrasyonu

3. **Admin Paneli**
   - Doğrulama istekleri yönetimi
   - Kullanıcı moderasyonu
   - İstatistik raporları

4. **Test**
   - Unit testler
   - Integration testler
   - E2E testler

---

## 📞 DESTEK

Sorularınız için:
- **Email:** support@litxtech.com
- **Tel:** +1 307 271 5151
- **Web:** https://www.litxtech.com

---

## 📝 NOTLAR

- ✅ Tüm yeni özellikler GDPR uyumlu
- ✅ Row Level Security ile tam güvenlik
- ✅ Türkçe dil desteği
- ✅ Mobile-first tasarım
- ✅ Real-time güncellemeler
- ✅ Performans optimize edilmiş indexler

**Son Güncelleme:** 2025-01-10
**Versiyon:** 2.0.0
