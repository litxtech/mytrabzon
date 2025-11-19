import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Dimensions,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { OptimizedImage } from '@/components/OptimizedImage';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import {
  Heart,
  MessageCircle,
  Share2,
  Send,
  ArrowLeft,
  AlertCircle,
  Trash2,
  MoreVertical,
  Edit3,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { formatTimeAgo } from '@/lib/time-utils';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Footer } from '@/components/Footer';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [menuVisibleCommentId, setMenuVisibleCommentId] = useState<string | null>(null);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [showFullScreenVideo, setShowFullScreenVideo] = useState(false);
  const utils = trpc.useUtils();
  const commentInputRef = useRef<TextInput>(null);

  const { data: eventsData, isLoading, refetch } = trpc.event.getEvents.useQuery({
    limit: 100,
    offset: 0,
  });

  const event = eventsData?.events?.find((e: any) => e.id === id);

  const formatCount = (count: number | null | undefined): string => {
    if (!count) return '0';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const likeEventMutation = (trpc as any).event.likeEvent.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const addCommentMutation = (trpc as any).event.addEventComment.useMutation({
    onSuccess: () => {
      setCommentText('');
      Keyboard.dismiss(); // Klavyeyi kapat
      commentInputRef.current?.blur(); // Input'u blur et
      refetch();
      // Comments query'yi de invalidate et
      (utils as any).event.getEventComments.invalidate({ event_id: id! });
    },
    onError: (error: any) => {
      console.error('Add comment error:', error);
      const errorMessage = error?.message || error?.data?.message || 'Yorum eklenirken bir hata oluştu';
      Alert.alert('Hata', errorMessage);
    },
  });

  const deleteEventMutation = trpc.event.deleteEvent.useMutation({
    onSuccess: async () => {
      Alert.alert('Başarılı', 'Olay silindi');
      await utils.event.getEvents.invalidate();
      router.back();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Olay silinemedi';
      Alert.alert('Hata', message);
    },
  });

  const { data: commentsData } = (trpc as any).event.getEventComments.useQuery({
    event_id: id!,
    limit: 50,
    offset: 0,
  }, { enabled: !!id });

  const handleLike = async () => {
    if (!event) return;
    try {
      await likeEventMutation.mutateAsync({ event_id: event.id });
    } catch (error) {
      console.error('Event like error:', error);
    }
  };

  const handleShare = () => {
    if (!event) return;
    
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
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir yorum yazın');
      return;
    }
    
    if (!event || !event.id) {
      Alert.alert('Hata', 'Olay bulunamadı');
      return;
    }

    if (!user) {
      Alert.alert('Hata', 'Yorum yapmak için giriş yapmanız gerekiyor');
      return;
    }

    if (addCommentMutation.isPending) {
      return; // Zaten gönderiliyor
    }

    // Klavyeyi kapat ve input'u blur et
    Keyboard.dismiss();
    commentInputRef.current?.blur();

    try {
      await addCommentMutation.mutateAsync({
        event_id: event.id,
        content: commentText.trim(),
      });
    } catch (error: any) {
      // Error handling mutation'ın onError'ında yapılıyor
      console.error('Comment error:', error);
    }
  };

  const deleteCommentMutation = (trpc as any).event.deleteEventComment?.useMutation({
    onSuccess: () => {
      Keyboard.dismiss(); // Klavyeyi kapat
      setMenuVisibleCommentId(null);
      refetch();
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Yorum silinemedi. Lütfen tekrar deneyin.');
    },
  });

  const updateCommentMutation = (trpc as any).event.updateEventComment?.useMutation({
    onSuccess: () => {
      setEditingCommentId(null);
      setEditingCommentText('');
      setMenuVisibleCommentId(null);
      refetch();
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Yorum güncellenemedi. Lütfen tekrar deneyin.');
    },
  });

  const handleDeleteComment = (commentId: string) => {
    if (!deleteCommentMutation) {
      Alert.alert('Hata', 'Yorum silme özelliği henüz aktif değil');
      return;
    }
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
    if (!editingCommentId || !editingCommentText.trim() || !updateCommentMutation) return;
    updateCommentMutation.mutate({
      commentId: editingCommentId,
      content: editingCommentText.trim(),
    });
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleDeleteEvent = () => {
    if (!event) return;

    Alert.alert(
      'Olayı Sil',
      'Bu olayı tüm ilçelerden kaldırmak istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => deleteEventMutation.mutate({ event_id: event.id }),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>Olay bulunamadı</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
          title: 'Olay Detayı',
          headerStyle: { backgroundColor: theme.colors.card },
          headerTintColor: theme.colors.text,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Event Header */}
        <View style={[styles.eventHeader, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity
            onPress={() => event.user_id && router.push(`/profile/${event.user_id}` as any)}
            activeOpacity={0.7}
            style={styles.authorRow}
          >
            <Image
              source={{
                uri: event.user?.avatar_url || 'https://via.placeholder.com/40',
              }}
              style={styles.avatar}
            />
            <View style={styles.authorInfo}>
              <View style={styles.authorNameRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.authorName, { color: theme.colors.text }]}>
                    {event.user?.full_name || 'Bilinmeyen'}
                  </Text>
                  {event.user?.verified && <VerifiedBadgeIcon size={16} />}
                </View>
                <View style={[styles.eventBadge, { backgroundColor: severityColor + '20' }]}>
                  <AlertCircle size={14} color={severityColor} />
                  <Text style={[styles.eventBadgeText, { color: severityColor }]}>Olay Var</Text>
                </View>
              </View>
              <Text style={[styles.eventMeta, { color: theme.colors.textLight }]}>
                {event.district} • {formatTimeAgo(event.created_at || event.start_date)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Event Content */}
        <View style={[styles.eventContent, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.eventTitle, { color: theme.colors.text }]}>{event.title}</Text>
          {event.description && (
            <Text style={[styles.eventDescription, { color: theme.colors.text }]}>
              {event.description}
            </Text>
          )}
        </View>

        {/* Media */}
        {firstMedia && (
          <View style={styles.mediaContainer}>
            {isVideo ? (
              <VideoPlayer
                videoUrl={firstMedia}
                postId={event.id}
                isLiked={event.is_liked || false}
                likeCount={event.like_count || 0}
                commentCount={event.comment_count || 0}
                shareCount={0}
                onLike={handleLike}
                onComment={() => {
                  // Yorum paneli VideoPlayer içinde açılacak
                }}
                onShare={handleShare}
                onTag={() => {}}
                autoPlay={false}
                previewMode={true}
                onFullScreen={() => {
                  // Tam ekran modal aç
                  setShowFullScreenVideo(true);
                }}
              />
            ) : (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setShowFullScreenImage(true)}
              >
                <OptimizedImage
                  source={firstMedia}
                  isThumbnail={false}
                  style={styles.eventImage}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={[styles.actions, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Heart 
              size={24} 
              color={event.is_liked ? theme.colors.error : theme.colors.textLight}
              fill={event.is_liked ? theme.colors.error : 'transparent'}
            />
            <Text style={[styles.actionText, { color: event.is_liked ? theme.colors.error : theme.colors.textLight }]}>
              {formatCount(event.like_count || 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MessageCircle size={24} color={theme.colors.textLight} />
            <Text style={[styles.actionText, { color: theme.colors.textLight }]}>
              {formatCount(event.comment_count || 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share2 size={24} color={theme.colors.textLight} />
            <Text style={[styles.actionText, { color: theme.colors.textLight }]}>Paylaş</Text>
          </TouchableOpacity>
          {event.user_id === user?.id && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteEvent}
              disabled={deleteEventMutation.isPending}
            >
              <Trash2 size={24} color={theme.colors.error} />
              <Text style={[styles.actionText, { color: theme.colors.error }]}>
                {deleteEventMutation.isPending ? 'Siliniyor...' : 'Sil'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Yorumlar ({commentsData?.comments?.length || 0})
          </Text>

          {commentsData?.comments && commentsData.comments.length > 0 ? (
            commentsData.comments.map((comment: any) => {
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
                      {isOwner && !isEditing && deleteCommentMutation && (
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
                            disabled={!editingCommentText.trim() || (updateCommentMutation?.isPending || false)}
                          >
                            {updateCommentMutation?.isPending ? (
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
            })
          ) : (
            <View style={styles.emptyComments}>
              <Text style={[styles.emptyCommentsText, { color: theme.colors.textLight }]}>
                Henüz yorum yok. İlk yorumu sen yap!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Comment Input - Modal açıkken gizle */}
      {!showFullScreenImage && !showFullScreenVideo && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={[styles.commentInputContainer, { 
            paddingBottom: Math.max(insets.bottom, SPACING.sm),
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
          }]}>
          <Image
            source={{
              uri: (profile?.avatar_url as string | undefined) || 'https://via.placeholder.com/32',
            }}
            style={styles.commentInputAvatar}
          />
          <TextInput
            ref={commentInputRef}
            style={[styles.commentInput, {
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
            }]}
            placeholder="Yorum yaz..."
            placeholderTextColor={theme.colors.textLight}
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
      )}

      {/* Tam Ekran Görsel Modal */}
      <Modal
        visible={showFullScreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullScreenImage(false)}
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView
          style={styles.fullScreenModal}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            activeOpacity={1}
            onPress={() => setShowFullScreenImage(false)}
          >
            <View style={styles.fullScreenImageContainer}>
              {firstMedia && !isVideo && (
                <OptimizedImage
                  source={firstMedia}
                  isThumbnail={false}
                  style={styles.fullScreenImage}
                  contentFit="contain"
                />
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fullScreenCloseButton}
            onPress={() => setShowFullScreenImage(false)}
          >
            <Text style={styles.fullScreenCloseText}>✕</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Tam Ekran Video Modal */}
      {showFullScreenVideo && firstMedia && isVideo && (
        <Modal
          visible={showFullScreenVideo}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            Keyboard.dismiss();
            setShowFullScreenVideo(false);
          }}
          statusBarTranslucent={true}
        >
          <VideoPlayer
            videoUrl={firstMedia}
            postId={event.id}
            isLiked={event.is_liked || false}
            likeCount={event.like_count || 0}
            commentCount={event.comment_count || 0}
            shareCount={0}
            onLike={handleLike}
            onComment={() => {
              // Yorum paneli VideoPlayer içinde açılacak
            }}
            onShare={handleShare}
            onTag={() => {}}
            onClose={() => {
              // Tam ekrandan çıkış için
              Keyboard.dismiss();
              setShowFullScreenVideo(false);
            }}
            autoPlay={true}
            previewMode={false}
          />
        </Modal>
      )}

      {/* Yorum Menü Modal */}
      {menuVisibleCommentId && deleteCommentMutation && (
        <View style={styles.menuOverlay} onTouchEnd={() => setMenuVisibleCommentId(null)}>
          <View style={styles.menuContainer}>
            {updateCommentMutation && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    const comment = commentsData?.comments?.find((c: any) => c.id === menuVisibleCommentId);
                    if (comment) {
                      handleEditComment(comment.id, comment.content);
                    }
                  }}
                >
                  <Edit3 size={18} color={COLORS.text} />
                  <Text style={styles.menuItemText}>Düzenle</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
              </>
            )}
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
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  headerButton: {
    padding: SPACING.xs,
  },
  eventHeader: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: SPACING.md,
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  authorName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  eventBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  eventMeta: {
    fontSize: FONT_SIZES.sm,
  },
  eventContent: {
    padding: SPACING.md,
  },
  eventTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  eventDescription: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
  mediaContainer: {
    width: '100%',
    marginVertical: SPACING.sm,
  },
  eventImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.border,
  },
  actions: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
    justifyContent: 'center',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 999,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    flex: undefined,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
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
    elevation: 10,
    zIndex: 100,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  fullScreenBackdrop: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  fullScreenImageContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  fullScreenVideoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenCloseButton: {
    position: 'absolute' as const,
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 1000,
  },
  fullScreenCloseText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '700' as const,
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
  emptyComments: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
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
  errorText: {
    fontSize: FONT_SIZES.lg,
    marginBottom: SPACING.lg,
  },
  backButton: {
    padding: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});


