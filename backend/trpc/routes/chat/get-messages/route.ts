import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';

export const getMessagesProcedure = protectedProcedure
  .input(
    z.object({
      roomId: z.string(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    const userId = ctx.user.id;

    const { data: member, error: memberError } = await ctx.supabase
      .from('chat_members')
      .select('*')
      .eq('room_id', input.roomId)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      throw new Error('Not a member of this room');
    }

    const { data: messages, error } = await ctx.supabase
      .from('messages')
      .select(`
        *,
        user:profiles(*),
        reply_to_message:messages!reply_to(
          id,
          content,
          user:profiles(full_name, avatar_url)
        )
      `)
      .eq('room_id', input.roomId)
      .order('created_at', { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      throw new Error('Failed to fetch messages');
    }

    return messages || [];
  });
