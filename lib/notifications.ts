/**
 * Notification Sound System
 * Bildirim sesi yönetimi
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

// Bildirim sesi ayarları
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let soundObject: Audio.Sound | null = null;

/**
 * Bildirim sesi çal
 */
export async function playNotificationSound(): Promise<void> {
  try {
    // Önce mevcut sesi durdur
    if (soundObject) {
      await soundObject.unloadAsync();
    }

    // Yeni ses oluştur
    soundObject = new Audio.Sound();
    
    // Basit bir beep sesi (gerçek uygulamada asset'ten yüklenebilir)
    // Şimdilik sistem sesini kullanıyoruz
    await soundObject.loadAsync(
      { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' },
      { shouldPlay: true, volume: 0.5 }
    );

    // Ses bittiğinde temizle
    soundObject.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        soundObject?.unloadAsync();
        soundObject = null;
      }
    });
  } catch (error) {
    console.error('Notification sound error:', error);
    // Hata durumunda sessiz devam et
  }
}

/**
 * Bildirim izinlerini iste
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // Android için notification channel oluştur
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }

    return true;
  } catch (error) {
    console.error('Request notification permissions error:', error);
    return false;
  }
}

/**
 * Bildirim gönder (local)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: any
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data,
      },
      trigger: null, // Hemen gönder
    });

    // Ses çal
    await playNotificationSound();
  } catch (error) {
    console.error('Send notification error:', error);
  }
}

/**
 * Bildirim token'ını al (push notifications için)
 */
export async function getNotificationToken(): Promise<string | null> {
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    return token.data;
  } catch (error) {
    console.error('Get notification token error:', error);
    return null;
  }
}

