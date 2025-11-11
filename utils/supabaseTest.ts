import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export type SupabaseConnectionTestResult = {
  auth: boolean;
  query: boolean;
  user: User | null;
  errors: {
    auth?: unknown;
    query?: unknown;
  };
};

export const testSupabaseConnection = async (): Promise<SupabaseConnectionTestResult> => {
  console.log('🔗 Supabase bağlantı testi...');

  const result: SupabaseConnectionTestResult = {
    auth: false,
    query: false,
    user: null,
    errors: {},
  };

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      result.errors.auth = authError;
      console.error('🔐 Auth hatası:', authError);
    } else {
      result.auth = true;
    }
    result.user = authData?.user ?? null;
    console.log('🔐 Auth durumu:', authData?.user ? 'Giriş yapılmış' : 'Giriş yapılmamış');
  } catch (authCatchError) {
    result.errors.auth = authCatchError;
    console.error('🔐 Auth yakalama hatası:', authCatchError);
  }

  try {
    const { error: queryError } = await supabase.from('chat_members').select('id').limit(1);
    if (queryError) {
      result.errors.query = queryError;
      console.error('📊 Sorgu hatası:', queryError);
    } else {
      result.query = true;
    }
    console.log('📊 Sorgu testi:', result.query ? 'BAŞARILI' : 'HATA');
  } catch (queryCatchError) {
    result.errors.query = queryCatchError;
    console.error('📊 Sorgu yakalama hatası:', queryCatchError);
  }

  try {
    const channel = supabase.channel(`connection-test-${Date.now()}`);
    console.log('📡 Realtime bağlantı testi yapılıyor...');
    await channel.subscribe();
    await channel.unsubscribe();
  } catch (realtimeError) {
    console.error('📡 Realtime bağlantı hatası:', realtimeError);
  }

  return result;
};
