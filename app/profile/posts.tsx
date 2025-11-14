import React from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { DISTRICT_BADGES } from '@/constants/districts';
import { Post } from '@/types/database';
import { Heart, MessageCircle, Share2, MoreVertical, ArrowLeft } from 'lucide-react-native';

export default function ProfilePostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: postsData, isLoading, refetch, isRefetching } = trpc.post.getPosts.useQuery({
    author_id: user?.id,
    limit: 50,
    offset: 0,
  }, {
    enabled: !!user?.id,
  });

  const deletePostMutation = trpc.post.deletePost.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const sharePostMutation = trpc.post.sharePost.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const likePostMutation = trpc.post.likePost.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const formatPostTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} sa önce`;
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const handleDeletePost = (postId: string) => {
    const { Alert } = require('react-native');
    Alert.alert(
      'Gönderiyi Sil',
      'Bu gönderiyi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deletePostMutation.mutateAsync({ postId });
              if (result?.softDeleted) {
                Alert.alert(
                  'Gönderi Arşivlendi',
                  'Bu gönderi paylaşıldığı için arşivlendi. Paylaşımlar devam edecek.'
                );
              } else {
                Alert.alert('Başarılı', 'Gönderi silindi');
              }
              refetch();
            } catch (error: any) {
              const errorMessage = error?.message || 'Gönderi silinirken bir hata oluştu';
              Alert.alert('Hata', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleSharePost = async (postId: string) => {
    try {
      await sharePostMutation.mutateAsync({ post_id: postId, share_to: 'feed' });
    } catch (error) {
      console.error('Share post error:', error);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await likePostMutation.mutateAsync({ postId });
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

  const renderPost = ({ item }: { item: Post }) => {
    const firstMedia = item.media && item.media.length > 0 ? item.media[0] : null;

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.postHeaderInfo}>
            <View style={styles.postMetaRow}>
              <Text style={styles.postDistrict}>
                {DISTRICT_BADGES[item.district as keyof typeof DISTRICT_BADGES] || '📍'} {item.district}
              </Text>
              <Text style={styles.postTime}>
                {formatPostTime(item.created_at)}
                {item.edited && ' • Düzenlendi'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              const { Alert } = require('react-native');
              Alert.alert(
                'Gönderi Seçenekleri',
                '',
                [
                  { text: 'İptal', style: 'cancel' },
                  {
                    text: 'Düzenle',
                    onPress: () => router.push(`/create-post?edit=${item.id}` as any),
                  },
                  {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: () => handleDeletePost(item.id),
                  },
                ]
              );
            }}
          >
            <MoreVertical size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push(`/post/${item.id}` as any)}>
          <Text style={styles.postContent} numberOfLines={5}>
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
        </TouchableOpacity>

        <View style={styles.postActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <Heart 
              size={18} 
              color={item.is_liked ? COLORS.error : COLORS.textLight} 
              fill={item.is_liked ? COLORS.error : 'transparent'} 
            />
            <Text style={styles.actionText}>{formatCount(item.like_count)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/post/${item.id}` as any)}
          >
            <MessageCircle size={18} color={COLORS.textLight} />
            <Text style={styles.actionText}>{formatCount(item.comment_count)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSharePost(item.id)}
          >
            <Share2 size={18} color={COLORS.textLight} />
            <Text style={styles.actionText}>{formatCount(item.share_count)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gönderilerim</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={postsData?.posts || []}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Henüz gönderi yok</Text>
              <Text style={styles.emptySubtext}>İlk paylaşımı yapan sen ol!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  listContent: {
    paddingVertical: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  postHeaderInfo: {
    flex: 1,
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  postDistrict: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  postTime: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  postContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 250,
    marginTop: SPACING.sm,
  },
  mediaCountBadge: {
    position: 'absolute',
    top: 60,
    right: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mediaCountText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});

