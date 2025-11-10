import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';

export const sendMessageProcedure = protectedProcedure
  .input(
    z.object({
      roomId: z.string(),
      content: z.string(),
      mediaUrl: z.string().optional(),
      mediaType: z.enum(['image', 'video', 'audio', 'file']).optional(),
      replyTo: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
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

    const { data: message, error } = await ctx.supabase
      .from('messages')
      .insert({
        room_id: input.roomId,
        user_id: userId,
        content: input.content,
        media_url: input.mediaUrl || null,
        media_type: input.mediaType || null,
        reply_to: input.replyTo || null,
      })
      .select('*, user:user_profiles(*)')
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }

    await ctx.supabase
      .from('chat_rooms')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', input.roomId);

    return message;
  });
