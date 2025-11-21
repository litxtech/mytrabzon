import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Native splash screen'i kontrol et
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Index() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Router'ın hazır olmasını bekle
    if (!router) {
      return;
    }

    setIsReady(true);
  }, [router]);

  useEffect(() => {
    if (!isReady || !router) {
      return;
    }

    const timeout = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});

      try {
        if (router) {
          router.replace('/auth/login' as any);
        }
      } catch (error) {
        console.error('Navigation error:', error);
        // Navigasyon hatası olsa bile tekrar dene
        setTimeout(() => {
          try {
            SplashScreen.hideAsync().catch(() => {});
            if (router) {
              router.replace('/auth/login' as any);
            }
          } catch (retryError) {
            console.error('Retry navigation error:', retryError);
          }
        }, 200);
      }
    }, Platform.OS === 'android' ? 600 : 900);

    return () => {
      clearTimeout(timeout);
    };
  }, [router, isReady]);

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
