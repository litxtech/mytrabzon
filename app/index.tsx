import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, StyleSheet, Platform } from 'react-native';
import { COLORS } from '@/constants/theme';
import { AppLogo } from '@/components/AppLogo';

export default function Index() {
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    // Android'de direkt login'e git, splash ekranını atla
    if (Platform.OS === 'android') {
      if (!loading) {
        if (profile) {
          router.replace('/(tabs)/feed');
        } else {
          router.replace('/auth/login');
        }
      }
    } else {
      // iOS'ta loading bitince yönlendir
      if (!loading) {
        if (profile) {
          router.replace('/(tabs)/feed');
        } else {
          router.replace('/auth/login');
        }
      }
    }
  }, [loading, profile, router]);

  // Android'de hiçbir şey gösterme, direkt yönlendir
  if (Platform.OS === 'android') {
    return null;
  }

  // iOS'ta sadece logo göster (yazı olmadan)
  return (
    <View style={styles.container}>
      <AppLogo size="large" showText={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.white,
  },
});
