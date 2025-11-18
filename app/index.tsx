import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Native splash screen'i kontrol et
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();
  const { profile, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const [appIsReady, setAppIsReady] = useState(false);
  const [minDelayPassed, setMinDelayPassed] = useState(false);

  // Minimum 1 saniye bekleme
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinDelayPassed(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Auth loading bitene ve minimum delay geçene kadar bekle
  // Android için timeout ekle - eğer 3 saniye içinde loading bitmezse zorla devam et
  useEffect(() => {
    if (!loading && minDelayPassed) {
      setAppIsReady(true);
    }
  }, [loading, minDelayPassed]);

  // Android için timeout - eğer 3 saniye içinde hazır olmazsa zorla devam et
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('App initialization timeout - forcing app ready');
      setAppIsReady(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  // Splash screen'i gizle ve yönlendir
  useEffect(() => {
    if (!appIsReady) return;

    let mounted = true;

    async function hideSplashAndNavigate() {
      try {
        // Native splash screen'i gizle
        await SplashScreen.hideAsync();
        
        if (!mounted) return;

        // Kısa bir delay ile navigation yap (Android için)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!mounted) return;

        // Yönlendirme yap
        if (profile) {
          // Kullanıcı giriş yapmış - direkt ana sayfaya
          router.replace('/(tabs)/feed');
        } else {
          // Kullanıcı giriş yapmamış - direkt login sayfasına
          router.replace('/auth/login');
        }
      } catch (error) {
        console.error('Error hiding splash or navigating:', error);
        // Hata olsa bile yönlendirme yap
        if (mounted) {
          if (profile) {
            router.replace('/(tabs)/feed');
          } else {
            router.replace('/auth/login');
          }
        }
      }
    }

    hideSplashAndNavigate();

    return () => {
      mounted = false;
    };
  }, [appIsReady, profile, router]);

  // Splash screen göster (1 saniye boyunca)
  // Eğer resim yüklenemezse sadece siyah ekran göster
  if (appIsReady) {
    return null; // Uygulama hazır, hiçbir şey render etme
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Image
        source={require('@/assets/images/icon.png')}
        style={styles.logo}
        contentFit="contain"
        onError={(e) => {
          console.warn('Splash image failed to load, showing black screen only');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '80%',
    maxWidth: 400,
    height: 200,
  },
});
