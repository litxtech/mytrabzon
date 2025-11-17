import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Bildirim handler'ı ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// EAS Project ID
const EAS_PROJECT_ID = '368ac56e-da84-480e-b163-f04077df7fa6';

/**
 * Cihazın gerçek cihaz olup olmadığını kontrol et
 */
function isDevice(): boolean {
  return Constants.isDevice ?? true; // Varsayılan olarak true döndür
}

/**
 * Push notification için kayıt ol ve token al
 * Token'ı Supabase'e kaydeder
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Emülatör kontrolü
    if (!isDevice()) {
      console.warn('⚠️ [PushNotifications] Emülatörde çalışıyorsunuz. Push notification sadece gerçek cihazlarda çalışır.');
      return null;
    }

    // Android için notification channel oluştur
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    // İzin kontrolü
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ [PushNotifications] Push notification izni verilmedi');
      return null;
    }

    // Expo push token al
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });

    const token = tokenData.data;
    console.log('✅ [PushNotifications] Push token alındı:', token.substring(0, 20) + '...');

    // Token'ı Supabase'e kaydet
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id);

      if (error) {
        console.error('❌ [PushNotifications] Token Supabase\'e kaydedilemedi:', error);
        // Hata olsa bile token'ı döndür
        return token;
      }

      console.log('✅ [PushNotifications] Token Supabase\'e kaydedildi');
    } else {
      console.warn('⚠️ [PushNotifications] Kullanıcı oturumu bulunamadı, token kaydedilmedi');
    }

    return token;
  } catch (error: any) {
    console.error('❌ [PushNotifications] Token alma hatası:', error);
    // Hata olsa bile uygulamayı durdurma
    return null;
  }
}

export async function schedulePushNotification(title: string, body: string, data?: any) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: null, // Hemen gönder
  });
}

export function addNotificationReceivedListener(
  listener: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(listener);
}

export function addNotificationResponseReceivedListener(
  listener: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}
