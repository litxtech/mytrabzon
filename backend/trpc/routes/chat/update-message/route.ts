import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';

export const updateMessageProcedure = protectedProcedure
  .input(
    z.object({
      messageId: z.string().uuid(),
      content: z.string().min(1, 'Mesaj boş olamaz').max(1000, 'Mesaj 1000 karakteri geçemez'),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id;

    const { data: message, error: fetchError } = await ctx.supabase
      .from('messages')
      .select('id, user_id')
      .eq('id', input.messageId)
      .single();

    if (fetchError || !message) {
      throw new Error('Mesaj bulunamadı');
    }

    if (message.user_id !== userId) {
      throw new Error('Bu mesajı düzenleme yetkiniz yok');
    }

    const { error: updateError } = await ctx.supabase
      .from('messages')
      .update({
        content: input.content,
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.messageId);

    if (updateError) {
      console.error('Error updating message:', updateError);
      throw new Error('Mesaj güncellenemedi');
    }

    return { success: true };
  });


