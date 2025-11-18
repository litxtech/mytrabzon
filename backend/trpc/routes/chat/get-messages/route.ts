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

    // Minimal select - sadece gerekli alanlar
    const { data: messages, error } = await ctx.supabase
      .from('messages')
      .select(`
        id,
        room_id,
        user_id,
        content,
        media_url,
        media_type,
        created_at,
        updated_at,
        reply_to,
        user:profiles(id, full_name, avatar_url, username, verified),
        reply_to_message:messages!reply_to(
          id,
          content,
          user:profiles(id, full_name, avatar_url)
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
