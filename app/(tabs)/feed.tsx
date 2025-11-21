import React, { useState, useMemo, useCallback, useRef } from 'react';
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
import { Heart, MessageCircle, Share2, Plus, Users, TrendingUp, MoreVertical, AlertCircle, Trash2, Car, Search, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AppLogo } from '@/components/AppLogo';
import { SupporterBadge } from '@/components/SupporterBadge';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';
import { formatTimeAgo } from '@/lib/time-utils';
import { Footer } from '@/components/Footer';
import { VideoPlayer } from '@/components/VideoPlayer';
import { WhatsAppComplaintButton } from '@/components/WhatsAppComplaintButton';

type SortType = 'new' | 'hot' | 'trending';

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { guard } = useAuthGuard();
  const utils = trpc.useUtils();
  const [selectedDistrict, setSelectedDistrict] = useState<District | 'all'>('all');
  const [sortType, setSortType] = useState<SortType>('new');
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPostMedia, setSelectedPostMedia] = useState<any[]>([]); // Post medya listesi
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0); // Seçili medya index'i
  const modalScrollViewRef = useRef<ScrollView>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<any>(null);
  const [selectedWarningPost, setSelectedWarningPost] = useState<Post | null>(null);

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
    }
  );

  // Olay Var event'lerini getir - tüm kullanıcılara göster (district filtresi yok, her zaman tüm event'ler görünür)
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = trpc.event.getEvents.useQuery(
    {
      // district parametresi yok - her zaman tüm event'ler görünür
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

  const handleLike = useCallback((postId: string) => {
    guard(() => {
      // Optimistic update - anında UI'ı güncelle (debounce kaldırıldı - anında tepki)
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
      
      // Anında mutation'ı çalıştır (debounce kaldırıldı - hızlı tepki için)
      likePostMutation.mutate({ postId }, {
        onError: () => {
          // Hata durumunda geri al
          refetch();
        },
      });
    }, 'Beğenmek');
  }, [likePostMutation, utils, selectedDistrict, sortType, refetch, guard]);

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

  const deleteEventMutation = trpc.event.deleteEvent.useMutation({
    onSuccess: () => {
      refetchEvents();
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

  const handleEventOptions = useCallback((event: any) => {
    if (event.user_id !== user?.id) return;
    Alert.alert('Olay Var', 'Seçenekler', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Düzenle',
        onPress: () => router.push(`/event/create?edit=${event.id}` as any),
      },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Olayı Sil',
            'Bu olayı silmek istediğinize emin misiniz?',
            [
              { text: 'İptal', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: () => deleteEventMutation.mutate({ eventId: event.id }),
              },
            ]
          );
        },
      },
    ]);
  }, [deleteEventMutation, router, user?.id]);

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
          {event.user_id === user?.id && (
            <TouchableOpacity
              style={styles.eventDeleteButton}
              onPress={() => {
                Alert.alert(
                  'Olayı Sil',
                  'Bu olayı tüm ilçelerden kaldırmak istediğinize emin misiniz?',
                  [
                    { text: 'Vazgeç', style: 'cancel' },
                    {
                      text: 'Sil',
                      style: 'destructive',
                      onPress: () => deleteEventMutation.mutate({ eventId: event.id }),
                    },
                  ]
                );
              }}
              disabled={deleteEventMutation.isPending}
            >
              <Trash2 size={18} color={theme.colors.error} />
            </TouchableOpacity>
          )}
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
                  postId={`event_${event.id}`}
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
                  setSelectedPostMedia([{ path: firstMedia }]);
                  setSelectedMediaIndex(0);
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
              guard(() => {
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
              }, 'Gönderi paylaşmak');
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
  }, [router, theme, user?.id, setSelectedVideo, setVideoModalVisible, setSelectedImage, setImageModalVisible, refetchEvents, formatCount, likeEventMutation, deleteEventMutation]);

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
          {/* Uyarı Badge - Sağ üstte küçük */}
          {(item as any).warnings && Array.isArray((item as any).warnings) && (item as any).warnings.length > 0 && (item as any).warnings.some((w: any) => !w.is_resolved) && (
            <TouchableOpacity
              style={styles.warningBadge}
              onPress={() => {
                const activeWarning = (item as any).warnings.find((w: any) => !w.is_resolved);
                if (activeWarning) {
                  setSelectedWarning(activeWarning);
                  setSelectedWarningPost(item);
                  setWarningModalVisible(true);
                }
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AlertTriangle size={16} color="#F59E0B" fill="#F59E0B" />
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

        {item.media && item.media.length > 0 && (
          <>
            {/* Birden fazla medya varsa yatay scroll */}
            {item.media.length > 1 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.mediaScrollView}
                contentContainerStyle={styles.mediaScrollContent}
                snapToInterval={Dimensions.get('window').width}
                decelerationRate="fast"
              >
                {item.media.map((mediaItem: any, mediaIndex: number) => {
                  const isMediaVideo = mediaItem.type === 'video' || mediaItem.path?.match(/\.(mp4|mov|avi|webm)$/i);
                  
                  return (
                    <View key={mediaIndex} style={styles.mediaItemContainer}>
                      {isMediaVideo && mediaItem.path && typeof mediaItem.path === 'string' && mediaItem.path.trim() !== '' ? (
                        <View style={styles.videoContainer}>
                          <VideoPlayer
                            videoUrl={mediaItem.path.trim()}
                            postId={item.id}
                            isLiked={item.is_liked}
                            isSaved={false}
                            likeCount={item.like_count}
                            commentCount={item.comment_count}
                            shareCount={item.share_count}
                            onLike={() => handleLike(item.id)}
                            onComment={() => router.push(`/post/${item.id}` as any)}
                            onShare={() => {
                              guard(() => {
                                // Uygulama içi paylaşım - create-post ekranına yönlendir
                                const shareContent = item.content || '';
                                const shareMediaUrls = item.media && item.media.length > 0 
                                  ? JSON.stringify(item.media.map((m: any) => m.path))
                                  : undefined;
                                
                                router.push({
                                  pathname: '/create-post',
                                  params: {
                                    content: shareContent,
                                    mediaUrls: shareMediaUrls,
                                  } as any,
                                });
                              }, 'Paylaşmak');
                            }}
                            onTag={() => {
                              router.push(`/post/${item.id}` as any);
                            }}
                            onSave={() => {
                              Alert.alert('Bilgi', 'Kaydetme özelliği yakında eklenecek');
                            }}
                            autoPlay={mediaIndex === 0}
                            previewMode={true}
                            onFullScreen={() => {
                              router.push(`/video-feed?postId=${item.id}` as any);
                            }}
                          />
                        </View>
                      ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPostMedia(item.media || []);
                      setSelectedMediaIndex(mediaIndex);
                      setImageModalVisible(true);
                    }}
                          activeOpacity={0.9}
                          style={styles.imageContainer}
                        >
                          <OptimizedImage
                            source={mediaItem.path}
                            isThumbnail={true}
                            style={styles.postImage}
                            contentFit="cover"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              // Tek medya varsa normal gösterim
              <>
                {firstMedia && isVideo && firstMedia.path && typeof firstMedia.path === 'string' && firstMedia.path.trim() !== '' ? (
                  <View style={styles.videoContainer}>
                    <VideoPlayer
                      videoUrl={firstMedia.path.trim()}
                      postId={item.id}
                      isLiked={item.is_liked}
                      isSaved={false}
                      likeCount={item.like_count}
                      commentCount={item.comment_count}
                      shareCount={item.share_count}
                      onLike={() => handleLike(item.id)}
                      onComment={() => router.push(`/post/${item.id}` as any)}
                      onShare={() => {
                        guard(() => {
                          // Uygulama içi paylaşım - create-post ekranına yönlendir
                          const shareContent = item.content || '';
                          const shareMediaUrls = item.media && item.media.length > 0 
                            ? JSON.stringify(item.media.map((m: any) => m.path))
                            : undefined;
                          
                          router.push({
                            pathname: '/create-post',
                            params: {
                              content: shareContent,
                              mediaUrls: shareMediaUrls,
                            } as any,
                          });
                        }, 'Paylaşmak');
                      }}
                      onTag={() => {
                        router.push(`/post/${item.id}` as any);
                      }}
                      onSave={() => {
                        Alert.alert('Bilgi', 'Kaydetme özelliği yakında eklenecek');
                      }}
                      autoPlay={true}
                      previewMode={true}
                      onFullScreen={() => {
                        router.push(`/video-feed?postId=${item.id}` as any);
                      }}
                    />
                  </View>
                ) : firstMedia ? (
                  <TouchableOpacity
                    onPress={() => {
                      const mediaArray = item.media || [];
                      setSelectedPostMedia(mediaArray);
                      setSelectedMediaIndex(0);
                      setSelectedImage(mediaArray[0]?.path || null);
                      setImageModalVisible(true);
                    }}
                    activeOpacity={0.9}
                    style={styles.imageContainer}
                  >
                    <OptimizedImage
                      source={firstMedia.path}
                      isThumbnail={true}
                      style={styles.postImage}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                ) : null}
              </>
            )}
            
            {/* Medya sayısı göstergesi (birden fazla medya varsa) */}
            {item.media.length > 1 && (
              <View style={styles.mediaCountBadge}>
                <Text style={styles.mediaCountText}>{item.media.length}</Text>
              </View>
            )}
          </>
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


  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, SPACING.md) : 0 }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border, paddingTop: Math.max(insets.top, Platform.OS === 'android' ? SPACING.lg : SPACING.md) }]}>
        <AppLogo size="medium" style={styles.headerLogo} />
        <View style={styles.headerActions}>
          <WhatsAppComplaintButton />
          <TouchableOpacity
            style={[styles.headerActionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push('/ride/search')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Search size={18} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionButton, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.primary }]}
            onPress={() => router.push('/ride/create')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Car size={18} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.usersButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => router.push('/all-users')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Users size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {renderSortTabs}
      {renderDistrictFilter}

      {(feedError || eventsError) && !isLoading && !eventsLoading && (
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {(() => {
              const error = feedError || eventsError;
              const errorMessage = error?.message || '';
              
              // Network hatalarını yakala
              if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Network') || errorMessage.includes('Failed to fetch')) {
                return 'İnternet bağlantınızı kontrol edin';
              }
              
              // Supabase hatalarını yakala
              if (errorMessage.includes('Supabase') || errorMessage.includes('supabase') || errorMessage.includes('functions')) {
                return 'Sunucu bağlantı hatası. Lütfen daha sonra tekrar deneyin.';
              }
              
              // Auth hatalarını yakala
              if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('token') || errorMessage.includes('401')) {
                return 'Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapın.';
              }
              
              // NOT_FOUND hatalarını yakala
              if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('bulunamadı') || errorMessage.includes('not found')) {
                return 'Veri bulunamadı. Lütfen sayfayı yenileyin.';
              }
              
              // Genel hata mesajı
              return errorMessage || 'Veriler yüklenirken bir hata oluştu';
            })()}
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
          <Text style={[styles.loadingText, { color: theme.colors.textLight }]}>Yükleniyor...</Text>
        </View>
      ) : combinedFeedData.length === 0 && !feedError && !eventsError ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>Henüz gönderi yok</Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textLight }]}>İlk gönderiyi sen oluştur!</Text>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => guard(() => router.push('/create-post'), 'Gönderi oluşturmak')}
          >
            <Plus size={20} color={COLORS.white} />
            <Text style={[styles.createButtonText, { color: COLORS.white }]}>Gönderi Oluştur</Text>
          </TouchableOpacity>
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

      {/* Uyarı Modal */}
      {warningModalVisible && (
        <Modal
          visible={warningModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setWarningModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalOverlayTouchable}
              activeOpacity={1}
              onPress={() => setWarningModalVisible(false)}
            />
            <View style={[styles.warningModalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.warningModalHeader}>
              <View style={styles.warningIconContainer}>
                <AlertTriangle size={24} color="#F59E0B" fill="#F59E0B" />
              </View>
              <Text style={[styles.warningModalTitle, { color: theme.colors.text }]}>
                Platform Politikası Uyarısı
              </Text>
              <TouchableOpacity
                onPress={() => setWarningModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={[styles.closeButtonText, { color: theme.colors.textLight }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.warningModalBody}>
              <Text style={[styles.warningReason, { color: theme.colors.text }]}>
                <Text style={{ fontWeight: '700' }}>Uyarı Nedeni:</Text> {selectedWarning?.warning_reason}
              </Text>
              
              {selectedWarning?.warning_message && (
                <Text style={[styles.warningMessage, { color: theme.colors.text }]}>
                  {selectedWarning.warning_message}
                </Text>
              )}

              <View style={[styles.warningDivider, { backgroundColor: theme.colors.border }]} />

              <Text style={[styles.warningContentTitle, { color: theme.colors.text }]}>
                Uyarı Verilen İçerik:
              </Text>

              {selectedWarningPost && (
                <View style={[styles.warningPostPreview, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                  <View style={styles.warningPostHeader}>
                    <OptimizedImage
                      source={selectedWarningPost.author?.avatar_url || 'https://via.placeholder.com/40'}
                      style={styles.warningPostAvatar}
                      isThumbnail={true}
                    />
                    <View style={styles.warningPostAuthorInfo}>
                      <Text style={[styles.warningPostAuthor, { color: theme.colors.text }]}>
                        {selectedWarningPost.author?.full_name}
                      </Text>
                      <Text style={[styles.warningPostDate, { color: theme.colors.textLight }]}>
                        {formatTimeAgo(selectedWarningPost.created_at)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.warningPostContent, { color: theme.colors.text }]}>
                    {selectedWarningPost.content}
                  </Text>
                  {selectedWarningPost.media && selectedWarningPost.media.length > 0 && (
                    <View style={styles.warningPostMedia}>
                      <OptimizedImage
                        source={selectedWarningPost.media[0].path}
                        style={styles.warningPostImage}
                        isThumbnail={true}
                      />
                    </View>
                  )}
                </View>
              )}

              <View style={[styles.warningDivider, { backgroundColor: theme.colors.border }]} />

              <Text style={[styles.warningActionText, { color: theme.colors.textLight }]}>
                Bu içeriği silerek uyarıyı kaldırabilirsiniz. Eğer içeriği silmezseniz, admin paneli tarafından silinebilir.
              </Text>
            </ScrollView>

            <View style={[styles.warningModalFooter, { borderTopColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[styles.warningModalButton, styles.warningModalButtonSecondary, { backgroundColor: theme.colors.border }]}
                onPress={() => setWarningModalVisible(false)}
              >
                <Text style={[styles.warningModalButtonText, { color: theme.colors.text }]}>
                  Kapat
                </Text>
              </TouchableOpacity>
              {selectedWarningPost && selectedWarningPost.author_id === user?.id && (
                <TouchableOpacity
                  style={[styles.warningModalButton, styles.warningModalButtonPrimary]}
                  onPress={() => {
                    Alert.alert(
                      'Gönderiyi Sil',
                      'Bu gönderiyi silmek istediğinizden emin misiniz? Uyarı da kaldırılacak.',
                      [
                        { text: 'İptal', style: 'cancel' },
                        {
                          text: 'Sil',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await deletePostMutation.mutateAsync({ postId: selectedWarningPost.id });
                              setWarningModalVisible(false);
                              refetch();
                            } catch (error: any) {
                              Alert.alert('Hata', error.message || 'Gönderi silinemedi');
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={[styles.warningModalButtonText, { color: COLORS.white }]}>
                    Gönderiyi Sil
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
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
        onPress={() => guard(() => router.push('/create-post'), 'Gönderi oluşturmak')}
      >
        <Plus size={24} color={COLORS.white} />
      </TouchableOpacity>

      {/* Full Screen Image Modal - Yatay Scroll ile */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setImageModalVisible(false);
          setSelectedPostMedia([]);
          setSelectedMediaIndex(0);
        }}
      >
        <View style={styles.fullScreenModal}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => {
              setImageModalVisible(false);
              setSelectedPostMedia([]);
              setSelectedMediaIndex(0);
            }}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          
          {/* Birden fazla resim varsa yatay scroll */}
          {selectedPostMedia.length > 1 ? (
            <ScrollView
              ref={modalScrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.modalMediaScrollView}
              contentContainerStyle={styles.modalMediaScrollContent}
              onLayout={() => {
                // Modal açıldığında seçili index'e scroll yap
                if (modalScrollViewRef.current && selectedMediaIndex > 0) {
                  setTimeout(() => {
                    modalScrollViewRef.current?.scrollTo({ 
                      x: Dimensions.get('window').width * selectedMediaIndex, 
                      animated: false 
                    });
                  }, 100);
                }
              }}
              onScroll={(event) => {
                const offsetX = event.nativeEvent.contentOffset.x;
                const width = Dimensions.get('window').width;
                const index = Math.round(offsetX / width);
                setSelectedMediaIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {selectedPostMedia.map((mediaItem: any, index: number) => (
                <View
                  key={index}
                  style={{ width: Dimensions.get('window').width, flex: 1 }}
                >
                  <ScrollView
                    contentContainerStyle={styles.modalImageContainer}
                    maximumZoomScale={3}
                    minimumZoomScale={1}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                  >
                    <Image
                      source={{ uri: mediaItem.path }}
                      style={styles.fullScreenImage}
                      contentFit="contain"
                      transition={200}
                      cachePolicy="memory-disk"
                      priority="high"
                      allowDownscaling={false}
                      contentPosition="center"
                    />
                  </ScrollView>
                </View>
              ))}
            </ScrollView>
          ) : (
            // Tek resim varsa normal gösterim
            <ScrollView
              contentContainerStyle={styles.modalImageContainer}
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              {(selectedImage || (selectedPostMedia.length > 0 && selectedPostMedia[0]?.path)) && (
                <Image
                  source={{ uri: selectedImage || selectedPostMedia[0]?.path }}
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
          )}
          
          {/* Medya sayacı (birden fazla resim varsa) */}
          {selectedPostMedia.length > 1 && (
            <View style={styles.modalMediaCounter}>
              <Text style={styles.modalMediaCounterText}>
                {selectedMediaIndex + 1} / {selectedPostMedia.length}
              </Text>
            </View>
          )}
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
                 {selectedVideo && typeof selectedVideo === 'string' && selectedVideo.trim() !== '' ? (
                   <VideoPlayer
                     videoUrl={selectedVideo.trim()}
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
                 ) : null}
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
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.xs,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  usersButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: 2,
    marginLeft: SPACING.xs,
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
    marginVertical: 0,
    borderRadius: 0,
    width: '100%',
    overflow: 'hidden',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  postHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
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
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.md * 1.2,
    }),
  },
  postUsernameContainer: {
    flexShrink: 1,
    marginTop: 2,
    minWidth: 0,
  },
  postUsername: {
    fontSize: FONT_SIZES.xs,
    flexShrink: 1,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.xs * 1.3,
    }),
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
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
  },
  postTimeContainer: {
    flexShrink: 0,
  },
  postTime: {
    fontSize: FONT_SIZES.sm,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
  },
  postContentContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    width: '100%',
  },
  postContent: {
    fontSize: FONT_SIZES.md,
    lineHeight: Platform.OS === 'android' ? FONT_SIZES.md * 1.4 : 20,
    width: '100%',
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
    }),
  },
  imageContainer: {
    width: Dimensions.get('window').width,
    marginHorizontal: 0,
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: SPACING.sm,
    flexShrink: 0,
  },
  postImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 0,
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  videoContainer: {
    width: Dimensions.get('window').width,
    marginHorizontal: 0,
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    flexShrink: 0,
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
    // resizeMode removed - expo-image uses contentFit prop instead
  },
  mediaScrollView: {
    width: '100%',
  },
  mediaScrollContent: {
    flexDirection: 'row',
  },
  mediaItemContainer: {
    width: Dimensions.get('window').width,
    flexShrink: 0,
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
  modalMediaScrollView: {
    flex: 1,
    width: '100%',
  },
  modalMediaScrollContent: {
    alignItems: 'center',
  },
  modalMediaCounter: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
  },
  modalMediaCounterText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
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
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: SPACING.xxl,
    minHeight: 400,
  },
  emptyText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
    marginBottom: SPACING.sm,
    textAlign: 'center' as const,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center' as const,
    marginBottom: SPACING.xl,
    opacity: 0.7,
  },
  createButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: SPACING.xl,
    minHeight: 400,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center' as const,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  retryButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    minWidth: 120,
  },
  retryButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.white,
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
  eventDeleteButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  warningBadge: {
    position: 'absolute' as const,
    top: SPACING.sm,
    right: SPACING.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B20',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: '#F59E0B',
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    position: 'relative' as const,
  },
  modalOverlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  warningModalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: SPACING.md,
  },
  warningModalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  warningIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B20',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  warningModalTitle: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700' as const,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  closeButtonText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
  },
  warningModalBody: {
    maxHeight: 400,
  },
  warningReason: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.sm,
    lineHeight: 22,
  },
  warningMessage: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  warningDivider: {
    height: 1,
    marginVertical: SPACING.md,
  },
  warningContentTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700' as const,
    marginBottom: SPACING.sm,
  },
  warningPostPreview: {
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  warningPostHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  warningPostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  warningPostAuthorInfo: {
    flex: 1,
  },
  warningPostAuthor: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700' as const,
  },
  warningPostDate: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  warningPostContent: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  warningPostMedia: {
    marginTop: SPACING.sm,
  },
  warningPostImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  warningActionText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
    textAlign: 'center' as const,
    marginTop: SPACING.sm,
  },
  warningModalFooter: {
    flexDirection: 'row' as const,
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  warningModalButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  warningModalButtonSecondary: {
    // backgroundColor dinamik olarak theme.colors.border
  },
  warningModalButtonPrimary: {
    backgroundColor: COLORS.error,
  },
  warningModalButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
  },
});
