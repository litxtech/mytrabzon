import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';

export const deleteMessageProcedure = protectedProcedure
  .input(
    z.object({
      messageId: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id;

    const { data: message, error: fetchError } = await ctx.supabase
      .from('messages')
      .select('*')
      .eq('id', input.messageId)
      .single();

    if (fetchError || !message) {
      throw new Error('Message not found');
    }

    if (message.user_id !== userId) {
      throw new Error('Not authorized to delete this message');
    }

    const { error } = await ctx.supabase
      .from('messages')
      .delete()
      .eq('id', input.messageId);

    if (error) {
      console.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }

    return { success: true };
  });
