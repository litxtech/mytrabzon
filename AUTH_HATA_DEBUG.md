# 🔍 AUTHORIZATION HEADER HATASI - DEBUG REHBERİ

## ❌ HATA

```
{"code":401,"message":"Missing authorization header"}
```

---

## 🔍 DEBUG ADIMLARI

### 1. Hangi Endpoint Çağrılıyor?

**Supabase Dashboard'da kontrol edin:**
1. Edge Functions > trpc > Logs
2. Son request'leri görüntüleyin
3. Hangi endpoint'in çağrıldığını görün

**Log'da göreceğiniz:**
```
tRPC request: {
  method: "POST",
  url: "...",
  hasAuth: true/false
}
```

---

### 2. Token Gönderiliyor mu?

**Expo terminal'inde kontrol edin:**
- `✅ Adding auth token to tRPC request` görüyorsanız → Token gönderiliyor
- `⚠️ No auth token available` görüyorsanız → Token yok

**Çözüm (Token yoksa):**
- Kullanıcı giriş yapmış mı kontrol edin
- `AuthContext` çalışıyor mu kontrol edin

---

### 3. Hangi Procedure Çağrılıyor?

**PublicProcedure mı, ProtectedProcedure mı?**

**PublicProcedure (Auth gerekmez):**
- `post.getPosts`
- `post.getComments`
- `post.getPostDetail`
- `user.getAllUsers`

**ProtectedProcedure (Auth gerekir):**
- `user.updateProfile`
- `user.uploadAvatar`
- `post.createPost`
- `post.updatePost`
- `post.deletePost`
- `chat.*` (tüm chat route'ları)

---

## 🔧 ÇÖZÜMLER

### Çözüm 1: PublicProcedure Kullanın (Test için)

Eğer test ediyorsanız, önce publicProcedure'ları deneyin:
```typescript
// ✅ Çalışmalı (auth gerekmez)
trpc.post.getPosts.useQuery({...})

// ❌ Auth gerekir
trpc.user.updateProfile.useMutation({...})
```

---

### Çözüm 2: Kullanıcı Giriş Yapmış mı Kontrol Edin

```typescript
const { user, session } = useAuth();

if (!user || !session) {
  // Kullanıcı giriş yapmamış
  // Önce giriş yapması gerekiyor
}
```

---

### Çözüm 3: Token'ı Manuel Kontrol Edin

```typescript
const { data } = await supabase.auth.getSession();
console.log("Session:", data?.session);
console.log("Token:", data?.session?.access_token);
```

---

## 📋 KONTROL LİSTESİ

- [ ] Kullanıcı giriş yapmış mı?
- [ ] `AuthContext` çalışıyor mu?
- [ ] Token var mı? (`supabase.auth.getSession()`)
- [ ] Hangi endpoint çağrılıyor? (Public mi, Protected mi?)
- [ ] Supabase Dashboard'da log'ları kontrol ettiniz mi?

---

## 🎯 SONRAKI ADIM

**Hangi endpoint'i çağırıyorsunuz?**
- PublicProcedure ise → Auth gerekmez, çalışmalı
- ProtectedProcedure ise → Auth gerekir, giriş yapmanız gerekiyor

**Lütfen şunu paylaşın:**
1. Hangi işlemi yapmaya çalışıyorsunuz? (Profil güncelleme, post oluşturma, vb.)
2. Expo terminal'inde ne görüyorsunuz? (Token log'ları)
3. Supabase Dashboard'da log'larda ne görüyorsunuz?

