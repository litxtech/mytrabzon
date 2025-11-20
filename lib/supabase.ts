import { createClient } from '@supabase/supabase-js';

// Environment variables'ı güvenli şekilde al
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

// Production build'de environment variables EAS Build tarafından sağlanır
// Eğer eksikse, fallback değerler kullan (crash'i önlemek için)
const finalSupabaseUrl = supabaseUrl || 'https://xcvcplwimicylaxghiak.supabase.co';
const finalSupabaseAnonKey = supabaseAnonKey || 'sb_publishable_jTpEPRL2oeGnsBcZSyoxPA_G2cG4ZM7';

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
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
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

