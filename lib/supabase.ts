import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    storage: AsyncStorage,
    autoRefreshToken: true,   // token süresi dolunca otomatik yeniler
    persistSession: true,     // oturumu AsyncStorage'a yazar
    detectSessionInUrl: false // mobilde URL tabanlı OAuth yok
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

