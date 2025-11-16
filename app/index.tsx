import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    // Loading bitince direkt yönlendir - bekleme ekranı yok
    if (!loading) {
      if (profile) {
        // Kullanıcı giriş yapmış - direkt ana sayfaya
        router.replace('/(tabs)/feed');
      } else {
        // Kullanıcı giriş yapmamış - direkt login sayfasına
        router.replace('/auth/login');
      }
    }
  }, [loading, profile, router]);

  // Hiçbir şey gösterme, direkt yönlendir
  return null;
}
