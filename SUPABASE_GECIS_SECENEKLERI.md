# 🎯 SUPABASE'E GEÇİŞ SEÇENEKLERİ

## 📋 MEVCUT DURUM

- ✅ **Database**: Supabase (zaten kullanılıyor)
- ✅ **Auth**: Supabase (zaten kullanılıyor)  
- ✅ **Storage**: Supabase (zaten kullanılıyor)
- ❌ **Backend API**: Rork/Replit (kaldırılacak)
- ✅ **tRPC Router**: Mevcut (korunmak isteniyor)

---

## 🎯 İKİ SEÇENEK

### ✅ SEÇENEK 1: Supabase Edge Functions + Basit HTTP API (Önerilen)

**Yaklaşım**: tRPC'yi kaldır, direkt Supabase client kullan

**Avantajlar:**
- ✅ Basit ve hızlı
- ✅ Supabase'in tüm özelliklerini kullan
- ✅ RLS (Row Level Security) ile güvenlik
- ✅ Real-time desteği
- ✅ Ücretsiz tier yeterli

**Dezavantajlar:**
- ⚠️ tRPC kod yapısı değişecek
- ⚠️ Type-safety biraz azalır (ama Supabase TypeScript types var)

**Değişiklikler:**
- `lib/trpc.ts` → `lib/api.ts` (Supabase client wrapper)
- `backend/trpc/routes/*` → `lib/api/*` (Supabase client functions)
- tRPC mutations → Supabase client calls

---

### ✅ SEÇENEK 2: Supabase Edge Functions + tRPC (Karmaşık)

**Yaklaşım**: tRPC'yi Supabase Edge Functions'a adapte et

**Avantajlar:**
- ✅ Mevcut tRPC kod yapısı korunur
- ✅ Type-safety tam korunur

**Dezavantajlar:**
- ❌ Çok karmaşık (Deno vs Node.js)
- ❌ Tüm tRPC modüllerini Deno'ya adapte etmek gerekir
- ❌ Bakımı zor

**Değişiklikler:**
- Tüm `backend/trpc/*` kodlarını Deno formatına çevir
- Node.js modüllerini Deno alternatifleriyle değiştir
- Supabase Edge Functions'da çalıştır

---

## 💡 ÖNERİM: SEÇENEK 1

**Neden?**
1. **Daha Basit**: Supabase client zaten kullanılıyor
2. **Daha Hızlı**: Direkt Supabase API kullanımı
3. **Daha Güvenli**: RLS ile otomatik güvenlik
4. **Daha Az Kod**: tRPC wrapper'larına gerek yok

**Nasıl Çalışır?**
```typescript
// Önce (tRPC):
const result = await trpc.post.createPost.mutateAsync({...});

// Sonra (Supabase):
const { data, error } = await supabase
  .from('posts')
  .insert({...});
```

---

## 🚀 UYGULAMA PLANI (SEÇENEK 1)

### Adım 1: API Helper Functions Oluştur

`lib/api/` klasöründe Supabase client wrapper'ları:
- `lib/api/posts.ts` - Post işlemleri
- `lib/api/users.ts` - User işlemleri
- `lib/api/comments.ts` - Comment işlemleri
- `lib/api/chat.ts` - Chat işlemleri

### Adım 2: Mevcut tRPC Kullanımlarını Değiştir

- `app/profile/edit.tsx` → Supabase client
- `app/create-post.tsx` → Supabase client
- `app/(tabs)/feed.tsx` → Supabase client

### Adım 3: Rork Bağımlılıklarını Kaldır

- `package.json`'dan Rork script'leri
- `.env`'den Rork URL'si
- `lib/trpc.ts` dosyasını kaldır

---

## ❓ HANGİSİNİ SEÇELİM?

**Ben SEÇENEK 1'i öneriyorum** çünkü:
- ✅ Daha basit
- ✅ Daha hızlı
- ✅ Supabase'in tüm özelliklerini kullanır
- ✅ RLS ile otomatik güvenlik

**Ama siz karar verin:**
- **SEÇENEK 1**: Basit, hızlı, Supabase-native
- **SEÇENEK 2**: Karmaşık, tRPC korunur

---

## 🎯 SONRAKI ADIM

Hangi seçeneği seçiyorsunuz?

1. **SEÇENEK 1** → Hemen başlayalım! 🚀
2. **SEÇENEK 2** → Daha karmaşık ama tRPC korunur

