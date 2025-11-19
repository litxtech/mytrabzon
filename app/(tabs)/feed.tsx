import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Dimensions,
  Modal,
  ScrollView,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { OptimizedImage } from '@/components/OptimizedImage';

import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { DISTRICTS, DISTRICT_BADGES } from '@/constants/districts';
import { Post, District } from '@/types/database';
import { Heart, MessageCircle, Share2, Plus, Users, TrendingUp, MoreVertical, AlertCircle, Car, Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { AppLogo } from '@/components/AppLogo';
import { SupporterBadge } from '@/components/SupporterBadge';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';
import { formatTimeAgo } from '@/lib/time-utils';
import { Footer } from '@/components/Footer';
import { VideoPlayer } from '@/components/VideoPlayer';

type SortType = 'new' | 'hot' | 'trending';

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { theme } = useTheme();
  const utils = trpc.useUtils();
  const [selectedDistrict, setSelectedDistrict] = useState<District | 'all'>('all');
  const [sortType, setSortType] = useState<SortType>('new');
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [videoModalVisible, setVideoModalVisible] = useState(false);

  const formatCount = useCallback((count: number | null | undefined): string => {
    if (!count) return '0';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }, []);

  const {
    data: feedData,
    isLoading,
    error: feedError,
    refetch,
  } = trpc.post.getPosts.useQuery(
    {
      district: selectedDistrict === 'all' ? undefined : selectedDistrict,
      sort: sortType,
      limit: 20,
      offset: 0,
    } as any,
    {
      staleTime: 2 * 60 * 1000, // 2 dakika
      gcTime: 10 * 60 * 1000, // 10 dakika
      refetchOnMount: false, // Cache'den kullan
      refetchOnWindowFocus: false,
      retry: 2, // Hata durumunda 2 kez tekrar dene
      retryDelay: 1000, // 1 saniye bekle
      onError: (error) => {
        console.error('❌ Feed yükleme hatası:', error);
        console.error('Hata detayları:', {
          message: error.message,
          data: error.data,
          cause: error.cause,
        });
      },
    }
  );

  // Olay Var event'lerini getir - tüm kullanıcılara göster
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = trpc.event.getEvents.useQuery(
    {
      district: selectedDistrict === 'all' ? undefined : selectedDistrict,
      limit: 20,
      offset: 0,
    },
    {
      staleTime: 2 * 60 * 1000, // 2 dakika (egress optimizasyonu)
      gcTime: 10 * 60 * 1000, // 10 dakika
      refetchOnMount: false, // Cache'den kullan
      refetchOnWindowFocus: false, // Egress optimizasyonu
      retry: 2, // Hata durumunda 2 kez tekrar dene
      retryDelay: 1000, // 1 saniye bekle
      onError: (error) => {
        console.error('❌ Event yükleme hatası:', error);
      },
    }
  );

  const likeEventMutation = (trpc as any).event.likeEvent.useMutation();

  const likePostMutation = trpc.post.likePost.useMutation({
    onMutate: async ({ postId }) => {
      await utils.post.getPosts.cancel();
      const previousData = utils.post.getPosts.getData();
      utils.post.getPosts.setData(
        { district: selectedDistrict === 'all' ? undefined : selectedDistrict, sort: sortType, limit: 20, offset: 0 },
        (old: any) => {
          if (!old?.posts) return old;
          return {
            ...old,
            posts: old.posts.map((post: Post) => {
              if (post.id === postId) {
                const isCurrentlyLiked = post.is_liked;
                return {
                  ...post,
                  is_liked: !isCurrentlyLiked,
                  like_count: (post.like_count || 0) + (isCurrentlyLiked ? -1 : 1),
                };
              }
              return post;
            }),
          };
        }
      );
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        utils.post.getPosts.setData(
          { district: selectedDistrict === 'all' ? undefined : selectedDistrict, sort: sortType, limit: 20, offset: 0 },
          context.previousData
        );
      }
    },
    onSettled: () => {
      refetch();
    },
  });

  const handleLike = useCallback(async (postId: string) => {
    try {
      await likePostMutation.mutateAsync({ postId });
    } catch (error) {
      console.error('Like error:', error);
    }
  }, [likePostMutation]);

  const renderSortTabs = useMemo(() => (
    <View style={[styles.sortContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
      <TouchableOpacity
        style={[
          styles.sortTab,
          { backgroundColor: theme.colors.surface },
          sortType === 'new' && { backgroundColor: theme.colors.primary }
        ]}
        onPress={() => setSortType('new')}
      >
        <Text style={[
          styles.sortText,
          { color: theme.colors.text },
          sortType === 'new' && { color: COLORS.white }
        ]}>
          En Yeni
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.sortTab,
          { backgroundColor: theme.colors.surface },
          sortType === 'trending' && { backgroundColor: theme.colors.primary }
        ]}
        onPress={() => setSortType('trending')}
      >
        <TrendingUp
          size={16}
          color={sortType === 'trending' ? COLORS.white : theme.colors.text}
        />
        <Text style={[
          styles.sortText,
          { color: theme.colors.text },
          sortType === 'trending' && { color: COLORS.white }
        ]}>
          Trending
        </Text>
      </TouchableOpacity>
    </View>
  ), [sortType, theme]);

  const renderDistrictFilter = useMemo(() => (
    <View style={[styles.filterContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[
          { id: 'all', name: 'Tümü', badge: '🌍' },
          ...DISTRICTS.map((d) => ({ id: d, name: d, badge: DISTRICT_BADGES[d] })),
        ]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: theme.colors.surface },
              selectedDistrict === item.id && { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setSelectedDistrict(item.id as District | 'all')}
          >
            <Text style={styles.filterEmoji}>{item.badge}</Text>
            <Text
              style={[
                styles.filterText,
                { color: theme.colors.text },
                selectedDistrict === item.id && { color: COLORS.white, fontWeight: '600' },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  ), [selectedDistrict, theme]);

  const deletePostMutation = trpc.post.deletePost.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => Alert.alert('Hata', error.message),
  });

  const handlePostOptions = useCallback((post: Post) => {
    if (post.author_id !== user?.id) return;
    Alert.alert('Gönderi', 'Seçenekler', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Düzenle',
        onPress: () => router.push(`/create-post?edit=${post.id}` as any),
      },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => deletePostMutation.mutate({ postId: post.id }),
      },
    ]);
  }, [deletePostMutation, router, user?.id]);

  const renderEvent = useCallback((event: any) => {
    const severityColors: Record<string, string> = {
      CRITICAL: theme.colors.error,
      HIGH: theme.colors.warning,
      NORMAL: theme.colors.primary,
      LOW: theme.colors.textLight,
    };
    const severityColor = severityColors[event.severity] || theme.colors.primary;
    const firstMedia = event.media_urls && event.media_urls.length > 0 ? event.media_urls[0] : null;
    const isVideo = firstMedia?.match(/\.(mp4|mov|avi|webm)$/i);

    return (
      <View style={[styles.postCard, { backgroundColor: theme.colors.card, borderColor: severityColor, borderLeftWidth: 4 }]}>
        <View style={styles.postHeader}>
          <TouchableOpacity
            onPress={() => event.user_id && router.push(`/profile/${event.user_id}` as any)}
            activeOpacity={0.7}
          >
            <OptimizedImage
              source={event.user?.avatar_url || 'https://via.placeholder.com/40'}
              style={styles.avatar}
              isThumbnail={true}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.postHeaderInfo}
            onPress={() => event.user_id && router.push(`/profile/${event.user_id}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.postAuthorContainer}>
              <Text style={[styles.postAuthor, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                {event.user?.full_name || 'Bilinmeyen'}
              </Text>
              <View style={[styles.eventBadge, { backgroundColor: severityColor + '20' }]}>
                <AlertCircle size={14} color={severityColor} />
                <Text style={[styles.eventBadgeText, { color: severityColor }]}>Olay Var</Text>
              </View>
            </View>
            <View style={styles.postMeta}>
              <Text style={[styles.postDistrict, { color: theme.colors.textLight }]}>
                {event.district} • {formatTimeAgo(event.created_at || event.start_date)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.eventContent}>
          <Text style={[styles.eventTitle, { color: theme.colors.text }]}>{event.title}</Text>
          {event.description && (
            <Text style={[styles.postContent, { color: theme.colors.text }]} numberOfLines={5}>
              {event.description}
            </Text>
          )}
        </View>

        {firstMedia && (
          <>
            {isVideo ? (
              <TouchableOpacity
                onPress={() => {
                  setSelectedVideo(firstMedia);
                  setVideoModalVisible(true);
                }}
                activeOpacity={0.9}
                style={styles.videoContainer}
              >
                <VideoPlayer
                  videoUrl={firstMedia}
                  postId={event.id}
                  isLiked={event.is_liked || false}
                  likeCount={event.like_count || 0}
                  commentCount={event.comment_count || 0}
                  shareCount={0}
                  onLike={async () => {
                    try {
                      await likeEventMutation.mutateAsync({ event_id: event.id });
                      refetchEvents();
                    } catch (error) {
                      console.error('Event like error:', error);
                    }
                  }}
                  onComment={() => router.push(`/event/${event.id}` as any)}
                  onShare={() => {}}
                  onTag={() => {}}
                  autoPlay={true}
                  previewMode={true}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setSelectedImage(firstMedia);
                  setImageModalVisible(true);
                }}
                activeOpacity={0.9}
                style={styles.imageContainer}
              >
                <OptimizedImage
                  source={firstMedia}
                  thumbnail={firstMedia?.thumbnail}
                  isThumbnail={true}
                  style={styles.postImage}
                />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Event Actions - Like ve Comment */}
        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={async () => {
              try {
                await likeEventMutation.mutateAsync({ event_id: event.id });
                refetchEvents();
              } catch (error) {
                console.error('Event like error:', error);
              }
            }}
          >
            <Heart 
              size={20} 
              color={event.is_liked ? theme.colors.error : theme.colors.textLight}
              fill={event.is_liked ? theme.colors.error : 'transparent'}
            />
            <Text style={[styles.actionText, { color: event.is_liked ? theme.colors.error : theme.colors.textLight }]}>
              {formatCount(event.like_count || 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/event/${event.id}` as any)}
          >
            <MessageCircle size={20} color={theme.colors.textLight} />
            <Text style={[styles.actionText, { color: theme.colors.textLight }]}>
              {formatCount(event.comment_count || 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              // Event'i post olarak paylaşmak için create-post ekranına yönlendir
              const eventContent = `🚨 Olay Var: ${event.title}\n\n${event.description || ''}\n\n📍 ${event.district}${event.city ? `, ${event.city}` : ''}`;
              router.push({
                pathname: '/create-post',
                params: {
                  shareEvent: event.id,
                  content: eventContent,
                  mediaUrls: event.media_urls ? JSON.stringify(event.media_urls) : undefined,
                } as any,
              });
            }}
          >
            <Share2 size={20} color={theme.colors.textLight} />
            <Text style={[styles.actionText, { color: theme.colors.textLight }]}>
              Paylaş
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [router, theme, setSelectedVideo, setVideoModalVisible, setSelectedImage, setImageModalVisible, refetchEvents, formatCount, likeEventMutation]);

  const renderPost = useCallback(({ item }: { item: Post }) => {
    const firstMedia = item.media && item.media.length > 0 ? item.media[0] : null;
    const isVideo = firstMedia?.type === 'video' || firstMedia?.path?.match(/\.(mp4|mov|avi|webm)$/i);

    return (
      <View style={[styles.postCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.postHeader}>
          <TouchableOpacity
            onPress={() => item.author_id && router.push(`/profile/${item.author_id}` as any)}
            activeOpacity={0.7}
          >
            <OptimizedImage
              source={item.author?.avatar_url || 'https://via.placeholder.com/40'}
              style={styles.avatar}
              isThumbnail={true}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.postHeaderInfo}
            onPress={() => item.author_id && router.push(`/profile/${item.author_id}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.postAuthorContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.postAuthor, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                  {item.author?.full_name}
                </Text>
                {item.author?.verified && <VerifiedBadgeIcon size={16} />}
                {item.author?.supporter_badge && item.author?.supporter_badge_visible && (
                  <SupporterBadge 
                    visible={true} 
                    size="small" 
                    color={item.author?.supporter_badge_color as 'yellow' | 'green' | 'blue' | 'red' | null}
                  />
                )}
              </View>
            </View>
            {item.author?.username && (
              <View style={styles.postUsernameContainer}>
                <Text style={[styles.postUsername, { color: theme.colors.textLight }]} numberOfLines={1} ellipsizeMode="tail">
                  @{item.author.username}
                </Text>
              </View>
            )}
            <View style={styles.postMeta}>
              <View style={styles.postDistrictContainer}>
                <Text style={[styles.postDistrict, { color: theme.colors.textLight }]} numberOfLines={1} ellipsizeMode="tail">
                  {DISTRICT_BADGES[item.district]} {item.district}
                </Text>
              </View>
              <View style={styles.postTimeContainer}>
                <Text style={[styles.postTime, { color: theme.colors.textLight }]} numberOfLines={1} ellipsizeMode="tail">
                  {' • '}
                  {formatTimeAgo(item.created_at)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          {item.author_id === user?.id && (
            <TouchableOpacity
              style={styles.postMenuButton}
              onPress={() => handlePostOptions(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MoreVertical size={18} color={theme.colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.postContentContainer}
          onPress={() => router.push(`/post/${item.id}` as any)}
          activeOpacity={0.9}
        >
          <Text 
            style={[styles.postContent, { color: theme.colors.text }]}
            numberOfLines={10}
            ellipsizeMode="tail"
          >
            {item.content}
          </Text>
        </TouchableOpacity>

        {firstMedia && (
          <>
            {isVideo ? (
              <View style={styles.videoContainer}>
                <VideoPlayer
                  videoUrl={firstMedia.path}
                  postId={item.id}
                  isLiked={item.is_liked}
                  isSaved={false}
                  likeCount={item.like_count}
                  commentCount={item.comment_count}
                  shareCount={item.share_count}
                  onLike={() => handleLike(item.id)}
                  onComment={() => router.push(`/post/${item.id}` as any)}
                  onShare={async () => {
                    try {
                      await Share.share({
                        message: `${item.author?.full_name} - ${item.content || 'Gönderi'}`,
                        url: firstMedia.path,
                      });
                    } catch (error) {
                      console.error('Share error:', error);
                    }
                  }}
                  onTag={() => {
                    router.push(`/post/${item.id}` as any);
                  }}
                  onSave={() => {
                    // Kaydetme fonksiyonu - post.savePost mutation'ı kullanılabilir
                    Alert.alert('Bilgi', 'Kaydetme özelliği yakında eklenecek');
                  }}
                  autoPlay={true}
                  previewMode={true}
                  onFullScreen={() => {
                    // Video feed sayfasına yönlendir
                    router.push(`/video-feed?postId=${item.id}` as any);
                  }}
                />
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setSelectedImage(firstMedia.path);
                  setImageModalVisible(true);
                }}
                activeOpacity={0.9}
                style={styles.imageContainer}
              >
                <OptimizedImage
                  source={firstMedia.path}
                  thumbnail={firstMedia.thumbnail}
                  isThumbnail={true}
                  style={styles.postImage}
                />
              </TouchableOpacity>
            )}
          </>
        )}

        {item.media && item.media.length > 1 && (
          <View style={styles.mediaCountBadge}>
            <Text style={styles.mediaCountText}>+{item.media.length - 1}</Text>
          </View>
        )}

        <View style={[styles.postActions, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <Heart
              size={20}
              color={item.is_liked ? theme.colors.error : theme.colors.textLight}
              fill={item.is_liked ? theme.colors.error : 'transparent'}
            />
            <Text style={[styles.actionText, { color: theme.colors.textLight }]} numberOfLines={1}>
              {formatCount(item.like_count)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/post/${item.id}` as any)}
          >
            <MessageCircle size={20} color={theme.colors.textLight} />
            <Text style={[styles.actionText, { color: theme.colors.textLight }]} numberOfLines={1}>
              {formatCount(item.comment_count)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              // Paylaşma fonksiyonu
            }}
          >
            <Share2 size={20} color={theme.colors.textLight} />
            <Text style={[styles.actionText, { color: theme.colors.textLight }]} numberOfLines={1}>
              {formatCount(item.share_count)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [handleLike, router, formatCount, user?.id, handlePostOptions, theme]);

  // Feed data'yı birleştir ve sırala - useMemo ile optimize et
  const combinedFeedData = useMemo(() => {
    const combined = [
      ...(eventsData?.events || []).map((event: any) => ({ type: 'event', ...event })),
      ...(feedData?.posts || []).map((post: any) => ({ type: 'post', ...post })),
    ];
    // Tarihe göre sırala (en yeni önce)
    return combined.sort((a, b) => {
      const aDate = new Date(a.created_at || a.start_date || 0).getTime();
      const bDate = new Date(b.created_at || b.start_date || 0).getTime();
      return bDate - aDate;
    });
  }, [eventsData?.events, feedData?.posts]);

  const renderRideActions = useMemo(() => (
    <View style={[styles.rideActionsContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
      <TouchableOpacity
        style={[styles.rideActionButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/ride/search')}
      >
        <Search size={20} color={COLORS.white} />
        <Text style={styles.rideActionText}>Yolculuk Ara</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.rideActionButton, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.primary }]}
        onPress={() => router.push('/ride/create')}
      >
        <Car size={20} color={theme.colors.primary} />
        <Text style={[styles.rideActionText, { color: theme.colors.primary }]}>Yolculuk Oluştur</Text>
      </TouchableOpacity>
    </View>
  ), [theme, router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, SPACING.md) : 0 }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border, paddingTop: Math.max(insets.top, Platform.OS === 'android' ? SPACING.lg : SPACING.md) }]}>
        <AppLogo size="medium" style={styles.headerLogo} />
        <TouchableOpacity
          style={[styles.usersButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => router.push('/all-users')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Users size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {renderRideActions}
      {renderSortTabs}
      {renderDistrictFilter}

      {(feedError || eventsError) && !isLoading && !eventsLoading && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {(feedError || eventsError)?.message || 'Veriler yüklenirken bir hata oluştu'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              refetch();
              refetchEvents();
            }}
          >
            <Text style={[styles.retryButtonText, { color: COLORS.white }]}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )}
      {isLoading || eventsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={combinedFeedData}
          renderItem={({ item }) => {
            if (item.type === 'event') {
              return renderEvent(item);
            }
            return renderPost({ item });
          }}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.feedList}
          refreshControl={
            <RefreshControl 
              refreshing={isLoading || eventsLoading} 
              onRefresh={() => {
                refetch();
                refetchEvents();
              }}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          removeClippedSubviews={Platform.OS === 'android'} // Android'de performans için
          maxToRenderPerBatch={10} // Daha fazla item render et
          updateCellsBatchingPeriod={50} // Daha hızlı batch update
          initialNumToRender={10} // İlk yüklemede daha fazla item göster
          windowSize={10} // Daha büyük window size
          getItemLayout={(data, index) => ({
            length: 400, // Ortalama item yüksekliği (tahmini)
            offset: 400 * index,
            index,
          })} // getItemLayout ile daha hızlı scroll
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.text }]}>Henüz gönderi yok</Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textLight }]}>
                {user?.id 
                  ? 'Takip ettiğin kullanıcıların gönderileri burada görünecek'
                  : 'İlk paylaşımı yapan sen ol!'}
              </Text>
            </View>
          }
          ListFooterComponent={<Footer />}
        />
      )}

      {/* Olay Var Button */}
      <TouchableOpacity
        style={[styles.eventFab, { bottom: (Platform.OS === 'android' ? Math.max(insets.bottom, SPACING.lg) : SPACING.lg) + 120 }]}
        onPress={() => router.push('/event/create')}
      >
        <AlertCircle size={20} color={COLORS.white} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.fab, { bottom: (Platform.OS === 'android' ? Math.max(insets.bottom, SPACING.lg) : SPACING.lg) + 60 }]}
        onPress={() => router.push('/create-post')}
      >
        <Plus size={24} color={COLORS.white} />
      </TouchableOpacity>

      {/* Full Screen Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.fullScreenModal}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setImageModalVisible(false)}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <ScrollView
            contentContainerStyle={styles.modalImageContainer}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullScreenImage}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
                priority="high"
                allowDownscaling={false}
                contentPosition="center"
              />
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Full Screen Video Modal */}
      <Modal
        visible={videoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVideoModalVisible(false)}
      >
        <View style={styles.fullScreenModal}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setVideoModalVisible(false)}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
                 {selectedVideo && (
                   <VideoPlayer
                     videoUrl={selectedVideo}
                     postId=""
                     isLiked={false}
                     likeCount={0}
                     commentCount={0}
                     shareCount={0}
                     onLike={() => {}}
                     onComment={() => {}}
                     onShare={() => {}}
                     onTag={() => {}}
                     autoPlay={true}
                     previewMode={false}
                     showControls={true}
                   />
                 )}
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    minHeight: 60,
  },
  headerLogo: {
    marginLeft: -SPACING.xs, // Logo için hafif margin ayarı
  },
  usersButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: 2,
  },
  sortContainer: {
    flexDirection: 'row' as const,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    gap: SPACING.sm,
  },
  sortTab: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  sortText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
  },
  filterContainer: {
    borderBottomWidth: 1,
    paddingVertical: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    marginHorizontal: SPACING.xs,
    gap: SPACING.xs,
    flexShrink: 0, // Android'de metinlerin kesilmemesi için
    flexGrow: 0, // Horizontal scroll için genişlememeli
  },
  filterEmoji: {
    fontSize: FONT_SIZES.sm,
    flexShrink: 0,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    flexShrink: 0, // Android'de metinlerin tam görünmesi için
  },
  feedList: {
    paddingVertical: SPACING.sm,
  },
  postCard: {
    marginHorizontal: 0,
    marginVertical: SPACING.sm,
    borderRadius: 0,
    width: '100%',
    overflow: 'hidden',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  postHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: SPACING.md,
    width: '100%',
  },
  postMenuButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm,
  },
  postHeaderInfo: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  postAuthorContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.xs,
    flexShrink: 1,
    minWidth: 0,
  },
  postAuthor: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    flexShrink: 1,
  },
  postUsernameContainer: {
    flexShrink: 1,
    marginTop: 2,
    minWidth: 0,
  },
  postUsername: {
    fontSize: FONT_SIZES.xs,
    flexShrink: 1,
  },
  postMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 2,
    flexShrink: 1,
    minWidth: 0,
  },
  postDistrictContainer: {
    flexShrink: 1,
    minWidth: 0,
  },
  postDistrict: {
    fontSize: FONT_SIZES.sm,
    flexShrink: 1,
  },
  postTimeContainer: {
    flexShrink: 0,
  },
  postTime: {
    fontSize: FONT_SIZES.sm,
  },
  postContentContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    width: '100%',
  },
  postContent: {
    fontSize: FONT_SIZES.md,
    lineHeight: 20,
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    marginHorizontal: 0,
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  postImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    maxHeight: Dimensions.get('window').height * 0.7,
    marginHorizontal: 0,
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  videoContainer: {
    width: '100%',
    marginHorizontal: 0,
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '600',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    marginTop: 0,
    resizeMode: 'contain',
  },
  mediaCountBadge: {
    position: 'absolute' as const,
    top: 70,
    right: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mediaCountText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
  },
  postActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: SPACING.md,
    gap: SPACING.lg,
    width: '100%',
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.xs,
    minWidth: 50,
    flexShrink: 0,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    flexShrink: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  emptyContainer: {
    padding: SPACING.xxl,
    alignItems: 'center' as const,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600' as const,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center' as const,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center' as const,
    marginBottom: SPACING.md,
  },
  retryButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
  },
  fab: {
    position: 'absolute' as const,
    right: SPACING.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    elevation: 20,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  eventFab: {
    position: 'absolute' as const,
    right: SPACING.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.error,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    elevation: 20,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  eventContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  eventTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700' as const,
    marginBottom: SPACING.xs,
  },
  eventBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 8,
    gap: SPACING.xs / 2,
  },
  eventBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700' as const,
  },
  rideActionsContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
  },
  rideActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  rideActionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
});
