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
} from 'react-native';
import { Image } from 'expo-image';

import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { DISTRICTS, DISTRICT_BADGES } from '@/constants/districts';
import { Post, District } from '@/types/database';
import { Heart, MessageCircle, Share2, Plus, Users, TrendingUp, MoreVertical, AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { AppLogo } from '@/components/AppLogo';
import { SupporterBadge } from '@/components/SupporterBadge';
import { formatTimeAgo } from '@/lib/time-utils';
import { Footer } from '@/components/Footer';

type SortType = 'new' | 'hot' | 'trending';

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [selectedDistrict, setSelectedDistrict] = useState<District | 'all'>('all');
  const [sortType, setSortType] = useState<SortType>('new');

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
    refetch,
  } = trpc.post.getPosts.useQuery(
    {
      district: selectedDistrict === 'all' ? undefined : selectedDistrict,
      sort: sortType,
      limit: 20,
      offset: 0,
    } as any,
    {
      staleTime: 30000,
      gcTime: 300000,
    }
  );

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
    <View style={styles.sortContainer}>
      <TouchableOpacity
        style={[styles.sortTab, sortType === 'new' && styles.sortTabActive]}
        onPress={() => setSortType('new')}
      >
        <Text style={[styles.sortText, sortType === 'new' && styles.sortTextActive]}>
          En Yeni
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.sortTab, sortType === 'trending' && styles.sortTabActive]}
        onPress={() => setSortType('trending')}
      >
        <TrendingUp
          size={16}
          color={sortType === 'trending' ? COLORS.white : COLORS.text}
        />
        <Text style={[styles.sortText, sortType === 'trending' && styles.sortTextActive]}>
          Trending
        </Text>
      </TouchableOpacity>
    </View>
  ), [sortType]);

  const renderDistrictFilter = useMemo(() => (
    <View style={styles.filterContainer}>
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
              selectedDistrict === item.id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedDistrict(item.id as District | 'all')}
          >
            <Text style={styles.filterEmoji}>{item.badge}</Text>
            <Text
              style={[
                styles.filterText,
                selectedDistrict === item.id && styles.filterTextActive,
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  ), [selectedDistrict]);

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

  const renderPost = useCallback(({ item }: { item: Post }) => {
    const firstMedia = item.media && item.media.length > 0 ? item.media[0] : null;

    return (
      <TouchableOpacity
        style={styles.postCard}
        onPress={() => router.push(`/post/${item.id}` as any)}
      >
        <View style={styles.postHeader}>
          <TouchableOpacity
            onPress={() => item.author_id && router.push(`/profile/${item.author_id}` as any)}
            activeOpacity={0.7}
          >
            <Image
              source={{
                uri: item.author?.avatar_url || 'https://via.placeholder.com/40',
              }}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.postHeaderInfo}
            onPress={() => item.author_id && router.push(`/profile/${item.author_id}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.postAuthorContainer}>
              <Text style={styles.postAuthor}>
                {item.author?.full_name}
              </Text>
              {item.author?.supporter_badge && item.author?.supporter_badge_visible && (
                <SupporterBadge 
                  visible={true} 
                  size="small" 
                  color={item.author?.supporter_badge_color as 'yellow' | 'green' | 'blue' | 'red' | null}
                />
              )}
            </View>
            {item.author?.username && (
              <View style={styles.postUsernameContainer}>
                <Text style={styles.postUsername}>
                  @{item.author.username}
                </Text>
              </View>
            )}
            <View style={styles.postMeta}>
              <View style={styles.postDistrictContainer}>
                <Text style={styles.postDistrict}>
                  {DISTRICT_BADGES[item.district]} {item.district}
                </Text>
              </View>
              <View style={styles.postTimeContainer}>
                <Text style={styles.postTime}>
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
              <MoreVertical size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.postContentContainer}>
          <Text 
            style={styles.postContent}
            numberOfLines={10}
            ellipsizeMode="tail"
          >
            {item.content}
          </Text>
        </View>

        {firstMedia && (
          <Image
            source={{ uri: firstMedia.path }}
            style={styles.postImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        )}

        {item.media && item.media.length > 1 && (
          <View style={styles.mediaCountBadge}>
            <Text style={styles.mediaCountText}>+{item.media.length - 1}</Text>
          </View>
        )}

        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <Heart
              size={20}
              color={item.is_liked ? COLORS.error : COLORS.textLight}
              fill={item.is_liked ? COLORS.error : 'transparent'}
            />
            <Text style={styles.actionText}>{formatCount(item.like_count)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/post/${item.id}` as any)}
          >
            <MessageCircle size={20} color={COLORS.textLight} />
            <Text style={styles.actionText}>{formatCount(item.comment_count)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Share2 size={20} color={COLORS.textLight} />
            <Text style={styles.actionText}>{formatCount(item.share_count)}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [handleLike, router, formatCount, user?.id, handlePostOptions]);

  return (
    <View style={[styles.container, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, SPACING.md) : 0 }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? SPACING.lg : SPACING.md) }]}>
        <AppLogo size="medium" style={styles.headerLogo} />
        <TouchableOpacity
          style={styles.usersButton}
          onPress={() => router.push('/all-users')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Users size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {renderSortTabs}
      {renderDistrictFilter}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={feedData?.posts || []}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feedList}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          getItemLayout={(data, index) => ({
            length: 400, // Approximate post height
            offset: 400 * index,
            index,
          })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Henüz gönderi yok</Text>
              <Text style={styles.emptySubtext}>
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

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    backgroundColor: COLORS.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: 2,
  },
  sortContainer: {
    flexDirection: 'row' as const,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  sortTab: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    gap: SPACING.xs,
  },
  sortTabActive: {
    backgroundColor: COLORS.primary,
  },
  sortText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600' as const,
  },
  sortTextActive: {
    color: COLORS.white,
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    marginHorizontal: SPACING.xs,
    gap: SPACING.xs,
    flexShrink: 0, // Android'de metinlerin kesilmemesi için
    flexGrow: 0, // Horizontal scroll için genişlememeli
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterEmoji: {
    fontSize: FONT_SIZES.sm,
    flexShrink: 0,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flexShrink: 0, // Android'de metinlerin tam görünmesi için
  },
  filterTextActive: {
    color: COLORS.white,
    fontWeight: '600' as const,
  },
  feedList: {
    paddingVertical: SPACING.sm,
  },
  postCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    borderRadius: 12,
  },
  postHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: SPACING.md,
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
  },
  postAuthorContainer: {
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.xs,
  },
  postAuthor: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  postUsernameContainer: {
    flex: 1,
    flexShrink: 1,
    marginTop: 2,
  },
  postUsername: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  postMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 2,
    flex: 1,
    flexShrink: 1,
  },
  postDistrictContainer: {
    flex: 1,
    flexShrink: 1,
  },
  postDistrict: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  postTimeContainer: {
    flexShrink: 0,
  },
  postTime: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  postContentContainer: {
    flex: 1,
    flexShrink: 1,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  postContent: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 20,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  postImage: {
    width: '100%',
    aspectRatio: 16 / 9, // Responsive aspect ratio
    maxHeight: 400,
    minHeight: 200,
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
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.xs,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
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
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center' as const,
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
});
