import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';

export const addReactionProcedure = protectedProcedure
  .input(
    z.object({
      messageId: z.string(),
      emoji: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id;

    const { data: message } = await ctx.supabase
      .from('messages')
      .select('room_id')
      .eq('id', input.messageId)
      .single();

    if (!message) {
      throw new Error('Message not found');
    }

    const { data: member } = await ctx.supabase
      .from('chat_members')
      .select('*')
      .eq('room_id', message.room_id)
      .eq('user_id', userId)
      .single();

    if (!member) {
      throw new Error('Not a member of this room');
    }

    const { data: existingReaction } = await ctx.supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', input.messageId)
      .eq('user_id', userId)
      .eq('emoji', input.emoji)
      .single();

    if (existingReaction) {
      const { error } = await ctx.supabase
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (error) throw new Error('Failed to remove reaction');
      
      return { removed: true };
    }

    const { error } = await ctx.supabase
      .from('message_reactions')
      .insert({
        message_id: input.messageId,
        user_id: userId,
        emoji: input.emoji,
      });

    if (error) {
      console.error('Error adding reaction:', error);
      throw new Error('Failed to add reaction');
    }

    return { added: true };
  });
