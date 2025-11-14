import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { trpc } from '@/lib/trpc';
import { Send, Paperclip, Smile, MoreVertical, ImageIcon, Plus, Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { Message, Post } from '@/types/database';
import { DISTRICT_BADGES } from '@/constants/districts';

export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { messages, loadMessages, subscribeToRoom, unsubscribeFromRoom, sendTypingIndicator, typingIndicators } = useChat();
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'posts'>('messages');
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Room bilgisini al
  const { data: room } = trpc.chat.getRoom.useQuery(
    { roomId: roomId! },
    { enabled: !!roomId }
  );

  // Grup post'larını al (sadece grup ise)
  const isGroup = room?.type === 'group';
  const { data: groupPostsData, refetch: refetchGroupPosts } = trpc.post.getPosts.useQuery(
    { room_id: roomId!, limit: 50, offset: 0 },
    { enabled: !!roomId && isGroup }
  );

  const likePostMutation = trpc.post.likePost.useMutation({
    onSuccess: () => {
      refetchGroupPosts();
    },
  });

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText('');
      setReplyTo(null);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
    onError: (error) => {
      Alert.alert('Hata', 'Mesaj gönderilemedi: ' + error.message);
    },
  });

  const markAsReadMutation = trpc.chat.markAsRead.useMutation();

  useEffect(() => {
    if (!roomId) return;

    loadMessages(roomId);
    subscribeToRoom(roomId);
    markAsReadMutation.mutate({ roomId });

    return () => {
      unsubscribeFromRoom(roomId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !roomId) return;

    sendMessageMutation.mutate({
      roomId,
      content: messageText.trim(),
      replyTo: replyTo?.id,
    });
  };

  const handleTyping = useCallback(() => {
    if (!roomId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendTypingIndicator(roomId);

    typingTimeoutRef.current = setTimeout(() => {
      
    }, 3000);
  }, [roomId, sendTypingIndicator]);

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item: message }: { item: Message }) => {
    const isOwn = message.user_id === user?.id;
    const showAvatar = !isOwn && message.user;

    return (
      <View style={[styles.messageContainer, isOwn && styles.ownMessageContainer]}>
        {showAvatar && (
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => router.push(`/profile/${message.user_id}` as any)}
            activeOpacity={0.7}
          >
            {message.user?.avatar_url ? (
              <Image source={{ uri: message.user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{message.user?.full_name?.[0] || 'U'}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={[styles.messageBubble, isOwn ? styles.ownMessage : styles.otherMessage]}>
          {message.reply_to_message && (
            <View style={styles.replyContainer}>
              <Text style={styles.replyUser}>{message.reply_to_message.user?.full_name}</Text>
              <Text style={styles.replyText} numberOfLines={1}>
                {message.reply_to_message.content}
              </Text>
            </View>
          )}

          {!isOwn && message.user && (
            <TouchableOpacity
              onPress={() => router.push(`/profile/${message.user_id}` as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.senderName}>{message.user.full_name}</Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
            {message.content}
          </Text>

          <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
            {formatMessageTime(message.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  const formatCount = (count: number | null | undefined): string => {
    if (!count) return '0';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatPostTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} sa önce`;
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLike = async (postId: string) => {
    try {
      await likePostMutation.mutateAsync({ postId });
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const renderGroupPost = ({ item }: { item: Post }) => {
    const firstMedia = item.media && item.media.length > 0 ? item.media[0] : null;

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Image
            source={{
              uri: item.author?.avatar_url || 'https://via.placeholder.com/40',
            }}
            style={styles.postAvatar}
          />
          <View style={styles.postHeaderInfo}>
            <Text style={styles.postAuthor}>{item.author?.full_name}</Text>
            <View style={styles.postMeta}>
              <Text style={styles.postDistrict}>
                {DISTRICT_BADGES[item.district as keyof typeof DISTRICT_BADGES] || '📍'} {item.district}
              </Text>
              <Text style={styles.postTime}>
                {' • '}
                {formatPostTime(item.created_at)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.postContent}>{item.content}</Text>

        {firstMedia && (
          <Image
            source={{ uri: firstMedia.path }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

        {item.media && item.media.length > 1 && (
          <View style={styles.mediaCountBadge}>
            <Text style={styles.mediaCountText}>+{item.media.length - 1}</Text>
          </View>
        )}

        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <Heart
              size={18}
              color={item.is_liked ? COLORS.error : COLORS.textLight}
              fill={item.is_liked ? COLORS.error : 'transparent'}
            />
            <Text style={styles.actionText}>{formatCount(item.like_count)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/post/${item.id}` as any)}
          >
            <MessageCircle size={18} color={COLORS.textLight} />
            <Text style={styles.actionText}>{formatCount(item.comment_count)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Share2 size={18} color={COLORS.textLight} />
            <Text style={styles.actionText}>{formatCount(item.share_count)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const roomMessages = messages[roomId || ''] || [];
  const roomTyping = typingIndicators[roomId || ''] || [];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: room?.name || 'Sohbet',
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <MoreVertical size={24} color={COLORS.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Tab Bar - Sadece grup ise göster */}
        {isGroup && (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
              onPress={() => setActiveTab('messages')}
            >
              <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>
                Mesajlar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
              onPress={() => setActiveTab('posts')}
            >
              <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
                Gönderiler
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'messages' ? (
          <FlatList
            ref={flatListRef}
            data={roomMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={styles.messagesList}
            ListFooterComponent={
              roomTyping.length > 0 ? (
                <View style={styles.typingContainer}>
                  <Text style={styles.typingText}>
                    {roomTyping.map(t => t.user_name).join(', ')} yazıyor...
                  </Text>
                </View>
              ) : null
            }
          />
        ) : (
          <FlatList
            data={groupPostsData?.posts || []}
            renderItem={renderGroupPost}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.postsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Henüz gönderi yok</Text>
                <Text style={styles.emptySubtext}>İlk paylaşımı yapan sen ol!</Text>
              </View>
            }
          />
        )}

        {replyTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyPreviewContent}>
              <Text style={styles.replyPreviewUser}>{replyTo.user?.full_name}</Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>
                {replyTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyPreviewClose}>
              <Text style={styles.replyPreviewCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input Container - Sadece mesajlar sekmesinde göster */}
        {activeTab === 'messages' && (
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachButton}>
              <Paperclip size={24} color={COLORS.textLight} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Mesaj yaz..."
              placeholderTextColor={COLORS.textLight}
              value={messageText}
              onChangeText={(text) => {
                setMessageText(text);
                handleTyping();
              }}
              multiline
              maxLength={1000}
            />

            <TouchableOpacity style={styles.emojiButton}>
              <Smile size={24} color={COLORS.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || sendMessageMutation.isPending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Send size={20} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* FAB - Gönderiler sekmesinde göster */}
        {activeTab === 'posts' && isGroup && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push(`/create-post?room_id=${roomId}` as any)}
          >
            <Plus size={28} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerButton: {
    padding: SPACING.sm,
  },
  messagesList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  messageContainer: {
    flexDirection: 'row' as const,
    marginVertical: SPACING.xs,
    alignItems: 'flex-end' as const,
  },
  ownMessageContainer: {
    justifyContent: 'flex-end' as const,
  },
  avatarContainer: {
    marginRight: SPACING.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600' as const,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: SPACING.sm,
    borderRadius: 16,
    marginBottom: SPACING.xs,
  },
  ownMessage: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600' as const,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  messageText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 20,
  },
  ownMessageText: {
    color: COLORS.white,
  },
  messageTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    alignSelf: 'flex-end' as const,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  replyContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  replyUser: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600' as const,
    color: COLORS.primary,
    marginBottom: 2,
  },
  replyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  typingContainer: {
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  typingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    fontStyle: 'italic' as const,
  },
  replyPreview: {
    flexDirection: 'row' as const,
    backgroundColor: COLORS.white,
    padding: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center' as const,
  },
  replyPreviewContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  replyPreviewUser: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600' as const,
    color: COLORS.primary,
  },
  replyPreviewText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  replyPreviewClose: {
    padding: SPACING.sm,
  },
  replyPreviewCloseText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textLight,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attachButton: {
    padding: SPACING.sm,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    maxHeight: 100,
  },
  emojiButton: {
    padding: SPACING.sm,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginLeft: SPACING.sm,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  postsList: {
    paddingVertical: SPACING.sm,
  },
  postCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm,
  },
  postHeaderInfo: {
    flex: 1,
  },
  postAuthor: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
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
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 300,
  },
  mediaCountBadge: {
    position: 'absolute',
    top: 70,
    right: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mediaCountText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  emptyContainer: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});
