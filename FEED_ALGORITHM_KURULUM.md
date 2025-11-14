# 🚀 FEED ALGORITHM KURULUM REHBERİ

## Adım 1: Database Schema

Supabase SQL Editor'de şu dosyayı çalıştırın:
```sql
-- FEED_ALGORITHM_SCHEMA.sql
```

Bu script şunları yapar:
- ✅ `posts` tablosuna `post_type` ve `video_metadata` kolonları ekler
- ✅ `post_views` tablosunu oluşturur (Reels view tracking)
- ✅ `post_tags` tablosunu oluşturur (interest matching)
- ✅ `user_interests` tablosunu oluşturur (kullanıcı ilgi alanları)
- ✅ `follows` ve `post_saves` tablolarını oluşturur (eğer yoksa)
- ✅ View count ve save count trigger'larını ekler
- ✅ RLS policy'lerini ayarlar

---

## Adım 2: RPC Functions

Supabase SQL Editor'de şu dosyayı çalıştırın:
```sql
-- FEED_ALGORITHM_FUNCTIONS.sql
```

Bu script şunları yapar:
- ✅ `calculate_feed_score()` - Feed scoring fonksiyonu
- ✅ `get_personalized_feed()` - Kişiselleştirilmiş feed
- ✅ `calculate_reel_score()` - Reel scoring fonksiyonu
- ✅ `get_reels_feed()` - Reels feed

---

## Adım 3: Edge Function Deploy

Zaten deploy edildi ✅
```bash
supabase functions deploy trpc
```

---

## Adım 4: Test

1. **Feed Testi:**
   - Giriş yap
   - Feed sayfasına git
   - Takip ettiğin kullanıcıların post'ları görünmeli

2. **Reels Testi:**
   - Reels tab'ına git
   - Full-screen vertical scrolling çalışmalı
   - View tracking otomatik çalışmalı

---

## 📊 Algoritma Özellikleri

### Feed Scoring
- **Recency**: Yeni post'lar daha yüksek skor
- **Engagement**: Like, comment, save, view sayıları
- **Relationship**: Takip edilen kullanıcıların post'ları
- **Interest**: Tag-based matching

### Reel Scoring
- **Recency**: Daha uzun süreli decay
- **Engagement**: View count'a daha fazla ağırlık
- **Relationship**: Takip durumu
- **Quality**: Completion rate, like rate, share rate

---

## 🔧 Geliştirme Notları

- Algoritma basit başladı, zamanla geliştirilebilir
- Tag-based interest matching şu an basit
- Reels için video player entegrasyonu gerekli (expo-av)
- Infinite scroll için cursor-based pagination eklenebilir

---

## 📝 Önemli Notlar

1. **Post Type**: Yeni post oluştururken `post_type` belirtilmeli
   - `'image'` - Normal resim post'u
   - `'video'` - Video post'u
   - `'reel'` - Reel post'u

2. **Video Metadata**: Reel post'ları için `video_metadata` JSONB alanı doldurulmalı:
   ```json
   {
     "width": 1080,
     "height": 1920,
     "duration": 15.5,
     "video_url": "https://...",
     "thumbnail_url": "https://..."
   }
   ```

3. **View Tracking**: Reels için otomatik çalışıyor
   - `view_started_at`: Reel görüntülenmeye başladığında
   - `view_completed_at`: Reel tamamlandığında
   - `completion_rate`: İzlenme oranı (0-100)

---

## 🎯 Sonraki Adımlar

1. Video player entegrasyonu (expo-av)
2. Infinite scroll (cursor-based pagination)
3. ML-based recommendations
4. A/B testing için farklı scoring formülleri
5. Caching mekanizması

