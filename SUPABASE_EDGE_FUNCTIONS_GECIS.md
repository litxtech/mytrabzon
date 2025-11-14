# 🚀 SUPABASE EDGE FUNCTIONS + tRPC GEÇİŞİ

## 📋 DURUM

**Seçilen**: SEÇENEK 2 - Supabase Edge Functions + tRPC (tRPC korunur)

**Zorluk**: Orta-Yüksek (Deno adaptasyonu gerekli)

---

## 🎯 HEDEF

Mevcut tRPC yapısını koruyarak Supabase Edge Functions'a taşımak.

---

## 📝 ADIMLAR

### ✅ ADIM 1: Supabase Edge Function Oluşturuldu

**Dosya**: `supabase/functions/trpc/index.ts`

**Durum**: ✅ Temel yapı oluşturuldu

**Not**: Tüm route'ları Deno formatına çevirmemiz gerekiyor.

---

### 🔄 ADIM 2: Route'ları Deno Formatına Çevir

**Gerekli Değişiklikler:**

1. **Import'ları Değiştir:**
   ```typescript
   // Önce (Node.js):
   import { z } from "zod";
   import { protectedProcedure } from "../../../create-context";
   
   // Sonra (Deno):
   import { z } from "npm:zod@^4.1.12";
   import { protectedProcedure } from "../../../create-context.ts";
   ```

2. **Supabase Client:**
   ```typescript
   // Önce:
   const { supabase } = ctx;
   
   // Sonra: Aynı (ctx'den geliyor)
   ```

3. **File System:**
   - Supabase Storage kullan (zaten kullanılıyor)
   - Deno File System API'si farklı ama gerek yok

---

### 📦 ADIM 3: Dependencies'i Deno Formatına Çevir

**Gerekli npm paketleri:**
- `@trpc/server` → `npm:@trpc/server@^11.7.1`
- `zod` → `npm:zod@^4.1.12`
- `superjson` → `npm:superjson@^2.2.5`
- `@supabase/supabase-js` → `https://esm.sh/@supabase/supabase-js@2`

---

### 🔧 ADIM 4: Route Dosyalarını Adapte Et

**Yapılacaklar:**

1. **Her route dosyası için:**
   - Import'ları Deno formatına çevir
   - `create-context.ts` import'unu güncelle
   - Test et

2. **Öncelikli Route'lar:**
   - ✅ `user/update-profile/route.ts`
   - ✅ `user/upload-avatar/route.ts`
   - ✅ `post/create-post/route.ts`
   - ✅ `post/get-posts/route.ts`
   - ✅ `post/update-post/route.ts`
   - ✅ `post/delete-post/route.ts`
   - ✅ `post/add-comment/route.ts`
   - ✅ `post/get-comments/route.ts`

---

### 🌐 ADIM 5: tRPC Client'ı Güncelle

**Dosya**: `lib/trpc.ts`

**Değişiklik:**
```typescript
// Önce:
const baseUrl = getBaseUrl(); // Rork URL

// Sonra:
const baseUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/trpc`;
```

---

### 🗑️ ADIM 6: Rork Bağımlılıklarını Kaldır

1. **package.json:**
   - `start`, `start-web`, `start-web-dev` script'lerini kaldır
   - Rork bağımlılıklarını kaldır (varsa)

2. **.env:**
   - `EXPO_PUBLIC_RORK_API_BASE_URL`'i kaldır

3. **.replit:**
   - İsteğe bağlı: Kaldırılabilir

---

## 🚀 DEPLOY ADIMLARI

### 1. Supabase CLI Kurulumu

```bash
npm install -g supabase
```

### 2. Supabase'e Login

```bash
supabase login
```

### 3. Projeyi Link Et

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Edge Function'ı Deploy Et

```bash
supabase functions deploy trpc
```

### 5. Environment Variables Ayarla

Supabase Dashboard'da:
- `SUPABASE_URL` (otomatik)
- `SUPABASE_SERVICE_ROLE_KEY` (otomatik)

---

## ⚠️ ÖNEMLİ NOTLAR

1. **Deno Runtime:**
   - Edge Functions Deno kullanıyor
   - Node.js modülleri çalışmaz
   - `npm:` prefix ile npm paketleri kullanılabilir

2. **Import Paths:**
   - `.ts` extension gerekli
   - Relative paths çalışır
   - `npm:` ve `https://esm.sh/` kullanılabilir

3. **File System:**
   - Deno File System API farklı
   - Ama Supabase Storage kullanıyoruz, gerek yok

4. **Testing:**
   - Local'de test: `supabase functions serve trpc`
   - Production: Supabase Dashboard'dan test

---

## 📋 SONRAKI ADIMLAR

1. ✅ Edge Function temel yapısı oluşturuldu
2. 🔄 Route'ları Deno formatına çevir (şimdi yapılacak)
3. ⏳ tRPC client'ı güncelle
4. ⏳ Rork bağımlılıklarını kaldır
5. ⏳ Deploy et

---

## 🎯 BAŞLAYALIM MI?

Route'ları Deno formatına çevirmeye başlayalım mı?

