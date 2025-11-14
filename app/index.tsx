import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';
import { AppLogo } from '@/components/AppLogo';

export default function Index() {
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (profile) {
        router.replace('/(tabs)/feed');
      } else {
        router.replace('/auth/login');
      }
    }
  }, [loading, profile, router]);

  return (
    <View style={styles.container}>
      <AppLogo size="large" />
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
