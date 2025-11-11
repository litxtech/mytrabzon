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
          const { data: message } = await supabase
            .from('messages')
            .select('*, user:user_profiles(*)')
            .eq('id', payload.new.id)
            .single();

          if (message) {
            setMessages(prev => ({
              ...prev,
              [roomId]: [message as Message, ...(prev[roomId] || [])],
            }));
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

    try {
      const { data: roomsData, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_members!inner(
            id,
            user_id,
            role,
            unread_count,
            last_read_at
          )
        `)
        .eq('chat_members.user_id', user.id)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        const errorMessage = `Chat odaları yüklenemedi: ${error.message || 'Bilinmeyen hata'}`;
        console.error('Error loading rooms:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setRooms([]);
        setLoading(false);
        throw new Error(errorMessage);
      }

      const roomsWithDetails = await Promise.all(
        (roomsData || []).map(async (room: any) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*, user:user_profiles(*)')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const { data: members } = await supabase
            .from('chat_members')
            .select('*, user:user_profiles(*)')
            .eq('room_id', room.id);

          let otherUser = null;
          if (room.type === 'direct' && members && members.length === 2) {
            otherUser = members.find((m: any) => m.user_id !== user.id)?.user || null;
          }

          const currentMember = room.chat_members.find((m: any) => m.user_id === user.id);

          return {
            ...room,
            last_message: lastMessage || null,
            members: members || [],
            other_user: otherUser,
            unread_count: currentMember?.unread_count || 0,
          };
        })
      );

      setRooms(roomsWithDetails as ChatRoomWithDetails[]);
    } catch (error: any) {
      const errorMessage = error?.message || 'Chat odaları yüklenirken bilinmeyen bir hata oluştu';
      console.error('Error loading rooms:', {
        message: errorMessage,
        stack: error?.stack,
        code: error?.code
      });
      setRooms([]);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMessages = useCallback(async (roomId: string) => {
    if (!user) return;

    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          *,
          user:user_profiles(*),
          reply_to_message:messages!reply_to(
            id,
            content,
            user:user_profiles(full_name, avatar_url)
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

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
