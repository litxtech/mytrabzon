import { supabase } from './supabase';

export async function getSupabaseAccessToken(): Promise<string | null> {
  console.log('Fetching Supabase session for access token');
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Unable to retrieve Supabase session', error);
    throw new Error('Supabase oturumu alınamadı. Lütfen bağlantınızı kontrol edin.');
  }

  const accessToken = data.session?.access_token ?? null;

  if (!accessToken) {
    console.log('No Supabase access token found in session');
    return null;
  }

  // Production'da token'ı loglama (güvenlik)
  if (__DEV__) {
    console.log('Supabase access token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'null');
  }
  return accessToken;
}
