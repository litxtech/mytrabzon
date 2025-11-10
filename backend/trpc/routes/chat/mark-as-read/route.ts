import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';

export const markAsReadProcedure = protectedProcedure
  .input(
    z.object({
      roomId: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id;

    const { error } = await ctx.supabase
      .from('chat_members')
      .update({
        unread_count: 0,
        last_read_at: new Date().toISOString(),
      })
      .eq('room_id', input.roomId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error marking as read:', error);
      throw new Error('Failed to mark messages as read');
    }

    return { success: true };
  });
