import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, StyleSheet, Animated, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '@/constants/theme';

// Native splash screen'i kontrol et
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();
  const { profile, loading } = useAuth() || { profile: null, loading: true };
  const insets = useSafeAreaInsets();
  const [appIsReady, setAppIsReady] = useState(false);
  
  // Animasyon değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

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

  // Animasyonları başlat
  useEffect(() => {
    // Logo fade in ve scale animasyonu
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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


  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Logo Container */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>MT</Text>
        </View>
      </Animated.View>

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
  logoContainer: {
    marginBottom: SPACING.xl * 2,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 2,
  },
});
