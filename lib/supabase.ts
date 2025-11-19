import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables eksik!');
  console.log('URL:', supabaseUrl || 'YOK');
  console.log('Key:', supabaseAnonKey ? `***${supabaseAnonKey.slice(-4)}` : 'YOK');
  console.error('⚠️ UYARI: Supabase bağlantısı yapılamayacak! Lütfen .env dosyasını kontrol edin.');
} else {
  if (__DEV__) {
    console.log('✅ Supabase bağlantı bilgileri yüklendi');
    console.log('URL:', supabaseUrl);
    console.log('Key (son 4 karakter):', `***${supabaseAnonKey.slice(-4)}`);
  }
}

// Supabase client'ı sadece URL ve key varsa oluştur
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ CRITICAL: Supabase URL ve Key eksik!\n' +
    'Lütfen proje kök dizininde (C:\\Users\\ilkse\\OneDrive\\Masaüstü\\mytrabzon) .env dosyası oluşturun.\n' +
    'İçeriği:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=https://xcvcplwimicylaxghiak.supabase.co\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_jTpEPRL2oeGnsBcZSyoxPA_G2cG4ZM7'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

// Bağlantıyı test et
if (supabaseUrl && supabaseAnonKey) {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.warn('⚠️ Supabase session kontrolü hatası:', error.message);
    } else if (__DEV__) {
      console.log('✅ Supabase client başarıyla oluşturuldu');
    }
  }).catch((err) => {
    console.error('❌ Supabase bağlantı testi başarısız:', err);
  });
}
