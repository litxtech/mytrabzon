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
  Linking,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { trpc } from '@/lib/trpc';
import { Send, Paperclip, Smile, MoreVertical, ImageIcon, Plus, Heart, MessageCircle, Share2, Phone, Video as VideoIcon, Users, Search, Check, X, UserMinus, Trash2, LogOut, Edit3, XCircle } from 'lucide-react-native';
import VerifiedBadgeIcon from '@/components/VerifiedBadge';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Video as ExpoVideo } from 'expo-av';
import { Message, Post, UserProfile } from '@/types/database';
import { DISTRICT_BADGES } from '@/constants/districts';
import { Footer } from '@/components/Footer';

const CHAT_MEDIA_BUCKET =
  (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_CHAT_MEDIA_BUCKET : undefined) || 'post_media';

export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
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
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [pendingCallType, setPendingCallType] = useState<'audio' | 'video' | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utils = trpc.useUtils();

  const uploadChatMedia = useCallback(
    async (blob: Blob, mimeType: string, fileName: string) => {
      const { supabase } = await import('@/lib/supabase');
      const { data: uploadData, error } = await supabase.storage
        .from(CHAT_MEDIA_BUCKET)
        .upload(fileName, blob, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(uploadData.path);

      return publicUrl;
    },
    []
  );

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
  
  const markAsReadMutation = trpc.chat.markAsRead.useMutation();
  
  // startCallMutation - hook'u direkt çağır
  const startCallMutation = (trpc.chat as any).startCall?.useMutation({
    onSuccess: () => {},
    onError: (error: any) => {
      Alert.alert('Hata', error?.message || 'Arama başlatılamadı');
    },
  }) || { mutateAsync: async () => ({ sessionId: '' }), isPending: false };
  
  const handleStartCall = useCallback(async (type: 'audio' | 'video') => {
    if (!room || !otherUser) {
      Alert.alert('Hata', 'Arama başlatmak için sohbet bilgisi bulunamadı');
      return;
    }

    const targetId = (otherUser as any).id || (otherUser as any).user_id;

    if (!targetId) {
      Alert.alert('Hata', 'Hedef kullanıcı bulunamadı');
      return;
    }

    try {
      setPendingCallType(type);
      const result = await startCallMutation.mutateAsync({
        roomId: room.id,
        targetUserId: targetId,
        callType: type,
      });

      router.push({
        pathname: '/call/[userId]',
        params: {
          userId: targetId,
          userName: (otherUser as any).full_name || 'Kullanıcı',
          userAvatar: (otherUser as any).avatar_url || '',
          callType: type,
          sessionId: result.sessionId || '',
        },
      } as any);
    } catch (error: any) {
      Alert.alert('Hata', error?.message || 'Arama başlatılamadı');
    } finally {
      setPendingCallType(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUser, room, router]);

  // Grup post'larını al (sadece grup ise)
  const isGroup = room?.type === 'group';
  const currentUserId = user?.id;
  const groupMembers = room?.members || [];
  const isGroupOwner = isGroup && (room as any)?.created_by === currentUserId;
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
    onMutate: async (newMessage) => {
      // Optimistic update: Mesajı hemen ekle
      if (!roomId || !user) return;
      
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        room_id: roomId,
        user_id: user.id,
        content: newMessage.content,
        media_url: newMessage.mediaUrl || null,
        media_type: newMessage.mediaType || null,
        reply_to: newMessage.replyTo || null,
        is_edited: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || 'Sen',
          username: user.user_metadata?.username || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          bio: null,
          district: 'Ortahisar' as const,
          city: null,
          age: null,
          gender: null,
          phone: null,
          address: null,
          height: null,
          weight: null,
          social_media: {},
          privacy_settings: {
            show_age: false,
            show_gender: false,
            show_phone: false,
            show_email: false,
            show_address: false,
            show_height: false,
            show_weight: false,
            show_social_media: false,
          },
          show_address: false,
          show_in_directory: false,
          verified: user.user_metadata?.verified || false,
          selfie_verified: false,
          points: 0,
          deletion_requested_at: null,
          deletion_scheduled_at: null,
          supporter_badge: false,
          supporter_badge_color: null,
          supporter_badge_visible: false,
          supporter_badge_expires_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as UserProfile,
      };

      // ChatContext'e optimistic mesajı ekle
      const currentMessages = messages[roomId] || [];
      const updatedMessages = [...currentMessages, optimisticMessage].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      loadMessages(roomId, updatedMessages);
      
      setMessageText('');
      setReplyTo(null);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      
      return { previousMessages: currentMessages };
    },
    onError: (error, variables, context) => {
      // Hata durumunda geri al
      if (context?.previousMessages && roomId) {
        loadMessages(roomId, context.previousMessages);
      }
      Alert.alert('Hata', 'Mesaj gönderilemedi: ' + error.message);
    },
    onSettled: () => {
      // Cache'i invalidate et, ama optimistic update'i koru
      utils.chat.getMessages.invalidate({ roomId });
      utils.chat.getRooms.invalidate();
    },
  });

  const { data: allUsersData } = trpc.user.getAllUsers.useQuery({
    search: addMembersSearch || undefined,
  });

  const deleteMessageMutation = trpc.chat.deleteMessage.useMutation({
    onMutate: async ({ messageId }) => {
      // Optimistic update: Mesajı hemen sil
      if (!roomId) return;
      
      const currentMessages = messages[roomId] || [];
      const previousMessages = [...currentMessages];
      
      const filteredMessages = currentMessages.filter((m: Message) => m.id !== messageId);
      const sortedMessages = filteredMessages.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      loadMessages(roomId, sortedMessages);
      
      setShowMessageActions(false);
      setSelectedMessage(null);
      
      return { previousMessages };
    },
    onError: (error, variables, context) => {
      // Hata durumunda geri al
      if (context?.previousMessages && roomId) {
        loadMessages(roomId, context.previousMessages);
      }
      Alert.alert('Hata', error.message || 'Mesaj silinemedi');
    },
    onSuccess: () => {
      // Gerçek veriyi yükle
      if (roomId) {
        loadMessages(roomId);
      }
    },
  });

  const deleteAllMessagesMutation = trpc.chat.deleteAllMessages.useMutation({
    onSuccess: () => {
      if (roomId) {
        loadMessages(roomId);
      }
      setShowGroupOptionsModal(false);
      Alert.alert('Başarılı', 'Tüm mesajlar silindi');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Mesajlar silinemedi');
    },
  });

  const updateMessageMutation = trpc.chat.updateMessage.useMutation({
    onSuccess: () => {
      if (roomId) {
        loadMessages(roomId);
      }
      setIsEditingMessage(false);
      setShowMessageActions(false);
      setSelectedMessage(null);
      setEditMessageText('');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Mesaj güncellenemedi');
    },
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

  const approveBookingMutation = trpc.ride.approveBooking.useMutation({
    onSuccess: () => {
      if (roomId) {
        loadMessages(roomId);
      }
      Alert.alert('Başarılı', 'Rezervasyon onaylandı');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Rezervasyon onaylanamadı');
    },
  });

  const rejectBookingMutation = trpc.ride.rejectBooking.useMutation({
    onSuccess: () => {
      if (roomId) {
        loadMessages(roomId);
      }
      Alert.alert('Başarılı', 'Rezervasyon reddedildi');
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Rezervasyon reddedilemedi');
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
    
    // Mesaj gönderildikten sonra klavyeyi kapat
    Keyboard.dismiss();
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      const fileSizeMB = file.size ? file.size / (1024 * 1024) : 0;

      if (fileSizeMB > 20) {
        Alert.alert('Hata', 'Dosya boyutu 20MB\'dan büyük olamaz');
        return;
      }

      setUploading(true);

      const response = await fetch(file.uri);
      const blob = await response.blob();
      const sanitizedName = file.name || `dosya-${Date.now()}`;
      const fileName = `chat/${user?.id}/${Date.now()}-${sanitizedName}`;
      const publicUrl = await uploadChatMedia(blob, file.mimeType || 'application/octet-stream', fileName);

      sendMessageMutation.mutate({
        roomId: roomId!,
        content: messageText.trim() || sanitizedName,
        mediaUrl: publicUrl,
        mediaType: 'file',
        replyTo: replyTo?.id,
      });

      setMessageText('');
      setReplyTo(null);
    } catch (error: any) {
      Alert.alert('Hata', `Belge seçilirken hata oluştu: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handlePickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
        videoMaxDuration: 60,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const fileSizeMB = asset.fileSize ? asset.fileSize / (1024 * 1024) : 0;

      if (fileSizeMB > 30) {
        Alert.alert('Hata', 'Medya boyutu 30MB\'dan büyük olamaz');
        return;
      }

      setUploading(true);

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const isVideo = asset.type === 'video';
      const extension =
        asset.fileName?.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
      const mimeType = asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');
      const fileName = `chat/${user?.id}/${Date.now()}.${extension}`;
      const publicUrl = await uploadChatMedia(blob, mimeType, fileName);

      sendMessageMutation.mutate({
        roomId: roomId!,
        content: messageText.trim() || (isVideo ? '🎬 Video' : '📷 Fotoğraf'),
        mediaUrl: publicUrl,
        mediaType: isVideo ? 'video' : 'image',
        replyTo: replyTo?.id,
      });

      setMessageText('');
      setReplyTo(null);
    } catch (error: any) {
      Alert.alert('Hata', `Medya seçilirken hata oluştu: ${error.message}`);
    } finally {
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

  const handleMessageLongPress = (message: Message) => {
    if (message.user_id !== user?.id) return;
    setSelectedMessage(message);
    setShowMessageActions(true);
  };

  const handleDeleteMessage = () => {
    if (!selectedMessage) return;
    deleteMessageMutation.mutate({ messageId: selectedMessage.id });
  };

  const startEditingMessage = () => {
    if (!selectedMessage) return;
    setEditMessageText(selectedMessage.content);
    setIsEditingMessage(true);
    setShowMessageActions(false);
  };

  const handleUpdateMessage = () => {
    if (!selectedMessage || !editMessageText.trim()) {
      return;
    }
    updateMessageMutation.mutate({
      messageId: selectedMessage.id,
      content: editMessageText.trim(),
    });
  };

  const closeMessageModals = () => {
    setShowMessageActions(false);
    setIsEditingMessage(false);
    setSelectedMessage(null);
    setEditMessageText('');
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item: message }: { item: Message }) => {
    const isOwn = message.user_id === user?.id;
    const showAvatar = !isOwn && message.user;

    // Swipe delete için renderRightActions
    const renderRightActions = () => {
      if (!isOwn) return null;
      return (
        <TouchableOpacity
          style={styles.swipeDeleteButton}
          onPress={() => {
            Alert.alert(
              'Mesajı Sil',
              'Bu mesajı silmek istediğinize emin misiniz?',
              [
                { text: 'İptal', style: 'cancel' },
                {
                  text: 'Sil',
                  style: 'destructive',
                  onPress: () => deleteMessageMutation.mutate({ messageId: message.id }),
                },
              ]
            );
          }}
        >
          <Trash2 size={20} color={COLORS.white} />
          <Text style={styles.swipeDeleteText}>Sil</Text>
        </TouchableOpacity>
      );
    };

    const messageContent = (
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

        <TouchableOpacity
          activeOpacity={isOwn ? 0.8 : 1}
          onLongPress={() => handleMessageLongPress(message)}
          delayLongPress={200}
          disabled={!isOwn}
          style={styles.messagePressArea}
        >
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
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text style={styles.senderName}>{message.user.full_name}</Text>
                {message.user.verified && <VerifiedBadgeIcon size={14} />}
              </TouchableOpacity>
            )}

            <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
              {message.content}
            </Text>

            {/* Rezervasyon onay/red butonları */}
            {!isOwn && (message as any).data?.type === 'RIDE_BOOKING' && (message as any).data?.status === 'pending' && (
              <View style={styles.reservationActions}>
                <TouchableOpacity
                  style={[styles.approveButton, { backgroundColor: COLORS.success }]}
                  onPress={() => {
                    if ((message as any).data?.booking_id) {
                      approveBookingMutation.mutate({ booking_id: (message as any).data.booking_id });
                    }
                  }}
                  disabled={approveBookingMutation.isPending || rejectBookingMutation.isPending}
                >
                  {approveBookingMutation.isPending ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Check size={16} color={COLORS.white} />
                      <Text style={styles.actionButtonText}>Onayla</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rejectButton, { backgroundColor: COLORS.error }]}
                  onPress={() => {
                    if ((message as any).data?.booking_id) {
                      rejectBookingMutation.mutate({ booking_id: (message as any).data.booking_id });
                    }
                  }}
                  disabled={approveBookingMutation.isPending || rejectBookingMutation.isPending}
                >
                  {rejectBookingMutation.isPending ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <XCircle size={16} color={COLORS.white} />
                      <Text style={styles.actionButtonText}>Reddet</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {message.media_url && message.media_type === 'image' && (
              <TouchableOpacity
                onPress={() => Linking.openURL(message.media_url!)}
                activeOpacity={0.9}
              >
                        <Image
                  source={{ uri: message.media_url }}
                  style={styles.messageImage}
                />
              </TouchableOpacity>
            )}

            {message.media_url && message.media_type === 'video' && (
              <ExpoVideo
                source={{ uri: message.media_url }}
                style={styles.messageVideo}
                useNativeControls
              />
            )}

            {message.media_url && message.media_type === 'file' && (
              <TouchableOpacity
                style={styles.fileAttachment}
                onPress={() => Linking.openURL(message.media_url!)}
              >
                <Paperclip size={16} color={COLORS.white} />
                <Text style={styles.fileAttachmentText}>Dosyayı Aç</Text>
              </TouchableOpacity>
            )}

            <View style={styles.messageMetaRow}>
              <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
                {formatMessageTime(message.created_at)}
              </Text>
              {message.is_edited && (
                <Text style={styles.editedTag}>düzenlendi</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );

    // Swipeable sadece kendi mesajları için
    if (isOwn) {
      return (
        <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
          {messageContent}
        </Swipeable>
      );
    }

    return messageContent;
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
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: room?.name || 'Sohbet',
          headerRight: () => (
            <View style={styles.headerRight}>
              {room?.type === 'direct' && otherUser && (
                <>
                  <TouchableOpacity
                    style={styles.headerButtonWithText}
                    onPress={() => handleStartCall('audio')}
                    disabled={startCallMutation.isPending}
                  >
                    {startCallMutation.isPending && pendingCallType === 'audio' ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <>
                        <Phone size={18} color={COLORS.primary} />
                        <Text style={styles.headerButtonText}>Sesli</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.headerButtonWithText}
                    onPress={() => handleStartCall('video')}
                    disabled={startCallMutation.isPending}
                  >
                    {startCallMutation.isPending && pendingCallType === 'video' ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <>
                        <VideoIcon size={18} color={COLORS.primary} />
                        <Text style={styles.headerButtonText}>Görüntülü</Text>
                      </>
                    )}
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
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 80 : 0}
        enabled={Platform.OS === 'ios'}
      >
        <View style={styles.contentContainer}>
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
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={Keyboard.dismiss}
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
              data={((groupPostsData?.posts || []) as unknown) as Post[]}
              renderItem={renderGroupPost}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.postsList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Henüz gönderi yok</Text>
                  <Text style={styles.emptySubtext}>İlk paylaşımı yapan sen ol!</Text>
                </View>
              }
              ListFooterComponent={<Footer />}
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

          {/* Input Container - En altta sabit, klavyenin üstünde */}
          {activeTab === 'messages' && (
            <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
              <TouchableOpacity 
                style={styles.attachButton}
                onPress={handlePickDocument}
                disabled={uploading}
              >
                <Paperclip size={20} color={uploading ? COLORS.textLight : COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.attachButton}
                onPress={handlePickMedia}
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
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={handleSendMessage}
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
        </View>

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

      {/* Message Actions */}
      <Modal
        visible={showMessageActions}
        transparent
        animationType="fade"
        onRequestClose={closeMessageModals}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeMessageModals}
        >
          <View style={styles.messageActionSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Mesaj işlemleri</Text>
            <TouchableOpacity
              style={styles.messageActionButton}
              onPress={startEditingMessage}
            >
              <Edit3 size={18} color={COLORS.text} />
              <Text style={styles.messageActionText}>Mesajı Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.messageActionButton, styles.messageActionDanger]}
              onPress={handleDeleteMessage}
            >
              <Trash2 size={18} color={COLORS.error} />
              <Text style={[styles.messageActionText, styles.optionDangerText]}>Mesajı Sil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.messageActionButton}
              onPress={closeMessageModals}
            >
              <X size={18} color={COLORS.textLight} />
              <Text style={styles.messageActionText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={isEditingMessage}
        transparent
        animationType="fade"
        onRequestClose={closeMessageModals}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.messageEditModal}>
            <Text style={styles.modalTitle}>Mesajı Düzenle</Text>
            <TextInput
              style={styles.messageEditInput}
              multiline
              value={editMessageText}
              onChangeText={setEditMessageText}
              maxLength={1000}
            />
            <View style={styles.messageEditActions}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={closeMessageModals}>
                <Text style={styles.modalSecondaryText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={handleUpdateMessage}
                disabled={updateMessageMutation.isPending || !editMessageText.trim()}
              >
                {updateMessageMutation.isPending ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.modalPrimaryText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

            {(isGroupOwner || (room?.type === 'direct' && currentUserId)) && (
              <TouchableOpacity
                style={[styles.optionButton, styles.optionDangerButton]}
                onPress={() => {
                  setShowGroupOptionsModal(false);
                  Alert.alert(
                    'Tüm Mesajları Sil',
                    'Tüm mesajları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
                    [
                      { text: 'İptal', style: 'cancel' },
                      {
                        text: 'Sil',
                        style: 'destructive',
                        onPress: () => {
                          if (roomId) {
                            deleteAllMessagesMutation.mutate({ roomId });
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Trash2 size={18} color={COLORS.error} />
                <Text style={[styles.optionButtonText, styles.optionDangerText]}>Tüm Mesajları Sil</Text>
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
                const isOwner = item.user_id === (room as any)?.created_by;
                const user = (item as any).user || {};
                return (
                  <View style={styles.memberManageItem}>
                    <Image
                      source={{ uri: user.avatar_url || 'https://via.placeholder.com/40' }}
                      style={styles.memberAvatar}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{user.full_name || 'Kullanıcı'}</Text>
                      {user.username && (
                        <Text style={styles.memberUsername}>@{user.username}</Text>
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
                          handleRemoveMember(item.user_id, user.full_name || 'Kullanıcı')
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingRight: SPACING.sm,
  },
  headerButton: {
    padding: SPACING.sm,
  },
  headerButtonWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  headerButtonText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '600',
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
  messagePressArea: {
    flex: 1,
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
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 16,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  messageVideo: {
    width: 240,
    height: 220,
    borderRadius: 16,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.text,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    marginTop: SPACING.sm,
  },
  fileAttachmentText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
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
  editedTag: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    fontStyle: 'italic',
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
    alignItems: 'flex-end' as const,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
    minHeight: 60,
  },
  attachButton: {
    padding: SPACING.xs,
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
    minHeight: 40,
    textAlignVertical: 'top' as const,
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
    position: 'absolute' as const,
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    elevation: 20,
    zIndex: 999,
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
  swipeDeleteButton: {
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    marginVertical: SPACING.xs,
  },
  swipeDeleteText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  messageActionSheet: {
    width: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  messageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  messageActionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  messageActionDanger: {
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  messageEditModal: {
    width: '85%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  messageEditInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    minHeight: 100,
    marginTop: SPACING.md,
    color: COLORS.text,
    textAlignVertical: 'top' as const,
  },
  messageEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalSecondaryButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalSecondaryText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  modalPrimaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalPrimaryText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  reservationActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
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
