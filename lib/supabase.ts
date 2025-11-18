import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables eksik!');
  console.log('URL:', supabaseUrl || 'YOK');
  console.log('Key:', supabaseAnonKey ? `***${supabaseAnonKey.slice(-4)}` : 'YOK');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
});
