/**
 * useAuthGuard Hook
 * Misafir kullanıcılar için giriş kontrolü yapar
 * Aktif özelliklerde (yorum, beğeni, gönderi paylaşma vb.) giriş zorunluluğu kontrol eder
 */

import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export const useAuthGuard = () => {
  const router = useRouter();
  const { user, session, isGuest } = useAuth();

  /**
   * Guard fonksiyonu - Kullanıcı giriş yapmamışsa veya misafir ise uyarı gösterir
   * @param callback - Giriş yapılmışsa ve misafir değilse çalışacak fonksiyon
   * @param actionName - Kullanıcıya gösterilecek eylem adı (opsiyonel)
   */
  const guard = (callback: () => void, actionName?: string) => {
    if (!user || !session) {
      // Giriş yapmamış kullanıcı - giriş ekranına yönlendir
      const actionText = actionName || 'Bu işlemi gerçekleştirmek';
      
      Alert.alert(
        'Giriş Gerekli',
        `${actionText} için giriş yapmanız gerekiyor.`,
        [
          {
            text: 'İptal',
            style: 'cancel',
          },
          {
            text: 'Giriş Yap',
            onPress: () => {
              router.push('/auth/login');
            },
          },
        ]
      );
      return;
    }

    // Misafir kullanıcı kontrolü
    if (isGuest) {
      const actionText = actionName || 'Bu işlemi gerçekleştirmek';
      
      Alert.alert(
        'Misafir Kullanıcı',
        `Misafir olarak ${actionText.toLowerCase()} için kayıt olmanız gerekiyor.`,
        [
          {
            text: 'İptal',
            style: 'cancel',
          },
          {
            text: 'Kayıt Ol',
            onPress: () => {
              router.push('/auth/login');
            },
          },
        ]
      );
      return;
    }

    // Kullanıcı giriş yapmış ve misafir değil - callback'i çalıştır
    callback();
  };

  /**
   * Kullanıcının giriş yapıp yapmadığını kontrol eder
   * @returns true eğer kullanıcı giriş yapmışsa
   */
  const isAuthenticated = (): boolean => {
    return !!user && !!session;
  };

  return {
    guard,
    isAuthenticated,
    isGuest,
  };
};

