# 📚 MyTrabzon - Tam Proje Dökümantasyonu

## 🎯 Proje Özeti

**MyTrabzon**, Trabzon halkı için geliştirilmiş, ilçe bazlı sosyal medya ve topluluk platformudur.

### Temel Özellikler
✅ Google OAuth kimlik doğrulama
✅ İlçe bazlı kullanıcı profilleri
✅ Foto/video paylaşımı (Instagram benzeri feed)
✅ Gerçek zamanlı sohbet sistemi
✅ Bildirim sistemi
✅ Admin paneli
🔜 LazGPT (AI asistan)
🔜 Stripe ödemeler
🔜 Canlı yayın (Agora)

---

## 📁 Proje Yapısı

```
mytrabzon/
├── 📱 app/                          # Expo Router (Sayfalar)
│   ├── 🏠 (tabs)/                   # Tab Navigation
│   │   ├── feed.tsx                 # Ana akış
│   │   ├── chat.tsx                 # Sohbet listesi
│   │   ├── notifications.tsx        # Bildirimler
│   │   ├── profile.tsx              # Kullanıcı profili
│   │   └── _layout.tsx              # Tab layout & auth check
│   │
│   ├── 🔐 auth/                     # Kimlik Doğrulama
│   │   ├── login.tsx                # Google OAuth giriş
│   │   └── onboarding.tsx           # Profil oluşturma
│   │
│   ├── 👨‍💼 admin/                     # Admin Paneli
│   │   ├── login.tsx                # Admin giriş
│   │   └── dashboard.tsx            # Admin kontrol paneli
│   │
│   ├── 📄 post/                     # Gönderi Detayları
│   │   └── [id].tsx                 # Tek gönderi sayfası
│   │
│   ├── 💬 chat/                     # Sohbet
│   │   └── [roomId].tsx             # Sohbet odası
│   │
│   ├── 👤 profile/                  # Profil
│   │   └── [id].tsx                 # Kullanıcı profil sayfası
│   │
│   ├── _layout.tsx                  # Root layout (provider'lar)
│   ├── index.tsx                    # Giriş noktası (redirect)
│   └── +not-found.tsx               # 404 sayfası
│
├── 🔧 backend/                      # Backend (Hono + tRPC)
│   ├── trpc/                        # tRPC Routes
│   │   ├── app-router.ts            # Ana router
│   │   ├── create-context.ts        # tRPC context
│   │   └── routes/                  # API endpoints
│   │       └── example/hi/route.ts  # Örnek endpoint
│   │
│   └── hono.ts                      # Hono server
│
├── 🎨 constants/                    # Sabitler
│   ├── colors.ts                    # Renk paleti (DEPRECATED)
│   ├── theme.ts                     # Tema sabitleri
│   ├── districts.ts                 # İlçeler ve rozetler
│   └── supabase-schema.sql          # Database şeması
│
├── 🧩 contexts/                     # React Context
│   └── AuthContext.tsx              # Auth state management
│
├── 🛠️ lib/                          # Utility Fonksiyonlar
│   ├── supabase.ts                  # Supabase client
│   └── trpc.ts                      # tRPC client
│
├── 📦 types/                        # TypeScript Types
│   └── database.ts                  # Database type definitions
│
├── 📚 Documentation
│   ├── SETUP.md                     # Kurulum rehberi
│   ├── ENV_GUIDE.md                 # Environment variables
│   ├── DATABASE_GUIDE.md            # Database şeması
│   └── PROJECT_GUIDE.md             # Bu dosya
│
├── ⚙️ Configuration
│   ├── .env.example                 # Örnek env dosyası
│   ├── app.json                     # Expo config
│   ├── tsconfig.json                # TypeScript config
│   ├── package.json                 # Dependencies
│   └── eslint.config.js             # Linting rules
│
└── 🖼️ assets/                       # Statik dosyalar
    └── images/                      # App icons, splash
```

---

## 🔄 Uygulama Akışı

### 1. Uygulama Başlatma

```
app/index.tsx
    ↓
AuthContext kontrolü
    ├─ Kullanıcı var → /(tabs)/feed
    └─ Kullanıcı yok → /auth/login
```

### 2. Kimlik Doğrulama Akışı

```
/auth/login
    ↓
Google OAuth
    ↓
Supabase Auth
    ↓
Profil var mı?
    ├─ EVET → /(tabs)/feed
    └─ HAYIR → /auth/onboarding
                    ↓
                İlçe seç + Bilgi gir
                    ↓
                user_profiles INSERT
                    ↓
                /(tabs)/feed
```

### 3. Ana Uygulama Akışı

```
/(tabs)
    ├── feed           (Ana akış)
    │   ├─ İlçe filtrele
    │   ├─ Gönderileri göster
    │   ├─ Beğen/Yorum yap
    │   └─ Yeni gönderi oluştur
    │
    ├── chat           (Sohbet)
    │   ├─ Odaları listele
    │   ├─ Oda seç
    │   └─ Mesajlaş
    │
    ├── notifications  (Bildirimler)
    │   ├─ Bildirimleri göster
    │   └─ Okundu işaretle
    │
    └── profile        (Profil)
        ├─ Bilgileri göster
        ├─ İstatistikler
        └─ Çıkış yap
```

### 4. Admin Paneli Akışı

```
/admin/login
    ↓
Email + Şifre
    ↓
admin_users tablosu kontrolü
    ↓
Bcrypt şifre karşılaştırma
    ↓
/admin/dashboard
    ├─ İstatistikleri görüntüle
    ├─ Bildirim gönder (Genel/İlçe)
    └─ Kullanıcı yönetimi
```

---

## 🗄️ Veritabanı İlişkileri

```
┌─────────────────┐
│  auth.users     │ (Supabase Auth)
└────────┬────────┘
         │
         │ 1:1
         ↓
┌─────────────────┐
│ user_profiles   │
└────────┬────────┘
         │
         │ 1:N
         ├──────────────┐
         ↓              ↓
┌─────────────┐  ┌──────────────┐
│   posts     │  │ chat_members │
└──────┬──────┘  └──────┬───────┘
       │                │
       │ 1:N            │ N:M
       ├────────┐       ↓
       ↓        ↓  ┌─────────────┐
┌──────────┐ ┌────────┐│chat_rooms│
│post_likes│ │comments││          │
└──────────┘ └────────┘└────┬─────┘
                            │
                            │ 1:N
                            ↓
                       ┌─────────┐
                       │messages │
                       └─────────┘
```

---

## 🎨 Tasarım Sistemi

### Renk Paleti
```typescript
const COLORS = {
  primary: '#001F3F',      // Lacivert (Karadeniz)
  secondary: '#00A676',    // Zümrüt yeşili (Doğa)
  white: '#FFFFFF',        // Beyaz
  background: '#F8F9FA',   // Açık gri
  text: '#2C3E50',         // Koyu gri
  textLight: '#7F8C8D',    // Açık gri
  border: '#E1E8ED',       // Border
  error: '#E74C3C',        // Kırmızı
  success: '#00A676',      // Yeşil
  warning: '#F39C12',      // Turuncu
};
```

### Spacing Sistemi
```typescript
const SPACING = {
  xs: 4,    // Çok küçük boşluklar
  sm: 8,    // Küçük boşluklar
  md: 16,   // Orta boşluklar (standart)
  lg: 24,   // Büyük boşluklar
  xl: 32,   // Çok büyük boşluklar
  xxl: 48,  // Mega boşluklar
};
```

### Font Boyutları
```typescript
const FONT_SIZES = {
  xs: 12,   // Çok küçük metinler
  sm: 14,   // Küçük metinler
  md: 16,   // Normal metinler (body)
  lg: 18,   // Büyükçe metinler
  xl: 24,   // Başlıklar
  xxl: 32,  // Büyük başlıklar
};
```

### İlçe Rozetleri
```typescript
const DISTRICT_BADGES = {
  'Ortahisar': '🏛️',
  'Akçaabat': '🥙',
  'Araklı': '🏔️',
  'Arsin': '🌊',
  'Beşikdüzü': '⛰️',
  'Çarşıbaşı': '🏞️',
  'Çaykara': '☕',
  'Dernekpazarı': '🌲',
  'Düzköy': '🌾',
  'Hayrat': '🎣',
  'Köprübaşı': '🌉',
  'Maçka': '🏞️',
  'Of': '🌿',
  'Sürmene': '⚓',
  'Şalpazarı': '🌳',
  'Tonya': '🥜',
  'Vakfıkebir': '🎋',
  'Yomra': '🏖️',
};
```

---

## 🔐 Güvenlik Katmanları

### 1. Supabase Row Level Security (RLS)
```sql
-- Örnek: Kullanıcı sadece kendi profilini düzenleyebilir
CREATE POLICY "Users can update own profile" 
  ON user_profiles FOR UPDATE 
  USING (auth.uid() = id);
```

### 2. tRPC Middleware
```typescript
// Protected procedure: Sadece giriş yapmış kullanıcılar
export const protectedProcedure = publicProcedure.use(
  async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }
);
```

### 3. Frontend Auth Guard
```typescript
// Tab layout: Giriş yapmamış kullanıcıları login'e yönlendir
useEffect(() => {
  if (!loading && !profile) {
    router.replace('/auth/login');
  }
}, [loading, profile, router]);
```

### 4. Admin Auth
```typescript
// Admin paneli: Email + bcrypt hashed password
const isValidPassword = await bcrypt.compare(
  password, 
  admin.password_hash
);
```

---

## 📡 API Yapısı (tRPC)

### Backend Routes
```
/api/trpc/
    ├── example.hi           # GET  - Test endpoint
    ├── posts.list           # GET  - Gönderileri listele
    ├── posts.create         # POST - Yeni gönderi
    ├── posts.like           # POST - Gönderiyi beğen
    ├── posts.unlike         # POST - Beğeniyi kaldır
    ├── comments.create      # POST - Yorum ekle
    ├── notifications.list   # GET  - Bildirimleri getir
    ├── notifications.create # POST - Bildirim oluştur (admin)
    └── admin.sendNotif      # POST - Toplu bildirim gönder
```

### Frontend Kullanımı

#### React Component'te
```typescript
import { trpc } from '@/lib/trpc';

function FeedScreen() {
  // Query
  const { data: posts } = trpc.posts.list.useQuery({
    district: 'Ortahisar',
  });
  
  // Mutation
  const likeMutation = trpc.posts.like.useMutation({
    onSuccess: () => {
      // Refresh posts
    },
  });
  
  return (
    <View>
      {posts?.map(post => (
        <Post 
          key={post.id} 
          data={post}
          onLike={() => likeMutation.mutate({ postId: post.id })}
        />
      ))}
    </View>
  );
}
```

#### Non-React Dosyalarda
```typescript
import { trpcClient } from '@/lib/trpc';

async function doSomething() {
  const posts = await trpcClient.posts.list.query({
    district: 'Ortahisar',
  });
  
  console.log('Posts:', posts);
}
```

---

## 🔄 State Management Stratejisi

### 1. React Query (Server State)
```typescript
// Sunucudan gelen veriler için
const { data, isLoading, refetch } = useQuery({
  queryKey: ['posts', district],
  queryFn: async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('district', district);
    return data;
  },
});
```

### 2. Context API (Global Client State)
```typescript
// Auth state için
const [AuthContext, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  return { session, profile, signOut };
});
```

### 3. useState (Local Component State)
```typescript
// Component içi state için
const [selectedDistrict, setSelectedDistrict] = useState<District>('Ortahisar');
const [searchQuery, setSearchQuery] = useState('');
```

### 4. AsyncStorage (Persistent State)
```typescript
// Kalıcı veri için (theme, settings, etc.)
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('theme', 'dark');
const theme = await AsyncStorage.getItem('theme');
```

---

## 🚀 Performance Optimization

### 1. Memoization
```typescript
// Pahalı hesaplamalar için
const filteredPosts = useMemo(() => {
  return posts.filter(post => post.district === selectedDistrict);
}, [posts, selectedDistrict]);

// Callback fonksiyonlar için
const handleLike = useCallback((postId: string) => {
  likeMutation.mutate({ postId });
}, [likeMutation]);
```

### 2. React.memo
```typescript
// Component re-render'larını önlemek için
const PostCard = React.memo<PostCardProps>(({ post, onLike }) => {
  return <View>...</View>;
});
```

### 3. FlatList Optimization
```typescript
<FlatList
  data={posts}
  renderItem={renderPost}
  keyExtractor={(item) => item.id}
  // Performance optimizations
  removeClippedSubviews
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  windowSize={10}
  // Memoized render functions
  ListHeaderComponent={useMemo(() => <Header />, [])}
/>
```

### 4. Image Optimization
```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: post.media_url }}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// utils.test.ts
describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2024-01-01');
    expect(formatDate(date)).toBe('1 Ocak 2024');
  });
});
```

### Integration Tests
```typescript
// auth.test.ts
describe('Authentication', () => {
  it('logs in user successfully', async () => {
    const { session } = await signIn('test@example.com');
    expect(session).toBeDefined();
  });
});
```

### E2E Tests (Detox)
```typescript
// feed.e2e.ts
describe('Feed', () => {
  it('should display posts', async () => {
    await element(by.id('feed-screen')).tap();
    await expect(element(by.id('post-list'))).toBeVisible();
  });
});
```

---

## 📦 Deployment

### 1. Supabase (Database & Auth)
```bash
# Already hosted on Supabase cloud
# No additional deployment needed
```

### 2. Backend (Expo Backend)
```bash
# Backend automatically deployed with Expo
# Hosted on Expo infrastructure
```

### 3. Mobile App (EAS)
```bash
# Build
eas build --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### 4. Web (Vercel/Netlify)
```bash
# Build web version
bun run build:web

# Deploy to Vercel
vercel deploy --prod
```

---

## 🔍 Debugging

### 1. Console Logs
```typescript
console.log('[Feed] Loading posts for district:', district);
console.error('[Auth] Login failed:', error);
```

### 2. Supabase Dashboard
- **Logs**: Database queries ve errors
- **Auth**: User sessions ve OAuth events
- **Storage**: File uploads ve downloads

### 3. React Query Devtools
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools />
</QueryClientProvider>
```

### 4. Expo Dev Tools
```bash
# Open dev tools
bun start
# Press 'j' to open debugger
```

---

## 📊 Monitoring & Analytics

### Gelecek Entegrasyonlar
- **Sentry**: Error tracking
- **Firebase Analytics**: User behavior
- **Mixpanel**: Event tracking
- **LogRocket**: Session replay

---

## 🆘 Yaygın Sorunlar ve Çözümleri

### 1. "Module not found: @/..."
```bash
# TypeScript paths çalışmıyorsa
# tsconfig.json kontrol et
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}

# Server'ı yeniden başlat
bun start --clear
```

### 2. Supabase bağlanamıyor
```typescript
// .env dosyasını kontrol et
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...

// EXPO_PUBLIC_ prefix gerekli!
```

### 3. Google OAuth çalışmıyor
```
1. Google Cloud Console > Redirect URIs kontrol et
2. Supabase > Auth > Providers > Google aktif mi?
3. Client ID ve Secret doğru mu?
```

### 4. Admin girişi çalışmıyor
```sql
-- SQL schema çalıştı mı kontrol et
SELECT * FROM admin_users;

-- Bcrypt hash doğru mu?
-- Web'de test et (bcrypt.js)
```

---

## 📞 İletişim ve Destek

### Teknik Destek
- **Email**: sonertoprak@litxtech.com
- **GitHub Issues**: [mytrabzon/issues](https://github.com/...)

### Dökümantasyon
- **Setup**: `SETUP.md`
- **Database**: `DATABASE_GUIDE.md`
- **Environment**: `ENV_GUIDE.md`
- **Project**: `PROJECT_GUIDE.md` (bu dosya)

---

## 🎯 Roadmap

### Faz 1: MVP (✅ Tamamlandı)
- ✅ Authentication (Google OAuth)
- ✅ User profiles with districts
- ✅ Post feed (Instagram-like)
- ✅ Basic chat system
- ✅ Notifications
- ✅ Admin panel

### Faz 2: Temel Özellikler (🔜 Yakında)
- 🔜 LazGPT (DeepSeek AI integration)
- 🔜 Image/video upload to Supabase Storage
- 🔜 Real-time chat (Supabase Realtime)
- 🔜 Push notifications (Firebase/OneSignal)
- 🔜 User verification (Selfie)

### Faz 3: Gelişmiş Özellikler (🔮 Gelecek)
- 🔮 Stripe payments (donations, premium)
- 🔮 Live streaming (Agora)
- 🔮 Map integration (location-based)
- 🔮 MyTrabzon Marketplace
- 🔮 Help board (blood donation, lost items)
- 🔮 Event calendar

### Faz 4: Ölçeklendirme (🚀 İleri)
- 🚀 Multi-city expansion (MyRize, MySamsun)
- 🚀 Advanced AI features
- 🚀 Business profiles
- 🚀 Advertising platform

---

🏔️ **MyTrabzon** - Trabzon'un Dijital Sesi

Made with ❤️ for Trabzon by the community
