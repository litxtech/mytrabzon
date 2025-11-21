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
  // Guard: URI kontrolü
  if (!uri || uri.trim() === '') {
    throw new Error('EMPTY_URI: Image URI is empty');
  }

  // Guard: Sadece local file URI'leri kabul et
  const isLocalFile = uri.startsWith('file://') || 
                      uri.startsWith('ph://') || 
                      uri.startsWith('content://') ||
                      uri.startsWith('assets-library://');
  
  if (!isLocalFile) {
    // Remote URL veya geçersiz URI - compress edilemez, orijinali döndür
    console.warn('UNSUPPORTED_URI: compressImage only works with local files, returning original URI');
    return uri;
  }

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
    // Format belirtilmemişse, orijinal dosyanın formatını korumaya çalış
    // Ancak varsayılan olarak JPEG kullan (daha küçük dosya boyutu)
    let format = ImageManipulator.SaveFormat.JPEG;
    if (options?.format === 'png') {
      format = ImageManipulator.SaveFormat.PNG;
    } else if (uri.toLowerCase().endsWith('.png')) {
      // Eğer orijinal PNG ise ve format belirtilmemişse, PNG olarak koru
      format = ImageManipulator.SaveFormat.PNG;
    }

    // Resize ve compress
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      {
        compress: quality,
        format,
      }
    );

    // Döndürülen URI'nin formatını kontrol et
    // expo-image-manipulator genellikle format'a göre uzantı ekler
    // Ancak güvenli tarafta olmak için, kullanılan format'a göre format bilgisini döndür
    const returnedUri = manipulatedImage.uri;
    
    // Eğer URI'de uzantı yoksa veya belirsizse, kullanılan format'a göre belirle
    if (!returnedUri.toLowerCase().match(/\.(jpg|jpeg|png)$/i)) {
      // URI'de uzantı yok, format'a göre ekle (sadece bilgi amaçlı, gerçek dosya format'ı zaten doğru)
      // Bu durumda, kullanılan format'ı kabul et
      return returnedUri;
    }
    
    return returnedUri;
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

