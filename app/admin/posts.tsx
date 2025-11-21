import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Trash2, Eye, AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { trpc } from '../../lib/trpc';
import { Footer } from '@/components/Footer';

export default function AdminPostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = trpc.admin.getAllPosts.useQuery({
    search: search || undefined,
    limit: 100,
    offset: 0,
  });

  const deletePostMutation = trpc.admin.deletePost.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Başarılı', 'Gönderi silindi');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
    },
  });

  const warnPostMutation = (trpc as any).admin.warnPost.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Başarılı', 'Uyarı verildi');
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Uyarı verilemedi');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (postId: string, content: string) => {
    Alert.alert(
      'Gönderiyi Sil',
      `Bu gönderiyi silmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            deletePostMutation.mutate({ postId });
          },
        },
      ]
    );
  };

  const handleWarn = (postId: string) => {
    Alert.prompt(
      'Uyarı Ver',
      'Uyarı nedeni:',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Uyarı Ver',
          onPress: (reason) => {
            if (reason && reason.trim()) {
              Alert.prompt(
                'Uyarı Mesajı (Opsiyonel)',
                'Kullanıcıya gösterilecek mesaj:',
                [
                  { text: 'İptal', style: 'cancel' },
                  {
                    text: 'Gönder',
                    onPress: (message) => {
                      warnPostMutation.mutate({
                        postId,
                        warningReason: reason.trim(),
                        warningMessage: message?.trim() || undefined,
                      });
                    },
                  },
                ],
                'plain-text'
              );
            }
          },
        },
      ],
      'plain-text'
    );
  };

  if (isLoading && !data) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gönderi Yönetimi</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Gönderi ara..."
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {data?.posts && data.posts.length > 0 ? (
          data.posts.map((post: any) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <Image
                  source={{ uri: post.author?.avatar_url || 'https://via.placeholder.com/40' }}
                  style={styles.avatar}
                />
                <View style={styles.postAuthorInfo}>
                  <Text style={styles.postAuthor}>{post.author?.full_name || 'İsimsiz'}</Text>
                  <Text style={styles.postDate}>
                    {new Date(post.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
              <Text style={styles.postContent} numberOfLines={5}>
                {post.content}
              </Text>
              {post.post_media && post.post_media.length > 0 && (
                <View style={styles.mediaContainer}>
                  <Image
                    source={{ uri: post.post_media[0].url || post.post_media[0].path }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                  {post.post_media.length > 1 && (
                    <Text style={styles.mediaCount}>+{post.post_media.length - 1} daha</Text>
                  )}
                </View>
              )}
              <View style={styles.postStats}>
                <Text style={styles.statText}>❤️ {post.like_count || 0}</Text>
                <Text style={styles.statText}>💬 {post.comment_count || 0}</Text>
                <Text style={styles.statText}>📤 {post.share_count || 0}</Text>
              </View>
              <View style={styles.postActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.viewButton]}
                  onPress={() => router.push(`/post/${post.id}` as any)}
                >
                  <Eye size={18} color={COLORS.primary} />
                  <Text style={styles.actionButtonText}>Görüntüle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.warnButton]}
                  onPress={() => handleWarn(post.id)}
                >
                  <AlertTriangle size={18} color={COLORS.warning || '#F59E0B'} />
                  <Text style={[styles.actionButtonText, styles.warnButtonText]}>Uyarı</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(post.id, post.content)}
                >
                  <Trash2 size={18} color={COLORS.error} />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Sil</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Gönderi bulunamadı</Text>
          </View>
        )}
        
        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
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
  placeholder: {
    width: 40,
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  postCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm,
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthor: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  postDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  postContent: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  mediaContainer: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  mediaCount: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  postStats: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  postActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  viewButton: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  warnButton: {
    backgroundColor: (COLORS.warning || '#F59E0B') + '20',
    borderColor: COLORS.warning || '#F59E0B',
  },
  deleteButton: {
    backgroundColor: COLORS.error + '20',
    borderColor: COLORS.error,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  warnButtonText: {
    color: COLORS.warning || '#F59E0B',
  },
  deleteButtonText: {
    color: COLORS.error,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
});

