import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { retryOperation } from '@/utils/retry';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  ChatRoomWithDetails,
  Message,
  TypingIndicator,
  OnlineStatus,
  ChatMember,
  ChatRoom,
  UserProfile,
} from '@/types/database';
import { RealtimeChannel } from '@supabase/supabase-js';

type NormalizedError = {
  message: string;
  details: Record<string, unknown>;
};

const normalizeRoomsError = (error: unknown): NormalizedError => {
  if (error instanceof Error) {
    const nativeError = error as Error & { cause?: unknown };
    return {
      message: error.message || 'Chat odaları yüklenemedi',
      details: {
        name: error.name,
        stack: error.stack ?? null,
        cause: nativeError.cause ?? null,
      },
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
      details: { raw: error },
    };
  }

  return {
    message: 'Chat odaları yüklenirken bilinmeyen bir hata oluştu',
    details: { raw: error },
  };
};

const MESSAGE_SELECT_FIELDS = 'id, room_id, user_id, content, media_url, media_type, reply_to, is_edited, created_at, updated_at, user:user_profiles(*)';

type MemberWithProfile = ChatMember & { user?: UserProfile | null };

type RawMessage = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: Message['media_type'];
  reply_to: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  user?: UserProfile | null;
  reply_to_message?: Message['reply_to_message'];
  reactions?: Message['reactions'];
};

const createFallbackProfile = (userId: string): UserProfile => {
  const placeholderTimestamp = new Date(0).toISOString();
  return {
    id: userId,
    email: '',
    full_name: 'Bilinmeyen Kullanıcı',
    avatar_url: null,
    bio: null,
    district: 'Ortahisar',
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
    verified: false,
    selfie_verified: false,
    points: 0,
    deletion_requested_at: null,
    deletion_scheduled_at: null,
    created_at: placeholderTimestamp,
    updated_at: placeholderTimestamp,
  };
};

const mapMessage = (raw: RawMessage): Message => ({
  id: raw.id,
  room_id: raw.room_id,
  user_id: raw.user_id,
  content: raw.content,
  media_url: raw.media_url,
  media_type: raw.media_type,
  reply_to: raw.reply_to,
  is_edited: raw.is_edited,
  created_at: raw.created_at,
  updated_at: raw.updated_at,
  user: raw.user ?? createFallbackProfile(raw.user_id),
  reply_to_message: raw.reply_to_message,
  reactions: raw.reactions,
});

const fetchRoomMessages = async (roomId: string, limit: number): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT_FIELDS)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load messages for room', {
      roomId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(error.message ?? 'Mesajlar yüklenemedi');
  }

  return (data ?? []).map((entry) => mapMessage(entry as RawMessage));
};

const fetchLatestMessage = async (roomId: string): Promise<Message | null> => {
  try {
    const latest = await fetchRoomMessages(roomId, 1);
    return latest[0] ?? null;
  } catch (error) {
    console.error('Failed to fetch latest message for room', roomId, error);
    return null;
  }
};

const fetchRoomsViaSupabase = async (currentUserId: string): Promise<ChatRoomWithDetails[]> => {
  type MembershipRow = {
    room_id: string;
    unread_count: number;
    role: 'admin' | 'member';
    last_read_at: string | null;
  };

  const memberships = await retryOperation(async () => {
    const { data: membershipsRaw, error: membershipsError } = await supabase
      .from('chat_members')
      .select('room_id, unread_count, role, last_read_at')
      .eq('user_id', currentUserId);

    if (membershipsError) {
      console.error('Failed to fetch chat memberships', membershipsError);
      throw new Error(membershipsError.message ?? 'Üyelik bilgisi alınamadı');
    }

    return (membershipsRaw ?? []) as MembershipRow[];
  });

  if (memberships.length === 0) {
    return [];
  }

  const membershipMap = memberships.reduce<Record<string, MembershipRow>>((acc, membership) => {
    acc[membership.room_id] = membership;
    return acc;
  }, {});

  const roomIds = Object.keys(membershipMap);

  const { data: roomsRaw, error: roomsError } = await supabase
    .from('chat_rooms')
    .select('id, name, avatar_url, type, district, last_message_at, created_by, created_at')
    .in('id', roomIds)
    .order('last_message_at', { ascending: false });

  if (roomsError) {
    console.error('Failed to fetch chat rooms list', roomsError);
    throw new Error(roomsError.message ?? 'Sohbet listesi alınamadı');
  }

  const typedRooms = (roomsRaw ?? []) as ChatRoom[];

  if (typedRooms.length === 0) {
    return [];
  }

  const { data: membersRaw, error: membersError } = await supabase
    .from('chat_members')
    .select('id, room_id, user_id, role, unread_count, last_read_at, joined_at, user:user_profiles(*)')
    .in('room_id', roomIds);

  if (membersError) {
    console.error('Failed to fetch room members', membersError);
    throw new Error(membersError.message ?? 'Üye listesi alınamadı');
  }

  const typedMembers = (membersRaw ?? []) as MemberWithProfile[];

  const roomsWithDetails = await Promise.all(
    typedRooms.map(async (room) => {
      const roomMembers = typedMembers.filter((member) => member.room_id === room.id);

      const membersWithProfiles = roomMembers.map((member) => {
        const userProfile = member.user ?? createFallbackProfile(member.user_id);
        return {
          id: member.id,
          room_id: member.room_id,
          user_id: member.user_id,
          role: member.role,
          unread_count: member.unread_count,
          last_read_at: member.last_read_at,
          joined_at: member.joined_at,
          user: userProfile,
        } as ChatMember & { user: UserProfile };
      });

      const otherUserProfile = room.type === 'direct'
        ? membersWithProfiles.find((member) => member.user_id !== currentUserId)?.user ?? null
        : null;

      const lastMessage = await fetchLatestMessage(room.id);
      const unreadCount = membershipMap[room.id]?.unread_count ?? 0;

      return {
        ...room,
        last_message: lastMessage,
        last_message_at: lastMessage?.created_at ?? room.last_message_at,
        members: membersWithProfiles,
        unread_count: unreadCount,
        other_user: otherUserProfile,
      } satisfies ChatRoomWithDetails;
    }),
  );

  console.log('Chat rooms loaded via Supabase', { userId: currentUserId, roomCount: roomsWithDetails.length });

  return roomsWithDetails;
};

export const [ChatContext, useChat] = createContextHook(() => {
  const { user, profile } = useAuth();
  const [rooms, setRooms] = useState<ChatRoomWithDetails[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [typingIndicators, setTypingIndicators] = useState<Record<string, TypingIndicator[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Record<string, OnlineStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const channelsRef = useRef<Record<string, RealtimeChannel>>({});
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (!user) {
      setRooms([]);
      setMessages({});
      setLoading(false);
      return;
    }

    console.log('Subscribing to presence channel for user', user.id);

    const presenceChannel = supabase.channel('online-users');
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users: Record<string, OnlineStatus> = {};
        
        Object.entries(state).forEach(([userId, presences]) => {
          if (presences && presences.length > 0) {
            users[userId] = {
              user_id: userId,
              is_online: true,
              last_seen: new Date().toISOString(),
            };
          }
        });
        
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      presenceChannel.unsubscribe();
      
      Object.values(channelsRef.current).forEach(channel => {
        channel.unsubscribe();
      });
      channelsRef.current = {};
    };
  }, [user]);

  const subscribeToRoom = useCallback((roomId: string) => {
    if (!user || channelsRef.current[roomId]) return;

    const channel = supabase.channel(`room:${roomId}`);
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          try {
            const newestMessage = await fetchLatestMessage(roomId);

            if (!newestMessage) {
              return;
            }

            setMessages(prev => {
              const existing = prev[roomId] ?? [];
              if (existing.some((message) => message.id === newestMessage.id)) {
                return prev;
              }

              return {
                ...prev,
                [roomId]: [newestMessage, ...existing],
              };
            });

            setRooms(prevRooms => prevRooms.map((roomEntry) => {
              if (roomEntry.id !== roomId) {
                return roomEntry;
              }

              const isSelfMessage = newestMessage.user_id === user.id;

              return {
                ...roomEntry,
                last_message: newestMessage,
                last_message_at: newestMessage.created_at,
                unread_count: isSelfMessage ? roomEntry.unread_count : roomEntry.unread_count + 1,
              };
            }));
          } catch (fetchError) {
            console.error('Failed to fetch latest message for room', { roomId, fetchError });
          }
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const typingData = payload as TypingIndicator;
        
        if (typingData.user_id !== user.id) {
          setTypingIndicators(prev => {
            const roomTyping = prev[roomId] || [];
            const existingIndex = roomTyping.findIndex(t => t.user_id === typingData.user_id);
            
            let newTyping: TypingIndicator[];
            if (existingIndex >= 0) {
              newTyping = [...roomTyping];
              newTyping[existingIndex] = typingData;
            } else {
              newTyping = [...roomTyping, typingData];
            }
            
            return { ...prev, [roomId]: newTyping };
          });

          if (typingTimeoutsRef.current[`${roomId}-${typingData.user_id}`]) {
            clearTimeout(typingTimeoutsRef.current[`${roomId}-${typingData.user_id}`]);
          }

          typingTimeoutsRef.current[`${roomId}-${typingData.user_id}`] = setTimeout(() => {
            setTypingIndicators(prev => ({
              ...prev,
              [roomId]: (prev[roomId] || []).filter(t => t.user_id !== typingData.user_id),
            }));
          }, 3000);
        }
      })
      .subscribe();

    channelsRef.current[roomId] = channel;
  }, [user]);

  const unsubscribeFromRoom = useCallback((roomId: string) => {
    const channel = channelsRef.current[roomId];
    if (channel) {
      channel.unsubscribe();
      delete channelsRef.current[roomId];
    }
  }, []);

  const sendTypingIndicator = useCallback(async (roomId: string) => {
    if (!user || !profile) return;

    const channel = channelsRef.current[roomId];
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          room_id: roomId,
          user_id: user.id,
          user_name: profile.full_name,
          timestamp: Date.now(),
        } as TypingIndicator,
      });
    }
  }, [user, profile]);

  const loadRooms = useCallback(async () => {
    if (!user) {
      setRooms([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    console.log('🔄 Oda yükleme başlıyor...');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('❌ Kullanıcı hatası:', authError);
        throw new Error(`Kimlik doğrulama hatası: ${authError.message}`);
      }

      const authedUser = authData?.user;

      if (!authedUser) {
        console.error('❌ Kullanıcı bulunamadı');
        throw new Error('Lütfen tekrar giriş yapın');
      }

      console.log('👤 Kullanıcı:', authedUser.id);

      const roomsData = await fetchRoomsViaSupabase(authedUser.id);
      setRooms(roomsData);
    } catch (loadError: unknown) {
      console.error('💥 loadRooms hatası:', loadError);
      const normalized = normalizeRoomsError(loadError);
      setRooms([]);
      setError(`Chat odaları yüklenemedi: ${normalized.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMessages = useCallback(async (roomId: string) => {
    if (!user) return;

    try {
      const roomMessages = await fetchRoomMessages(roomId, 50);
      setMessages(prev => ({
        ...prev,
        [roomId]: roomMessages,
      }));
    } catch (error) {
      console.error('Error loading messages:', { roomId, error });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadRooms();
    }
  }, [user, loadRooms]);

  return useMemo(() => ({
    rooms,
    messages,
    typingIndicators,
    onlineUsers,
    loading,
    loadRooms,
    loadMessages,
    subscribeToRoom,
    unsubscribeFromRoom,
    sendTypingIndicator,
    error,
  }), [
    rooms,
    messages,
    typingIndicators,
    onlineUsers,
    loading,
    loadRooms,
    loadMessages,
    subscribeToRoom,
    unsubscribeFromRoom,
    sendTypingIndicator,
    error,
  ]);
});
