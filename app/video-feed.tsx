/**
 * TikTok Tarzı Dikey Video Feed
 * - Videoya basınca tam ekran açılır
 * - Aşağı kaydırınca bir sonraki video
 * - Beğeni ve yorum sayısına göre sıralama
 * - Video üzerinde yorum paneli (bottom sheet)
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { useTheme } from '@/contexts/ThemeContext';
import { VideoFeedItem } from '@/components/VideoFeedItem';
import { X } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function VideoFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewableItems, setViewableItems] = useState<ViewToken[]>([]);

  const [offset, setOffset] = useState(0);
  const [allVideos, setAllVideos] = useState<any[]>([]);

  // Videoları beğeni ve yorum sayısına göre sırala
  const {
    data: postsData,
    isLoading,
    refetch,
  } = trpc.post.getPosts.useQuery(
    {
      sort: 'trending', // Trending = beğeni + yorum
      limit: 50,
      offset: 0,
    } as any,
    {
      onSuccess: (data) => {
        if (data?.posts) {
          // Sadece video içeren post'ları al
          const videoPosts = data.posts.filter((post: any) => {
            const firstMedia = post.media && post.media.length > 0 ? post.media[0] : null;
            return firstMedia && (firstMedia.type === 'video' || firstMedia.path?.match(/\.(mp4|mov|avi|webm)$/i));
          });

          // Beğeni ve yorum sayısına göre sırala
          const sorted = videoPosts.sort((a: any, b: any) => {
            const aScore = (a.like_count || 0) + (a.comment_count || 0) * 2; // Yorumlar 2x ağırlık
            const bScore = (b.like_count || 0) + (b.comment_count || 0) * 2;
            return bScore - aScore;
          });
          
          setAllVideos(sorted);
        }
      },
    }
  );

  const videos = allVideos;

  // postId varsa o videodan başla
  useEffect(() => {
    if (postId && videos.length > 0 && flatListRef.current) {
      const index = videos.findIndex((v: any) => v.id === postId);
      if (index >= 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index, animated: false });
          setCurrentIndex(index);
        }, 100);
      }
    }
  }, [postId, videos]);

  const onViewableItemsChanged = useCallback(({ viewableItems: vItems }: { viewableItems: ViewToken[] }) => {
    if (vItems.length > 0) {
      setViewableItems(vItems);
      const index = vItems[0]?.index ?? 0;
      setCurrentIndex(index);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isViewable = viewableItems.some((vi) => vi.index === index);
      return (
        <VideoFeedItem
          post={item}
          isActive={isViewable && currentIndex === index}
          index={index}
        />
      );
    },
    [viewableItems, currentIndex]
  );

  const onEndReached = useCallback(() => {
    // Daha fazla video yükleme - şimdilik tüm videolar yüklendi
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Kapat Butonu */}
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + SPACING.md }]}
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <X size={24} color={COLORS.white} />
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        getItemLayout={(data, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        ListFooterComponent={null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    left: SPACING.md,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

