/**
 * Comment Sheet Component
 * - Yorumları listele
 * - Yorum yazma input'u
 * - Videodan çıkmadan yorum okuma/yazma
 */

import React, { useState } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { formatTimeAgo } from '@/lib/time-utils';

interface CommentSheetProps {
  postId: string;
}

export function CommentSheet({ postId }: CommentSheetProps) {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [commentText, setCommentText] = useState('');

  const { data: commentsData, isLoading, refetch } = trpc.post.getComments.useQuery(
    { post_id: postId, limit: 50, offset: 0 },
    { enabled: !!postId }
  );

  const createCommentMutation = trpc.post.addComment.useMutation({
    onSuccess: () => {
      setCommentText('');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Yorum gönderilemedi. Lütfen tekrar deneyin.');
    },
  });

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    createCommentMutation.mutate({
      post_id: postId,
      content: commentText.trim(),
    });
  };

  const comments = commentsData?.comments || [];

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoider}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : insets.bottom + 40}
    >
      <View style={styles.container}>
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.commentItem, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
            <Image
              source={{ uri: item.author?.avatar_url || 'https://via.placeholder.com/32' }}
              style={styles.commentAvatar}
              contentFit="cover"
            />
            <View style={styles.commentContent}>
              <View style={styles.commentHeader}>
                <Text style={[styles.commentAuthor, { color: COLORS.white }]}>
                  {item.author?.full_name}
                </Text>
                <Text style={[styles.commentTime, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                  {formatTimeAgo(item.created_at)}
                </Text>
              </View>
              <Text style={[styles.commentText, { color: COLORS.white }]}>
                {item.content}
              </Text>
            </View>
          </View>
        )}
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
});

