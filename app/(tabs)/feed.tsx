import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { DISTRICTS, DISTRICT_BADGES } from '@/constants/districts';
import { Post, District } from '@/types/database';
import { Heart, MessageCircle, Share2, Plus, Users, TrendingUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

type SortType = 'new' | 'hot' | 'trending';

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selectedDistrict, setSelectedDistrict] = useState<District | 'all'>('all');
  const [sortType, setSortType] = useState<SortType>('new');

  const formatCount = (count: number | null | undefined): string => {
    if (!count) return '0';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Kişiselleştirilmiş feed kullan (eğer kullanıcı giriş yaptıysa)
  const { data: personalizedFeedData, isLoading: isLoadingPersonalized } = trpc.post.getPersonalizedFeed.useQuery(
    { limit: 20, offset: 0 },
    { enabled: !!user?.id }
  );

  // Fallback: Normal feed (giriş yapmamış kullanıcılar için)
  const { data: postsData, isLoading: isLoadingNormal, refetch } = trpc.post.getPosts.useQuery({
    district: selectedDistrict === 'all' ? undefined : selectedDistrict,
    sort: sortType,
    limit: 20,
    offset: 0,
  }, {
    enabled: !user?.id, // Sadece giriş yapmamış kullanıcılar için
  });

  // Hangi feed'i kullanacağız?
  const feedData = user?.id ? personalizedFeedData : postsData;
  const isLoading = user?.id ? isLoadingPersonalized : isLoadingNormal;

  const likePostMutation = trpc.post.likePost.useMutation({
    onSuccess: () => {
      if (user?.id) {
        // Personalized feed için refetch yok, query otomatik güncellenir
      } else {
        refetch();
      }
    },
  });

  const handleLike = async (postId: string) => {
    try {
      await likePostMutation.mutateAsync({ postId });
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const renderSortTabs = () => (
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
  );

  const renderDistrictFilter = () => (
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
  );

  const renderPost = ({ item }: { item: Post }) => {
    const firstMedia = item.media && item.media.length > 0 ? item.media[0] : null;

    return (
      <TouchableOpacity
        style={styles.postCard}
        onPress={() => router.push(`/post/${item.id}` as any)}
      >
        <View style={styles.postHeader}>
          <Image
            source={{
              uri: item.author?.avatar_url || 'https://via.placeholder.com/40',
            }}
            style={styles.avatar}
          />
          <View style={styles.postHeaderInfo}>
            <Text style={styles.postAuthor}>{item.author?.full_name}</Text>
            <View style={styles.postMeta}>
              <Text style={styles.postDistrict}>
                {DISTRICT_BADGES[item.district]} {item.district}
              </Text>
              <Text style={styles.postTime}>
                {' • '}
                {new Date(item.created_at).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.postContent} numberOfLines={10}>
          {item.content}
        </Text>

        {firstMedia && (
          <Image
            source={{ uri: firstMedia.path }}
            style={styles.postImage}
            resizeMode="cover"
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
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, SPACING.md) }]}>
        <Text style={styles.headerTitle}>MyTrabzon</Text>
        <TouchableOpacity
          style={styles.usersButton}
          onPress={() => router.push('/all-users')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Users size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {renderSortTabs()}
      {renderDistrictFilter()}

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
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create-post')}
      >
        <Plus size={28} color={COLORS.white} />
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
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700' as const,
    color: COLORS.primary,
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
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterEmoji: {
    fontSize: FONT_SIZES.sm,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
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
    overflow: 'hidden' as const,
  },
  postHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: SPACING.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm,
  },
  postHeaderInfo: {
    flex: 1,
  },
  postAuthor: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  postMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 2,
  },
  postDistrict: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  postTime: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  postContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 20,
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
    bottom: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
