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
  Modal,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { trpc } from '@/lib/trpc';
import { Send, Paperclip, Smile, MoreVertical, ImageIcon, Plus, Heart, MessageCircle, Share2, Phone, Video, Users, Search, Check, X, UserMinus, Trash2, LogOut } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Message, Post } from '@/types/database';
import { DISTRICT_BADGES } from '@/constants/districts';

const CHAT_MEDIA_BUCKET =
  (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_CHAT_MEDIA_BUCKET : undefined) || 'post_media';

export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { messages, loadMessages, subscribeToRoom, unsubscribeFromRoom, sendTypingIndicator, typingIndicators } = useChat();
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'posts'>('messages');
  const [uploading, setUploading] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [addMembersSearch, setAddMembersSearch] = useState('');
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<string[]>([]);
  const [showGroupOptionsModal, setShowGroupOptionsModal] = useState(false);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utils = trpc.useUtils();

  // Room bilgisini al - getRooms'dan filtrele
  const { data: roomsData, refetch: refetchRooms } = trpc.chat.getRooms.useQuery(
    { limit: 100, offset: 0 },
    { enabled: !!roomId }
  );
  const room = Array.isArray(roomsData) ? roomsData.find((r: any) => r.id === roomId) : null;

  // Direct chat için diğer kullanıcıyı bul
  const otherUser = room?.type === 'direct' 
    ? ((room as any).other_user || room.members?.find((m: any) => m.user_id !== user?.id)?.user) 
    : null;

  // Grup post'larını al (sadece grup ise)
  const isGroup = room?.type === 'group';
  const currentUserId = user?.id;
  const groupMembers = room?.members || [];
  const isGroupOwner = isGroup && room?.created_by === currentUserId;
  const { data: groupPostsData, refetch: refetchGroupPosts } = trpc.post.getPosts.useQuery(
    { author_id: undefined, limit: 50, offset: 0 },
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

  const { data: allUsersData } = trpc.user.getAllUsers.useQuery({
    search: addMembersSearch || undefined,
  });

  const addMembersMutation = trpc.chat.addMembers.useMutation({
    onSuccess: (data) => {
      Alert.alert('Başarılı', `${data.addedCount} kullanıcı gruba eklendi`);
      setShowAddMembersModal(false);
      setSelectedMembersToAdd([]);
      setAddMembersSearch('');
      refetchRooms();
      utils.chat.getRooms.invalidate();
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Üyeler eklenirken hata oluştu');
    },
  });

  const removeMemberMutation = trpc.chat.removeMember.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Üye gruptan çıkarıldı');
      refetchRooms();
      utils.chat.getRooms.invalidate();
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Üye çıkarılamadı');
    },
  });

  const leaveRoomMutation = trpc.chat.leaveRoom.useMutation({
    onSuccess: () => {
      utils.chat.getRooms.invalidate();
      refetchRooms();
      router.back();
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Gruptan ayrılamadınız');
    },
  });

  const deleteRoomMutation = trpc.chat.deleteRoom.useMutation({
    onSuccess: () => {
      utils.chat.getRooms.invalidate();
      router.back();
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Grup silinemedi');
    },
  });

  const handleAddMembers = () => {
    if (selectedMembersToAdd.length === 0) {
      Alert.alert('Hata', 'Lütfen en az bir kullanıcı seçin');
      return;
    }

    if (!isGroupOwner) {
      Alert.alert('Yetki Hatası', 'Sadece grup kurucusu üye ekleyebilir');
      return;
    }

    if (!roomId) return;

    addMembersMutation.mutate({
      roomId,
      memberIds: selectedMembersToAdd,
    });
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!roomId) return;

    Alert.alert(
      'Üyeyi Çıkar',
      `${memberName} gruptan çıkarılsın mı?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: () => removeMemberMutation.mutate({ roomId, memberId }),
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    if (!roomId) return;

    Alert.alert(
      'Gruptan Ayrıl',
      'Bu gruptan ayrılmak istediğine emin misin?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ayrıl',
          style: 'destructive',
          onPress: () => leaveRoomMutation.mutate({ roomId }),
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    if (!roomId) return;

    Alert.alert(
      'Grubu Sil',
      'Grup ve tüm mesajlar kalıcı olarak silinecek. Devam etmek istiyor musun?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Grubu Sil',
          style: 'destructive',
          onPress: () => deleteRoomMutation.mutate({ roomId }),
        },
      ]
    );
  };

  // Mevcut grup üyelerini al
  const existingMemberIds = groupMembers.map((m: any) => m.user_id || m.id);
  const availableUsers =
    allUsersData?.users?.filter(
      (u) => u.id !== currentUserId && !existingMemberIds.includes(u.id)
    ) || [];

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

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const fileSizeMB = file.size ? file.size / (1024 * 1024) : 0;

      // Dosya boyutu limiti: 10MB
      if (fileSizeMB > 10) {
        Alert.alert('Hata', 'Dosya boyutu 10MB\'dan büyük olamaz');
        return;
      }

      setUploading(true);

      // Dosyayı base64'e çevir
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          // Supabase Storage'a yükle
          const { supabase } = await import('@/lib/supabase');
          const fileName = `chat/${user?.id}/${Date.now()}-${file.name}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(CHAT_MEDIA_BUCKET)
            .upload(fileName, blob, {
              contentType: file.mimeType || 'application/octet-stream',
              upsert: false,
            });

          if (uploadError) {
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from(CHAT_MEDIA_BUCKET)
            .getPublicUrl(uploadData.path);

          // Mesajı gönder
          sendMessageMutation.mutate({
            roomId: roomId!,
            content: messageText.trim() || file.name,
            mediaUrl: publicUrl,
            mediaType: 'file',
            replyTo: replyTo?.id,
          });

          setMessageText('');
          setReplyTo(null);
        } catch (error: any) {
          Alert.alert('Hata', `Dosya yüklenirken hata oluştu: ${error.message}`);
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(blob);
    } catch (error: any) {
      Alert.alert('Hata', `Belge seçilirken hata oluştu: ${error.message}`);
      setUploading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const fileSizeMB = asset.fileSize ? asset.fileSize / (1024 * 1024) : 0;

      // Resim boyutu limiti: 10MB
      if (fileSizeMB > 10) {
        Alert.alert('Hata', 'Resim boyutu 10MB\'dan büyük olamaz');
        return;
      }

      setUploading(true);

      // Resmi yükle
      const { supabase } = await import('@/lib/supabase');
      const fileName = `chat/${user?.id}/${Date.now()}-image.jpg`;
      
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(CHAT_MEDIA_BUCKET)
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        Alert.alert('Hata', `Resim yüklenirken hata oluştu: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(CHAT_MEDIA_BUCKET)
        .getPublicUrl(uploadData.path);

      // Mesajı gönder
      sendMessageMutation.mutate({
        roomId: roomId!,
        content: messageText.trim() || '📷',
        mediaUrl: publicUrl,
        mediaType: 'image',
        replyTo: replyTo?.id,
      });

      setMessageText('');
      setReplyTo(null);
      setUploading(false);
    } catch (error: any) {
      Alert.alert('Hata', `Resim seçilirken hata oluştu: ${error.message}`);
      setUploading(false);
    }
  };

  const handleTyping = useCallback(() => {
    if (!roomId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendTypingIndicator(roomId);

    typingTimeoutRef.current = setTimeout(() => {
      // Typing indicator timeout
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
            <View style={styles.headerRight}>
              {room?.type === 'direct' && otherUser && (
                <>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => {
                      router.push({
                        pathname: '/call/[userId]',
                        params: {
                          userId: (otherUser as any).id || (otherUser as any).user_id,
                          userName: (otherUser as any).full_name || 'Kullanıcı',
                          userAvatar: (otherUser as any).avatar_url || '',
                          callType: 'audio',
                        },
                      } as any);
                    }}
                  >
                    <Phone size={22} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => {
                      router.push({
                        pathname: '/call/[userId]',
                        params: {
                          userId: (otherUser as any).id || (otherUser as any).user_id,
                          userName: (otherUser as any).full_name || 'Kullanıcı',
                          userAvatar: (otherUser as any).avatar_url || '',
                          callType: 'video',
                        },
                      } as any);
                    }}
                  >
                    <Video size={22} color={COLORS.primary} />
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => {
                  if (isGroup) {
                    setShowGroupOptionsModal(true);
                  } else {
                    // Direct chat için diğer seçenekler
                  }
                }}
              >
                <MoreVertical size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
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
            <TouchableOpacity 
              style={styles.attachButton}
              onPress={handlePickDocument}
              disabled={uploading}
            >
              <Paperclip size={20} color={uploading ? COLORS.textLight : COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.attachButton}
              onPress={handlePickImage}
              disabled={uploading}
            >
              <ImageIcon size={20} color={uploading ? COLORS.textLight : COLORS.primary} />
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
                (!messageText.trim() || sendMessageMutation.isPending || uploading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sendMessageMutation.isPending || uploading}
            >
              {(sendMessageMutation.isPending || uploading) ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Send size={18} color={COLORS.white} />
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

      {/* Add Members Modal */}
      <Modal
        visible={showAddMembersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddMembersModal(false);
          setSelectedMembersToAdd([]);
          setAddMembersSearch('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Üye Ekle</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddMembersModal(false);
                  setSelectedMembersToAdd([]);
                  setAddMembersSearch('');
                }}
                style={styles.modalCloseButton}
              >
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Search size={16} color={COLORS.textLight} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Kullanıcı ara..."
                placeholderTextColor={COLORS.textLight}
                value={addMembersSearch}
                onChangeText={setAddMembersSearch}
                autoCapitalize="none"
              />
            </View>

            <FlatList
              data={availableUsers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedMembersToAdd.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.memberItem, isSelected && styles.memberItemSelected]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedMembersToAdd(selectedMembersToAdd.filter(id => id !== item.id));
                      } else {
                        setSelectedMembersToAdd([...selectedMembersToAdd, item.id]);
                      }
                    }}
                  >
                    <Image
                      source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
                      style={styles.memberAvatar}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{item.full_name}</Text>
                      {(item as any).username && (
                        <Text style={styles.memberUsername}>@{(item as any).username}</Text>
                      )}
                    </View>
                    {isSelected && (
                      <View style={styles.memberCheck}>
                        <Check size={16} color={COLORS.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Kullanıcı bulunamadı</Text>
                </View>
              }
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.addButton, selectedMembersToAdd.length === 0 && styles.addButtonDisabled]}
                onPress={handleAddMembers}
                disabled={selectedMembersToAdd.length === 0 || addMembersMutation.isPending}
              >
                {addMembersMutation.isPending ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Users size={16} color={COLORS.white} />
                    <Text style={styles.addButtonText}>
                      {selectedMembersToAdd.length > 0 
                        ? `${selectedMembersToAdd.length} Üye Ekle` 
                        : 'Üye Seç'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Group Options Modal */}
      <Modal
        visible={showGroupOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGroupOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.optionsContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Grup Ayarları</Text>
              <TouchableOpacity onPress={() => setShowGroupOptionsModal(false)} style={styles.modalCloseButton}>
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.optionButton,
                !isGroupOwner && styles.optionButtonDisabled,
              ]}
              disabled={!isGroupOwner}
              onPress={() => {
                setShowGroupOptionsModal(false);
                setShowAddMembersModal(true);
              }}
            >
              <Users size={18} color={COLORS.primary} />
              <Text style={styles.optionButtonText}>Üye Ekle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                (!isGroupOwner || groupMembers.length === 0) && styles.optionButtonDisabled,
              ]}
              disabled={!isGroupOwner || groupMembers.length === 0}
              onPress={() => {
                setShowGroupOptionsModal(false);
                setShowManageMembersModal(true);
              }}
            >
              <UserMinus size={18} color={COLORS.primary} />
              <Text style={styles.optionButtonText}>Üyeleri Yönet</Text>
            </TouchableOpacity>

            {!isGroupOwner && (
              <TouchableOpacity
                style={[styles.optionButton, styles.optionDangerButton]}
                onPress={() => {
                  setShowGroupOptionsModal(false);
                  handleLeaveGroup();
                }}
              >
                <LogOut size={18} color={COLORS.error} />
                <Text style={[styles.optionButtonText, styles.optionDangerText]}>Gruptan Ayrıl</Text>
              </TouchableOpacity>
            )}

            {isGroupOwner && (
              <TouchableOpacity
                style={[styles.optionButton, styles.optionDangerButton]}
                onPress={() => {
                  setShowGroupOptionsModal(false);
                  handleDeleteGroup();
                }}
              >
                <Trash2 size={18} color={COLORS.error} />
                <Text style={[styles.optionButtonText, styles.optionDangerText]}>Grubu Sil</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Manage Members Modal */}
      <Modal
        visible={showManageMembersModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowManageMembersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Üyeleri Yönet</Text>
              <TouchableOpacity
                onPress={() => setShowManageMembersModal(false)}
                style={styles.modalCloseButton}
              >
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={groupMembers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isOwner = item.user_id === room?.created_by;
                return (
                  <View style={styles.memberManageItem}>
                    <Image
                      source={{ uri: item.user?.avatar_url || 'https://via.placeholder.com/40' }}
                      style={styles.memberAvatar}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{item.user?.full_name}</Text>
                      {item.user?.username && (
                        <Text style={styles.memberUsername}>@{item.user.username}</Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.memberRoleBadge,
                        isOwner && styles.memberRoleBadgeOwner,
                      ]}
                    >
                      <Text
                        style={[
                          styles.memberRoleText,
                          isOwner && styles.memberRoleTextOwner,
                        ]}
                      >
                        {isOwner ? 'Kurucu' : 'Üye'}
                      </Text>
                    </View>
                    {isGroupOwner && !isOwner && (
                      <TouchableOpacity
                        style={styles.memberRemoveButton}
                        onPress={() =>
                          handleRemoveMember(item.user_id, item.user?.full_name || 'Kullanıcı')
                        }
                      >
                        <UserMinus size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Üye bulunamadı</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingRight: SPACING.sm,
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
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
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
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 18,
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
    padding: SPACING.xs,
    marginRight: SPACING.xs,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    maxHeight: 100,
  },
  emojiButton: {
    padding: SPACING.sm,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: SPACING.xl,
  },
  optionsContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    margin: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  memberItemSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    marginRight: SPACING.md,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  memberUsername: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  memberCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  optionButtonDisabled: {
    opacity: 0.4,
  },
  optionButtonText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  optionDangerButton: {
    borderBottomWidth: 0,
    marginTop: SPACING.md,
  },
  optionDangerText: {
    color: COLORS.error,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  memberManageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  memberRoleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  memberRoleBadgeOwner: {
    backgroundColor: COLORS.primary + '15',
  },
  memberRoleText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
  },
  memberRoleTextOwner: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  memberRemoveButton: {
    padding: SPACING.xs,
  },
});
