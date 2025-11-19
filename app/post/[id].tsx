import React, { useState, useRef } from 'react';
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
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { DISTRICT_BADGES } from '@/constants/districts';
import { useQueryClient } from '@tanstack/react-query';
import {
  Heart,
  MessageCircle,
  Share2,
  Send,
  ArrowLeft,
  MoreVertical,
  Trash2,
  Edit3,
} from 'lucide-react-native';
import { Footer } from '@/components/Footer';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';
import { OptimizedImage } from '@/components/OptimizedImage';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const insets = useSafeAreaInsets();
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [menuVisibleCommentId, setMenuVisibleCommentId] = useState<string | null>(null);
  const commentInputRef = useRef<TextInput>(null);

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
    onMutate: async ({ postId }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: [['post', 'getPostDetail'], { postId: id! }] });
      const previousData = queryClient.getQueryData([['post', 'getPostDetail'], { postId: id! }]);
      
      queryClient.setQueryData([['post', 'getPostDetail'], { postId: id! }], (old: any) => {
        if (!old) return old;
        const isCurrentlyLiked = old.is_liked;
        return {
          ...old,
          is_liked: !isCurrentlyLiked,
          like_count: (old.like_count || 0) + (isCurrentlyLiked ? -1 : 1),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([['post', 'getPostDetail'], { postId: id! }], context.previousData);
      }
    },
    onSettled: () => {
      refetch();
    },
  });

  const addCommentMutation = trpc.post.addComment.useMutation({
    onMutate: async ({ content }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: [['post', 'getComments'], { post_id: id!, limit: 50, offset: 0 }] });
      await queryClient.cancelQueries({ queryKey: [['post', 'getPostDetail'], { postId: id! }] });
      
      const previousComments = queryClient.getQueryData([['post', 'getComments'], { post_id: id!, limit: 50, offset: 0 }]);
      const previousPost = queryClient.getQueryData([['post', 'getPostDetail'], { postId: id! }]);

      // Optimistically add comment
      if (user) {
        queryClient.setQueryData([['post', 'getComments'], { post_id: id!, limit: 50, offset: 0 }], (old: any) => {
          const newComment = {
            id: `temp-${Date.now()}`,
            post_id: id!,
            user_id: user.id,
            content,
            like_count: 0,
            created_at: new Date().toISOString(),
            user: {
              id: user.id,
              full_name: profile?.full_name || user.user_metadata?.full_name || 'Kullanıcı',
              avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
            },
          };
          return {
            ...old,
            comments: [newComment, ...(old?.comments || [])],
          };
        });

        // Update comment count
        queryClient.setQueryData([['post', 'getPostDetail'], { postId: id! }], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            comment_count: (old.comment_count || 0) + 1,
          };
        });
      }

      return { previousComments, previousPost };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData([['post', 'getComments'], { post_id: id!, limit: 50, offset: 0 }], context.previousComments);
      }
      if (context?.previousPost) {
        queryClient.setQueryData([['post', 'getPostDetail'], { postId: id! }], context.previousPost);
      }
    },
    onSuccess: () => {
      setCommentText('');
    },
    onSettled: () => {
      refetchComments();
      refetch();
    },
  });

  const deletePostMutation = trpc.post.deletePost.useMutation({
    onSuccess: async () => {
      Alert.alert('Başarılı', 'Gönderi silindi');
      await utils.post.getPosts.invalidate();
      router.back();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Gönderi silinemedi';
      Alert.alert('Hata', message);
    },
  });

  const deleteCommentMutation = trpc.post.deleteComment.useMutation({
    onSuccess: () => {
      Keyboard.dismiss(); // Klavyeyi kapat
      setMenuVisibleCommentId(null);
      refetchComments();
      refetch();
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Yorum silinemedi. Lütfen tekrar deneyin.');
    },
  });

  const updateCommentMutation = (trpc.post as any).updateComment.useMutation({
    onSuccess: () => {
      setEditingCommentId(null);
      setEditingCommentText('');
      setMenuVisibleCommentId(null);
      refetchComments();
      refetch();
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Yorum güncellenemedi. Lütfen tekrar deneyin.');
    },
  });

  const handleDeletePost = () => {
    if (!post) return;

    Alert.alert(
      'Gönderiyi Sil',
      'Bu gönderiyi silmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => deletePostMutation.mutate({ postId: post.id }),
        },
      ]
    );
  };

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
    // Klavyeyi kapat ve input'u blur et
    Keyboard.dismiss();
    commentInputRef.current?.blur();
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

  const handleDeleteComment = (commentId: string) => {
    Alert.alert(
      'Yorumu Sil',
      'Bu yorumu silmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => deleteCommentMutation.mutate({ commentId }),
        },
      ]
    );
  };

  const handleEditComment = (commentId: string, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(currentContent);
    setMenuVisibleCommentId(null);
  };

  const handleSaveEdit = () => {
    if (!editingCommentId || !editingCommentText.trim()) return;
    updateCommentMutation.mutate({
      commentId: editingCommentId,
      content: editingCommentText.trim(),
    });
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      enabled={true}
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

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <TouchableOpacity
              onPress={() => post.author_id && router.push(`/profile/${post.author_id}` as any)}
              activeOpacity={0.7}
            >
              <Image
                source={{
                  uri: (Array.isArray(post.author) ? (post.author as any)[0]?.avatar_url : (post.author as any)?.avatar_url) || 'https://via.placeholder.com/40',
                }}
                style={styles.avatar}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.postHeaderInfo}
              onPress={() => post.author_id && router.push(`/profile/${post.author_id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.postAuthorContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.postAuthor}>
                    {Array.isArray(post.author) ? (post.author as any)[0]?.full_name : (post.author as any)?.full_name}
                  </Text>
                  {(Array.isArray(post.author) ? (post.author as any)[0]?.verified : (post.author as any)?.verified) && <VerifiedBadgeIcon size={16} />}
                </View>
              </View>
              {(Array.isArray(post.author) ? (post.author as any)[0]?.username : (post.author as any)?.username) && (
                <View style={styles.postUsernameContainer}>
                  <Text style={styles.postUsername}>
                    @{Array.isArray(post.author) ? (post.author as any)[0]?.username : (post.author as any)?.username}
                  </Text>
                </View>
              )}
              <View style={styles.postMeta}>
                <View style={styles.postDistrictContainer}>
                  <Text style={styles.postDistrict}>
                    {DISTRICT_BADGES[post.district as keyof typeof DISTRICT_BADGES] || '📍'} {post.district}
                  </Text>
                </View>
                <View style={styles.postTimeContainer}>
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
            </TouchableOpacity>
            {post.author_id === user?.id && (
              <TouchableOpacity 
                onPress={handleDeletePost}
                disabled={deletePostMutation.isPending}
                style={styles.deleteButton}
              >
                <Trash2 size={20} color={COLORS.error} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.postContentContainer}>
            <Text style={styles.postContent}>{post.content}</Text>
          </View>

          {post.media && post.media.length > 0 && (
            <ScrollView horizontal pagingEnabled style={styles.mediaContainer}>
              {post.media.map((mediaItem: any, index: number) => (
                <OptimizedImage
                  key={index}
                  source={mediaItem.path}
                  thumbnail={mediaItem.thumbnail}
                  isThumbnail={false}
                  style={styles.postImage}
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

          {commentsData?.comments.map((comment) => {
            const isEditing = editingCommentId === comment.id;
            const isOwner = comment.user_id === user?.id;
            
            return (
              <TouchableOpacity 
                key={comment.id} 
                style={styles.commentCard}
                activeOpacity={0.9}
                onPress={() => {
                  // Yorum kartına tıklanınca klavye kapansın
                  Keyboard.dismiss();
                  setMenuVisibleCommentId(null);
                }}
              >
                <Image
                  source={{
                    uri: comment.user?.avatar_url || 'https://via.placeholder.com/32',
                  }}
                  style={styles.commentAvatar}
                />
                <View style={styles.commentContent}>
                  <View style={styles.commentAuthorContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.commentAuthor}>
                        {comment.user?.full_name}
                      </Text>
                      {comment.user?.verified && <VerifiedBadgeIcon size={14} />}
                    </View>
                    {isOwner && !isEditing && (
                      <TouchableOpacity
                        style={styles.commentMenuButton}
                        onPress={() => setMenuVisibleCommentId(menuVisibleCommentId === comment.id ? null : comment.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MoreVertical size={16} color={COLORS.textLight} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {comment.user?.username && (
                    <View style={styles.commentUsernameContainer}>
                      <Text style={styles.commentUsername}>
                        @{comment.user.username}
                      </Text>
                    </View>
                  )}
                  {isEditing ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={styles.editInput}
                        value={editingCommentText}
                        onChangeText={setEditingCommentText}
                        multiline
                        maxLength={1000}
                        autoFocus
                        textAlignVertical="top"
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={[styles.editButton, styles.cancelButton]}
                          onPress={handleCancelEdit}
                        >
                          <Text style={styles.editButtonText}>İptal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.editButton, styles.saveButton]}
                          onPress={handleSaveEdit}
                          disabled={!editingCommentText.trim() || updateCommentMutation.isPending}
                        >
                          {updateCommentMutation.isPending ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                          ) : (
                            <Text style={[styles.editButtonText, { color: COLORS.white }]}>Kaydet</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.commentTextContainer}>
                        <Text style={styles.commentText}>
                          {comment.content}
                        </Text>
                      </View>
                      <Text style={styles.commentTime}>
                        {new Date(comment.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        
        <Footer />
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.commentInputContainer, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
          <Image
            source={{
              uri: profile?.avatar_url || user?.user_metadata?.avatar_url || 'https://via.placeholder.com/32',
            }}
            style={styles.commentInputAvatar}
          />
          <TextInput
            ref={commentInputRef}
            style={styles.commentInput}
            placeholder="Yorum yaz..."
            placeholderTextColor={COLORS.textLight}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            blurOnSubmit={true}
            returnKeyType="send"
            onSubmitEditing={handleAddComment}
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

        {/* Yorum Menü Modal */}
        {menuVisibleCommentId && (
          <View style={styles.menuOverlay} onTouchEnd={() => setMenuVisibleCommentId(null)}>
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  const comment = commentsData?.comments.find((c) => c.id === menuVisibleCommentId);
                  if (comment) {
                    handleEditComment(comment.id, comment.content);
                  }
                }}
              >
                <Edit3 size={18} color={COLORS.text} />
                <Text style={styles.menuItemText}>Düzenle</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  if (menuVisibleCommentId) {
                    handleDeleteComment(menuVisibleCommentId);
                  }
                }}
              >
                <Trash2 size={18} color={COLORS.error} />
                <Text style={[styles.menuItemText, { color: COLORS.error }]}>Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  scrollContent: {
    paddingBottom: SPACING.xl,
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
    flexShrink: 1,
  },
  postAuthorContainer: {
    flex: 1,
    flexShrink: 1,
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
    marginTop: 4,
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
  deleteButton: {
    padding: SPACING.xs,
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
    flexShrink: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: 12,
  },
  commentAuthorContainer: {
    flex: 1,
    flexShrink: 1,
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  commentUsernameContainer: {
    flex: 1,
    flexShrink: 1,
    marginBottom: 2,
  },
  commentUsername: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  commentTextContainer: {
    flex: 1,
    flexShrink: 1,
    marginBottom: 4,
  },
  commentText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 18,
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
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
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
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs,
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
  commentMenuButton: {
    marginLeft: 'auto',
    padding: SPACING.xs,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 1000,
  },
  menuContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: SPACING.xs,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  menuItemText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500' as const,
    color: COLORS.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  editContainer: {
    marginTop: SPACING.xs,
  },
  editInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    minHeight: 60,
    maxHeight: 120,
    marginBottom: SPACING.xs,
    textAlignVertical: 'top' as const,
  },
  editActions: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: SPACING.sm,
  },
  editButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center' as const,
  },
  cancelButton: {
    backgroundColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  editButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
});
