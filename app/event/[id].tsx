import React, { useState } from 'react';
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
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [commentText, setCommentText] = useState('');

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
      refetch();
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
    if (!commentText.trim() || !event) return;
    try {
      await addCommentMutation.mutateAsync({
        event_id: event.id,
        content: commentText.trim(),
      });
    } catch (error) {
      console.error('Comment error:', error);
      Alert.alert('Hata', 'Yorum eklenirken bir hata oluştu');
    }
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
                isLiked={false}
                likeCount={0}
                commentCount={0}
                shareCount={0}
                onLike={handleLike}
                onComment={() => {}}
                onShare={handleShare}
                onTag={() => {}}
                autoPlay={false}
                previewMode={true}
              />
            ) : (
              <OptimizedImage
                source={firstMedia}
                isThumbnail={false}
                style={styles.eventImage}
              />
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
        </View>

        {/* Comments Section */}
        <View style={[styles.commentsSection, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.commentsTitle, { color: theme.colors.text }]}>Yorumlar</Text>
          <View style={styles.commentInputContainer}>
            <TextInput
              style={[styles.commentInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              placeholder="Yorum yaz..."
              placeholderTextColor={theme.colors.textLight}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: COLORS.primary }]}
              onPress={handleAddComment}
              disabled={!commentText.trim()}
            >
              <Send size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          {commentsData?.comments && commentsData.comments.length > 0 ? (
            <ScrollView style={styles.commentsList}>
              {commentsData.comments.map((comment: any) => (
                <View key={comment.id} style={styles.commentItem}>
                  <TouchableOpacity
                    onPress={() => comment.user?.id && router.push(`/profile/${comment.user.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: comment.user?.avatar_url || 'https://via.placeholder.com/32' }}
                      style={styles.commentAvatar}
                    />
                  </TouchableOpacity>
                  <View style={styles.commentContent}>
                    <TouchableOpacity
                      onPress={() => comment.user?.id && router.push(`/profile/${comment.user.id}` as any)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.commentAuthor, { color: theme.colors.text }]}>
                        {comment.user?.full_name || 'Bilinmeyen'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.commentText, { color: theme.colors.text }]}>
                      {comment.content}
                    </Text>
                    <Text style={[styles.commentTime, { color: theme.colors.textLight }]}>
                      {formatTimeAgo(comment.created_at)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyComments}>
              <Text style={[styles.emptyCommentsText, { color: theme.colors.textLight }]}>
                Henüz yorum yok. İlk yorumu sen yap!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Footer />
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
    paddingBottom: 100,
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
  actionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  commentsSection: {
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  commentsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyComments: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  commentsList: {
    maxHeight: 300,
  },
  commentItem: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: SPACING.sm,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: FONT_SIZES.xs,
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

