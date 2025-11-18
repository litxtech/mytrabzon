import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { TRPCError } from '@trpc/server';

export const deleteEventProcedure = protectedProcedure
  .input(
    z.object({
      eventId: z.string().uuid(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

    // Event'i bul ve kullanıcının kendi event'i olduğunu kontrol et
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', input.eventId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !event) {
      throw new TRPCError({ 
        code: 'NOT_FOUND', 
        message: 'Olay bulunamadı veya yetkisiz erişim' 
      });
    }

    // Media dosyalarını sil (eğer varsa)
    if (event.media_urls && Array.isArray(event.media_urls) && event.media_urls.length > 0) {
      for (const mediaUrl of event.media_urls) {
        if (mediaUrl) {
          // Storage path'ini çıkar
          const path = mediaUrl.split('/storage/v1/object/public/events/')[1] || 
                       mediaUrl.split('events/')[1];
          if (path) {
            try {
              await supabase.storage.from('events').remove([path]);
            } catch (storageError) {
              // Storage hatası olsa bile event silme işlemine devam et
              console.error('Storage delete error:', storageError);
            }
          }
        }
      }
    }

    // Audio dosyasını sil (eğer varsa)
    if (event.audio_url) {
      const audioPath = event.audio_url.split('/storage/v1/object/public/events/')[1] || 
                       event.audio_url.split('events/')[1];
      if (audioPath) {
        try {
          await supabase.storage.from('events').remove([audioPath]);
        } catch (storageError) {
          // Storage hatası olsa bile event silme işlemine devam et
          console.error('Audio storage delete error:', storageError);
        }
      }
    }

    // Event'i sil (soft delete - is_deleted = true)
    const { error } = await supabase
      .from('events')
      .update({ 
        is_deleted: true,
        is_active: false 
      })
      .eq('id', input.eventId)
      .eq('user_id', user.id);

    if (error) {
      throw new TRPCError({ 
        code: 'INTERNAL_SERVER_ERROR', 
        message: error.message 
      });
    }

    return { success: true };
  });

