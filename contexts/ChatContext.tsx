import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  ChatRoomWithDetails,
  Message,
  TypingIndicator,
  OnlineStatus,
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

export const [ChatContext, useChat] = createContextHook(() => {
  const { user, profile } = useAuth();
  const [rooms, setRooms] = useState<ChatRoomWithDetails[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [typingIndicators, setTypingIndicators] = useState<Record<string, TypingIndicator[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Record<string, OnlineStatus>>({});
  const [loading, setLoading] = useState(true);
  
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
    if (!user) return;

    setLoading(true);
    console.log('Loading chat rooms for user', user.id);

    try {
      const roomsData = await trpcClient.chat.getRooms.query({ limit: 50, offset: 0 });
      setRooms(roomsData as ChatRoomWithDetails[]);
    } catch (error: unknown) {
      const normalized = normalizeRoomsError(error);
      console.error('Error loading rooms:', JSON.stringify(normalized.details, null, 2));
      setRooms([]);
      throw new Error(normalized.message);
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
  ]);
});
