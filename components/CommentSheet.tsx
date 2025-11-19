/**
 * Comment Sheet Component
 * - Yorumları listele
 * - Yorum yazma input'u
 * - Videodan çıkmadan yorum okuma/yazma
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { Send, MoreVertical, Trash2, Edit3 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { formatTimeAgo } from '@/lib/time-utils';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';

interface CommentSheetProps {
  postId: string;
}

export function CommentSheet({ postId }: CommentSheetProps) {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [menuVisibleCommentId, setMenuVisibleCommentId] = useState<string | null>(null);
  const commentInputRef = useRef<TextInput>(null);

  const { data: commentsData, isLoading, refetch } = trpc.post.getComments.useQuery(
    { post_id: postId, limit: 50, offset: 0 },
    { enabled: !!postId }
  );

  const createCommentMutation = trpc.post.addComment.useMutation({
    onSuccess: () => {
      setCommentText('');
      Keyboard.dismiss(); // Klavyeyi kapat
      commentInputRef.current?.blur(); // Input'u blur et
      refetch();
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Yorum gönderilemedi. Lütfen tekrar deneyin.');
    },
  });

  const deleteCommentMutation = trpc.post.deleteComment.useMutation({
    onSuccess: () => {
      Keyboard.dismiss(); // Klavyeyi kapat
      setMenuVisibleCommentId(null);
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
      refetch();
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Yorum güncellenemedi. Lütfen tekrar deneyin.');
    },
  });

  const handleSendComment = () => {
    if (!commentText.trim() || !postId) return;
    
    // Event'ler için postId'yi düzelt (event_ prefix'ini kaldır)
    const actualPostId = postId.startsWith('event_') ? postId.replace('event_', '') : postId;
    
    // Event'ler için event comment mutation kullanılmalı, şimdilik post comment kullanıyoruz
    // TODO: Event'ler için ayrı mutation eklenebilir
    createCommentMutation.mutate({
      post_id: actualPostId,
      content: commentText.trim(),
    });
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

  const comments = commentsData?.comments || [];

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoider}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      enabled={true}
    >
      <View style={styles.container} pointerEvents="box-none">
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isEditing = editingCommentId === item.id;
          const isOwner = item.user_id === user?.id;
          
          return (
            <TouchableOpacity 
              style={[styles.commentItem, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}
              activeOpacity={0.9}
              onPress={() => {
                // Yorum kartına tıklanınca klavye kapansın
                Keyboard.dismiss();
                setMenuVisibleCommentId(null);
              }}
            >
              <Image
                source={{ uri: item.author?.avatar_url || 'https://via.placeholder.com/32' }}
                style={styles.commentAvatar}
                contentFit="cover"
              />
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.commentAuthor, { color: COLORS.white }]}>
                      {item.author?.full_name}
                    </Text>
                    {item.author?.verified && <VerifiedBadgeIcon size={14} />}
                  </View>
                  <Text style={[styles.commentTime, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                    {formatTimeAgo(item.created_at)}
                  </Text>
                </View>
                {isEditing ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      style={[styles.editInput, { color: COLORS.white, backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}
                      value={editingCommentText}
                      onChangeText={setEditingCommentText}
                      multiline
                      maxLength={500}
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
                  <>
                    <Text style={[styles.commentText, { color: COLORS.white }]}>
                      {item.content}
                    </Text>
                    {isOwner && (
                      <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => setMenuVisibleCommentId(menuVisibleCommentId === item.id ? null : item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MoreVertical size={16} color="rgba(255, 255, 255, 0.6)" />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: 'rgba(255, 255, 255, 0.8)' }]}>
              Henüz yorum yok
            </Text>
            <Text style={[styles.emptySubtext, { color: 'rgba(255, 255, 255, 0.6)' }]}>
              İlk yorumu sen yap!
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          comments.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Yorum Input - Instagram tarzı, şeffaf arka plan, en altta sabit */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderTopColor: 'rgba(255, 255, 255, 0.1)',
            },
            { paddingBottom: Math.max(insets.bottom, SPACING.md) },
          ]}
        >
          <Image
            source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/32' }}
            style={styles.inputAvatar}
            contentFit="cover"
          />
          <TextInput
            ref={commentInputRef}
            style={[
              styles.input,
              { backgroundColor: 'rgba(255, 255, 255, 0.15)', color: COLORS.white },
            ]}
            placeholder="Yorum yaz..."
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            textAlignVertical="top"
            blurOnSubmit={true}
            returnKeyType="send"
            onSubmitEditing={handleSendComment}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: theme.colors.primary },
              (!commentText.trim() || createCommentMutation.isPending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || createCommentMutation.isPending}
          >
            {createCommentMutation.isPending ? (
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoider: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.md,
    flexGrow: 1,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.sm,
    backgroundColor: 'transparent', // Şeffaf arka plan - video görünür
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
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs / 2,
  },
  commentAuthor: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  commentTime: {
    fontSize: FONT_SIZES.xs,
  },
  commentText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    gap: SPACING.sm,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxHeight: 100,
    fontSize: FONT_SIZES.sm,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  editButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
});

