import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,

  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { DISTRICT_BADGES } from '@/constants/districts';
import {
  Heart,
  MessageCircle,
  Share2,
  Send,
  ArrowLeft,
  MoreVertical,
} from 'lucide-react-native';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');

  const formatCount = (count: number | null | undefined): string => {
    if (!count) return '0';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const { data: post, isLoading, refetch } = trpc.post.getPostDetail.useQuery({
    postId: id!,
  });

  const { data: commentsData, refetch: refetchComments } = trpc.post.getComments.useQuery({
    post_id: id!,
    limit: 50,
    offset: 0,
  });

  const likePostMutation = trpc.post.likePost.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const addCommentMutation = trpc.post.addComment.useMutation({
    onSuccess: () => {
      setCommentText('');
      refetchComments();
      refetch();
    },
  });

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Hata', 'Beğenmek için giriş yapmalısınız');
      return;
    }
    try {
      await likePostMutation.mutateAsync({ postId: id! });
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      Alert.alert('Hata', 'Yorum yapmak için giriş yapmalısınız');
      return;
    }
    if (!commentText.trim()) {
      return;
    }
    try {
      await addCommentMutation.mutateAsync({
        post_id: id!,
        content: commentText.trim(),
      });
    } catch (error) {
      console.error('Comment error:', error);
      Alert.alert('Hata', 'Yorum eklenirken bir hata oluştu');
    }
  };

  if (isLoading || !post) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Gönderi',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content}>
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <Image
              source={{
                uri: post.author?.avatar_url || 'https://via.placeholder.com/40',
              }}
              style={styles.avatar}
            />
            <View style={styles.postHeaderInfo}>
              <Text style={styles.postAuthor}>{post.author?.full_name}</Text>
              <View style={styles.postMeta}>
                <Text style={styles.postDistrict}>
                  {DISTRICT_BADGES[post.district as keyof typeof DISTRICT_BADGES] || '📍'} {post.district}
                </Text>
                <Text style={styles.postTime}>
                  {' • '}
                  {new Date(post.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
            {post.author_id === user?.id && (
              <TouchableOpacity>
                <MoreVertical size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.postContent}>{post.content}</Text>

          {post.media && post.media.length > 0 && (
            <ScrollView horizontal pagingEnabled style={styles.mediaContainer}>
              {post.media.map((mediaItem: any, index: number) => (
                <Image
                  key={index}
                  source={{ uri: mediaItem.path }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          )}

          <View style={styles.postActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Heart
                size={24}
                color={post.is_liked ? COLORS.error : COLORS.textLight}
                fill={post.is_liked ? COLORS.error : 'transparent'}
              />
              <Text style={styles.actionText}>{formatCount(post.like_count)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MessageCircle size={24} color={COLORS.textLight} />
              <Text style={styles.actionText}>{formatCount(post.comment_count)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Share2 size={24} color={COLORS.textLight} />
              <Text style={styles.actionText}>{formatCount(post.share_count)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Yorumlar ({commentsData?.total || 0})
          </Text>

          {commentsData?.comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <Image
                source={{
                  uri: comment.user?.avatar_url || 'https://via.placeholder.com/32',
                }}
                style={styles.commentAvatar}
              />
              <View style={styles.commentContent}>
                <Text style={styles.commentAuthor}>{comment.user?.full_name}</Text>
                <Text style={styles.commentText}>{comment.content}</Text>
                <Text style={styles.commentTime}>
                  {new Date(comment.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.commentInputContainer}>
        <Image
          source={{
            uri: user?.avatar_url || 'https://via.placeholder.com/32',
          }}
          style={styles.commentInputAvatar}
        />
        <TextInput
          style={styles.commentInput}
          placeholder="Yorum yaz..."
          placeholderTextColor={COLORS.textLight}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !commentText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleAddComment}
          disabled={!commentText.trim() || addCommentMutation.isPending}
        >
          {addCommentMutation.isPending ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Send size={20} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  content: {
    flex: 1,
  },
  postCard: {
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
  },
  postHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: SPACING.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.md,
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
    marginTop: 4,
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
    lineHeight: 22,
  },
  mediaContainer: {
    maxHeight: 400,
  },
  postImage: {
    width: '100%',
    aspectRatio: 16 / 9, // Responsive aspect ratio
    maxHeight: 400,
    minHeight: 200,
  },
  postActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.xl,
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
  },
  actionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    fontWeight: '600' as const,
  },
  commentsSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
  },
  commentsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  commentCard: {
    flexDirection: 'row' as const,
    marginBottom: SPACING.md,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: SPACING.sm,
  },
  commentContent: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: 12,
  },
  commentAuthor: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  commentText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  commentInputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  commentInputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
});
