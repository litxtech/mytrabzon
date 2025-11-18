import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, Image, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Native splash screen'i kontrol et
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();
  const { profile, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Minimum 1 saniye bekle
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        // Auth loading bitene kadar bekle
        if (!loading) {
          setAppIsReady(true);
        }
      }
    }

    prepare();
  }, [loading]);

  useEffect(() => {
    async function hideSplashAndNavigate() {
      if (appIsReady) {
        // Native splash screen'i gizle
        await SplashScreen.hideAsync();
        
        // Yönlendirme yap
        if (profile) {
          // Kullanıcı giriş yapmış - direkt ana sayfaya
          router.replace('/(tabs)/feed');
        } else {
          // Kullanıcı giriş yapmamış - direkt login sayfasına
          router.replace('/auth/login');
        }
      }
    }

    hideSplashAndNavigate();
  }, [appIsReady, profile, router]);

  // Splash screen göster (1 saniye boyunca)
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Image
        source={require('@/assets/images/splash-screen-16-9.png')}
        style={styles.logo}
        resizeMode="contain"
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
