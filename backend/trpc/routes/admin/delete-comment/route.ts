import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { ensureAdmin } from './utils';

export const adminDeleteCommentProcedure = protectedProcedure
  .input(
    z.object({
      commentId: z.string().uuid(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    if (!user) throw new Error('Unauthorized');
    await ensureAdmin(supabase, user.id);

    // Yorumu bul
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', input.commentId)
      .single();

    if (fetchError || !comment) {
      throw new Error('Yorum bulunamadı');
    }

    // Yorumu sil
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', input.commentId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  });

