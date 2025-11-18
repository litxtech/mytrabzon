import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

/**
 * Image compression utility
 * - Max width: 1080px
 * - JPEG quality: 80%
 * - Automatic format conversion
 */
export const compressImage = async (
  uri: string,
  options?: {
    maxWidth?: number;
    quality?: number;
    format?: ImageManipulator.SaveFormat;
  }
): Promise<string> => {
  try {
    const maxWidth = options?.maxWidth || 1080;
    const quality = options?.quality || 0.8;
    const format = options?.format || ImageManipulator.SaveFormat.JPEG;

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

