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
import { trpcClient } from '@/lib/trpc';
import { TRPCClientError } from '@trpc/client';

type NormalizedError = {
  message: string;
  details: Record<string, unknown>;
};

const normalizeRoomsError = (error: unknown): NormalizedError => {
  if (error instanceof TRPCClientError) {
    return {
      message: error.message || 'Chat odaları yüklenemedi',
      details: {
        name: error.name,
        code: error.data?.code ?? null,
        httpStatus: error.data?.httpStatus ?? null,
        stack: error.stack ?? null,
        cause: (error as TRPCClientError & { cause?: unknown }).cause ?? null,
        path: error.data?.path ?? null,
      },
    };
  }

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

const fetchRoomsFallback = async (roomIds: string[], currentUserId: string): Promise<ChatRoomWithDetails[]> => {
  if (roomIds.length === 0) {
    return [];
  }

  console.log('Fallback: loading chat rooms directly via Supabase', { roomCount: roomIds.length });

  const { data: roomsRaw, error: roomsError } = await supabase
    .from('chat_rooms')
    .select('id, name, avatar_url, type, district, last_message_at, created_by, created_at')
    .in('id', roomIds)
    .order('last_message_at', { ascending: false });

  if (roomsError) {
    console.error('Fallback: room fetch failed', roomsError);
    throw roomsError;
  }

  const typedRooms = (roomsRaw ?? []) as ChatRoom[];

  if (typedRooms.length === 0) {
    return [];
  }

  const { data: membersRaw, error: membersError } = await supabase
    .from('chat_members')
    .select('id, room_id, user_id, role, unread_count, last_read_at, joined_at')
    .in('room_id', roomIds);

  if (membersError) {
    console.error('Fallback: member fetch failed', membersError);
    throw membersError;
  }

  const typedMembers = (membersRaw ?? []) as ChatMember[];
  const memberUserIds = Array.from(new Set(typedMembers.map((member) => member.user_id)));

  let profilesMap = new Map<string, UserProfile>();

  if (memberUserIds.length > 0) {
    const { data: profilesRaw, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', memberUserIds);

    if (profilesError) {
      console.error('Fallback: profile fetch failed', profilesError);
      throw profilesError;
    }

    profilesMap = new Map(
      (profilesRaw ?? []).map((profile) => [profile.id as string, profile as UserProfile]),
    );
  }

  const fallbackRooms = typedRooms.map((room) => {
    const roomMembers = typedMembers.filter((member) => member.room_id === room.id);
    const membersWithProfiles = roomMembers.map((member) => ({
      ...member,
      user: profilesMap.get(member.user_id) ?? createFallbackProfile(member.user_id),
    }));

    const otherUserProfile = membersWithProfiles.find((member) => member.user_id !== currentUserId)?.user ?? null;
    const unreadCount = roomMembers.find((member) => member.user_id === currentUserId)?.unread_count ?? 0;

    return {
      ...room,
      last_message: null,
      members: membersWithProfiles,
      unread_count: unreadCount,
      other_user: otherUserProfile,
    } satisfies ChatRoomWithDetails;
  });

  console.log('Fallback: chat rooms loaded via Supabase', { roomCount: fallbackRooms.length });

  return fallbackRooms;
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
        async (payload) => {
          try {
            const latestMessages = await trpcClient.chat.getMessages.query({
              roomId,
              limit: 1,
              offset: 0,
            });

            if (latestMessages.length > 0) {
              const newestMessage = latestMessages[0] as Message;
              setMessages(prev => ({
                ...prev,
                [roomId]: [newestMessage, ...(prev[roomId] || [])],
              }));
            }
          } catch (fetchError) {
            console.error('Failed to fetch latest message for room', roomId, fetchError);
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

      const memberships = await retryOperation(async () => {
        const { data: membershipsData, error: membershipsError } = await supabase
          .from('chat_members')
          .select('room_id')
          .eq('user_id', authedUser.id)
          .limit(5);

        console.log('📊 Üyelikler:', membershipsData);
        if (membershipsError) {
          console.log('❌ Hata (üyelikler):', membershipsError);
          throw membershipsError;
        }

        return membershipsData ?? [];
      });

      if (memberships.length === 0) {
        console.log('ℹ️ Hiç oda bulunamadı');
        setRooms([]);
        return;
      }

      const roomIds = memberships.map((membership) => membership.room_id);
      console.log('🏠 Oda IDleri:', roomIds);

      const { data: roomsProbe, error: roomsProbeError } = await supabase
        .from('chat_rooms')
        .select('id')
        .in('id', roomIds)
        .limit(roomIds.length);

      console.log('🏠 Odalar (kontrol):', roomsProbe);
      if (roomsProbeError) {
        console.log('❌ Hata (odalar):', roomsProbeError);
      }

      let roomsData: ChatRoomWithDetails[] = [];

      try {
        roomsData = await retryOperation(async () => trpcClient.chat.getRooms.query({ limit: 50, offset: 0 })) as ChatRoomWithDetails[];
        console.log('✅ Odalar başarıyla yüklendi (tRPC)');
      } catch (roomsError) {
        console.error('❌ tRPC oda sorgusu başarısız, Supabase fallback deneniyor', roomsError);
        roomsData = await fetchRoomsFallback(roomIds, authedUser.id);
      }

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
      const messagesData = await trpcClient.chat.getMessages.query({
        roomId,
        limit: 50,
        offset: 0,
      });

      setMessages(prev => ({
        ...prev,
        [roomId]: (messagesData as Message[]) || [],
      }));
    } catch (error) {
      console.error('Error loading messages:', error);
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
