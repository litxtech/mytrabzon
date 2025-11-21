import { createClient } from '@supabase/supabase-js';

// Environment variables'ı güvenli şekilde al
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

// Production build'de environment variables EAS Build tarafından sağlanır
// Eğer eksikse, fallback değerler kullan (crash'i önlemek için)
// NOT: Fallback değerler sadece development için - production'da mutlaka env vars kullanılmalı
const finalSupabaseUrl = supabaseUrl || (__DEV__ ? 'https://xcvcplwimicylaxghiak.supabase.co' : '');
const finalSupabaseAnonKey = supabaseAnonKey || (__DEV__ ? 'sb_publishable_jTpEPRL2oeGnsBcZSyoxPA_G2cG4ZM7' : '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables eksik! Fallback değerler kullanılıyor.');
  console.log('URL:', finalSupabaseUrl);
  console.log('Key (son 4 karakter):', `***${finalSupabaseAnonKey.slice(-4)}`);
  console.warn('⚠️ UYARI: Production build\'de environment variables EAS Build tarafından sağlanmalı!');
} else {
  if (__DEV__) {
    console.log('✅ Supabase bağlantı bilgileri yüklendi');
    console.log('URL:', finalSupabaseUrl);
    console.log('Key (son 4 karakter):', `***${finalSupabaseAnonKey.slice(-4)}`);
  }
}

export const supabase = createClient(finalSupabaseUrl, finalSupabaseAnonKey, {
  auth: {
    persistSession: true, // Session'ı kalıcı olarak sakla
    autoRefreshToken: true, // Token'ı otomatik yenile (süresiz session için)
    detectSessionInUrl: true,
    storage: undefined, // AsyncStorage kullan (default)
    storageKey: 'supabase.auth.token', // Storage key
    flowType: 'pkce', // PKCE flow (daha güvenli)
    // Session süresiz olacak - refresh token ile otomatik yenilenecek
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'x-client-info': 'mytrabzon-app',
    },
  },
});

// Bağlantıyı test et (sadece development'ta)
if (__DEV__) {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.warn('⚠️ Supabase session kontrolü hatası:', error.message);
    } else {
      console.log('✅ Supabase client başarıyla oluşturuldu');
    }
  }).catch((err) => {
    console.error('❌ Supabase bağlantı testi başarısız:', err);
  });
}

