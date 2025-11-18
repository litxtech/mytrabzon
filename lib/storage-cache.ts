import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CACHE_PREFIX = 'storage_url_cache_';
const CACHE_EXPIRE_MS = 60 * 60 * 1000; // 1 saat

interface CachedUrl {
  url: string;
  expiresAt: number;
}

/**
 * Storage'dan signed URL al ve cache'le
 * 1 saat expire ile
 */
export const getCachedStorageUrl = async (
  bucket: string,
  path: string,
  options?: { transform?: { width?: number; height?: number } }
): Promise<string> => {
  const cacheKey = `${CACHE_PREFIX}${bucket}_${path}_${JSON.stringify(options || {})}`;

  try {
    // Cache'den kontrol et
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const cachedData: CachedUrl = JSON.parse(cached);
      if (Date.now() < cachedData.expiresAt) {
        return cachedData.url; // Cache'den dön
      }
    }

    // Cache yok veya expire olmuş, yeni URL al
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path, options);

    const publicUrl = data.publicUrl;

    // Cache'e kaydet
    const cacheData: CachedUrl = {
      url: publicUrl,
      expiresAt: Date.now() + CACHE_EXPIRE_MS,
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

    return publicUrl;
  } catch (error) {
    console.error('Storage URL cache error:', error);
    // Hata durumunda direkt public URL döndür
    const { data } = supabase.storage.from(bucket).getPublicUrl(path, options);
    return data.publicUrl;
  }
};

/**
 * Thumbnail URL oluştur (128px width)
 */
export const getThumbnailUrl = async (
  bucket: string,
  path: string
): Promise<string> => {
  return getCachedStorageUrl(bucket, path, {
    transform: { width: 128, height: 128 },
  });
};

/**
 * Cache'i temizle (opsiyonel)
 */
export const clearStorageCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error('Clear cache error:', error);
  }
};

