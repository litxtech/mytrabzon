# 🚀 SUPABASE'E GEÇİŞ PLANI

## 📋 MEVCUT DURUM

- ✅ **Database**: Supabase (zaten kullanılıyor)
- ✅ **Auth**: Supabase (zaten kullanılıyor)
- ✅ **Storage**: Supabase (zaten kullanılıyor)
- ❌ **Backend API**: Rork/Replit (kaldırılacak)
- ✅ **tRPC Router**: Mevcut (korunacak)

---

## 🎯 HEDEF

**Tüm backend'i Supabase'e taşıyalım:**
- ✅ Supabase Edge Functions ile tRPC'yi çalıştır
- ✅ Rork/Replit bağımlılığını kaldır
- ✅ Mevcut tRPC kod yapısını koru

---

## 📝 ADIMLAR

### 1. Supabase Edge Function Oluştur

**Dosya**: `supabase/functions/trpc/index.ts`

Bu function tüm tRPC isteklerini handle edecek.

### 2. Hono App'i Edge Function'a Adapte Et

Mevcut `backend/hono.ts` kodunu Supabase Edge Function formatına çevir.

### 3. tRPC Client'ı Güncelle

`lib/trpc.ts` dosyasını Supabase Edge Function URL'sine yönlendir.

### 4. Rork Bağımlılıklarını Kaldır

- `package.json`'dan Rork script'lerini kaldır
- `.env`'den `EXPO_PUBLIC_RORK_API_BASE_URL`'i kaldır

---

## ✅ AVANTAJLAR

1. **Tek Platform**: Tüm backend Supabase'de
2. **Ücretsiz**: Supabase'in ücretsiz tier'ı yeterli
3. **Kolay Deploy**: Supabase CLI ile otomatik deploy
4. **RLS Entegrasyonu**: Daha iyi güvenlik
5. **Real-time**: Edge Functions real-time ile entegre

---

## 🔧 UYGULAMA

Şimdi bu geçişi yapalım mı?

