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
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { trpc } from '@/lib/trpc';
import { Send, Paperclip, Smile, MoreVertical } from 'lucide-react-native';
import { Message } from '@/types/database';

export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user, profile } = useAuth();
  const { messages, loadMessages, subscribeToRoom, unsubscribeFromRoom, sendTypingIndicator, typingIndicators } = useChat();
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

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
          <View style={styles.avatarContainer}>
            {message.user?.avatar_url ? (
              <Image source={{ uri: message.user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{message.user?.full_name?.[0] || 'U'}</Text>
              </View>
            )}
          </View>
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
            <Text style={styles.senderName}>{message.user.full_name}</Text>
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

  const roomMessages = messages[roomId || ''] || [];
  const roomTyping = typingIndicators[roomId || ''] || [];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Sohbet',
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
});
