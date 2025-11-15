import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Platform } from 'react-native';

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

  // iOS'ta hiçbir şey gösterme, direkt yönlendir
  return null;
}
