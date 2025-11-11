import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { TRPCError } from '@trpc/server';

interface RawChatMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  unread_count: number;
  last_read_at: string | null;
  user?: unknown;
}

interface RawChatRoom {
  id: string;
  type: 'direct' | 'group' | 'district';
  chat_members: RawChatMember[];
  [key: string]: unknown;
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

    const { data: rooms, error } = await ctx.supabase
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
      .eq('chat_members.user_id', userId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (error) {
      console.error('Error fetching chat rooms:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Chat odaları yüklenemedi: ${error.message ?? 'Bilinmeyen hata'}`,
      });
    }

    const normalizedRooms = (rooms ?? []) as RawChatRoom[];

    const roomsWithLastMessage = await Promise.all(
      normalizedRooms.map(async (room) => {
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
          });
        }

        const { data: members, error: membersError } = await ctx.supabase
          .from('chat_members')
          .select('*, user:user_profiles(*)')
          .eq('room_id', room.id);

        if (membersError) {
          console.error('Failed to load members for room', {
            roomId: room.id,
            message: membersError.message,
          });
        }

        let otherUser: unknown = null;
        if (room.type === 'direct' && members && members.length === 2) {
          otherUser = members.find((member) => member.user_id !== userId)?.user ?? null;
        }

        const currentMember = room.chat_members.find((member) => member.user_id === userId);

        return {
          ...room,
          last_message: lastMessage ?? null,
          members: members ?? [],
          other_user: otherUser,
          unread_count: currentMember?.unread_count ?? 0,
        };
      })
    );

    return roomsWithLastMessage;
  });
