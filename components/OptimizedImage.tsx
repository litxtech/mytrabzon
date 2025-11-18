import React from 'react';
import { Image, ImageProps, ImageSource } from 'expo-image';
import { StyleProp, ImageStyle, ViewStyle } from 'react-native';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: string | ImageSource;
  thumbnail?: string; // Liste ekranları için thumbnail URL
  isThumbnail?: boolean; // Liste ekranında mı?
  style?: StyleProp<ImageStyle | ViewStyle>;
}

/**
 * Optimized Image Component
 * - Memory + Disk caching
 * - Thumbnail support for lists
 * - Automatic prefetch
 * - Prevents redundant downloads
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  thumbnail,
  isThumbnail = false,
  style,
  ...props
}) => {
  const uri = typeof source === 'string' ? source : source.uri || '';
  
  // Liste ekranlarında thumbnail kullan
  const imageUri = isThumbnail && thumbnail ? thumbnail : uri;

  return (
    <Image
      source={{ uri: imageUri }}
      style={style}
      cachePolicy="memory-disk"
      contentFit="cover"
      transition={200}
      priority={isThumbnail ? 'normal' : 'high'}
      recyclingKey={uri}
      allowDownscaling={true}
      placeholderContentFit="cover"
      backgroundColor="#1a1a1a"
      {...props}
    />
  );
};

/**
 * Prefetch images for better UX
 */
export const prefetchImages = async (urls: string[]) => {
  try {
    await Image.prefetch(urls);
  } catch (error) {
    console.warn('Image prefetch error:', error);
  }
};

