/**
 * Supabase bağlantı durumunu kontrol etmek için debug yardımcıları
 * Bu dosyayı uygulamanızda çağırarak bağlantı sorunlarını tespit edebilirsiniz
 */

import { supabase } from './supabase';

export async function testSupabaseConnection() {
  console.log('🔍 Supabase bağlantı testi başlatılıyor...');
  
  // 1. Environment değişkenlerini kontrol et
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  
  console.log('📋 Environment Değişkenleri:');
  console.log('  URL:', supabaseUrl || '❌ YOK');
  console.log('  Key:', supabaseAnonKey ? `✅ ***${supabaseAnonKey.slice(-4)}` : '❌ YOK');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase environment değişkenleri eksik!');
    return {
      success: false,
      error: 'Environment değişkenleri eksik',
    };
  }
  
  // 2. Session kontrolü
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.warn('⚠️ Session hatası:', sessionError.message);
    } else {
      console.log('✅ Session kontrolü başarılı');
      console.log('  Kullanıcı:', sessionData.session?.user?.id || 'Giriş yapılmamış');
    }
  } catch (error) {
    console.error('❌ Session kontrolü başarısız:', error);
  }
  
  // 3. Basit bir query testi
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Database query hatası:', error.message);
      console.error('  Detaylar:', error);
      return {
        success: false,
        error: error.message,
      };
    } else {
      console.log('✅ Database bağlantısı başarılı');
      console.log('  Test query sonucu:', data ? 'Veri alındı' : 'Veri yok');
    }
  } catch (error) {
    console.error('❌ Database bağlantı testi başarısız:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
    };
  }
  
  // 4. Storage bucket kontrolü (opsiyonel)
  try {
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.warn('⚠️ Storage bucket kontrolü hatası:', bucketsError.message);
    } else {
      console.log('✅ Storage bağlantısı başarılı');
      console.log('  Bucket sayısı:', buckets?.length || 0);
    }
  } catch (error) {
    console.warn('⚠️ Storage kontrolü başarısız:', error);
  }
  
  console.log('✅ Supabase bağlantı testi tamamlandı');
  return {
    success: true,
  };
}

// Uygulama başlangıcında çağrılabilir
if (__DEV__) {
  // Sadece development modunda otomatik test et
  setTimeout(() => {
    testSupabaseConnection().catch(console.error);
  }, 2000); // 2 saniye bekle (uygulama başlangıcından sonra)
}

