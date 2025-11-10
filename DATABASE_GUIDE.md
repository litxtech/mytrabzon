# 🗄️ Supabase Veritabanı Şeması Rehberi

Bu döküman, MyTrabzon uygulamasının Supabase veritabanı yapısını detaylı şekilde açıklar.

## 📊 Database Şeması Genel Bakış

```
mytrabzon_db
├── user_profiles       # Kullanıcı profilleri
├── posts               # Gönderiler (foto/video paylaşımları)
├── post_likes          # Gönderi beğenileri
├── comments            # Gönderi yorumları
├── chat_rooms          # Sohbet odaları
├── chat_members        # Sohbet odası üyeleri
├── messages            # Sohbet mesajları
├── notifications       # Bildirimler
└── admin_users         # Admin kullanıcıları
```

---

## 📋 Tablolar

### 1. `user_profiles` - Kullanıcı Profilleri

Kayıtlı kullanıcıların profil bilgilerini saklar.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  district district_type NOT NULL,
  show_address BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Kolonlar
- **id**: Kullanıcı ID (Supabase Auth user ID'si ile bağlantılı)
- **email**: E-posta adresi (unique)
- **full_name**: İsim soyisim
- **avatar_url**: Profil fotoğrafı URL'i (Supabase Storage'dan)
- **bio**: Kullanıcı hakkında kısa açıklama
- **district**: Kullanıcının ilçesi (18 Trabzon ilçesinden biri)
- **show_address**: Adres gösterilsin mi? (gizlilik seçeneği)
- **verified**: Selfie doğrulaması yapıldı mı?
- **created_at**: Kayıt tarihi
- **updated_at**: Son güncelleme tarihi

#### Örnek Veri
```sql
INSERT INTO user_profiles VALUES (
  'uuid-here',
  'ahmet@example.com',
  'Ahmet Yılmaz',
  'https://...avatars/user1.jpg',
  'Trabzon sevdalısı',
  'Ortahisar',
  true,
  false,
  NOW(),
  NOW()
);
```

---

### 2. `posts` - Gönderiler

Kullanıcıların paylaştığı foto/video gönderilerini saklar.

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  district district_type NOT NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Kolonlar
- **id**: Gönderi UUID
- **user_id**: Gönderen kullanıcı (foreign key)
- **content**: Gönderi metni
- **media_url**: Fotoğraf/video URL'i (Supabase Storage)
- **media_type**: 'image' veya 'video'
- **district**: Gönderinin ilçesi
- **likes_count**: Beğeni sayısı (trigger ile otomatik güncellenir)
- **comments_count**: Yorum sayısı (trigger ile otomatik güncellenir)
- **created_at**: Paylaşım tarihi

#### İndeksler
```sql
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_district ON posts(district);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
```

#### Örnek Veri
```sql
INSERT INTO posts VALUES (
  uuid_generate_v4(),
  'user-uuid',
  'Bugün Boztepe çok güzel! 🏔️',
  'https://...posts/photo1.jpg',
  'image',
  'Ortahisar',
  0,
  0,
  NOW()
);
```

---

### 3. `post_likes` - Gönderi Beğenileri

Kullanıcıların hangi gönderileri beğendiğini saklar.

```sql
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
```

#### Kolonlar
- **id**: Beğeni UUID
- **post_id**: Beğenilen gönderi
- **user_id**: Beğenen kullanıcı
- **created_at**: Beğeni tarihi

#### Unique Constraint
- Aynı kullanıcı aynı gönderiyi sadece 1 kez beğenebilir
- `UNIQUE(post_id, user_id)`

#### Trigger ile Sayaç Güncelleme
```sql
-- Beğeni eklendiğinde posts.likes_count artırılır
CREATE TRIGGER on_post_like_created 
  AFTER INSERT ON post_likes
  FOR EACH ROW 
  EXECUTE FUNCTION increment_post_likes();

-- Beğeni silindiğinde posts.likes_count azaltılır
CREATE TRIGGER on_post_like_deleted 
  AFTER DELETE ON post_likes
  FOR EACH ROW 
  EXECUTE FUNCTION decrement_post_likes();
```

---

### 4. `comments` - Yorumlar

Gönderilere yapılan yorumları saklar.

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Kolonlar
- **id**: Yorum UUID
- **post_id**: Yorum yapılan gönderi
- **user_id**: Yorum yapan kullanıcı
- **content**: Yorum metni
- **created_at**: Yorum tarihi

#### Trigger ile Sayaç Güncelleme
```sql
-- Yorum eklendiğinde posts.comments_count artırılır
CREATE TRIGGER on_comment_created 
  AFTER INSERT ON comments
  FOR EACH ROW 
  EXECUTE FUNCTION increment_post_comments();

-- Yorum silindiğinde posts.comments_count azaltılır
CREATE TRIGGER on_comment_deleted 
  AFTER DELETE ON comments
  FOR EACH ROW 
  EXECUTE FUNCTION decrement_post_comments();
```

---

### 5. `chat_rooms` - Sohbet Odaları

Farklı türlerde sohbet odalarını saklar.

```sql
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'district')),
  district district_type,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Kolonlar
- **id**: Oda UUID
- **name**: Oda adı (opsiyonel, özellikle gruplar için)
- **type**: Oda tipi
  - `direct`: Birebir sohbet
  - `group`: Grup sohbeti
  - `district`: İlçe bazlı genel sohbet
- **district**: İlçe (sadece type='district' için)
- **created_at**: Oluşturulma tarihi

#### Örnek Veriler
```sql
-- İlçe sohbet odası
INSERT INTO chat_rooms VALUES (
  uuid_generate_v4(),
  'Ortahisar Genel',
  'district',
  'Ortahisar',
  NOW()
);

-- Grup sohbeti
INSERT INTO chat_rooms VALUES (
  uuid_generate_v4(),
  'Trabzonspor Taraftarları',
  'group',
  NULL,
  NOW()
);

-- Birebir sohbet (name NULL)
INSERT INTO chat_rooms VALUES (
  uuid_generate_v4(),
  NULL,
  'direct',
  NULL,
  NOW()
);
```

---

### 6. `chat_members` - Sohbet Üyeleri

Hangi kullanıcıların hangi odalarda olduğunu saklar.

```sql
CREATE TABLE chat_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);
```

#### Kolonlar
- **id**: Üyelik UUID
- **room_id**: Sohbet odası
- **user_id**: Üye kullanıcı
- **joined_at**: Katılma tarihi

#### Unique Constraint
- Aynı kullanıcı aynı odaya sadece 1 kez katılabilir

---

### 7. `messages` - Mesajlar

Sohbet odalarındaki mesajları saklar.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Kolonlar
- **id**: Mesaj UUID
- **room_id**: Mesajın gönderildiği oda
- **user_id**: Mesajı gönderen kullanıcı
- **content**: Mesaj içeriği
- **created_at**: Gönderim tarihi

#### İndeksler
```sql
CREATE INDEX idx_messages_room_id ON messages(room_id);
```

---

### 8. `notifications` - Bildirimler

Sistem ve admin bildirimlerini saklar.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  district district_type,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('general', 'district', 'emergency')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read BOOLEAN DEFAULT false
);
```

#### Kolonlar
- **id**: Bildirim UUID
- **user_id**: Hedef kullanıcı (NULL = tüm kullanıcılar)
- **district**: Hedef ilçe (NULL = tüm ilçeler)
- **title**: Bildirim başlığı
- **message**: Bildirim mesajı
- **type**: Bildirim tipi
  - `general`: Genel duyuru
  - `district`: İlçe bazlı duyuru
  - `emergency`: Acil durum/afet
- **created_at**: Oluşturulma tarihi
- **read**: Okundu mu?

#### Kullanım Senaryoları
```sql
-- Tüm kullanıcılara bildirim
INSERT INTO notifications (title, message, type) VALUES (
  'Yeni Özellik!',
  'Artık canlı yayın yapabilirsiniz!',
  'general'
);

-- Belirli ilçeye bildirim
INSERT INTO notifications (district, title, message, type) VALUES (
  'Akçaabat',
  'Köfte Festivali',
  'Bu hafta sonu Akçaabat Köfte Festivali!',
  'district'
);

-- Acil durum bildirimi
INSERT INTO notifications (district, title, message, type) VALUES (
  'Araklı',
  '⚠️ Acil Durum',
  'Sel riski nedeniyle dikkatli olun!',
  'emergency'
);
```

---

### 9. `admin_users` - Admin Kullanıcıları

Yönetici paneline erişimi olan kullanıcıları saklar.

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Kolonlar
- **id**: Admin UUID
- **email**: Admin e-posta (unique)
- **password_hash**: Bcrypt ile hashlenmiş şifre
- **created_at**: Oluşturulma tarihi

#### Varsayılan Admin
```sql
-- Email: sonertoprak@litxtech.com
-- Şifre: admin123
INSERT INTO admin_users (email, password_hash) VALUES (
  'sonertoprak@litxtech.com',
  '$2a$10$rSCRMd7Nwfr7Jn5gKQf.MOE3Y8BhGmOjZx5jdN5JQmN4Z8.L5zt.m'
);
```

⚠️ **ÖNEMLİ**: Production'da bu şifreyi mutlaka değiştirin!

---

## 🔐 Row Level Security (RLS)

Supabase RLS ile veri güvenliği sağlanır.

### User Profiles Policies

```sql
-- Herkes profilleri görebilir
CREATE POLICY "Public profiles are viewable by everyone" 
  ON user_profiles FOR SELECT 
  USING (true);

-- Kullanıcı sadece kendi profilini güncelleyebilir
CREATE POLICY "Users can update own profile" 
  ON user_profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Kullanıcı kendi profilini oluşturabilir
CREATE POLICY "Users can insert own profile" 
  ON user_profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);
```

### Posts Policies

```sql
-- Herkes gönderileri görebilir
CREATE POLICY "Posts are viewable by everyone" 
  ON posts FOR SELECT 
  USING (true);

-- Kullanıcı gönderi oluşturabilir
CREATE POLICY "Users can create posts" 
  ON posts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Kullanıcı sadece kendi gönderilerini düzenleyebilir
CREATE POLICY "Users can update own posts" 
  ON posts FOR UPDATE 
  USING (auth.uid() = user_id);

-- Kullanıcı sadece kendi gönderilerini silebilir
CREATE POLICY "Users can delete own posts" 
  ON posts FOR DELETE 
  USING (auth.uid() = user_id);
```

### Chat Policies

```sql
-- Kullanıcı sadece üyesi olduğu odaları görebilir
CREATE POLICY "Users can view their chat rooms" 
  ON chat_rooms FOR SELECT 
  USING (
    id IN (
      SELECT room_id 
      FROM chat_members 
      WHERE user_id = auth.uid()
    )
  );

-- Kullanıcı sadece üyesi olduğu odalardaki mesajları görebilir
CREATE POLICY "Users can view messages in their rooms" 
  ON messages FOR SELECT 
  USING (
    room_id IN (
      SELECT room_id 
      FROM chat_members 
      WHERE user_id = auth.uid()
    )
  );

-- Kullanıcı sadece üyesi olduğu odalara mesaj gönderebilir
CREATE POLICY "Users can create messages in their rooms" 
  ON messages FOR INSERT 
  WITH CHECK (
    room_id IN (
      SELECT room_id 
      FROM chat_members 
      WHERE user_id = auth.uid()
    )
  );
```

### Notifications Policies

```sql
-- Kullanıcı kendi bildirimlerini görebilir
CREATE POLICY "Users can view their notifications" 
  ON notifications FOR SELECT 
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Kullanıcı bildirimlerini okundu olarak işaretleyebilir
CREATE POLICY "Users can update their notifications" 
  ON notifications FOR UPDATE 
  USING (user_id = auth.uid());
```

---

## 🎭 Custom Types (Enum)

### `district_type` - İlçe Türü

```sql
CREATE TYPE district_type AS ENUM (
  'Ortahisar', 'Akçaabat', 'Araklı', 'Arsin', 'Beşikdüzü', 
  'Çarşıbaşı', 'Çaykara', 'Dernekpazarı', 'Düzköy', 'Hayrat', 
  'Köprübaşı', 'Maçka', 'Of', 'Sürmene', 'Şalpazarı', 
  'Tonya', 'Vakfıkebir', 'Yomra'
);
```

Trabzon'un 18 ilçesini temsil eder. Bu enum kullanılarak:
- Veri bütünlüğü sağlanır
- Sadece geçerli ilçeler kullanılabilir
- TypeScript tipleri ile senkronize edilir

---

## 🔄 Triggers ve Functions

### Like Counter Functions

```sql
-- Beğeni sayısını artır
CREATE OR REPLACE FUNCTION increment_post_likes() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET likes_count = likes_count + 1 
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Beğeni sayısını azalt
CREATE OR REPLACE FUNCTION decrement_post_likes() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET likes_count = likes_count - 1 
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

### Comment Counter Functions

```sql
-- Yorum sayısını artır
CREATE OR REPLACE FUNCTION increment_post_comments() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET comments_count = comments_count + 1 
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Yorum sayısını azalt
CREATE OR REPLACE FUNCTION decrement_post_comments() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET comments_count = comments_count - 1 
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

---

## 📝 Örnek Sorgular

### Kullanıcının Gönderilerini Getir
```sql
SELECT 
  p.*,
  up.full_name,
  up.avatar_url,
  up.district
FROM posts p
JOIN user_profiles up ON p.user_id = up.id
WHERE p.user_id = 'user-uuid'
ORDER BY p.created_at DESC;
```

### İlçe Bazlı Feed
```sql
SELECT 
  p.*,
  up.full_name,
  up.avatar_url
FROM posts p
JOIN user_profiles up ON p.user_id = up.id
WHERE p.district = 'Ortahisar'
ORDER BY p.created_at DESC
LIMIT 20;
```

### Popüler Gönderiler
```sql
SELECT 
  p.*,
  up.full_name,
  (p.likes_count + p.comments_count * 2) as engagement_score
FROM posts p
JOIN user_profiles up ON p.user_id = up.id
ORDER BY engagement_score DESC
LIMIT 10;
```

### Kullanıcının Okunmamış Bildirimleri
```sql
SELECT *
FROM notifications
WHERE (user_id = 'user-uuid' OR user_id IS NULL)
  AND read = false
ORDER BY created_at DESC;
```

---

## 🔧 Bakım ve İzleme

### Veritabanı Boyutu
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Aktif Kullanıcı Sayısı
```sql
SELECT COUNT(*) as total_users FROM user_profiles;
SELECT COUNT(*) as verified_users FROM user_profiles WHERE verified = true;
```

### Günlük İstatistikler
```sql
-- Bugün paylaşılan gönderiler
SELECT COUNT(*) FROM posts 
WHERE created_at >= CURRENT_DATE;

-- Bugün oluşturulan yorumlar
SELECT COUNT(*) FROM comments 
WHERE created_at >= CURRENT_DATE;

-- Bugün gönderilen mesajlar
SELECT COUNT(*) FROM messages 
WHERE created_at >= CURRENT_DATE;
```

---

## 📞 Destek

Veritabanı sorunları için:
1. Supabase Dashboard > Database > Logs kontrol edin
2. RLS policies'i kontrol edin
3. GitHub Issues açın

---

🗄️ **MyTrabzon Database** - Güvenli, ölçeklenebilir, optimize edilmiş
