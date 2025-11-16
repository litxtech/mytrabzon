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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.commentItem, { borderBottomColor: theme.colors.border + '40' }]}>
            <Image
              source={{ uri: item.author?.avatar_url || 'https://via.placeholder.com/32' }}
              style={styles.commentAvatar}
              contentFit="cover"
            />
            <View style={styles.commentContent}>
              <View style={styles.commentHeader}>
                <Text style={[styles.commentAuthor, { color: theme.colors.text }]}>
                  {item.author?.full_name}
                </Text>
                <Text style={[styles.commentTime, { color: theme.colors.textLight }]}>
                  {formatTimeAgo(item.created_at)}
                </Text>
              </View>
              <Text style={[styles.commentText, { color: theme.colors.text }]}>
                {item.content}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textLight }]}>
              Henüz yorum yok
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textLight }]}>
              İlk yorumu sen yap!
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Yorum Input - Şeffaf arka plan */}
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: theme.colors.surface + 'E0', borderTopColor: theme.colors.border + '40' }, // %88 opacity
          { paddingBottom: Math.max(insets.bottom, SPACING.md) },
        ]}
      >
        <Image
          source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/32' }}
          style={styles.inputAvatar}
          contentFit="cover"
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text }]}
          placeholder="Yorum yaz..."
          placeholderTextColor={theme.colors.textLight}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: theme.colors.primary },
            !commentText.trim() && styles.sendButtonDisabled,
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.md,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.sm,
    backgroundColor: 'transparent', // Şeffaf arka plan
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

