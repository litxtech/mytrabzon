import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  Share,
  Dimensions,
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
import VerifiedBadgeIcon from '@/components/VerifiedBadge';
import { OptimizedImage } from '@/components/OptimizedImage';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useAuthGuard } from '@/hooks/useAuthGuard';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { guard } = useAuthGuard();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [menuVisibleCommentId, setMenuVisibleCommentId] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isPostExpanded, setIsPostExpanded] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editingPostText, setEditingPostText] = useState('');
  const commentInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  // Klavye event listener'ları
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

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

  // Post yüklendiğinde editingPostText'i güncelle
  useEffect(() => {
    if (post?.content && !isEditingPost) {
      setEditingPostText(post.content);
    }
  }, [post?.content, isEditingPost]);

  const { data: commentsData, refetch: refetchComments } = trpc.post.getComments.useQuery({
    post_id: id!,
    limit: 50,
    offset: 0,
  });

  const likePostMutation = trpc.post.likePost.useMutation({
    onMutate: async () => {
      // Optimistic update - anında UI'ı güncelle
      queryClient.setQueryData([['post', 'getPostDetail'], { postId: id! }], (old: any) => {
        if (!old) return old;
        const isCurrentlyLiked = old.is_liked;
        return {
          ...old,
          is_liked: !isCurrentlyLiked,
          like_count: (old.like_count || 0) + (isCurrentlyLiked ? -1 : 1),
        };
      });
    },
    onSuccess: () => {
      // Başarılı olursa sadece invalidate et, refetch yapma (optimistic update zaten yapıldı)
      queryClient.invalidateQueries({ queryKey: [['post', 'getPostDetail'], { postId: id! }] });
    },
    onError: () => {
      // Hata durumunda refetch yap
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
      // Otomatik yönlendirme yapma - kullanıcı isterse kendi gidebilir
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Gönderi silinemedi';
      Alert.alert('Hata', message);
    },
  });

  const updatePostMutation = trpc.post.updatePost.useMutation({
    onSuccess: async () => {
      Alert.alert('Başarılı', 'Gönderi güncellendi');
      setIsEditingPost(false);
      setEditingPostText('');
      await refetch();
      await utils.post.getPosts.invalidate();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Gönderi güncellenemedi';
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

  const handleLike = () => {
    guard(() => {
      // Optimistic update - anında UI'ı güncelle
      if (post) {
        queryClient.setQueryData(['post', 'getPostDetail', { postId: id }], (oldData: any) => {
          if (!oldData) return oldData;
          const newIsLiked = !oldData.is_liked;
          return {
            ...oldData,
            is_liked: newIsLiked,
            like_count: newIsLiked ? (oldData.like_count || 0) + 1 : Math.max((oldData.like_count || 0) - 1, 0),
          };
        });
      }
      
      // Anında mutation'ı çalıştır (async/await kaldırıldı - hızlı tepki için)
      likePostMutation.mutate({ postId: id! }, {
        onError: () => {
          // Hata durumunda geri al
          if (post) {
            queryClient.setQueryData(['post', 'getPostDetail', { postId: id }], (oldData: any) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                is_liked: post.is_liked,
                like_count: post.like_count,
              };
            });
          }
        },
      });
    }, 'Beğenmek');
  };

  const handleAddComment = () => {
    guard(() => {
      if (!commentText.trim()) {
        return;
      }
      
      // Optimistic update - anında UI'ı güncelle
      const commentContent = commentText.trim();
      setCommentText(''); // Anında temizle (hızlı tepki için)
      
      // Klavyeyi kapat ve input'u blur et
      Keyboard.dismiss();
      commentInputRef.current?.blur();
      
      // Anında mutation'ı çalıştır (async/await kaldırıldı - hızlı tepki için)
      addCommentMutation.mutate({
        post_id: id!,
        content: commentContent,
      }, {
        onError: () => {
          // Hata durumunda metni geri yükle
          setCommentText(commentContent);
        },
        onSuccess: () => {
          // Yorum eklendikten sonra FlatList'i en alta kaydır
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        },
      });
    }, 'Yorum yapmak');
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

  const firstMedia = post.media && post.media.length > 0 ? post.media[0] : null;
  const isVideo = firstMedia?.type === 'video' || firstMedia?.path?.match(/\.(mp4|mov|avi|webm)$/i);

  // Yorum render fonksiyonu
  const renderComment = ({ item: comment }: { item: any }) => {
    const isEditing = editingCommentId === comment.id;
    const isOwner = comment.user_id === user?.id;
    
    return (
      <TouchableOpacity 
        style={styles.commentCard}
        activeOpacity={0.9}
        onPress={() => {
          Keyboard.dismiss();
          setMenuVisibleCommentId(null);
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (comment.user?.id) {
              router.push(`/profile/${comment.user.id}` as any);
            }
          }}
          activeOpacity={0.7}
        >
          <Image
            source={{
              uri: comment.user?.avatar_url || 'https://via.placeholder.com/32',
            }}
            style={styles.commentAvatar}
          />
        </TouchableOpacity>
        <View style={styles.commentContent}>
          {/* İsim ve Kullanıcı Bilgileri - Üstte */}
          <View style={styles.commentHeaderRow}>
            <View style={styles.commentAuthorContainer}>
              <TouchableOpacity
                onPress={() => {
                  if (comment.user?.id) {
                    router.push(`/profile/${comment.user.id}` as any);
                  }
                }}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text style={styles.commentAuthor}>
                  {comment.user?.full_name || 'İsimsiz'}
                </Text>
                {comment.user?.verified && <VerifiedBadgeIcon size={14} />}
              </TouchableOpacity>
              {comment.user?.username && (
                <Text style={styles.commentUsername}>
                  @{comment.user.username}
                </Text>
              )}
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
          
          {/* Yorum Metni - Altta */}
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
              <View style={styles.commentFooter}>
                <Text style={styles.commentTime}>
                  {new Date(comment.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // List header (post içeriği)
  const renderListHeader = () => (
    <>
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
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              {/* Sadece metin postlarında (medya yoksa) düzenle butonu göster */}
              {(!post.media || post.media.length === 0) && (
                <TouchableOpacity 
                  onPress={() => {
                    setIsEditingPost(true);
                    setEditingPostText(post.content || '');
                  }}
                  style={styles.editButton}
                >
                  <Edit3 size={20} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                onPress={handleDeletePost}
                disabled={deletePostMutation.isPending}
                style={styles.deleteButton}
              >
                <Trash2 size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {post.content && post.content.trim() !== '' && (
          <View style={styles.postContentContainer}>
            {isEditingPost ? (
              <>
                <TextInput
                  style={styles.postEditInput}
                  value={editingPostText}
                  onChangeText={setEditingPostText}
                  multiline
                  autoFocus
                  placeholder="Gönderi içeriği..."
                  placeholderTextColor={COLORS.textLight}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsEditingPost(false);
                      setEditingPostText('');
                    }}
                    style={styles.cancelEditButton}
                  >
                    <Text style={styles.cancelEditText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (editingPostText.trim()) {
                        updatePostMutation.mutate({
                          postId: post.id,
                          content: editingPostText.trim(),
                        });
                      }
                    }}
                    disabled={!editingPostText.trim() || updatePostMutation.isPending}
                    style={[styles.saveEditButton, (!editingPostText.trim() || updatePostMutation.isPending) && styles.saveEditButtonDisabled]}
                  >
                    {updatePostMutation.isPending ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.saveEditText}>Kaydet</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text 
                  style={styles.postContent}
                  numberOfLines={isPostExpanded ? undefined : 15}
                  ellipsizeMode="tail"
                >
                  {post.content}
                </Text>
                {post.content.length > 500 && (
                  <TouchableOpacity
                    onPress={() => setIsPostExpanded(!isPostExpanded)}
                    style={styles.readMoreButton}
                  >
                    <Text style={styles.readMoreText}>
                      {isPostExpanded ? 'Daha az göster' : 'Devamını gör'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* Video değilse medya göster */}
        {post.media && post.media.length > 0 && !isVideo && (
          <View style={styles.mediaContainer}>
            {post.media.length === 1 ? (
              <OptimizedImage
                source={post.media[0].path}
                thumbnail={post.media[0].thumbnail}
                isThumbnail={false}
                style={styles.postImage}
              />
            ) : (
              <ScrollView 
                horizontal 
                pagingEnabled 
                showsHorizontalScrollIndicator={false} 
                style={styles.mediaScrollView}
                contentContainerStyle={styles.mediaScrollContent}
              >
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
          </View>
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
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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

      {/* Küçük Video Preview - En Üstte Sabit */}
      {isVideo && firstMedia?.path && (
        <View style={styles.videoPreviewContainer}>
          <VideoPlayer
            videoUrl={firstMedia.path.trim()}
            postId={post.id}
            isLiked={post.is_liked}
            isSaved={false}
            likeCount={post.like_count}
            commentCount={post.comment_count}
            shareCount={post.share_count}
            onLike={handleLike}
            onComment={() => {
              commentInputRef.current?.focus();
            }}
            onShare={async () => {
              try {
                await Share.share({
                  message: `${post.content || 'Gönderi'}`,
                  url: firstMedia.path,
                });
              } catch (error) {
                console.error('Share error:', error);
              }
            }}
            onTag={() => {
              router.push(`/post/${post.id}` as any);
            }}
            onSave={() => {
              Alert.alert('Bilgi', 'Kaydetme özelliği yakında eklenecek');
            }}
            autoPlay={true}
            previewMode={true}
            onFullScreen={() => {
              router.push(`/video-feed?postId=${post.id}` as any);
            }}
            containerStyle={styles.videoPreviewPlayer}
          />
        </View>
      )}

      {/* Ana İçerik Container */}
      <View style={styles.contentWrapper}>
        {/* FlatList - Yorumlar */}
        <FlatList
          ref={flatListRef}
          data={commentsData?.comments || []}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={{ paddingBottom: 100 }} // Input için boşluk
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={true}
          style={{ flex: 1 }}
        />
      </View>

      {/* Yorum Input - Klavyenin Üstünde Sabit (Absolute Position) */}
      <View style={[
        styles.commentInputWrapper, 
        { 
          paddingBottom: Math.max(insets.bottom, SPACING.sm),
          bottom: keyboardHeight > 0 ? keyboardHeight : 0,
        }
      ]}>
        <View style={styles.commentInputContainer}>
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
            blurOnSubmit={false}
            returnKeyType="default"
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
      </View>

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
  contentWrapper: {
    flex: 1,
  },
  videoPreviewContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    overflow: 'hidden' as const,
  },
  videoPreviewPlayer: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    aspectRatio: undefined,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  // scrollViewWrapper ve scrollContent kaldırıldı - FlatList kullanıyoruz
  postCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 0,
    marginVertical: 0,
    borderRadius: 0,
    width: '100%',
    overflow: 'hidden' as const,
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
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.md * 1.2,
    }),
  },
  postUsernameContainer: {
    flex: 1,
    flexShrink: 1,
    marginTop: 2,
  },
  postUsername: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.xs * 1.3,
    }),
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
    color: COLORS.textLight,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.sm * 1.3,
    }),
  },
  postContentContainer: {
    flex: 1,
    flexShrink: 1,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    width: '100%',
  },
  postContent: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: Platform.OS === 'android' ? FONT_SIZES.md * 1.4 : 22,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
    }),
  },
  mediaContainer: {
    width: '100%',
    marginHorizontal: 0,
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    alignSelf: 'stretch' as const,
  },
  mediaScrollView: {
    width: '100%',
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  mediaScrollContent: {
    alignItems: 'center' as const,
  },
  videoContainer: {
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
  postActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.lg,
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  editButton: {
    padding: SPACING.xs,
  },
  postEditInput: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: Platform.OS === 'android' ? FONT_SIZES.md * 1.4 : 22,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
    }),
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  cancelEditButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  cancelEditText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  saveEditButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveEditButtonDisabled: {
    opacity: 0.5,
  },
  saveEditText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    fontWeight: '600',
  },
  readMoreButton: {
    marginTop: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  readMoreText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    fontWeight: '600' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.md * 1.2,
    }),
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
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.lg * 1.2,
    }),
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
    padding: SPACING.md,
    borderRadius: 12,
  },
  commentHeaderRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: SPACING.xs + 2,
  },
  commentAuthorContainer: {
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  commentAuthor: {
    fontSize: FONT_SIZES.sm + 1,
    fontWeight: '700' as const,
    color: COLORS.text,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: (FONT_SIZES.sm + 1) * 1.2,
    }),
  },
  commentUsername: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    fontWeight: '500' as const,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      lineHeight: FONT_SIZES.xs * 1.3,
    }),
  },
  commentTextContainer: {
    flex: 1,
    flexShrink: 1,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  commentText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: Platform.OS === 'android' ? FONT_SIZES.sm * 1.5 : 20,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
    }),
  },
  commentFooter: {
    marginTop: SPACING.xs - 2,
  },
  commentTime: {
    fontSize: FONT_SIZES.xs - 1,
    color: COLORS.textLight,
    opacity: 0.7,
  },
  commentInputWrapper: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  commentInputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
