import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Native splash screen'i kontrol et
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Index() {
  const router = useRouter();
  const { session, loading, profile } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Router'ın hazır olmasını bekle
    if (!router) {
      return;
    }

    setIsReady(true);
  }, [router]);

  // Session kontrolü ve yönlendirme
  useEffect(() => {
    if (!isReady || !router || loading) {
      return;
    }

    const handleNavigation = async () => {
      try {
        // Önce AuthContext'ten session'ı kontrol et
        if (session?.user) {
          // Session varsa profil kontrolü yap
          if (profile?.full_name) {
            // Profil tamamsa feed'e git
            console.log('✅ [Index] Session exists, redirecting to feed');
            SplashScreen.hideAsync().catch(() => {});
            router.replace('/(tabs)/feed' as any);
          } else {
            // Profil eksikse onboarding'e git
            console.log('⚠️ [Index] Session exists but profile incomplete, redirecting to onboarding');
            SplashScreen.hideAsync().catch(() => {});
            router.replace('/auth/onboarding' as any);
          }
        } else {
          // Session yoksa direkt Supabase'den kontrol et (AuthContext yüklenmemiş olabilir)
          const { data: { session: supabaseSession } } = await supabase.auth.getSession();
          
          if (supabaseSession?.user) {
            // Supabase'de session varsa ama AuthContext henüz yüklenmemiş
            // Profil kontrolü yap
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', supabaseSession.user.id)
              .single();

            if (profileData?.full_name) {
              console.log('✅ [Index] Supabase session exists, redirecting to feed');
              SplashScreen.hideAsync().catch(() => {});
              router.replace('/(tabs)/feed' as any);
            } else {
              console.log('⚠️ [Index] Supabase session exists but profile incomplete, redirecting to onboarding');
              SplashScreen.hideAsync().catch(() => {});
              router.replace('/auth/onboarding' as any);
            }
          } else {
            // Hiç session yoksa login'e git
            console.log('ℹ️ [Index] No session found, redirecting to login');
            SplashScreen.hideAsync().catch(() => {});
            router.replace('/auth/login' as any);
          }
        }
      } catch (error) {
        console.error('❌ [Index] Navigation error:', error);
        // Hata durumunda login'e yönlendir
        SplashScreen.hideAsync().catch(() => {});
        setTimeout(() => {
          try {
            if (router) {
              router.replace('/auth/login' as any);
            }
          } catch (retryError) {
            console.error('❌ [Index] Retry navigation error:', retryError);
          }
        }, 200);
      }
    };

    // Kısa bir delay ile navigation yap (AuthContext'in yüklenmesi için)
    const timeout = setTimeout(() => {
      handleNavigation();
    }, Platform.OS === 'android' ? 300 : 400);

    return () => {
      clearTimeout(timeout);
    };
  }, [router, isReady, loading, session, profile]);

  // Splash screen - sadece siyah ekran
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
