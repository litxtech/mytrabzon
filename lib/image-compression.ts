/**
 * Image compression utility
 * - Max width: 1080px
 * - JPEG quality: 80%
 * - Automatic format conversion
 * 
 * Note: expo-image-manipulator paketi yüklenene kadar orijinal URI döndürür
 */
export const compressImage = async (
  uri: string,
  options?: {
    maxWidth?: number;
    quality?: number;
    format?: 'jpeg' | 'png';
  }
): Promise<string> => {
  try {
    // expo-image-manipulator paketini dinamik olarak yükle
    let ImageManipulator: any;
    try {
      ImageManipulator = require('expo-image-manipulator');
    } catch (e) {
      // Paket yüklenmemişse orijinal URI'yi döndür
      console.warn('expo-image-manipulator not installed, skipping compression');
      return uri;
    }

    const maxWidth = options?.maxWidth || 1080;
    const quality = options?.quality || 0.8;
    const format = options?.format === 'png' 
      ? ImageManipulator.SaveFormat.PNG 
      : ImageManipulator.SaveFormat.JPEG;

    // Resize ve compress
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      {
        compress: quality,
        format,
      }
    );

    return manipulatedImage.uri;
  } catch (error) {
    console.error('Image compression error:', error);
    // Hata durumunda orijinal URI'yi döndür
    return uri;
  }
};

/**
 * Video compression (720p max)
 * Not: React Native'de video compression için native module gerekir
 * Bu sadece placeholder - gerçek implementasyon için expo-av veya native module kullanılmalı
 */
export const compressVideo = async (
  uri: string
): Promise<string> => {
  // Video compression için native implementation gerekir
  // Şimdilik orijinal URI'yi döndür
  console.warn('Video compression not implemented yet');
  return uri;
};

