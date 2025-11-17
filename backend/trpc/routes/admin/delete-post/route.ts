import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { ensureAdmin } from './utils';

export const adminDeletePostProcedure = protectedProcedure
  .input(
    z.object({
      postId: z.string().uuid(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    if (!user) throw new Error('Unauthorized');
    await ensureAdmin(supabase, user.id);

    // Post'u bul
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', input.postId)
      .single();

    if (fetchError || !post) {
      throw new Error('Gönderi bulunamadı');
    }

    // Media dosyalarını sil
    if (post.media && Array.isArray(post.media)) {
      for (const mediaItem of post.media) {
        if (mediaItem.path) {
          const path = mediaItem.path.split('/storage/v1/object/public/posts/')[1] || 
                       mediaItem.path.split('posts/')[1];
          if (path) {
            await supabase.storage.from('posts').remove([path]);
          }
        }
      }
    }

    // Post'u sil
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', input.postId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  });

