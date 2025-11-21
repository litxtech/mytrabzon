import { z } from 'zod';
<<<<<<< HEAD
import { protectedProcedure } from '../../../create-context';
import { TRPCError } from '@trpc/server';
=======
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../create-context';
>>>>>>> c0e01b0a94b268b9348cfd071cf195f01ef88020

export const deleteEventProcedure = protectedProcedure
  .input(
    z.object({
<<<<<<< HEAD
      eventId: z.string().uuid(),
=======
      event_id: z.string().uuid(),
>>>>>>> c0e01b0a94b268b9348cfd071cf195f01ef88020
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
<<<<<<< HEAD
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
=======

    if (!user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('id, user_id')
      .eq('id', input.event_id)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !event) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Olay bulunamadı veya silinmiş' });
    }

    if (event.user_id !== user.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu olayı silme yetkiniz yok' });
    }

    const { error: deleteError } = await supabase
      .from('events')
      .update({
        is_deleted: true,
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.event_id)
      .eq('user_id', user.id);

    if (deleteError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteError.message });
>>>>>>> c0e01b0a94b268b9348cfd071cf195f01ef88020
    }

    return { success: true };
  });

