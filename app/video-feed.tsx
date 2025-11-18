/**
 * TikTok Tarzı Dikey Video Feed
 * - Videoya basınca tam ekran açılır
 * - Aşağı kaydırınca bir sonraki video
 * - Beğeni ve yorum sayısına göre sıralama
 * - Video üzerinde yorum paneli (bottom sheet)
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { VideoFeedItem } from '@/components/VideoFeedItem';
import { X } from 'lucide-react-native';
import { COLORS, SPACING } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function VideoFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewableItems, setViewableItems] = useState<ViewToken[]>([]);

  const [offset, setOffset] = useState(0);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [eventsOffset, setEventsOffset] = useState(0);

  // postId ile açılan videoyu fetch et
  const { data: singlePostData } = trpc.post.getPostDetail.useQuery(
    { postId: postId! },
    { enabled: !!postId }
  );

  // Videoları beğeni ve yorum sayısına göre sırala
  const {
    data: postsData,
    isLoading: postsLoading,
  } = trpc.post.getPosts.useQuery(
    {
      sort: 'trending', // Trending = beğeni + yorum
      limit: 20, // Her seferinde 20 video yükle
      offset: offset,
    } as any
  );

  // Event'leri getir (video içeren)
  const {
    data: eventsData,
    isLoading: eventsLoading,
  } = trpc.event.getEvents.useQuery(
    {
      limit: 20,
      offset: eventsOffset,
    }
  );

  // Event'leri post formatına dönüştür
  const convertEventToPost = (event: any): any => {
    // media_urls array'inden video URL'lerini bul
    const videoUrls = (event.media_urls || []).filter((url: string) => 
      url?.match(/\.(mp4|mov|avi|webm)$/i)
    );
    
    if (videoUrls.length === 0) return null;
    
    // İlk video URL'ini al
    const videoUrl = videoUrls[0];
    
    return {
      id: `event_${event.id}`, // Event'leri post'lardan ayırt etmek için
      author_id: event.user_id,
      author: event.user || null,
      content: event.description || event.title || '',
      media: [{
        type: 'video',
        path: videoUrl,
      }],
      like_count: (event.upvotes || 0) - (event.downvotes || 0), // upvotes - downvotes
      comment_count: 0, // Event'lerde yorum yok
      share_count: 0,
      views_count: 0,
      created_at: event.created_at,
      updated_at: event.updated_at,
      is_liked: false,
      isEvent: true, // Event olduğunu işaretle
      eventData: event, // Orijinal event data
    };
  };

  // Posts ve Events data değiştiğinde videoları işle
  useEffect(() => {
    const allVideoItems: any[] = [];
    
    // Post'lardan video içerenleri al
    if (postsData?.posts) {
      const videoPosts = postsData.posts.filter((post: any) => {
        const firstMedia = post.media && post.media.length > 0 ? post.media[0] : null;
        return firstMedia && (firstMedia.type === 'video' || firstMedia.path?.match(/\.(mp4|mov|avi|webm)$/i));
      });
      allVideoItems.push(...videoPosts);
    }
    
    // Event'lerden video içerenleri al ve post formatına dönüştür
    if (eventsData?.events) {
      const videoEvents = eventsData.events
        .map(convertEventToPost)
        .filter((item: any) => item !== null); // Null olanları filtrele
      allVideoItems.push(...videoEvents);
    }
    
    if (allVideoItems.length > 0) {
      // Beğeni ve yorum sayısına göre sırala - TikTok tarzı algoritma
      const sorted = allVideoItems.sort((a: any, b: any) => {
        // TikTok benzeri skorlama: beğeni + yorum + zaman faktörü
        const now = Date.now();
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        
        // Zaman faktörü (son 24 saat içindeki içerikler daha yüksek skor)
        const aTimeFactor = (now - aTime) < 86400000 ? 1.5 : 1; // 24 saat = 86400000ms
        const bTimeFactor = (now - bTime) < 86400000 ? 1.5 : 1;
        
        // Skor hesaplama: beğeni + (yorum * 2) + zaman faktörü
        const aScore = ((a.like_count || 0) + (a.comment_count || 0) * 2) * aTimeFactor;
        const bScore = ((b.like_count || 0) + (b.comment_count || 0) * 2) * bTimeFactor;
        
        return bScore - aScore;
      });
      
      if (offset === 0 && eventsOffset === 0) {
        // İlk yükleme - videoları direkt set et
        setAllVideos(sorted);
      } else {
        // Daha fazla yükleme - mevcut listeye ekle
        setAllVideos((prev) => {
          // Duplicate kontrolü
          const existingIds = new Set(prev.map((v: any) => v.id));
          const newVideos = sorted.filter((v: any) => !existingIds.has(v.id));
          return [...prev, ...newVideos];
        });
      }
      
      // Daha fazla video var mı kontrol et
      const postsHasMore = postsData ? (postsData.total || 0) > offset + 20 : false;
      const eventsHasMore = eventsData ? (eventsData.total || 0) > eventsOffset + 20 : false;
      setHasMore(postsHasMore || eventsHasMore);
      setIsLoadingMore(false);
    } else if ((postsData && !postsData.posts) && (eventsData && !eventsData.events)) {
      setHasMore(false);
      setIsLoadingMore(false);
    }
  }, [postsData, eventsData, offset, eventsOffset]);

  // postId ile açılan videoyu listeye ekle
  useEffect(() => {
    if (singlePostData && postId) {
      const firstMedia = singlePostData.media && singlePostData.media.length > 0 ? singlePostData.media[0] : null;
      const isVideo = firstMedia && (firstMedia.type === 'video' || firstMedia.path?.match(/\.(mp4|mov|avi|webm)$/i));
      
      if (isVideo) {
        setAllVideos((prev) => {
          // Eğer video zaten listede yoksa ekle
          const exists = prev.some((v: any) => v.id === postId);
          if (!exists) {
            // Video'yu listenin başına ekle
            return [singlePostData, ...prev];
          }
          return prev;
        });
      }
    }
  }, [singlePostData, postId]);

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
      // İlk görünür videoyu aktif yap (genellikle en çok görünür olan)
      const firstViewable = vItems.find((vi) => vi.isViewable) || vItems[0];
      const index = firstViewable?.index ?? 0;
      setCurrentIndex(index);
    } else {
      // Hiç görünür video yoksa, mevcut index'i koru
      setViewableItems([]);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50, // Video'nun %50'si görünür olmalı - sadece merkezdeki video aktif
    minimumViewTime: 100, // Minimum görünür kalma süresi (ms)
  };

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isViewable = viewableItems.some((vi) => vi.index === index);
      return (
        <VideoFeedItem
          post={item}
          isActive={isViewable && currentIndex === index}
          isViewable={isViewable}
          index={index}
        />
      );
    },
    [viewableItems, currentIndex]
  );

  const onEndReached = useCallback(() => {
    // Daha fazla video yükleme
    if (!isLoadingMore && hasMore && !postsLoading && !eventsLoading) {
      setIsLoadingMore(true);
      // Hem post'ları hem event'leri yükle
      setOffset((prev) => prev + 20);
      setEventsOffset((prev) => prev + 20);
    }
  }, [isLoadingMore, hasMore, postsLoading, eventsLoading]);

  if (postsLoading && eventsLoading && offset === 0 && eventsOffset === 0) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color={COLORS.white} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
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
        onScrollToIndexFailed={(info) => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          });
        }}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={COLORS.white} />
            </View>
          ) : null
        }
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

