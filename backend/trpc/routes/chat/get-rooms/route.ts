import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { TRPCError } from '@trpc/server';

interface RawMembership {
  room_id: string;
  unread_count: number;
  role: 'admin' | 'member';
  last_read_at: string | null;
}

interface RawRoom {
  id: string;
  name: string | null;
  avatar_url: string | null;
  type: 'direct' | 'group' | 'district';
  district: string | null;
  last_message_at: string | null;
  created_by: string | null;
  created_at: string;
}

interface RawMemberWithProfile {
  id: string;
  room_id: string;
  user_id: string;
  role: 'admin' | 'member';
  unread_count: number;
  last_read_at: string | null;
  joined_at: string;
  user: unknown;
}

export const getRoomsProcedure = protectedProcedure
  .input(
    z.object({
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    const userId = ctx.user.id;

    console.log('Fetching chat rooms for user via tRPC', {
      userId,
      limit: input.limit,
      offset: input.offset,
    });

    const { data: membershipRows, error: membershipError } = await ctx.supabase
      .from('chat_members')
      .select('room_id, unread_count, role, last_read_at')
      .eq('user_id', userId);

    if (membershipError) {
      console.error('Failed to fetch user chat memberships', {
        message: membershipError.message,
        details: membershipError.details,
        hint: membershipError.hint,
        code: membershipError.code,
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Chat odaları yüklenemedi: ${membershipError.message ?? 'Üyelik bilgisi alınamadı'}`,
      });
    }

    const memberships = (membershipRows ?? []) as RawMembership[];

    if (memberships.length === 0) {
      console.log('No chat memberships found for user', { userId });
      return [];
    }

    const membershipMap = memberships.reduce<Record<string, RawMembership>>((acc, membership) => {
      acc[membership.room_id] = membership;
      return acc;
    }, {});

    const roomIds = memberships.map((membership) => membership.room_id);

    const { data: roomsData, error: roomsError } = await ctx.supabase
      .from('chat_rooms')
      .select('id, name, avatar_url, type, district, last_message_at, created_by, created_at')
      .in('id', roomIds);

    if (roomsError) {
      console.error('Failed to fetch chat rooms list', {
        message: roomsError.message,
        details: roomsError.details,
        hint: roomsError.hint,
        code: roomsError.code,
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Chat odaları yüklenemedi: ${roomsError.message ?? 'Sohbet listesi alınamadı'}`,
      });
    }

    const sortedRooms = ((roomsData ?? []) as RawRoom[]).sort((a, b) => {
      const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return timeB - timeA;
    });

    const paginatedRooms = sortedRooms.slice(input.offset, input.offset + input.limit);

    const roomsWithLastMessage = await Promise.all(
      paginatedRooms.map(async (room) => {
        const { data: lastMessage, error: lastMessageError } = await ctx.supabase
          .from('messages')
          .select('*, user:user_profiles(*)')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastMessageError) {
          console.error('Failed to load last message for room', {
            roomId: room.id,
            message: lastMessageError.message,
            details: lastMessageError.details,
          });
        }

        const { data: memberRows, error: membersError } = await ctx.supabase
          .from('chat_members')
          .select('id, room_id, user_id, role, unread_count, last_read_at, joined_at, user:user_profiles(*)')
          .eq('room_id', room.id);

        if (membersError) {
          console.error('Failed to load members for room', {
            roomId: room.id,
            message: membersError.message,
            details: membersError.details,
          });
        }

        const members = (memberRows ?? []) as RawMemberWithProfile[];

        const otherUser = room.type === 'direct'
          ? members.find((member) => member.user_id !== userId)?.user ?? null
          : null;

        const membership = membershipMap[room.id];

        return {
          ...room,
          last_message: lastMessage ?? null,
          members,
          other_user: otherUser,
          unread_count: membership?.unread_count ?? 0,
        };
      })
    );

    console.log('Chat rooms fetched successfully', {
      userId,
      count: roomsWithLastMessage.length,
    });

    return roomsWithLastMessage;
  });
