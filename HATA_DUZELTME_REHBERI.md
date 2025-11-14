# 🔧 Hata Düzeltme Rehberi

## ❌ Tespit Edilen Sorunlar

1. **Tablo İsimleri Uyumsuzluğu**
   - SQL'de: `user_profiles`
   - Kodda: `profiles` kullanılıyor
   - **Çözüm:** SQL'de `user_profiles` → `profiles` olarak rename edildi

2. **Post Tablosu Kolon Uyumsuzluğu**
   - SQL'de: `user_id`
   - Kodda: `author_id` kullanılıyor
   - **Çözüm:** SQL'de `user_id` → `author_id` olarak rename edildi

3. **RLS Policy Eksiklikleri**
   - Profil oluşturma/update için policy'ler eksikti
   - Post oluşturma için policy'ler yanlış kolon adı kullanıyordu
   - **Çözüm:** Tüm RLS policy'ler düzeltildi

4. **Kod Tarafı Düzeltmeleri**
   - `user_profiles` → `profiles` olarak değiştirildi
   - Tüm backend route'lar güncellendi

## ✅ Yapılan Düzeltmeler

### 1. SQL Düzeltmeleri (`FIX_TABLE_NAMES_AND_RLS.sql`)
- ✅ `user_profiles` → `profiles` rename
- ✅ `posts.user_id` → `posts.author_id` rename
- ✅ Foreign key'ler düzeltildi
- ✅ RLS policy'ler yeniden oluşturuldu
- ✅ Trigger'lar düzeltildi
- ✅ Index'ler güncellendi

### 2. Kod Düzeltmeleri
- ✅ `backend/trpc/routes/user/update-profile/route.ts` - `profiles` kullanıyor
- ✅ `backend/trpc/routes/user/upload-avatar/route.ts` - `profiles` kullanıyor
- ✅ `backend/trpc/routes/user/request-deletion/route.ts` - `profiles` kullanıyor
- ✅ `backend/trpc/routes/user/cancel-deletion/route.ts` - `profiles` kullanıyor

## 🚀 Yapılması Gerekenler

### Adım 1: SQL'i Çalıştır
1. Supabase Dashboard'a git
2. SQL Editor'ü aç
3. `FIX_TABLE_NAMES_AND_RLS.sql` dosyasının içeriğini kopyala
4. SQL Editor'e yapıştır ve çalıştır

### Adım 2: Test Et
1. Yeni kullanıcı kaydı yap
2. Profil oluştur
3. Profil güncelle
4. Post paylaş

### Adım 3: Hata Kontrolü
Eğer hala sorun varsa:
- Browser console'da hataları kontrol et
- Supabase Dashboard > Logs'da SQL hatalarını kontrol et
- Network tab'da API isteklerini kontrol et

## 📋 Kontrol Listesi

- [ ] SQL dosyası Supabase'de çalıştırıldı
- [ ] Tablo isimleri doğru (`profiles`, `posts`)
- [ ] Post kolonu doğru (`author_id`)
- [ ] RLS policy'ler aktif
- [ ] Yeni kullanıcı kaydı çalışıyor
- [ ] Profil oluşturma çalışıyor
- [ ] Profil güncelleme çalışıyor
- [ ] Post paylaşımı çalışıyor

## 🔍 Sorun Devam Ederse

### Profil Oluşturulamıyorsa:
```sql
-- Kontrol et
SELECT * FROM profiles WHERE id = 'USER_ID_HERE';

-- RLS policy kontrolü
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Post Paylaşılamıyorsa:
```sql
-- Kontrol et
SELECT * FROM posts WHERE author_id = 'USER_ID_HERE';

-- RLS policy kontrolü
SELECT * FROM pg_policies WHERE tablename = 'posts';
```

### RLS Policy Kontrolü:
```sql
-- Tüm policy'leri listele
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'posts', 'post_likes', 'comments')
ORDER BY tablename, policyname;
```

## 📝 Notlar

- Tüm değişiklikler geri alınabilir (DROP IF EXISTS kullanıldı)
- Mevcut veriler korunur (sadece tablo/kolon isimleri değişti)
- RLS policy'ler güvenliği sağlar (kullanıcılar sadece kendi verilerini görebilir/düzenleyebilir)

## 🎯 Sonuç

Artık:
- ✅ Kullanıcı kaydı çalışmalı
- ✅ Profil oluşturma/güncelleme çalışmalı
- ✅ Post paylaşımı çalışmalı
- ✅ Tüm RLS policy'ler doğru

Sorun devam ederse, hata mesajlarını paylaş!

