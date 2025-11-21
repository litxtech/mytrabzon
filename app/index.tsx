<<<<<<< HEAD
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
=======
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, StyleSheet, Animated, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '@/constants/theme';
>>>>>>> c0e01b0a94b268b9348cfd071cf195f01ef88020

// Native splash screen'i kontrol et
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Index() {
  const router = useRouter();
<<<<<<< HEAD
=======
  const { profile, loading } = useAuth() || { profile: null, loading: true };
  const insets = useSafeAreaInsets();
  const [appIsReady, setAppIsReady] = useState(false);
  
  // Animasyon değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
>>>>>>> c0e01b0a94b268b9348cfd071cf195f01ef88020

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

<<<<<<< HEAD
  // Splash screen - sadece siyah ekran
  return <View style={styles.container} />;
=======
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
>>>>>>> c0e01b0a94b268b9348cfd071cf195f01ef88020
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
<<<<<<< HEAD
=======
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
>>>>>>> c0e01b0a94b268b9348cfd071cf195f01ef88020
});

