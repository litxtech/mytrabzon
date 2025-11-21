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
  const [commentsOpenMap, setCommentsOpenMap] = useState<Record<number, boolean>>({});

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
      like_count: event.like_count || 0,
      comment_count: event.comment_count || 0, // Event'lerde yorum var
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
    let isMounted = true;
    const allVideoItems: any[] = [];
    
    try {
      // Post'lardan video içerenleri al
      if (postsData?.posts && Array.isArray(postsData.posts)) {
        const videoPosts = postsData.posts.filter((post: any) => {
          if (!post || !post.media) return false;
          const firstMedia = Array.isArray(post.media) && post.media.length > 0 ? post.media[0] : null;
          return firstMedia && (firstMedia.type === 'video' || firstMedia.path?.match(/\.(mp4|mov|avi|webm)$/i));
        });
        if (isMounted) {
          allVideoItems.push(...videoPosts);
        }
      }
      
      // Event'lerden video içerenleri al ve post formatına dönüştür
      if (eventsData?.events && Array.isArray(eventsData.events)) {
        const videoEvents = eventsData.events
          .map((event: any) => {
            try {
              return convertEventToPost(event);
            } catch (error) {
              console.error('Error converting event to post:', error);
              return null;
            }
          })
          .filter((item: any) => item !== null); // Null olanları filtrele
        if (isMounted) {
          allVideoItems.push(...videoEvents);
        }
      }
    
      if (isMounted && allVideoItems.length > 0) {
        try {
          // Beğeni ve yorum sayısına göre sırala - TikTok tarzı algoritma
          const sorted = [...allVideoItems].sort((a: any, b: any) => {
            try {
              // TikTok benzeri skorlama: beğeni + yorum + zaman faktörü
              const now = Date.now();
              const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
              const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
              
              // Zaman faktörü (son 24 saat içindeki içerikler daha yüksek skor)
              const aTimeFactor = (now - aTime) < 86400000 ? 1.5 : 1; // 24 saat = 86400000ms
              const bTimeFactor = (now - bTime) < 86400000 ? 1.5 : 1;
              
              // Skor hesaplama: beğeni + (yorum * 2) + zaman faktörü
              const aScore = ((a?.like_count || 0) + (a?.comment_count || 0) * 2) * aTimeFactor;
              const bScore = ((b?.like_count || 0) + (b?.comment_count || 0) * 2) * bTimeFactor;
              
              return bScore - aScore;
            } catch (error) {
              console.error('Error in sort comparison:', error);
              return 0;
            }
          });
          
          if (isMounted) {
            if (offset === 0 && eventsOffset === 0) {
              // İlk yükleme - videoları direkt set et
              setAllVideos(sorted);
            } else {
              // Daha fazla yükleme - mevcut listeye ekle
              setAllVideos((prev) => {
                if (!isMounted) return prev;
                try {
                  // Duplicate kontrolü
                  const safePrev = Array.isArray(prev) ? prev : [];
                  const existingIds = new Set(safePrev.map((v: any) => v?.id).filter(Boolean));
                  const newVideos = sorted.filter((v: any) => v?.id && !existingIds.has(v.id));
                  return [...safePrev, ...newVideos];
                } catch (error) {
                  console.error('Error updating videos:', error);
                  return prev;
                }
              });
            }
            
            // Daha fazla video var mı kontrol et
            const postsHasMore = postsData ? (postsData.total || 0) > offset + 20 : false;
            const eventsHasMore = eventsData ? (eventsData.total || 0) > eventsOffset + 20 : false;
            setHasMore(postsHasMore || eventsHasMore);
            setIsLoadingMore(false);
          }
        } catch (error) {
          console.error('Error processing video items:', error);
          setIsLoadingMore(false);
        }
      } else if ((postsData && !postsData.posts) && (eventsData && !eventsData.events)) {
        if (isMounted) {
          setHasMore(false);
          setIsLoadingMore(false);
        }
      }
      
      return () => {
        isMounted = false;
      };
    } catch (error) {
      console.error('Error in video feed effect:', error);
      return () => {};
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

  const handleCommentsChange = useCallback((index: number, isOpen: boolean) => {
    setCommentsOpenMap((prev) => ({
      ...prev,
      [index]: isOpen,
    }));
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isViewable = viewableItems.some((vi) => vi.index === index);
      return (
        <VideoFeedItem
          post={item}
          isActive={isViewable && currentIndex === index}
          isViewable={isViewable}
          index={index}
          onCommentsChange={(isOpen) => handleCommentsChange(index, isOpen)}
        />
      );
    },
    [viewableItems, currentIndex, handleCommentsChange]
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
        scrollEnabled={!commentsOpenMap || !Object.values(commentsOpenMap).some((isOpen) => isOpen)}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
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

