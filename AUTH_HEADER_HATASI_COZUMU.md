# 🔧 AUTHORIZATION HEADER HATASI ÇÖZÜMÜ

## ❌ HATA

```
{"code":401,"message":"Missing authorization header"}
```

**Anlamı**: Supabase Edge Function'a istek atılırken authorization header eksik veya yanlış.

---

## ✅ ÇÖZÜM

### 1. ✅ `lib/trpc.ts` Güncellendi

**Değişiklikler:**
- ✅ Daha iyi error handling
- ✅ Log mesajları eklendi
- ✅ Content-Type header eklendi
- ✅ Token yoksa bile request gönderilir (publicProcedure için)

**Kod:**
```typescript
async headers() {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn("Failed to get session for tRPC header:", error.message);
      return {};
    }
    
    const token = data?.session?.access_token;

    if (token) {
      console.log("✅ Adding auth token to tRPC request");
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    } else {
      console.warn("⚠️ No auth token available - request will be unauthenticated");
    }
  } catch (error) {
    console.error("Failed to attach Supabase auth header", error);
  }

  return {
    "Content-Type": "application/json",
  };
}
```

---

### 2. ✅ `supabase/functions/trpc/create-context.ts` Güncellendi

**Değişiklikler:**
- ✅ Authorization header yoksa bile context döndürülür
- ✅ PublicProcedure'lar için user gerekmez
- ✅ Sadece ProtectedProcedure'lar user gerektirir

**Kod:**
```typescript
// Authorization header yok - bu normal (publicProcedure için)
// Sadece log atalım, hata fırlatmayalım
if (!authorizationHeader) {
  console.log("No authorization header - using public context");
}
```

---

## 🔍 KONTROL

### 1. Session Kontrolü

**Expo terminal'inde şunları görmelisiniz:**
```
✅ Adding auth token to tRPC request
```

**Eğer şunu görüyorsanız:**
```
⚠️ No auth token available - request will be unauthenticated
```

**Çözüm:**
- Kullanıcı giriş yapmış mı kontrol edin
- `AuthContext` çalışıyor mu kontrol edin

---

### 2. Edge Function Logları

**Supabase Dashboard'da:**
1. Edge Functions > trpc > Logs
2. Request loglarını kontrol edin
3. Authorization header'ın geldiğini görmelisiniz

---

## 🚀 SONRAKI ADIMLAR

### 1. Deploy Edildi
```powershell
supabase functions deploy trpc
```

### 2. Expo'yu Yeniden Başlatın
```powershell
npx expo start --clear
```

### 3. Test Edin
- PublicProcedure'lar çalışmalı (auth gerekmez)
- ProtectedProcedure'lar çalışmalı (auth gerekir)

---

## ⚠️ ÖNEMLİ NOTLAR

1. **PublicProcedure vs ProtectedProcedure:**
   - `publicProcedure`: Auth gerekmez, herkes kullanabilir
   - `protectedProcedure`: Auth gerekir, user null ise 401 hatası

2. **Authorization Header:**
   - Token varsa: `Authorization: Bearer <token>`
   - Token yoksa: Header gönderilmez (publicProcedure için normal)

3. **Hata Durumları:**
   - Token geçersizse: User null kalır, ama context döndürülür
   - Token yoksa: User null kalır, publicProcedure çalışır

---

## ✅ DÜZELTME TAMAMLANDI

- ✅ `lib/trpc.ts` güncellendi
- ✅ `supabase/functions/trpc/create-context.ts` güncellendi
- ✅ Deploy edildi

Artık çalışmalı! Test edin! 🚀

