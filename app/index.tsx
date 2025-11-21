import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Native splash screen'i kontrol et
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});

      try {
        router.replace('/auth/login' as any);
      } catch {
        // Navigasyon hatası olsa bile tekrar dene
        setTimeout(() => {
          SplashScreen.hideAsync().catch(() => {});
          router.replace('/auth/login' as any);
        }, 200);
      }
    }, Platform.OS === 'android' ? 600 : 900);

    return () => {
      clearTimeout(timeout);
    };
  }, [router]);

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

