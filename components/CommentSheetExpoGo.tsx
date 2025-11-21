/**
 * Comment Sheet Component - Expo Go Versiyonu
 * - Native modül gerektirmez
 * - Modal + FlatList kullanır
 * - Expo Go'da çalışır
 */

import React, { forwardRef, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Send, MoreVertical, Trash2, Edit3, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { formatTimeAgo } from '@/lib/time-utils';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type CommentSheetExpoGoRef = {
  present: () => void;
  dismiss: () => void;
};

interface CommentSheetExpoGoProps {
  postId: string;
  initialCount?: number;
  onClose?: () => void;
}

export const CommentSheetExpoGo = forwardRef<CommentSheetExpoGoRef, CommentSheetExpoGoProps>(
  ({ postId, initialCount = 0, onClose }, ref) => {
    const router = useRouter();
    const { theme } = useTheme();
    const { user, profile } = useAuth();
    const { guard } = useAuthGuard();
    const insets = useSafeAreaInsets();
    const [visible, setVisible] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [menuVisibleCommentId, setMenuVisibleCommentId] = useState<string | null>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const commentInputRef = useRef<TextInput>(null);

    // Ref methods
    React.useImperativeHandle(ref, () => ({
      present: () => setVisible(true),
      dismiss: () => {
        setVisible(false);
        onClose?.();
      },
    }));

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

    const utils = trpc.useUtils();
    
    // Event mi kontrol et
    const isEvent = postId.startsWith('event_');
    const actualId = isEvent ? postId.replace('event_', '') : postId;
    
    // Post comments query
    const { data: postCommentsData } = trpc.post.getComments.useQuery(
      { post_id: actualId, limit: 50, offset: 0 },
      { enabled: !!postId && visible && !isEvent }
    );
    
    // Event comments query
    const { data: eventCommentsData } = (trpc as any).event.getEventComments.useQuery(
      { event_id: actualId, limit: 50, offset: 0 },
      { enabled: !!postId && visible && isEvent }
    );
    
    // Comments data - event veya post'a göre
    const commentsData = isEvent ? eventCommentsData : postCommentsData;

    // Post comment mutation
    const createPostCommentMutation = trpc.post.addComment.useMutation({
      onMutate: async (newComment) => {
        // Optimistic update: Yorumu hemen ekle
        await utils.post.getComments.cancel({ post_id: actualId });
        const previousComments = utils.post.getComments.getData({ post_id: actualId });
        
        const optimisticComment = {
          id: `temp-${Date.now()}`,
          post_id: actualId,
          user_id: user?.id || '',
          content: newComment.content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: profile ? {
            id: profile.id,
            full_name: profile.full_name,
            username: profile.username,
            avatar_url: profile.avatar_url,
            verified: profile.verified || false,
            supporter_badge: profile.supporter_badge,
            supporter_badge_visible: profile.supporter_badge_visible,
            supporter_badge_color: profile.supporter_badge_color,
          } : null,
          is_liked: false,
        };

        utils.post.getComments.setData(
          { post_id: actualId },
          (old: any) => {
            if (!old) return { comments: [optimisticComment], total: 1 };
            return {
              comments: [...(old.comments || []), optimisticComment],
              total: (old.total || 0) + 1,
            };
          }
        );

        return { previousComments };
      },
      onError: (err, newComment, context) => {
        // Hata durumunda geri al
        if (context?.previousComments) {
          utils.post.getComments.setData({ post_id: actualId }, context.previousComments);
        }
        Alert.alert('Hata', err.message || 'Yorum gönderilemedi. Lütfen tekrar deneyin.');
      },
      onSuccess: () => {
        setCommentText('');
        Keyboard.dismiss();
        commentInputRef.current?.blur();
        // Cache'i invalidate et (gerçek veriyi çek)
        utils.post.getComments.invalidate({ post_id: actualId });
      },
    });
    
    // Event comment mutation
    const createEventCommentMutation = (trpc as any).event.addEventComment.useMutation({
      onMutate: async (newComment: any) => {
        // Optimistic update: Yorumu hemen ekle
        await (utils as any).event.getEventComments.cancel({ event_id: actualId });
        const previousComments = (utils as any).event.getEventComments.getData({ event_id: actualId });
        
        const optimisticComment = {
          id: `temp-${Date.now()}`,
          event_id: actualId,
          user_id: user?.id || '',
          content: newComment.content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: profile ? {
            id: profile.id,
            full_name: profile.full_name,
            username: profile.username,
            avatar_url: profile.avatar_url,
            verified: profile.verified || false,
            supporter_badge: profile.supporter_badge,
            supporter_badge_visible: profile.supporter_badge_visible,
            supporter_badge_color: profile.supporter_badge_color,
          } : null,
        };

        (utils as any).event.getEventComments.setData(
          { event_id: actualId },
          (old: any) => {
            if (!old) return { comments: [optimisticComment], total: 1 };
            return {
              comments: [...(old.comments || []), optimisticComment],
              total: (old.total || 0) + 1,
            };
          }
        );

        return { previousComments };
      },
      onError: (err: any, newComment: any, context: any) => {
        // Hata durumunda geri al
        if (context?.previousComments) {
          (utils as any).event.getEventComments.setData({ event_id: actualId }, context.previousComments);
        }
        Alert.alert('Hata', err.message || 'Yorum gönderilemedi. Lütfen tekrar deneyin.');
      },
      onSuccess: () => {
        setCommentText('');
        Keyboard.dismiss();
        commentInputRef.current?.blur();
        // Cache'i invalidate et (gerçek veriyi çek)
        (utils as any).event.getEventComments.invalidate({ event_id: actualId });
      },
    });
    
    // Unified mutation
    const createCommentMutation = isEvent ? createEventCommentMutation : createPostCommentMutation;

    // Post delete comment mutation
    const deletePostCommentMutation = trpc.post.deleteComment.useMutation({
      onMutate: async ({ commentId }) => {
        // Optimistic update: Yorumu hemen sil
        await utils.post.getComments.cancel({ post_id: actualId });
        const previousComments = utils.post.getComments.getData({ post_id: actualId });

        utils.post.getComments.setData(
          { post_id: actualId },
          (old: any) => {
            if (!old) return old;
            return {
              comments: (old.comments || []).filter((c: any) => c.id !== commentId),
              total: Math.max(0, (old.total || 0) - 1),
            };
          }
        );

        return { previousComments };
      },
      onError: (err, variables, context) => {
        // Hata durumunda geri al
        if (context?.previousComments) {
          utils.post.getComments.setData({ post_id: actualId }, context.previousComments);
        }
        Alert.alert('Hata', err.message || 'Yorum silinemedi. Lütfen tekrar deneyin.');
      },
      onSuccess: () => {
        Keyboard.dismiss();
        setMenuVisibleCommentId(null);
        // Cache'i invalidate et
        utils.post.getComments.invalidate({ post_id: actualId });
      },
    });
    
    // Event delete comment mutation (if exists)
    const deleteEventCommentMutation = (trpc as any).event.deleteEventComment?.useMutation({
      onMutate: async ({ commentId }: { commentId: string }) => {
        // Optimistic update: Yorumu hemen sil
        await (utils as any).event.getEventComments.cancel({ event_id: actualId });
        const previousComments = (utils as any).event.getEventComments.getData({ event_id: actualId });

        (utils as any).event.getEventComments.setData(
          { event_id: actualId },
          (old: any) => {
            if (!old) return old;
            return {
              comments: (old.comments || []).filter((c: any) => c.id !== commentId),
              total: Math.max(0, (old.total || 0) - 1),
            };
          }
        );

        return { previousComments };
      },
      onError: (err: any, variables: any, context: any) => {
        // Hata durumunda geri al
        if (context?.previousComments) {
          (utils as any).event.getEventComments.setData({ event_id: actualId }, context.previousComments);
        }
        Alert.alert('Hata', err.message || 'Yorum silinemedi. Lütfen tekrar deneyin.');
      },
      onSuccess: () => {
        Keyboard.dismiss();
        setMenuVisibleCommentId(null);
        // Cache'i invalidate et
        (utils as any).event.getEventComments.invalidate({ event_id: actualId });
      },
    });
    
    // Unified delete mutation
    const deleteCommentMutation = isEvent ? (deleteEventCommentMutation || deletePostCommentMutation) : deletePostCommentMutation;

    // Post update comment mutation
    const updatePostCommentMutation = (trpc.post as any).updateComment.useMutation({
      onMutate: async ({ commentId, content }: { commentId: string; content: string }) => {
        // Optimistic update: Yorumu hemen güncelle
        await utils.post.getComments.cancel({ post_id: actualId });
        const previousComments = utils.post.getComments.getData({ post_id: actualId });

        utils.post.getComments.setData(
          { post_id: actualId },
          (old: any) => {
            if (!old) return old;
            return {
              ...old,
              comments: (old.comments || []).map((c: any) =>
                c.id === commentId ? { ...c, content, updated_at: new Date().toISOString() } : c
              ),
            };
          }
        );

        return { previousComments };
      },
      onError: (err: any, variables: any, context: any) => {
        // Hata durumunda geri al
        if (context?.previousComments) {
          utils.post.getComments.setData({ post_id: actualId }, context.previousComments);
        }
        Alert.alert('Hata', err.message || 'Yorum güncellenemedi. Lütfen tekrar deneyin.');
      },
      onSuccess: () => {
        setEditingCommentId(null);
        setEditingCommentText('');
        setMenuVisibleCommentId(null);
        // Cache'i invalidate et
        utils.post.getComments.invalidate({ post_id: actualId });
      },
    });
    
    // Event update comment mutation (if exists)
    const updateEventCommentMutation = (trpc as any).event.updateEventComment?.useMutation({
      onMutate: async ({ commentId, content }: { commentId: string; content: string }) => {
        // Optimistic update: Yorumu hemen güncelle
        await (utils as any).event.getEventComments.cancel({ event_id: actualId });
        const previousComments = (utils as any).event.getEventComments.getData({ event_id: actualId });

        (utils as any).event.getEventComments.setData(
          { event_id: actualId },
          (old: any) => {
            if (!old) return old;
            return {
              ...old,
              comments: (old.comments || []).map((c: any) =>
                c.id === commentId ? { ...c, content, updated_at: new Date().toISOString() } : c
              ),
            };
          }
        );

        return { previousComments };
      },
      onError: (err: any, variables: any, context: any) => {
        // Hata durumunda geri al
        if (context?.previousComments) {
          (utils as any).event.getEventComments.setData({ event_id: actualId }, context.previousComments);
        }
        Alert.alert('Hata', err.message || 'Yorum güncellenemedi. Lütfen tekrar deneyin.');
      },
      onSuccess: () => {
        setEditingCommentId(null);
        setEditingCommentText('');
        setMenuVisibleCommentId(null);
        // Cache'i invalidate et
        (utils as any).event.getEventComments.invalidate({ event_id: actualId });
      },
    });
    
    // Unified update mutation
    const updateCommentMutation = isEvent ? (updateEventCommentMutation || updatePostCommentMutation) : updatePostCommentMutation;

    const handleSendComment = () => {
      guard(() => {
        if (!commentText.trim() || !postId) return;
        
        console.log('📝 CommentSheetExpoGo - handleSendComment:', {
          postId,
          isEvent,
          actualId,
          commentTextLength: commentText.trim().length,
        });
        
        if (isEvent) {
          console.log('✅ Using event.addEventComment mutation');
          createEventCommentMutation.mutate({
            event_id: actualId,
            content: commentText.trim(),
          });
        } else {
          console.log('✅ Using post.addComment mutation');
          createPostCommentMutation.mutate({
            post_id: actualId,
            content: commentText.trim(),
          });
        }
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

    const comments = [...(commentsData?.comments || [])].reverse();
    const commentsCount = comments.length || initialCount;

    const renderComment = ({ item }: { item: any }) => {
      const isEditing = editingCommentId === item.id;
      const isOwner = item.user_id === user?.id;
      
      return (
        <TouchableOpacity 
          style={styles.commentItem}
          activeOpacity={0.9}
          onPress={() => setMenuVisibleCommentId(null)}
        >
          <TouchableOpacity
            onPress={() => {
              if (item.user?.id) {
                router.push(`/profile/${item.user.id}` as any);
              }
            }}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: item.user?.avatar_url || 'https://via.placeholder.com/32' }}
              style={styles.commentAvatar}
              contentFit="cover"
            />
          </TouchableOpacity>
          <View style={styles.commentContent}>
            {/* İsim ve Kullanıcı Bilgileri - Üstte */}
            <View style={styles.commentHeader}>
              <View style={styles.commentAuthorContainer}>
                <TouchableOpacity
                  onPress={() => {
                    if (item.user?.id) {
                      router.push(`/profile/${item.user.id}` as any);
                    }
                  }}
                  activeOpacity={0.7}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <Text style={[styles.commentAuthor, { color: theme.colors.text }]}>
                    {item.user?.full_name || 'İsimsiz'}
                  </Text>
                  {item.user?.verified && <VerifiedBadgeIcon size={14} />}
                </TouchableOpacity>
                {item.user?.username && (
                  <Text style={[styles.commentUsername, { color: theme.colors.textLight }]}>
                    @{item.user.username}
                  </Text>
                )}
              </View>
              <View style={styles.commentHeaderRight}>
                <Text style={[styles.commentTime, { color: theme.colors.textLight }]}>
                  {formatTimeAgo(item.created_at)}
                </Text>
                {isOwner && !isEditing && (
                  <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => setMenuVisibleCommentId(menuVisibleCommentId === item.id ? null : item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MoreVertical size={16} color={theme.colors.textLight} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* Yorum Metni - Altta */}
            {isEditing ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={[styles.editInput, { color: theme.colors.text, backgroundColor: theme.colors.background }]}
                  value={editingCommentText}
                  onChangeText={setEditingCommentText}
                  multiline
                  maxLength={500}
                  autoFocus
                  textAlignVertical="top"
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.editButton, styles.cancelButton, { backgroundColor: theme.colors.border }]}
                    onPress={handleCancelEdit}
                  >
                    <Text style={[styles.editButtonText, { color: theme.colors.text }]}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
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
              <View style={styles.commentTextContainer}>
                <Text style={[styles.commentText, { color: theme.colors.text }]}>
                  {item.content}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    };

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setVisible(false);
          onClose?.();
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          enabled={true}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => {
              setVisible(false);
              onClose?.();
            }}
          />
          <View style={[styles.sheetContainer, { backgroundColor: theme.colors.card }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                Yorumlar
              </Text>
              <Text style={[styles.headerCount, { color: theme.colors.textLight }]}>
                {commentsCount}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setVisible(false);
                  onClose?.();
                }}
              >
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={renderComment}
              contentContainerStyle={[styles.listContent, { 
                paddingBottom: keyboardHeight > 0 ? keyboardHeight + 100 : 100 
              }]} // Input için boşluk - klavye açıldığında daha fazla
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              style={{ flex: 1 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                    Henüz yorum yok
                  </Text>
                  <Text style={[styles.emptySubtext, { color: theme.colors.textLight }]}>
                    İlk yorumu sen yap!
                  </Text>
                </View>
              }
            />

            {/* Input - Klavyenin Üstünde Sabit */}
            <View style={[styles.inputContainer, { 
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              paddingBottom: Math.max(insets.bottom, SPACING.sm),
              bottom: keyboardHeight > 0 ? keyboardHeight : 0,
            }]}>
                <Image
                  source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/32' }}
                  style={styles.inputAvatar}
                  contentFit="cover"
                />
                <TextInput
                  ref={commentInputRef}
                  style={[styles.input, { 
                    color: theme.colors.text,
                    backgroundColor: theme.colors.background,
                  }]}
                  placeholder="Yorum yaz..."
                  placeholderTextColor={theme.colors.textLight}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline={false}
                  maxLength={500}
                  blurOnSubmit={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSendComment}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: theme.colors.primary },
                    (!commentText.trim() || createCommentMutation.isPending) && styles.sendButtonDisabled,
                  ]}
                  onPress={() => {
                    handleSendComment();
                    Keyboard.dismiss();
                  }}
                  disabled={!commentText.trim() || createCommentMutation.isPending}
                >
                  {createCommentMutation.isPending ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Send size={20} color={COLORS.white} />
                  )}
                </TouchableOpacity>
              </View>

            {/* Menu Modal */}
            {menuVisibleCommentId && (
              <View style={styles.menuOverlay} onTouchEnd={() => setMenuVisibleCommentId(null)}>
                <View style={[styles.menuContainer, { backgroundColor: theme.colors.card }]}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      const comment = comments.find((c) => c.id === menuVisibleCommentId);
                      if (comment) {
                        handleEditComment(comment.id, comment.content);
                      }
                    }}
                  >
                    <Edit3 size={18} color={theme.colors.text} />
                    <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Düzenle</Text>
                  </TouchableOpacity>
                  <View style={[styles.menuDivider, { backgroundColor: theme.colors.border }]} />
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
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }
);

CommentSheetExpoGo.displayName = 'CommentSheetExpoGo';

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  headerCount: {
    fontSize: FONT_SIZES.md,
  },
  closeButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 40,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs + 2,
  },
  commentAuthorContainer: {
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  commentAuthor: {
    fontSize: FONT_SIZES.sm + 1,
    fontWeight: '700',
  },
  commentUsername: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  commentHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  commentTime: {
    fontSize: FONT_SIZES.xs - 1,
    opacity: 0.7,
  },
  commentTextContainer: {
    marginTop: SPACING.xs,
  },
  commentText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: Platform.OS === 'android' ? FONT_SIZES.sm * 1.5 : 20,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
    }),
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
  },
  inputContainer: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: SPACING.sm,
    zIndex: 1000,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  menuButton: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
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
  },
  menuDivider: {
    height: 1,
    marginVertical: SPACING.xs,
  },
  editContainer: {
    marginTop: SPACING.xs,
  },
  editInput: {
    borderRadius: 8,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.sm,
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
  },
});

