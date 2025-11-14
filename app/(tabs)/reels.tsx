import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { Post } from '@/types/database';
import { Heart, MessageCircle, Share2, MoreVertical, Play, Video as VideoIcon } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const REEL_HEIGHT = SCREEN_HEIGHT;

export default function ReelsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const viewStartTimes = useRef<Map<string, number>>(new Map());

  // Reels feed'i al (yeni API)
  const { data: reelsData, isLoading, refetch } = trpc.post.getReels.useQuery(
    { limit: 20, offset: 0 },
    { enabled: !!user?.id }
  );

  const reels = reelsData?.reels || [];

  const trackReelViewMutation = trpc.post.trackReelView.useMutation();

  // View tracking
  const trackViewStart = async (reelId: string) => {
    if (!user?.id) return;
    
    viewStartTimes.current.set(reelId, Date.now());
    
    // Reel view tracking
    try {
      await trackReelViewMutation.mutateAsync({
        reel_id: reelId,
        watch_start: new Date().toISOString(),
        completed: false,
        duration_watched: 0,
      });
    } catch (error) {
      console.error('Track view start error:', error);
    }
  };

  const trackViewComplete = async (reelId: string) => {
    if (!user?.id) return;
    
    const startTime = viewStartTimes.current.get(reelId);
    if (!startTime) return;
    
    const viewDuration = Math.floor((Date.now() - startTime) / 1000); // seconds
    const reel = reels.find((r: Post) => r.id === reelId);
    const durationSeconds = reel?.duration_seconds || reel?.video_metadata?.duration || 0;
    const completed = durationSeconds > 0 && viewDuration >= durationSeconds * 0.9; // %90 izlenirse completed
    
    // Reel view tracking
    try {
      await trackReelViewMutation.mutateAsync({
        reel_id: reelId,
        watch_end: new Date().toISOString(),
        completed,
        duration_watched: viewDuration,
      });
    } catch (error) {
      console.error('Track view complete error:', error);
    }
    
    viewStartTimes.current.delete(reelId);
  };

  const likeReelMutation = trpc.post.likeReel.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleLike = async (reelId: string) => {
    try {
      await likeReelMutation.mutateAsync({ reel_id: reelId });
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const formatCount = (count: number | null | undefined): string => {
    if (!count) return '0';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      if (newIndex !== null && newIndex !== currentIndex) {
        // Önceki reel'in view'ını tamamla
        if (currentIndex >= 0 && reels[currentIndex]) {
          trackViewComplete(reels[currentIndex].id);
        }
        
        // Yeni reel'in view'ını başlat
        setCurrentIndex(newIndex);
        if (reels[newIndex]) {
          trackViewStart(reels[newIndex].id);
        }
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderReel = ({ item, index }: { item: Post; index: number }) => {
    const videoUrl = item.video_url || item.video_metadata?.video_url || item.media?.[0]?.path;
    const thumbnailUrl = item.thumbnail_url || item.video_metadata?.thumbnail_url || item.media?.[0]?.path;
    const isActive = index === currentIndex;
    const videoRef = useRef<Video>(null);

    useEffect(() => {
      if (isActive && videoRef.current) {
        videoRef.current.playAsync();
      } else if (videoRef.current) {
        videoRef.current.pauseAsync();
      }
    }, [isActive]);

    return (
      <View style={styles.reelContainer}>
        {/* Video Player */}
        <View style={styles.mediaContainer}>
          {videoUrl ? (
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={styles.reelMedia}
              resizeMode={ResizeMode.COVER}
              shouldPlay={isActive}
              isLooping
              isMuted={false}
              useNativeControls={false}
            />
          ) : thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.reelMedia}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.reelMedia, styles.placeholder]}>
              <Text style={styles.placeholderText}>Video</Text>
            </View>
          )}
          
          {!isActive && (
            <View style={styles.playOverlay}>
              <Play size={48} color={COLORS.white} fill={COLORS.white} />
            </View>
          )}
        </View>

        {/* Content Overlay */}
        <View style={styles.contentOverlay}>
          {/* Right Side Actions */}
          <View style={styles.rightActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleLike(item.id)}
            >
              <Heart
                size={32}
                color={item.is_liked ? COLORS.error : COLORS.white}
                fill={item.is_liked ? COLORS.error : 'transparent'}
              />
              <Text style={styles.actionText}>{formatCount(item.like_count || 0)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/post/${item.id}` as any)}
            >
              <MessageCircle size={32} color={COLORS.white} />
              <Text style={styles.actionText}>{formatCount(item.comment_count)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Share2 size={32} color={COLORS.white} />
              <Text style={styles.actionText}>{formatCount(item.share_count)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <MoreVertical size={32} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Bottom Content */}
          <View style={styles.bottomContent}>
            <View style={styles.authorInfo}>
              <Image
                source={{
                  uri: item.author?.avatar_url || 'https://via.placeholder.com/40',
                }}
                style={styles.authorAvatar}
              />
              <Text style={styles.authorName}>{item.author?.full_name}</Text>
            </View>
            <Text style={styles.reelContent} numberOfLines={2}>
              {item.content}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderReel}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={REEL_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={() => {
          // Pagination için daha fazla reel yükle
          // TODO: Infinite scroll implementasyonu
        }}
        onEndReachedThreshold={0.5}
      />

      {/* FAB - Create Reel Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create-reel')}
      >
        <VideoIcon size={28} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  reelContainer: {
    width: SCREEN_WIDTH,
    height: REEL_HEIGHT,
    position: 'relative',
  },
  mediaContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  reelMedia: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.lg,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rightActions: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: SPACING.xxl,
    paddingRight: SPACING.md,
    gap: SPACING.lg,
  },
  actionButton: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  bottomContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.xxl,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xl,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  authorName: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  reelContent: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    lineHeight: 20,
  },
  loadingMore: {
    height: REEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

