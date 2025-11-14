# 🧪 SUPABASE EDGE FUNCTION TEST REHBERİ

## 🔗 TEST URL'LERİ

### 1. ✅ Base Function URL (CORS Test)

**URL:**
```
https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc
```

**Beklenen:**
- CORS hatası olabilir (normal)
- Veya 404/405 hatası (normal, çünkü bu sadece base URL)

---

### 2. ✅ tRPC Public Endpoint (Önerilen)

**URL:**
```
https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc/example.hi
```

**Beklenen Yanıt:**
```json
{
  "result": {
    "data": {
      "message": "Hello from Supabase Edge Functions!"
    }
  }
}
```

**Açıklama:**
- `example.hi` → PublicProcedure (auth gerekmez)
- GET veya POST request çalışır

---

### 3. ✅ Post Listesi (Public)

**URL:**
```
https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc/post.getPosts
```

**Method:** POST

**Body (JSON):**
```json
{
  "json": {
    "limit": 10,
    "offset": 0
  }
}
```

**Beklenen Yanıt:**
```json
{
  "result": {
    "data": {
      "posts": [...],
      "total": 0
    }
  }
}
```

---

## 🧪 TARAYICI İLE TEST

### Yöntem 1: Direkt URL (GET)

**Tarayıcıda açın:**
```
https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc/example.hi
```

**Beklenen:**
- JSON yanıt görmelisiniz
- Veya CORS hatası (normal, tarayıcıdan POST gerekiyor)

---

### Yöntem 2: cURL (Terminal)

**Test 1 - Example Hi:**
```bash
curl https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc/example.hi
```

**Test 2 - Get Posts (POST):**
```bash
curl -X POST https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc/post.getPosts \
  -H "Content-Type: application/json" \
  -d '{"json":{"limit":10,"offset":0}}'
```

---

### Yöntem 3: Postman / Insomnia

**Request:**
- Method: POST
- URL: `https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc/example.hi`
- Headers:
  ```
  Content-Type: application/json
  ```
- Body: (boş veya `{}`)

---

## 🔍 SUPABASE DASHBOARD'DA TEST

1. **Supabase Dashboard'a gidin:**
   - https://supabase.com/dashboard/project/xcvcplwimicylaxghiak

2. **Edge Functions > trpc > Logs:**
   - Request log'larını görüntüleyin
   - Hata varsa burada görürsünüz

3. **Test Endpoint:**
   - Dashboard'da "Invoke" butonuna tıklayın
   - Test edebilirsiniz

---

## ✅ BAŞARILI TEST İŞARETLERİ

### ✅ Çalışıyorsa:
- JSON yanıt alırsınız
- `{"result":{"data":{...}}}` formatında
- Hata yok

### ❌ Çalışmıyorsa:
- `404 Not Found` → Path yanlış
- `401 Unauthorized` → Auth gerekli (normal, protectedProcedure için)
- `500 Internal Server Error` → Edge Function'da hata var
- CORS hatası → Normal (tarayıcıdan POST gerekiyor)

---

## 🎯 ÖNERİLEN TEST SIRASI

1. **İlk Test (En Kolay):**
   ```
   https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc/example.hi
   ```
   - PublicProcedure
   - Auth gerekmez
   - En basit test

2. **İkinci Test:**
   ```
   POST: /api/trpc/post.getPosts
   Body: {"json":{"limit":10,"offset":0}}
   ```
   - PublicProcedure
   - Auth gerekmez
   - Gerçek data döner

3. **Üçüncü Test (Auth Gerekir):**
   ```
   POST: /api/trpc/user.updateProfile
   Headers: Authorization: Bearer <token>
   ```
   - ProtectedProcedure
   - Auth gerekir
   - Token olmadan 401 hatası normal

---

## 📋 HIZLI TEST KOMUTU

**PowerShell'de:**
```powershell
Invoke-WebRequest -Uri "https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc/example.hi" -Method GET
```

**Veya:**
```powershell
curl https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc/example.hi
```

---

## ✅ SONUÇ

**Evet, bu URL'yi sorgulayabilirsiniz!**

**Önerilen test URL:**
```
https://xcvcplwimicylaxghiak.supabase.co/functions/v1/trpc/api/trpc/example.hi
```

Bu URL'yi tarayıcıda açın veya cURL ile test edin! 🚀

