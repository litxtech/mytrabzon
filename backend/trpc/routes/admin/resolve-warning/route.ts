import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { ensureAdmin } from '../utils';

// Kullanıcı uyarıyı çözdüğünde (gönderiyi sildiğinde) çağrılır
export const resolveWarningProcedure = protectedProcedure
  .input(
    z.object({
      warningId: z.string().uuid(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    if (!user) throw new Error('Unauthorized');

    // Uyarıyı bul
    const { data: warning, error: fetchError } = await supabase
      .from('post_warnings')
      .select('*, posts!post_warnings_post_id_fkey(author_id), comments!post_warnings_comment_id_fkey(user_id), events!post_warnings_event_id_fkey(user_id)')
      .eq('id', input.warningId)
      .single();

    if (fetchError || !warning) {
      throw new Error('Uyarı bulunamadı');
    }

    // Kullanıcı bu içeriğin sahibi mi kontrol et
    let isOwner = false;
    
    if (warning.content_type === 'post' && (warning.posts as any)?.author_id === user.id) {
      isOwner = true;
    } else if (warning.content_type === 'comment' && (warning.comments as any)?.user_id === user.id) {
      isOwner = true;
    } else if (warning.content_type === 'event' && (warning.events as any)?.user_id === user.id) {
      isOwner = true;
    }

    if (!isOwner) {
      throw new Error('Bu uyarıyı sadece içerik sahibi çözebilir');
    }

    // Uyarıyı çözülmüş olarak işaretle
    const { error } = await supabase
      .from('post_warnings')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', input.warningId);

    if (error) {
      throw new Error(error.message || 'Uyarı çözülemedi');
    }

    return { success: true };
  });

